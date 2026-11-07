#!/usr/bin/env node
// check-kit.mjs — 本方法仓文档 / 条目 / 容量门禁（13 条探针：编号 1–12 + 14；阈值全部读 kit.config.json）
// 用法: node kit/scripts/check-kit.mjs [--root <dir>] [--profile=lite|full] [--update-baseline]
// 退出码: 0 = 通过 / 1 = 有 FAIL / 2 = 环境错误（找不到或读不懂 kit.config.json）
//
// 改本文件后必做注入故障对照（实测会红再复原）：
//   1) 删 README.md 的一行地图        → 探针 1
//   2) 任一 .md 写 P-99               → 探针 2
//   3) principles/ 造 51 KiB 的册      → 探针 3 + 8（多探针烟测；探针 3 的隔离态 = selftest 的 oversize-ondemand）
//   4) VERSION 末尾追加 -mismatch      → 探针 6（**不要写死版本号**：发版后会「恰好一致」而假绿）
//   5) 给某条目的全部引用断掉          → 探针 9
//   6) quotas.l0MaxEntries 改 4       → 探针 10
//   7) 删 kit.config.json            → exit 2 + 人话（不是裸栈）
//   8) matrix.json 的 always 写个不存在的件 → 探针 11（接入矩阵自洽）
//   9) 删 principles/ 某条的 「> 证据：」 行  → 探针 12（条目可复核）
//  10) 往 onDemand 档目录放一个 > sectionRead.thresholdBytes、但仍 < 该档上限的 .md（不带「按节读」）→ 探针 7（oversize-volume 会连带触 3，这个只触 7）
//  11) 删掉某条 `## A-NN` 里所有 `P-NN` 指针（或「怎么早发现」行）→ 探针 12 的 A 侧（2026-10-31 补）
//  12) 在任一 .md 里写一个三反引号围栏块（或未闭合围栏 / ~~~）、再写一条死链（如 `kit/scripts/nope.md`）→ 探针 5（逐行配对，围栏不再吞链，2026-11-06 补）
//  13) kit.config.json 的 probes.evidenceRow 置 false + 删 principles/ 某条「> 证据：」→ 探针 12 的 P 侧应**不**报（= selftest 的 evidence-row-off；默认 true 时同一注入必红 = missing-evidence）
// 以上各条 + cold-start 五态是**核心配方**；完整态清单以 selftest.mjs 的 CASES 为准（探针 3 / 5 / 7 / 12 另有专属态）。
// 隔离态：探针 3 = oversize-ondemand · 探针 5 = fence-deadlink / stray-tick-deadlink / unclosed-fence-deadlink / tilde-fence-deadlink（2026-11-06）· 探针 7 = section-read-missing（2026-10-31）· 探针 12 = missing-evidence（P 侧）/ antipattern-unlinked（A 侧，2026-10-31）/ evidence-row-off（配置关闭态，2026-11-02）；探针 4 仍缺（与探针 2 面重叠，登记 = 留后登记面 §5）。
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve, dirname, relative, extname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const argVal = (name) => { const p = argv.find((a) => a === name || a.startsWith(name + "=")); if (!p) return null; if (p === name) return argv[argv.indexOf(p) + 1] || null; return p.slice(name.length + 1); };

// 仓根 = 从脚本所在目录向上找 kit.config.json；遇到 .git 立刻停（工作树边界，防「祖先的配置」静默生效）
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, "kit.config.json"))) return dir;
    if (existsSync(join(dir, ".git"))) return null;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
}
function die(msg) {
  console.error("[check-kit] " + msg);
  console.error("[check-kit] 退出码 2 = 环境错误（不是门禁红）。修法见 kit/templates/kit.config.json.template 与 README 的「第 0 步」");
  process.exit(2);
}

