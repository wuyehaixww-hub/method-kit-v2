#!/usr/bin/env node
// trim-scan.mjs — copy 件的「落地裁剪」体检（目标项目侧；不读阈值、不进 check-kit 的探针面）
// 用法: node kit/scripts/trim-scan.mjs [--root <dir>] [<file> ...]
//   --root 默认 = **当前目录**（不是脚本所在目录）：本脚本天生跨项目跑，量错对象是它的头号失败形态（A-16）
//   不给文件参数时 = <root>/kit.config.json 的 coldStart.files（+`INTAKE.md`，若存在 —— 它也是 copy 件：F3）
// 退出码: 0 = 两处计数都为 0 / 1 = 有命中 / 2 = 环境错误（root 不存在 / 范围是 0 个文件 / 读不到文件 / 配置缺 coldStart.files）
// 口径（改这里 = 改判据 → 同步 skills/coldstart-intake 第 1 步；数字必须带单位，P-25）：
//   · 占位符 = 正则 <[^<>\n]{1,40}> 的**出现次数**（不是行数、不是件数）
//   · 死指针 = **文件形态**（末段在扩展名白名单里，不是「含 "."」—— 否则 `v0.10.0` / `coldStart.files` 会被误判）、相对路径、existsSync 为假的引用。两个面：
//       ① 反引号内：跳过 URL / 跨仓前缀（`src` + 冒号）/ 盘符或 / 开头的绝对路径 / "-" 开头的参数 / 含 <>*?{}|… 的
//       ② 代码块内（``` 围栏）的命令行：不判命令本身，只判它带的**带 / 与扩展名**的参数（F3：INTAKE 的验收命令在没装门的项目上是空指针）
//   · 目录形态（`session-notes/` 这类以 / 结尾、或末段无扩展名）**不判** —— 目标项目可能还没建它
//   · 反引号与代码块之外（正文里的裸路径、md 链接、锚点）**不判** —— 那是人看的，别假装机器管得住（P-15）
// 适用面：**只管目标项目**的 copy 件。kit 本方法仓不适用 —— 它的三件里本来就有跨仓指针与面向将来的路径，红了不等于本方法仓有病。
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(name); return i < 0 ? null : (argv[i + 1] || null); };
const die = (msg) => { console.error("[trim] " + msg); console.error("[trim] 退出码 2 = 环境错误（不是裁剪没做完）"); process.exit(2); };

const ROOT = opt("--root") ? resolve(opt("--root")) : process.cwd();
const positional = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--root");

if (!existsSync(ROOT) || !statSync(ROOT).isDirectory()) die("--root 指的不是一个目录：" + ROOT);

// 范围：位置参数 > 配置的 coldStart.files
let files = positional.slice();
let source = "位置参数";
if (!files.length) {
  const cfgPath = join(ROOT, "kit.config.json");
  if (!existsSync(cfgPath)) die("既没给文件参数，" + ROOT + " 里也没有 kit.config.json —— 不知道要扫哪几件");
  let cfg;
  try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); } catch (e) { die("kit.config.json 不是合法 JSON：" + (e && e.message)); }
  if (!cfg.coldStart || !Array.isArray(cfg.coldStart.files)) die("kit.config.json 缺 coldStart.files（数组）");
  files = cfg.coldStart.files.slice();
  if (existsSync(join(ROOT, "INTAKE.md")) && !files.includes("INTAKE.md")) files.push("INTAKE.md");
  source = "kit.config.json 的 coldStart.files" + (files.includes("INTAKE.md") ? " + 已存在的 INTAKE.md" : "");
}
if (!files.length) die("范围是 0 个文件 —— 扫 0 个也报 0 就是假绿（A-01 同族），先确认 coldStart.files");
for (const f of files) if (!existsSync(join(ROOT, f))) die("要扫的文件不存在：" + join(ROOT, f) + "（缺件归 cold-start-size 判，不归本脚本）");

