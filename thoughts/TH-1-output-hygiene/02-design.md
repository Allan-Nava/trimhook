# 02 · Design — TH-1 Tool output trimmed at the source


This is the main human checkpoint. Correcting 200 lines of markdown costs
infinitely less than correcting 2000 lines of wrong code.

---

## Problem

The first cut of trimhook works (19 tests in `test/`, the sweep in `evals/local.mjs`), but
Research found it breaks two rules its own `CLAUDE.md:52-57` states — a cut can happen
with no spill, and a checkout can switch spilling off — and leaves the three numbers the
release hangs on (default cap, Codex default, spill re-read rate) with no instrument to
decide them. 0.1.0 is not a rewrite: it is the set of changes that make the shipped hook
match its rules and make TH-9/TH-10 countable.

**Ticket:** TH-1 · https://github.com/Allan-Nava/trimhook/blob/main/BACKLOG.md

---

## Proposed solution

Reorder the handler so the trim *decision* precedes the spill *write*, and make a failed
write veto the cut (D1). Keep trimming by size only — a non-zero exit is an ordinary
result — but pass through `interrupted: true`, and settle the harness-error field by one
live capture before the week starts (D2). Ship 0.1.0's code default at 8,000 but run the
live week at 4,000 with a written decision rule, so the week can *reject* a cap rather
than confirm the guess (D3). Replace the flat config merge with a per-layer allow-list:
a repository file may move the saving knobs (`cap`, `perCommand`, `minSaving`, `head`)
in either direction and may never touch the recoverability knobs (`spill`,
`spillTtlDays`, `mode`, `codex.replace`) (D4). Write the TH-9 protocol as a file with a
pass/fail rule for flipping `codex.replace` (D5). Make TH-10 countable with a
transcript scan that shares `marker()` with the hook and counts spill reads and re-runs
per cut (D6). Fold the remaining contradictions into logged failure records, a corrected
prune trigger and doc/check fixes (D7, D8).

### Diagram

```
stdin ─► parse ─► Bash? ─► readResponse ─► interrupted? ──► null (D2)
                                  │
                                  ▼
                       path = spillPath(dir, session, tool_use)   pure, no write (D1)
                       t = trimResult(res, cap, path)
                                  │
                       t == null ──► log kept ──► null
                                  │
                       spill(path, body) ── fails ──► log failed:spill ──► null  (D1)
                                  │
                       log trimmed / would-trim ──► replacementOutput
```

### Components to touch

| Component | Path | Kind of change |
|---|---|---|
| Handler flow | `bin/lib/handlers.mjs:8-31` | modify — decide before spill; spill failure vetoes; prune on every call; failure records |
| Spill path | `bin/lib/store.mjs:43-50` | modify — split `spillPath()` (pure) from `spill(path, body)` |
| Response reader | `bin/lib/harness.mjs:32-38` | modify — `interrupted: true` → `null` |
| Config layers | `bin/lib/config.mjs:68-90` | modify — per-layer allow-list, `problems` for a rejected repo key |
| Doctor | `bin/lib/doctor.mjs:7-37` | modify — count `failed` records; read `bashOutputMaxChars`; state the stdin-detection caveat |
| Report | `bin/lib/report.mjs:4-33` | modify — `failed` accumulator; `--cap N` what-if over logged `before` sizes |
| Check | `bin/trimhook.mjs:71-105` | modify — new README statements; forbid sibling-project strings |
| Benchmark | `evals/local.mjs` | modify — a re-read/re-run scan sharing `marker()` from `bin/lib/trim.mjs:8` |
| Codex protocol | `evals/codex-live.md` (new) | new — TH-9 steps and pass rule |
| Tests | `test/handlers.test.mjs`, `test/misc.test.mjs` | modify — failing spill, interrupted, repo-forbidden key, prune trigger, `--cap` |
| Docs | `README.md`, `CLAUDE.md`, `BACKLOG.md`, `CHANGELOG.md`, `.github/workflows/release.yml:150`, `backlog-issues.yml:3-12` | modify — numbers, wording, stray strings |

