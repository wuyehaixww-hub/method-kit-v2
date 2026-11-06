#!/usr/bin/env node
// project-scan.mjs — 只读扫描一个项目，给「接入判定」提供事实底。
// 用法: node kit/scripts/project-scan.mjs [--root <dir>] [--max-files 20000]
// 纪律: 只读；有边界（跳构建产物 / 限深 / 限条数，超限打 TRUNCATED）；
//       事实与推断分开打印 —— 推断一律标 [?] 且注明「可被一句话推翻」。
// 识别面（2026-11-06 B3-8）: package.json / pubspec.yaml / pyproject.toml / requirements.txt / Pipfile /
//   Cargo.toml / go.mod / composer.json / Gemfile / pom.xml / build.gradle / build.gradle.kts
// 边界: 只读**仓根**的固定清单；不递归 workspace / 子模块；不读 lockfile（Cargo.lock / poetry.lock /
//   package-lock.json / go.sum …）；不判版本 / 漏洞 / 发布面；不认 Package.swift / *.csproj / mix.exs /
//   requirements/*.txt。单件超过 256 KiB 只读前 256 KiB（清单不是正文）。
// 为什么只取依赖 token: 拿全文匹配会把 homepage = "https://…" / go module path 误报成「网络依赖」。
// 注入态（P-12，态在本仓 selftest）: scan-pyproject / scan-package-json / scan-pubspec / scan-cargo / scan-go / scan-requirements /
//   scan-composer / scan-gemfile / scan-pom / scan-gradle = 临时仓根写对应清单；
//   scan-no-manifest / scan-pyproject-url-only / scan-pubspec-url-only = 负例（输入不在 / 有清单无依赖 / 只有 URL）。
// 隔离: 从 MANIFESTS 删掉对应 reader -> 正例变红；把 token 提取退回全文小写 -> 两个 URL 负例变红。
import { readdirSync, readFileSync, existsSync, statSync, openSync, readSync, closeSync } from "node:fs";
import { join, resolve, relative } from "node:path";
import { execFileSync } from "node:child_process";

const argv = process.argv.slice(2);
const val = (k) => { const p = argv.find((a) => a === k || a.startsWith(k + "=")); if (!p) return null; if (p.includes("=")) return p.slice(p.indexOf("=") + 1); return argv[argv.indexOf(p) + 1] || null; };
const ROOT = resolve(val("--root") || process.cwd());
const MAX_FILES = Number(val("--max-files") || 20000);
const MAX_DEPTH = 6;
const MAX_MANIFEST_BYTES = 262144;
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

// —— 声明式清单（只读仓根）——
const MANIFESTS = [
  ["package.json", "npm"],
  ["pubspec.yaml", "pubspec"],
  ["pyproject.toml", "toml"],
  ["requirements.txt", "requirements"],
  ["Pipfile", "toml"],
  ["Cargo.toml", "toml"],
  ["go.mod", "go"],
  ["composer.json", "composer"],
  ["Gemfile", "gemfile"],
  ["pom.xml", "pom"],
  ["build.gradle", "gradle"],
  ["build.gradle.kts", "gradle"],
];

function readCapped(p) {
  try {
    const st = statSync(p);
    if (st.size <= MAX_MANIFEST_BYTES) return readFileSync(p, "utf8").replace(/^\uFEFF/, "");
    const fd = openSync(p, "r");
    const buf = Buffer.alloc(MAX_MANIFEST_BYTES);
    const n = readSync(fd, buf, 0, MAX_MANIFEST_BYTES, 0);
    closeSync(fd);
    return buf.toString("utf8", 0, n).replace(/^\uFEFF/, "");
  } catch { return null; }
}

function quotedNames(s) {
  const out = [];
  for (const m of s.matchAll(/["']([^"']+)["']/g)) {
    const name = m[1].trim().split(/[<>=!~;\[\] ]/)[0];
    if (name) out.push(name);
  }
  return out;
}