const CMD = /^(node|npm|npx|pnpm|yarn|git|python|python3|pwsh|powershell|cmd|bash|sh|cd|ls|dir|cat|type|echo|Test-Path|Get-Content|Select-String|mkdir|rm|cp|mv)$/i;
const PLACEHOLDER = /<[^<>\n]{1,40}>/g;
const TICKED = /`([^`\n]+)`/g;

const holes = [];
const dead = [];

// 文件形态的**相对**路径？是 → 返回规整后的 token；否则 null
const EXT = /\.(md|markdown|json|jsonc|mjs|cjs|js|ts|py|txt|ya?ml|toml|ps1|bat|sh|css|html|sql|db|lock|cfg|ini)$/i;
function fileish(p) {
  if (!p || p.startsWith("-")) return null;
  if (p.startsWith(".") && !p.startsWith("./")) return null;   // `.md` / `.sync-state` 这类前缀式 token 不是路径
  if (/^[a-z]+:\/\//i.test(p)) return null;
  if (p.startsWith("src" + ":")) return null;
  if (/^[A-Za-z]:[\\/]/.test(p) || p.startsWith("/")) return null;
  if (/[<>*?{}|…]/.test(p)) return null;
  if (/[\\/]$/.test(p)) return null;
  const seg = p.replace(/^\.\//, "").split("/").pop();
  if (!seg || !EXT.test(seg)) return null;
  return p.replace(/^\.\//, "");
}
function pushDead(rel, n, p, why) {
  if (!existsSync(join(ROOT, p))) dead.push(rel + ":" + n + "  " + p + (why ? "（" + why + "）" : ""));
}
// 一行看起来是命令：判它带的带 / 参数的路径（F3）
function scanCommandLine(rel, n, line) {
  const parts = line.trim().split(/\s+/);
  if (!CMD.test(parts[0])) return false;
  for (const p of parts.slice(1)) {
    if (!/[\\/]/.test(p)) continue;           // 裸文件名不当路径（git status / npm run build / python x.py）
    const f = fileish(p);
    if (f) pushDead(rel, n, f, "命令里的路径");
  }
  return true;
}

for (const rel of files) {
  let lines;
  try { lines = readFileSync(join(ROOT, rel), "utf8").split(/\r?\n/); }
  catch (e) { die("读不了 " + join(ROOT, rel) + "：" + (e && e.message) + "（传目录 / 无权限都走这条，不冒充「有命中」）"); }
  let fence = false;
  lines.forEach((line, idx) => {
    const n = idx + 1;
    const ph = line.match(PLACEHOLDER);   // String#match 对 /g 正则会自己归零 lastIndex
    if (ph) for (const p of ph) holes.push(rel + ":" + n + "  " + p);
    if (/^\s*```/.test(line)) { fence = !fence; return; }
    if (fence) { scanCommandLine(rel, n, line); return; }
    for (const m of line.matchAll(TICKED)) {
      const tok = m[1].trim();
      if (!tok) continue;
      if (scanCommandLine(rel, n, tok)) continue;
      const f = fileish(tok);
      if (f) pushDead(rel, n, f, null);
    }
  });
}

console.log("[trim] 项目根 = " + ROOT);
console.log("[trim] 范围 = " + files.length + " 个文件（来源 = " + source + "）：" + files.join(" · "));

if (holes.length) {
  console.log("[trim] 占位符 " + holes.length + " 处（按出现次数）—— 换成真实值，换不了就删整行");
  for (const h of holes) console.log("         " + h);
}
if (dead.length) {
  console.log("[trim] 死指针 " + dead.length + " 处（按 token 计）—— 指向本项目不存在的文件");
  for (const d of dead) console.log("         " + d);
}
if (!holes.length && !dead.length) {
  console.log("[trim] 占位符 0 处 · 死指针 0 处");
  console.log("[trim] OK：裁剪完成");
  process.exit(0);
}
console.log("[trim] FAIL：裁剪未完成（占位符 " + holes.length + " 处 · 死指针 " + dead.length + " 处）");
process.exit(1);
