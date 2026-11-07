---
name: fit-kit
description: Use when someone has just got method-kit and has to decide whether and how it fits their own project — align both sides first (read the kit, scan the target with a bounded scan), then triage into 装 / 取 / 不用 (adopt / extract / skip) and hand off a plan. 触发词：这套适合我吗、该不该用、装什么、适配、从哪开始、我项目要不要引入、先别装。
---

> **This is the English version of `skills/fit-kit/SKILL.md`.** The Chinese version is authoritative; if the two disagree, follow the Chinese one.

"Fitting" = **measure both sides first, then decide whether to wear it**. Output = an **adaptation plan** (decision + which criteria / which artifacts + conflicts + review trigger) plus a **record** (for the next relay and for you three months from now).

It is not "adopt" (`skills/adopt-kit/SKILL.md`) and not "extract" (`skills/extract-kit/SKILL.md`): those two **execute**; this one stops at "which road, and what is step one".

## When to use

- You just got method-kit and want to know "should my project use it, and which criteria".
- You intend to use it but aren't sure between "adopt" and "extract", or how many artifacts.
- You have a project but **cannot name one concrete failure** (it fails the entry test of `skills/extract-kit/SKILL.md`).

## When not to use

- You have decided on the whole kit → go straight to `skills/adopt-kit/SKILL.md`.
- You already have a named failure → go straight to `skills/extract-kit/SKILL.md` (one at a time).
- You want to maintain method-kit itself → answer "maintaining" at §0: if the package **has** a maintainer layer (division of labor / closeout / where material goes), follow it; **no** maintainer layer = you have a release build, the package is not editable — change it upstream or fork and build your own process.

## Hard discipline (six rules; crossing them is failure)

1. **Do not assume the kit is better**: the user's existing method is not demoted for being theirs. Duplication / contradiction → list it + recommend, **the user decides**; "don't use it" is a valid answer (`P-05`).
2. **Look before asking**: anything visible in the repo must not be asked (see the "can I look it up" column in §2).
3. **Triage only, never execute**: adopting / extracting belongs to the other two protocols; this one writes no files in the user's repo (except the record).
4. **Do not copy criteria**: cite the `P-NN` number, never move the text — two copies = `A-06`, and `skills/` has no content probe, so drift stays green.
5. **Report volume, never time**: say "you'll read 12 docs / about 380 KB", not "two minutes" — elapsed time depends on model speed (40–70 tok/s vs 200 tok/s is a 3–5× difference).
6. **"I don't know" has three fallbacks** (§3); silent assumptions are forbidden.

## §0 Orientation (three items; two can be self-answered)

| Question | How to get it | Watch out |
|---|---|---|
| Is this about **maintaining** the kit, or **using it in your project** | Must ask, one sentence | maintaining → look for a maintainer layer (division of labor / closeout / where material goes): present → point there, this session ends; absent → say "this is a release build, the package is not editable", session ends (both **end the interview**) |
| Where is the target project | **Self-answer in two steps**: ① is cwd **the method repo itself** (package root has both `kit.config.json` and `skills/`)? yes → ask for the target, **never treat the package as the target** ② no → is cwd a repo (has `README.md` / `.git` / `CLAUDE.md`)? | ② yes → report it and confirm; ② no → ask for a path; **not built yet** → ask lifetime / volume / difficulty first |
| **Where this copy of the method** lives | Must ask, three options | leave it / move it next to the project / **put it inside the project**. Putting it inside **requires a warning**: the user's own gates will scan **its** files too (capacity tiers / dead links / IDs) and may turn red immediately |

> **Must-ask ≠ ask word for word**: if the opening sentence already answered it, take it and write "inferred from the opening" in the record; **don't ask again**. But "where this copy of the method lives" **cannot be skipped** (putting it inside pollutes the user's gates).

> **Language**: work in the user's language — infer it from the opening; if you can't, ask one sentence (**do not add a seventh question**). Core terms per `GLOSSARY.en.md` (use it if the package has it).

## §1 Alignment table (entry first → then volume → then decide how deep to scan)

### 1.1 Entry sentinels (mandatory; ≤3 files)
The **first three that exist** of `README.md` / `CLAUDE.md` / `AGENTS.md` / `CONTRIBUTING.md` at the repo root. They usually say where the rule text lives — that is the entrance to the "extended surface", and it beats guessing directory names.

### 1.2 Volume snapshot (list only, do not read; do not open file contents)
Exclude `.git` / `node_modules` / `vendor` / `dist` / `build` and generated files; count by class:
- **Docs** (`.md` / `.txt` / `.rst`): count + total bytes ← **this is the class decisions use**
- **Code**: number of source files (separate from docs, to avoid "big project = many rules")
- **Assets / generated**: images, binaries, lock files, huge directories
- **Top-level directories** (≤15) + **the largest 5 files**

