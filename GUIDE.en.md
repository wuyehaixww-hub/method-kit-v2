# GUIDE — how this method actually runs

> **This is the English version of `GUIDE.md`.** The Chinese version is authoritative; if the two disagree, follow the Chinese one.
> Reader = a person or agent who has the package and wants to use it in their own project.
> **Readable without installing** = §一 / §四 / §九 (about 30 lines): three facts, one trade-off, when not to use it. The rest is the method layer — it only pays off once installed.
> This file answers four things: **what it is / how it runs / when it applies (and when not) / how to install it into your project**.
> Division: the front page and the entry map = `README.md` · criteria = `principles/` · protocols = `skills/` · skeletons = `kit/templates/` · gates = `kit/scripts/`.
> This file **does not** describe how the method was extracted — that is the author's record, not the product's manual.

## 一、What problem it solves (readable without installing)

When three facts hold at once, the problem appears: **context is finite** · **project records only grow** · **every new session starts from zero**.
The result is two failures, and neither announces itself: the new session can't read what it should, so it invents its own rules; or the docs keep growing and nobody knows which is current.

This method does one thing: **let the next session start working with the least material, and make "the material is not enough" discoverable.**
It gives you **six artifacts + one gate + one ladder** — it does not decide how your project should work.

> **Source**: one complete practice in a single real project (n=1). Read it for **applicability**, not authority — credibility is paid for by counterexamples and runnable gates, not by provenance.

## 二、The six artifacts

| Artifact | One-line role | Who writes / when | Is it the single source of truth? | Skeleton (`kit/templates/`; drop `.template` when installing) |
|---|---|---|---|---|
| **Cold-start three**: entry shell · current status · index | What a new session reads on its first screen | Read every session; changed rarely | Current status = **the** source of truth for *state* | `CLAUDE.md.template` · `WORKSPACE-NOTES.md.template` · `docs-README.md.template` |
| **Handoff** | What this relay does, how the next one takes over | One per relay, read at the start of the next | **The** source of truth for *this relay's task* | `hook.md.template` |
| **Ledger** | Relay status / contracts / open items | Updated every relay | **The** source of truth for *progress and leftovers* | `ledger.md.template` |
| **Process notes** (session-notes) | How it was done: decisions, retrospectives, dead ends | Written as it happens | History only, **never** state | No single skeleton; two specific ones: `grill-decisions.md.template` (decisions) · `closeout-todo.md.template` (closeout registry) |
| **Pit index** (PITFALLS) | What was stepped in, how to catch it early | After every pit | **The** source of truth for *failure samples* | `PITFALLS.md.template` |
| **Changelog** (CHANGELOG) | What happened externally | Every release | **The** source of truth for *version* | `CHANGELOG.md.template` |

> Term: **relay** = one hand-off-able unit of work (one session, or a batch of similar changes); "this relay" = this round. The ledger records status per relay; a handoff is written once per relay.