const rootArg = argVal("--root");
const ROOT = rootArg ? resolve(rootArg) : findRoot(HERE);
if (!ROOT) die("未找到 kit.config.json：从 " + HERE + " 向上到工作树边界都没有。先建它（模板 = kit/templates/kit.config.json.template）");
// A-16：不带 --root 时「仓根」来自**脚本所在目录**，cwd 完全不参与 —— 站在别的仓里跑会量错对象、还照常给绿
// （2026-11-01 先在 cold-start-size 上实测并补护栏；check-kit 同形，2026-11-01 补齐）
if (!rootArg) {
  const cwd = process.cwd();
  if (cwd !== ROOT && !cwd.startsWith(ROOT + sep)) die("你在 " + cwd + "，但脚本向上找到的仓是 " + ROOT + " —— 量错对象了（判定行与退出码会来自另一个仓）。要量当前目录：--root . ；要量别的仓：--root <目录>");
}
const cfgPath = join(ROOT, "kit.config.json");
if (!existsSync(cfgPath)) die("目录 " + ROOT + " 里没有 kit.config.json");
let cfg;
try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); } catch (e) { die("kit.config.json 不是合法 JSON：" + (e && e.message)); }
for (const k of ["capacityTiers", "coldStart", "sectionRead", "quotas"]) if (!cfg[k]) die("kit.config.json 缺 " + k + " 段（拿模板对照补齐）");

const profileArg = argVal("--profile");
const profile = profileArg || cfg.profile || "full";
if (profile !== "lite" && profile !== "full") die("--profile 只接受 lite / full（收到 " + profile + "）");
const strictRelease = profile === "full";
// 探针 12 的 P 侧「证据行」检查做成配置项：V2 的判据不写证据行，
// 但它仍要能跑这套门禁 → 出厂件在自己的 kit.config.json 里置 false。**默认 true**（不削弱本方法仓的门）。
const requireEvidenceRow = !(cfg.probes && cfg.probes.evidenceRow === false);

const rel = (p) => relative(ROOT, p).split("\\").join("/");
const fails = [], warns = [];

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git" || e.name === "node_modules") continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (extname(e.name) === ".md") out.push(p);
  }
  return out;
}
const mds = walk(ROOT);
const txt = new Map(mds.map((p) => [p, readFileSync(p, "utf8")]));
const textOf = (name) => (txt.has(join(ROOT, name)) ? txt.get(join(ROOT, name)) : null);
const lineCount = (t) => t.split(/\r?\n/).length - (t.endsWith("\n") ? 1 : 0);

// —— 存量冻结（--baseline）：只对「新增或变大」的文件判容量；冻结 ≠ 合法，是欠账
const basePath = join(ROOT, cfg.baseline && cfg.baseline.path ? cfg.baseline.path : ".kit-baseline.json");
let baseline = null;
if (existsSync(basePath)) {
  try { baseline = JSON.parse(readFileSync(basePath, "utf8")); } catch { warns.push("基线文件读不懂，按未启用处理：" + rel(basePath)); }
}
if (argv.includes("--update-baseline")) {
  const files = {};
  for (const p of mds) files[rel(p)] = statSync(p).size;
  writeFileSync(basePath, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), files }, null, 2) + "\n", "utf8");
  console.log("[check-kit] 已写基线 " + rel(basePath) + "（" + mds.length + " 个 md）—— 存量冻结生效，此后只对新增/变大判容量");
  process.exit(0);
}
const baseCount = baseline && baseline.files ? Object.keys(baseline.files).length : 0;
const frozenSet = new Set();
const frozenOf = (key, size) => {
  if (!baseline || !baseline.files) return false;
  const prev = baseline.files[key];
  return typeof prev === "number" && size <= prev;
};

console.log("[check-kit] 配置 = " + cfgPath + " · profile=" + profile + " · 证据行=" + (requireEvidenceRow ? "必填" : "关闭") + " · 基线=" + (baseline ? baseCount + " 条（" + (baseline.generatedAt || "?") + "）" : "未启用（严格模式）"));

