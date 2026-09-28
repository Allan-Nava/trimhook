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
write veto the cut (D1). Trim by size only; on Claude Code a failing command never
reaches the hook at all (`PostToolUseFailure`, no `tool_response`), so the README stops
claiming a mechanism it does not have (D2). Ship 0.1.0's code default at 8,000 but run the
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
| Response reader / reply | `bin/lib/harness.mjs:32-56` | modify — `interrupted: true` → `null`; Codex `continue: false` shape with the note in the text, `block` kept behind `codex.mode` |
| Config layers | `bin/lib/config.mjs:10-18,68-90` | modify — per-layer allow-list, `problems` for a rejected repo key; `codex.mode` key + rule |
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

### D2 · Trim by size; no `PostToolUseFailure` registration; the README says what the harness does with failures

- **Choice:** the hook stays size-only on `PostToolUse`. On Claude Code a Bash command that exits non-zero never reaches it: the harness fires `PostToolUseFailure` instead, whose payload carries `error` and `is_interrupt` and **no `tool_response`**, and whose only decision control is `additionalContext` (Addendum, item 1). There is nothing to trim and no field to replace, so trimhook registers no `PostToolUseFailure` entry — `checkHooksFile` keeps its single-`PostToolUse` rule (`trimhook.mjs:57`). `readResponse` still returns `null` on `interrupted: true` (one line, a documented key, `CLAUDE.md:75-78`) although the corpus shows it 0 times in 27,549 results. The README replaces "any error reaches the model unchanged" (`README.md:38`) with the fact: on Claude Code a failed command's output is the harness's own error text (`Exit code N` plus interleaved stdout/stderr, 509 of 599 under 1k characters, none over 30k) and trimhook never sees it; on Codex `PostToolUse` runs after non-zero exits too (`CLAUDE.md:82-84`), so a failing command *is* trimmed by size there, with the stderr floor (`trim.mjs:42`, 20% of cap) and 40% tail keeping its ending.
- **Why:** the brief's hidden-middle risk on failing commands — the assertion in the elided region — is gone by construction on Claude Code, and so is any saving there: the 17% is entirely successful-command output. Q1's fear (both readings lead to opposite products) was moot; the harness decided. On Codex the risk survives and D6 counts it.
- **Rejected alternatives:**
  - Register `PostToolUseFailure` to log failure sizes — it would give `report` a population trimhook cannot act on, and a second entry breaks the one-hook-one-file promise; the 599 error results are small (84 in 1k-10k, 6 in 10k-30k), not a sink.
  - Exempt non-zero exits on Codex too — the exit code is not in the hook input (`tool_response` is a bare string, Addendum item 3); nothing to branch on, and Codex's own `tool_output_token_limit` already bounds it (`CLAUDE.md:91`).
- **Reversible?** yes — a hooks-file entry and a README paragraph.

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

### D5 · Codex: `decision: block` never defaults on; `continue: false` is the candidate, with a pass rule

- **Choice:** the live run (Addendum, item 3: Codex 0.155.1, `seq 1 6000`, 28,893 characters) showed `decision: block` reaches the model as `"Script failed …"` + `"Script error: " + reason`, the router logs `error=1`, and `systemMessage` is dropped — even though the model quoted head and tail correctly and never mentioned an error. A replacement that arrives labelled as an error may **never** be the default: `codex.replace` with `block` stays opt-in for good. `replacementOutput` gains a second Codex shape, `{continue: false, stopReason: <text>}` — documented to use "the hook feedback for the model-visible result" without rejecting the tool promise (same item) — selected by `codex.mode: 'continue' | 'block'`, default `continue`. `evals/codex-live.md` holds the TH-9 protocol as item 3 ran it (scratch repo, `print-hooks`, `TRIMHOOK_USER_CONFIG`, `codex exec`), re-run for `continue: false`: pass = in 3 of 3 the session log's `custom_tool_call_output` carries the trimmed text without a "Script failed"/"Script error" prefix, no `error=` line from the router, the model quotes head and tail and does not re-run. Pass → `codex.replace` defaults `true` with `mode: continue`; fail → stays `false`, README says both shapes were tried, and what each did, dated. Because the model on Codex sees the reply as the whole result, the note now travels inside the text: the Codex reply is the trimmed stdout, then `[stderr]` if any, then the note as a last line — `systemMessage` is dropped. `readResponse`'s string branch (`harness.mjs:33`) is now confirmed, and item 3's captured input becomes a fixture. One more consequence: the model can pass `max_output_tokens` to Codex's exec and Codex truncates *before* the hook (run 1 saw 504 of 28,893 characters); the README states it.
- **Why:** Q4 wanted a verified observation; item 3 is it, and it fails the brief's own criterion — "may read as a failure to the model". The model coping with it this time is not a default-on argument: an error-labelled result invites a re-run, which is exactly D6's cost.
- **Rejected alternatives:**
  - Default on with `block` because the model read it fine — one model, four runs, and the log says `failed`; the label is the harm, not the reading.
  - Drop Codex replacement entirely — audit mode (`would-trim`, `handlers.mjs:26-27`) still yields numbers, and `continue: false` is documented and untested; one more run is cheap.
