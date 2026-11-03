#!/usr/bin/env node
// adopt-plan.mjs — 由「4 个轴取值」算出该装哪些件。**纯函数，不猜**：同样的轴永远同一份计划。
// 用法:
//   node kit/scripts/adopt-plan.mjs --horizon=weeks --risk=data --scale=small --agency=copilot [--json]
//   node kit/scripts/adopt-plan.mjs            # 只打印轴取值说明与合法值
// 退出码: 0 正常 / 2 参数非法（轴名不认识、取值不在枚举内、缺值）
import { readFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const MATRIX = join(ROOT, "kit", "intake", "matrix.json");
let M;
try { M = JSON.parse(readFileSync(MATRIX, "utf8")); } catch (e) { console.error("[adopt] 读不到矩阵 " + MATRIX + "：" + e.message); process.exit(2); }

const argv = process.argv.slice(2);
const flag = (k) => argv.find((a) => a === "--" + k || a.startsWith("--" + k + "=")) || null;
const value = (k) => { const p = flag(k); if (!p) return null; if (p.includes("=")) return p.slice(p.indexOf("=") + 1); const i = argv.indexOf(p); return argv[i + 1] || null; };
const die = (msg) => { console.error("[adopt] " + msg); process.exit(2); };

const axisNames = Object.keys(M.axes);
if (!flag("horizon") && !flag("risk") && !flag("scale") && !flag("agency")) {
  console.log("[adopt] 用法：node kit/scripts/adopt-plan.mjs --horizon=<v> --risk=<v> --scale=<v> --agency=<v>");
  for (const k of axisNames) {
    const a = M.axes[k];
    console.log("  --" + k.padEnd(8) + " " + a.values.join(" | ") + "   （默认 " + a.default + "）");
    console.log("           " + a.question);
  }
  console.log("[adopt] 缺省轴按矩阵默认值补：不答 = 默认，不是负债。");
  process.exit(0);
}

const axes = {};
for (const k of axisNames) {
  const raw = value(k);
  const v = raw || M.axes[k].default;
  if (!M.axes[k].values.includes(v)) die("轴 " + k + " 的取值 " + JSON.stringify(v) + " 不合法，合法值 = " + M.axes[k].values.join(" | "));
  axes[k] = v;
}

const pick = new Set(M.always);
for (const k of axisNames) {
  const row = (M.include[k] || {})[axes[k]] || [];
  for (const id of row) pick.add(id);
}
const byId = new Map(M.artifacts.map((a) => [a.id, a]));
for (const id of pick) if (!byId.has(id)) die("矩阵里 include 指向了不存在的件：" + id);
const selected = M.artifacts.filter((a) => pick.has(a.id));
const excluded = M.artifacts.filter((a) => !pick.has(a.id));

if (argv.includes("--json")) {
  console.log(JSON.stringify({ axes, selected: selected.map((a) => a.id), excluded: excluded.map((a) => ({ id: a.id, to_enable_when: a.to_enable_when })) }, null, 2));
  process.exit(0);
}

console.log("[adopt] 轴 = " + axisNames.map((k) => k + "=" + axes[k]).join(" · "));
console.log("[adopt] 装 " + selected.length + " 件：" + selected.map((a) => a.id).join(" · "));
for (const a of selected) {
  console.log("  ✔ " + a.id + " · " + a.name + (a.enforcement === "gate" ? "  [门禁]" : a.enforcement === "advisory" ? "  [提示]" : "  [文档]"));
  console.log("      防：" + a.prevents);
  if (a.kind === "copy") console.log("      拷：" + a.files.join(" + "));
  else console.log("      做：" + a.recipe);
  console.log("      验收：" + a.accept);
}
console.log("[adopt] 不装 " + excluded.length + " 件（**不是否定，是延后**；到条件再加，别现在装）：");
for (const a of excluded) console.log("  ✘ " + a.id + " · " + a.name + " —— 触发：" + a.to_enable_when);
console.log("[adopt] 下一步：把这些抄进 INTAKE.md（模板 = kit/templates/INTAKE.md.template），再跑每件的验收命令。");
