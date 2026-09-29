# 02 · Design — TH-1 Tool output trimmed at the source

This is the main human checkpoint. Correcting 200 lines of markdown costs
infinitely less than correcting 2000 lines of wrong code.

---

## Problem

trimhook 0.1.0 is published (`CHANGELOG.md:70`, tag `trimhook--v0.1.0`), and `main` has since cut `Read` and `WebFetch` as well as `Bash` (TH-12/TH-20, matcher `Bash|Read|WebFetch` at `hooks/hooks.json:6` and `codex/hooks.json:6`) — in scope here: every decision applies to all three tools. Research found the hook breaking two of its own rules (`CLAUDE.md:52-59`): a cut with no spill (fixed by TH-24, D1) and a checkout able to switch spilling off (D4); the review found a third, a read of a spill file cut again (TH-26, D9). The three numbers the release hangs on — default cap, Codex default, spill re-read rate — still have no rule to decide them. The next minor, 0.2.0, is not a rewrite: it makes the shipped hook match its rules and makes TH-9/TH-10 countable. Suite on `main`: 41 tests, 40 pass, 1 `todo` (TH-26).

**Ticket:** TH-1 · https://github.com/Allan-Nava/trimhook/blob/main/BACKLOG.md

---

## Proposed solution

Decide first and spill second, with a failed write leaving the result whole — shipped as TH-24 (D1). Trim by size only; on Claude Code a failing tool never reaches the hook (`PostToolUseFailure`, no `tool_response`), so the README stops claiming a mechanism it does not have (D2). Keep the code default at 8,000 and run the live week at 4,000 under a written rule judged per tool, so the week can *reject* a cap rather than confirm the guess (D3). Replace the flat config merge with key classes for the repository layer: the saving knobs move either way, the collapse and tool knobs only narrow, the recoverability knobs are denied — a breaking change for 0.1.0 repository files, said so in the CHANGELOG (D4). Write the TH-9 protocol, judged on Bash, as a file with a pass/fail rule for flipping `codex.replace` (D5). Extend `evals/reads.mjs` into the one re-read instrument for three tools and both harnesses (D6). Keep one log schema — `kept` plus a flag — for every result the model saw whole (D7), fix the doc/check drift (D8), and let a read of a spill file through uncut (D9).

### Diagram

```
stdin ─► parse ─► tool in cfg.tools? ─► readResponse ── image, interrupted (D2) ──► null
   ─► spill read? Read under <data>/spill/, Bash naming it ──► log kept spillRead ──► null  (D9)
   ─► path = spillPath() pure; collapse; t = trimResult(body, cap, path)          (D1, shipped)
   ─► nothing worth cutting ──► log kept ──► null
   ─► writeSpill fails ──► log kept spillFailed ──► null                           (D1, D7)
   ─► log trimmed / would-trim ──► replacementOutput, Codex shape per codex.mode   (D5)
thrown anywhere ──► stderr line + log kept error ──► exit 0                        (D7)
```

### Components to touch

| Component | Path | Kind of change |
|---|---|---|
| Handler flow | `bin/lib/handlers.mjs:14-56` | modify — the spill-read exemption after `readResponse`, before the collapse; `spillRead` flag (D9) |
| Spill layout | `bin/lib/store.mjs:37-44` | modify — one exported "is under `<data>/spill/`" predicate beside `spillPath` (D9); the path/write split itself shipped (D1) |
| Response reader / reply | `bin/lib/harness.mjs:50-90` | modify — `interrupted: true` → `null` in the Bash branch at `:54` (D2); Codex `continue: false` shape, `block` kept behind `codex.mode` (D5) |
| Config layers | `bin/lib/config.mjs:74-118` | modify — per-layer key classes, a `problems` entry per rejected key (D4); `codex.mode` key and rule (D5) |
| Doctor, report | `bin/lib/doctor.mjs:16,29,35-36`, `bin/lib/report.mjs:4-41` | modify — flag counts and a warning on `spillFailed`/`error`; `bashOutputMaxChars`; the stdin caveat; `report --cap N` (D3, D7, D8) |
| Entry point, check | `bin/trimhook.mjs:46-48,74-114` | modify — the catch appends an `error` record (D7); new README statements and a workflow-only grep in `check` (D8) |
| Re-read scan | `evals/reads.mjs` | modify — the delta in D6 |
| Codex protocol | `evals/codex-live.md` (new) | new — TH-9 steps and pass rule (D5) |
| Tests | `test/handlers.test.mjs:211-221`, `test/misc.test.mjs` | modify — the TH-26 `todo` becomes a test, plus a Bash spill read, interrupted, repo key classes, error record, `--cap` |
| Docs | `README.md`, `CLAUDE.md`, `BACKLOG.md` (TH-4 `:54-56`, TH-26 `:124-135`), `CHANGELOG.md`, `.github/workflows/release.yml:150`, `.github/workflows/backlog-issues.yml:6,40` | modify — numbers, wording, stray strings, a `### Changed` entry |

---

## Decisions

### D1 · Decide first, spill second, and a failed spill vetoes the cut — implemented (TH-24, `f58f56d`)