---

## Decisions

### D1 · Decide first, spill second, and a failed spill vetoes the cut

- **Choice:** compute the spill path without writing (`<data>/spill/<slug(session)>/<slug(tool_use_id)>.txt`, deterministic — `store.mjs:44-46`), pass it to `trimResult`, and only when the result is a cut write the file; if the write returns `null`, log `outcome: 'failed', reason: 'spill'` and return `null` so the model gets the untouched result.
- **Why:** `handlers.mjs:18-19` spills every Bash result before deciding and cuts even when `spill()` returned `null` (`store.mjs:50`, `trim.mjs:9` just drops the path from the marker) — the two "large letters" facts in `01-research.md`. `CLAUDE.md:56-57` and `BACKLOG.md:47-49` promise the opposite. Computing the path first is free because the marker's length depends only on the path *string* (`trim.mjs:28`), so the arithmetic is unchanged.
- **Rejected alternatives:**
  - Spill first, then delete the file when the result is kept — one extra `unlink` per Bash call, and a crash between write and unlink leaves orphans; the deterministic name makes the write unnecessary.
  - Cut without a path when the spill fails, as shipped — turns a wrong cap into an unrecoverable answer; forbidden by the repo's own rule 3.
- **Reversible?** yes — it is an ordering change in one function.

### D2 · Trim by size regardless of exit code; pass through `interrupted`; capture the error payload before the week

- **Choice:** keep Q1's default — a command that ran and exited non-zero is trimmed like any other, with the stderr floor as its net. Add one rule: `readResponse` returns `null` when `tool_response.interrupted === true` (a known key of the Bash shape, `CLAUDE.md:75-78`), because a partial result is already an error condition and its tail is the interruption, not the ending. Whether Claude Code adds an `is_error`-style field to a failed Bash call is unknown (`01-research.md` Blind spots, first item); it is captured live on day 0 of TH-10 and, if a field exists, added as a second passthrough rule in the same release. The README's "any error reaches the model unchanged" (`README.md:38`) is reworded to what the mechanism does.
- **Why:** failing test and build output is the largest and most repetitive population — exempting it by exit code hands back a good share of the 17% the ticket targets and measures the README's savings against a different population than it advertises (Q1's risk). The stderr floor (`trim.mjs:42`, 20% of cap = 1,600 characters at 8,000) plus the 40% tail keeps the "how it ended" region on both streams. The hidden-middle cost is exactly what D6 measures; the design does not pre-empt the measurement.
- **Rejected alternatives:**
  - Exempt any non-zero exit — the exit code is not in the payload keys `CLAUDE.md:73-80` lists; nothing to branch on without the capture, and the population argument above.
  - A higher `perCommand` default for test runners (`npm test: 16000`) — a format-aware cut in disguise; v0.2.0 per the brief, only with a measured false-positive rate.
- **Reversible?** yes — a passthrough rule is one line in `readResponse`.

### D3 · Code default 8,000; the live week runs at 4,000 under a written decision rule

