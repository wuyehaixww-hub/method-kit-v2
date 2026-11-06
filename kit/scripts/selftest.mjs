#!/usr/bin/env node
// selftest.mjs — 证明门禁真的会咬：在临时副本上逐个注入违规，断言退出码。
// 用法: node kit/scripts/selftest.mjs   （exit 0 = 全部符合预期 / 1 = 有探针没咬或误咬）
// 为什么要它：一次性手工注入故障（「当轮会红」）下一棒无法复跑；只学到「当前是绿的」不等于「它会红」。
import { cpSync, mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, statSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, dirname, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

function makeBase() {
  const cands = [process.env.TEMP, process.env.TMP, process.env.TMPDIR,
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Temp") : null, tmpdir()].filter(Boolean);
  for (const c of cands) { try { return mkdtempSync(join(c, "kit-selftest-")); } catch { /* 换下一个 */ } }
  return mkdtempSync(join(ROOT, "..", "_kit-selftest-"));
}
const BASE = makeBase();

// 每个 fixture 都造一个空 .git：findRoot 以它作为「工作树边界」，否则边界逻辑测不到
function copyTo(dst) {
  cpSync(ROOT, dst, { recursive: true, filter: (s) => !s.split(sep).includes(".git") });
  mkdirSync(join(dst, ".git"));
  return dst;
}
function run(cwd, dir, script, args) {
  try {
    const stdout = execFileSync(process.execPath, [join(dir, "kit", "scripts", script), ...(args || [])], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, stdout };
  } catch (e) {
    // 非零退出时 execFileSync 抛错；stdout 仍要收 —— 输出断言（B3-8）靠它
    return { status: typeof e.status === "number" ? e.status : -1, stdout: String(e.stdout || "") };
  }
}
function rewrite(file, fn) { writeFileSync(file, fn(readFileSync(file, "utf8")), "utf8"); }
// 让 CLAUDE.md 补到「总字节 = 上限 - margin」，返回该补白长度（margin < 强制归档线 → 触发 WARN）
function coldTarget(d) {
  // 冷启动首件（形状无关：不写死文件名 —— 换了仓 / 换了入口壳文件名仍可跑）
  return JSON.parse(readFileSync(join(d, "kit.config.json"), "utf8")).coldStart.files[0];
}
function padTo(d, margin) {
  const cs = JSON.parse(readFileSync(join(d, "kit.config.json"), "utf8")).coldStart;
  const target = cs.files[0];
  const others = cs.files.filter((f) => f !== target).reduce((s, f) => s + statSync(join(d, f)).size, 0);
  return Math.max(1024, cs.limitBytes - margin - others);
}

// tag / 期望退出码 / 脚本 / 注入 / 是否传 --root
const CASES = [
  ["baseline", 0, "check-kit.mjs", () => {}, true],
  ["map-row-missing", 1, "check-kit.mjs", (d) => rewrite(join(d, "README.md"), (t) => t.split("\n").filter((l) => !l.startsWith("| P-05 |")).join("\n")), true],
  // P-99 = 配额上限（quotas.l0MaxEntries = 40）之外的**死号**，不可能成为真 ID —— 用它当「必然不存在」，不违反 P-13（不是「会变的观测值」）
  ["bad-crossref", 1, "check-kit.mjs", (d) => rewrite(join(d, "README.md"), (t) => t + "\n（对照）见 P-99。\n"), true],
  // 多探针烟测（实测连带 1 / 8 / 9 / 12）：它证明「大册会被拦」，**不是**「只有探针 3 会红」—— 探针 3 的隔离态 = 下面的 oversize-ondemand
  ["oversize-volume", 1, "check-kit.mjs", (d) => writeFileSync(join(d, "principles", "99-big.md"), "## P-99 大册\n\n" + "y".repeat(51 * 1024), "utf8"), true],
  // 探针 3 的独立态：放 session-notes/（onDemand 有档位上限）、带「按节读」标记 → 只触「超档位」；行数 / 单行 / 按节读都在限内
  // 依赖：onDemand.limitBytes 与 maxLines 从配置取；改档位 / 改探针 3 判定后必须重跑隔离对照
  ["oversize-ondemand", 1, "check-kit.mjs", (d) => {
    const c = JSON.parse(readFileSync(join(d, "kit.config.json"), "utf8"));
    const lim = c.capacityTiers.onDemand.limitBytes;
    const n = c.capacityTiers.maxLines - 1;
    const per = Math.ceil((lim + 2048) / n);
    const lines = ["按节读（对照占位）"];
    for (let i = 1; i < n; i++) lines.push("y".repeat(per - 1));
    // 目录不保证存在：V2 按设计不带 session-notes/（整目录不进）→ 先建再写；已存在时无副作用。
    // 档位仍按路径前缀路由（session-notes/ → onDemand），建目录不改变被测语义。
    mkdirSync(join(d, "session-notes"), { recursive: true });
    writeFileSync(join(d, "session-notes", "big-marker.md"), lines.join("\n") + "\n", "utf8");
  }, true],
  // 版本号也要**相对当前值**造故障：写死 "0.2.0-dev" 会在发版后变成「恰好一致」而假绿（本轮真踩）
  ["version-mismatch", 1, "check-kit.mjs", (d) => {
    // 本包不带发布门（profile=lite）→ 该态显式升 full，并补一份不引用任何 ID 的变更日志，使红只来自探针 6
    writeFileSync(join(d, "CHANGELOG.md"), "## [0.0.0-x]\n\n（对照占位）\n", "utf8");
    writeFileSync(join(d, "VERSION"), readFileSync(join(d, "VERSION"), "utf8").trim() + "-mismatch\n", "utf8");
  }, true, ["--profile=full"]],
  // 孤儿 fixture 的编号必须**动态推导**：写死「下一个空号」会在该号被占用后变成「非孤儿」而假绿（A-08 / P-13 同型；2026-10-31 真踩）
  ["orphan-entry", 1, "check-kit.mjs", (d) => {
    let max = 0;
    const walkAll = (dir) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) walkAll(p);
        else if (e.name.endsWith(".md")) for (const m of readFileSync(p, "utf8").matchAll(/(?:P|A)-(\d{2})/g)) max = Math.max(max, Number(m[1]));
      }
    };
    walkAll(d);
    const id = "A-" + String(max + 1).padStart(2, "0");
    // fixture 自带 P 指针 + 「怎么早发现」：本态要证明的是**探针 9**（孤儿），不能顺带触探针 12 的 A 侧（否则隔离被污染）
    rewrite(join(d, "anti-patterns", "05-intake.md"), (t) => t + "\n## " + id + " 孤儿反例（对照）\n\n- 现象：无。\n- 正解：P-01（对照占位）。\n- 怎么早发现：无。\n");
  }, true],
  ["quota-exceeded", 1, "check-kit.mjs", (d) => {
    const p = join(d, "kit.config.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.quotas.l0MaxEntries = 4;
    writeFileSync(p, JSON.stringify(c, null, 2), "utf8");
  }, true],
  // P0-1：没有配置 → 人话 + exit 2（不是裸栈）
  ["no-config", 2, "check-kit.mjs", (d) => rmSync(join(d, "kit.config.json")), false],
  // P0-2：祖先目录放假配置 → 不得被静默采用（.git 边界挡住）
  ["config-in-ancestor", 2, "check-kit.mjs", null, false],
  // 放宽后的探针 5：含空格 / 中文的本方法仓路径必须进面（旧正则的盲区）
  ["space-deadlink", 1, "check-kit.mjs", (d) => rewrite(join(d, "README.md"), (t) => t + "\n（对照）见 `kit/不存在 的文件.md`。\n"), true],
  // 命令示例不得被当路径（假阳性回归锁）
  ["command-not-path", 0, "check-kit.mjs", (d) => rewrite(join(d, "README.md"), (t) => t + "\n（对照）`node kit/scripts/read-plan.mjs README.md` 不算路径。\n"), true],
  // 探针 5 的历史盲区（2026-11-05 三组对照 / 2026-11-06 改逐行配对）：围栏行与落单反引号会让「整份文件配对」错位，
  // 其后的死链被吞进同一个 token → **静默漏检**。四态覆盖：成对围栏 / 落单反引号 / 未闭合围栏 / ~~~ 围栏。
  ["fence-deadlink", 1, "check-kit.mjs", (d) => writeFileSync(join(d, "zz-probe5-fence.md"), "```text\n（代码示例）\n```\n\n（对照）见 `kit/scripts/nope-probe5.md`。\n"), true],
  ["stray-tick-deadlink", 1, "check-kit.mjs", (d) => writeFileSync(join(d, "zz-probe5-tick.md"), "`\n\n（对照）见 `kit/scripts/nope-probe5.md`。\n"), true],
  // 闭合围栏后再来一条落单围栏（2026-11-06 复核实测的形状）：整段散文不得被跳过
  ["unclosed-fence-deadlink", 1, "check-kit.mjs", (d) => writeFileSync(join(d, "zz-probe5-unclosed.md"), "```text\n（已闭合块）\n```\n\n```\n\n（对照）见 `kit/scripts/nope-probe5.md`。\n"), true],
  ["tilde-fence-deadlink", 1, "check-kit.mjs", (d) => writeFileSync(join(d, "zz-probe5-tilde.md"), "~~~text\n（围栏示例）\n~~~\n\n（对照）见 `kit/scripts/nope-probe5.md`。\n"), true],
  // lite profile：无 VERSION / CHANGELOG 也能绿（发布门降级为 WARN）
  ["lite-no-version", 0, "check-kit.mjs", (d) => { rmSync(join(d, "VERSION")); rmSync(join(d, "CHANGELOG.md"), { force: true }); }, true, ["--profile=lite"]],
  // 接入层：矩阵被改坏 / 轴值非法 / 最小档可跑
  // 探针 12：条目缺「证据行」→ 必红（删行而不是改值：与 version-mismatch 同族，不编码当前内容）
  ["evidence-required", 1, "check-kit.mjs", (d) => {
    // 形状无关两件一起做：① 把开关拨回 true（出厂件可能是关的）② 删掉每册第一条证据行
    // 有证据行的仓（作者仓）→ 删行必红；没有证据行的仓（发布件）→ 开关一开就必红。两种形状都成立。
    // 与下一条 evidence-row-off 成对：**默认要求时必红 / 关闭后必绿**。只测关闭不测默认 = 假绿。
    const p = join(d, "kit.config.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.probes = Object.assign({}, c.probes, { evidenceRow: true });
    writeFileSync(p, JSON.stringify(c, null, 2), "utf8");
    for (const f of readdirSync(join(d, "principles")).filter((x) => x.endsWith(".md"))) {
      rewrite(join(d, "principles", f), (t) => t.replace(/^> 证据：.*$/m, ""));
    }
  }, true],
  // 探针 12 的 P 侧「证据行关闭」态（2026-11-02 / ADR-0003 §6②）：配置置 false + 删证据行 → 必须绿。
  // 与上一条 missing-evidence 成对：**默认仍红**（不削弱本方法仓的门）+ **关闭后绿**（V2 能用同一套门禁）。只测关闭不测默认 = 假绿。
  ["evidence-row-off", 0, "check-kit.mjs", (d) => {
    const p = join(d, "kit.config.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    c.probes = Object.assign({}, c.probes, { evidenceRow: false });
    writeFileSync(p, JSON.stringify(c, null, 2), "utf8");
    for (const f of readdirSync(join(d, "principles")).filter((x) => x.endsWith(".md"))) {
      rewrite(join(d, "principles", f), (t) => t.replace(/^> 证据：.*$/m, ""));
    }
  }, true],
  // 探针 7 的独立态：超阈但未超档位（session-notes = onDemand）→ 只有「缺按节读声明」会红（2026-10-31 补，D11 的一半）
  // 依赖：session-notes/ 的档位上限 > sectionRead.thresholdBytes。改档位后必须重跑隔离对照（关掉探针 7 → 该态应变绿）
  ["section-read-missing", 1, "check-kit.mjs", (d) => {
    const c = JSON.parse(readFileSync(join(d, "kit.config.json"), "utf8"));
    const n = c.capacityTiers.maxLines - 1;
    const lineLen = Math.ceil((c.sectionRead.thresholdBytes + 2048) / n) - 1;
    mkdirSync(join(d, "session-notes"), { recursive: true }); // 同 oversize-ondemand：不假定该目录存在
    writeFileSync(join(d, "session-notes", "big-no-marker.md"), ("y".repeat(lineLen) + "\n").repeat(n), "utf8");
  }, true],
  // 探针 12 的 A 侧独立态：反例不指回任何判据（P-NN）→ 必红。删的是**指针**、不改值（与 missing-evidence 同族，P-13）；
  // 隔离：该注入只打 anti-patterns/，principles/ 不动 → 探针 12 的 P 侧与探针 1 / 2 / 9 都不受影响
  ["antipattern-unlinked", 1, "check-kit.mjs", (d) => {
    for (const f of readdirSync(join(d, "anti-patterns")).filter((x) => x.endsWith(".md"))) {
      rewrite(join(d, "anti-patterns", f), (t) => t.replace(/\bP-\d{2}\b/g, "对应的判据"));
    }
  }, true],
  ["matrix-broken", 1, "check-kit.mjs", (d) => {
    const p = join(d, "kit", "intake", "matrix.json");
    const m = JSON.parse(readFileSync(p, "utf8"));
    m.always.push("no-such-artifact");
    writeFileSync(p, JSON.stringify(m, null, 2), "utf8");
  }, true],
  ["adopt-bad-axis", 2, "adopt-plan.mjs", () => {}, false, ["--horizon=bogus"]],
  ["adopt-minimal", 0, "adopt-plan.mjs", () => {}, false, ["--horizon=oneoff", "--risk=none", "--scale=tiny", "--agency=human"]],
  ["coldstart-ok", 0, "cold-start-size.mjs", () => {}, true],
  ["coldstart-missing", 1, "cold-start-size.mjs", (d) => rmSync(join(d, coldTarget(d)), { force: true }), true],
  // 补白按配置上限**动态**算：写死字节会随文档长大而误报（本次实测：README 变大后 25,896 的补白直接超硬门）
  ["coldstart-over", 1, "cold-start-size.mjs", (d) => writeFileSync(join(d, coldTarget(d)), "x".repeat(padTo(d, -1024)), "utf8"), true],
  // WARN 的余量从 forceArchiveMarginBytes 推导（阈值的一半）：写死 1200 会在阈值变化后失效（P-13）
  ["coldstart-warn", 0, "cold-start-size.mjs", (d) => {
    const cs = JSON.parse(readFileSync(join(d, "kit.config.json"), "utf8")).coldStart;
    writeFileSync(join(d, coldTarget(d)), "x".repeat(padTo(d, Math.floor(cs.forceArchiveMarginBytes / 2))), "utf8");
  }, true],
  ["coldstart-no-config", 2, "cold-start-size.mjs", (d) => rmSync(join(d, "kit.config.json")), false],
  // A-16 的独立态：不带 --root 且 cwd 在**另一个目录** → 量错对象必须 exit 2（2026-11-01 真实接入：它给了 OK + exit 0）
  ["coldstart-wrong-cwd", 2, "cold-start-size.mjs", () => {}, false],
  // 缺阈值 = 硬门静默失效（NaN 比较恒假，2026-11-01 复核实测「打印 NaN B 仍 OK」）
  ["coldstart-no-limit", 2, "cold-start-size.mjs", (d) => {
    const p = join(d, "kit.config.json");
    const c = JSON.parse(readFileSync(p, "utf8"));
    delete c.coldStart.limitBytes;
    writeFileSync(p, JSON.stringify(c, null, 2), "utf8");
  }, true],
  // 同一条护栏的另一半（2026-11-01 补）：check-kit 此前没有它 —— 站在目标仓里跑会量到 kit 自己还照常给绿
  ["checkkit-wrong-cwd", 2, "check-kit.mjs", () => {}, false],
  // 落地裁剪（2026-11-01）：copy 件的**两处**判据各配一个独立态 —— 同一份文件上它们不会互相顶掉
  // 夹具走 --root _trim（相对 cwd）：顺带证明「相对 --root」与「点名项目根」两条都成立
  ["trim-clean", 0, "trim-scan.mjs", (d) => {
    mkdirSync(join(d, "_trim", "docs"), { recursive: true });
    writeFileSync(join(d, "_trim", "CLAUDE.md"), "# 甲\n\n> 查原则 → `docs/principles.md`；命令：`git status`。\n", "utf8");
    writeFileSync(join(d, "_trim", "docs", "principles.md"), "# 原则\n", "utf8");
  }, false, ["--root", "_trim", "CLAUDE.md"]],
  ["trim-deadlink", 1, "trim-scan.mjs", (d) => {
    mkdirSync(join(d, "_trim"), { recursive: true });
    writeFileSync(join(d, "_trim", "CLAUDE.md"), "# 甲\n\n> 本会话记录 → `session-notes/2026-10-01-x.md`。\n", "utf8");
  }, false, ["--root", "_trim", "CLAUDE.md"]],
  ["trim-placeholder", 1, "trim-scan.mjs", (d) => {
    mkdirSync(join(d, "_trim"), { recursive: true });
    writeFileSync(join(d, "_trim", "CLAUDE.md"), "# <项目名>\n\n> 规则正文在 `<真源目录>/`。\n", "utf8");
  }, false, ["--root", "_trim", "CLAUDE.md"]],
  // 代码块里的**命令**也算一个面（F3：INTAKE 的验收命令在没装门的项目上是空指针）；反引号那条态盖不住它
  // 「扫 0 个文件也报 0」= 盲测抓出、当场补的那条判据 → 必须配态（P-12）
  ["trim-empty-scope", 2, "trim-scan.mjs", (d) => {
    mkdirSync(join(d, "_trim"), { recursive: true });
    writeFileSync(join(d, "_trim", "kit.config.json"), JSON.stringify({ coldStart: { files: [] } }), "utf8");
  }, false, ["--root", "_trim"]],
  ["trim-cmd-path", 1, "trim-scan.mjs", (d) => {
    mkdirSync(join(d, "_trim"), { recursive: true });
    writeFileSync(join(d, "_trim", "INTAKE.md"), "# INTAKE\n\n## 4. 验收\n\n```\nnode scripts/cold-start-size.mjs\n```\n", "utf8");
  }, false, ["--root", "_trim", "INTAKE.md"]],
  // 探针 14 的独立注入态：只改首行册号（不动文件名 → 不连带死链探针），应只由「册号与首行不一致」红
  ["volume-number-mismatch", 1, "check-kit.mjs", (d) => rewrite(join(d, "anti-patterns", "05-intake.md"), (t) => t.replace("· 05 ", "· 06 ")), true],
  // 探针 10 的 inbox 分支（此前只有一次性夹具、无常驻态）：inbox 现 1 份 README + 51 份 → 52 > 50
  ["inbox-quota-exceeded", 1, "check-kit.mjs", (d) => {
    mkdirSync(join(d, "inbox"), { recursive: true });
    for (let i = 0; i < 51; i++) writeFileSync(join(d, "inbox", "x" + i + ".md"), "# x\n", "utf8");
  }, true],
  // —— project-scan 识别面（2026-11-06 B3-8）：10 正 + 3 负；只断言输出契约，不看计数（P-13）——
  // 隔离：从 project-scan 的 MANIFESTS 删掉对应 reader → 正例变红；把 token 提取退回全文小写 → 两个 URL 负例变红。
  ["scan-pyproject", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "pyproject.toml"), "[project]\nname = \"x\"\ndependencies = [\n  \"sqlalchemy>=2\",\n]\n\n[project.optional-dependencies]\ndev = [\"httpx\"]\n", "utf8");
  }, true, [], { has: [/声明式文件：.*pyproject\.toml/, /持久化/, /网络/] }],
  ["scan-package-json", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "package.json"), "{\"dependencies\": {\"axios\": \"1.0.0\", \"prisma\": \"5.0.0\"}}", "utf8");
  }, true, [], { has: [/声明式文件：.*package\.json/, /持久化/, /网络/] }],
  ["scan-pubspec", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "pubspec.yaml"), "name: x\n\ndependencies:\n  http: ^1.0.0\n  sqflite: ^2.0.0\n", "utf8");
  }, true, [], { has: [/声明式文件：.*pubspec\.yaml/, /持久化/, /网络/] }],
  ["scan-cargo", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "Cargo.toml"), "[package]\nname = \"x\"\nversion = \"0.1.0\"\n\n[dependencies]\nsqlx = { version = \"0.7\", features = [\"sqlite\"] }\nreqwest = \"0.11\"\n", "utf8");
  }, true, [], { has: [/声明式文件：.*Cargo\.toml/, /持久化/, /网络/] }],
  ["scan-go", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "go.mod"), "module example.com/x\n\ngo 1.22\n\nrequire (\n\tgithub.com/jackc/pgx/v5 v5.5.0\n\tgithub.com/go-resty/resty/v2 v2.11.0\n)\n", "utf8");
  }, true, [], { has: [/声明式文件：.*go\.mod/, /持久化/, /网络/] }],
  ["scan-requirements", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "requirements.txt"), "sqlalchemy==2.0\nrequests>=2.31\n", "utf8");
  }, true, [], { has: [/声明式文件：.*requirements\.txt/, /持久化/, /网络/] }],
  ["scan-composer", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "composer.json"), "{\"require\": {\"doctrine/orm\": \"^2.0\", \"guzzlehttp/guzzle\": \"^7.0\"}}", "utf8");
  }, true, [], { has: [/声明式文件：.*composer\.json/, /持久化/, /网络/] }],
  ["scan-gemfile", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "Gemfile"), "source \"https://rubygems.org\"\n\ngem \"sequel\"\ngem \"faraday\"\n", "utf8");
  }, true, [], { has: [/声明式文件：.*Gemfile/, /持久化/, /网络/] }],
  ["scan-pom", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "pom.xml"), "<project><dependencies><dependency><groupId>org.hibernate</groupId><artifactId>hibernate-core</artifactId></dependency><dependency><groupId>com.squareup.okhttp3</groupId><artifactId>okhttp</artifactId></dependency></dependencies></project>", "utf8");
  }, true, [], { has: [/声明式文件：.*pom\.xml/, /持久化/, /网络/] }],
  ["scan-gradle", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "build.gradle"), "dependencies {\n  implementation(\"org.jetbrains.exposed:exposed-core:0.50.0\")\n  implementation(\"com.squareup.retrofit2:retrofit:2.9.0\")\n}\n", "utf8");
  }, true, [], { has: [/声明式文件：.*build\.gradle/, /持久化/, /网络/] }],
  ["scan-no-manifest", 0, "project-scan.mjs", () => {}, true, [], { has: [/声明式文件：无/], hasNot: [/持久化/, /网络/] }],
  ["scan-pyproject-url-only", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "pyproject.toml"), "[project]\nname = \"x\"\n\n[project.urls]\nHomepage = \"https://example.com\"\n", "utf8");
  }, true, [], { has: [/声明式文件：.*pyproject\.toml/], hasNot: [/网络/] }],
  ["scan-pubspec-url-only", 0, "project-scan.mjs", (d) => {
    writeFileSync(join(d, "pubspec.yaml"), "name: x\nhomepage: https://example.com\nenvironment:\n  sdk: \">=3.0.0 <4.0.0\"\n", "utf8");
  }, true, [], { has: [/声明式文件：.*pubspec\.yaml/], hasNot: [/网络/, /持久化/] }],
];