> Three more skeletons (not among the six): `session-workflow.md.template` (this project's session flow · **mandatory with the `workflow` artifact**) · `relay-playbook.md.template` (the stable layer for multi-person / multi-session hand-offs · with `relay`) · `acceptance.md.template` (delivery criteria and unverified edges · with `workflow`).

Three iron rules (criteria live in `principles/`; here only the shape):

1. **One fact is written in full in exactly one artifact**; everything else points at it — two full copies means one will be missed (`P-06` / `A-06`).
2. **State facts are pointers, not values** — values drift, pointers don't (`P-17`).
3. **Process notes go to the history area, state stays in the current area** — routed at the moment of writing (`P-08`).

## 三、One session, step by step

```
cold start (read the three) → take material from the handoff's required list → if it's not enough, walk R0–R3 → work → record as you go → five closeout steps → write the next handoff
```

| Step | What happens | Criterion |
|---|---|---|
| 1 | **Cold start**: read the entry shell → current status → index. Only these three; don't browse directories | `P-01` |
| 2 | **Take material**: open the handoff's required-reading list, **row by row** (each row says why it is there) | `P-18` |
| 3 | **Not enough**: walk the fallback ladder R0–R3 (§六). **Never invent** | `P-02` |
| 4 | **Work**: align on the approach first; for anything non-trivial, state what you will change and on what grounds | —— |
| 5 | **Record as you go** (the five undeferrable classes, **on the spot**, never saved up for closeout): ① contract frozen / changed ② user's own words / decisions ③ new pits ④ state sources + old names / section numbers moved ⑤ new open items (into the single registry + an expiry trigger) | `P-07` |
| 6 | **Five closeout steps**: report → write back the sources of truth → run the gates → archive and version → report | `P-06`..`P-10` |
| 7 | **Hand off**: write the handoff (only this relay's differences; the stable layer is a pointer), so the next round starts here | `P-16`..`P-20` |

**Skeletons behind the five steps** = `kit/templates/CLOSEOUT.md.template`; **handoff skeleton** = `kit/templates/hook.md.template`;
**decision tracker** = `kit/templates/grill-decisions.md.template`; **closeout registry** = `kit/templates/closeout-todo.md.template`.

> **Why two registries**: the decision surface holds "how this round was decided" (candidates / recommendation / ruling / blast radius, append-only); the closeout surface holds "things that can only be done once, at closeout" (write-backs / version / write-offs). Both get lost, and both are lost silently — so each gets a table.

## 四、Why the cold start is "three files + one gate" (readable without installing)

This is the method's central trade-off, in one sentence:

> **Project records grow without bound, while each session's context is finite — so the cold-start surface holds only what every session needs; everything else is fetched on demand through the index and the ladder, and old material is read only when a pointer says so.**

In three moves:

- **Extract**: pull "what every session needs" into the three files (entry shell = constraints and routing; current status = where we are; index = what exists and which to read). All three hold **pointers and state only**, never rule text.
- **Tier**: everything else is sorted by use — read-whole / on-demand / index list / literal drawer (`P-03`). The point of tiering is to make **"not finished reading" discoverable**.
- **Fetch**: what is needed but not among the three is fetched with the ladder in §六; **old material is never read whole on impulse**.

**That gate** (a byte-sum ceiling + a forced-archive line) is not there to shrink files — it is there to **expose when the extraction was not done well**. "Please keep it lean" with no gate is the same as nothing (`P-01`).

**Governance cost grows with the project**: the longer it lives, the more files it has, the bigger it gets, the more it costs just to keep the next session able to start; large projects especially — **not linearly**, and the task and phase matter too. There is no fixed estimate here; ask for a specific number on demand (the count = **the three files + the handoff §2 required list + supplementary reads**, in **material bytes, not GUI tokens**; see the "estimate on request" appendix in `skills/coldstart-intake/SKILL.md`), and **do not report it every round**.

**Criteria**: `P-01`..`P-05` in the intake volume. **How to build it**: `skills/coldstart-intake/SKILL.md` (**six steps**: config → surface → gate → ladder → the two session prompts → the spot check).

## 五、The three layers of reading

Within one context, three kinds of material **fail differently**, so they are read differently:

| Layer | What it is | How to read it | Cost of reading it wrong |
|---|---|---|---|
| **Rule layer** | entry shell / criteria / pit index / config | structure is mandatory; read the text **by section** | you break a convention without knowing |
| **Code layer** | source code | search for symbols first, read a narrow window; never read a whole file top to bottom | you guess the wrong symbol, you change the wrong place |
| **Session-asset layer** | handoffs / ledger / process notes / archive | **read only by pointer**, never in bulk | duplicated work + context eaten by history |

Two companions: **read by section** (over the threshold you must declare it in the first 20 lines, `P-04`); **"read in full" must be provable** (if you cite content, you must be able to produce the coverage record, `P-30`).

## 六、When you can't find something: the fallback ladder

**[Hard] not found ≠ does not exist; never invent.**

| Level | Action |
|---|---|
| **R0** | the entry shell's routing table / index hits → follow the pointer |
| **R1** | miss → generate the outline now (`^## `) and read by section; **never read it all** |
| **R2** | outline misses → grep the body for a task word (scan surface = the whole set minus the archive) |
| **R3** | still nothing → retry once with different words → **tell the user and register the gap** (never invent a rule to fill it) |

Criterion = `P-02`; "register the gap" goes into the **single leftover registry** (ledger §5, `P-07` ⑤).

## 七、Tool capability assumptions (read this when you change harness)

This package is written against **capabilities**, not tool names — the names in the docs are examples from one vendor. **Whether a rule applies is decided by capability, not by name.**

| Capability | What you may call it | How to self-check |
|---|---|---|
| Read a file (**has a per-call limit; truncation is silent**) | read / view / cat | read a file over 50 KiB and see whether it tells you it was truncated (full method → `skills/doc-governance/SKILL.md`) |
| Write / edit a file | write / edit / apply_patch | read it back; it must match word for word |
| Search | grep / rg / search | search for a word you know exists and confirm the hit |
| Dispatch a subagent (**must return a handle**) | subagent / task / agent | dispatch one asking "who are you", then send a follow-up and see whether it answers |
| Continue / interrupt | send_message / interrupt | —— |
| See a subagent's context usage | tool / panel / logs | **if you can't, ask the user** (see `skills/subagent-dispatch/SKILL.md` §三) |
| Where session records land (needed for blind reading tests) | the harness's own logs | run one command, confirm the location and format; if unreadable, mark "self-reported" |

> **Limits appear only as examples**: DSH's `read` is about 50 KiB / 2000 lines / 2000 chars per line — with another tool all three numbers change, but "**incomplete reads must be discoverable**" does not (`P-04` / `P-30`).

## 八、How to install it into my project

**Triage first, then act**: `skills/fit-kit/SKILL.md` measures your repo first (rule docs and size only), asks six questions, and returns an **adaptation plan** (adopt / extract / skip). When it doesn't fit it says so on the spot, and writes down what signal would bring you back.

| Your situation | Which path |
|---|---|
| New project / a handful of docs, want the surface built in one go | **Adopt**: `skills/adopt-kit/SKILL.md` (pick artifacts from the axis × artifact matrix, starting from the smallest set) |
| Only the cold-start surface (three files + byte gate + ladder) | **Surface only**: `skills/coldstart-intake/SKILL.md` |
| Mature practice already, missing one criterion | **Extract**: `skills/extract-kit/SKILL.md` (one at a time, must point at "file:line") |

**Smallest start** = the **4 artifacts** of `adopt-plan`'s minimum tier (`coldstart` · `agency` · `intake` · `workflow`) — i.e. "cold-start three + one byte gate + session flow / pit index / changelog / prompt skeletons"; **upgrade triggers** live in `kit/intake/matrix.json` (every artifact has `to_enable_when`).
**One mandatory step after installing**: the copied skeletons must be **trimmed to zero** (0 placeholders · 0 dead pointers), criterion = `P-26`, check = `kit/scripts/trim-scan.mjs`.

**The last step (most often skipped, most useful)**: use `kit/templates/session-prompts.md.template` to generate **two pastable prompts** — "what to say when opening a new session" and "how to trigger closeout". The surface is for the agent; the prompts are for the human. Without them the user has to compose the words himself every time.

## 九、When not to use it (readable without installing)

A one-person throwaway script, no intention of long-term maintenance, or a team already running a proven method — this is probably a burden.
Criterion = §4 of `skills/fit-kit/SKILL.md`; "don't use it" is a valid answer — just write down the review trigger.

## 十、Where the criteria are (six volumes)

| Volume | What it governs |
|---|---|
| 02 closeout | how to close a session cleanly (`P-06`..`P-10` · `P-31` · `P-33`) |
| 03 handoff | what makes a handoff let the next round start immediately (`P-16`..`P-20`) |
| 04 gates | why a gate's verdict can be trusted (`P-11`..`P-15`) |
| 05 intake | how to fetch the right material with the least context (`P-01`..`P-05` · `P-26` · `P-30` · `P-32`) |
| 07 anti-patterns | what makes a failure worth admitting into the anti-pattern library, and what keeps it true (`P-21`..`P-25`) |
| 08 adoption | what counts as done when carrying the method into someone else's project (`P-27`..`P-29`) |

> Every criterion has four parts: **rule / why / counterexample / how to check**; when "how to check" says "half-mechanical" or "no mechanical point", that is the honest statement that no gate exists, and it relies on questions asked at fixed moments.
>
> **Four questions** (a criterion must answer them to be cited): **what does it decide** / **where is the evidence** / **what happens without it** / **how do you check it**. If it can't answer all four, it is a heading, not a criterion.