function tomlDeps(text) {
  const out = [];
  let sec = "";
  let arrayBuf = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    const sm = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (sm) { sec = sm[1].trim().replace(/^["']|["']$/g, "").toLowerCase(); arrayBuf = null; continue; }
    const sub = sec.match(/(?:^|\.)(dependencies|dev-dependencies|build-dependencies)\.([a-z0-9_-]+)$/);
    if (sub) { out.push(sub[2]); continue; }
    const depSec = /(?:^|\.)(dependencies|dev-dependencies|build-dependencies|packages|dev-packages)$/.test(sec);
    const projSec = sec === "project" || sec === "project.optional-dependencies" || sec === "dependency-groups";
    if (!depSec && !projSec) continue;
    if (arrayBuf !== null) {
      arrayBuf += " " + line;
      if (line.includes("]")) { out.push(...quotedNames(arrayBuf)); arrayBuf = null; }
      continue;
    }
    const kv = line.match(/^\s*([A-Za-z0-9_."'-]+)\s*=\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1].replace(/^["']|["']$/g, "");
    const val = kv[2];
    const arrayOK = depSec || (sec === "project" ? key === "dependencies" : true);
    if (arrayOK && /^\s*\[/.test(val)) {
      if (val.includes("]")) out.push(...quotedNames(val));
      else arrayBuf = val;
    } else if (depSec) {
      out.push(key);
    }
  }
  return out;
}

function pubspecDeps(text) {
  const out = [];
  let inDeps = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, "");
    if (/^\S/.test(line)) { inDeps = /^(dependencies|dev_dependencies)\s*:/.test(line); continue; }
    if (!inDeps) continue;
    const m = line.match(/^ {2}([A-Za-z0-9_]+)\s*:/);
    if (m) out.push(m[1]);
  }
  return out;
}

function requirementsDeps(text) {
  const out = [];
  for (let line of text.split(/\r?\n/)) {
    line = line.trim();
    if (!line || line.startsWith("#")) continue;
    if (/^(-r|--requirement|-c|--constraint|-e|--editable|--index-url|--extra-index-url|--find-links|--trusted-host|--no-)/i.test(line)) continue;
    if (line.includes("://")) continue;
    const m = line.match(/^([A-Za-z0-9][A-Za-z0-9._-]*)/);
    if (m) out.push(m[1]);
  }
  return out;
}

function goDeps(text) {
  const out = [];
  let inReq = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, "").trim();
    if (!line) continue;
    if (/^require\s*\($/.test(line)) { inReq = true; continue; }
    if (inReq && line === ")") { inReq = false; continue; }
    if (inReq) { const m = line.match(/^(\S+)\s+v/); if (m) out.push(m[1]); continue; }
    const one = line.match(/^require\s+(\S+)\s+v/);
    if (one) out.push(one[1]);
  }
  return out;
}

function gemfileDeps(text) {
  return [...text.matchAll(/^\s*gem\s+['"]([^'"]+)['"]/gm)].map((m) => m[1]);
}

function pomDeps(text) {
  const out = [];
  for (const block of text.matchAll(/<dependency\b[\s\S]*?<\/dependency>/g)) {
    for (const tag of ["groupId", "artifactId"]) {
      const m = block[0].match(new RegExp("<" + tag + ">\\s*([^<]+?)\\s*</" + tag + ">"));
      if (m) out.push(m[1]);
    }
  }
  return out;
}

function gradleDeps(text) {
  const out = [];
  const re = /\b(?:implementation|api|compileOnly|runtimeOnly|testImplementation|testRuntimeOnly|androidTestImplementation|debugImplementation|kapt|ksp)\s*\(?\s*["']([^"']+)["']/g;
  for (const m of text.matchAll(re)) {
    const parts = m[1].split(":");
    for (const p of parts.slice(0, 2)) if (p) out.push(p);
  }
  return out;
}

function depsOf(kind, text) {
  if (kind === "npm") { try { const o = JSON.parse(text); return Object.keys(Object.assign({}, o.dependencies, o.devDependencies)); } catch { return []; } }
  if (kind === "composer") { try { const o = JSON.parse(text); return [...Object.keys(o.require || {}), ...Object.keys(o["require-dev"] || {})]; } catch { return []; } }
  if (kind === "pubspec") return pubspecDeps(text);
  if (kind === "toml") return tomlDeps(text);
  if (kind === "requirements") return requirementsDeps(text);
  if (kind === "go") return goDeps(text);
  if (kind === "gemfile") return gemfileDeps(text);
  if (kind === "pom") return pomDeps(text);
  if (kind === "gradle") return gradleDeps(text);
  return [];
}

const manifestFiles = [];
const depTokens = new Set();
const texts = new Map();
for (const [file, kind] of MANIFESTS) {
  const p = join(ROOT, file);
  try { if (!existsSync(p) || !statSync(p).isFile()) continue; } catch { continue; }
  manifestFiles.push(file);
  const text = readCapped(p);
  if (text == null) continue;
  texts.set(file, text);
  for (const d of depsOf(kind, text)) {
    const name = String(d || "").trim().toLowerCase();
    if (name) depTokens.add(name);
  }
}
const depList = [...depTokens];
const hasSub = (n) => depList.some((t) => t.includes(n));
const hasName = (n) => depList.some((t) => t === n || t.startsWith(n + "_") || t.includes("/" + n));
const pkg = (() => { try { return JSON.parse(texts.get("package.json") || ""); } catch { return null; } })();
const pubspec = texts.get("pubspec.yaml") || null;

console.log("[scan] 目标 = " + ROOT);
console.log("[scan] —— 事实 ——");
console.log("  目录 " + dirs + " 个 · 文件 " + files + " 个" + (truncated ? "（**TRUNCATED**：已到 " + MAX_FILES + " 上限，下面的计数是下限）" : ""));
console.log("  顶层目录：" + (top.slice(0, 12).join(" / ") || "（空）") + (top.length > 12 ? " …共 " + top.length + " 个" : ""));
console.log("  .md 文档 " + md.length + " 个 · 合计 " + (md.reduce((s, x) => s + x.size, 0) / 1024).toFixed(1) + " KiB");
for (const x of md.sort((a, b) => b.size - a.size).slice(0, 3)) console.log("    最大：" + relative(ROOT, x.p).split("\\").join("/") + " " + x.size + " B");
console.log("  声明式文件：" + (manifestFiles.length ? manifestFiles.join(" / ") : "无"));
console.log("  测试目录：" + (testDirs.join(" / ") || "无") + " · CI：" + (ciDirs.join(" / ") || "无"));
let gitInfo = "无 .git（不是 git 仓，或还没 init）";
if (existsSync(join(ROOT, ".git"))) {
  try {
    const c = (a) => execFileSync("git", a, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    gitInfo = c(["rev-list", "--count", "HEAD"]) + " 个提交 · 首提交 " + c(["log", "--max-parents=0", "--format=%ad", "--date=short", "-1"]) + " · 最近 " + c(["log", "-1", "--format=%ad", "--date=short"]);
  } catch { gitInfo = "有 .git 但读不到历史（未提交？）"; }
}
console.log("  git：" + gitInfo);

// —— 推断（每条都可被用户一句话推翻；只作第二轮选档的输入，不作结论）——
const PERSIST_SUB = ["prisma", "drizzle", "typeorm", "knex", "sequelize", "sqlite", "drift", "sqflite", "sqlalchemy", "sqlmodel", "psycopg", "asyncpg", "alembic", "peewee", "tortoise", "pymongo", "motor", "diesel", "sqlx", "rusqlite", "sea-orm", "sled", "gorm", "mongo-driver", "hibernate", "mybatis", "jooq", "jdbc", "exposed", "doctrine", "activerecord", "sequel", "mongoid"];
const PERSIST_NAME = ["hive", "isar", "pgx"];
const NET_SUB = ["axios", "node-fetch", "undici", "openai", "anthropic", "requests", "httpx", "aiohttp", "urllib3", "grpcio", "boto3", "botocore", "google-cloud", "reqwest", "hyper", "ureq", "tonic", "actix-web", "axum", "resty", "grpc", "okhttp", "retrofit", "guzzle", "faraday", "httparty", "http"];
const NET_NAME = ["dio"];
const sql = (() => { try { return readdirSync(ROOT).some((n) => n.toLowerCase().endsWith(".sql")) || top.some((d) => /migrat|schema/i.test(d)); } catch { return false; } })();
const hasDotenvFile = (() => { try { return readdirSync(ROOT).some((n) => n.startsWith(".env")); } catch { return false; } })();

const signals = [];
if (sql || PERSIST_SUB.some(hasSub) || PERSIST_NAME.some(hasName)) signals.push("持久化 / 迁移痕迹 → **risk 可能需要 data**");
if (NET_SUB.some(hasSub) || NET_NAME.some(hasName)) signals.push("网络 / 外部服务依赖 → 可能有对外契约或密钥");
if (hasDotenvFile || hasSub("dotenv")) signals.push("存在 .env* / 依赖 dotenv → 有密钥/配置分离的负担");
if (pkg && pkg.version && pkg.private !== true) signals.push("package.json 有 version 且非 private → 可能对外发布（不可逆面）");
if (pubspec && /^version:/m.test(pubspec)) signals.push("pubspec 有 version → 可能有发布动作");
if (testDirs.length) signals.push("已有测试目录 → 可直接接「改完必跑」这条约束");
if (md.length >= 10) signals.push("文档存量 ≥10 个 → 接入前必须先 --update-baseline 冻结，否则首跑全红");
console.log("[scan] —— 推断（[?] 可被一句话推翻，别当事实）——");
if (!signals.length) console.log("  [?] 没扫到明显信号（空目录 / 极小项目）→ 默认按 oneoff + tiny 起问");
for (const s of signals) console.log("  [?] " + s);
console.log("[scan] 下一步：带着上面的事实进 grill 第一轮；**先问、再判**，别用推断替代用户的回答。");