- **Status (2026-09-28):** shipped. `spillPath()` is pure and `writeSpill()` separate (`bin/lib/store.mjs:42-57`); the handler decides the path at `bin/lib/handlers.mjs:23`, writes only when it replaces, and leaves the result whole when the write fails (`:46-49`); tested at `test/handlers.test.mjs:176-196`. Nothing remains for Structure: the failed write logs `outcome: 'kept', spillFailed: true` (`handlers.mjs:47`), and D7 keeps that shape.
- **Choice (2026-09-23):** compute the spill path without writing (`<data>/spill/<slug(session)>/<slug(tool_use_id)>.txt`, deterministic), pass it to `trimResult`, and only when the result is a cut write the file; if the write fails, return `null` so the model gets the untouched result — ~~log `outcome: 'failed', reason: 'spill'`~~ (superseded by the shipped flag, comment 5).
- **Why:** at `47a1b9f`, the code this Design was written against, `handlers.mjs:18-19` spilled every Bash result before deciding and cut even when `spill()` returned `null` (`trim.mjs:9` just drops the path from the marker) — the two "large letters" facts in `01-research.md`. `CLAUDE.md:56-59` promises the opposite. Computing the path first is free because the marker's length depends only on the path *string* (`trim.mjs:34`).
- **Rejected alternatives:**
  - Spill first, then delete the file when the result is kept — one extra `unlink` per call, and a crash between write and unlink leaves orphans; the deterministic name makes the write unnecessary.
  - Cut without a path when the spill fails, as shipped then — turns a wrong cap into an unrecoverable answer; forbidden by rule 3.
- **Reversible?** yes — an ordering change in one function.

### D2 · Trim by size; no `PostToolUseFailure` registration; the README says what the harness does with failures

- **Revised 2026-09-28** (comments 7, 11): ~~`readResponse` "still returns `null` on `interrupted: true`"~~ — it never did, at `47a1b9f` or on `main`; it gains the check.
- **Choice:** the hook stays size-only on `PostToolUse`. On Claude Code a tool that fails never reaches it: the harness fires `PostToolUseFailure` for "a tool that started executing fails" — a Bash non-zero exit, and by the same definition a `Read` or `WebFetch` that errors — with `error` and `is_interrupt` and **no `tool_response`**, and `additionalContext` as its only control (Addendum, item 1). There is nothing to trim, so trimhook registers no `PostToolUseFailure` entry and `checkHooksFile` keeps its one-event rule (`bin/trimhook.mjs:59-60`). `readResponse` **gains** a check: a Bash response with `interrupted: true` returns `null` (the Bash branch, `bin/lib/harness.mjs:54`) — one line for a documented key (`CLAUDE.md:79`), though the corpus shows it 0 times in 27,549 results. The README's "or on any error: no output" (`README.md:42`, the Effect column) becomes the fact, for all three tools: on Claude Code a failed call's output is the harness's own error text (for Bash `Exit code N` plus interleaved output, 509 of 599 under 1k characters, none over 30k) and trimhook never sees it; on Codex `PostToolUse` runs after non-zero exits too (`CLAUDE.md:84-85`), so a failing command *is* trimmed by size there, with the stderr floor (`trim.mjs:48`, 20% of cap) and the 40% tail keeping its ending.
- **Why:** the brief's hidden-middle risk on failing commands is gone by construction on Claude Code, and so is any saving there. Q1's fear was moot; the harness decided. On Codex the risk survives and D6 counts it.
- **Rejected alternatives:**
  - Register `PostToolUseFailure` to log failure sizes — a population trimhook cannot act on, and a second entry breaks the one-hook-one-file promise; the 599 error results are small (84 in 1k-10k, 6 in 10k-30k).
  - Exempt non-zero exits on Codex too — the exit code is not in the hook input (`tool_response` is a bare string, Addendum item 3), and Codex's own `tool_output_token_limit` bounds it (`CLAUDE.md:92-93`).
- **Reversible?** yes — a hooks-file entry, one line and a README paragraph.

### D3 · Code default 8,000; the live week runs at 4,000 under a written rule, judged per tool

- **Revised 2026-09-28** (comments 3, 4, 9): ~~one pooled rate, "next five tool uses", split at `before > 8000`, sweep numbers 759 of 28,219 / 268~~ — per tool, D6's window of 12, the subset 8,000 would also cut, one dated source.
- **Choice:** `DEFAULTS.cap` stays 8,000 (`bin/lib/config.mjs:12`) in 0.2.0. The maintainer's week (TH-10) runs with `~/.trimhook.json` `cap: 4000` and all three tools. The rule, written into the README before the week: for each tool with at least 20 cuts in the week, its re-read rate is (spill reads + re-runs within the next 12 tool uses, as D6 defines both) over its cuts. The default becomes **4,000** if every such tool is at or under 10% both over all its cuts and over the subset 8,000 would also have cut (post-collapse size at least 8,000 + `minSaving`, i.e. 9,500 — `trim.mjs:56`, `config.mjs:14`); else **8,000** if every such tool's subset is at or under 10%; else **12,000**, and the README says the week rejected both. The pooled rate is reported and does not decide; a tool under 20 cuts is reported as unmeasured and does not vote. `report --cap N` recomputes the week's saving at any cap from the logged `before` sizes with `trimResult` on a synthetic body, as `evals/local.mjs:279` already does.
- **Why:** the committed sweep (`evals/results/2026-09-23-local.json`, 2026-09-23) says 4,000 cuts 807 of 28,800 results (one in 36) and saves 16.3%; 8,000 cuts 289 (one in 100) and saves 6.8%. That sweep is Bash only — 28,785 Claude Code Bash results plus 15 Codex outputs (`evals/local.mjs:193,221`) — while the week cuts three tools, and Read and WebFetch lose far more per result (26.6% and 62.4% of their characters against Bash's 6.7%, `config.mjs:34-36`; 1.38 M characters against Bash's 1.93 M, `BACKLOG.md` TH-12). One `cap` serves all three — for Read and WebFetch `capFor` looks up the tool name and falls to `cfg.cap` (`handlers.mjs:19`, `config.mjs:123-130`) — so the strictest tool decides, and pooling would let Bash's count hide a tool read back often. At 8,000 one install logged 47 cuts in 2,551 results (`BACKLOG.md` TH-24, 2026-09-28): too few to reject 10%; at 4,000 the sweep cuts 2.8× as many, and every cut at or above 9,500 counts against both caps. The 10% threshold is a judgement: a re-read costs one `Read` of the whole spill, so even 50% would save characters on average (5,797 saved per cut at 4,000 in the sweep), but a re-read is the only visible proxy for the invisible case — a middle the model needed and never read — so the bar sits far below break-even. Twenty cuts is the least at which one re-read moves the rate by 5 points, not 10.
- **Rejected alternatives:**
  - Ship 4,000 now — the transcript numbers are post-harness-cut (`evals/local.mjs:11-13`) and say nothing about re-reads; the brief forbids choosing from a guess.
  - Run the week at 8,000 as the brief assumes — confirms the guess with a sample that cannot reject it.
  - One pooled rate — Bash's volume decides for tools it does not represent.
  - Per-tool default caps (`perCommand` defaults for `Read`/`WebFetch`) — three defaults from one week; a follow-up item if one tool fails alone.