**Counts use the docs class only**; manifests / CI / lint configs **are read but are not counted** — otherwise the 30 / 150 tier boundaries would quietly move.

### 1.3 How deep: four tiers (default "standard"; volume, never time)

> Volume only decides **which tier is the default**, not the ceiling. A tier buys "how many facts you can see", not "how accurate the verdict is" — the verdict still depends on the user's intent (§2 questions 1 / 2 / 5), and no amount of reading changes that.

| Tier | What the agent reads | Volume | What it buys | The output must say |
|---|---|---|---|---|
| **Light** | entry sentinels (§1.1) + volume snapshot (§1.2, list only) | ≤3 | ① volume ② the system the entry claims | "I only looked at the entry" |
| **Standard (default)** | + the few extended-surface files most likely to be rule text, by `##` outline | ≤5 read whole | + where existing rules sit, duplication / conflicts | "read these sections / did not read those" |
| **Deep** | + **shape scan**: titles / first paragraphs / table headers of constraint docs, **no body** | ≤30 shape-scanned + ≤8 read whole | + one identifiable failure instance | "shape-scanned N, read M in full" |
| **Huge** | divide the scan: a read-only subagent (`skills/subagent-dispatch/SKILL.md`) or a new session → raw material → brief (**protocol not built yet**, ledger §5) | unbounded | same, by division of labor | the plan + the raw-material list |

