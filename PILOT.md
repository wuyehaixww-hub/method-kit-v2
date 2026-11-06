# method-kit pilot

> The method's docs are in Chinese; this pilot note is in English. The default README is English (`README.md`); the Chinese README is `README.zh.md`; core terms are in `GLOSSARY.en.md`.

This is a pilot release of method-kit — a small method kit for projects that
stay alive across many agent sessions.

## Who it's for

- You maintain a project for months, not a one-off script.
- Your docs / records are growing, or you're afraid of breaking a contract or
  losing data.
- You use an agent that can read / write files and grep.
- You don't already have a proven method you're happy with. If you do, "no"
  is a valid answer.

## What we ask (one session)

1. Let your agent read `README.md`, then `skills/fit-kit/SKILL.md`.
2. Run the fit-kit session on your project.
3. Send back the 8-line record (装 / 取 / 不用 all count) and where it got stuck.

## What you get

- A triage plan: whether to use the kit, which parts, and what to install.
- No obligation; no changes to your code. fit-kit may write a short 8-line record by default (say no if you don't want it). You can stop anytime.

## Feedback

Open an issue on this repo, or reply to the person who sent you this.
Tell us: where you got stuck, which sentence was unclear, whether the
conclusion held.

## What this is not

- Not a promise of stability (this is a `-dev` pilot).
- Not a full install; fit-kit decides.
- Not for one-off scripts or teams with a proven method.

## License / credits

MIT (code/config, incl. *.json.template) + CC BY 4.0 (docs + *.md.template). See `LICENSE` and `CREDITS.md`.