- **Reversible?** yes — a number in `config.mjs:12`, `README.md:97,140`, `ci.yml:40`.
- **Weak spot:** a re-read at 4,000 of a result over 9,500 is an *upper bound* for its re-read at 8,000 (less head and tail shown), so the rule may reject 8,000 unfairly; the README must state the bound. A tool under 20 cuts goes unjudged.

### D4 · Per-layer key classes: a repository file moves the saving knobs, narrows the rest, never touches recoverability

- **Revised 2026-09-28** (comments 1, 6, 11): ~~allow `cap`, `perCommand`, `minSaving`, `head`, drop every other key~~ — TH-16 and TH-12 added `collapse.*` and `tools` (`config.mjs:33,42`), which that list would have dropped in silence; each key now has a class.
- **Choice:** `loadConfig` classifies every `RULES` key (`config.mjs:74-87`) for the repository layer — the `cwd` candidates at `config.mjs:105` *and* `TRIMHOOK_CONFIG`, which replaces them (`:101-103`). User file and environment keep the full set. A key outside its class is dropped with a `problems` entry (`<path>: <key> may only be set in ~/.trimhook.json or the environment`, or `… may only narrow`) that `doctor` prints as BAD, as it prints every problem (`doctor.mjs:29`); the value from the layer above stands. The check runs on the repository layer against the layer above it, before the merge, because "narrow" needs the upper value. The README/BACKLOG chain wording (`README.md:90-92`, `BACKLOG.md:54-56`) changes to what the code does: `TRIMHOOK_CONFIG` *replaces* the repository layer.

  | Key | Repository layer | Why |
  |---|---|---|
  | `cap`, `perCommand`, `minSaving`, `head` | either direction | how much of a cut result shows; every cut still spills; the per-command raise for a chatty test runner is the layer's use case |
  | `collapse.enabled`, `collapse.minRun` | narrow only: `enabled` may go to `false`, never back to `true`; `minRun` may rise, never fall | strict folding is lossless and spilled (`config.mjs:22-25`), but a user who switched it off, or set a longer run, chose to see those lines |
  | `tools` | narrow only: a subset of the list above | a tool of unverified shape makes the log claim a saving the model never gets (`config.mjs:36-41`) |
  | `collapse.strict` | denied | `false` folds content, not noise, in 38 of 40 sampled runs (`config.mjs:27-32`) — a content decision |
  | `mode` | denied | decides whether the hook cuts or measures; a checkout flipping it changes TH-10's population unseen |
  | `spill`, `spillTtlDays` | denied | recoverability: `spill: false` cuts with no middle; a TTL of 0 prunes the file a marker names |
  | `codex.replace`, `codex.mode` (D5) | denied | what reaches the model on Codex, including the error-labelled `block` shape |

- **Why:** `config.mjs:111-117` runs one `RULES` set over the merged result — a checkout can set `spill: false`, `mode`, `spillTtlDays`, `codex.replace` (`01-research.md`, fifth contradiction), producing cuts with no recoverable middle. This is not hookgate's tighten-only rule, on purpose: trimhook only saves (`CLAUDE.md:52-53`), so a repository raising `perCommand["npm test"]` costs tokens, not safety. What a checkout must never do is make the marker lie, or undo an opt-out its user made. **Breaking:** `mode`, `spill`, `spillTtlDays` and `codex.replace` were accepted from a repository in 0.1.0 (`bin/lib/config.mjs` at `trimhook--v0.1.0`); `collapse.*` and `tools` are unreleased, so their classes land with them. 0.2.0 carries a `### Changed` entry under `[Unreleased]` naming the four keys and the `doctor` line; SemVer lets a 0.x minor break (`CHANGELOG.md:4`).
- **Rejected alternatives:**
  - Tighten-only (a repository may only lower caps) — kills the per-command raise, the reason the repository layer exists.
  - Leave `collapse.*` and `tools` unrestricted — a checkout could re-enable what the user turned off, or add a tool of unknown shape.
  - Deny `collapse.enabled`, `collapse.minRun`, `tools` outright — forbids the useful direction: a repository turning collapse off where every repeated line matters.
  - A `spillDir`/`logPath` key — none exists (`harness.mjs:32-34`, env-only); not added.
- **Reversible?** yes, but loosening a class later is a recoverability decision, not a convenience.

