# 01 · Research — TH-1 Tool output trimmed at the source


This is the most expensive phase and the one with the highest compression ratio
(~30-50×). It is also the one that most needs subagents.

Repository: `Allan-Nava/trimhook`, version `0.0.1` in all four manifests (`package.json:3`,
`.claude-plugin/plugin.json:3`, `.claude-plugin/marketplace.json`, `.codex-plugin/plugin.json:3`),
not published (`CHANGELOG.md:13-15`). Source is 531 lines across `bin/trimhook.mjs` (141) and
seven modules in `bin/lib/`; tests are 265 lines in `test/`. Every path below is repo-root-relative.

---

## Reference questions

From `00-questions.md` — the answers that steer this research:

- Q1 "error reaches the model unchanged" → harness-reported failure only; a non-zero exit is an ordinary result, trimmed by size; Design decides from facts here.
- Q2 stdout/stderr separate? → Claude Code `{stdout, stderr, interrupted, isImage}`; Codex a bare string; Codex shape assumed, not observed (TH-9).
- Q3 spill location/lifetime → `<data>/spill/<session>/<tool-use>.txt`, 0600, data dir from `TRIMHOOK_DATA`/`CLAUDE_PLUGIN_DATA`/`PLUGIN_DATA`/`~/.trimhook`, pruned after 7 days on 1 call in 20; nothing protects a live session's file beyond the TTL.
- Q4 "verified on a live Codex session" → `codex.replace` off; TH-9 is a maintainer-run protocol on Codex 0.155+; not a release blocker.
- Q5 which cap ships in 0.1.0 → 8,000 from the transcript sweep; TH-10 (live week) gates the tag and decides the cap.
- Q6 how the hook reaches the code → Claude Code `${CLAUDE_PLUGIN_ROOT}/bin/trimhook.mjs post-tool-use`; Codex the absolute path `print-hooks` writes; nothing on `PATH`.
- Q7 counting spill re-reads → after the fact from transcripts, not by the hook; not implemented anywhere yet.
- Q8 fail-open scope/visibility → every error prints nothing, exit 0, one stderr line; the answer flags "does a failed spill really prevent a cut?" for Research.
- Q9 config sources and trust → defaults → `~/.trimhook.json` → `TRIMHOOK_CONFIG` → repo file → env; a repo file may raise the cap or change `perCommand`; no tighten-only rule.
- Q10 cap semantics → cap is what reaches the model, marker included; head 0.6; stderr floor 20% of cap; `minSaving` 1,500 leaves results up to cap + 1,499 whole.

---

## Map of the territory

### Components involved