- **Reversible?** yes — a boolean and a mode string.

### D6 · The re-read count is a transcript scan that shares the hook's `marker()`

- **Choice:** extend `evals/local.mjs` (Structure decides whether as a flag or a sibling file) to walk the same `~/.claude/projects/**/*.jsonl` (`:52`) and `~/.codex/sessions/**/*.jsonl` (`:88`), find every `tool_result` whose text matches a regex built from `marker()` (`trim.mjs:8-10`), extract the spill path, then look at the next five `tool_use` blocks of that session, any tool name: an `input` containing that path or a `spill/` segment is a **spill read**; a `Bash` `input.command` equal to the cut command is a **re-run**. Output: cuts, spill reads, re-runs, rate, by `commandPrefix`, dated JSON under `evals/results/`. The hook records nothing about re-reads (Q7).
- **Why:** `evals/local.mjs:72` records only `Bash` uses, so a `Read` of a spill file is invisible today (`01-research.md` Blind spots). The method is now confirmed: every one of the 689 `Read` uses in the corpus carries a string `input.file_path`, and 0 are under `/spill/` (Addendum, item 2) — the scan starts from a known zero, so the week's count is trimhook's alone. The transcript is the one place the cut (marker in the result) and the follow-up (any tool call) sit together with a `tool_use_id`; the log has neither. Building the regex from `marker()` means a wording change cannot silently zero the count. On Codex the scan matches the trimmed text inside `custom_tool_call_output.output[1]` in `~/.codex/sessions/**` (item 3), whichever prefix the reply shape gives it.
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