### D5 · Codex: `decision: block` never defaults on; `continue: false` is the candidate, with a pass rule judged on Bash

- **Revised 2026-09-28** (comments 11, 12): names the tool the run is judged on; `harness.mjs:33` → `:51`.
- **Choice:** the live run (Addendum, item 3: Codex 0.155.1, `seq 1 6000`, 28,893 characters) showed `decision: block` reaches the model as `"Script failed …"` + `"Script error: " + reason`, the router logs `error=1`, and `systemMessage` is dropped — though the model quoted head and tail correctly. A replacement labelled as an error may **never** be the default: `codex.replace` with `block` stays opt-in for good. `replacementOutput` (`harness.mjs:69-76`) gains a second Codex shape, `{continue: false, stopReason: <text>}`, selected by `codex.mode: 'continue' | 'block'`, default `continue`. `evals/codex-live.md` holds the TH-9 protocol as item 3 ran it (scratch repo, `print-hooks`, `TRIMHOOK_USER_CONFIG`, `codex exec`), re-run for `continue: false`, and **judged on `Bash`** — the one `tool_name` Codex has been seen to send (item 3) and the tool the protocol's `seq` exercises. `codex/hooks.json:6` also matches `Read` and `WebFetch`, and `codex.replace` is one switch for all tools, so the protocol records every `tool_name` that reaches the hook, and any tool other than Bash seen there must pass the same rule before the default flips. Pass = in 3 of 3 the session log's `custom_tool_call_output` carries the trimmed text without a "Script failed"/"Script error" prefix, no `error=` line from the router, the model quotes head and tail and does not re-run. Pass → `codex.replace` defaults `true` with `mode: continue`; fail → stays `false`, and the README says both shapes were tried and what each did, dated. The note travels inside the text: the Codex reply is the trimmed stdout, then `[stderr]` if any, then the note as a last line. `readResponse`'s string branch (`harness.mjs:51`) is confirmed, and item 3's captured input becomes a fixture. The model can pass `max_output_tokens` and Codex truncates *before* the hook (run 1 saw 504 of 28,893 characters); the README states it.
- **Why:** Q4 wanted a verified observation; item 3 is it, and it fails the brief's own criterion — "may read as a failure to the model". An error-labelled result invites a re-run, which is exactly D6's cost.
- **Rejected alternatives:**
  - Default on with `block` because the model read it fine — one model, four runs, and the log says `failed`; the label is the harm.
  - Drop Codex replacement entirely — audit mode (`would-trim`, `handlers.mjs:41,52`) still yields numbers, and `continue: false` is documented and untested; one more run is cheap.
- **Reversible?** yes — a boolean and a mode string.

### D6 · The re-read count is `evals/reads.mjs`, extended: one window, three tools, both harnesses

- **Revised 2026-09-28** (comments 3, 4): ~~extend `evals/local.mjs` with a five-use window, any tool, Claude and Codex~~ — the instrument shipped as `evals/reads.mjs` (TH-22, `e3617bb`), sharing `MARKER_RE` (`bin/lib/trim.mjs:17`); this is the delta on it.
- **Choice:** keep `evals/reads.mjs` and its window of 12 tool uses (`:38-40`) as the one window for D3 and the script; late reads stay reported apart (`:104,121`) and do not vote. The delta:
  - (a) a **spill read** is a later `Read` whose `file_path` is the marker's path (as `:117`) *or* a `Bash` command containing that path — `cat`, `sed`, `grep` of the spill, which TH-26 saw once in real transcripts;
  - (b) a **re-run** is, per tool, the same `command` byte for byte for Bash (`:124`), the same `file_path` for `Read` whatever its `offset`/`limit`, the same `url` for `WebFetch`; `scan()` records `url` beside `file_path` (`:86`);
  - (c) every marker in a result counts, not the first (`:90` uses `match`; a two-stream cut carries two), and the size for D3's subset is the sum of their group 2 — the post-collapse stream totals the cut compared (`handlers.mjs:31`, `trim.mjs:38`); a cut is in the subset when the sum is at least 9,500;
  - (d) the bucket is the tool name for `Read`/`WebFetch` and `commandPrefix` for Bash, as the handler keys it (`handlers.mjs:19`) — today `commandPrefix('')` returns `'(env)'` (`handlers.mjs:78`), so the `'(other tool)'` fallback at `:125` never fires; the per-bucket read count keeps to the window like the totals (`:128` counts late reads too); output and `--json` gain `byTool` and the subset counts;
  - (e) a cut whose own tool use is a spill read is skipped — pre-D9 transcripts hold TH-26's second cut, which is not new output;
  - (f) a Codex walk over `~/.codex/sessions/**/*.jsonl`, as `evals/local.mjs:241` does: a cut is `MARKER_RE` anywhere in a `custom_tool_call_output` text (Addendum, item 3 — whatever prefix the reply shape gives it); a spill read is a later `custom_tool_call` whose `input` contains the spill path, a re-run one whose `input` equals the cut call's.