// —— 探针 1：ID 双向一致（P- 定义 ↔ README 地图行）
const defs = new Map();
for (const [p, t] of txt) {
  const r0 = rel(p);
  if (!r0.startsWith("principles/") && !r0.startsWith("anti-patterns/")) continue;
  for (const m of t.matchAll(/^##\s+((?:P|A)-\d{2})\s+(.+)$/gm)) defs.set(m[1], r0);
}
const readmeTxt = textOf("README.md");
if (readmeTxt == null) fails.push("缺 README.md（探针 1 / 9 无法判定）");
const mapIds = new Set([...(readmeTxt || "").matchAll(/^\|\s*(P-\d{2})\s*\|/gm)].map((m) => m[1]));
for (const id of defs.keys()) if (id.startsWith("P-") && !mapIds.has(id)) fails.push("README 地图缺 " + id);
for (const id of mapIds) if (!defs.has(id)) fails.push("README 地图多出 " + id + "（无定义）");

// —— 探针 2：交叉引用可解析（先剔定义行再扫剩余文本）
const badRefs = new Set();
for (const [p, t] of txt) {
  const body = t.replace(/^##\s+(?:P|A)-\d{2}\b.*$/gm, "");
  for (const m of body.matchAll(/\b((?:P|A)-\d{2})\b/g)) if (!defs.has(m[1])) badRefs.add(m[1] + " ← " + rel(p));
}
for (const s of badRefs) fails.push("引用不存在的 " + s);

// —— 探针 3：容量分档（档位 / 硬顶 / 行数 / 单行）；冻结过的存量只在其「变大」时才判
const tierOf = (r) => {
  for (const [d, tier] of Object.entries(cfg.capacityTiers.tiersByDir || {})) if (r.startsWith(d)) return tier;
  return cfg.capacityTiers.default;
};
for (const [p, t] of txt) {
  const r0 = rel(p);
  const size = statSync(p).size;
  if (frozenOf(r0, size)) { frozenSet.add(r0); continue; }
  const long = t.split(/\r?\n/).find((l) => l.length > cfg.capacityTiers.maxLineChars);
  if (long) fails.push("单行超长 " + r0 + " " + long.length + " > " + cfg.capacityTiers.maxLineChars);
  if (lineCount(t) > cfg.capacityTiers.maxLines) fails.push("行数超限 " + r0 + " " + lineCount(t) + " > " + cfg.capacityTiers.maxLines);
  const tier = tierOf(r0), lim = cfg.capacityTiers[tier];
  if (!lim || lim.limitBytes == null) continue;
  if (size > cfg.capacityTiers.capBytes) fails.push("超硬顶 " + r0 + " " + size + "B");
  else if (size > lim.limitBytes) fails.push("超档位(" + tier + ") " + r0 + " " + size + "B");
  else if (lim.warnBytes && size > lim.warnBytes) warns.push("接近档位(" + tier + ") " + r0 + " " + size + "B");
}

// —— 探针 4：CHANGELOG 里的 ID 必须存在（lite 下缺件只 WARN）
const changelog = textOf("CHANGELOG.md");
if (changelog == null) {
  if (strictRelease) fails.push("缺 CHANGELOG.md（full profile 要求；只要容量门用 --profile=lite）");
  else warns.push("lite：无 CHANGELOG.md → 发布门（探针 4）跳过");
} else {
  const seen = new Set();
  for (const m of changelog.matchAll(/\b((?:P|A)-\d{2})\b/g)) {
    if (!defs.has(m[1]) && !seen.has(m[1])) { seen.add(m[1]); fails.push("CHANGELOG 引用不存在的 " + m[1]); }
  }
}

// —— 探针 5：死链（反引号内带 / 的 .md 相对路径；跨仓指针（`src` + 冒号）/ 盘符绝对路径 / 含占位符的跳过）
// 历史盲区（2026-11-05 三组对照实测；2026-11-06 B3-7 修）：按**整份文件**配对时，围栏 / 落单反引号会让奇偶错位，
// 其后的路径被吞进同一个 token → 静默漏检（同一段路径：无围栏的文件红、有围栏的绿）。
// 修法 = **逐行配对**（行内代码不跨行）：一行里的反引号配不上，最多弄坏这一行；围栏行不再参与全局配对。
// 语义不变：仍只查「带 /、首段是真实顶层目录」的 .md 路径；代价 = 围栏内的路径也进候选（代码示例请用占位符）。
const TICKED = /`([^`]+)`/g;
// 只查「首段是真实顶层目录」的路径：命令示例（如 `node kit/scripts/x.mjs y.md`）首段是 node → 跳过；
// 而 `prompt history/a b.md` 这类含空格 / 中文的本方法仓路径会进面（旧正则的盲区）。
const pathRoots = new Set(readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && e.name !== ".git" && e.name !== "node_modules").map((e) => e.name));
for (const r of cfg.pathRoots || []) pathRoots.add(r);
const badLinks = new Set();
for (const [p, t] of txt) {
  for (const line of t.split(/\r?\n/)) {
    for (const m of line.matchAll(TICKED)) {
      const target = m[1].trim();
      if (!target.endsWith(".md") || !target.includes("/")) continue;
      if (!pathRoots.has(target.split("/")[0])) continue;
      if (target.startsWith("src" + ":")) continue;
      if (/^[A-Za-z]:[\\/]/.test(target)) continue;
      if (target.includes("://")) continue;
      if (/[<>*?{}|…]/.test(target)) continue;
      if (!existsSync(join(ROOT, target))) badLinks.add("死链 " + target + " ← " + rel(p));
    }
  }
}
for (const s of badLinks) fails.push(s);

// —— 探针 6：VERSION == CHANGELOG 顶部版本（lite 下缺件只 WARN）
const verPath = join(ROOT, "VERSION");
const ver = existsSync(verPath) ? readFileSync(verPath, "utf8").trim() : null;
if (ver == null) {
  if (strictRelease) fails.push("缺 VERSION（full profile 要求）");
  else warns.push("lite：无 VERSION → 版本一致（探针 6）跳过");
} else if (changelog != null) {
  const chTop = changelog.match(/^##\s*\[([^\]]+)\]/m);
  if (!chTop || chTop[1] !== ver) fails.push("VERSION(" + ver + ") 与 CHANGELOG 顶部(" + (chTop ? chTop[1] : "无") + ") 不一致");
}

// —— 探针 7：超阈文件必须在前 20 行声明「按节读」
for (const [p, t] of txt) {
  const r0 = rel(p);
  if (frozenSet.has(r0)) continue;
  const tier = tierOf(r0), lim = cfg.capacityTiers[tier];
  if (!lim || lim.limitBytes == null) continue;
  if (statSync(p).size > cfg.sectionRead.thresholdBytes) {
    const head = t.split(/\r?\n/).slice(0, 20).join("\n");
    if (!head.includes(cfg.sectionRead.marker)) fails.push("缺按节读声明 " + r0);
  }
}

// —— 探针 8：每册上限（principles / anti-patterns 单册）
for (const [p] of txt) {
  const r0 = rel(p);
  if (frozenSet.has(r0)) continue;
  if (!r0.startsWith("principles/") && !r0.startsWith("anti-patterns/")) continue;
  const size = statSync(p).size;
  if (size > cfg.perVolumeLimitBytes) fails.push("单册超限 " + r0 + " " + size + "B > " + cfg.perVolumeLimitBytes);
}

// —— 探针 9：孤儿条目（每个定义必须被地图行或正文引用覆盖）
const refs = new Set();
for (const [p, t] of txt) {
  const body = t.replace(/^##\s+(?:P|A)-\d{2}\b.*$/gm, "");
  for (const m of body.matchAll(/\b((?:P|A)-\d{2})\b/g)) refs.add(m[1]);
}
for (const id of defs.keys()) if (!refs.has(id) && !mapIds.has(id)) fails.push("孤儿条目 " + id + "（无地图行、无正文引用）");

// —— 探针 10：配额（L0 条数 / inbox 条数）
const pDefs = [...defs.keys()].filter((id) => id.startsWith("P-")).length;
if (pDefs > cfg.quotas.l0MaxEntries) fails.push("L0 条目 " + pDefs + " 超配额 " + cfg.quotas.l0MaxEntries + "（先合并或退役一条，P-05）");
const inboxDir = join(ROOT, "inbox");
if (existsSync(inboxDir)) {
  const n = readdirSync(inboxDir).filter((f) => f.endsWith(".md")).length;
  if (n > cfg.quotas.inboxMaxEntries) fails.push("inbox 条目 " + n + " 超配额 " + cfg.quotas.inboxMaxEntries);
}

// —— 探针 11：接入矩阵自洽（件 id / 复制源存在 / 轴取值合法 / 必填字段齐全）
const matrixPath = join(ROOT, "kit", "intake", "matrix.json");
if (existsSync(matrixPath)) {
  let m = null;
  try { m = JSON.parse(readFileSync(matrixPath, "utf8")); } catch (e) { fails.push("接入矩阵不是合法 JSON：" + (e && e.message)); }
  if (m) {
    const axisKeys = Object.keys(m.axes || {});
    for (const k of axisKeys) {
      const a = m.axes[k];
      if (!Array.isArray(a.values) || !a.values.length) fails.push("矩阵轴 " + k + " 缺 values");
      else if (!a.values.includes(a.default)) fails.push("矩阵轴 " + k + " 的 default 不在 values 内");
    }
    const ids = new Set();
    for (const a of m.artifacts || []) {
      if (!a.id) { fails.push("矩阵有件缺 id"); continue; }
      if (ids.has(a.id)) fails.push("矩阵件 id 重复 " + a.id);
      ids.add(a.id);
      for (const f of ["name", "kind", "prevents", "accept", "to_enable_when", "enforcement"]) if (!a[f]) fails.push("件 " + a.id + " 缺字段 " + f);
      if (a.kind === "copy") {
        if (!Array.isArray(a.files) || !a.files.length) fails.push("件 " + a.id + " 是 copy 但没 files");
        else for (const f of a.files) if (!existsSync(join(ROOT, f))) fails.push("件 " + a.id + " 的复制源不存在：" + f);
      } else if (a.kind === "guide") {
        if (!a.recipe) fails.push("件 " + a.id + " 是 guide 但缺 recipe");
      } else fails.push("件 " + a.id + " 的 kind 只能是 copy / guide");
    }
    for (const id of m.always || []) if (!ids.has(id)) fails.push("矩阵 always 指向不存在的件 " + id);
    for (const [axis, row] of Object.entries(m.include || {})) {
      if (!axisKeys.includes(axis)) { fails.push("矩阵 include 有未知轴 " + axis); continue; }
      for (const [v, list] of Object.entries(row)) {
        if (!m.axes[axis].values.includes(v)) fails.push("矩阵 include." + axis + " 的取值 " + v + " 不在枚举内");
        for (const id of list) if (!ids.has(id)) fails.push("矩阵 include." + axis + "." + v + " 指向不存在的件 " + id);
      }
    }
  }
}

// —— 探针 12：条目必须可复核（两侧；带「已退役」的条目豁免）
//   P 侧（principles/）：`> 证据：` 行 + 至少一个 A-NN + 「怎么查」。
//   A 侧（anti-patterns/）：至少一个 P-NN（= 它指得回一条判据 / 待转正）+「怎么早发现」。
// 为什么两侧都判：P-06..P-10 的核心主张是「结论要能被复核」—— 原则自己先得做到（否则「横铺 = 抄标题」）；
// 反例同理：不指回判据的反例只是一段故事（P-23），没有「怎么早发现」的反例只能事后读。A 侧只判「有没有指」，不判「指得对不对」（= P-15 的不可机械类）。
for (const [p, t] of txt) {
  const r0 = rel(p);
  const isPrinciple = r0.startsWith("principles/");
  const isAnti = r0.startsWith("anti-patterns/");
  if (!isPrinciple && !isAnti) continue;
  for (const sec of t.split(/^## /m).slice(1)) {
    const head = sec.match(/^((?:P|A)-\d{2})\s+/);
    if (!head) continue;
    const id = head[1];
    if (id.startsWith("P-") !== isPrinciple) continue; // 只判本目录该有的条目：P 在 principles/，A 在 anti-patterns/
    if (/^> \*\*已退役\*\*/m.test(sec)) continue; // 只认收尾清单规定的退役标记行
    if (isPrinciple) {
      if (requireEvidenceRow && !/^> 证据：/m.test(sec)) fails.push("缺证据行 " + id + "（" + r0 + " · 探针 12）");
      if (!/\bA-\d{2}\b/.test(sec)) fails.push("未引用任何反例 " + id + "（" + r0 + " · 探针 12）");
      if (!sec.includes("怎么查")) fails.push("缺「怎么查」" + id + "（" + r0 + " · 探针 12）");
    } else {
      if (!/\bP-\d{2}\b/.test(sec)) fails.push("反例未指回判据 " + id + "（" + r0 + " · 探针 12）");
      if (!sec.includes("怎么早发现")) fails.push("缺「怎么早发现」" + id + "（" + r0 + " · 探针 12）");
    }
  }
}

// —— 探针 14：册号跨目录一致（principles/ · anti-patterns/ 同名同号）
// 编号 = 14：「候选探针 13」（handoff 五段）仍占 13 号，别再撞。
// 判两件事：① 文件名 NN 与首行「· NN 」一致；② 同一 slug 在三目录里必须是同一个号、同一号必须是同一个 slug。
// 为什么：B2b-7 真出过 01/05 同名两号（牵 28 处 / 9 文件），当时只统一了数据、没加门。
const VOL_DIRS = ["principles", "anti-patterns", "evidence"];
const slugNums = new Map(); // slug -> Map<num, Set<dir>>
const numSlugs = new Map(); // num -> Map<slug, Set<dir>>
for (const dir of VOL_DIRS) {
  const d = join(ROOT, dir);
  if (!existsSync(d)) continue;
  for (const e of readdirSync(d, { withFileTypes: true })) {
    if (!e.isFile() || !e.name.endsWith(".md")) continue;
    const fm = e.name.match(/^(\d{2})-(.+)\.md$/);
    if (!fm) continue;
    const num = fm[1], slug = fm[2];
    const head = (readFileSync(join(d, e.name), "utf8").split(/\r?\n/).find((l) => l.startsWith("# ")) || "");
    const hm = head.match(/·\s*(\d{2})\s/);
    if (!hm) fails.push("册首无册号 " + dir + "/" + e.name + "（探针 14）");
    else if (hm[1] !== num) fails.push("册号与首行不一致 " + dir + "/" + e.name + " 文件名 " + num + " ≠ 首行 " + hm[1] + "（探针 14）");
    if (!slugNums.has(slug)) slugNums.set(slug, new Map());
    if (!slugNums.get(slug).has(num)) slugNums.get(slug).set(num, new Set());
    slugNums.get(slug).get(num).add(dir);
    if (!numSlugs.has(num)) numSlugs.set(num, new Map());
    if (!numSlugs.get(num).has(slug)) numSlugs.get(num).set(slug, new Set());
    numSlugs.get(num).get(slug).add(dir);
  }
}
for (const [slug, nums] of slugNums) if (nums.size > 1) fails.push("同名册号不一致 " + slug + "：" + [...nums.keys()].join(" / ") + "（探针 14）");
for (const [num, slugs] of numSlugs) if (slugs.size > 1) fails.push("同号不同名 " + num + "：" + [...slugs.keys()].join(" / ") + "（探针 14）");

if (frozenSet.size) console.log("[check-kit] 存量冻结 " + frozenSet.size + " 个（欠账，非合法；--update-baseline 可重建）");
for (const w of warns) console.log("[check-kit] WARN " + w);
for (const f of fails) console.error("[check-kit] FAIL " + f);
if (fails.length) { console.error("[check-kit] " + fails.length + " FAIL / " + warns.length + " WARN"); process.exit(1); }
console.log("[check-kit] 通过（" + mds.length + " md / 0 FAIL / " + warns.length + " WARN）");