| Area | Path | Role |
|---|---|---|
| CLI dispatch | `bin/trimhook.mjs` | `process.argv[2]` switch at `:111`: `check`, `post-tool-use`, `doctor`, `report`, `print-hooks`, default `help` (`:139`, unknown subcommand exits 0) |
| Hook handler | `bin/lib/handlers.mjs` | `postToolUse()` `:8-31`, the whole per-result flow; `commandPrefix()` `:35-40` for the log |
| Payload / reply shapes | `bin/lib/harness.mjs` | `detectHarnessSignal` `:12-21`, `dataDir` `:26`, `readResponse` `:32-38`, `replacementOutput` `:42-56` |
| Cut arithmetic | `bin/lib/trim.mjs` | `marker` `:8`, `snapDown/snapUp` `:15,19`, `trimText` `:24`, `splitBudget` `:37`, `trimResult` `:48`; no imports |
| Spill + log | `bin/lib/store.mjs` | `safe()` `:8`, `appendRecord` `:18`, `readRecords` `:28`, `spill` `:43-50`, `pruneSpill` `:53-62` |
| Config | `bin/lib/config.mjs` | `DEFAULTS` `:10-18`, `RULES` `:51-58`, `loadConfig` `:68-90`, `capFor` `:95-100` |
| Diagnostics | `bin/lib/doctor.mjs`, `bin/lib/report.mjs` | `doctor()` `:7-37`; `summarize` `:4`, `render` `:24`, `report` `:34` |
| Hooks files | `hooks/hooks.json`, `codex/hooks.json` | one `PostToolUse`/`Bash` entry each, `timeout: 5` (`:8` in both) |
| Manifests | `package.json`, `.claude-plugin/{plugin,marketplace}.json`, `.codex-plugin/plugin.json` | version `0.0.1`; only `.codex-plugin/plugin.json:9` declares a `hooks` path |
| Tests | `test/trim.test.mjs`, `test/handlers.test.mjs`, `test/misc.test.mjs`, `test/helpers.mjs` | 19 tests, `node --test` (`package.json:23`) |
| Benchmark | `evals/local.mjs`, `evals/results/2026-09-23-local.json` | transcript sweep over `~/.claude/projects/**/*.jsonl` (`:52`) and `~/.codex/sessions/**/*.jsonl` (`:88`) |
| Backlog tooling | `scripts/backlog.mjs`, `scripts/backlog_test.mjs`, `scripts/fixtures/` | lint/roadmap/issue sync; not part of the hook |
| CI / release | `.github/workflows/{ci,release,release-drift,pages,codeql,backlog-issues}.yml` | see Constraints |
| Docs | `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `BACKLOG.md`, `CHANGELOG.md`, `ROADMAP.md` | README is also the site's only prose (`CLAUDE.md:22-48`) |

### Entry points

| Symbol | Path:line | What it does |
|---|---|---|
| `handler()` | `bin/trimhook.mjs:37-49` | reads stdin, `JSON.parse`; unparsable → exit 0 with no output (`:39`); prints `JSON.stringify(out)` (`:45`); any throw → stderr `trimhook: failed open: <msg>`, exit 0 (`:46-49`) |
| `postToolUse(input, deps)` | `bin/lib/handlers.mjs:8` | config → harness → data dir → `tool_name === 'Bash'` gate (`:13`) → `readResponse` (`:14`) → cap (`:17`) → spill (`:18`) → `trimResult` (`:19`) → log (`:22`/`:27`) → reply (`:30`) |
| `readResponse(r)` | `bin/lib/harness.mjs:32` | string → `{stdout: r, stderr: ''}` (`:33`); `isImage` → null (`:35`); `stdout`/`stderr` strings → both, `rest` = whole object (`:36`); `{output}` → stdout (`:37`); else null (`:38`) |
| `replacementOutput()` | `bin/lib/harness.mjs:42` | Codex: `{decision:'block', reason:<text>, systemMessage:<note>}`, stderr appended as `\n[stderr]\n` (`:47-48`); Claude: `hookSpecificOutput.updatedToolOutput` as an **object** `{...rest, stdout, stderr, interrupted, isImage:false}` (`:51-55`) |
| `trimResult()` | `bin/lib/trim.mjs:48-54` | `null` when `total <= cap` or `total - cap < minSaving` (`:50`); else `splitBudget` + two `trimText` calls with the same `head` and `path` |
| `trimText()` | `bin/lib/trim.mjs:24-32` | `room = max(200, budget - marker(len,len,path).length)` (`:28`); head = `floor(room*headShare)` snapped down; tail gets the remainder snapped up |
| `splitBudget()` | `bin/lib/trim.mjs:37-45` | floor = `min(errLen, floor(cap*0.2))` (`:42`); `err = max(floor, floor(cap*errLen/total))` (`:43`); `out = cap - err` (`:44`) |
| `spill()` | `bin/lib/store.mjs:43-50` | `mkdir -p <data>/spill/<slug(session)>` mode 0700; file `<slug(tool_use_id || Date.now())>.txt`, `writeFileSync` mode 0600 + `chmodSync` (`:47-48`); returns path or `null` |
| `loadConfig(cwd, env)` | `bin/lib/config.mjs:68-90` | `DEFAULTS` ← user file ← (`TRIMHOOK_CONFIG` **or** repo candidates) ← `TRIMHOOK_MODE`/`TRIMHOOK_CAP`; then validation with defaults winning (`:83-89`) |
| `check()` | `bin/trimhook.mjs:71-105` | the first half of `npm test`; exit 1 on any failure (`:102`) |
| `print-hooks` | `bin/trimhook.mjs:131-137` | reads `codex/hooks.json`, replaces `${PLUGIN_ROOT}/bin/trimhook.mjs` with the absolute path of the running install (`:133-134`), prints JSON |
| `doctor()` | `bin/lib/doctor.mjs:7` | harness by signal (`:16-17`, called **without** stdin so `turn_id`/`prompt_id` rules never fire), data-dir writability (`:19-24`, BAD), config problems (`:29`, BAD), `BASH_MAX_OUTPUT_LENGTH < cap` (`:33-34`, warn), Codex without `replace` (`:35`, warn), audit mode (`:36`, warn) |
| `report()` | `bin/lib/report.mjs:34` | `render(summarize(readRecords(dir)))`; tokens = `round(saved / 4)` (`:29`); top 8 commands by saved chars, non-`kept` records only (`:12`, `:25`) |
| `sweep()` | `evals/local.mjs:118-135` | imports `DEFAULTS`, `commandPrefix`, `trimResult` from `bin/lib` (`:19-21`) — arithmetic is not reimplemented; caps `[4000, 8000, 12000, 16000]` (`:26`) |

---

## Existing patterns and conventions

### Fail-open by "print nothing"

- **Where:** `bin/trimhook.mjs:39,46-49`; `bin/lib/store.mjs:8` (`safe()`).
- **How it works:** the only `try/catch` is in the CLI. `postToolUse` has none (`bin/lib/handlers.mjs:8-31`). Every filesystem call in `store.mjs` is wrapped in `safe()`, which swallows the throw and yields `undefined`; nothing is printed and no log line records a failure class.
- **Who already uses it:** `spill` `:50` (`?? null`), `appendRecord` `:18`, `pruneSpill` `:53`, `readRecords` `:28`. Documented at `README.md:49-52` ("Exit 0 with no JSON means leave the result alone") and `CLAUDE.md:52-53`.

### One reply builder for two harnesses

- **Where:** `bin/lib/harness.mjs:42-56`.
- **How it works:** the harness string selects the shape; the Claude reply spreads the original response object (`rest`) so unknown fields survive, then overwrites `stdout`, `stderr`, `interrupted`, `isImage`. The `note` reaches the model only on Codex (`systemMessage`); the Claude reply carries no note.
- **Who already uses it:** `bin/lib/handlers.mjs:30`; CI smoke test `.github/workflows/ci.yml:32-42` asserts both shapes end to end.

### Harness detection by "own signals before ambient ones"

- **Where:** `bin/lib/harness.mjs:12-21`.
- **How it works:** `TRIMHOOK_HARNESS` → `CLAUDE_PLUGIN_ROOT` → `PLUGIN_ROOT` → stdin `turn_id` without `prompt_id` (codex) / `prompt_id` without `turn_id` (claude) → `CLAUDECODE`, `CLAUDE_PROJECT_DIR`, `CODEX_HOME` → default `claude`. `CLAUDE.md:87-91` records that a repo-level Codex hook gets none of `PLUGIN_ROOT`/`PLUGIN_DATA`/`CODEX_HOME` and inherits `CLAUDECODE`, which is why the stdin rule sits above the ambient ones.
- **Who already uses it:** `handlers.mjs:11`, `doctor.mjs:16`, `test/misc.test.mjs:34-41`.

### Sizes-only JSONL log with one command-prefix field

- **Where:** `bin/lib/handlers.mjs:20-27`, `bin/lib/store.mjs:16-26`.
- **How it works:** one record per Bash result: `at, session, harness, mode, command (prefix), before, cap, outcome ∈ {kept, trimmed, would-trim}, after, elided, spill`. `results.jsonl` rotates once to `results.1.jsonl` at 8 MiB (`LOG_MAX`, `store.mjs:16,23`). `commandPrefix` keeps the first word, or two for 15 known launchers (`handlers.mjs:38`).
- **Who already uses it:** `report.mjs` and `evals/local.mjs:74` (same `commandPrefix`, so the benchmark's "top" and the report's "top" are keyed identically).

### Config layers merged, then validated with defaults winning

- **Where:** `bin/lib/config.mjs:21-27` (`merge`), `:51-58` (`RULES`), `:83-89`.
- **How it works:** recursive merge for plain objects, replace for scalars; validation runs once after all layers, replaces a bad value with `DEFAULTS` and pushes a human-readable `problems` string. `postToolUse` discards `problems` (`handlers.mjs:10` destructures only `cfg`); `doctor` reports each as BAD (`doctor.mjs:29`).
- **Who already uses it:** `test/misc.test.mjs:26-31`, `test/handlers.test.mjs:81`.

### `check` as the enforcer of doc claims

- **Where:** `bin/trimhook.mjs:71-105`.
- **How it works:** four equal versions (`:78-79`), names (`:80-81`), `repository.url` (`:82`), zero `dependencies` (`:83`), `files` list (`:84`), both hooks files via `checkHooksFile` (`:85-86`: single `PostToolUse`, matcher `Bash`, binary `<rootVar>/bin/trimhook.mjs`, handler `post-tool-use`, `timeout <= 10`), seven docs exist (`:87`), CHANGELOG has `[Unreleased]` and `[<version>]` (`:90-91`), README matches `/nothing leaves the machine/i`, `/fail-open|fails open/i` and literal `BASH_MAX_OUTPUT_LENGTH` (`:95-97`), seven `bin/lib/*.mjs` exist (`:99`).
- **Who already uses it:** `package.json:23`, `.github/workflows/ci.yml:28`, `pages.yml:36`, `release.yml:85`.

### Numbers live in the code, some in the README, none in CLAUDE.md

- `cap 8000`: `config.mjs:12`, `README.md:91,115`, `BACKLOG.md:39,59`, `ci.yml:40`. `minSaving 1500`: `config.mjs:14`, `README.md:93` only. `head 0.6`: `config.mjs:13`, `README.md:26,92`. Stderr floor `0.2`: `trim.mjs:42` **only** — no doc states the number (`README.md:46-47` says "a floor"). TTL 7: `config.mjs:17`, `README.md:56,96`, `CHANGELOG.md:21`. Prune probability `0.05`: `handlers.mjs:25` only. Hook timeout 5 s: `hooks/hooks.json:8`, `codex/hooks.json:8` only — no prose mentions it. Validation bounds `cap ∈ [500, 200000]`, `head ∈ [0.1, 0.9]`, `perCommand` values `>= 500`: `config.mjs:52-55` only.

---

## Constraints

| Constraint | Source | Impact |
|---|---|---|
| Claude Code payload: `tool_name, tool_input, tool_response, tool_use_id, session_id, prompt_id (v2.1.196+), cwd`; read 2026-09-23 | `CLAUDE.md:73-80` | `handlers.mjs` uses `session_id`, `tool_use_id`, `cwd`, `tool_input.command`, `tool_response`; `prompt_id` only for detection |
| `updatedToolOutput` must match the tool's shape — Bash `{stdout, stderr, interrupted, isImage}` — or it is ignored and the original used | `CLAUDE.md:75-78`; built at `harness.mjs:54` | the reply is an object, not a string; a shape drift silently disables trimming (fail-open) |
| Codex `PostToolUse` runs after Bash **including non-zero exits**; input `turn_id, tool_name, tool_use_id, tool_input, tool_response`; no `session_id`/`cwd` listed | `CLAUDE.md:82-84` | `spill()` falls back to slug `no-session` (`store.mjs:37`); `loadConfig` falls back to `process.cwd()` (`handlers.mjs:10`) |
| Codex `decision: "block"` + `reason` replaces the result and continues the model from the hook message; `continue: false` also replaces; `updatedMCPToolOutput`/`suppressOutput` parsed but unsupported | `CLAUDE.md:84-87` | `codex.replace` default `false` (`config.mjs:18`); `handlers.mjs:26` logs `would-trim` and returns null on Codex without it |
| Codex 0.155 dropped plugin-bundled hooks; repo hook gets no `PLUGIN_ROOT` | `codex/hooks.json:2`, `CLAUDE.md:87-91`, `README.md:69-76` | `print-hooks` must bake the absolute path (`trimhook.mjs:133-134`) |
| Hook timeout 5 s, `check` ceiling 10 s; handler has no internal deadline | `hooks/hooks.json:8`, `codex/hooks.json:8`, `trimhook.mjs:64`, `handlers.mjs:8-31` | spill write + trim must finish within the harness timeout; nothing measures it |
| Harness cap `BASH_MAX_OUTPUT_LENGTH` default 30,000, max 150,000, overridden by `bashOutputMaxChars` | `CLAUDE.md:80`, `README.md:5,19` | `doctor.mjs:33` reads only the env var; nothing reads `settings.json`/`bashOutputMaxChars` |
| No `PreToolUse`, no `updatedInput` | `CLAUDE.md:63-65`; enforced by `checkHooksFile` `trimhook.mjs:57` (any event other than `PostToolUse` fails `check`) | the hook cannot see or change the command before it runs |
| Zero runtime deps, Node >= 18, no build, no `postinstall` | `package.json:19-21,36-38`, `trimhook.mjs:83`, `CLAUDE.md:116`, `ci.yml:16-28` | CI runs `npm test` on Node 18/20/22/24 with no `npm install` |
| `files` must ship `bin, hooks, codex, .claude-plugin, .codex-plugin, README.md, CHANGELOG.md, LICENSE` | `package.json:9-18`, `trimhook.mjs:84` | `CLAUDE.md`, `BACKLOG.md`, `CONTRIBUTING.md`, `evals/`, `assets/`, `site/` not in the tarball |
| Release by tag `trimhook--v<version>`; version must equal `package.json`; OIDC (`id-token: write`), no `registry-url`, no `--provenance` flag; file must stay named `release.yml` | `release.yml:15-17,35-38,45-55,59-70,87-112` | `release-drift.yml:31-48` fails main after 2 h with an untagged version bump |
| Milestone gate: no `trimhook--v0.1.0` before a week of `trimhook report` plus the spill-read count is in the README | `BACKLOG.md:33-35`, TH-10 `BACKLOG.md:70-73`, `CONTRIBUTING.md:31` | "the default cap moves only with both numbers in the README" |
| Every README number measured and dated; transcripts are post-harness-cut | `CLAUDE.md:66-67`, `evals/local.mjs:2-13` | the sweep's `before` (27,774,651) understates true source size |
| CHANGELOG line under `[Unreleased]` in the same PR; ROADMAP regenerated or `backlog check` fails | `CLAUDE.md:111-113`, `CONTRIBUTING.md:42-44`, `ci.yml:58-67` | backlog job runs on Node 24 only |
| Pages site is generated from README + `hooks/hooks.json`; no prose of its own | `CLAUDE.md:22-48`, `pages.yml:3-13,32-38` | a README wording change is a site change |
| Prose: British-leaning spelling, em-dashes, no decorative emoji; the plugin never uses another product's mark | `CLAUDE.md:114-117` | — |

---

## Reuse candidates

What already exists and should not be rewritten:

| What | Path | Note |
|---|---|---|
| `trimText`, `splitBudget`, `trimResult`, `marker` | `bin/lib/trim.mjs:8-54` | pure, no imports, shared by hook and benchmark (`evals/local.mjs:21`) |
| `readResponse` / `replacementOutput` | `bin/lib/harness.mjs:32-56` | the only place payload shape is known; `rest` spread preserves unknown fields |
| `detectHarnessSignal` | `bin/lib/harness.mjs:12-21` | already covers env, stdin and ambient signals, with a "deciding signal" string `doctor` prints |
| `spill`, `pruneSpill`, `appendRecord`, `readRecords`, `safe` | `bin/lib/store.mjs` | 0600 + chmod, one-generation rotation, swallow-all wrapper |
| `loadConfig` + `RULES` + `problems` | `bin/lib/config.mjs:51-90` | adding a key = one `DEFAULTS` entry + one `RULES` entry; dotted keys supported via `get`/`set` `:60-66` |
| `capFor` / `commandPrefix` | `config.mjs:95-100`, `handlers.mjs:35-40` | the same `cd … &&` stripping regex in both |
| `doctor` line model (`ok/warn/BAD`, `broken`) | `bin/lib/doctor.mjs:7-15` | new checks are one `ok()/warn()/bad()` call each |
| `summarize`/`render` | `bin/lib/report.mjs:4-33` | any new record field needs an accumulator here |
| `checkHooksFile`, README regex checks | `bin/trimhook.mjs:52-66, 93-98` | pattern for enforcing a new load-bearing statement |
| `sweep()` + `--json` writer | `evals/local.mjs:118-162` | synthetic body is `'x'.repeat(chars)` with empty stderr (`:126`) — no newlines, no stderr |
| Test helpers `tmp/env/lines/input` | `test/helpers.mjs:5-9` | canonical Claude Code stdin fixture; `TRIMHOOK_USER_CONFIG` redirected so `~/.trimhook.json` never leaks |
| Subprocess e2e `run()` | `test/misc.test.mjs:86-95` | spawns the real CLI with a controlled env |
| CI smoke assertions | `.github/workflows/ci.yml:32-42` | both root vars, short/long payloads, shape assertions |

---

## Existing tests

| What it covers | Path | How to run it |
|---|---|---|
| under-budget passthrough; head/tail/marker within budget for 2000/8000/20000; marker regex and accounting; line-boundary snap; `splitBudget` four cases incl. floor `min(errLen, 20%)`; `trimResult` null/null/cut at cap 8000, minSaving 1500 | `test/trim.test.mjs:6-50` | `node --test` (part of `npm test`, `package.json:23`) |
| kept → log; long → Claude shape, spill 0600 under `spill/s1`, marker names an existing file with full content, log `trimmed` with `command 'npm test'` and `spill` path; `Read`/image/`42`/unknown → null; audit → `would-trim`, no spill dir; repo `.trimhook.json` `perCommand {'git log':1000}` and `TRIMHOOK_CAP=3000`; Codex `would-trim` then `decision: block` with `reason <= 8000`, `systemMessage` prefix after `{codex:{replace:true}}`; broken user config → default 8000 still applied | `test/handlers.test.mjs:10-86` | idem |
| config layers, `capFor` two-word/one-word/`cd` prefix, 4 validation problems reverting to defaults; harness detection (6 cases); `readResponse` (5 cases); prune after 7-day TTL with `utimesSync` backdating + stderr separator; `summarize`/`render` totals and empty state; `doctor` ok/warn(`BASH_MAX_OUTPUT_LENGTH=4000`)/BAD; e2e subprocess: long → trimmed exit 0, `not json` → exit 0 empty, short → empty; `report` subprocess says 2 results / trimmed 1 | `test/misc.test.mjs:15-111` | idem |
| contract smoke on the real CLI under both root vars | `.github/workflows/ci.yml:32-42` | CI only |
| backlog planner (`lint`, `parse`, `plan`, `roadmap`) | `scripts/backlog_test.mjs`, `scripts/fixtures/` | `node scripts/backlog_test.mjs`; also matched by `node --test`'s default glob (`*_test.mjs`) |

**Not covered by any test** (grep of `test/` for each export): `DEFAULTS`, `userConfigPath` (homedir fallback), `commandPrefix` beyond the single value `npm test`, `detectHarness`, `dataDir` branches other than `TRIMHOOK_DATA`, `replacementOutput` Codex branch with non-empty stderr (`harness.mjs:47`), `LOG_MAX` rotation (`store.mjs:23`), `appendRecord`/`spill` failure paths, `readRecords` of `results.1.jsonl`, `TRIMHOOK_CONFIG` branch (`config.mjs:73-75`), `.claude/trimhook.json` / `.codex/trimhook.json` candidates, the in-handler `Math.random() < 0.05` prune trigger, `print-hooks`, `help`, `doctor` CLI case, `trimResult` with stderr large enough to hit the floor, interrupted payloads, hook execution time.

---

## Blind spots

Things you could not determine, and why:

- Whether Claude Code's `tool_response` for a **failed** Bash call carries an error flag, an exit code, or `interrupted: true`, and in which field. `CLAUDE.md:73-80` lists the payload keys but no error field; the code never reads one; no fixture in `test/` or `ci.yml` has a failing command. Only a live capture of a non-zero-exit and a timed-out Bash call settles it.
- Whether Codex's `tool_response` for Bash is a bare string, `{output}`, or something else — `CLAUDE.md:82-84` says "model-facing output"; `readResponse` accepts three shapes on speculation; TH-9 (`BACKLOG.md:66-69`) is the observation. Also unknown: what the model does with `decision: block` (the brief's re-run risk).
- The handler's wall-clock time on a 150,000-character result: no timing in code or tests; the 5 s hook timeout is asserted only as a number `<= 10` (`trimhook.mjs:64`).
- Whether the model ever reads a spill file: no count exists (Q7); `evals/local.mjs:72` records only `Bash` tool uses, so `Read` calls on `spill/` paths are invisible to the current script.
- How much of the 27.8 M characters was already flattened by `BASH_MAX_OUTPUT_LENGTH` before landing in the transcript: unknowable from transcripts (`evals/local.mjs:2-13`).
- Whether the two harnesses feed the hook interleaved stdout/stderr or separated: Claude Code separated (`CLAUDE.md:75-78`); Codex assumed one string (Q2).
- Whether `bashOutputMaxChars` (settings.json) is in effect on a given machine: nothing reads it (`doctor.mjs:33` reads the env var only).

---

## Facts that contradict the assumptions

If research disproved an assumption from `00-questions.md`, write it here in large
letters. It is the most valuable output of the phase.

- **A FAILED SPILL DOES NOT PREVENT A CUT.** `bin/lib/store.mjs:50` returns `null` on any write failure; `bin/lib/handlers.mjs:18-19` passes that `null` straight into `trimResult`, which cuts anyway; `bin/lib/trim.mjs:9` merely drops the ` Full output: <path>` clause from the marker; `handlers.mjs:29` drops the "; the whole output is at …" clause from the note. `CLAUDE.md:56-57` ("if the spill fails, the result is left alone"), `BACKLOG.md:47-49` ("no cut without a spill") and Q1/Q8 of `00-questions.md` all state the opposite. No test covers a failing spill.
- **THE SPILL IS WRITTEN BEFORE THE TRIM DECISION, FOR EVERY BASH RESULT.** `handlers.mjs:18` runs `spill()` whenever `cfg.spill && cfg.mode === 'trim'`, then `:19` decides; a 200-character `ls` gets a 0600 file under `spill/<session>/` that is never referenced by any marker. The README (`:56-58`) describes the spill as holding "the whole output" of trimmed results only.
- **The cap is not enforced for the combined result; the marker is paid per stream.** `trimResult` (`trim.mjs:48-54`) splits `cap` between streams, and each `trimText` reserves its own marker out of its own budget (`:28`), so a two-stream cut carries **two** markers naming the same path and `after <= cap` holds. But `trimText` clamps `room` to at least 200 (`:28`), so a budget under ~300 characters (possible for a tiny stderr share) can exceed its share. Q10's "marker included" is true per stream, not "one marker".
- **`minSaving` is measured against the overflow above the cap, not against what would be elided.** `trim.mjs:50`: `total - cap < minSaving` → null. Elided characters exceed `total - cap` by the marker length(s) and snap slack (up to 200 each side, `:15,19`). The README's "exceed the cap by at least `minSaving`" (`README.md:38`) matches the code; Q10's "cut only if its total exceeds the cap by at least minSaving" matches too — but the report's `saved` (`before - after`) will exceed `minSaving` on the smallest cut.
- **A repository config file can change everything, including `spill: false`, `mode`, `spillTtlDays` and `codex.replace`.** `config.mjs:83` applies the same `RULES` to every layer; there is no per-level allow-list; the repo layer overrides the user file (`:71-79`). Q9's default assumption ("only the user level may set spill directory, log location and codex.replace") is not implemented — and there is **no** `spillDir` or `logPath` key at all: the data directory is env-only (`harness.mjs:26`). A checkout cannot redirect the spill directory, but it can switch spilling off while trimming stays on, producing cuts with no recoverable middle.
- **`TRIMHOOK_CONFIG` replaces the repository layer; it does not sit between user and repo.** `config.mjs:73-79`: when the env var is set, repo candidates are never searched. `README.md:84-86` and `BACKLOG.md:50-53` list it as a step in a chain.
- **Exit code, `is_error` and `interrupted` are never read.** `harness.mjs:32-38` reads `stdout`, `stderr`, `output`, `isImage` only; `interrupted` is only echoed back (`:54`). "Any error reaches the model unchanged" (`README.md:38`, Q1) holds only insofar as an error payload has none of those four keys and so hits `:38 return null`. A failed command with text in `stdout`/`stderr` is trimmed like any other — matching Q1's default, contradicting no code, but the README's "any error" has no mechanism behind it.
- **Fail-open is not silent.** `trimhook.mjs:47` prints `trimhook: failed open: <message>` to stderr on a thrown error; Q8's default says "writes nothing to stdout or stderr". Spill/log failures, by contrast, are fully silent (`store.mjs:8`) and leave no failure record — Q8's "one line records the failure class" does not exist; the only trace is `spill: null` on a `trimmed` record (`handlers.mjs:27`).
- **The prune runs on 1 in 20 *trimmed* results, not 1 in 20 hook calls, and only in trim mode.** `handlers.mjs:25` sits after the `!t` return; a session that never trims never prunes. Q3 says "on one call in twenty". `pruneSpill` deletes files only (`store.mjs:60`), never session directories.
- **`doctor` cannot see the stdin detection rules.** `doctor.mjs:16` calls `detectHarnessSignal(env)` without input, so on a repo-level Codex hook (no `PLUGIN_ROOT`, inherits `CLAUDECODE` per `CLAUDE.md:87-91`) `doctor` reports `claude` while the hook itself, given `turn_id`, reports `codex`.
- **The Claude reply carries no note to the model; the Codex one does.** `harness.mjs:51-55` vs `:48`. The marker inside `stdout` is the only signal on Claude Code.
- **The benchmark never exercises line snapping or the stderr split.** `evals/local.mjs:126` uses `'x'.repeat(chars)` and `''` for stderr; the sweep's `after` is exact for that synthetic body but not for real multi-line two-stream output (snap slack up to 200 per cut). The README table (`:108-118`) is presented without this caveat.
- **`package.json:23` is the `npm test` line** (`node bin/trimhook.mjs check && node --test`); `CLAUDE.md:96` describes it as "check + node --test" without enumerating what `check` enforces — the enumeration lives in `bin/trimhook.mjs:71-105` and `BACKLOG.md:60-63`.
- **Stray sibling-project strings:** `release.yml:150` release notes mention `TYPESAFE_API_KEY` ("Without it every gate falls through" — hookgate wording); `backlog-issues.yml:3-12` refers to `HG-n` ids; `README.md:133` heading "Why not a Noul". `check` does not catch any of these.
- **`marketplace.json` has no `hooks`/`skills` key and `.claude-plugin/plugin.json` no `hooks` key**; Claude Code relies on the conventional `hooks/hooks.json` location. Only `.codex-plugin/plugin.json:9` declares `hooks: codex/hooks.json`.

---

## Addendum — targeted round, 2026-09-23

Five facts `02-design.md` listed under "More research needed", settled with evidence. Facts only.

### 1. Claude Code `tool_response` for a failing, timed-out or interrupted Bash call

**Verdict:** a Bash command that exits non-zero does not reach `PostToolUse` at all — it fires `PostToolUseFailure`, whose payload has no `tool_response`, only a top-level `error` string and `is_interrupt`; a successful Bash `tool_response` is `{stdout, stderr, interrupted, isImage, noOutputExpected, …}` with no exit code or error flag.

- `curl -sL https://code.claude.com/docs/en/hooks.md` (331,285 bytes): "`PostToolUse` hooks fire after a tool has already executed successfully." — "`PostToolUseFailure` … Runs when a tool that started executing fails: the tool threw an error, or an MCP tool returned an error result." — its input example for `"tool_name": "Bash"` carries `"error": "Exit code 1\n…"`, `"is_interrupt": false`, `"duration_ms"`, and no `tool_response`; field table: "`error` String describing what went wrong" and "`is_interrupt` Optional boolean. True when the failure reached Claude Code as an abort rather than as an error the tool reported. Cancelling a running tool does not fire this hook; the tool result carries the interruption message instead." — "For Bash and PowerShell, a command that ran and exited produces a first line `Exit code N`, then any output the command produced as one block with stdout and stderr interleaved" — "Claude Code middle-truncates long strings around a `... [N characters truncated] ...` marker, and can insert lines of its own, such as `Command timed out after 2m 0s`". `PostToolUseFailure` decision control offers only `additionalContext` — no `updatedToolOutput`.
- Same file, `PostToolUse`: "`Bash` returns an object with `stdout`, `stderr`, `interrupted`, and `isImage` fields. For built-in tools, a value that doesn't match the tool's output schema is ignored and the original output is used." — `tool_response.bashEditDiff` (v2.1.269+) is the one extra Bash field the doc names. No `is_error`, `returnCode` or exit-status field is documented for `tool_response`.
- Local transcripts, keys-only scan (`scan.mjs`/`scan2.mjs`/`scan3.mjs` over `~/.claude/projects/*/*.jsonl`): 1,753 files, 229,996 lines, 28,133 Bash `tool_use`, 28,148 Bash `tool_result`. `toolUseResult` is an object in 27,549 and a string in 599; the 599 strings are exactly the 599 results with `is_error: true` (0 error results with an object). Object key sets (count): `interrupted,isImage,noOutputExpected,stderr,stdout` 25,334; `+bashEditDiff` 1,280; `+gitOperation` 280; `+backgroundTaskId` 212; `+returnCodeInterpretation` 168 (string, 2 distinct values, 180 with other combinations); `+backgroundTaskId,timedOutAfterMs` 84; `+persistedOutputPath,persistedOutputSize` 13; `+staleReadFileStateHint` 14; `+dangerouslyDisableSandbox` 7; `+ghRateLimitHint` 1. `interrupted: true`: 0 of 27,549. Non-empty `stderr` with `is_error` absent: 776 — stderr alone does not make an error result.
- The 599 error results: `tool_result.content` is a string in all 599, first word `Exit` in 437, `Permission` in 82, `<tool_use_error>` in 52, other 28; the string `toolUseResult` starts `Error:` in 582 (`Exit code N` appears in 437 of them, never as the first line; "timed out" in 22, "interrupt" in 1). Lengths: 509 under 1k, 84 in 1k-10k, 6 in 10k-30k, 0 above. The 84 results with `timedOutAfterMs` all have `is_error` absent (background-continued, not failures).

### 2. `Read` tool uses carry `input.file_path`

**Verdict:** every `Read` tool use in the local transcripts has a string `input.file_path`; none is under a `spill/` directory today.

- `scan.mjs` (same corpus): `tool_use` blocks with `name: "Read"`: 689; with string `input.file_path`: 689; paths containing `/spill/`: 0.

### 3. Codex `tool_response` shape and how a `decision: block` replacement lands in the session log (TH-9 live run)

**Verdict:** Codex 0.155.1 hands the hook a bare string `tool_response` (the exec's full model-facing output, 28,893 characters for `seq 1 6000`); a `decision: block` reply is recorded as a *failed* tool call — `output[0]` "Script failed …", `output[1]` `"Script error: " + reason` — the router logs `ERROR … error=1`, `systemMessage` never appears in the log, and the model still read the head and tail correctly.

- Protocol: `codex --version` → `codex-cli 0.155.1`; `.codex/hooks.json` written from `node bin/trimhook.mjs print-hooks`; `TRIMHOOK_USER_CONFIG` → `{"codex":{"replace":true}}`; `TRIMHOOK_DATA` → temp dir; `codex exec --approve-for-me --dangerously-bypass-hook-trust '<prompt>' < /dev/null` in the trusted scratch repo; four runs; hooks file deleted afterwards (`ls -A .codex` → empty).
- Hook input shape (run 4, a keys-only dump hook in place of trimhook — `dump-hook.mjs`): top-level keys `session_id, turn_id, transcript_path, cwd, hook_event_name, model, permission_mode, tool_name, tool_input, tool_response, tool_use_id`; `tool_name: "Bash"`; `tool_input` = `object{command:string(10)}`; **`tool_response` = `string(28893)`**; stdin 35,474 bytes; env seen by the hook: `CLAUDECODE=1` (inherited from the parent Claude Code session), `PLUGIN_ROOT` and `CODEX_HOME` unset. Doc agrees: `https://learn.chatgpt.com/docs/hooks` — "`tool_response` JSON value Tool-specific output. MCP tools send the MCP call result. Other local function tools normally send their model-facing output."
- Run 1 (`results.jsonl`): `{"harness":"codex","mode":"trim","command":"seq","before":504,"cap":8000,"outcome":"kept","after":504}` — the hook saw only 504 characters. Cause: the model called `tools.exec_command` with `max_output_tokens=100` (identifiers extracted from the `custom_tool_call.input` script, `ids.mjs`); Codex truncated before the hook (spill file 508 bytes / 112 lines, first line "Warning: truncated output (original token count: 7224)"), while `event_msg:item_completed` for the `CommandExecution` still records `aggregated_output` 28,893 and `exit_code` 0. Session log `custom_tool_call_output.output` = array of 2 `{type:"input_text", text}`: `[0]` 47 chars ("Script completed", wall time), `[1]` 723 chars, a JSON string with keys `chunk_id:string, wall_time_seconds:number, exit_code:number, original_token_count:number, output:string(504)`. No marker.
- Run 2 (cap forced to 300 to exercise the cut — `RULES` at `bin/lib/config.mjs:51` rejected it, `cap` stayed 8000) and run 3 (prescribed config, model passed no `max_output_tokens`): `before: 28893, outcome: "trimmed", after: 7997, elided: 21115`, spill written. Codex stderr: `hook: PostToolUse` → `ERROR codex_core::tools::router: error=1` → `hook: PostToolUse Blocked`. Session log (`~/.codex/sessions/2026/09/23/rollout-…01a0ce88…` and `…01a0ce8b…`, 22 lines each): `custom_tool_call_output.output` = array of 2: `[0]` 44 chars starting "Script failed" + a "Wall time N seconds" line; `[1]` 8,011 chars = `"Script error: "` (14) + the `reason` verbatim (7,997) — contains `trimhook:`, no `[stderr]`. The string `systemMessage`, the note text "whole output is at", and the key `"decision"` occur 0 times in either file; the JSON envelope of run 1 (`chunk_id`, `exit_code`, …) is absent. `item_completed` still holds `exit_code: 0`, `aggregated_output` 28,893.
- Model-facing observable: run 1 "First line: `1` / Last line: `6000`"; runs 2 and 3 the same answer (`1` and `6000`), i.e. the replaced text reached the model and it read the head and tail; the model's final message was 35-84 characters in every run and never mentioned an error.
- Doc, same URL: "PostToolUse returns decision: "block" or exits with code 2 — The tool runs, then the promise rejects with the hook reason." — "For this event, decision: "block" doesn't undo the completed Bash command. Instead, Codex records the feedback, replaces the tool result with that feedback, and continues the model from the hook-provided message." — "PostToolUse returns continue: false — Codex uses the hook feedback for the model-visible result, but doesn't reject the nested tool promise."