- **Why:** `reads.mjs` is already the TH-10 instrument and shares `MARKER_RE`, so a reworded marker cannot zero it (`:18-19`); a second scan in `local.mjs` would be two definitions of a cut. Twelve over five: neither is measured, 12 is shipped with a reason ("about two exchanges", `:38-39`), and a wider window counts more re-reads — the conservative direction for a rule whose job is to reject a low cap. `cat`/`sed` counted, not dropped: dropping would under-count the very reads D9 lets through. Group 2 needs only the transcript; the sum is exact unless one stream is short enough to go uncut, and then it can only understate the size.
- **Rejected alternatives:**
  - A sibling scan in `evals/local.mjs` (the 2026-09-23 choice) — duplicates `reads.mjs`.
  - Five tool uses (D3's old wording) — unmeasured and narrower; a re-read at use six would pass.
  - Count in the hook — since TH-12 it sees `Read`, and D9 logs `spillRead`, but the log cannot tie a read to its cut or its window; the flag is a cross-check only (the log's count at least the scan's).
- **Reversible?** yes — a script.
- **Weak spot:** a model that re-runs a *narrower* command (`grep` on what it wanted) is not counted; on Codex an `exec` script is free text, so a reworded retry is missed; the rate is a floor.

### D7 · Failures leave a record — one schema, `kept` plus a flag; the prune stays on the cut

- **Revised 2026-09-28** (comments 5, 8): ~~`outcome: 'failed', reason: <class>`~~ and ~~the prune moves above the `!t` return, one call in twenty~~.
- **Choice:** every result the model received whole is logged `outcome: 'kept'`, and a failure is a flag on it. A failed spill keeps the flag TH-24 shipped, `spillFailed: true` (`handlers.mjs:47`) — no migration. A thrown error appends `{outcome: 'kept', error: <e.code or e.name>}` best-effort from the entry point's catch (`bin/trimhook.mjs:46-48`) — never `e.message`, which can carry a path or output (rule 4, `CLAUDE.md:60-61`) — which keeps its stderr line `trimhook: failed open: …` and exits 0. D9 adds `spillRead: true` the same way. `summarize` (`report.mjs:4-27`) counts each flag and `render` prints the counts when non-zero; `doctor` warns when the log holds any `spillFailed` or `error` record. The 1-in-20 prune stays where it is, on a cut (`handlers.mjs:40`).
- **Why:** `store.mjs:8` swallows every filesystem error with no trace; a read-only home runs trimhook for a month at zero effect and TH-10 is invalid without anyone knowing (Q8's risk). The stderr line stays: it is the only signal a broken install has. `kept` is the truth about what the model saw, and `summarize` already handles it (`after` falls to `before`, `:9`; `kept` records save nothing, `:12`); a new outcome would split "seen whole" across two names. The prune: since TH-24 a kept result writes nothing (`handlers.mjs:36-39` returns before any write), so every new file follows a cut and the prune already runs on cuts. The one leftover is pre-TH-24 orphans on an install that seldom cuts; they are 0600 and age out on its next prunes (`BACKLOG.md` TH-24).
- **Rejected alternatives:**
  - `outcome: 'failed', reason: 'spill'` (the 2026-09-23 choice) — migrates a flag already on `main`, and `summarize` would have to learn that `failed` means kept.
  - Fully silent fail-open — invisible breakage is the exact failure the week cannot afford.
  - Prune on every call (the 2026-09-23 choice) — twenty times the `readdir` for orphans the cut-path prune reaches anyway.
- **Reversible?** yes.

### D8 · Say the numbers and the bounds; make `check` enforce the new statements

- **Revised 2026-09-28** (comments 2, 9, 10, 11): ~~a negative grep for `hookgate|HG-\d|Noul|TYPESAFE` over docs and workflows~~ and ~~p50 70 ms, max 84 ms~~.
- **Choice:** README states the stderr floor (20%, `trim.mjs:48`, "a floor" at `README.md:50-51`), the `minSaving` semantics (overflow above the cap, `trim.mjs:56`), the benchmark caveat (synthetic single-stream body, no line snapping, `evals/local.mjs:279`; snap slack up to 200 per cut, `trim.mjs:21-28`), the two-marker two-stream cut and its bound (`room >= 200` clamp, `trim.mjs:34`: a tiny stderr share may exceed its slice by at most 200 + marker length — accepted, tested, not fixed), the hook timeout with its measured cost, and the D3 rule. The cap table (`README.md:136-141`, 802 of 28,545 and 288, an earlier run) is re-read from `evals/results/2026-09-23-local.json` so README and D3 cite one source. Timing, re-measured 2026-09-28 at `fb4f5b6` (collapse pass on, `handlers.mjs:28`), Node 23.3.0, the Addendum item 5 method with two 150,000-character bodies — `'x\n'.repeat(75000)`, which the collapse folds to one line, and 30,000 distinct lines cut to the cap — four rounds of ten each: p50 75-83 ms, max 156 ms against the 5 s timeout (`hooks/hooks.json:8`), so no internal deadline is added; the Addendum's 70/84 ms predates the collapse (`1ab0bae`). `doctor` reads the top-level `bashOutputMaxChars` from the four settings files in precedence order — managed, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`, highest level that sets it wins — best-effort under `safe()`; when set, Claude Code ignores `BASH_MAX_OUTPUT_LENGTH` and clamps the value to 4,000-128,000 (Addendum, item 4), so `doctor.mjs:35-36` compares the cap against the settings value when one exists and the env var otherwise, and warns when the effective harness cap is below ours. The README says in one sentence that above that limit the harness already writes the output to a file and sends a preview plus path (v2.1.261+, item 4; `persistedOutputPath` in 13 corpus results, item 1) — trimhook is the same idea at a lower cap. `doctor` prints that its harness verdict is from the environment only (`doctor.mjs:16`, no stdin). `check` gains a negative grep for `hookgate|\bHG-` over `.github/workflows/*.yml` **only**: the docs name the sibling on purpose (`README.md:241,250-252`, `CLAUDE.md:12,92`, `CHANGELOG.md:83,86`), `TYPESAFE` left in `83a9b1c`, and "Noul" is README prose. The strays it must find today are `backlog-issues.yml:6,40` (`HG-n`, → `TH-n`); `release.yml:150` is fixed by hand, "trims Bash output" becoming "trims Bash, Read and WebFetch output" — stale since TH-12, not a sibling string, and left unguarded rather than keeping a second copy of the matcher.
- **Why:** `01-research.md` "Numbers live in the code" lists five numbers stated nowhere in prose; the ticket's done-when has `npm test` guarding the README's load-bearing statements, and a statement that is not there cannot be guarded. A grep that fails on text meant to be there would be switched off on day one. The `--settings` command-line level cannot be read by a hook and is named as the one gap.
- **Rejected alternatives:**
  - Fix the `room` clamp so `after <= cap` holds to the character — needs a stream-dropping rule for budgets under ~300 characters; more code than the bound is worth.
  - Make `doctor` read stdin — nothing feeds it stdin from a terminal; one honest printed line is enough.
  - An internal deadline in the handler — 156 ms worst case against 5,000; a timer is code that can only fail open more slowly.
- **Reversible?** yes.

### D9 · A read of a spill file is exempt from the cut — `Read` under `<data>/spill/`, or a Bash command naming a spill path (new, 2026-09-28, TH-26, comment 3)

- **Choice:** after `readResponse` and before the collapse (`handlers.mjs:15-16`), the handler returns `null` — the result whole, byte for byte — and logs `outcome: 'kept', after: before, spillRead: true` when either holds: the tool is `Read` and `tool_input.file_path`, resolved, lies under `join(dataDir(), 'spill')` plus a separator (`harness.mjs:32-34`, `store.mjs:42-44`); or the tool is `Bash` and `tool_input.command` contains that directory's path, absolute or written with `~/` when the data dir is under the home directory. `WebFetch` is never exempt. The exemption holds whatever `mode`, `spill` and harness say, and is no config key. The `todo` test at `test/handlers.test.mjs:211-221` becomes an ordinary test, joined by a Bash `sed -n` of a spill path and a `Read` outside `spill/` that is still cut.
- **Why:** rule 3, "the middle is always recoverable" (`CLAUDE.md:56-59`), holds today only if the model pages: TH-26 reproduced a 3,000-line result cut, its 88,889-character spill read back at 7,971 with a new marker, a second spill written, and line 1,500 still unseen (`BACKLOG.md:124-135`); the Bash half was seen in real transcripts, one of two such reads cut again. The cost is bounded: the spill is written from the original result (`handlers.mjs:46`, `res`, not the collapsed body), so an exempt read costs at most the characters the first cut saved — what the model would have read without trimhook — and D6 counts every such read against the cap. Erring broad is the safe side: an over-wide Bash match costs only tokens (rule 1, nothing here protects); a miss breaks rule 3.
- **Rejected alternatives:**
  - Let the cut stand and have the marker say how to page (the other option in TH-26) — each large page is cut again and writes a copy of a copy, rule 3 then rests on the model obeying a marker, and a reworded marker drifts from `MARKER_RE` (`trim.mjs:17`) that every eval matches.
  - Exempt `Read` only — leaves the `cat`/`sed`/`grep` half cut, as seen in the transcripts.
  - Exempt a Bash command only when a spill path is its sole argument — misses `sed -n 1400,1600p <path>` and `grep -n x <path>`, the natural ways to read a middle.
  - A higher cap for spill reads — a knob on rule 3 that D4 would have to deny, with no number to choose it from.
- **Reversible?** yes — one predicate before the cut; narrowing it later changes only what a spill read costs.
- **Weak spot:** a spill path written through a symlink (`/tmp` for `/private/tmp` on macOS) or as `$HOME/…` is not recognised and is cut as today — `realpath` per result was judged not worth a filesystem call for paths the model copies from the marker; D6's rule (a) still counts it as a read.

---

## Impact

| Area | Impact | Mitigation |
|---|---|---|
| DB schema | none — the JSONL log keeps `outcome: 'kept'` and gains the flags `error` and `spillRead` beside the shipped `spillFailed` (D7, D9) | `summarize` (`report.mjs:4-27`) already treats `kept` as no saving; add the counts |
| Public API | **breaking for repository files that set `mode`, `spill`, `spillTtlDays` or `codex.replace`**, accepted in 0.1.0 and now dropped (D4); `doctor` reports each as BAD; a read of a spill file is no longer cut (D9); `report --cap N`, `codex.mode` added | 0.2.0, a `### Changed` entry under `[Unreleased]` naming the keys and the `doctor` line; the layer above applies, so nothing fails |
| Performance | one prefix test per result (D9); an exempt spill read costs at most the original result's size, counted by D6 | 150,000 characters cost p50 75-83 ms / max 156 ms at `fb4f5b6` against a 5 s timeout (D8) |
| Security | D4 closes the checkout → `spill: false` path; spill files remain 0600 (`store.mjs:51-54`); D9 shows the model whole a file it asked for, nothing more | `doctor` BAD on a rejected repository key |
| Data migration | none — `spillFailed` kept as shipped | — |
| Backward compat | `TRIMHOOK_CONFIG` documented as replacing the repository layer — behaviour unchanged, docs changed; the D4 break above | CHANGELOG `### Changed` |

---

## What we are NOT doing

- Registering `PostToolUseFailure` (D2) — it carries no output; on Claude Code failing tools never reach trimhook, and on Codex there is no exit code to branch on.
- Defaulting `codex.replace` on with `decision: block` (D5) — the harness labels it "Script failed"; only `continue: false` may earn the default.
- A tighten-only repository rule (D4) — trimhook saves, it does not gate.
- Fixing the `room >= 200` overshoot to the character (D8) — bound stated and tested instead.
- Counting re-reads from inside the hook as the instrument (D6) — the log cannot tie a read to its cut; `spillRead` is a cross-check.
- Format-aware cuts, `PreToolUse`, telemetry, tools beyond `Bash|Read|WebFetch` (`Agent`'s result is a list of blocks, `BACKLOG.md` TH-12) — the brief's out-of-scope list, less the tools TH-12 shipped.
- Protecting a live session's spill file beyond the 7-day TTL (Q3) — no session lasts that long; deferred until one does.

---

## More research needed

Facts the design assumes but `01-research.md` did not verify:

None open. The five items raised on 2026-09-23 were settled by the `01-research.md` Addendum, items 1-5 (they fed D2, D6, D5, D8 and D8), and item 5's timing was re-measured on 2026-09-28 for D8.

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
| D1 decide first, spill second, failed spill vetoes | implemented (TH-24, `f58f56d`) | `bin/lib/handlers.mjs:23,31,46-49`; `bin/lib/store.mjs:42-57` (`spillPath`, `writeSpill`); `test/handlers.test.mjs:176-196` | nothing — the log keeps `outcome: 'kept', spillFailed: true` (D7) |
| D2 size only, no `PostToolUseFailure`, README says the truth | partial | one event registered (`hooks/hooks.json`, `bin/trimhook.mjs:57-62`); `readResponse` has no `interrupted: true` check (`bin/lib/harness.mjs:54`); `README.md:42` still says "on any error: no output" | the `interrupted` check and its test; the README text, now covering Read and WebFetch |
| D3 default 8,000, week at 4,000, written rule, `report --cap N` | partial | `bin/lib/config.mjs:12`; 0.1.0 shipped at 8,000 before TH-10 (`83a9b1c`); no rule in the README; no `--cap` on `report` (only `evals/local.mjs:37`) | the README rule, per tool with the 20-cut floor; `report --cap N`; the subset at 9,500 post-collapse (D6 (c)) |
| D4 per-layer allow-list for the repository layer | not implemented | one flat merge, `RULES` over the result (`bin/lib/config.mjs:96-118`) | all of it, per the key table in D4; the CHANGELOG `### Changed` entry |
| D5 Codex `continue: false`, `codex.mode`, TH-9 protocol | not implemented | `bin/lib/harness.mjs:70-76` still sends `decision: 'block'`; no `codex.mode`; no `evals/codex-live.md`; TH-9 open | all of it |
| D6 re-read scan sharing the marker | partial, different in form (TH-22, `e3617bb`) | `evals/reads.mjs`, `MARKER_RE` at `bin/lib/trim.mjs:17` | the delta (a)-(f) in D6 on `evals/reads.mjs`, window kept at 12 |
| D7 failure records; prune on every call | partial | stderr line kept (`bin/trimhook.mjs:47`); `report.mjs:10-12` and `doctor.mjs` count no failures; the prune runs only on a cut, 1 in 20 (`bin/lib/handlers.mjs:36-40`) | the `error` record from the catch; `report`/`doctor` counting `spillFailed`, `error`, `spillRead`; no prune change |
| D8 numbers, `doctor` on `bashOutputMaxChars`, `check` negative grep | not implemented | `doctor.mjs:35-36` reads only `BASH_MAX_OUTPUT_LENGTH`; `check` has no grep; strays at `.github/workflows/backlog-issues.yml:6` (`HG-n`) and `release.yml:150` ("trims Bash output", stale since TH-12) | all of it, the grep re-scoped (comment 2) |
| D9 spill reads exempt from the cut | not implemented (TH-26 open) | `todo` test at `test/handlers.test.mjs:211-221`; no spill-path check in `bin/lib/handlers.mjs:14-16` | all of it |

### Comments

| # | Comment | From | Status | Resolution |
|---|---|---|---|---|
| 1 | **Blocking.** D4 allows `cap`, `perCommand`, `minSaving`, `head` and drops every other key; TH-16 and TH-12 added `collapse.enabled`, `collapse.minRun`, `collapse.strict`, `tools` (`bin/lib/config.mjs:33,42`), so a repository file would silently lose them. `collapse.strict: false` folds content in 38 of 40 sampled runs, so it is not a pure saving knob. Classify each key with a reason — e.g. `collapse.enabled`, `collapse.minRun`, `tools` narrow-only; `collapse.strict` denied. | review 2026-09-28 | resolved | D4: key table — saving knobs either way; `collapse.enabled`, `collapse.minRun`, `tools` narrow-only; `collapse.strict`, `mode`, `spill*`, `codex.*` denied. |
| 2 | **Blocking.** D8's negative grep for `hookgate\|HG-\d\|Noul\|TYPESAFE` over the docs fails at once on text meant to be there: `README.md:241` ("Why not a Noul"), `README.md:250-252` (the hookgate link), `CLAUDE.md:12,92`, `CHANGELOG.md:83,86`; `TYPESAFE` was removed in `83a9b1c`. Limit it to `.github/workflows/*.yml` and name the real strays (`backlog-issues.yml:6`, `release.yml:150`, whose wording must become Bash/Read/WebFetch). | review 2026-09-28 | resolved | D8: `hookgate\|\bHG-` over `.github/workflows/*.yml` only; strays `backlog-issues.yml:6,40`; `release.yml:150` reworded by hand. |
| 3 | **Blocking.** "What we are NOT doing" keeps "other tools" out of scope and D6 says "`Read` trimming is v0.2.0", but TH-12/TH-20 shipped it (matcher `Bash\|Read\|WebFetch`). Consequences: (a) a Read of a spill file is itself cut — **reproduced, filed as TH-26**; (b) the D3 rate pools Bash with Read and WebFetch without saying so; (c) no re-run definition for Read or WebFetch. Delete "other tools" from the list, state TH-12 as in scope, decide the spill exemption (TH-26), say pooled or per tool, define a re-run as the same `file_path` / `url`. | review 2026-09-28 | resolved | New D9 (spill reads exempt); D3 per tool; D6 (b) re-runs by `file_path`/`url`; Problem and What we are NOT doing put TH-12 in scope. |
| 4 | **Blocking.** D6 extends `evals/local.mjs` with a five-block window, any tool, and `~/.codex/sessions`; the instrument is already `evals/reads.mjs` (window 12, Read only, Claude only), and D3's "next five tool uses" disagrees with it. Rewrite D6 as the delta on `evals/reads.mjs`: one window for D3 and the script, with a reason; count `cat`/`sed` of spill paths or drop them from the rule; the Codex walk; the split at `before > 8000` via `MARKER_RE` group 2; the `(env)` bucket fixed. | review 2026-09-28 | resolved | D6 rewritten as the delta (a)-(f) on `evals/reads.mjs`, window 12 for D3 and the script; D3 split at 9,500 post-collapse. |
| 5 | Should-fix. D1 against D7: D7 logs `outcome: 'failed', reason: 'spill'`; what shipped is `outcome: 'kept', spillFailed: true` (`bin/lib/handlers.mjs:47`, `BACKLOG.md` TH-24). Mark D1 implemented; have D7 keep `spillFailed` or migrate it on purpose, with `report` reading the chosen one. | review 2026-09-28 | resolved | D1 marked implemented; D7 keeps `spillFailed` on `kept`, adds `error`, and `report`/`doctor` count both. |
| 6 | Should-fix. Problem ("0.1.0 is not a rewrite") and Impact ("pre-release, `0.0.1`, unpublished — no compatibility owed") are false: 0.1.0 was published on 2026-09-23. D4 rejecting repository keys breaks installed users' repo files. Retarget to the next minor, a CHANGELOG "Changed" entry, the Public API row "breaking for repository files that set X; `doctor` reports it". | review 2026-09-28 | resolved | Problem, D4 and Impact (Public API, Backward compat) retargeted to 0.2.0; the four 0.1.0 keys named; `### Changed` entry. |
| 7 | Should-fix. D2 says `readResponse` "still returns `null` on `interrupted: true`"; it never did (`bin/lib/harness.mjs:54`, and at `47a1b9f`). Say "gains a check"; the README sentence is at `README.md:42`. | review 2026-09-28 | resolved | D2: "gains a check" at `harness.mjs:54`; README sentence cited at `README.md:42`. |
| 8 | Should-fix. D7's reason "a session that never trims never prunes" no longer holds: since TH-24 a kept result writes nothing. The only remaining case is the pre-TH-24 orphans. Restate or drop the prune move, and keep the Performance row consistent. | review 2026-09-28 | resolved | D7: prune move dropped with the TH-24 reason; Performance row and What we are NOT doing updated. |
| 9 | Should-fix. D3's sweep numbers (759 of 28,219, 15.5%; 268, 6.4%) disagree with `evals/results/2026-09-23-local.json` (807 of 28,800, 16.3%; 289, 6.8%) and with `README.md:139-140` (802 of 28,545; 288). Cite one source with its date, and say the sweep is Bash-only while the week cuts three tools. | review 2026-09-28 | resolved | D3 cites the dated JSON only and says Bash-only; D8 re-reads the README table from it. |
| 10 | Nit. D8's "p50 70 ms, max 84 ms" predates the collapse pass (`bin/lib/handlers.mjs:28`). Re-time, or name the build measured. | review 2026-09-28 | resolved | D8, Impact and More research: re-timed at `fb4f5b6`, p50 75-83 ms, max 156 ms. |
| 11 | Nit. Line numbers moved: `config.mjs:77` → `:105`, `:73-75` → `:101-103`, `harness.mjs:33` → `:51`, `doctor.mjs:33-34` → `:35-36`, `local.mjs:126` → `:279`. | review 2026-09-28 | resolved | Updated in D3, D4, D5, D8, and the other references those decisions carry (D2, D6). |
| 12 | Nit. D5 does not name the tool the TH-9 run is judged on; Codex's hooks now match `Bash\|Read\|WebFetch` too. | review 2026-09-28 | resolved | D5: judged on Bash; other tool names recorded and held to the same rule before the flip. |

**Verdict:** the Design advances to Structure once comments 1-4 are applied, with D1
marked done and D6 rewritten as the delta on `evals/reads.mjs`. Next step: re-enter
Design scoped to these comments (qrspi `recovery.md`), then Structure.

**Re-entered 2026-09-28:** comments 1-12 resolved in a scoped Design session (D1-D8 revised in place with dated notes, D9 added); awaiting the maintainer's approval.

---

## Status

- [x] Design written
- [x] Anchored to research facts (every claim has a path)
- [x] Alternatives documented
- [x] Reviewed by the team (2026-09-28: judgement review in a fresh session against `main` at `f58f56d` — the Review section; the maintainer read its summary, not every line)
- [x] Comments resolved
- [x] Approved (2026-09-28: the maintainer asked to proceed to Structure and Plan with the defaults accepted)

> Next phase: **Structure**. It receives: this file only.
