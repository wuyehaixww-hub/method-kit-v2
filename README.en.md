# method-kit — so the next session on a long-lived project can start working immediately

> **This is the English version of `README.md`.** The Chinese version is authoritative: if the two disagree, follow the Chinese one.
> **One line**: a method for projects that live for a long time — three files for the cold-start surface, a handoff + ledger to carry context across sessions, and runnable gates that make "not fully read" and "the gate didn't bite" visible on the spot.
> **It does not give you** business code, a design system, or decisions about your project — only judgment criteria, runnable gates, and the method + skeletons for installing it into your project.
> **Version** = `VERSION` (written in full only there) · **L0 entries** = the table below (quotas and capacity thresholds live in `kit.config.json`) · **This file can be read whole** (for a section map: `node kit/scripts/read-plan.mjs README.md`).

## What it solves

When three facts hold at the same time, failure stops announcing itself:

- **Context is finite**: a new session cannot read everything it should, so it invents its own rules;
- **Records only grow**: docs pile up and nobody knows which one is current;
- **Gates go false-green**: the script ran, but it didn't bite.

method-kit does one thing: **let the next session start working with the least material — and make "the material is not enough" discoverable.**

## What you get

- **Judgment criteria** (`principles/`): one `P-NN` each, with an anti-pattern and a "how to check".
- **Runnable gates** (`kit/scripts/`): zero-dependency node, exit codes 0 / 1 / 2; not "trust me".
- **A way to install it** (`skills/`): `fit-kit` measures your repo first, then decides 装 / 取 / 不用 (adopt / extract / skip).
- **Document-size governance** (`skills/doc-governance/`): measure the read limit first, then examine file by file, and use four questions to decide whether to split.
- **Skeletons** (`kit/templates/`): cold-start three, handoff, ledger, closeout checklist.

**How it runs** → `GUIDE.md`: the six artifacts / one session's sequence / the three layers of reading / tool capability assumptions / how to install. The first screen only answers "should I use this"; `GUIDE.md` answers "what does it look like in use".

**Start with "when not to use it"**: a one-person throwaway script, no intention of long-term maintenance, or a team that already runs a proven method — this is probably a burden. `skills/fit-kit/SKILL.md` will say "skip" plainly, and write down **what signal would change that**.

**It does not promise "close enough"**: what it guarantees is that "the material is not enough" gets caught on the spot. Whether a project keeps running depends on the project itself, and on whether you are willing to maintain that surface.

**Three ways in (pick the one you are on)**：

- **You have a project and want to know if this fits, and which parts to take** → have an agent read `skills/fit-kit/SKILL.md` and follow it. It scans your repo first (docs and size only), asks six questions, and returns an **adaptation plan**; when it does not fit it says "you don't need this now".
- **You already work in this repo (the entry shell is injected)** → still start at step 0 of `skills/fit-kit/SKILL.md`: it asks **one** question (maintaining this kit / using it in your project). If you answer "maintaining", it checks whether the maintainer-layer files exist: **yes** → follow them; **no** (a release build) → the package is not editable, fork it and build your own process; to look up a criterion, jump straight to the §L0 map.
- **You only want to know what this is about, not install it yet** → read §一 / §四 / §九 of `GUIDE.md` (about 30 lines): three facts, one trade-off, when not to use it. Readable without installing, no changes to your repo.

**This is a pilot**: how to take part / what to send back → `PILOT.md` (`-dev`; no stability promised).

**Symptom → which volume to read** (volume only, not the entry)：

| What you look like right now | Where to read |
|---|---|
| Docs keep growing, nobody knows which is current | 05 intake (capacity tiers / read by section / fallback ladder) |
| Every closeout misses something, the next session asks again | 02 closeout |
| The handoff was written, and the next session still walks into the wrong door | 03 handoff |
| The check script "ran but didn't bite" — green is suspicious | 04 gates |
| The same pit gets stepped in again, every time with "I'll be careful" | 07 anti-patterns |
| The method gets carried into another project and drifts along the way | 08 adoption |

> **Source / applicability** → §一 of `GUIDE.md` (read for applicability, not authority; n=1 is not restated here).

## L0 map

> A hand-written map, but **bidirectionally machine-checked** (probe 1): the difference set between map rows and the definition set must be empty. **Adding an entry = change both places** (that is why it does not rot). **A map row is a one-line summary** — **open the full text before citing a criterion**; never cite this row alone.

