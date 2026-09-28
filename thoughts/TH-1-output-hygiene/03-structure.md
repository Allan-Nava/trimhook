# 03 · Structure — TH-1 Tool output trimmed at the source


---

## Reference

Design: [`02-design.md`](./02-design.md) — approved 2026-09-28, decisions D1-D9. D1 is
shipped (TH-24, `f58f56d`) and has no step here.

Baseline, measured 2026-09-28 on branch `th-1-spec` (`3df5599`), Node 23.3.0: `npm test`
exits 0; `node --test` reports 41 tests, 40 pass, 0 fail, 1 todo (the TH-26 reproduction
at `test/handlers.test.mjs:211-221`); `npm run backlog` prints `ok — ROADMAP.md is in
step with BACKLOG.md`.

---

## Steps

Rules every step below obeys, so they are not repeated per step:

- **Green gate (G).** A step is done only when, on its branch,
  `npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '`
  exits 0 and prints `# fail 0` and `# todo 0` (`# todo 1` only on a branch cut before
  S1 merged). The step's own **Verify** commands come on top of G.
- **Backlog gate (B).** A step that edits `BACKLOG.md` regenerates `ROADMAP.md` with
  `node scripts/backlog.mjs roadmap` in the same commit, and `npm run backlog` must print
  `ok — ROADMAP.md is in step with BACKLOG.md`. `ROADMAP.md` is never merged by hand:
  after a rebase it is regenerated.
- **Docs travel with the behaviour.** Each step lists what it carries under **Docs**; the
  `CHANGELOG.md` entry goes under `## [Unreleased]` (`CHANGELOG.md:6`), in the existing
  `### Added` (`:8`), `### Fixed` (`:31`) or `### Changed` (`:65`) subsection, and names
  its `TH-n` (TH-1 when the Design has no narrower id).
- **Where new tests go.** A new test is placed directly after the existing test for the
  same module, never appended at the end of a file, so that parallel branches touch
  disjoint hunks. Anchors: `test/misc.test.mjs` config `:16-33`, `readResponse` `:44-63`,
  `replacementOutput` `:65-79`, report `:92-103`, doctor `:105-125`, e2e `:127-145`;
  `test/handlers.test.mjs` Codex `:65-80`, TH-26 `:211-221`.
- **Test titles carry the substring the Verify command filters on** (given per step), so
  `--test-name-pattern` selects exactly the new tests.
- `R=$(git rev-parse --show-toplevel)` and `d=$(mktemp -d)` are assumed in the CLI
  commands below; run them from the worktree root.

### S1 · A read of a spill file comes back whole (TH-26)

- **Implements:** D9 (and the `spillRead` flag of D7).
- **Who:** agent.
- **Goal:** a `Read` under `<dataDir>/spill/`, or a `Bash` command naming that directory
  (absolute, or `~/…` when the data dir is under home), returns `null` and logs
  `outcome: 'kept', after: before, spillRead: true`; `WebFetch` is never exempt.
- **Touches:** `bin/lib/store.mjs` (one exported "is under `<data>/spill/`" predicate
  beside `spillPath`, `:42-44`); `bin/lib/handlers.mjs` (the check after `readResponse`,
  `:15-16`, before `before`/the collapse at `:24-28`); `test/handlers.test.mjs` (the
  `todo` at `:211-221` becomes an ordinary test, plus new tests after it).
- **Depends on:** — (none).
- **Parallel:** group P1.
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='TH-26' test/handlers.test.mjs 2>&1 | grep -E '^# (pass|fail|todo) '`
    prints `# pass 4` or more, `# fail 0`, `# todo 0` — the retitled Read-of-spill test
    (which also asserts the `spillRead: true` log record), a Bash `sed -n` of a spill
    path, a Bash command using the `~/` form, and a `Read` outside `spill/` that is
    still cut.
  - `grep -n 'todo:' test/handlers.test.mjs` prints nothing.
  - `grep -n 'TH-26' CHANGELOG.md` prints a line inside `## [Unreleased]`.
  - G and B.
- **Docs:** `README.md:30-33` (the spill bullet: a read of that file comes back whole);
  `CLAUDE.md:56-59` (rule 3 gains the exemption in one clause); `CHANGELOG.md`
  `### Fixed`; `BACKLOG.md:124-135` TH-26 ticked `[x]` with `ver=main`, its text naming
  the fix D9 chose (not "a Bash command whose only argument is one").
- **Repo state after:** working; spill reads pass through whole on both harnesses.

### S2 · An interrupted Bash result falls through; the README says what failures do

- **Implements:** D2.
- **Who:** agent.
- **Goal:** `readResponse` returns `null` for a Bash response with `interrupted: true`;
  the README replaces "or on any error: no output" with the per-harness fact for all
  three tools; no hook entry changes.
- **Touches:** `bin/lib/harness.mjs:53-54` (the Bash branch); `test/misc.test.mjs`
  (after the `readResponse` test at `:44-52`).