- **Choice:** `DEFAULTS.cap` stays 8,000 (`config.mjs:12`). The maintainer's week (TH-10) runs with `~/.trimhook.json` `cap: 4000`. The rule, written into the README before the week: the default becomes **4,000** if the re-read rate (D6: spill reads + same-command re-runs within the next five tool uses, over cuts) is at or under 10% both for all cuts and for the subset with `before > 8000`; else **8,000** if that subset's rate is at or under 10%; else **12,000**, and the README says the week rejected both. `report --cap N` recomputes the week's saving at any cap from the logged `before` sizes with `trimResult` on a synthetic body, as `evals/local.mjs:126` already does.
- **Why:** the sweep (`evals/results/2026-09-23-local.json`) says 4,000 cuts 759 of 28,219 results (one in 37) and saves 15.5%; 8,000 cuts 268 (one in 105) and saves 6.4%. The week's purpose is the re-read rate, and at 8,000 a week yields perhaps 60 cuts — too few to reject anything; at 4,000 it yields about 2.8× as many, and every cut of a result over 8,000 counts against both caps. The 10% threshold is a judgement: a re-read costs one `Read` of the whole spill, so even 50% would still save characters on average (5,685 saved per cut at 4,000), but a re-read is also the only visible proxy for the invisible case — a middle the model needed and never read — so the bar sits far below break-even.
- **Rejected alternatives:**
  - Ship 4,000 now — the transcript numbers are post-harness-cut (`evals/local.mjs:2-13`) and say nothing about re-reads; the brief forbids choosing from a guess.
  - Run the week at 8,000 as the brief assumes — confirms the guess with a sample that cannot reject it.
- **Reversible?** yes — a number in three places (`config.mjs:12`, `README.md:91,115`, `ci.yml:40`).
- **Weak spot:** a re-read at 4,000 of a result over 8,000 is an *upper bound* for its re-read at 8,000 (less head and tail shown), so the rule may reject 8,000 unfairly; the README must state the bound.

### D4 · Per-layer allow-list: a repository file moves the saving knobs, never the recoverability knobs

- **Choice:** `loadConfig` applies an allow-list to the repository layer (the `cwd` candidates at `config.mjs:77` *and* `TRIMHOOK_CONFIG`, which stands in for it, `:73-75`): permitted `cap`, `perCommand`, `minSaving`, `head`; every other key is dropped with a `problems` entry (`<path>: <key> may only be set in ~/.trimhook.json or the environment`) that `doctor` reports as BAD. User file and environment keep the full set. The README/BACKLOG chain wording changes to what the code does: `TRIMHOOK_CONFIG` *replaces* the repository layer.
- **Why:** `config.mjs:83` runs one `RULES` set over the merged result — a checkout can set `spill: false`, `mode`, `spillTtlDays`, `codex.replace` (`01-research.md`, fifth contradiction), producing cuts with no recoverable middle. This is not hookgate's tighten-only rule, on purpose: hookgate gates, so a loosened gate is an attack; trimhook only saves (`CLAUDE.md:52-53`), so a repository raising `perCommand["npm test"]` costs its users tokens, not safety, and is the one repository use case the brief names. What a checkout must never do is make the marker lie.
- **Rejected alternatives:**
  - Tighten-only (a repository may only lower caps) — kills the per-command raise for a chatty test runner, the reason the repo layer exists.
  - No repository layer at all — the same loss, and `capFor`'s prefix matching (`config.mjs:95-100`) then has only one home.
  - A `spillDir`/`logPath` key — Q9 assumed one; none exists (`harness.mjs:26`, env-only) and adding one only widens the surface. Not added.
- **Reversible?** yes, but loosening it later is a security decision, not a convenience.

### D5 · Codex default-on has a written pass rule, and 0.1.0 does not wait for it

- **Choice:** `evals/codex-live.md` holds the TH-9 protocol: Codex ≥ 0.155, scratch repository, `trimhook print-hooks > .codex/hooks.json`, `~/.trimhook.json` with `codex.replace: true`, a command printing a known 20,000-character body with a sentinel line at the start, the middle and the end. Three runs each for `decision: block` and `continue: false`. Pass = in 3 of 3 the model quotes the head and tail sentinels, does not re-run the command, and does not describe the result as failed, blocked or refused; the raw `tool_response` is saved as a fixture for `readResponse`. Pass → `codex.replace` defaults `true` in the same release, README dated; fail → stays `false`, README says what was seen and when.
- **Why:** the Codex shape is assumed on three guesses (`harness.mjs:33-37`, Q2) and the brief's own risk is the model reading `block` as a refusal. `CLAUDE.md:82-87` documents the replacement; documentation is not observation. Q4 made this a non-blocker for 0.1.0.
- **Rejected alternatives:**
  - Flip the default from the docs alone — the whole reason `codex.replace` exists is that the docs were not trusted.
  - Drop Codex from 0.1.0 — the audit-mode log (`would-trim`, `handlers.mjs:26-27`) already yields Codex numbers with zero risk; keep it.