| ID | One line | Volume |
|---|---|---|
| P-01 | Minimum cold-start surface + hard gate: the first screen is exactly 3 files; the byte sum hitting the limit forces archiving | 05 intake |
| P-02 | Fallback ladder R0–R3: when something is missing, walk the ladder; **not found ≠ does not exist** | 05 intake |
| P-03 | Four capacity tiers + hard ceiling: the point of a limit is to make "not fully read" discoverable | 05 intake |
| P-04 | Read-by-section protocol: over the threshold you must declare it; section maps are generated, never hard-coded line ranges | 05 intake |
| P-05 | Quota = forced subtraction: at the ceiling, retire one before adding one | 05 intake |
| P-06 | Closeout is done when the sources of truth are closed: can the next person start without asking | 02 closeout |
| P-07 | Five things that cannot be deferred: defer once and they are lost — write them down in any mode | 02 closeout |
| P-08 | Route on write (process notes go to the history area); routine archiving only on a relay/batch/window closeout, capacity hits are separate (P-01) | 02 closeout |
| P-09 | After a change, search back: four trigger classes, enumerate forms per class, **scan the whole set**, decide every hit | 02 closeout |
| P-10 | Conclusions must be falsifiable: numbers pasted from command output; re-review with a different criterion | 02 closeout |
| P-11 | A gate's verdict comes only from its verdict line + its own exit code (three states; WARN does not block) | 04 gates |
| P-12 | "Bites" = a re-runnable injection state (recipe / state / isolation / change together); one observation does not count; **states need three shapes** (input present but wrong / input absent / identity mis-addressed) | 04 gates |
| P-13 | Asserted values derive from current state: hard-coded observations become future false-greens or false alarms | 04 gates |
| P-14 | The surface comes from the whole set; freezes / allowlists / exemptions are debts and must be enumerable + expire-checked | 04 gates |
| P-15 | Gates cover only the mechanically decidable class; the rest relies on questions at fixed moments | 04 gates |
| P-16 | A handoff writes only this relay's differences; the stable layer is written once, everything else points at it | 03 handoff |
| P-17 | "What it is" in a handoff points back at the original or gives a criterion (no conclusive facts / expected values) | 03 handoff |
| P-18 | The required-reading list must be falsifiable: each row says why, resolves line by line, points only at tracked anchors, and skipped rows are stated | 03 handoff |
| P-19 | Acceptance = independent re-run; self-assessment is only a to-verify list | 03 handoff |
| P-20 | One review per relay (at closeout, after all write-backs); the dispatcher sets the boundary (read-only + which classes to check); the report is only a list of counterexamples | 03 handoff |
| P-21 | "Different root cause" is decided by the **substitution test** (root-cause sentences interchangeable = same entry); an instance must be explained by that root cause alone | 07 anti-patterns |
| P-22 | Admission: completion records / unsourced experience / retellings / text someone else is editing **do not enter L3** (① go home = ledger/records, ② into `inbox/`, ③④ open the original first) | 07 anti-patterns |
| P-23 | Promotion: an A's "correct answer" = pointer + action + division of labor; no P to point at = **pending promotion** (into the registry) | 07 anti-patterns |
| P-24 | Evidence cites only forms that **still open tomorrow**; quoting original text requires "may have been corrected" + a review month | 07 anti-patterns |
| P-25 | **A summary is not a copy**: titles / table headers / index rows / map rows are also writing points — change the text, you owe the summary a change | 07 anti-patterns |
| P-26 | A copy artifact is done when it is trimmed to zero: every line the target repo does not have must be deleted | 05 intake |
| P-27 | Acceptance runs in the adopter's repo and names what is measured: someone else's green is not your green | 08 adoption |
| P-28 | A protocol that states intent but not criteria → the executor substitutes its own judgment: wherever it must decide, there is a gap | 08 adoption |
| P-29 | An adoption record cites only sources that still open, otherwise write "not landed": temporary paths are placeholders | 08 adoption |
| P-30 | "Read in full" must be provable: if you cite content, you can produce a complete coverage record; partial reads state which sections and what they affect | 05 intake |
| P-31 | De-duplication = migrate + at least one reachable pointer: audit every pointer before deleting; never "delete and it's gone" | 02 closeout |
| P-32 | Answer four questions before splitting a volume; split by reader; the routing page is never the largest file; the cold-start surface is never split | 05 intake |
| P-33 | Archiving is done when all four hold (verbatim / tombstone + pointer / index row / recorded size) | 02 closeout |

## Compatibility promises

Only **three** things are promised; the rest is not (wording / entry counts / the existence of new entries can all change):

1. **Entry IDs**: `P-NN` / `A-NN` increase globally, **never reordered, never reused**; retired entries keep a single `已退役` line and the number is not recycled.
2. **Directory layout**: `principles/` · `kit/` (`templates/` + `scripts/`) · `evidence/` · `anti-patterns/` · `skills/` · `decisions/`.
3. **Script CLI**: usage and exit codes of the scripts under `kit/scripts/` (`0` = pass / `1` = gate red / `2` = environment error); new scripts do not change existing semantics.

## Configuration (step 0)

`kit.config.json` is the **single place constants are written** (scripts and docs both read it; values are not restated elsewhere). Copy `kit/templates/kit.config.json.template` and change four places:

| Key | What it controls | Common change |
|---|---|---|
| `coldStart.files` | the cold-start three (relative to repo root) | if they live under `docs/`, write `docs/README.md` |
| `capacityTiers.tiersByDir` | which directory belongs to which tier | set ledger / drawer directories to `drawer` or `onDemand` |
| `quotas` | L0 entry count / inbox entry ceiling | set to your project's pace; never "unlimited" |
| `profile` | `full` (default) or `lite` | only the capacity gate, no release gate yet → `lite` |

**Installing into an existing project**: first run `node kit/scripts/check-kit.mjs --update-baseline` to freeze the status quo (capacity is judged only for new or grown files), then assign old directories `drawer` / `onDemand` — otherwise everything is red on day one.

## Maintenance

- **Maintaining this repo** → `WORKFLOW.md` (division of labor / four actions / five closeout steps / where material goes / the relation to the source repo / sync). This file does not describe the maintenance process; it only points there.
- **Run the gates once when you take over**: `node kit/scripts/check-kit.mjs` + `node kit/scripts/cold-start-size.mjs` (both read-only), then act.
- `README.md` is one of the cold-start three (source: `kit.config.json` → `coldStart.files`); **this English file is a view of it and does not itself count toward that budget**.
- **Changing the first screen = change both** (now three: add `README.en.md`): the Chinese pitch, the English summary at the top, and the English version are views of the same thing; change them together.
- To change any threshold / tier / quota: **edit `kit.config.json` only**, then run `node kit/scripts/check-kit.mjs`. Docs carry pointers, never values.
- **License / third-party notices** → `LICENSE` (MIT for code / config (incl. *.json.template) + CC BY 4.0 for docs / *.md.template) · `CREDITS.md` (Matt Pocock MIT).