- **Depends on:** — (none).
- **Parallel:** group P1.
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='interrupted' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 1` or more and `# fail 0`.
  - `grep -c 'or on any error: no output' README.md` prints `0`.
  - `grep -c 'PostToolUseFailure' README.md CLAUDE.md` prints a count of at least 1 for
    each file.
  - `git diff --quiet main -- hooks codex && echo unchanged` prints `unchanged`, and
    `node bin/trimhook.mjs check` prints `ok — one hook, two harnesses, …`.
  - G.
- **Docs:** `README.md:42` (the Effect column) plus one paragraph after `:50-51` —
  Claude Code: a failing tool fires `PostToolUseFailure` with no `tool_response`, so
  trimhook never sees it; Codex: `PostToolUse` runs after non-zero exits and trims by
  size with the stderr floor; `CLAUDE.md:75-82` (Claude Code facts: the
  `PostToolUseFailure` fact, dated); `CHANGELOG.md` `### Changed`.
- **Repo state after:** working; behaviour change is one `null` on a key the corpus shows
  0 times.

### S3 · `check` forbids sibling strings in the workflows; the strays are fixed

- **Implements:** D8 (the negative grep and the `release.yml` wording).
- **Who:** agent.
- **Goal:** `check` fails on `hookgate|\bHG-` in `.github/workflows/*.yml` only; the two
  `HG-n` strays become `TH-n`; `release.yml:150` says "trims Bash, Read and WebFetch
  output".
- **Touches:** `bin/trimhook.mjs` (`check()`, `:74-114` — a new block beside the file
  checks at `:90-108`); `.github/workflows/backlog-issues.yml:6,40`;
  `.github/workflows/release.yml:150`.
- **Depends on:** — (none).
- **Parallel:** group P1.
- **Verify:**
  - `grep -nE 'hookgate|\bHG-' .github/workflows/*.yml` prints nothing.
  - `grep -c 'trims Bash, Read and WebFetch output' .github/workflows/release.yml`
    prints `1`.
  - `node bin/trimhook.mjs check` prints `ok — …`.
  - The check bites: `cp -R "$R" "$d/r" && printf '# HG-1\n' >> "$d/r/.github/workflows/ci.yml" && node "$d/r/bin/trimhook.mjs" check; echo "exit $?"`
    prints a `✗` line naming `ci.yml` and `exit 1`.
  - G.
- **Docs:** `CHANGELOG.md` `### Fixed` (the stray strings and the stale release text);
  `CLAUDE.md:95-102` ("Verifying a change": one line saying `check` greps the
  workflows).
- **Repo state after:** working; CI text no longer names the sibling.

### S4 · `evals/reads.mjs` counts re-reads for three tools and both harnesses

- **Implements:** D6 (a)-(f).
- **Who:** agent.
- **Goal:** the delta (a)-(f) on `evals/reads.mjs`, window kept at 12 (`:38-40`), output
  and `--json` gaining `byTool` and the 9,500 subset counts.
- **Touches:** `evals/reads.mjs` (`scan()` `:62-98` records `url`, every marker, each
  marker's group 2; the counting loop `:108-132`; the output `:138-163`; a Codex walk as
  `evals/local.mjs:241-262` does); `test/reads.test.mjs` (new — builds a fixture home
  with `.claude/projects/<p>/<s>.jsonl` and `.codex/sessions/<y>/<s>.jsonl` in a temp
  dir, spawns the script with `HOME` set to it, asserts on stdout; never passes `--json`).
- **Depends on:** — (none; `MARKER_RE` at `bin/lib/trim.mjs:17` is unchanged by every
  step).
- **Parallel:** group P1.
- **Verify:**
  - `node --test --test-reporter=tap test/reads.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 6` or more (one per delta item (a)-(f)) and `# fail 0`.
  - `HOME=$d node evals/reads.mjs; echo "exit $?"` prints the `No cut found` line and
    `exit 0` (no `.claude` and no `.codex` directory is not an error).
  - `HOME=$d node evals/reads.mjs --window 12 | head -1` prints
    `## What the model did after a cut (TH-10, window 12)`.
  - `git status --porcelain evals/results` prints nothing after the test run.
  - G.
- **Docs:** the header comment `evals/reads.mjs:1-23` (the two signs, now per tool, and
  the Codex walk); `CONTRIBUTING.md:25-29` (item 2, "Live": the spill-read count is
  `node evals/reads.mjs`, not a manual grep); `CHANGELOG.md` — extend the TH-22 bullet
  under `### Added` (`:14-17`) or add a `### Changed` line.
- **Repo state after:** working; the TH-10 instrument is ready.

### S5 · The TH-9 protocol as a file

- **Implements:** D5 (the protocol and its pass rule, not the code).
- **Who:** agent.
- **Goal:** `evals/codex-live.md` states the TH-9 run step by step — scratch repo,
  `trimhook print-hooks`, `TRIMHOOK_USER_CONFIG`, `codex exec`, `seq 1 6000` — three
  runs per `codex.mode`, judged on `Bash`, every other `tool_name` seen recorded and held
  to the same rule; the pass rule verbatim from D5; an empty `## Runs` table with its
  columns (date, Codex version, mode, tool names seen, error prefix, router `error=`,
  head and tail quoted, re-run); a `**Verdict:**` line to fill.
