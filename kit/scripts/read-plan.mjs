#!/usr/bin/env node
// read-plan.mjs — 节图即时生成；不落盘行区间（防腐烂）
import { readFileSync, statSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("用法: node kit/scripts/read-plan.mjs <file.md>"); process.exit(2); }
const text = readFileSync(file, "utf8");
const lines = text.split(/\r?\n/);
const bytes = statSync(file).size;
const heads = [];
for (let i = 0; i < lines.length; i++) {
  const m = /^(#{1,3})\s+(.+)$/.exec(lines[i]);
  if (m) heads.push({ level: m[1].length, title: m[2].trim(), line: i + 1 });
}
const avg = bytes / Math.max(lines.length, 1);
console.log(file + " — 总 " + bytes + " B / " + lines.length + " 行（均 " + avg.toFixed(1) + " B/行）");
heads.forEach((h, i) => {
  const end = i + 1 < heads.length ? heads[i + 1].line - 1 : lines.length;
  const n = end - h.line + 1;
  console.log("  ".repeat(h.level - 1) + "L" + String(h.line).padStart(5) + "–" + String(end).padStart(5) +
    "  " + String(n).padStart(4) + " 行  ~" + String(Math.round(n * avg)).padStart(6) + " B  " + h.title);
});