- **Choice:** README states the stderr floor (20%, `trim.mjs:42`, currently "a floor" at `README.md:46-47`), the `minSaving` semantics (overflow above the cap, `trim.mjs:50`), the benchmark caveat (synthetic single-stream body, no line snapping, `evals/local.mjs:126`; snap slack up to 200 per cut, `trim.mjs:15-19`), the two-marker two-stream cut and its bound (`room >= 200` clamp, `trim.mjs:28`: a tiny stderr share may exceed its slice by at most 200 + marker length — accepted, tested, not fixed), the hook timeout with its measured cost (5 s, `hooks/hooks.json:8`; p50 70 ms, max 84 ms for a 150,000-character result including Node start-up — Addendum, item 5 — so no internal deadline is added), and the D3 decision rule. `doctor` reads the top-level `bashOutputMaxChars` from the four settings files in precedence order — managed, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`, highest level that sets it wins — best-effort under `safe()`; when set, Claude Code ignores `BASH_MAX_OUTPUT_LENGTH` and clamps the value to 4,000-128,000 (Addendum, item 4), so `doctor.mjs:33-34` compares the cap against the settings value when one exists and the env var otherwise, and warns when the effective harness cap is below ours. It also says that above that limit the harness already writes the output to a file and sends a preview plus path (v2.1.261+, same item; `persistedOutputPath` in 13 corpus results, item 1) — trimhook is the same idea at a lower cap, and the README says so in one sentence. `doctor` prints that its harness verdict is from the environment only (`doctor.mjs:16`, no stdin). `check` gains a negative grep for `hookgate|HG-\d|Noul|TYPESAFE` over docs and workflows (`release.yml:150`, `backlog-issues.yml:3-12`, `README.md:133`).
- **Why:** `01-research.md` "Numbers live in the code" lists five numbers stated nowhere in prose; the ticket's done-when has `npm test` guarding the README's load-bearing statements, and a statement that is not there cannot be guarded. The `--settings` command-line level cannot be read by a hook and is named as the one gap.
- **Rejected alternatives:**
  - Fix the `room` clamp so `after <= cap` holds to the character — needs a stream-dropping rule for budgets under ~300 characters; more code than the bound is worth in 0.1.0.
  - Make `doctor` read stdin — nothing feeds it stdin from a terminal; honesty in one printed line is enough.
  - An internal deadline in the handler — 84 ms worst case against 5,000; a timer is code that can only fail open more slowly.
- **Reversible?** yes.

---

## Impact

| Area | Impact | Mitigation |
|---|---|---|
| DB schema | none — JSONL log gains `outcome: 'failed'` and `reason` | `summarize` (`report.mjs:4`) tolerates unknown outcomes today; add the accumulator |
| Public API | config: repo-layer keys rejected with a `problems` entry; `report --cap N` | pre-release (`0.0.1`, unpublished, `CHANGELOG.md:13-15`) — no compatibility owed |
| Performance | one fewer write per kept Bash result (D1); prune 20× more frequent (D7), still `readdir` under `safe()` | none needed; 150,000 characters cost p50 70 ms / max 84 ms against a 5 s timeout (Addendum, item 5) |
| Security | D4 closes the checkout → `spill: false` path; spill files remain 0600 (`store.mjs:47-48`) | `doctor` BAD on a rejected repo key |
| Data migration | none | — |
| Backward compat | `TRIMHOOK_CONFIG` documented as replacing the repo layer — behaviour unchanged, docs changed | — |

---

## What we are NOT doing

- Registering `PostToolUseFailure` (D2) — it carries no output; on Claude Code failing commands never reach trimhook, and on Codex there is no exit code to branch on.
- Defaulting `codex.replace` on with `decision: block` (D5) — the harness labels it "Script failed"; only `continue: false` may earn the default.
- A tighten-only repository rule (D4) — trimhook saves, it does not gate.
- Fixing the `room >= 200` overshoot to the character (D8) — bound stated and tested instead.
- Reading spill re-reads from inside the hook (D6) — sees only the `Bash` half.
- Format-aware cuts, other tools, `PreToolUse`, telemetry — the brief's out-of-scope list stands.
- Protecting a live session's spill file beyond the 7-day TTL (Q3) — no session lasts that long; deferred until one does.

---

## More research needed

Facts the design assumes but `01-research.md` did not verify:

- [x] What Claude Code's `tool_response` carries for a Bash call that exits non-zero, times out, or is interrupted — one live capture of each (D2 hinges on an `is_error`-style field existing or not). → settled: a non-zero exit fires `PostToolUseFailure` with `error` + `is_interrupt` and no `tool_response`; successful results have no exit field; `interrupted: true` 0 of 27,549 (Addendum, item 1). D2 rewritten.
- [x] That the Claude Code transcript records a `Read` tool use's `input.file_path` (D6) — one grep of a `.jsonl` for `"name":"Read"`; `evals/local.mjs:72` never looked. → settled: 689 of 689 `Read` uses carry a string `input.file_path`, 0 under `/spill/` (Addendum, item 2). D6 confirmed.
- [x] Codex's actual `tool_response` shape and how a `decision: block` result appears in `~/.codex/sessions/*.jsonl` (D5, D6 on Codex) — comes out of the TH-9 run. → settled: bare string; `block` lands as "Script failed" / "Script error: <reason>", `systemMessage` dropped, model still read head and tail (Addendum, item 3). D5 rewritten around `continue: false`.
- [x] Where `bashOutputMaxChars` lives in `settings.json` (top level or under a section) and which of the four files win (D8) — the harness docs, dated. → settled: top-level key, any of the four files, highest level wins, clamp 4,000-128,000, overrides `BASH_MAX_OUTPUT_LENGTH` when set (Addendum, item 4). D8 carries it.
- [x] The handler's wall-clock time on a 150,000-character result under the 5 s timeout — one timed run; nothing measures it. → settled: p50 70 ms, max 84 ms over ten runs including Node start-up (Addendum, item 5). D8 and Impact cite it; no internal deadline.

> If this list is not empty, consider a short targeted Research round **before**
> moving to Structure. It costs less than the rework.

---

## Review

Reviewed on 2026-09-28 against `main` at `f58f56d`, with the judgement rubric of the
qrspi plugin (`skills/qrspi/references/reviewing.md`), in a fresh session. This Design
was written on 2026-09-23; `main` has since shipped TH-12/TH-20 (Read and WebFetch are
cut too), TH-16 (runs collapsed before the cut), TH-21 (data dir), TH-22
(`evals/reads.mjs`), TH-23 and TH-24 (spill written only when the cut is taken).

### Decisions against main

| Decision | Status on main | Evidence | What remains for Structure |
|---|---|---|---|
| D1 decide first, spill second, failed spill vetoes | implemented (TH-24, `f58f56d`) | `bin/lib/handlers.mjs:23,31,46-49`; `bin/lib/store.mjs:42-57` (`spillPath`, `writeSpill`); `test/handlers.test.mjs:176-196` | nothing but the log shape: a failed write logs `outcome: 'kept', spillFailed: true`, not `outcome: 'failed', reason: 'spill'` — settle under D7 |
| D2 size only, no `PostToolUseFailure`, README says the truth | partial | one event registered (`hooks/hooks.json`, `bin/trimhook.mjs:57-62`); `readResponse` has no `interrupted: true` check (`bin/lib/harness.mjs:54`); `README.md:42` still says "on any error: no output" | the `interrupted` check and its test; the README text, now covering Read and WebFetch |
| D3 default 8,000, week at 4,000, written rule, `report --cap N` | partial | `bin/lib/config.mjs:12`; 0.1.0 shipped at 8,000 before TH-10 (`83a9b1c`); no rule in the README; no `--cap` on `report` (only `evals/local.mjs:37`) | the README rule, `report --cap N`, the split at `before > 8000` |
| D4 per-layer allow-list for the repository layer | not implemented | one flat merge, `RULES` over the result (`bin/lib/config.mjs:96-118`) | all of it, and a class for each key added since: `collapse.*`, `tools` |
| D5 Codex `continue: false`, `codex.mode`, TH-9 protocol | not implemented | `bin/lib/harness.mjs:70-76` still sends `decision: 'block'`; no `codex.mode`; no `evals/codex-live.md`; TH-9 open | all of it |
| D6 re-read scan sharing the marker | partial, different in form (TH-22, `e3617bb`) | `evals/reads.mjs`, `MARKER_RE` at `bin/lib/trim.mjs:17` | window 12, not 5 (`evals/reads.mjs:40`); only `Read` of the exact path counts (`:117`), not a `cat`/`sed` of it; no Codex walk (`:108`); no split by size; Read and WebFetch cuts land in the `(env)` bucket because `commandPrefix('')` is `'(env)'` (`bin/lib/handlers.mjs:78`); no re-run definition for Read or WebFetch |
| D7 failure records; prune on every call | partial | stderr line kept (`bin/trimhook.mjs:47`); `report.mjs:10-12` and `doctor.mjs` count no failures; the prune runs only on a cut, 1 in 20 (`bin/lib/handlers.mjs:36-40`) | records for thrown errors, the counts, one log schema with D1, the prune decision |
| D8 numbers, `doctor` on `bashOutputMaxChars`, `check` negative grep | not implemented | `doctor.mjs:35-36` reads only `BASH_MAX_OUTPUT_LENGTH`; `check` has no grep; strays at `.github/workflows/backlog-issues.yml:6` (`HG-n`) and `release.yml:150` ("trims Bash output", stale since TH-12) | all of it, the grep re-scoped (comment 2) |

### Comments

| # | Comment | From | Status | Resolution |
|---|---|---|---|---|
| 1 | **Blocking.** D4 allows `cap`, `perCommand`, `minSaving`, `head` and drops every other key; TH-16 and TH-12 added `collapse.enabled`, `collapse.minRun`, `collapse.strict`, `tools` (`bin/lib/config.mjs:33,42`), so a repository file would silently lose them. `collapse.strict: false` folds content in 38 of 40 sampled runs, so it is not a pure saving knob. Classify each key with a reason — e.g. `collapse.enabled`, `collapse.minRun`, `tools` narrow-only; `collapse.strict` denied. | review 2026-09-28 | open | |
| 2 | **Blocking.** D8's negative grep for `hookgate\|HG-\d\|Noul\|TYPESAFE` over the docs fails at once on text meant to be there: `README.md:241` ("Why not a Noul"), `README.md:250-252` (the hookgate link), `CLAUDE.md:12,92`, `CHANGELOG.md:83,86`; `TYPESAFE` was removed in `83a9b1c`. Limit it to `.github/workflows/*.yml` and name the real strays (`backlog-issues.yml:6`, `release.yml:150`, whose wording must become Bash/Read/WebFetch). | review 2026-09-28 | open | |
| 3 | **Blocking.** "What we are NOT doing" keeps "other tools" out of scope and D6 says "`Read` trimming is v0.2.0", but TH-12/TH-20 shipped it (matcher `Bash\|Read\|WebFetch`). Consequences: (a) a Read of a spill file is itself cut — **reproduced, filed as TH-26**; (b) the D3 rate pools Bash with Read and WebFetch without saying so; (c) no re-run definition for Read or WebFetch. Delete "other tools" from the list, state TH-12 as in scope, decide the spill exemption (TH-26), say pooled or per tool, define a re-run as the same `file_path` / `url`. | review 2026-09-28 | open | |
| 4 | **Blocking.** D6 extends `evals/local.mjs` with a five-block window, any tool, and `~/.codex/sessions`; the instrument is already `evals/reads.mjs` (window 12, Read only, Claude only), and D3's "next five tool uses" disagrees with it. Rewrite D6 as the delta on `evals/reads.mjs`: one window for D3 and the script, with a reason; count `cat`/`sed` of spill paths or drop them from the rule; the Codex walk; the split at `before > 8000` via `MARKER_RE` group 2; the `(env)` bucket fixed. | review 2026-09-28 | open | |
| 5 | Should-fix. D1 against D7: D7 logs `outcome: 'failed', reason: 'spill'`; what shipped is `outcome: 'kept', spillFailed: true` (`bin/lib/handlers.mjs:47`, `BACKLOG.md` TH-24). Mark D1 implemented; have D7 keep `spillFailed` or migrate it on purpose, with `report` reading the chosen one. | review 2026-09-28 | open | |
| 6 | Should-fix. Problem ("0.1.0 is not a rewrite") and Impact ("pre-release, `0.0.1`, unpublished — no compatibility owed") are false: 0.1.0 was published on 2026-09-23. D4 rejecting repository keys breaks installed users' repo files. Retarget to the next minor, a CHANGELOG "Changed" entry, the Public API row "breaking for repository files that set X; `doctor` reports it". | review 2026-09-28 | open | |
| 7 | Should-fix. D2 says `readResponse` "still returns `null` on `interrupted: true`"; it never did (`bin/lib/harness.mjs:54`, and at `47a1b9f`). Say "gains a check"; the README sentence is at `README.md:42`. | review 2026-09-28 | open | |
| 8 | Should-fix. D7's reason "a session that never trims never prunes" no longer holds: since TH-24 a kept result writes nothing. The only remaining case is the pre-TH-24 orphans. Restate or drop the prune move, and keep the Performance row consistent. | review 2026-09-28 | open | |
| 9 | Should-fix. D3's sweep numbers (759 of 28,219, 15.5%; 268, 6.4%) disagree with `evals/results/2026-09-23-local.json` (807 of 28,800, 16.3%; 289, 6.8%) and with `README.md:139-140` (802 of 28,545; 288). Cite one source with its date, and say the sweep is Bash-only while the week cuts three tools. | review 2026-09-28 | open | |
| 10 | Nit. D8's "p50 70 ms, max 84 ms" predates the collapse pass (`bin/lib/handlers.mjs:28`). Re-time, or name the build measured. | review 2026-09-28 | open | |
| 11 | Nit. Line numbers moved: `config.mjs:77` → `:105`, `:73-75` → `:101-103`, `harness.mjs:33` → `:51`, `doctor.mjs:33-34` → `:35-36`, `local.mjs:126` → `:279`. | review 2026-09-28 | open | |
| 12 | Nit. D5 does not name the tool the TH-9 run is judged on; Codex's hooks now match `Bash\|Read\|WebFetch` too. | review 2026-09-28 | open | |

**Verdict:** the Design advances to Structure once comments 1-4 are applied, with D1
marked done and D6 rewritten as the delta on `evals/reads.mjs`. Next step: re-enter
Design scoped to these comments (qrspi `recovery.md`), then Structure.

---

## Status

- [x] Design written
- [x] Anchored to research facts (every claim has a path)
- [x] Alternatives documented
- [ ] Reviewed by the team
- [ ] Comments resolved
- [ ] Approved

> Next phase: **Structure**. It receives: this file only.