- **Touches:** `evals/codex-live.md` (new).
- **Depends on:** — (none; the file names `codex.mode`, which S8 adds, and says so).
- **Parallel:** group P1.
- **Verify:**
  - `grep -cE 'custom_tool_call_output|Script failed|Script error|error=' evals/codex-live.md`
    prints 4 or more.
  - `grep -c '3 of 3' evals/codex-live.md` prints 1 or more; `grep -c '^## Runs' evals/codex-live.md` prints `1`.
  - `npm pack --dry-run 2>&1 | grep -c codex-live` prints `0` (evals are not shipped).
  - G and B.
- **Docs:** `BACKLOG.md:70-73` TH-9 text points at `evals/codex-live.md` (not ticked).
- **Repo state after:** working; nothing executable changed.

### S6 · Failures leave a record, and `report` and `doctor` count them

- **Implements:** D7.
- **Who:** agent.
- **Goal:** the entry point's catch appends `{outcome: 'kept', error: <e.code or e.name>}`
  best-effort, keeps its stderr line and exits 0; `summarize` counts `spillFailed`,
  `error`, `spillRead` and `render` prints the counts when non-zero; `doctor` warns when
  the log holds any `spillFailed` or `error` record. The prune stays at
  `bin/lib/handlers.mjs:40`.
- **Touches:** `bin/trimhook.mjs` (`handler()`, the catch at `:46-48`);
  `bin/lib/report.mjs:4-41`; `bin/lib/doctor.mjs` (a warning after `:37`, reading the log
  through `readRecords` in `bin/lib/store.mjs`); `test/misc.test.mjs` (after the report
  test `:92-103`, the doctor test `:105-125`, the e2e test `:127-145`).
- **Depends on:** — (none; counting `spillRead` works on synthetic records whether or not
  S1 has merged).
- **Parallel:** group P1.
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='thrown error|flag counts|doctor warns' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 3` or more and `# fail 0`.
  - End to end (a non-string `cwd` makes `loadConfig` throw inside the handler):
    `printf '{"tool_name":"Bash","cwd":5,"tool_input":{"command":"x"},"tool_response":{"stdout":"x","stderr":""}}' | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json CLAUDE_PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use; echo "exit $?"; cat $d/results.jsonl`
    prints `trimhook: failed open: …` on stderr, `exit 0`, and one JSON line with
    `"outcome":"kept"` and `"error":"ERR_INVALID_ARG_TYPE"` and no `message` key.
  - Then `TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json node bin/trimhook.mjs doctor | grep -c '^  warn'`
    prints 1 or more, and `TRIMHOOK_DATA=$d node bin/trimhook.mjs report` prints a line
    counting one error.
  - G.
- **Docs:** `README.md:35-36` (the "Measures" bullet: flags on `kept`) and
  `README.md:57-63` (what the log holds); `CHANGELOG.md` `### Added`.
- **Repo state after:** working; a broken install is visible in `report` and `doctor`.

### S7 · Per-layer key classes for the repository file

- **Implements:** D4.
- **Who:** agent.
- **Goal:** `loadConfig` classifies every `RULES` key for the repository layer (the `cwd`
  candidates at `bin/lib/config.mjs:105` and `TRIMHOOK_CONFIG` at `:101-103`) per D4's
  table — either direction, narrow only, denied — before the merge, against the layer
  above; a rejected key keeps the upper value and adds a `problems` entry in D4's two
  wordings; user file and environment keep the full set.
- **Touches:** `bin/lib/config.mjs` (header comment `:1-5`; a class table beside `RULES`
  `:74-87`; `loadConfig` `:96-118`); `test/misc.test.mjs` (after the config test
  `:16-33`). `test/handlers.test.mjs:53-63` (a repository `perCommand`) must stay green
  unchanged.
- **Depends on:** — (none).
- **Parallel:** group P1.
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='repository layer' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 4` or more (either-direction keys; narrow-only `collapse.*` and
    `tools`; denied `mode`, `spill`, `spillTtlDays`, `codex.replace`, `collapse.strict`;
    `TRIMHOOK_CONFIG` classed as the repository layer) and `# fail 0`.
  - `printf '{"spill":false,"cap":4000,"tools":["Bash","Agent"]}' > "$d/.trimhook.json" && (cd "$d" && TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" node "$R/bin/trimhook.mjs" doctor); echo "exit $?"`
    prints a `BAD   config: …/.trimhook.json: spill may only be set in ~/.trimhook.json or the environment`
    line, a `BAD` line for `tools` with `may only narrow`, the settings line with
    `cap 4000` and `spill true`, and `exit 1`.
  - `grep -c 'spillTtlDays' CHANGELOG.md` rises by one, the new line inside `### Changed`
    under `## [Unreleased]` naming `mode`, `spill`, `spillTtlDays`, `codex.replace` and
    the `doctor` line.
  - G and B.
- **Docs:** `README.md:88-92` (the chain: `TRIMHOOK_CONFIG` *replaces* the repository
  layer) plus the key-class table after `:111`; `BACKLOG.md:54-56` TH-4 wording (stays
  ticked); `CHANGELOG.md` `### Changed`, marked breaking for 0.1.0 repository files.
- **Repo state after:** working; breaking for repository files that set the four keys,
  as the Design accepts.

