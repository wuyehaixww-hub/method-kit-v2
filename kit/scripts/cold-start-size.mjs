#!/usr/bin/env node
// cold-start-size.mjs — 冷启动最小面体积门禁（常量读 kit.config.json，单一书写）
// 用法: node kit/scripts/cold-start-size.mjs [--root <dir>]
// 退出码: 0 = 通过（余量不足只 WARN）/ 1 = 缺文件或超硬门 / 2 = 环境错误（找不到或读不懂配置）
import { readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const iRoot = process.argv.indexOf("--root");

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
  console.error("[cold-start] " + msg);
  console.error("[cold-start] 退出码 2 = 环境错误（不是门禁红）。修法见 kit/templates/kit.config.json.template 与 README 的「第 0 步」");
  process.exit(2);
}

if (iRoot > -1 && !process.argv[iRoot + 1]) die("--root 后面要给目录");
const ROOT = iRoot > -1 ? resolve(process.argv[iRoot + 1]) : findRoot(HERE);
if (!ROOT) die("未找到 kit.config.json：从 " + HERE + " 向上到工作树边界都没有。先建它（模板 = kit/templates/kit.config.json.template）");

// A-16：不带 --root 时「仓根」来自**脚本所在目录**，不是 cwd。站在别的仓里跑 → 量错对象、照常给绿
// （2026-11-01 真实接入实测：在目标项目里跑本脚本 → 量了 kit 自己 · OK · exit 0）
if (iRoot < 0) {
  const cwd = process.cwd();
  if (cwd !== ROOT && !cwd.startsWith(ROOT + sep)) {
    die("你在 " + cwd + "，但脚本向上找到的仓是 " + ROOT + " —— 量错对象了（判定行与退出码会来自另一个仓）。要量当前目录：--root . ；要量别的仓：--root <目录>");
  }
}
const cfgPath = join(ROOT, "kit.config.json");
if (!existsSync(cfgPath)) die("目录 " + ROOT + " 里没有 kit.config.json");
let cfg;
try { cfg = JSON.parse(readFileSync(cfgPath, "utf8")); } catch (e) { die("kit.config.json 不是合法 JSON：" + (e && e.message)); }
if (!cfg.coldStart || !Array.isArray(cfg.coldStart.files)) die("kit.config.json 缺 coldStart.files（数组）");

const cs = cfg.coldStart;
// 缺阈值 = 硬门静默失效（NaN 比较恒假 → 打印 NaN B 还 OK，2026-11-01 复核实测）：不猜默认值，直接退 2
for (const k of ["limitBytes", "forceArchiveMarginBytes"]) {
  if (!Number.isFinite(cs[k])) die("coldStart." + k + " 必须是数字（现在是 " + JSON.stringify(cs[k]) + "）—— 缺了它这道门会静默给绿");
}
let total = 0, missing = 0;
console.log("[cold-start] 配置 = " + cfgPath);
for (const f of cs.files) {
  let size = null;
  try { size = statSync(join(ROOT, f)).size; } catch { missing++; }
  if (size !== null) total += size;
  console.log((size === null ? "     MISSING" : String(size).padStart(6) + " B").padEnd(13) + f);
}
const margin = cs.limitBytes - total;
console.log("[cold-start] " + total + " B / " + cs.limitBytes + " B（余量 " + margin + " B）");
if (missing > 0) { console.error("[cold-start] FAIL 缺文件 " + missing + " 个（路径相对 " + ROOT + "）"); process.exit(1); }
if (margin < 0) { console.error("[cold-start] FAIL 超硬门"); process.exit(1); }
if (margin < cs.forceArchiveMarginBytes) console.log("[cold-start] WARN 余量 < " + cs.forceArchiveMarginBytes + " B ⇒ 强制归档");
else console.log("[cold-start] OK");