let bad = 0;
try {
  for (const [tag, want, script, mutate, useRoot, extraArgs, expect] of CASES) {
    let d;
    if (tag === "config-in-ancestor") {
      const parent = join(BASE, "anc");
      mkdirSync(parent, { recursive: true });
      writeFileSync(join(parent, "kit.config.json"), JSON.stringify({ decoy: true }), "utf8");
      d = copyTo(join(parent, "proj"));
      rmSync(join(d, "kit.config.json"));
    } else {
      d = copyTo(join(BASE, tag));
      if (mutate) mutate(d);
    }
    // A-16：这条态的 cwd 故意放在**仓外**，其余态 cwd = 仓根
    let cwdForRun = d;
    if (tag.endsWith("-wrong-cwd")) {
      cwdForRun = join(BASE, tag + "-elsewhere");
      mkdirSync(cwdForRun, { recursive: true });
    }
    const args = [...(useRoot ? ["--root", d] : []), ...(extraArgs || [])];
    const res = run(cwdForRun, d, script, args);
    const got = res.status;
    // expect 可选：has = 输出必须命中；hasNot = 输出不得命中（B3-8：project-scan 的输出契约）
    const outOk = !expect || (
      (expect.has || []).every((re) => re.test(res.stdout)) &&
      (expect.hasNot || []).every((re) => !re.test(res.stdout))
    );
    const pass = got === want && outOk;
    if (!pass) bad++;
    const label = script === "check-kit.mjs" ? "check-kit  " : script === "trim-scan.mjs" ? "trim-scan  " : script === "project-scan.mjs" ? "project-scan" : "cold-start  ";
    console.log((pass ? "[selftest] PASS " : "[selftest] FAIL ") + tag.padEnd(22) + label + " exit " + got + "（期望 " + want + "）" + (expect ? " · 输出断言 " + (outOk ? "PASS" : "FAIL") : ""));
  }
} finally {
  if (process.env.KIT_SELFTEST_KEEP) console.log("[selftest] 保留副本：" + BASE);
  else rmSync(BASE, { recursive: true, force: true });
}
if (bad) { console.error("[selftest] " + bad + " 项不符合预期 —— 门禁没咬 / 误咬，先修再提交"); process.exit(1); }
console.log("[selftest] 全部 " + CASES.length + " 项符合预期（门禁会咬）");