### S8 · Codex `continue: false` shape behind `codex.mode`

- **Implements:** D5 (the code).
- **Who:** agent.
- **Goal:** `codex.mode: 'continue' | 'block'`, default `continue`, validated in `RULES`
  and denied to the repository layer; `replacementOutput` gains the `{continue: false,
  stopReason}` shape with the text laid out as trimmed stdout, then `[stderr]` if any,
  then the note as the last line; `block` kept behind the mode; `codex.replace` stays
  `false`; the captured Codex input from the Research Addendum item 3 becomes a fixture
  for `readResponse`'s string branch (`bin/lib/harness.mjs:51`).
- **Touches:** `bin/lib/config.mjs` (`DEFAULTS.codex` `:18`, `RULES` `:82`, the class
  table from S7); `bin/lib/harness.mjs:69-76`; `bin/lib/handlers.mjs:56` (passes the
  mode); `bin/lib/doctor.mjs:30` (prints `codex.mode`); `test/handlers.test.mjs:65-80`
  (the Codex test, now both shapes); `test/misc.test.mjs` (after the replacement test
  `:65-79`: the fixture read, and the repository-layer denial of `codex.mode`);
  `test/fixtures/codex-post-tool-use.json` (new).
- **Depends on:** S7 (`config.mjs`, class table), S2 (`harness.mjs`, README `:42`), S6
  (`doctor.mjs`), S5 (the protocol it will be run with).
- **Parallel:** group P2.
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='Codex' test/handlers.test.mjs test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 3` or more and `# fail 0`.
  - `printf '{"codex":{"replace":true}}' > $d/u.json && node -e 'process.stdout.write(JSON.stringify({hook_event_name:"PostToolUse",session_id:"s",turn_id:"t",tool_use_id:"c1",tool_name:"Bash",tool_input:{command:"seq 1 6000"},tool_response:Array.from({length:6000},(_,i)=>i+1).join("\n")}))' | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(o.continue,typeof o.stopReason,"decision" in o,o.stopReason.trim().split("\n").at(-1).startsWith("trimhook:"))'`
    prints `false string false true`; the same with `{"codex":{"replace":true,"mode":"block"}}`
    in `u.json` and `o.decision` printed instead prints `block`.
  - With no user config the same pipe prints nothing (replacement still opt-in), and
    `RUNNER_TEMP=$d bash -e -c "$(sed -n '33,42p' .github/workflows/ci.yml | sed 's/^          //')"; echo "exit $?"`
    prints `exit 0`.
  - `printf '{"codex":{"mode":"block"}}' > "$d/.trimhook.json" && (cd "$d" && TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" node "$R/bin/trimhook.mjs" doctor) | grep -c 'codex.mode may only be set'`
    prints `1`.
  - `grep -c 'max_output_tokens' README.md` prints 1 or more.
  - G.