### 4. `bashOutputMaxChars`

**Verdict:** a top-level key in any of the four settings files, a positive integer clamped to 4,000-128,000, default unset (30,000 inline); when set it makes Claude Code ignore `BASH_MAX_OUTPUT_LENGTH`; the highest settings level that sets it wins.

- `curl -sL https://code.claude.com/docs/en/settings-reference.md` (444,880 bytes), `### bashOutputMaxChars`: "Set how many characters of a successful Bash or PowerShell command's output Claude receives inline. When output passes the limit, Claude Code saves it to a file and Claude receives a short preview plus the file's path. … Requires Claude Code v2.1.261 or later." — "**Scope**: Any file" — "**Type**: number of characters, a positive integer. Claude Code clamps the value into the range `4000` to `128000`" — "**Default**: unset, so Claude receives up to 30,000 characters inline" — example `{"bashOutputMaxChars": 100000}` at the top level of `settings.json` — "When you set this key, Claude Code ignores the `BASH_MAX_OUTPUT_LENGTH` environment variable." Scope legend (same file): "`Any file` means all four" (`~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed).
- `curl -sL https://code.claude.com/docs/en/settings.md`, "Settings precedence": "When the same key appears in more than one place, Claude Code uses the value from the highest level that sets it." Order, highest first: managed settings, command-line `--settings`, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`. "Environment variables aren't a level in this stack. When a behavior has both a shell variable and a settings key, which one applies is decided per pair, not by level".

### 5. Handler wall-clock on a 150,000-character result

**Verdict:** about 70 ms per call, max 84 ms over ten runs — 1.4-1.7% of the 5 s hook timeout — for a 150,000-character stdout cut to 7,998 characters.

- `time.mjs` from the repo root: event built in-process (`stdout` = `'x\n'.repeat(75000)`, 150,000 characters; event 225,220 bytes), piped ten times to `node bin/trimhook.mjs post-tool-use` via `spawnSync` with `TRIMHOOK_DATA=<tmp>` and `CLAUDE_PLUGIN_ROOT=/p`, `performance.now()` around each spawn: `{"p50_ms":70.3,"min_ms":69.1,"max_ms":83.8,"exit":0,"stdoutBytes":12055,"updatedKeys":"stdout,stderr,interrupted,isImage","updatedStdoutPlusStderrChars":7998}`. Last `results.jsonl` record: `before:150000, cap:8000, outcome:"trimmed", after:7998, elided:142164`; spill file 150,000 bytes, mode 0600. Machine: Apple M2 Pro, macOS 27.0, Node v23.3.0; the figure includes Node start-up.

---

## Status

- [x] Research complete
- [x] Self-contained (explicit paths, no reference to session context)
- [x] Zero solution proposals
- [ ] Reviewed

> **Compression ratio:** ~75k tokens burned (three Explore subagents + verification) → ~7k artifact tokens = ~11×
> Next phase: **Design**. It receives: this file + `00-questions.md` + the ticket.