**Choosing the default**: ≤30 docs and ≤300 KB → **standard, no need to ask**; 31–150 docs or ≤2 MB → **report volume → stop → ask once** (light / standard / deep); >150 docs or >2 MB or several files >200 KB → suggest **deep** or **huge**, **and say plainly "I can't read that much in one go"** (say it, then propose — don't decide for the user), again after reporting volume. **If the user skips, use standard** and record "unanswered".

**Two disciplines unchanged**: **don't read only the first 30 lines** — failures often live in the second half (`P-04` read by section); **no filesystem access** (pure chat / no read permission) → degrade: ask the user to paste the entry file + 3 key rule docs, or go straight to §2.

**Shape scanning is not a shortcut**: titles can look like rules while the body is notes — so after a shape scan you still write "read M in full".

> **A single file too big / docs growing** → `skills/doc-governance/SKILL.md` (measure the read limit, then apply the four questions of `P-32` to decide whether to split; this file only cares about adopt / extract / skip).

### 1.4 Scan discipline
**Read-only**: never run the user's gates, never write files. **Stop and report at the volume ceiling of your §1.3 tier**; don't keep following references. Every fact carries a source (file + line); never "roughly" — `P-24`.

**Code surface: three-way boundary (implementation is not read by default)**

| Class | Read? | Examples |
|---|---|---|
| Declarative | **read** | manifests / CI config / lint·format config / commit conventions / `CODEOWNERS` / migrations list |
| Contract layer | **read** | schema / openapi / proto / type definitions |
| Rule-shaped code | may read (by section) | scripts called by CI / hooks / in-house lint plugins / generators |
| Implementation | **never** | business logic / components / data models / algorithms |
| Test bodies | only **file names + `describe` / `it` titles** | —— |

**Exception channel** (when business semantics exist only in implementation; off by default): ① **who opens it** — the user asks, or you ask and get an **explicit yes** ("didn't object" does not count); ② **say before you read** — one sentence: which files / which question it answers / which conclusion it might change; ③ **name it afterwards** — the plan and the record say "I read implementation: <files> (to decide X)". Ceiling ≤3 files, read by section (`P-04`); it may only answer "what is this business rule / contract", **never critique code quality** (hard discipline 3).

**Where business semantics come from, in order**: ① the user says it (§2 questions 2 / 3) → ② the README's "what is this" + the contract layer → ③ only if both fail, use the exception channel.

**Numbers and line numbers are copied, not computed**: counts / bytes / commits each get one live command output; **two different numbers in one session = stop and recount**; a cited line number must come from a line-numbered read — read that line again after writing and paste exactly what it says. Options shown to the user **never contain a number you did not run**.
**Read only part** → the plan must state "read these sections / **did not read that one** / what it affects" (`P-30` branch; omitting it means the conclusion rests on what you skipped).

## §2 Ask (6 questions; one at a time; sub-questions may be grouped; every question has a default)

| # | What to ask | Can I look it up? | When the user says "I don't know" |
|---|---|---|---|
| 1 | How far should this project go (throwaway / will change a few times / long-term) | ❌ intent | give three tiers + my recommendation ("I'd guess B: you have history, but thin") |
| 2 | What bad outcome do you fear most (don't care / breaking what others use / losing data) | ❌ values | switch to a scenario: "what worries you more — **something other people use getting broken**, or **your data disappearing**?" |
| 3 | The last thing that "shouldn't have happened but did" — give me one instance | ⚠️ half (look in git log / existing records) | offer 3 candidates to pick from; none fits → record "no instance yet" |
| 4 | Any rules / docs already in use | ✅ **scan** (§1 already got it) | **don't ask**: report "I see X / Y / Z, right?" |
| 5 | Who decides, who executes (you / you take advice / AI executes, you spot-check) | ❌ only they know | give three tiers + a default (copilot) |
| 6 | How much are you willing to invest now for "less trouble later": **minimum** (just the first screen + one byte gate) / **regular** (+ session flow / pit index / prompt skeletons) / **full** (+ closeout / handoff / ledger / evidence map) — each tier carries half a sentence of "how many artifacts + what each one asks of you" | ❌ only they know | switch to a scenario: "do you care more about **not being bothered now**, or **tripping less later**?" still no answer → default to **regular** and record "unanswered"; **never ask in time units, never quote elapsed time** (hard discipline 5) |

**Skip = accept the default** (every question has one); **one question at a time** — the previous answer decides what to ask and how finely (the answer to Q1 decides which three tiers Q6 offers); **only sub-questions under the same question** (supplements that don't change the direction) may be grouped: **≤3, put the one "without which this conclusion collapses" first, give each a recommendation**; **any unanswered / timed-out item = take the default and mark "unanswered" in the plan and the record**. Stop after six; do not add questions.

> **Why not fire them all at once**: piled up, the agent's descriptions get coarse and the user loses the thread; and the six **depend on each other** (an earlier answer changes how a later one is asked). The grilling template (`kit/templates/grill-decisions.md.template`) is **stricter: strictly one question, one answer, sub-questions are not grouped either**.

> **What Q6's three tiers are**: by **how many artifacts you maintain**, not by elapsed time — minimum = cold-start surface + byte gate; regular = + session flow / pit index / prompt skeletons; full = + closeout / handoff / ledger / evidence map. The artifact table's source of truth = `kit/intake/matrix.json` (`horizon`); this file does not restate it.
>
> **This question only asks "how much", never "whether"** — "extract one criterion" is the verdict of §4, not part of this question; the tier names are fixed as minimum / regular / full and **must not be rewritten into other action types**.

## §3 Three fallbacks for "I don't know"

1. **Change the wording**: term → scenario sentence (don't ask "do you have criteria", ask "do you have sentences like 'currently 12 files' that will be wrong in two months"). **If that still fails, borrow something from their own project** — use their "final version / locked copy / handover checklist"; it takes half the words of explaining "criterion / ledger".
2. **Offer options + my recommendation**: don't ask open questions — open questions are where "I don't know" breeds.
3. **Default + trace**: still unknown → proceed with the default, but record "user was unsure, handled with default X; come back when signal Y appears" (`P-14`: debts must be enumerable).

**Two special states**:

- **Nobody is there** (the agent runs on its own, or the user just says "your call") → take the default for every question and write at the top of the plan "**based on defaults + scan facts, not confirmed by the user**".
- **What the user says conflicts with what you scanned** (they describe a doc system, you see two md files) → **write both** and let them decide; **never silently take either side** (self-assessment is only to be verified, `P-19`).

## §4 Verdict (derived from facts, not preference)

| Facts from the table | Verdict | Handed to |
|---|---|---|
| **Greenfield** (criterion = step 0 of `skills/adopt-kit/SKILL.md`; **not restated here**) | **adopt** (from the smallest artifacts) | `skills/adopt-kit/SKILL.md` + `skills/coldstart-intake/SKILL.md` |
| Something exists + a **named** failure | **extract** (1; at most 3 candidates) | `skills/extract-kit/SKILL.md` |
| Something exists + **cannot name** a failure | **diagnose first**: name it with the candidates from §2 Q3; still nothing → **skip** | `skills/extract-kit/SKILL.md` or "skip" |
| A strong existing method that duplicates / conflicts | **list the conflicts → the user decides**; take the non-overlapping part / skip | the record + `skills/extract-kit/SKILL.md` |
| A one- or two-person throwaway script | **skip** (quota 0 is legal) | record "skip + what signal would change it" |

**Priority when several hit at once** (measured in blind tests: a small project + a named failure hits two): ① **a named failure → extract** ② nothing runnable → adopt ③ otherwise → skip.

**The criterion for "named failure" is not in this file** (the **entry test** of `skills/extract-kit/SKILL.md` states it; not copied here). This file adds only a routing rule: **if you cannot say "who goes wrong, at what moment, and how" — it is not named yet** → back to §3 to diagnose; if you can say it, keep going and add the instance (file / date) at step 1 of `extract-kit` — **do not treat "cannot cite a line number" as "cannot name the failure"**.

**Criterion**: `adopt` has the largest blast radius (it occupies their directories long-term), `extract` the smallest. **When unsure, take the smaller one**, and write "extract first, revisit in three months" in the record — reversibility first.

## §5 Output

### 5.1 Adaptation plan (for the user, ≤20 lines)

**Every verdict states four things** (adopt / extract / skip alike; missing one = no conclusion given):

1. **What I saw** — at least one scan fact (counts / bytes / existing rules / the failure they described), with a source; **also state what I did not see** (§1.4).
2. **The criterion I applied + whether it matches the X you fear** — which row of §4 it hit and what that row guards against (**in plain words; no line numbers, no IDs**); then say whether that guards against the "worst thing" they named in §2 Q2. **If it does not match, say "this can't cure it"** — never recommend anyway.
3. **The difference in your actions** — what you'd do more with adopt / extract, what you'd skip away — **volume, not time** (hard discipline 5).
4. **What you can take without installing (an instruction to the agent, not a link for the user)** — read §一 / §四 / §九 of `GUIDE.md` (about 30 lines), tell them **in your own words** what this thing guards against, then **pick one matching phenomenon from their project**; if you can't find one, say "you really don't need it". **Dropping a link = not doing it.**

**Three banned phrasings** (writing them equals not explaining): ① "this doesn't suit your project" (no facts); ② "see `GUIDE.md`" (pushes the judgment back onto someone who will never read it); ③ "come back when your project grows" (no decidable signal — write "come back when phenomenon Y appears").

### 5.2 The record (**written by default**; ask first only when permission is limited or the user explicitly doesn't want a file)
**The record is the only file this protocol may write** (nothing else in the user's repo). Write it by default, then tell the user where it landed and why it is worth keeping ("without it, in three months nobody remembers why only three artifacts were installed"). If they say "don't write it" on the spot → don't; give the conclusion in the conversation and mark it "not written to disk". **Two cases where you ask first**: ① no write permission ② the user explicitly doesn't want extra files. **Path, three levels**: `<record dir>/` → `docs/` → **repo root** `fit-kit-<YYYY-MM-DD>.md` (if neither exists, use the root and explain why). **Format (10 lines)**:

- date · target repo · method repo path · baseline (commit)
- current state (3 facts from the scan, each with a source)
- decision (or **recommendation**): adopt / extract / skip + **why** (the hardest sentence from §5.1) + **who decided** — before the user nods you must write "recommendation: … (**pending**)"; never turn an inferred default into a "decision"
- **what you can take without installing**: which sections + the phenomenon they picked (write "none found" if none)
- which criteria (read the full text before citing `P-NN`) / which artifacts
- duplication / conflict with existing methods (list if any)
- next step: who acts, first thing
- **fixed cost added by installing** (only for adopt / extract): a few more files / bytes to read at every session start, one more table at every closeout
- review: a date or a trigger
- what was not asked / what was guessed (left open, `P-14`)

## Anti-patterns (all of these really happen)

- **Asking before looking**: "do you have a documentation system" — people who have `docs/` feel patronized, people who don't only say "I don't know". **Look at what can be looked at first.**
- **Reading on and on**: from the entry into the extended surface, then twenty files through references, and you forget what you were answering. **Stop at your tier's volume ceiling** (§1.3).
- **Reporting volume but not stopping**: you counted, then kept reading, and by the time the user first heard the number you had read a dozen files. **Report → stop → let them choose**; if they don't answer, go with **standard** and write "unanswered".
- **Treating "skip" as failure**: their project is small and their own rules already cure it — the honest sentence is "you don't need this now", plus what signal would bring them back.
- **Deciding for the user**: writing "recommend adopting" in the report is fine; writing "the user decided to adopt" in the record when you chose is not — a record that can't tell who decided is no record. **Especially when nobody is there**: write "recommendation (unconfirmed)", never as fact.

## Not doing

- Not adopting, not extracting, not changing the user's repo (except the record).
- Not judging the kit itself (that is the maintainer's job).
- Not promising elapsed time; not promising "after the scan you'll have a complete answer".
- Not telling the user "you must do X now" before they nod — give options and consequences, let them choose.