- **Docs:** `README.md:42` (the Codex shape: `continue: false` by default when opted in,
  `block` behind `codex.mode`), `README.md:75-82` (Codex install: `max_output_tokens`
  truncates before the hook), `README.md:103` (the config block gains `"mode":
  "continue"`); `CLAUDE.md:84-94` (Codex facts: `block` reaches the model as "Script
  failed …", dated); `CHANGELOG.md` `### Added` (`codex.mode`).
- **Repo state after:** working; Codex behaviour unchanged for anyone with
  `codex.replace` off, which is the default.

### S9 · `report --cap N`, the written cap rule, one source for the sweep

- **Implements:** D3, and D8's cap-table and benchmark-caveat clauses.
- **Who:** agent.
- **Goal:** `trimhook report --cap N` recomputes the logged week's saving at cap N from
  the logged `before` sizes with `trimResult` on a synthetic body, as
  `evals/local.mjs:279` does; the D3 rule is written into the README before the week
  (per tool, 20-cut floor, 10% over all cuts and over the 9,500 subset, the 4,000 → 8,000
  → 12,000 ladder, the pooled rate reported and not voting, the upper-bound weak spot);
  the cap table is re-read from `evals/results/2026-09-23-local.json`; `check` requires
  the rule's statement.
- **Touches:** `bin/lib/report.mjs` (the recomputation beside `summarize`);
  `bin/trimhook.mjs` (help line `:7`, the `report` case `:134-139`, one README regex in
  `check()` `:96-101`); `test/misc.test.mjs` (after the report test `:92-103`).
- **Depends on:** S6 (`report.mjs`, and the `report` path in `bin/trimhook.mjs`), S4 (the
  rule cites `reads.mjs`'s window, `byTool` and subset as S4 defines them).
- **Parallel:** group P2.
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='another cap' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 1` or more and `# fail 0`.
  - `printf '%s\n' '{"outcome":"trimmed","tool":"Bash","command":"cat","before":30000,"after":8000,"cap":8000}' '{"outcome":"kept","tool":"Read","command":"Read","before":6000,"after":6000,"cap":8000}' > $d/results.jsonl && TRIMHOOK_DATA=$d node bin/trimhook.mjs report --cap 4000`
    prints a line for cap 4,000 counting 2 results cut; `TRIMHOOK_DATA=$d node bin/trimhook.mjs report`
    without `--cap` prints the same text it printed before this step.
  - `grep -c '802 of 28,545' README.md` prints `0`; `grep -c '807 of 28,800' README.md`
    prints `1`; `grep -c '9,500' README.md` prints 1 or more.
  - The check bites: `cp -R "$R" "$d/r" && perl -i -ne 'print unless /9,500/' "$d/r/README.md" && node "$d/r/bin/trimhook.mjs" check; echo "exit $?"`
    prints a `✗ README.md must state …` line and `exit 1`.
  - G and B.
- **Docs:** `README.md:130-151` ("What the transcripts say": the table and its header
  numbers from the committed JSON, the synthetic-body caveat, and the rule as a new
  paragraph or subsection); `CONTRIBUTING.md:25-29` (the week runs with
  `~/.trimhook.json` `cap: 4000` and the three tools); `BACKLOG.md:74-77` TH-10 text (the
  rule and the two instruments; not ticked); `CHANGELOG.md` `### Added`
  (`report --cap N`).
- **Repo state after:** working; everything the week needs is in (with S1, S4, S6, S7).

### S10 · The README states the numbers and bounds; `check` guards them

- **Implements:** D8 (the README statements and their `check` guard).
- **Who:** agent.
- **Goal:** the README states the stderr floor (20%, `bin/lib/trim.mjs:48`), the
  `minSaving` semantics (overflow above the cap, `trim.mjs:56`), the snap slack (up to
  200 per cut, `trim.mjs:21-28`), the two-marker two-stream cut and its bound (`room >=
  200`, `trim.mjs:34`), and the 5 s hook timeout with the 2026-09-28 timing (p50 75-83 ms,
  max 156 ms at `fb4f5b6`); `check` requires each; a test pins the bound.
- **Touches:** `bin/trimhook.mjs` (`check()` README block `:96-101`);
  `test/trim.test.mjs` (after the split test `:31-40`: a tiny stderr share exceeds its
  slice by at most 200 plus the marker length).
- **Depends on:** S3 and S9 (both edit `check()`).
- **Parallel:** group P3 (alone).
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='at most 200' test/trim.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 1` and `# fail 0`.
  - `grep -c '156 ms' README.md` prints 1 or more; `grep -cE 'stderr.*20%|20%.*stderr' README.md`
    prints 1 or more.
  - The check bites, once per statement: `cp -R "$R" "$d/r" && perl -i -ne 'print unless /156 ms/' "$d/r/README.md" && node "$d/r/bin/trimhook.mjs" check; echo "exit $?"`
    prints a `✗` line and `exit 1` (repeat with a fresh `$d` for each guarded statement).
  - G.
- **Docs:** `README.md:44-52` ("What it does, exactly": the floor, `minSaving`, the
  two-marker bound, the timeout and timing); `CLAUDE.md:95-102` (what `check` enforces);
  `CHANGELOG.md` `### Changed` (docs).
- **Repo state after:** working; no runtime change.

### S11 · `doctor` reads `bashOutputMaxChars` and says its verdict is from the environment

- **Implements:** D8 (the `doctor` clauses and the harness-cap sentence).
- **Who:** agent.
- **Goal:** `doctor` reads top-level `bashOutputMaxChars` from the four settings files in
  precedence order (managed, `.claude/settings.local.json`, `.claude/settings.json`,
  `~/.claude/settings.json`) best-effort, compares the cap against it when set (clamped
  4,000-128,000; `BASH_MAX_OUTPUT_LENGTH` ignored then) and the env var otherwise, warns
  when the effective harness cap is below ours, and prints that the harness verdict is
  from the environment only; the README gains the persisted-output sentence and the
  `--settings` gap; `check` requires `bashOutputMaxChars` beside `BASH_MAX_OUTPUT_LENGTH`.
- **Touches:** `bin/lib/doctor.mjs:16-17,34-36`; `bin/trimhook.mjs` (`check()` `:100`);
  `test/misc.test.mjs` (after the doctor test `:105-125`).
- **Depends on:** S6 and S8 (both edit `doctor.mjs`), S10 (`check()` README block).
- **Parallel:** group P4 (alone).
- **Verify:**
  - `node --test --test-reporter=tap --test-name-pattern='bashOutputMaxChars' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '`
    prints `# pass 2` or more (settings value wins over the env var; warning below the
    cap) and `# fail 0`; neither test reads the real `~/.claude` or the managed file.
  - `mkdir -p "$d/.claude" "$d/home" && printf '{"bashOutputMaxChars":5000}' > "$d/.claude/settings.json" && (cd "$d" && HOME="$d/home" TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" BASH_MAX_OUTPUT_LENGTH=100000 node "$R/bin/trimhook.mjs" doctor)`
    prints a `warn` line naming `bashOutputMaxChars` 5,000 and `.claude/settings.json`,
    no warning about `BASH_MAX_OUTPUT_LENGTH`, and a line saying the harness verdict is
    from the environment only.
  - G.
- **Docs:** `README.md:22-23` (precedence, clamp, the persisted-output sentence, the
  `--settings` gap) and `README.md:84-86` (what `doctor` checks); `CLAUDE.md:62-64`
  (rule 5) and `:82` (the fact, dated); `CHANGELOG.md` `### Changed`.
- **Repo state after:** working.

### S12 · TH-9: the Codex run, live — human

- **Implements:** D5 (the observation).
- **Who:** **human with a live harness** — Codex CLI 0.155 or later, a scratch repository,
  a model session. An agent cannot stand in: the verdict is what the model did.
- **Goal:** run `evals/codex-live.md` three times with `codex.mode: continue` (and, for
  the comparison the README will cite, with `block`), record each run and the verdict.
- **Touches:** `evals/codex-live.md` (`## Runs` rows and the `**Verdict:**` line);
  `thoughts/TH-1-output-hygiene/99-progress.md` (one dated line pointing at it).
- **Depends on:** S8 (the shape exists), S5 (the protocol).
- **Parallel:** may run while S9-S11 and S14 are in progress: it edits one file no agent
  step touches after S5.
- **Verify (a written observation):**
  - `grep -cE '^\| 2026-[0-9-]+ \|.*\| continue \|' evals/codex-live.md` prints 3 or more.
  - `grep -nE '^\*\*Verdict:\*\* (pass|fail)' evals/codex-live.md` prints one line with
    the date and the Codex version; every `tool_name` other than `Bash` seen in the runs
    has its own row.
  - G.
- **Repo state after:** working; nothing executable changed.

### S13 · Apply the TH-9 verdict

- **Implements:** D5 (the default).
- **Who:** agent, reading the verdict S12 recorded.
- **Goal:** on **pass**, `codex.replace` defaults `true` with `mode: continue` and the CI
  Codex check expects the `continue: false` shape; on **fail**, the default stays `false`
  and the README says both shapes were tried and what each did, dated. TH-9 is done
  either way.
- **Touches:** on pass — `bin/lib/config.mjs:18`; `test/handlers.test.mjs:65-80`;
  `.github/workflows/ci.yml:31,42` (the comment and the Codex expectation);
  `bin/lib/doctor.mjs:37` (the warning's wording). On fail — no code.
- **Depends on:** S12. Serialised with S15 (`config.mjs`, `ci.yml`, README).
- **Parallel:** group P5 (after S12).
- **Verify:**
  - Pass: the S8 pipe with **no** user config prints `false string false true`, and
    `RUNNER_TEMP=$d bash -e -c "$(sed -n '33,42p' .github/workflows/ci.yml | sed 's/^          //')"; echo "exit $?"`
    prints `exit 0` (re-read the line range first if the block moved).
  - Fail: `node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.codex.replace))'`
    prints `false`, and `grep -c 'continue: false' README.md` prints 1 or more on a dated
    line.
  - Both: G and B.
- **Docs:** `README.md:42` and the Codex paragraphs; `CLAUDE.md:70-71` (rule 8 rewritten
  on pass, dated on fail); `CHANGELOG.md` `### Changed`; `BACKLOG.md:70-73` TH-9 ticked
  `[x]` with `ver=main`.
- **Repo state after:** working; the Codex default matches the observation.

### S14 · TH-10: the live week at cap 4,000 — human

- **Implements:** D3 and D6 (the measurement).
- **Who:** **human with a live harness** — the maintainer's own sessions for at least
  seven days, the checkout installed (`/plugin marketplace add .`), `~/.trimhook.json`
  holding `cap: 4000` and all three tools.
- **Goal:** a week of real cuts; at its end `node evals/reads.mjs --json`,
  `trimhook report`, `trimhook report --cap 8000`, `trimhook report --cap 12000`; the
  log's `spillRead` count checked against the scan's spill reads (the log's at least the
  scan's).
- **Touches:** `evals/results/<YYYY-MM-DD>-reads.json` (written by `--json`, committed
  after its command prefixes are checked for anything private); `BACKLOG.md:74-77` (a
  dated **State** line with the start date, the four outputs and the cross-check);
  `thoughts/TH-1-output-hygiene/99-progress.md` (one dated line).
- **Depends on:** S1, S4, S6, S7, S9 merged and installed before day one; S11
  recommended (`doctor` then catches a harness cap below 4,000).
- **Parallel:** runs alongside S10-S13; it writes only the files above.
- **Verify (a written observation):**
  - `ls evals/results/*-reads.json` lists a file dated at least seven days after the start
    date in the TH-10 State line.
  - `node -e 'const f=process.argv[1];const j=JSON.parse(require("fs").readFileSync(f,"utf8"));console.log(Object.keys(j.byTool))' evals/results/<YYYY-MM-DD>-reads.json`
    prints the tool buckets the rule is applied to.
  - G and B.
- **Repo state after:** working; the numbers the rule needs are on disk.

### S15 · Apply the D3 rule to the default cap

- **Implements:** D3 (the verdict).
- **Who:** agent, applying the README rule to S14's recorded numbers; the maintainer
  confirms the arithmetic before merge.
- **Goal:** the rule's answer — 4,000, 8,000 or 12,000 — in the code, the README, the
  config block and CI; both numbers into the README beside the transcript table (TH-10's
  done-when); a tool under 20 cuts reported as unmeasured.
- **Touches:** `bin/lib/config.mjs:12` (only if the answer is not 8,000);
  `.github/workflows/ci.yml:40` (the `s.length<=8000` bound, for 12,000); tests that
  assert `<= 8000` against the default (`test/handlers.test.mjs:206` and its kind) if the
  answer is 12,000.
- **Depends on:** S14. Serialised with S13.
- **Parallel:** group P5 (after S14, merged after or before S13, never together).
- **Verify:**
  - `node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.cap))'`
    prints the rule's answer, and `grep -c "\"cap\": $(node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.cap))')" README.md`
    prints `1` (the config block).
  - `RUNNER_TEMP=$d bash -e -c "$(sed -n '33,42p' .github/workflows/ci.yml | sed 's/^          //')"; echo "exit $?"`
    prints `exit 0`.
  - `grep -c 'TH-10' README.md` rises, the new lines carrying the week's dates.
  - G and B.
- **Docs:** `README.md:12-18` (status paragraph), `:97` (config block), `:130-151` (the
  week's numbers and which rung the rule chose, dated); `CLAUDE.md` rule 7 is satisfied,
  nothing to change; `CHANGELOG.md` `### Changed`; `BACKLOG.md:74-77` TH-10 ticked `[x]`
  with `ver=main`; `BACKLOG.md:37-46` TH-1 State line updated.
- **Repo state after:** working; the default cap is measured, not reasoned.

---

## Dependency graph

```
P1 (parallel)                P2 (parallel)     P3      P4       human / P5
S1  D9 spill read ──────────────────────────────────────────────┐
S2  D2 interrupted ──┐                                          │
S5  D5 protocol ─────┼──► S8 D5 code ──────────────────┬► S11 ──┤  S12 TH-9 run ──► S13 verdict
S6  D7 records ──────┼──┬─────────────────────────────┘ D8 doc  │        (needs S8, S5)   │
S7  D4 key classes ──┘  │                                        │                        │ serial
S4  D6 reads.mjs ───────┴► S9 D3 report --cap ──► S10 D8 README ─┘                        │
S3  D8 check grep ───────────────────────────────┘ (check())                              │
                                                                                          │
S1 + S4 + S6 + S7 + S9 ────────────────────────► S14 TH-10 week ──► S15 cap verdict ──────┘
```

Edges, exactly: S8 ← S2, S5, S6, S7 · S9 ← S4, S6 · S10 ← S3, S9 · S11 ← S6, S8, S10 ·
S12 ← S5, S8 · S13 ← S12 · S14 ← S1, S4, S6, S7, S9 · S15 ← S14 · S13 and S15 serialised.

**Parallelisable** (separate worktrees):

- **P1:** S1, S2, S3, S4, S5, S6, S7. Code and test files are disjoint, or disjoint hunks
  at the anchors named under "Where new tests go": `test/misc.test.mjs` is shared by S2
  (`:44-63`), S6 (`:92-145`) and S7 (`:16-33`); `bin/trimhook.mjs` by S3 (`check()`)
  and S6 (`handler()`).
- **P2:** S8 and S9. Shared only `test/misc.test.mjs` at `:65-79` and `:92-103`.
- **S12 and S14** run beside any agent step: they write records only.

**Must be serialised** (same function or range):

- `bin/lib/config.mjs`: S7 → S8 → S13 / S15 (`:12` and `:18` are six lines apart; one
  after the other).
- `bin/lib/doctor.mjs`: S6 → S8 → S11 (`:37`, `:30`, `:16-17,34-36`).
- `bin/lib/report.mjs`: S6 → S9.
- `bin/trimhook.mjs` `check()` README block: S3 → S9 → S10 → S11.
- `bin/lib/harness.mjs`: S2 (`:54`) → S8 (`:69-76`) — also README `:42`, the same table
  row.
- `.github/workflows/ci.yml` and README `:97`: S13 and S15.

**Shared prose, merge-serialised:** `CHANGELOG.md` `[Unreleased]`, `README.md`,
`CLAUDE.md`, `BACKLOG.md` and `ROADMAP.md` are touched by most steps. Parallel branches
merge one at a time in the order below; each later branch rebases on the merged one,
resolves the prose by keeping both entries, and regenerates `ROADMAP.md` (gate B) rather
than merging it.

---

## Recommended execution order

1. S1 ‖ S2 ‖ S3 ‖ S4 ‖ S5 ‖ S6 ‖ S7 — merge S1 first, then S2 (the two small,
   user-visible fixes), then S6, S7, S4, S3, S5.
2. S8 ‖ S9 — merge S9 first if the week is to start soon; S8 first if the Codex run is.
3. Start **S14** (human) as soon as S1, S4, S6, S7, S9 are merged and installed; start
   **S12** (human) as soon as S8 is merged. Both run in the background of 4-6.
4. S10.
5. S11.
6. S13 once S12 has a verdict; S15 once S14 has its numbers — one after the other.

---

## Per-step risks

| Step | Risk | Fallback |
|---|---|---|
| S1 | The `~/` form needs the home directory: a test that writes under the real home, or a predicate that calls `homedir()` itself, cannot be isolated. | The predicate takes the data dir and the home dir as inputs; the test passes a temp dir for both. |
| S1 | `tool_input.file_path` "resolved" — against what is not stated; a relative path would resolve against the hook's cwd, not the session's. | Resolve against `input.cwd`; a relative path the model copied from the marker cannot occur (the marker path is absolute), so a miss costs tokens only. |
| S4 | The Codex session record shape (`custom_tool_call`, `input`) is known only from the Addendum; a fixture built from memory can pass a scan that reads zero on real sessions. | Build the fixture from the shape `evals/local.mjs:257-259` already parses; run the script once on the real `~/.codex/sessions` and see a non-zero Codex cut count before merging. |
| S4 | The test spawns the script with `HOME` overridden; on Node 18 `os.homedir()` honours `HOME` on POSIX only. | CI runs on Ubuntu; note it in the test. |
| S6 | The error record's trigger in the e2e test (a non-string `cwd`) is incidental: a later validation of `cwd` would turn the test green for the wrong reason. | The test also asserts the stderr line, so a handler that no longer throws fails it. |
| S7 | "Narrow only" for `tools` compares against the layer above; with `TRIMHOOK_CONFIG` the layer above is the user file, not the candidates it replaces. | The class check runs on whichever file is the repository layer, against the merged defaults + user layer — one code path for both. |
| S8 | The fixture comes from `01-research.md` Addendum item 3, a real session: it may carry a path or a user name. | Rewrite paths and ids to neutral values before committing; the shape is what is tested. |
| S8 | `continue: false` may stop the Codex turn rather than replace the result; the code cannot know until S12. | Default stays opt-in (`codex.replace: false`); S13's fail branch is the outcome. |
| S9 | `report --cap N` works from the logged `before`, which is pre-collapse; where the collapse fired, the saving at N is overstated. | Say so in the README beside the rule; the rule itself votes on `reads.mjs`'s post-collapse sizes, not on `report`. |
| S10 | A `check` regex so loose it survives a reworded statement, or so tight it fails on an honest rewording. | One regex per statement on its number (`20%`, `156 ms`, `200`, `5 s`), each proved to bite by the `cp -R` / `perl` command. |
| S10, S8 | Largest steps; either may pass 40% context. | S10 splits into README text + check (S10a) and the bound test (S10b); S8 splits into shape + mode (S8a) and fixture + docs (S8b). |
| S11 | The managed-settings path is platform-specific and a test could read the real file. | The settings paths are an input with the real ones as default; tests pass temp paths only. |
| S12 | The model behaves differently on another day or version; three runs are a small sample. | Record the Codex version and model per row; the rule is 3 of 3, so one bad run fails it. |
| S14 | Fewer than 20 cuts for Read or WebFetch in a week leaves the tool unjudged. | The rule reports it as unmeasured and it does not vote (D3); extend the week rather than lower the floor. |
| S14 | The committed `reads.json` carries command prefixes from private work. | Inspect `byCommand` before committing; replace any private name with a neutral label and keep the counts. |
| S15 | A 12,000 answer breaks every test and CI bound that assumed the 8,000 default. | Listed under Touches; G and the CI block locally are the proof. |

**Under-specified in the Design, decided here or left to the Plan:**

1. **Which release carries S15.** D3 says `DEFAULTS.cap` stays 8,000 in 0.2.0, while
   `BACKLOG.md` TH-10 "gates the release" and the rule outputs a default. This Structure
   makes S15 independent of any tag; the maintainer decides whether 0.2.0 waits for it.
2. **Which README statements `check` enforces, and how.** D8 says "the new statements";
   the Structure assigns one regex per statement to the step that writes it (S9 the rule,
   S10 the floor, bound, timeout and timing, S11 `bashOutputMaxChars`); the exact
   patterns are the Plan's.
3. **How `evals/reads.mjs` is tested.** D6 gives no test; the Structure adds
   `test/reads.test.mjs` with a fixture home. D6 (f) names `custom_tool_call_output`
   only, while `evals/local.mjs:257` also reads `function_call_output`: whether the
   latter counts is open.
4. **Who applies the D3 rule.** Whether `reads.mjs` prints the rule's verdict or only the
   per-tool rates for a human is unstated; S15 assumes the rates and a human-confirmed
   arithmetic.
5. **`doctor`'s testability.** D8 names four settings files but not the managed path per
   platform, and `doctor({cwd, env})` has no way to point at test files; the Plan must add
   one (S11 risk row).
6. **`report --cap N` and `perCommand`.** Whether the recomputation honours the user's
   per-command caps or applies N to every result is unstated.
7. **`codex.mode` in `doctor`.** Not in D5; the Structure adds it to `doctor.mjs:30` in S8
   because a denied key the user cannot see is a trap.
8. **Where the live observations live.** D5 names `evals/codex-live.md` for the protocol
   but not for the runs, and D3 names no home for the week's numbers; the Structure puts
   them in `evals/codex-live.md` `## Runs`, `evals/results/<date>-reads.json`, the TH-10
   State line in `BACKLOG.md`, and a pointer line in `99-progress.md`.

---

## Status

- [x] Decomposition complete
- [x] Every step has a verification command
- [x] Every step leaves the repo working
- [x] Dependencies and parallelism mapped

> Next phase: **Plan**. It receives: this file + `02-design.md`.