- **Reversible?** yes — a boolean default.

### D6 · The re-read count is a transcript scan that shares the hook's `marker()`

- **Choice:** extend `evals/local.mjs` (Structure decides whether as a flag or a sibling file) to walk the same `~/.claude/projects/**/*.jsonl` (`:52`) and `~/.codex/sessions/**/*.jsonl` (`:88`), find every `tool_result` whose text matches a regex built from `marker()` (`trim.mjs:8-10`), extract the spill path, then look at the next five `tool_use` blocks of that session, any tool name: an `input` containing that path or a `spill/` segment is a **spill read**; a `Bash` `input.command` equal to the cut command is a **re-run**. Output: cuts, spill reads, re-runs, rate, by `commandPrefix`, dated JSON under `evals/results/`. The hook records nothing about re-reads (Q7).
- **Why:** `evals/local.mjs:72` records only `Bash` uses, so a `Read` of a spill file is invisible today (`01-research.md` Blind spots). The transcript is the one place the cut (marker in the result) and the follow-up (any tool call) sit together with a `tool_use_id`; the log has neither. Building the regex from `marker()` means a wording change cannot silently zero the count.
- **Rejected alternatives:**
  - Count `cat`/`sed` of spill paths inside the hook — sees the `Bash` half only (Q7's risk).
  - A `PostToolUse` hook on `Read` — a second hook entry breaks `checkHooksFile`'s single-entry rule (`trimhook.mjs:57`) and `Read` trimming is v0.2.0.
- **Reversible?** yes — a script.
- **Weak spot:** a model that re-runs a *narrower* command (`grep` on what it wanted) instead of the same one is not counted; the rate is a floor.

### D7 · Failures leave a record; the prune runs on every call

- **Choice:** the handler wraps its body so a thrown error or a failed spill appends `{outcome: 'failed', reason: <class>}` when the log is writable, keeps the single stderr line `trimhook: failed open: …` (`trimhook.mjs:47`), and exits 0. `report` and `doctor` count `failed` records by reason. The 1-in-20 prune (`handlers.mjs:25`) moves above the `!t` return so it runs on one Bash call in twenty, as Q3 states, not one *cut* in twenty.
- **Why:** `store.mjs:8` swallows every filesystem error with no trace; a read-only home directory runs trimhook for a month at zero effect and TH-10 is invalid without anyone knowing (Q8's risk). The stderr line stays because it is the only signal a broken install has; Q8's "silent" default is overruled by that argument. A session that never trims never prunes today.
- **Rejected alternatives:**
  - Fully silent fail-open — invisible breakage is the exact failure the week cannot afford.
  - A deterministic once-per-session prune via a marker file — one more file to fail on; the probabilistic trigger is fine once it fires on every call.
- **Reversible?** yes.

### D8 · Say the numbers and the bounds; make `check` enforce the new statements

- **Choice:** README states the stderr floor (20%, `trim.mjs:42`, currently "a floor" at `README.md:46-47`), the `minSaving` semantics (overflow above the cap, `trim.mjs:50`), the benchmark caveat (synthetic single-stream body, no line snapping, `evals/local.mjs:126`; snap slack up to 200 per cut, `trim.mjs:15-19`), the two-marker two-stream cut and its bound (`room >= 200` clamp, `trim.mjs:28`: a tiny stderr share may exceed its slice by at most 200 + marker length — accepted, tested, not fixed), the hook timeout (5 s, `hooks/hooks.json:8`), and the D3 decision rule. `doctor` also reads `bashOutputMaxChars` from the four `settings.json` locations best-effort under `safe()`, and prints that its harness verdict is from the environment only (`doctor.mjs:16`, no stdin). `check` gains a negative grep for `hookgate|HG-\d|Noul|TYPESAFE` over docs and workflows (`release.yml:150`, `backlog-issues.yml:3-12`, `README.md:133`).
- **Why:** `01-research.md` "Numbers live in the code" lists five numbers stated nowhere in prose; the ticket's done-when has `npm test` guarding the README's load-bearing statements, and a statement that is not there cannot be guarded.
- **Rejected alternatives:**
  - Fix the `room` clamp so `after <= cap` holds to the character — needs a stream-dropping rule for budgets under ~300 characters; more code than the bound is worth in 0.1.0.
  - Make `doctor` read stdin — nothing feeds it stdin from a terminal; honesty in one printed line is enough.
- **Reversible?** yes.

---

## Impact

| Area | Impact | Mitigation |
|---|---|---|
| DB schema | none — JSONL log gains `outcome: 'failed'` and `reason` | `summarize` (`report.mjs:4`) tolerates unknown outcomes today; add the accumulator |
| Public API | config: repo-layer keys rejected with a `problems` entry; `report --cap N` | pre-release (`0.0.1`, unpublished, `CHANGELOG.md:13-15`) — no compatibility owed |
| Performance | one fewer write per kept Bash result (D1); prune 20× more frequent (D7), still `readdir` under `safe()` | none needed; the 150k-character timing stays unmeasured (see below) |
| Security | D4 closes the checkout → `spill: false` path; spill files remain 0600 (`store.mjs:47-48`) | `doctor` BAD on a rejected repo key |
| Data migration | none | — |
| Backward compat | `TRIMHOOK_CONFIG` documented as replacing the repo layer — behaviour unchanged, docs changed | — |

---

## What we are NOT doing

- Exempting non-zero exits from the cut (D2) — no field to branch on; population argument.
- A tighten-only repository rule (D4) — trimhook saves, it does not gate.
- Fixing the `room >= 200` overshoot to the character (D8) — bound stated and tested instead.
- Reading spill re-reads from inside the hook (D6) — sees only the `Bash` half.
- Format-aware cuts, other tools, `PreToolUse`, telemetry — the brief's out-of-scope list stands.
- Protecting a live session's spill file beyond the 7-day TTL (Q3) — no session lasts that long; deferred until one does.

---

## More research needed

Facts the design assumes but `01-research.md` did not verify:

- [ ] What Claude Code's `tool_response` carries for a Bash call that exits non-zero, times out, or is interrupted — one live capture of each (D2 hinges on an `is_error`-style field existing or not).
- [ ] That the Claude Code transcript records a `Read` tool use's `input.file_path` (D6) — one grep of a `.jsonl` for `"name":"Read"`; `evals/local.mjs:72` never looked.
- [ ] Codex's actual `tool_response` shape and how a `decision: block` result appears in `~/.codex/sessions/*.jsonl` (D5, D6 on Codex) — comes out of the TH-9 run.
- [ ] Where `bashOutputMaxChars` lives in `settings.json` (top level or under a section) and which of the four files win (D8) — the harness docs, dated.
- [ ] The handler's wall-clock time on a 150,000-character result under the 5 s timeout — one timed run; nothing measures it.

> If this list is not empty, consider a short targeted Research round **before**
> moving to Structure. It costs less than the rework.

---

## Review

| Comment | From | Status | Resolution |
|---|---|---|---|
| | | open / resolved | |

---

## Status

- [x] Design written
- [x] Anchored to research facts (every claim has a path)
- [x] Alternatives documented
- [ ] Reviewed by the team
- [ ] Comments resolved
- [ ] Approved

> Next phase: **Structure**. It receives: this file only.
