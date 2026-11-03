#!/usr/bin/env node
// project-scan.mjs — 只读扫描一个项目，给「接入判定」提供事实底。
// 用法: node kit/scripts/project-scan.mjs [--root <dir>] [--max-files 20000]
// 纪律: 只读；有边界（跳构建产物 / 限深 / 限条数，超限打 TRUNCATED）；
//       事实与推断分开打印 —— 推断一律标 [?] 且注明「可被一句话推翻」。
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const val = (k) => { const p = argv.find((a) => a === k || a.startsWith(k + "=")); if (!p) return null; if (p.includes("=")) return p.slice(p.indexOf("=") + 1); return argv[argv.indexOf(p) + 1] || null; };
const ROOT = resolve(val("--root") || process.cwd());
const MAX_FILES = Number(val("--max-files") || 20000);
const MAX_DEPTH = 6;
const SKIP = new Set(["node_modules", ".git", "dist", "build", ".dart_tool", "venv", ".venv", "__pycache__", ".next", "target", "coverage", ".dsh", ".idea", ".vscode"]);

if (!existsSync(ROOT)) { console.error("[scan] 目录不存在：" + ROOT); process.exit(2); }

const md = [];
let files = 0, dirs = 0, truncated = false;
function walk(dir, depth) {
  if (depth > MAX_DEPTH) return;
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    if (files >= MAX_FILES) { truncated = true; return; }
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (SKIP.has(e.name) || e.name.startsWith(".git")) continue; dirs++; walk(p, depth + 1); }
    else { files++; if (e.name.toLowerCase().endsWith(".md")) { try { md.push({ p, size: statSync(p).size }); } catch { /* 跳过 */ } } }
  }
}
walk(ROOT, 0);

const top = readdirSync(ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && !SKIP.has(e.name) && !e.name.startsWith(".git")).map((e) => e.name);
const has = (name) => existsSync(join(ROOT, name));
const testDirs = ["test", "tests", "__tests__", "spec", "integration_test"].filter(has);
const ciDirs = [".github/workflows", ".gitlab-ci.yml", "azure-pipelines.yml", ".circleci"].filter(has);

console.log("[scan] 目标 = " + ROOT);
console.log("[scan] —— 事实 ——");
console.log("  目录 " + dirs + " 个 · 文件 " + files + " 个" + (truncated ? "（**TRUNCATED**：已到 " + MAX_FILES + " 上限，下面的计数是下限）" : ""));
console.log("  顶层目录：" + (top.slice(0, 12).join(" / ") || "（空）") + (top.length > 12 ? " …共 " + top.length + " 个" : ""));
console.log("  .md 文档 " + md.length + " 个 · 合计 " + (md.reduce((s, x) => s + x.size, 0) / 1024).toFixed(1) + " KiB");
for (const x of md.sort((a, b) => b.size - a.size).slice(0, 3)) console.log("    最大：" + relative(ROOT, x.p).split("\\").join("/") + " " + x.size + " B");
console.log("  测试目录：" + (testDirs.join(" / ") || "无") + " · CI：" + (ciDirs.join(" / ") || "无"));
let gitInfo = "无 .git（不是 git 仓，或还没 init）";
if (existsSync(join(ROOT, ".git"))) {
  try {
    const c = (a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    gitInfo = c(["rev-list", "--count", "HEAD"]) + " 个提交 · 首提交 " + c(["log", "--reverse", "--format=%ad", "--date=short", "-1"]) + " · 最近 " + c(["log", "-1", "--format=%ad", "--date=short"]);
  } catch { gitInfo = "有 .git 但读不到历史（未提交？）"; }
}
console.log("  git：" + gitInfo);

// —— 推断（每条都可被用户一句话推翻；只作第二轮选档的输入，不作结论）
const readJson = (p) => { try { return JSON.parse(readFileSync(join(ROOT, p), "utf8")); } catch { return null; } };
const pkg = readJson("package.json");
const depsOf = (o) => Object.keys(Object.assign({}, o && o.dependencies, o && o.devDependencies));
const pubspec = (() => { try { return readFileSync(join(ROOT, "pubspec.yaml"), "utf8"); } catch { return null; } })();
const deps = depsOf(pkg).join(" ").toLowerCase() + " " + (pubspec || "").toLowerCase();
const hit = (re) => re.test(deps);
const sql = md.length >= 0 && (() => { try { return readdirSync(ROOT).some((n) => n.toLowerCase().endsWith(".sql")) || top.some((d) => /migrat|schema/i.test(d)); } catch { return false; } })();

const signals = [];
if (sql || hit(/prisma|drizzle|typeorm|knex|sequelize|sqlite|drift|sqflite|hive|isar/)) signals.push("持久化 / 迁移痕迹 → **risk 可能需要 data**");
if (hit(/axios|node-fetch|undici|openai|anthropic|dio|http/)) signals.push("网络 / 外部服务依赖 → 可能有对外契约或密钥");
if (readdirSync(ROOT).some((n) => n.startsWith(".env"))) signals.push("存在 .env* → 有密钥/配置分离的负担");
if (pkg && pkg.version && pkg.private !== true) signals.push("package.json 有 version 且非 private → 可能对外发布（不可逆面）");
if (pubspec && /^version:/m.test(pubspec)) signals.push("pubspec 有 version → 可能有发布动作");
if (testDirs.length) signals.push("已有测试目录 → 可直接接「改完必跑」这条约束");
if (md.length >= 10) signals.push("文档存量 ≥10 个 → 接入前必须先 --update-baseline 冻结，否则首跑全红");
console.log("[scan] —— 推断（[?] 可被一句话推翻，别当事实）——");
if (!signals.length) console.log("  [?] 没扫到明显信号（空目录 / 极小项目）→ 默认按 oneoff + tiny 起问");
for (const s of signals) console.log("  [?] " + s);
console.log("[scan] 下一步：带着上面的事实进 grill 第一轮；**先问、再判**，别用推断替代用户的回答。");
