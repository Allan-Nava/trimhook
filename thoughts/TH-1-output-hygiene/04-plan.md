# 04 · Plan — TH-1 Tool output trimmed at the source

Written 2026-09-28/29 in 3 fresh Plan sessions, one per group of steps, because the
fifteen steps do not fit one session under the context rule. Each later session planned
against the interfaces the earlier ones fixed; those interfaces are kept at the end.

---

## References

- Structure: [`03-structure.md`](./03-structure.md)
- Design: [`02-design.md`](./02-design.md)

---

## Minimum context for the executor

### From the S1-S7 planning session
| Fact | Where |
|---|---|
| `npm test` is `node bin/trimhook.mjs check && node --test`; `node --test` with no file list picks up every `test/*.test.mjs`, so a new test file needs no registration | `package.json:23` |
| ESM throughout (`"type": "module"`), Node 18 floor, CI on 18/20/22/24; zero runtime dependencies — `check` fails if `package.json#dependencies` is non-empty | `package.json:5,19-21`; `.github/workflows/ci.yml:21`; `bin/trimhook.mjs:86` |
| Tests use `node:test` + `node:assert/strict`. Helpers: `tmp()` a fresh temp dir; `env(dir, extra)` → `{TRIMHOOK_DATA: dir, CLAUDE_PLUGIN_ROOT: '/plugin', TRIMHOOK_USER_CONFIG: dir/user.json, ...extra}`; `lines(n, prefix='line')` → `"line 1\n…line n"` (`lines(5000)` is 38,893 characters); `input(stdout, extra)` → a Claude Code Bash `PostToolUse` event, `session_id: 's1'`, `tool_use_id: 'toolu_01'`, command `npm test`, `cwd: '/tmp/repo'`, `extra` spread last | `test/helpers.mjs:5-18` |
| `log(d)` parses `d/results.jsonl` into an array of records | `test/handlers.test.mjs:8` |
| `BIN` is the CLI path; `run(args, stdin, env)` spawns it with `{PATH, ...env}` and resolves `{code, stdout, stderr}` | `test/misc.test.mjs:14,116-125` |
| The handler: tool filter `:14`, `readResponse` `:15-16`, `command` `:19`, `cap` `:20`, spill path `:23`, `before` `:24`, collapse `:28-30`, `trimResult` `:31`, base `record` `:32`, kept `:36-39`, prune `:40`, failed spill `:46-49`, final record `:52`, reply `:54-56`; `deps` defaults `{env: process.env, now: Date.now}` at `:10` | `bin/lib/handlers.mjs:9-57` |
| `commandPrefix(command)` — first word or two, never a value or a path | `bin/lib/handlers.mjs:71-85` |
| `appendRecord(dir, record)` best-effort JSONL append; `readRecords(dir)` reads `results.1.jsonl` then `results.jsonl`, skips bad lines; `spillPath(dir, session, id)` = `join(dir, 'spill', slug(session), slug(id) + '.txt')` | `bin/lib/store.mjs:18-35,37-44` |
| `dataDir(env)` = `env.TRIMHOOK_DATA ?? ~/.trimhook` | `bin/lib/harness.mjs:32-34` |
| `readResponse(r)`: string → Codex text; Bash branch is the one-liner at `:54`; Read `:58-61`; WebFetch `:63` | `bin/lib/harness.mjs:50-66` |
| `loadConfig(cwd, env)` → `{cfg, path, userPath, problems}`; `DEFAULTS` `:10-43`; `merge` deep-merges plain objects, replaces arrays `:45-49`; `RULES` `:74-87`; `get`/`set` dotted paths `:88-94`; the final validation loop `:111-117` | `bin/lib/config.mjs` |
| `summarize(records)` / `render(s)` / `report(dir)` | `bin/lib/report.mjs:4-43` |
| `doctor({cwd, env})` → `{lines, broken}`; line prefixes `'  ok    '`, `'  warn  '`, `'  BAD   '` (BAD sets `broken`); every config problem is printed as `BAD   config: <problem>` | `bin/lib/doctor.mjs:7-40`, `:29` |
| `check()` collects `fail(m)` messages, prints each as `✗ <m>` on stderr and exits 1, else prints `ok — one hook, two harnesses, manifests in sync at <version>`; README checks `:96-101`; `read(p)` reads a repo-relative file | `bin/trimhook.mjs:23,74-114` |
| `handler()`: parse stdin, `postToolUse`, catch at `:46-48` writes `trimhook: failed open: <message>` and exits 0 | `bin/trimhook.mjs:37-50` |
| `marker(elided, total, path)` → `"\n… [trimhook: E of T characters elided. Full output: P] …\n"`; `MARKER_RE` groups 1 elided, 2 total (both with commas), 3 spill path | `bin/lib/trim.mjs:8-17` |
| A result over the cap is cut only when `total - cap >= minSaving` (default 1,500) | `bin/lib/trim.mjs:56`, `bin/lib/config.mjs:14` |
| `evals/reads.mjs`: header `:1-23`, `WINDOW` `:38-40`, `files()` walk (depth < 4) `:42-58`, `scan()` `:62-98`, counting loop `:100-132`, output `:134-157`, `--json` `:159-164` | `evals/reads.mjs` |
| Codex session lines are `{…, payload: {type, …}}`; `evals/local.mjs` reads `e.payload ?? e` and treats `function_call_output` and `custom_tool_call_output` as tool outputs | `evals/local.mjs:241,257-263` |
| Codex 0.155.1 `custom_tool_call_output.output` is an **array** of `{type: 'input_text', text}`; under `decision: block` it is `["Script failed…", "Script error: " + reason]` | `01-research.md` Addendum item 3 (`:238-239`) |
| CHANGELOG: `## [Unreleased]` `:6`, `### Added` `:8`, `### Fixed` `:31`, `### Changed` `:65`, `## [0.1.0]` `:70` | `CHANGELOG.md` |
| BACKLOG items: `- [ ]` open, `- [x]` shipped with `ver=main` in the trailing `<!-- th: … -->`; TH-4 `:54-56`, TH-9 `:70-73`, TH-10 `:74-77`, TH-26 `:124-135` | `BACKLOG.md:20-25` and the lines named |
| `ROADMAP.md` is generated: `node scripts/backlog.mjs roadmap` rewrites it; `npm run backlog` must end `ok — ROADMAP.md is in step with BACKLOG.md` | `scripts/backlog.mjs:8-10`; `package.json:24` |

**Conventions to respect:**

- **Gates** (`03-structure.md:22-29`). G: `npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '` prints `# fail 0` and `# todo 0` (`# todo 1` on a branch without S1). B, for a step that edits `BACKLOG.md`: `node scripts/backlog.mjs roadmap` in the same commit, then `npm run backlog` prints the `ok — ROADMAP.md …` line. Never hand-edit `ROADMAP.md`.
- **New tests** go directly after the existing test for the same module (anchors given per step), never at the end of a file; the title carries the substring the Verify filters on.
- **CHANGELOG** entries go under `## [Unreleased]`, as the **first** bullet of the named subsection (so parallel branches conflict only on adjacent lines), and name their `TH-n`.
- **Prose**: British-leaning spelling, em-dashes, no marketing filler, no emoji (`CLAUDE.md:116-117`). Numbers with thousands separators (`9,500`).
- **Code style**: no semicolons, single quotes, two-space indent, arrow helpers — as in every `bin/lib/*.mjs`. Comments say *why*, dated where a fact is measured.
- Every Verify block starts with `R=$(git rev-parse --show-toplevel); d=$(mktemp -d)` and runs from the repository root. `grep -c` exits 1 when it prints `0`; that is expected where `0` is the answer.
- One commit per step; the commit message names the step and `TH-n`. No attribution trailer.

---

### From the S8-S11 planning session
Part one's table and conventions apply unchanged (gates G and B, test placement and titles,
CHANGELOG as the **first** bullet of its subsection, code style, one commit per step with
no attribution trailer). These rows are what S8-S11 need on top:

| Fact | Where |
|---|---|
| `replacementOutput(harness, original, stdout, stderr, note)`: Codex branch `:69-76` returns `{decision: 'block', reason, systemMessage: note}`; Claude Code branch `:77-90` rebuilds the tool's own shape by `original.shape` | `bin/lib/harness.mjs:67-91` |
| The handler's note is `trimhook: <E> characters elided[, <C> in repeated lines] from this result[; the whole output is at <path>].`; the reply is the last statement | `bin/lib/handlers.mjs:54-56` |
| `DEFAULTS.codex` is `{ replace: false }` on one line; `RULES['codex.replace']` `:82`; `REPO_CLASS` (S7) lists every `RULES` key, a missing one is `denied` and fails S7's "every key has a class" test | `bin/lib/config.mjs:18,74-87`; part one S7 |
| `doctor`: harness line `:16-17`; data dir `:18-25`; config and problems `:26-29` (each problem → `  BAD   config: <problem>`); settings line `:30`; tools, collapse, perCommand `:31-33`; the harness-cap block `:34-36`; Codex warning `:37`; audit warning `:38`; S6 adds the `log:` warning after `:38` | `bin/lib/doctor.mjs:7-40` |
| `summarize` `:4-27`, `k` (thousands separator) `:29`, `render` `:30-41`, `report(dir)` `:43`; S6 adds `flags` and `flagLine` | `bin/lib/report.mjs` |
| `trimResult({stdout, stderr}, {cap, head, minSaving}, path)` → `null` or `{stdout, stderr, before, after, elided}`; `null` when `total <= cap` or `total - cap < minSaving` (`:56`); snap slack 200 (`:21-28`); `room = Math.max(200, budget - markerLength)` (`:34`); stderr floor `Math.floor(cap * 0.2)` (`:48`). On a body of one character repeated, the synthetic `after` equals the cap exactly | `bin/lib/trim.mjs` |
| The sweep's synthetic body: `trimResult({stdout: 'x'.repeat(chars), stderr: ''}, {cap, head: DEFAULTS.head, minSaving: DEFAULTS.minSaving}, '/data/spill/s/t.txt')` | `evals/local.mjs:270-289` (`:279`) |
| `evals/results/2026-09-23-local.json`: `claude {sessions 142, results 28785}`, `codex {sessions 8, results 15}`, `table[]` of `{cap, results 28800, trimmed, before 28758748, after, saved, savedShare}` — trimmed 807 / 289 / 134 / 67 and saved 4,678,275 / 1,960,876 / 957,401 / 467,423 at 4,000 / 8,000 / 12,000 / 16,000 | the file |
| CLI: header comment `:4-9` is also `help` (`help()` prints `split('\n').slice(1, 9)`, `:116-118`); `cmd = process.argv[2]` `:25`; the `report` case `:134-139`; `check()`'s README block `:96-101` holds three regexes | `bin/trimhook.mjs` |
| `test/misc.test.mjs` imports `:1-12` (`spawn`; `readFileSync, utimesSync, writeFileSync`; `homedir`; `join`; `capFor, loadConfig`; `doctor`; `dataDir, detectHarnessSignal, readResponse, replacementOutput`; `render, summarize`; `pruneSpill, spill`; helpers); `BIN` `:14`; the doctor test `:105-113`; `run(args, stdin, env)` is a `const` at `:116-125`, so a test that calls it goes **after** that line | the file |
| `test/trim.test.mjs` imports `marker, splitBudget, trimResult, trimText` and `lines`; the split test `:31-40` | the file |
| The CI handler block: `ci.yml:32` is `- run: \|`, `:33-42` its script; `:40` asserts `s.length<=8000` on Claude Code; `:41-42` require Codex to print nothing (opt-in) | `.github/workflows/ci.yml` |
| Both hooks files set `"timeout": 5` | `hooks/hooks.json:8`, `codex/hooks.json:8` |
| Codex 0.155.1 `PostToolUse` input keys: `session_id, turn_id, transcript_path, cwd, hook_event_name, model, permission_mode, tool_name, tool_input, tool_response, tool_use_id`; `tool_response` a string; `decision: block` logged as a failed call, `systemMessage` dropped; `max_output_tokens` truncates before the hook | `01-research.md:232-241` |
| `bashOutputMaxChars`: top-level, positive integer, any of four settings files, highest level wins (managed, `--settings`, `.claude/settings.local.json`, `.claude/settings.json`, `~/.claude/settings.json`), clamped 4,000-128,000, makes `BASH_MAX_OUTPUT_LENGTH` ignored; managed file paths re-read 2026-09-29 (S11) | `01-research.md:243-247` |
| README anchors (before S1-S7): "Why a hook" `:20-26`; the table row `:42`; the split paragraph `:50-51`; "Fail-open" `:53`; Codex install `:75-82`; `doctor` `:84-86`; config block `:94-107`; "What the transcripts say" `:130-150`; `### It is not only Bash` `:152` | `README.md` |
| CLAUDE.md anchors: rule 5 `:62-64`; rule 8 `:70-71`; Claude Code facts `:75-82`; Codex facts `:84-93`; "Verifying a change" `:95-109` | `CLAUDE.md` |
| CONTRIBUTING item 2 **Live** `:25-29`; BACKLOG TH-10 `:74-77` | the files |

---

### From the S12-S15 planning session
Parts one and two apply unchanged (gates G and B, test placement, CHANGELOG as the
**first** bullet of its subsection, prose and code style, one commit per step with no
attribution trailer). These rows are what S12-S15 need on top:

| Fact | Where |
|---|---|
| `print-hooks` prints `codex/hooks.json` with `${PLUGIN_ROOT}/bin/trimhook.mjs` replaced by the **absolute** path of the checkout it runs from — so the Codex hook runs whatever that checkout holds at the moment, branch switches included | `bin/trimhook.mjs:140-147` |
| The Codex hook matches `Bash\|Read\|WebFetch`, `"timeout": 5` | `codex/hooks.json:6-8` |
| The log rotates at 8 MB: `results.jsonl` → `results.1.jsonl`; `readRecords` (and so `report`) reads only those two names — a renamed file is out of every count | `bin/lib/store.mjs:16,23,29` |
| The data dir is `TRIMHOOK_DATA`, else `~/.trimhook`; `doctor` prints it | `bin/lib/harness.mjs:32-34`; `bin/lib/doctor.mjs:18-25` |
| `evals/reads.mjs` finds transcripts under `homedir()` (`HOME` on POSIX), follows symlinks (`statSync`, depth < 4), has **no date filter**, and `--json` writes under the script's own `evals/results/`, not under `HOME` | `evals/reads.mjs:32,42-58,159-164`; part one S4 (A4) |
| `isSpillRead` compares the marker's absolute spill path with the `Read` path or the Bash command text — it never expands `~` and never calls `homedir()`, so a scan under an overridden `HOME` counts the same reads | part one S4, `isSpillRead` |
| `99-progress.md` has a `## Step status` table (`:11-20`, one row per step) and a `## Verifications run` table (`:67-72`, columns Command · When · Result); both still hold template rows until Implement replaces them | `thoughts/TH-1-output-hygiene/99-progress.md` |
| A ticked backlog trailer reads `<!-- th: prio=high size=S labels=hook,tests ver=main -->` — `ver=main` appended inside the comment | `BACKLOG.md:50,53` (examples) |
| TH-9 and TH-10 sit under `## v0.1.0 — One cut, one number` (`:27`); TH-1 at `:37-46` carries a `**State, <date>:**` sentence | `BACKLOG.md` |
| Release runbook: bump four manifests, rename `[Unreleased]` to `[x.y.z] — date`, every `ver=main` → `ver=x.y.z`, tag `trimhook--v{version}` on the merge commit | `CONTRIBUTING.md:76-100` |
| The end-to-end paragraph names the default ("prints more than 8,000 characters (`seq 1 5000`)") and the Codex opt-in (`codex.replace: true` in `~/.trimhook.json`) | `CLAUDE.md:104-109` |
| Rule 7 (every README number measured and dated) and rule 8 (Codex replacement opt-in until verified live) | `CLAUDE.md:66-71` |
| `### It is not only Bash` says its table is "the share the cut would take at the default cap (2026-09-23)" — measured at 8,000 | `README.md:152-156` |
| `seq 1 5000` prints 23,892 characters and `seq 1 6000` 28,893: both are over 13,500, so both are cut at every rung of the ladder | arithmetic; `01-research.md` Addendum item 3 for 28,893 |
| Tests whose inputs or bounds assume the **default** cap of 8,000 (numbers before S1-S11): `assert.equal(bad.cfg.cap, 8000)` `test/misc.test.mjs:30`; `BASH_MAX_OUTPUT_LENGTH: '4000'` expecting the `is below` warning `test/misc.test.mjs:109-110`; e2e `<= 8000` `test/misc.test.mjs:132`; `<= 8000` at `test/handlers.test.mjs:21,86,130,146,206`; `input('x'.repeat(8500))` "Over the cap, but under minSaving" `test/handlers.test.mjs:179-180`; `'a repeated line of output\n'.repeat(400)` (10,400 characters, collapse off, must be cut) `test/handlers.test.mjs:110`. Pinned already (write `cap: 8000` in their user file): S8's Codex handler test, S11's two `bashOutputMaxChars` tests. `test/trim.test.mjs` passes explicit caps throughout | the files; part two, Interfaces |

**Conventions added here:**

- A human step's record is data, not prose: every cell is a count, a yes/no, a version or
  a date. No path under a home directory, no session id, no command text beyond the
  protocol's own `seq 1 6000`, no model reply text beyond `1` and `6000`.
- The **privacy grep** — run over what a step here is about to commit (staged), it must
  print nothing:
  `git diff --cached -U0 | grep -E '^\+[^+]' | grep -nE '/Users/|/home/|/var/folders/|/tmp/|rollout-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-'`.
- A human step is committed on its own branch off `main` and lands through a pull request
  (`main` is protected); an agent may prepare the branch and run the checks, and commits
  only when the maintainer says so.

---

---

## S1 · A read of a spill file comes back whole (TH-26)

Implements D9 and D7's `spillRead` flag.

### Files touched

| Path | Action |
|---|---|
| `bin/lib/store.mjs` | modify — new exported `readsSpill` |
| `bin/lib/handlers.mjs` | modify — the exemption, `deps.home` |
| `test/handlers.test.mjs` | modify — the `todo` at `:211-221` becomes a test, five more after it |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `BACKLOG.md`, `ROADMAP.md` | modify (ROADMAP regenerated) |

### Changes

#### `bin/lib/store.mjs`

**Where:** directly after `spillPath` (`:42-44`). Change the import at `:6` to
`import { dirname, join, resolve, sep } from 'node:path'`.

**What to add:**

```js
// TH-26 (D9): does this tool use read a spill file back? Such a read comes back whole —
// cutting it again would write a copy of a copy and leave the middle unseen (rule 3).
// String tests only: no realpath, so /tmp for /private/tmp or $HOME/… is missed and cut.
export function readsSpill({ dir, home, cwd, tool, input }) {}
```

**Expected behaviour:**
1. `root = resolve(dir, 'spill')`.
2. `tool === 'Read'`: `p = input?.file_path`; if not a non-empty string return `false`;
   return `resolve(typeof cwd === 'string' ? cwd : sep, p).startsWith(root + sep)`.
3. `tool === 'Bash'`: `c = input?.command`; if not a string return `false`; return `true`
   when `c.includes(root)`; else, when `typeof home === 'string' && home.length > 1 &&
   root.startsWith(home + sep)`, return `c.includes('~' + root.slice(home.length))`
   (e.g. `~/.trimhook/spill`); else `false`. Erring broad is deliberate: an over-wide
   Bash match costs tokens only, a miss breaks rule 3.
4. Any other tool — `WebFetch` included — returns `false`.
5. Never throws for any `input` shape (`null`, a number, missing keys).

**Do NOT touch:** `spillPath`, `writeSpill`, `spill` — the marker's path format is what
`MARKER_RE` and every eval match.

#### `bin/lib/handlers.mjs`

**Where:** imports `:3-7`; `deps` at `:10`; the block between `:20` (`const cap = …`) and `:21` (the TH-24 comment).

**What to change:**
1. Add `import { homedir } from 'node:os'` and add `readsSpill` to the `./store.mjs` import at `:6`.
2. `:10` becomes `deps = { env: process.env, now: Date.now, home: homedir(), ...deps }`.
3. **Move** `const before = …` (`:24`) and `const record = …` (`:32`) up, unchanged, to
   directly after `:20`, in that order. Nothing between them depends on anything they do not
   already have (`input`, `harness`, `cfg`, `command`, `cap`, `deps.now`).
4. Directly after the moved `record`, insert:

```js
  // TH-26 (D9): a read of a spill file is exempt — whatever mode, spill or harness say.
  if (readsSpill({ dir, home: deps.home, cwd: input.cwd, tool: input.tool_name, input: input.tool_input })) {
    appendRecord(dir, { ...record, outcome: 'kept', after: before, spillRead: true })
    return null
  }
```

**Expected behaviour:** a `Read` under `<dir>/spill/` or a Bash command naming that
directory returns `null` (the harness keeps the result byte for byte) and appends exactly
one record `{at, session, harness, mode, tool, command, before, cap, outcome: 'kept', after: before, spillRead: true}`
— `command` is `commandPrefix(...)`, so for `sed -n 1,9p /x/spill/…` it is `sed`, never
the path. No spill file is written, no prune runs. Every other result flows exactly as
before: same records, same replies.

**Do NOT touch:** `:14` (the tool filter runs first — a tool not in `cfg.tools` never
reaches the check), `:36-56`, `commandPrefix`.

#### Docs

- `README.md:31-34` (the "Spills the whole output" bullet): after "if the file cannot be
  written, the result is left whole." append the sentence:
  `A Read of that file, or a Bash command that names it (sed -n 1400,1600p <path>, grep, cat), comes back whole: a spill is never cut again.`
  — with `Read`, `sed -n 1400,1600p <path>`, `grep`, `cat` in backticks; rewrap to the
  paragraph's ~90-column width.
- `CLAUDE.md:56-59` (rule 3): after "leaves no copy on disk." append
  `And a read of a spill file — a Read under <data>/spill/, or a Bash command naming it — comes back whole, never cut again (TH-26).`
  (`Read` and `<data>/spill/` in backticks.)
- `CHANGELOG.md`, first bullet under `### Fixed` (`:31`):
  `- A read of a spill file comes back whole. Since TH-12 a Read is cut like a Bash result, so the model's read of the spill — the file that exists so it can see the middle — was cut again, a second spill written and the middle still unseen. A Read whose path lies under <data>/spill/, and a Bash command that names that directory (absolute, or ~/…), now pass through whole and are logged kept with spillRead: true; WebFetch is never exempt (TH-26).`
  (code spans on `Read`, `<data>/spill/`, `~/…`, `kept`, `spillRead: true`, `WebFetch`; wrapped.)
- `BACKLOG.md:124-135` (TH-26): `- [ ]` → `- [x]`; keep the text up to "…line 1,500 is
  still not visible." then replace everything from "The same happens to a `cat`…" to
  "…a passing test." with:
  `The same happened to a cat, sed or grep of the spill in Bash. Fixed by TH-1's D9: a Read whose file_path, resolved against the hook's cwd, lies under <data>/spill/, and a Bash command containing that directory's path — absolute, or ~/… when the data dir is under home — come back whole and are logged kept with spillRead: true; WebFetch is never exempt. The reproduction is an ordinary test in test/handlers.test.mjs.`
  (code spans as usual), and the metadata becomes `<!-- th: prio=high size=S labels=hook ver=main -->`.
  Also change "and nothing exempts the spill directory" to "and nothing exempted the spill directory".
  Then `node scripts/backlog.mjs roadmap`.

### Tests

In `test/handlers.test.mjs`: replace the comment `:211-213` with
`// TH-26 (D9): a read of a spill file comes back whole — Read by path, Bash by naming the directory.`
and the test at `:214-221` with test 1 below; add tests 2-6 directly after it. Add
`basename, dirname` to the `node:path` import at `:3`. Every title starts `TH-26:`.

| Case | Input | Expected |
|---|---|---|
| 1 `TH-26: a Read of a spill file comes back whole, logged kept with spillRead` | `d=tmp()`; `postToolUse(input(lines(5000)), {env: env(d)})` → take `path` from the marker (as `:217`); then `postToolUse(input('', {tool_name: 'Read', tool_use_id: 'toolu_02', tool_input: {file_path: path}, tool_response: {type: 'text', file: {filePath: path, content: readFileSync(path,'utf8'), numLines: 5000, startLine: 1, totalLines: 5000}}}), {env: env(d)})` | returns `null`; `log(d)[1]` has `outcome 'kept'`, `spillRead true`, `tool 'Read'`, `command 'Read'`, `after === before === content.length`; `existsSync(join(d, 'spill', 's1', 'toolu_02.txt')) === false` |
| 2 `TH-26: a Bash sed -n of a spill path comes back whole` | after the first cut as in 1: `input(lines(5000), {tool_use_id: 'toolu_02', tool_input: {command: \`sed -n 1400,1600p ${path}\`}})` | `null`; last record `outcome 'kept'`, `spillRead true`, `command 'sed'`; no `toolu_02.txt` |
| 3 `TH-26: a Bash command naming the spill with ~/ comes back whole` | `d=tmp()`, deps `{env: env(d), home: dirname(d)}`; command `` `cat ~/${basename(d)}/spill/s1/toolu_01.txt` `` (the file need not exist), stdout `lines(5000)` | `null`; last record `spillRead true`. Same input with deps `home: '/nonexistent-home'` → a replacement (`out.hookSpecificOutput`) — the `~` form only counts when the data dir is under home |
| 4 `TH-26: a Read beside spill/ and a WebFetch naming a spill path are still cut` | `d=tmp()`; Read with `file_path: join(d, 'spill-notes.txt')`, content `lines(5000)`; WebFetch with `tool_input: {url: \`file://${join(d,'spill','s1','x.txt')}\`, prompt: join(d,'spill','s1','x.txt')}`, `tool_response: {bytes: 1, code: 200, codeText: 'OK', result: lines(5000), durationMs: 1, url: 'file://x'}` | Read: `u.file.content` matches `/characters elided/`; WebFetch: `u.result` matches `/characters elided/`; neither record has `spillRead` |
| 5 `TH-26: a relative Read path is resolved against the event's cwd` | `d=tmp()`; Read with `cwd: d`, `file_path: 'spill/s1/toolu_01.txt'`, content `lines(5000)` | `null`; last record `spillRead true` |
| 6 `TH-26: the exemption holds in audit mode and on Codex` | audit: `d=tmp()`, `env(d, {TRIMHOOK_MODE: 'audit'})`, Read of `join(d,'spill','s1','toolu_01.txt')` with content `lines(5000)`. Codex: `d2=tmp()`, `user.json` `{"codex":{"replace":true}}`, env `{TRIMHOOK_DATA: d2, PLUGIN_ROOT: '/codex-plugin', TRIMHOOK_USER_CONFIG: join(d2,'user.json')}`, `input(lines(5000), {turn_id: 't1', tool_input: {command: \`sed -n 1,9999p ${join(d2,'spill','s1','a.txt')}\`}, tool_response: lines(5000)})` | audit: `null`, last record `outcome 'kept'` (not `would-trim`), `spillRead true`; Codex: `null`, last record `spillRead true`, `harness 'codex'` |

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='TH-26' test/handlers.test.mjs 2>&1 | grep -E '^# (pass|fail|todo) '   # # pass 6, # fail 0, # todo 0
grep -n 'todo:' test/handlers.test.mjs                        # prints nothing
awk '/^## \[Unreleased\]/{u=1} /^## \[0\.1\.0\]/{u=0} u && /TH-26/' CHANGELOG.md   # one line
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1              # ok — ROADMAP.md is in step with BACKLOG.md
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '   # # fail 0, # todo 0
```

### Acceptance criteria

- [ ] The six `TH-26:` tests pass; the suite has no `todo`.
- [ ] Every pre-existing test passes unchanged (only `:211-221` was rewritten).
- [ ] G and B hold; README, CLAUDE.md, CHANGELOG, BACKLOG edited as above.

---

---

## S2 · An interrupted Bash result falls through; the README says what failures do

Implements D2.

### Files touched

| Path | Action |
|---|---|
| `bin/lib/harness.mjs` | modify — Bash branch `:54` |
| `test/misc.test.mjs` | modify — one test after `:44-50` |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md` | modify |

### Changes

#### `bin/lib/harness.mjs`

**Where:** the one-line Bash branch at `:54`.

**What:** make it a block that returns `null` when `r.interrupted === true`, otherwise the
same object it returns today:

```js
  if (typeof r.stdout === 'string' || typeof r.stderr === 'string') {
    // D2: an interrupted command's output is partial and documented as such
    // (`interrupted`, code.claude.com hooks, read 2026-09-23) — leave it as the harness gave it.
    if (r.interrupted === true) return null
    return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', rest: r, shape: 'bash' }
  }
```

**Expected behaviour:** `interrupted: true` → `null`; `interrupted: false`, absent, or any
non-`true` value → unchanged result. Read, WebFetch, `output` and string shapes are
unaffected (the check is inside the Bash branch only).

**Do NOT touch:** `:53` (images), `:58-65`, `replacementOutput` (`:69-91`, S8's).
No change to `hooks/` or `codex/`: no `PostToolUseFailure` entry (D2).

#### Docs

- `README.md:42`, the Effect column: replace the final sentence "Below the cap, or on an
  image result, or on any error: no output, the harness proceeds unchanged." with
  `Below the cap, on an image result, on an interrupted Bash result, or on anything trimhook cannot read: no output, the harness proceeds unchanged. A failed call never gets here — see below.`
- `README.md`, a new paragraph between `:51` ("…squeezed out by a long log.") and `:53`
  ("**Fail-open, always.**"), blank lines around it:
  `**What a failure does.** On Claude Code a tool call that fails — a Bash command that exits non-zero, a Read or WebFetch that errors — fires PostToolUseFailure instead of PostToolUse, with the error text and no tool_response: the model reads the harness's own error (for Bash, Exit code N and the output), and trimhook never sees it, so it neither cuts nor logs it. On Codex, PostToolUse runs after a non-zero exit too and the result carries no exit code, so a failing command there is trimmed by size like any other, with the stderr floor and the tail keeping its ending.`
  (code spans on `Read`, `WebFetch`, `PostToolUseFailure`, `PostToolUse`, `tool_response`, `Exit code N`, `stderr`.)
- `CLAUDE.md:82`: after "overridden by `bashOutputMaxChars`." append
  `A call that fails fires PostToolUseFailure instead — error and is_interrupt, no tool_response, additionalContext its only control — so trimhook never sees a failed call (read 2026-09-23).`
  (code spans on the four identifiers.)
- `CHANGELOG.md`, first bullet under `### Changed` (`:65`):
  `- An interrupted Bash result (interrupted: true) falls through untouched, and the README says what happens to a failing call: on Claude Code it fires PostToolUseFailure, which carries no output, so trimhook never sees it; on Codex a failing command is trimmed by size like any other. The README no longer says trimhook does nothing "on any error" — it never saw the error (TH-1, D2).`

### Tests

In `test/misc.test.mjs`, directly after the test ending at `:50`:

| Case | Input | Expected |
|---|---|---|
| `readResponse: an interrupted Bash result falls through` | `readResponse({stdout: lines(5000), stderr: '', interrupted: true, isImage: false})` | `null` |
| same test | `readResponse({stdout: 'a', stderr: '', interrupted: false, isImage: false})` | `.stdout === 'a'`, `.shape === 'bash'` |
| same test | `readResponse({stdout: 'a'})` (no `interrupted` key) | `.stdout === 'a'` |
| same test | `readResponse({stdout: 'a', interrupted: 'yes'})` | not `null` (only the boolean `true` counts) |

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='interrupted' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '   # # pass 1, # fail 0
grep -c 'or on any error: no output' README.md                 # 0
grep -c 'PostToolUseFailure' README.md CLAUDE.md               # README.md:1+ and CLAUDE.md:1+
git diff --quiet main -- hooks codex && echo unchanged         # unchanged
node bin/trimhook.mjs check                                    # ok — one hook, two harnesses, …
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
```

### Acceptance criteria

- [ ] The `interrupted` test passes; nothing else changes behaviour.
- [ ] `hooks/` and `codex/` untouched; `check` still passes (the README keeps "fails open" at `:53`).
- [ ] G holds.

---

---

## S3 · `check` forbids sibling strings in the workflows; the strays are fixed

Implements D8's negative grep and the `release.yml` wording.

### Files touched

| Path | Action |
|---|---|
| `bin/trimhook.mjs` | modify — import `:18`, new block in `check()` |
| `.github/workflows/backlog-issues.yml` | modify — `:6`, `:40` |
| `.github/workflows/release.yml` | modify — `:150` |
| `CLAUDE.md`, `CHANGELOG.md` | modify |

### Changes

#### `bin/trimhook.mjs`

**Where:** `:18` becomes `import { existsSync, readdirSync, readFileSync } from 'node:fs'`.
The new block goes after the social-preview block (`:106-108`, ends `}`) and before
`if (errors.length) {` (`:109`).

**What to add:**

```js
  // D8: the workflows are the one place a sibling project's name is never meant to be.
  // The docs name hookgate on purpose (it is the model this repo follows); CI text that
  // says HG-n is a copy-paste stray. The npm tarball has no .github, hence the guard.
  const wf = join(ROOT, '.github', 'workflows')
  if (existsSync(wf)) {
    for (const f of readdirSync(wf).filter((n) => n.endsWith('.yml')).sort()) {
      read(`.github/workflows/${f}`).split('\n').forEach((l, i) => {
        if (/hookgate|\bHG-/.test(l)) fail(`.github/workflows/${f}:${i + 1} names the sibling project (hookgate or an HG-n id) — this repository's ids are TH-n`)
      })
    }
  }
```

**Expected behaviour:** one `✗ .github/workflows/<file>:<line> names the sibling project …`
per offending line, exit 1; nothing outside `.github/workflows/*.yml` is scanned (README,
CLAUDE.md and CHANGELOG name hookgate on purpose); case-sensitive, exactly `hookgate|\bHG-`.

**Do NOT touch:** the README block `:96-101` (S9, S10 and S11 add to it), `checkHooksFile`.

#### Workflows

- `.github/workflows/backlog-issues.yml:6`: `HG-n` → `TH-n`.
- `.github/workflows/backlog-issues.yml:40`: `HG-n` → `TH-n`.
- `.github/workflows/release.yml:150`: "the hook trims Bash output over the cap" → "the hook trims Bash, Read and WebFetch output over the cap". Nothing else on the line changes.

#### Docs

- `CLAUDE.md`, a new paragraph after the code block that ends at `:102` and before "End to end in Claude Code" (`:104`):
  `check also fails when a workflow under .github/workflows/ names the sibling project (hookgate or an HG-n id): the docs name it on purpose, CI text never should.`
  (code spans on `check`, `.github/workflows/`, `hookgate`, `HG-n`.)
- `CHANGELOG.md`, first bullet under `### Fixed`:
  `- CI text named the sibling project: backlog-issues.yml spoke of HG-n ids, and the release notes said the hook "trims Bash output", stale since TH-12 added Read and WebFetch. Both fixed, and check now fails when a workflow names hookgate or an HG-n id (TH-1).`

### Tests

No `node --test` case: `check` is exercised by `npm test` itself, and the bite is proved
on a copy (Verify). The existing suite must stay green.

| Case | Input | Expected |
|---|---|---|
| clean tree | `node bin/trimhook.mjs check` | `ok — …`, exit 0 |
| stray in a workflow | a copy with `# HG-1` appended to `ci.yml` | `✗ .github/workflows/ci.yml:<n> names the sibling project …`, exit 1 |
| `hookgate` in a workflow | a copy with `# see hookgate` appended to `pages.yml` | a `✗` line naming `pages.yml`, exit 1 |
| docs untouched | the clean tree, where README/CLAUDE.md/CHANGELOG name hookgate | still `ok` |

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
grep -nE 'hookgate|\bHG-' .github/workflows/*.yml             # prints nothing
grep -c 'trims Bash, Read and WebFetch output' .github/workflows/release.yml   # 1
node bin/trimhook.mjs check                                    # ok — …
cp -R "$R" "$d/r" && printf '# HG-1\n' >> "$d/r/.github/workflows/ci.yml" && node "$d/r/bin/trimhook.mjs" check; echo "exit $?"   # ✗ … ci.yml … / exit 1
d2=$(mktemp -d); cp -R "$R" "$d2/r" && printf '# see hookgate\n' >> "$d2/r/.github/workflows/pages.yml" && node "$d2/r/bin/trimhook.mjs" check; echo "exit $?"   # ✗ … pages.yml … / exit 1
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
```

### Acceptance criteria

- [ ] No workflow line matches `hookgate|\bHG-`; `release.yml:150` names the three tools.
- [ ] Both bite commands exit 1 with a `✗` line naming the file.
- [ ] G holds.

---

---

## S4 · `evals/reads.mjs` counts re-reads for three tools and both harnesses

Implements D6 (a)-(f), plus the mechanical D3 verdict line.

> **Assumption (maintainer to confirm) — A1.** The 0.2.0 release does not wait for TH-10;
> changing the default cap (S15) lands in a later minor. No S1-S7 step edits TH-10's
> "**Gates the release.**" (`BACKLOG.md:77`); S9 rewrites that item.
>
> **Assumption (maintainer to confirm) — A2.** `evals/reads.mjs` prints per-tool rates and
> a mechanical verdict line for the D3 rule; the maintainer confirms the verdict before
> the default changes. The rule's prose goes into the README in S9; this step implements
> its arithmetic only.
>
> **Assumption (maintainer to confirm) — A3, `function_call_output` counts in D6 (f).**
> The Codex walk treats `function_call`/`function_call_output` exactly like
> `custom_tool_call`/`custom_tool_call_output`. Reason: a cut is defined by the marker, not
> by the record type (D6's reason for sharing `MARKER_RE`: one definition of a cut);
> `evals/local.mjs:258` already counts both as tool outputs, so the two scripts see one
> population; and a Codex release that moves the shell tool from one record type to the
> other must not zero the instrument. A false cut needs `MARKER_RE`'s exact text inside a
> tool output, which only trimhook writes.
>
> **Assumption (maintainer to confirm) — A4, how the script is tested (Structure note 3).**
> `test/reads.test.mjs` writes a fixture home in a temp dir and runs the script with
> `spawnSync(process.execPath, [script, ...args], {env: {PATH: process.env.PATH, HOME: home}, encoding: 'utf8'})`.
> `os.homedir()` honours `HOME` on POSIX (macOS, Linux; CI is Ubuntu), so the script needs
> no new flag. The test never passes `--json`, so it never writes `evals/results/`.

### Files touched

| Path | Action |
|---|---|
| `evals/reads.mjs` | modify — header, scan, Codex walk, counting, output, JSON |
| `test/reads.test.mjs` | new |
| `CONTRIBUTING.md`, `CHANGELOG.md` | modify |

### Changes

#### `evals/reads.mjs`

**Header (`:6-10`)** becomes (keep `:1-5` and `:11-23`, adding one usage note):

```
// what it does next. Two signs, both in the transcript, counted per tool:
//
//   read     a later `Read` whose file_path is the spill file the marker named, or a
//            Bash command — or a Codex call's input — that contains that path
//   re-run   the same call made again after the cut: the same command for Bash, the same
//            file_path for Read (whatever its offset), the same url for WebFetch, the
//            same input on Codex — the model paying twice for what it could read once
//
// Claude Code transcripts (~/.claude/projects) and Codex sessions (~/.codex/sessions)
// are both walked; on Codex a cut is the marker inside a custom_tool_call_output or a
// function_call_output. The last lines apply TH-10's rule (D3) mechanically; a human
// confirms the verdict before the default cap changes.
```

**Constants**, after `WINDOW` (`:40`):

```js
// D3's subset: the cuts 8,000 would also have made — post-collapse size at least the
// 8,000 cap plus the 1,500 minSaving (trim.mjs:56). Fixed on purpose: it names the
// 8,000 rung of the rule, not whatever DEFAULTS.cap is today.
const SUBSET = 8000 + 1500
const FLOOR = 20 // D3: a tool with fewer cuts than this is unmeasured and does not vote
const LIMIT = 0.1 // D3: 10%
const MARKER_G = new RegExp(MARKER_RE.source, 'g')
```

**New and replaced functions** (replace `scan()` `:60-98`; the shapes are the decision):

```js
// Use = { at, name, cmd, path, url }   — cmd '' unless Bash/Codex; path, url null unless set
// Cut = { at, tool, elided, size, spill, cmd, path, url }
function markers(text) {}        // → { elided, size, spill } | null
function scanClaude(file) {}     // → { harness: 'claude', uses: Use[], cuts: Cut[] }
function scanCodex(file) {}      // → { harness: 'codex', uses: Use[], cuts: Cut[] }
function isSpillRead(u, spill) {}  // → boolean
function isRerun(u, cut) {}        // → boolean
function verdict(byTool) {}        // → { cap: 4000 | 8000 | 12000 | null, voting: string[], unmeasured: string[] }
```

**Expected behaviour:**

1. `markers(text)`: every `MARKER_G` match (D6 (c)); `null` when none. `elided` = sum of
   group 1, `size` = sum of group 2 (commas stripped, `Number`), `spill` = the first
   non-empty group 3 or `null`. One result is one cut, however many markers it carries.
2. `scanClaude(file)`: as `scan()` today (read, split, `JSON.parse` per line, skip
   failures, `e.message.content` array), plus: an `index` `Map` of `tool_use.id` → `at`;
   each `tool_use` pushes `{at: uses.length, name: c.name, cmd: c.name === 'Bash' ? String(c.input?.command ?? '') : '', path: c.input?.file_path ?? null, url: c.input?.url ?? null}`;
   each `tool_result` builds `text` as `:89` does, calls `markers(text)`, and on a hit
   pushes `{at, tool: uses[at]?.name ?? 'Bash', ...markers, cmd, path, url}` where
   `at = index.get(c.tool_use_id) ?? uses.length - 1` and `cmd/path/url` are copied from
   `uses[at]` (the cut's own call — this also fixes parallel tool uses, where the last use
   was not the one answered).
3. `scanCodex(file)`: per line `p = e.payload ?? e`.
   - `p.type === 'custom_tool_call'` → use `{at, name: 'Bash', cmd: String(p.input ?? ''), path: null, url: null}`;
     `p.type === 'function_call'` → the same with `cmd: String(p.arguments ?? '')`;
     `index.set(p.call_id, at)`. (`name: 'Bash'`: Codex has been seen to send the hook
     only `tool_name: "Bash"`, Addendum item 3.)
   - `p.type === 'custom_tool_call_output' || p.type === 'function_call_output'` → text:
     an array → `map((x) => (typeof x === 'string' ? x : (x?.text ?? ''))).join('\n')`;
     a string that `JSON.parse`s to an object with a string `output` → that `output`
     (the escaped JSON envelope would hide the marker's newlines); any other string →
     itself; anything else → `''`. On a `markers` hit push a cut with `tool: 'Bash'`,
     `at = index.get(p.call_id) ?? uses.length - 1`, `cmd` from `uses[at]`.
4. `isSpillRead(u, spill)` (D6 (a)): `!!spill && ((u.name === 'Read' && u.path === spill) || (u.name === 'Bash' && u.cmd.includes(spill)))`.
5. `isRerun(u, cut)` (D6 (b)): `u.name === cut.tool` and — Bash: `cut.cmd !== '' && u.cmd === cut.cmd`;
   Read: `cut.path != null && u.path === cut.path`; WebFetch: `cut.url != null && u.url === cut.url`;
   any other tool: `false`.
6. Counting (replaces `:100-132`), per session from both walks
   (`files(join(homedir(), '.claude', 'projects'), '.jsonl')` → `scanClaude`,
   `files(join(homedir(), '.codex', 'sessions'), '.jsonl')` → `scanCodex`), cuts in order:
   - **(e) skip**: a cut whose own use `uses[cut.at]` satisfies `isSpillRead(uses[cut.at], c.spill)`
     for any **earlier** cut `c` of the same session, counted or skipped, is not counted anywhere except
     `skipped++`.
   - `after = uses.slice(cut.at + 1)`, `window = after.slice(0, WINDOW)`;
     `read = window.some((u) => isSpillRead(u, cut.spill))`;
     `late = !read && after.some((u) => isSpillRead(u, cut.spill))`;
     `rerun = window.some((u) => isRerun(u, cut))`; `sub = cut.size >= SUBSET`.
   - Totals: `cuts`, `elided += cut.elided`, `readBack` (read), `readBackLate` (late),
     `reran` (rerun), `byHarness[harness]++` (keys `claude`, `codex`, both present from 0),
     `subset.{cuts, reads, reruns}` when `sub`.
   - `byTool[cut.tool] = {cuts, reads, reruns, subset: {cuts, reads, reruns}}` — `reads`
     and `reruns` count the window only (D6 (d)).
   - `byCommand` key: Codex → `'(codex)'`; Claude Bash → `commandPrefix(cut.cmd)`; any
     other tool → `cut.tool`. Value `{cuts, reads, reruns}`, reads window-only (fixes `:128`).
   - `sessions` counts sessions with at least one counted cut.
7. `verdict(byTool)`: `rate = (b) => (b.cuts ? (b.reads + b.reruns) / b.cuts : 0)` — D3's
   "spill reads + re-runs over its cuts", literally (a cut with both counts twice; the
   conservative direction). `voting` = tools with `cuts >= FLOOR`, in the order Bash,
   Read, WebFetch, then others alphabetically; `unmeasured` = the rest of
   `['Bash', 'Read', 'WebFetch']` ∪ seen tools, same order. `cap`: `null` when `voting` is
   empty; `4000` when every voting tool has `rate(b) <= LIMIT && rate(b.subset) <= LIMIT`;
   else `8000` when every voting tool has `rate(b.subset) <= LIMIT`; else `12000`. An
   empty subset has rate 0.
8. Output (replaces `:134-157`). First line unchanged:
   `## What the model did after a cut (TH-10, window ${WINDOW})`, then `''`. With no
   counted cut: the existing "No cut found …" line (`:143`), unchanged, and nothing else.
   Otherwise, in this order (`k`/`pct` as `:134-135`):
   - `` `- ${k(cuts)} cuts across ${k(sessions)} sessions (${k(byHarness.claude)} on Claude Code, ${k(byHarness.codex)} on Codex), ${k(elided)} characters elided.` ``
   - only when `skipped`: `` `- ${k(skipped)} more cuts were themselves reads of a spill (transcripts from before TH-26) and are not counted.` ``
   - `` `- Read back within the window: ${k(readBack)} (${pct(readBack, cuts)}); later than that: ${k(readBackLate)} (${pct(readBackLate, cuts)}).` `` (unchanged)
   - `` `- Same call made again within the window: ${k(reran)} (${pct(reran, cuts)}).` ``
   - `''`, `'| Tool | Cuts | Read the spill | Ran it again | Re-read rate | Cuts ≥ 9,500 | Re-read rate ≥ 9,500 |'`,
     `'|---|---:|---:|---:|---:|---:|---:|'`, one row per `byTool` entry in the voting order:
     `` `| ${t} | ${k(b.cuts)} | ${k(b.reads)} | ${k(b.reruns)} | ${pct(b.reads + b.reruns, b.cuts)} | ${k(b.subset.cuts)} | ${pct(b.subset.reads + b.subset.reruns, b.subset.cuts)} |` ``
   - `''`, then the verdict line — with `cap`:
     `` `- D3 rule, for a week run at cap 4,000: default ${k(cap)} (voting: ${voting.join(', ')}${unmeasured.length ? `; unmeasured, under 20 cuts: ${unmeasured.join(', ')}` : ''}). Mechanical — the maintainer confirms it before the default changes.` ``;
     without: `` `- D3 rule: no verdict — no tool has 20 cuts (unmeasured: ${unmeasured.join(', ')}).` ``
   - `''`, the command table `:150-152` unchanged, `''`, the closing sentence `:154` unchanged.
9. `--json` (`:159-164`): same file name and location; the object becomes
   `{at, window, subsetMin: SUBSET, floor: FLOOR, sessions, byHarness, cuts, skipped, elided, readBack, readBackLate, reran, subset, byTool, byCommand, verdict: verdict(byTool)}`
   (`byTool`, `byCommand` as plain objects).

**Do NOT touch:** `files()` (`:42-58`), the `--window` parsing (`:33-40`), the default
window of 12, the imports of `MARKER_RE` and `commandPrefix`. Do not import `marker`: the script only reads markers.

#### Docs

- `CONTRIBUTING.md:26-29`: replace "The second number that matters is how often the model
  went and read a spill file — grep the transcripts for `spill/` in `Read` tool inputs."
  with
  `The second number that matters is what the model did after a cut: node evals/reads.mjs counts, per tool and on both harnesses, the reads of a spill file and the same call made again within the next 12 tool uses, and prints the rule's verdict line for a human to confirm.`
  (code span on `node evals/reads.mjs`.) Keep "A cap that is never followed by a read can drop; one that is read often is too low."
- `CHANGELOG.md`, first bullet under `### Changed`:
  `- evals/reads.mjs counts per tool and on both harnesses: a spill read is a Read of the spill or a Bash command containing its path; a re-run is the same command, file or URL; every marker in a result counts toward its size, and the cuts of 9,500 characters or more — the ones 8,000 would also make — are counted apart; Codex sessions are walked too, custom and function tool outputs alike. It ends with the D3 verdict line, which a human confirms (TH-1, TH-10).`

### Tests — `test/reads.test.mjs` (new)

Imports: `assert` from `node:assert/strict`; `spawnSync` from `node:child_process`;
`mkdirSync, writeFileSync` from `node:fs`; `join` from `node:path`; `test` from `node:test`;
`marker` from `../bin/lib/trim.mjs`; `tmp` from `./helpers.mjs`. Module-level helpers:

```js
const SCRIPT = new URL('../evals/reads.mjs', import.meta.url).pathname
// os.homedir() honours HOME on POSIX; CI runs on Ubuntu. The real ~/.claude is never read.
const run = (home, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH, HOME: home }, encoding: 'utf8' })
const use = (id, name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } })
const result = (id, text) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: text }] } })
const cut = (spill, elided = 21000, total = 29000) => `head${marker(elided, total, spill)}tail`
const claude = (home, name, entries) => { const p = join(home, '.claude', 'projects', 'p'); mkdirSync(p, { recursive: true }); writeFileSync(join(p, `${name}.jsonl`), entries.map((e) => JSON.stringify(e)).join('\n')) }
const codex = (home, entries) => { const p = join(home, '.codex', 'sessions', '2026', '09', '28'); mkdirSync(p, { recursive: true }); writeFileSync(join(p, 'rollout-1.jsonl'), entries.map((e) => JSON.stringify({ type: 'response_item', payload: e })).join('\n')) }
```

`S = '/h/.trimhook/spill/s/t1.txt'` below (no file needs to exist). Every title starts `reads:`.

| Case | Input | Expected (on `run(home).stdout`, `status 0`) |
|---|---|---|
| (a) `reads: a Read of the spill and a Bash sed of it both count as spill reads` | session `a`: `use('t1','Bash',{command:'npm test'})`, `result('t1', cut(S))`, `use('t2','Read',{file_path:S})`, `result('t2','x')`; session `b`: same cut with spill `S2='/h/.trimhook/spill/s/t2.txt'`, then `use('t2','Bash',{command:\`sed -n 1,10p ${S2}\`})` | contains `Read back within the window: 2 (100.0%)` |
| (b) `reads: a re-run is the same command, file or URL for its own tool` | one session: Read cut (`use('r1','Read',{file_path:'/a/big.ts'})`, `result('r1', cut(null))`), `use('r2','Read',{file_path:'/a/big.ts',offset:100})`; WebFetch cut (`use('w1','WebFetch',{url:'https://e.x/a'})`, `result('w1', cut(null))`), `use('w2','WebFetch',{url:'https://e.x/a'})`; Bash cut `npm test`, then `use('b2','Bash',{command:'npm test -- --grep x'})` | contains `Same call made again within the window: 2 (66.7%)` |
| (c) `reads: every marker in a result counts toward its size` | one session: `use('t1','Bash',{command:'npm test'})`, `result('t1', \`h${marker(3000, 6000, S)}m${marker(2000, 4000, S)}t\`)` (size 10,000); `use('t2','Bash',{command:'npm run build'})`, `result('t2', cut(S, 1000, 9000))` (size 9,000) | contains `2 cuts across 1 sessions (2 on Claude Code, 0 on Codex), 6,000 characters elided.` and the row `\| Bash \| 2 \| 0 \| 0 \| 0.0% \| 1 \| 0.0% \|` |
| (d) `reads: buckets are the tool for Read and WebFetch and the command prefix for Bash, window only` | `use('g','Bash',{command:'git log --oneline'})`, `result('g', cut(S))`; 13 uses `use(\`e${i}\`,'Bash',{command:\`echo ${i}\`})` for `i` 1-13; `use('late','Read',{file_path:S})`; then `use('rb','Read',{file_path:'/a/big.ts'})`, `result('rb', cut(null))` | contains `later than that: 1 (50.0%)`, the rows ``\| `git log` \| 1 \| 0 \| 0 \|`` and ``\| `Read` \| 1 \| 0 \| 0 \|`` |
| (e) `reads: a cut that is itself a read of a spill is not counted` | Bash cut spill `S`; `use('t2','Read',{file_path:S})`, `result('t2', cut('/h/.trimhook/spill/s/t2.txt'))` | contains `1 cuts across 1 sessions`, `1 more cuts were themselves reads of a spill`, `Read back within the window: 1 (100.0%)` |
| (f) `reads: Codex sessions are walked, custom and function tool outputs alike` | `codex(home, [...])`: `{type:'custom_tool_call',call_id:'c1',name:'exec',input:'seq 1 6000'}`, `{type:'custom_tool_call_output',call_id:'c1',output:[{type:'input_text',text:'Script completed'},{type:'input_text',text:cut(S)}]}`, `{type:'custom_tool_call',call_id:'c2',name:'exec',input:\`sed -n 1,5p ${S}\`}`, `{type:'function_call',call_id:'f1',name:'shell',arguments:'{"command":["cat","big.log"]}'}`, `{type:'function_call_output',call_id:'f1',output:JSON.stringify({output:cut('/h/.trimhook/spill/s/f1.txt'),metadata:{exit_code:0}})}`, `{type:'function_call',call_id:'f2',name:'shell',arguments:'{"command":["cat","big.log"]}'}` | contains `(0 on Claude Code, 2 on Codex)`, `Read back within the window: 1 (50.0%)`, `Same call made again within the window: 1 (50.0%)`, the row ``\| `(codex)` \| 2 \| 1 \| 1 \|`` |
| (g) `reads: the D3 verdict picks 4,000, 8,000 or 12,000` | three homes, each one session of 20 Bash cuts `use(\`c${i}\`,'Bash',{command:\`build --step ${i}\`})` + `result(\`c${i}\`, cut(\`/h/.trimhook/spill/s/c${i}.txt\`, T - 8000, T))`, a spill read `use(\`r${i}\`,'Read',{file_path: that spill})` right after the chosen cuts. Home 1: all `T=29000`, reads after cuts 0 and 1 (2 of 20 = 10.0%). Home 2: cuts 0-9 `T=29000` no reads, cuts 10-19 `T=9000` with reads after 10, 11, 12 (15%; subset 0%). Home 3: all `T=29000`, reads after 0, 1, 2 (15%) | home 1 matches `/D3 rule, for a week run at cap 4,000: default 4,000 \(voting: Bash; unmeasured, under 20 cuts: Read, WebFetch\)/`; home 2 `default 8,000`; home 3 `default 12,000` |
| (h) `reads: an empty home prints the no-cut line, no verdict, and exits 0` | `run(tmp())` | `status 0`; contains `No cut found`; does not contain `D3 rule` |

Each case writes its own `home = tmp()`; (a) writes two session files (`a`, `b`), every
other case one. In (g) the uses run `c0, [r0], c1, [r1], …, c19`, a bracketed read only
after the cuts named.

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap test/reads.test.mjs 2>&1 | grep -E '^# (pass|fail) '   # # pass 8, # fail 0
HOME=$d node evals/reads.mjs; echo "exit $?"                                         # the No cut found line / exit 0
HOME=$d node evals/reads.mjs --window 12 | head -1                                   # ## What the model did after a cut (TH-10, window 12)
git status --porcelain evals/results                                                 # prints nothing
node evals/reads.mjs | grep -E '^- (D3 rule|[0-9,]+ cuts)|No cut found'           # real transcripts, no throw (Structure risk S4: a non-zero Codex count if ~/.codex/sessions holds a trimhook cut)
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
```

### Acceptance criteria

- [ ] The eight `reads:` tests pass; none reads the real home or writes `evals/results/`.
- [ ] Output without cuts is byte-identical to today's (first line, blank, "No cut found" line).
- [ ] One run on the maintainer's real transcripts completes (no throw) before merge.
- [ ] G holds.

---

---

## S5 · The TH-9 protocol as a file

Implements D5's protocol and pass rule (no code).

### Files touched

| Path | Action |
|---|---|
| `evals/codex-live.md` | new |
| `BACKLOG.md`, `ROADMAP.md` | modify (ROADMAP regenerated) |

### Changes

#### `evals/codex-live.md` (new)

Write this structure; the sentences in quotes are the decision and go in verbatim, the
rest may be worded freely in the repository's prose style.

1. `# TH-9 — Codex replacement, observed live`, then a paragraph: what is being decided
   (`codex.replace` default, D5), that `decision: block` reached the model as "Script
   failed …" + "Script error: …" on Codex 0.155.1 (2026-09-23) and therefore never
   becomes the default, and that `continue: false` is the candidate.
2. `## Before you start` — Codex CLI 0.155 or later (`codex --version`), a scratch
   repository nobody else uses, this checkout. The sentence:
   "`codex.mode` exists from TH-1 step S8 on; before S8 is merged the key is ignored and every run is `decision: block` — do not record runs before then."
3. `## Protocol` — numbered steps, each a copy-pasteable command:
   1. `S=$(mktemp -d) && cd "$S" && git init -q && mkdir -p .codex`
   2. `node <checkout>/bin/trimhook.mjs print-hooks > .codex/hooks.json`
   3. `printf '{"codex":{"replace":true,"mode":"continue"}}' > "$S/u.json"` (for the comparison runs: `"mode":"block"`), then `export TRIMHOOK_USER_CONFIG="$S/u.json" TRIMHOOK_DATA="$S/data"`
   4. `codex exec --approve-for-me --dangerously-bypass-hook-trust 'Run the shell command seq 1 6000 and do not pass max_output_tokens. Then reply with only the first and the last line of its output.' < /dev/null 2> "$S/stderr-$N.txt"` (`N` = the run number)
   5. Router: `grep -c 'error=' "$S/stderr-$N.txt"` — record the count.
   6. Session log: `F=$(ls -t ~/.codex/sessions/*/*/*/*.jsonl | head -1)`, then print every
      `custom_tool_call` input and `custom_tool_call_output` text, first 120 and last 80
      characters:
      `node -e 'const fs=require("fs");for(const l of fs.readFileSync(process.argv[1],"utf8").split("\n")){if(!l)continue;let e;try{e=JSON.parse(l)}catch{continue}const p=e.payload??e;if(p.type==="custom_tool_call")console.log("call  ",JSON.stringify(String(p.input).slice(0,120)));if(p.type==="custom_tool_call_output"){const o=Array.isArray(p.output)?p.output.map(x=>x.text??"").join(" | "):String(p.output);console.log("output",JSON.stringify(o.slice(0,120)),"…",JSON.stringify(o.slice(-80)))}}' "$F"`
      Record: does the output start with "Script failed" or carry "Script error"? Is
      `trimhook:` in it? More than one `call` running `seq` = a re-run.
   7. Tools: `node -e 'const s=new Set(require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n").map(l=>JSON.parse(l).tool));console.log([...s].join(","))' "$S/data/results.jsonl"` — every `tool_name` that reached the hook; the last record must be `outcome: "trimmed"` with `before` about 28,893. If `before` is about 500, the model passed `max_output_tokens` and Codex truncated before the hook: discard the run and repeat it.
   8. The model's reply: does it quote `1` and `6000`?
   9. `rm .codex/hooks.json` when done.
   The paragraph after the steps: "Three runs with `mode: continue` decide; three with `mode: block` are recorded beside them for the README's comparison. Every `tool_name` seen other than `Bash` gets its own rows and is held to the same rule."
4. `## Pass rule` — verbatim from D5:
   "Pass = in 3 of 3 runs with `mode: continue` the session log's `custom_tool_call_output` carries the trimmed text without a \"Script failed\"/\"Script error\" prefix, no `error=` line from the router, the model quotes head and tail and does not re-run. Any tool other than `Bash` seen in the runs must pass the same rule. Pass → `codex.replace` defaults `true` with `mode: continue`; fail → it stays `false`, and the README says both shapes were tried and what each did, dated."
5. `## Runs` — the header row and separator only:
   `| Date | Codex version | Mode | Tool names seen | Error prefix | Router error= | Head quoted | Tail quoted | Re-run |`
   `|---|---|---|---|---|---|---|---|---|`
   and one line under it: "One row per run; dates as `2026-MM-DD`, Mode `continue` or `block`." (S12 greps `^\| 2026-[0-9-]+ \|.*\| continue \|`.)
6. The last line of the file: `**Verdict:** pending — pass or fail, with the date and the Codex version.`
   (S12 replaces `pending …` so the line matches `^\*\*Verdict:\*\* (pass|fail)`.)

#### Docs

- `BACKLOG.md:70-73` (TH-9): between "…or record why not." and ` <!-- th: prio=high size=S labels=hook,tests -->` insert
  ` The protocol and its pass rule are in evals/codex-live.md (TH-1, D5): three runs per codex.mode, judged on Bash.`
  (code spans on the path, `codex.mode`, `Bash`), rewrapping; stays `- [ ]`. Then `node scripts/backlog.mjs roadmap`.
- No CHANGELOG entry: nothing shipped changes (`evals/` is not in `package.json#files`).

### Tests

No code, so no `node --test` case; the Verify greps are the tests.

| Case | Input | Expected |
|---|---|---|
| the markers are named | `grep -cE 'custom_tool_call_output\|Script failed\|Script error\|error=' evals/codex-live.md` | 4 or more |
| the rule is there | `grep -c '3 of 3' evals/codex-live.md` | 1 or more |
| one Runs table | `grep -c '^## Runs' evals/codex-live.md` | `1` |
| the verdict is not pre-filled | `grep -cE '^\*\*Verdict:\*\* (pass\|fail)' evals/codex-live.md` | `0` |
| not shipped | `npm pack --dry-run 2>&1 \| grep -c codex-live` | `0` |

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
grep -cE 'custom_tool_call_output|Script failed|Script error|error=' evals/codex-live.md   # >= 4
grep -c '3 of 3' evals/codex-live.md; grep -c '^## Runs' evals/codex-live.md            # >= 1; 1
grep -cE '^\*\*Verdict:\*\* (pass|fail)' evals/codex-live.md                             # 0
npm pack --dry-run 2>&1 | grep -c codex-live                                             # 0
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1                       # ok — ROADMAP.md is in step with BACKLOG.md
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
```

### Acceptance criteria

- [ ] `evals/codex-live.md` has the six parts above, the pass rule verbatim.
- [ ] TH-9 points at it and stays open; G and B hold.

---

---

## S6 · Failures leave a record, and `report` and `doctor` count them

Implements D7.

> **Assumption (maintainer to confirm) — A5, `doctor`'s home isolation (Structure note 5).**
> S6's `doctor` change reads only the log, isolated by `TRIMHOOK_DATA` as every test
> already does, so `doctor`'s signature is unchanged here. For S11 (settings files) the
> signature is decided now, so S11 needs no second decision:
> `doctor({ cwd = process.cwd(), env = process.env, home = homedir(), managedSettingsPath = MANAGED_SETTINGS } = {})`,
> where `MANAGED_SETTINGS` is the platform's managed-settings file (S11 verifies the paths
> against the current settings reference) and tests pass temp paths for both `home` and
> `managedSettingsPath`. A parameter, not an env override: no new public variable, and the
> CLI path still honours `HOME` on POSIX through `homedir()`.

### Files touched

| Path | Action |
|---|---|
| `bin/trimhook.mjs` | modify — `handler()` catch, new `logError` |
| `bin/lib/report.mjs` | modify — flag counts |
| `bin/lib/doctor.mjs` | modify — one warning |
| `test/misc.test.mjs` | modify — three tests |
| `README.md`, `CHANGELOG.md` | modify |

### Changes

#### `bin/trimhook.mjs`

**Where:** a new function directly before `async function handler()` (`:37`); the catch at `:46-48`.

**What to add:**

```js
// D7: a thrown error leaves a record, best-effort — the error's code or name, never its
// message, which can carry a path or a line of output (rule 4). The model still gets the
// original result: this runs after the handler gave up, and prints nothing to stdout.
async function logError(input, e) {}
```

**Expected behaviour of `logError`:** inside one `try { … } catch {}` that swallows
everything: dynamic-import `appendRecord` from `./lib/store.mjs` and `dataDir`,
`detectHarness` from `./lib/harness.mjs`; append to `dataDir()` exactly
`{at: new Date().toISOString(), session: typeof input.session_id === 'string' ? input.session_id : null, harness: detectHarness(process.env, input), tool: typeof input.tool_name === 'string' ? input.tool_name : null, outcome: 'kept', error: cls}`
with `cls = String((typeof e?.code === 'string' && e.code) || (typeof e?.name === 'string' && e.name) || 'Error').replace(/[^\w.-]/g, '_').slice(0, 64)`.
No `before`, `after`, `cap`, `mode`, `command` or `message` key.

**The catch (`:46-48`)** becomes: keep `process.stderr.write(\`trimhook: failed open: ${e.message}\n\`)`
as the first line, then `await logError(input, e)`. `process.exit(0)` at `:49` unchanged.

**Do NOT touch:** `:38-39` (unparseable stdin still exits 0 with no record — there is no
event to attribute), `:45`.

#### `bin/lib/report.mjs`

- `summarize` (`:4-27`): the initial object at `:5` gains `flags: { spillRead: 0, spillFailed: 0, error: 0 }`;
  inside the loop, after `:11`: `if (r.spillRead === true) s.flags.spillRead += 1`,
  `if (r.spillFailed === true) s.flags.spillFailed += 1`,
  `if (typeof r.error === 'string' && r.error) s.flags.error += 1`.
- `render` (`:30-41`): a new array element directly after `:36`:
  `` flagLine(s.flags) `` where
  ```js
  // D7, D9: why a result was left whole, when there is a reason worth counting.
  const flagLine = (f = {}) => { const parts = ['spillRead', 'spillFailed', 'error'].filter((n) => f[n]).map((n) => `${n} ${k(f[n])}`); return parts.length ? `flags on kept results: ${parts.join(' · ')}` : '' }
  ```
  defined after `k` (`:29`). The `.filter(Boolean)` at `:40` drops the empty string.

**Expected behaviour:** a log without flags renders exactly as today; with flags, one line
`flags on kept results: spillRead 1 · spillFailed 1 · error 2` (zero counts omitted,
always in that order). `saved`, `trimmed`, `kept` unchanged — an error record counts as a
result with `before` 0 (`:8-9`).

#### `bin/lib/doctor.mjs`

**Where:** import `readRecords` from `./store.mjs`; a new block after `:38` (the `mode audit`
warning), before `return` (`:39`).

**What:**

```js
  // D7: an install that fails saves nothing and says so only here and in `report`.
  const recs = readRecords(dir)
  const failed = { spillFailed: recs.filter((r) => r.spillFailed === true).length, error: recs.filter((r) => typeof r.error === 'string' && r.error).length }
  if (failed.spillFailed + failed.error) warn(`log: ${failed.spillFailed + failed.error} results left whole after a failure (spillFailed ${failed.spillFailed}, error ${failed.error}) — trimhook saved nothing on those; see trimhook report and the data dir line above`)
```

**Expected behaviour:** a warning, never BAD (`broken` unchanged); absent when the log is
missing or clean; `spillRead` records do not warn (they are the exemption working).

**Do NOT touch:** `:16-17` and `:34-36` (S11), `:30` (S8), `:37` (S13).

#### Docs

- `README.md:35-36` (the "Measures" bullet): append
  `A result left whole is logged too, as kept, with a flag when there is a reason: spillRead (a read of a spill file), spillFailed (the spill could not be written) or error (trimhook threw — the error's code, never its message). report counts the flags, and doctor warns on the last two.`
  (code spans on `kept`, the three flags, `report`, `doctor`.)
- `README.md:60-61`: "the log keeps sizes and the command's first word or two, never the
  output." → "the log keeps sizes, the command's first word or two and, when trimhook
  fails, the error's code — never the output, never an error message."
- `CHANGELOG.md`, first bullet under `### Added`:
  `- Failures leave a record. A thrown error is logged as outcome: "kept" with error: <code> — the error's code or name, never its message — and the stderr line stays; trimhook report counts spillRead, spillFailed and error, and doctor warns when the log holds a failed spill or an error, so an install that saves nothing says so (TH-1, D7).`

### Tests

In `test/misc.test.mjs`:

| Case | Where | Input | Expected |
|---|---|---|---|
| `report: flag counts for spillRead, spillFailed and error` | after the report test ending `:103` | `summarize([{outcome:'kept',before:9000,after:9000,spillRead:true},{outcome:'kept',before:20000,after:20000,spillFailed:true},{outcome:'kept',error:'EACCES'},{outcome:'kept',error:'ENOSPC'},{outcome:'trimmed',before:30000,after:8000,command:'npm test'}])` | `s.flags` deep-equals `{spillRead:1, spillFailed:1, error:2}`; `s.saved === 22000`; `render(s)` matches `/^flags on kept results: spillRead 1 · spillFailed 1 · error 2$/m`; and `render(summarize([{outcome:'trimmed',before:30000,after:8000}]))` does not match `/flags on kept results/` |
| `doctor warns when the log holds a spillFailed or error record` | after the doctor test ending `:113` | `d=tmp()`; write `d/results.jsonl` = `{"outcome":"kept","spillFailed":true}\n{"outcome":"kept","error":"EACCES"}\n{"outcome":"kept","spillRead":true}\n`; `doctor({cwd:d, env: env(d)})` | a line matching `/^  warn  log: 2 results left whole after a failure \(spillFailed 1, error 1\)/`; `broken === false`. With a fresh `tmp()` and no log: no line matching `/warn  log:/` |
| `e2e: a thrown error prints its stderr line, exits 0 and logs kept with the error code` | after the e2e test ending `:141` | `d=tmp()`; `run(['post-tool-use'], JSON.stringify({...input(lines(10)), cwd: 5}), env(d))` | `code 0`; `stdout ''`; `stderr` matches `/^trimhook: failed open: /`; `readFileSync(join(d,'results.jsonl'),'utf8')` is one line whose record has keys exactly `['at','session','harness','tool','outcome','error']`, `outcome 'kept'`, `error 'ERR_INVALID_ARG_TYPE'`, `session 's1'`, `tool 'Bash'`, `harness 'claude'`; the raw line does not contain `must be of type` |

(`cwd: 5` makes `join()` inside `loadConfig` throw `ERR_INVALID_ARG_TYPE`; the stderr
assertion keeps the test honest if a later change validates `cwd`.)

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='thrown error|flag counts|doctor warns' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '   # # pass 3, # fail 0
printf '{"tool_name":"Bash","cwd":5,"tool_input":{"command":"x"},"tool_response":{"stdout":"x","stderr":""}}' | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json CLAUDE_PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use; echo "exit $?"; cat $d/results.jsonl
#   stderr: trimhook: failed open: …   /  exit 0  /  one line with "outcome":"kept" and "error":"ERR_INVALID_ARG_TYPE", no "message"
TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json node bin/trimhook.mjs doctor | grep -c '^  warn'   # >= 1
TRIMHOOK_DATA=$d node bin/trimhook.mjs report | grep 'flags on kept results'                     # flags on kept results: error 1
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
```

### Acceptance criteria

- [ ] The three tests pass; the existing report, doctor and e2e tests pass unchanged.
- [ ] No record ever carries `e.message`; the stderr line and exit 0 are unchanged.
- [ ] G holds.

---

---

## S7 · Per-layer key classes for the repository file

Implements D4.

> **Assumption (maintainer to confirm) — A6, three edges D4 leaves open, settled here.**
> (1) A repository value that fails its `RULES` check is dropped and the **upper** value
> stands (today the default replaced it) — "the layer below applies" (`config.mjs:4-5`), and
> otherwise an invalid `minRun` would widen a user's longer run back to the default.
> (2) A repository `codex` or `collapse` that is not a plain object is dropped — otherwise
> `{"codex": 5}` would reset a user's `codex.replace: true` to the default through the
> final validation loop. (3) A `RULES` key with no entry in the class table is **denied**
> to the repository layer, and a test fails until every `RULES` key has an explicit class
> (S8 adds `codex.mode`).

### Files touched

| Path | Action |
|---|---|
| `bin/lib/config.mjs` | modify — header `:1-5`, `export` on `RULES`, `REPO_CLASS`, `unset`, `repoLayer`, `loadConfig` |
| `test/misc.test.mjs` | modify — five tests after `:16-33`; import `REPO_CLASS, RULES` |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `BACKLOG.md`, `ROADMAP.md` | modify (ROADMAP regenerated) |

### Changes

#### `bin/lib/config.mjs`

**Header `:1-5`** becomes:

```
// Configuration, in trust order: defaults, the user's file (~/.trimhook.json or
// TRIMHOOK_USER_CONFIG), the repository layer — the repository's file (.trimhook.json,
// .claude/trimhook.json or .codex/trimhook.json in the working directory), or the file
// TRIMHOOK_CONFIG names, which takes its place — then the environment. The repository
// layer is somebody's checkout, so each key has a class (REPO_CLASS, D4): the user file
// and the environment keep every key. A malformed file or a refused key is a diagnostic
// for `doctor`, never a reason to change what the model sees — the layer below applies.
```

**`:74`** `const RULES = {` → `export const RULES = {` (no other change to `RULES`).

**After `set` (`:89-94`)** add:

```js
// D4: what the repository layer may do to each key. `either` moves it both ways (how
// much of a cut result shows; every cut still spills); `narrow` only towards less
// (collapse off, a longer minRun, a subset of tools — a user who chose to see more keeps
// it); `denied` is for recoverability and for what reaches the model on Codex.
export const REPO_CLASS = Object.freeze({
  cap: 'either', perCommand: 'either', minSaving: 'either', head: 'either',
  'collapse.enabled': 'narrow', 'collapse.minRun': 'narrow', tools: 'narrow',
  'collapse.strict': 'denied', mode: 'denied', spill: 'denied', spillTtlDays: 'denied', 'codex.replace': 'denied',
})
const unset = (o, path) => {}          // delete a dotted key from a plain-object tree; no-op when absent
function repoLayer(repo, upper, path, problems) {}   // → the repository object with every refused key removed
```

**Expected behaviour of `repoLayer`:**
1. `out = structuredClone(repo)`.
2. For each `top` in `['codex', 'collapse']` (the prefixes of dotted `RULES` keys): if
   `Object.hasOwn(out, top)` and `out[top]` is not a plain object (`null`, array, scalar),
   `problems.push(\`${path}: ${top} must be an object, got ${JSON.stringify(out[top])}\`)`
   and `delete out[top]`.
3. For each `key` of `Object.keys(RULES)`, with `v = get(out, key)`; skip when `v === undefined`;
   `cls = REPO_CLASS[key] ?? 'denied'`; `u = get(upper, key)`:
   - `denied` → `problems.push(\`${path}: ${key} may only be set in ~/.trimhook.json or the environment\`)`, `unset(out, key)`.
   - `r = RULES[key](v)`; `r !== true` → `problems.push(\`${path}: ${key} must be ${r}, got ${JSON.stringify(v)} — using ${JSON.stringify(u)}\`)`, `unset(out, key)`.
   - `narrow` and not narrower → `problems.push(\`${path}: ${key} may only narrow ${JSON.stringify(u)}, got ${JSON.stringify(v)}\`)`, `unset(out, key)`.
     Narrower means: `collapse.enabled` — `v === false || v === u`; `collapse.minRun` —
     `v >= u`; `tools` — `v.every((t) => Array.isArray(u) && u.includes(t))`.
   - otherwise keep.
4. Return `out`. Never throws for any JSON value.

**`loadConfig` (`:96-119`)** becomes, in order:
1. `problems = []`, `userPath` as `:98`; `upper = merge(DEFAULTS, readJson(userPath, problems) ?? {})`.
2. `path` exactly as today: `env.TRIMHOOK_CONFIG` when set, else the first existing
   candidate of `:105`, else `candidates[0]`.
3. `repo = readJson(path, problems)`; `cfg = merge(upper, repo ? repoLayer(repo, upper, path, problems) : {})`.
4. `TRIMHOOK_MODE`, `TRIMHOOK_CAP` (`:109-110`) and the final `RULES` loop (`:111-117`)
   unchanged — the environment keeps every key, and the loop still catches the user file.
5. Return `{ cfg, path, userPath, problems }` — same shape.

**Do NOT touch:** `DEFAULTS` (S8 changes `:18`, S15 `:12`), `merge`, `readJson`,
`userConfigPath`, `capFor`. `test/handlers.test.mjs:53-63` (a repository `perCommand`) and
`:198-209` (`spill: false` in the **user** file) must pass unchanged.

#### Docs

- `README.md:90-92`: the chain becomes
  `~/.trimhook.json (yours), then the repository's .trimhook.json (or .claude/trimhook.json, .codex/trimhook.json) — or the file TRIMHOOK_CONFIG names, which takes the repository file's place — then TRIMHOOK_MODE and TRIMHOOK_CAP. Every key is optional:`
  (code spans as today.)
- `README.md`, after the paragraph ending "…the default takes its place." (`:112`), a new
  paragraph and table:
  `A repository file is somebody else's checkout, so it does not get every key. It may move the saving knobs either way, may only narrow what you chose to see, and may not touch what makes a cut recoverable or what reaches the model on Codex:`

  | Key | From a repository file |
  |---|---|
  | `cap`, `perCommand`, `minSaving`, `head` | either way — every cut still spills |
  | `collapse.enabled`, `collapse.minRun` | only narrower: `enabled` may turn off, never back on; `minRun` may rise, never fall |
  | `tools` | only a subset of the list above it |
  | `mode`, `spill`, `spillTtlDays`, `codex.replace`, `collapse.strict` | never — set them in `~/.trimhook.json` or the environment |

  `A key outside its class is dropped, the value from your file or the default stands, and doctor prints it as BAD. ~/.trimhook.json and the environment keep every key.`
- `CLAUDE.md:23-24` (Layout, `bin/lib/` line): "config (defaults → ~/.trimhook.json →
  TRIMHOOK_CONFIG → repo file → env, validated)" → "config (defaults → ~/.trimhook.json →
  repo file or TRIMHOOK_CONFIG → env, validated; the repo layer classed per key)", rewrapped
  inside the code block's columns.
- `BACKLOG.md:54-56` (TH-4, stays `[x]`, metadata unchanged): the text becomes
  `defaults → ~/.trimhook.json → repository file, or TRIMHOOK_CONFIG in its place → env; every value validated with the default winning; the repository layer classed per key since TH-1 (either way, narrow only, denied); perCommand caps by first word or two; audit mode.`
  (code spans as today.) Then `node scripts/backlog.mjs roadmap`.
- `CHANGELOG.md`, first bullet under `### Changed` — `spillTtlDays` must appear on exactly
  one line of it:
  `- **Breaking for repository config files.** A repository's .trimhook.json (or .claude/ and .codex/trimhook.json, or the file TRIMHOOK_CONFIG names) may no longer set mode, spill, spillTtlDays or codex.replace — all accepted in 0.1.0 — nor collapse.strict; collapse.enabled, collapse.minRun and tools may only narrow the user's value; cap, perCommand, minSaving and head still move either way. A refused key keeps the value from ~/.trimhook.json or the default, and doctor prints a BAD line: "<path>: <key> may only be set in ~/.trimhook.json or the environment" (TH-1, D4).`

### Tests

In `test/misc.test.mjs`, directly after the config test ending `:33`; add `REPO_CLASS, RULES`
to the `config.mjs` import at `:7`. Repository file = `join(d, '.trimhook.json')`, user
file = `e.TRIMHOOK_USER_CONFIG`, `e = env(d)`, `loadConfig(d, e)`. Titles start `config, repository layer:`.

| Case | Input | Expected |
|---|---|---|
| `config, repository layer: cap, perCommand, minSaving and head move either way` | user `{"cap":8000,"perCommand":{"npm test":16000}}`; repo `{"cap":12000,"minSaving":500,"head":0.7,"perCommand":{"npm test":30000}}` | `cfg.cap 12000`, `minSaving 500`, `head 0.7`, `perCommand` deep-equals `{"npm test":30000}`, `problems []`; then repo `{"cap":2000}` → `cfg.cap 2000`, `problems []` |
| `config, repository layer: collapse and tools may only narrow` | user `{"collapse":{"enabled":false},"tools":["Bash","Read"]}`; repo `{"collapse":{"enabled":true,"minRun":2},"tools":["Bash","WebFetch"]}` | `cfg.collapse.enabled false`, `cfg.collapse.minRun 3`, `cfg.tools` `['Bash','Read']`; `problems.length 3`, each starting `` `${join(d, '.trimhook.json')}: ` `` and matching `/: (collapse\.enabled\|collapse\.minRun\|tools) may only narrow /`. Then, in a fresh `d2 = tmp()`, user `{}` and repo `{"collapse":{"enabled":false,"minRun":5},"tools":["Bash"]}` → `enabled false`, `minRun 5`, `tools ['Bash']`, `problems []` |
| `config, repository layer: mode, spill, spillTtlDays, codex.replace and collapse.strict are denied` | user `{"codex":{"replace":true}}`; repo `{"mode":"audit","spill":false,"spillTtlDays":0,"codex":{"replace":false},"collapse":{"strict":false}}` | `cfg.mode 'trim'`, `spill true`, `spillTtlDays 7`, `codex.replace true`, `collapse.strict true`; `problems` deep-equals the five strings `` `${join(d,'.trimhook.json')}: ${k} may only be set in ~/.trimhook.json or the environment` `` for `k` in `mode, spill, spillTtlDays, codex.replace, collapse.strict` (that order — `RULES` order). Then, in a fresh `d2 = tmp()`: user `{"spill":false,"mode":"audit"}` and no repo file → `cfg.spill false`, `cfg.mode 'audit'`; then repo `{"mode":"trim"}` in `d2` with `TRIMHOOK_MODE: 'audit'` added to the env and the user file emptied to `{}` → `cfg.mode 'audit'` (the environment keeps every key) |
| `config, repository layer: TRIMHOOK_CONFIG is classed the same way` | `join(d,'explicit.json')` = `{"spill":false,"cap":4000}`; `loadConfig(d, {...e, TRIMHOOK_CONFIG: join(d,'explicit.json')})`; also write repo `{"cap":9999}` to show it is ignored | `cfg.spill true`, `cfg.cap 4000`, `path === join(d,'explicit.json')`, `problems` deep-equals `[\`${join(d,'explicit.json')}: spill may only be set in ~/.trimhook.json or the environment\`]` |
| `config, repository layer: every key has a class; bad values keep the upper one` | `Object.keys(RULES).filter((k) => !(k in REPO_CLASS))`; then user `{"codex":{"replace":true},"collapse":{"minRun":10}}`, repo `{"codex":5,"collapse":{"minRun":"x"}}` | `[]`; `cfg.codex.replace true`, `cfg.collapse.minRun 10`; `problems` has one string ending `: codex must be an object, got 5` and one matching `/: collapse\.minRun must be an integer ≥ 2, got "x" — using 10$/` |

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='repository layer' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '   # # pass 5, # fail 0
printf '{"spill":false,"cap":4000,"tools":["Bash","Agent"]}' > "$d/.trimhook.json" && (cd "$d" && TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" node "$R/bin/trimhook.mjs" doctor); echo "exit $?"
#   BAD   config: …/.trimhook.json: spill may only be set in ~/.trimhook.json or the environment
#   BAD   config: …/.trimhook.json: tools may only narrow ["Bash","Read","WebFetch"], got ["Bash","Agent"]
#   ok    mode trim · cap 4000 · … · spill true (7 days) · …      /  exit 1
git show main:CHANGELOG.md | grep -c spillTtlDays; grep -c spillTtlDays CHANGELOG.md   # the second is the first plus one
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1                       # ok — ROADMAP.md is in step with BACKLOG.md
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
```

### Acceptance criteria

- [ ] The five `repository layer` tests pass; `test/handlers.test.mjs:53-63` and `:198-209` unchanged and green.
- [ ] `doctor` on the Verify fixture prints both BAD lines and exits 1.
- [ ] G and B hold; the CHANGELOG entry marks the break.

---

---

## S8 · Codex `continue: false` shape behind `codex.mode`

Implements D5 (the code) and decides Structure note 7.

> **Decided here — note 7, `codex.mode` in `doctor`.** The effective value is printed on
> the existing `ok  mode … · codex.replace …` line, always, whatever the harness — so a
> repository file that tried to set it (a BAD line) is next to the value that stands. One
> new warning, config-level and harness-blind: when `codex.replace` is `true` **and**
> `codex.mode` is `block`, `doctor` warns that Codex records that reply as a failed tool
> call. `doctor` run from a terminal usually detects `claude` (no hook signal), so a
> warning gated on `harness === 'codex'` would almost never be seen.
>
> **Decided here — the block shape.** `block` keeps 0.1.0's object
> `{decision: 'block', reason, systemMessage: note}`; the only change is that `reason` now
> carries the note as its last line too, because Codex drops `systemMessage` (Addendum
> item 3) and D5 says the note travels inside the text. `systemMessage` stays so the
> `block` reply is otherwise byte-for-byte the shape the TH-9 comparison runs against.

If the session passes 40% context, split as the Structure allows: **S8a** = config, harness,
handlers, doctor and their tests; **S8b** = the fixture, its test and the docs.

### Files touched

| Path | Action |
|---|---|
| `bin/lib/config.mjs` | modify — `DEFAULTS.codex`, `RULES`, `REPO_CLASS` |
| `bin/lib/harness.mjs` | modify — `replacementOutput` Codex branch |
| `bin/lib/handlers.mjs` | modify — the last line of `postToolUse` |
| `bin/lib/doctor.mjs` | modify — the settings line, one warning |
| `test/fixtures/codex-post-tool-use.json` | new |
| `test/handlers.test.mjs` | modify — the Codex test, both shapes |
| `test/misc.test.mjs` | modify — three tests after the replacement test |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md` | modify |

### Changes

#### `bin/lib/config.mjs`

1. **`DEFAULTS.codex`** — the line `  codex: { replace: false }, // Codex's result replacement is documented but not yet verified live: opt in`
   (`:18`) becomes

   ```js
     // D5: `continue` answers {continue: false, stopReason}; `block` answers decision:
     // block, which Codex 0.155.1 logs as a failed call ("Script failed …", router
     // error=1, 2026-09-23) — kept for the TH-9 comparison, never a default.
     codex: { replace: false, mode: 'continue' }, // replacement is opt-in until TH-9's live run
   ```

2. **`RULES`** (after S7: `export const RULES = {`) — directly after the line
   `  'codex.replace': (v) => typeof v === 'boolean' || 'true|false',` (`:82`) insert

   ```js
     'codex.mode': (v) => ['continue', 'block'].includes(v) || 'continue|block',
   ```

3. **`REPO_CLASS`** (added by S7 after `set`) — in its third line, directly after
   `'codex.replace': 'denied'` add `, 'codex.mode': 'denied'`. The line then ends
   `… spillTtlDays: 'denied', 'codex.replace': 'denied', 'codex.mode': 'denied',`.

**Expected behaviour:** `loadConfig(d, env(d))` with no files → `cfg.codex` deep-equals
`{replace: false, mode: 'continue'}`; a user file `{"codex":{"replace":true}}` → `mode`
still `'continue'` (deep merge, `merge` at `:45-49`); a user `mode` of `"stop"` → problem
`codex.mode must be continue|block, got "stop" — using "continue"` and `mode 'continue'`;
a repository file setting `codex.mode` → problem
`<path>: codex.mode may only be set in ~/.trimhook.json or the environment` and the upper
value stands (S7's `repoLayer`, no new code). There is no environment variable for it.

**Do NOT touch:** `cap` (`:12`, S15), `repoLayer`, `merge`, `capFor`, the other `RULES`.
S7's test "every key has a class" is the guard that step 3 was not forgotten.

#### `bin/lib/harness.mjs`

**Where:** `export function replacementOutput(harness, original, stdout, stderr, note)`
(`:68`) and its Codex branch (`:69-76`, from `  if (harness === 'codex') {` to the
closing `  }` after `return { decision: 'block', reason: text, systemMessage: note }`).

**New signature:**

```js
export function replacementOutput(harness, original, stdout, stderr, note, codexMode = 'continue')
```

**The Codex branch becomes** (the shape is the decision, so it is given whole):

```js
  if (harness === 'codex') {
    // D5, measured on Codex 0.155.1 (2026-09-23): the hook's reply replaces the tool
    // output the model reads, and `systemMessage` never reaches it — so the note rides
    // inside the text, as its last line. `continue: false` is documented to use the
    // feedback as the model-visible result without rejecting the tool call; `block` is
    // logged as a failed call ("Script failed" + "Script error: " + reason), which is why
    // it is never the default (TH-9 decides whether `continue` is).
    const body = stderr ? `${stdout}\n[stderr]\n${stderr}` : stdout
    const text = `${body}${body.endsWith('\n') ? '' : '\n'}${note}`
    if (codexMode === 'block') return { decision: 'block', reason: text, systemMessage: note }
    return { continue: false, stopReason: text }
  }
```

Replace the comment at `:70-72` with the one above (it cited only `decision: block`).

**Expected behaviour:** Claude Code path (`:77-90`) unchanged — the sixth argument is
ignored for `harness !== 'codex'`. Any `codexMode` other than `'block'` (including
`undefined`) gives the `continue` shape.

**Do NOT touch:** `readResponse` (S2 changed the Bash branch; its string branch at `:51`
is what the fixture test pins), `dataDir`, `detectHarnessSignal`.

#### `bin/lib/handlers.mjs`

**Where:** the last statement of `postToolUse`,
`  return replacementOutput(harness, res, t ? t.stdout : body.stdout, t ? t.stderr : body.stderr, note)`
(`:56`).

**What:** append the argument `, cfg.codex.mode` → `…, note, cfg.codex.mode)`.

**Do NOT touch:** anything else in the handler; `replaced` (`:41`) still gates Codex on
`cfg.codex.replace`, so with the default config nothing changes on Codex.

#### `bin/lib/doctor.mjs`

1. **Where:** the `ok(\`mode ${cfg.mode} · cap ${cfg.cap} · … · codex.replace ${cfg.codex.replace}\`)`
   line (`:30`). **What:** append ` · codex.mode ${cfg.codex.mode}` inside the template,
   after `codex.replace ${cfg.codex.replace}`.
2. **Where:** directly after the `codex.replace is off` warning,
   `  if (harness === 'codex' && !cfg.codex.replace) warn('codex.replace is off: …')`
   (`:37`), and before S6's `mode audit` line. **What:**

   ```js
     // D5: a reply Codex records as a failed tool call is a choice worth seeing wherever
     // doctor runs — from a terminal it rarely detects Codex.
     if (cfg.codex.replace && cfg.codex.mode === 'block') warn('codex.mode block: Codex records the replacement as a failed tool call — the model reads "Script failed" and "Script error:" before the trimmed text; codex.mode continue is the default — see README')
   ```

**Do NOT touch:** `:16-17`, `:34-36` (S11); the `codex.replace is off` wording (`:37`, S13);
S6's `log:` block.

#### `test/fixtures/codex-post-tool-use.json` (new)

The Codex 0.155.1 `PostToolUse` input as the Addendum item 3 captured it: its eleven
top-level keys, `tool_input` an object with `command`, `tool_response` a **bare string**.
Every value is neutral — no path, id, user name or output from the real session (the
real session was `seq 1 6000`; this is `seq 1 5`). Exactly this content, two-space
indented, trailing newline:

```json
{
  "session_id": "00000000-0000-4000-8000-000000000001",
  "turn_id": "00000000-0000-4000-8000-000000000002",
  "transcript_path": "/home/user/.codex/sessions/2026/01/01/rollout-2026-01-01T00-00-00-00000000-0000-4000-8000-000000000001.jsonl",
  "cwd": "/home/user/scratch",
  "hook_event_name": "PostToolUse",
  "model": "example-model",
  "permission_mode": "default",
  "tool_name": "Bash",
  "tool_input": { "command": "seq 1 5" },
  "tool_response": "1\n2\n3\n4\n5\n",
  "tool_use_id": "call_00000000000000000000000001"
}
```

(`permission_mode` and `model` were captured as keys only; their values here are
placeholders of the plausible type — no code reads either.)

#### Docs

- `README.md:42`, the Effect column. After S2 it still contains the parenthesis
  `(\`updatedToolOutput\` on Claude Code; \`decision: block\` with the trimmed text as the feedback on Codex, opt-in until verified live)`.
  Replace that parenthesis with
  `(updatedToolOutput on Claude Code; on Codex, opt-in until verified live, continue: false with the trimmed text as the stopReason — then [stderr] if any, and the note as its last line — or decision: block when codex.mode is block)`
  with code spans on `updatedToolOutput`, `continue: false`, `stopReason`, `[stderr]`,
  `decision: block`, `codex.mode`, `block`. The rest of the cell (S2's sentences) unchanged.
- `README.md`, a new paragraph after the Codex install code block (the block ending with
  `trimhook print-hooks > .codex/hooks.json      # or ~/.codex/hooks.json; trust it when Codex asks`
  and its closing fence, `:78-82`), before "Then `trimhook doctor` says …" (`:84`):

  `On Codex the replacement is opt-in: "codex": { "replace": true } in ~/.trimhook.json. It answers continue: false by default. "mode": "block" answers decision: block instead, which Codex 0.155.1 records as a failed tool call — the model reads Script failed and Script error: before the trimmed text (2026-09-23) — so it is there to compare against, not to use. Codex can also cut before trimhook does: the model may pass max_output_tokens, and Codex truncates the output to it before the hook runs (one live run handed the hook 504 of 28,893 characters).`

  Code spans on `"codex": { "replace": true }`, `~/.trimhook.json`, `continue: false`,
  `"mode": "block"`, `decision: block`, `Script failed`, `Script error:`,
  `max_output_tokens`. Wrap to ~90 columns.
- `README.md:103`, the config block line `  "codex": { "replace": false },` →
  `  "codex": { "replace": false, "mode": "continue" },`.
- `README.md`, the key-class table S7 added after "…the default takes its place." — its
  last row's first cell
  `` `mode`, `spill`, `spillTtlDays`, `codex.replace`, `collapse.strict` `` →
  `` `mode`, `spill`, `spillTtlDays`, `codex.replace`, `codex.mode`, `collapse.strict` ``.
- `CLAUDE.md`, the **Codex CLI hooks** paragraph (`:84-93`), after the sentence ending
  "…`tool_output_token_limit` is Codex's own output budget." append:

  `Measured on 0.155.1 (2026-09-23, thoughts/TH-1-output-hygiene/01-research.md Addendum item 3): tool_response is a bare string; a decision: "block" reply is logged as a failed call — custom_tool_call_output.output is ["Script failed …", "Script error: " + reason], the router logs error=1, systemMessage never reaches the model — so codex.mode defaults to continue and block is never a default; max_output_tokens truncates before the hook.`

  Code spans on the path, `tool_response`, `decision: "block"`,
  `custom_tool_call_output.output`, the array, `error=1`, `systemMessage`, `codex.mode`,
  `continue`, `block`, `max_output_tokens`. Rule 8 (`:70-71`) is S13's; leave it.
- `CHANGELOG.md`, first bullet under `### Added`:

  `- codex.mode: continue (the default) or block — the shape of the Codex replacement once codex.replace is on. continue answers {continue: false, stopReason} with the trimmed text, [stderr] if any, and the note as the last line; block keeps 0.1.0's decision: block, now with the note inside reason too, since Codex 0.155.1 drops systemMessage and records a block as a failed tool call. Set it in ~/.trimhook.json or the environment; a repository file may not. codex.replace stays off by default until TH-9's live run (TH-1, D5).`

  Code spans on every key, value and shape.

### Tests

`test/handlers.test.mjs` — **replace** the test titled
`Codex: measured only until codex.replace is on; then decision block carries the trimmed text`
(`:65-80`) in place, keeping its setup up to and including the `would-trim` assertion
(`:66-71`: `d`, the `codex` env, `codexInput`, `delete codexInput.hook_event_name`, the two
asserts) and rewriting everything after it:

| Case | Input | Expected |
|---|---|---|
| `Codex: measured only until codex.replace is on; then continue false (default) or decision block (codex.mode) carries the trimmed text` | as today: `codexInput = input(lines(5000), {turn_id:'t1', tool_response: lines(5000)})` without `hook_event_name`, env `codex`; (1) no user file; (2) `user.json` = `{"cap":8000,"codex":{"replace":true}}`; (3) `user.json` = `{"cap":8000,"codex":{"replace":true,"mode":"block"}}` — the explicit `cap` pins the `8000` bounds below, so S15 can move the default without touching this test | (1) `null`, `log(d)[0].outcome 'would-trim'`. (2) `out.continue === false`; `typeof out.stopReason === 'string'`; `'decision' in out` false; with `last = out.stopReason.slice(out.stopReason.lastIndexOf('\n') + 1)` and `body = out.stopReason.slice(0, out.stopReason.lastIndexOf('\n'))`: `last` matches `/^trimhook: [\d,]+ characters elided from this result; the whole output is at .+\.txt\.$/`, `body.length <= 8000`, `body` matches `/trimhook: [\d,]+ of/`, `body` ends with `line 5000`. (3) `out.decision 'block'`; `out.reason` ends with `'\n' + out.systemMessage`; `out.systemMessage` matches `/^trimhook: /`; `'continue' in out` false. `log(d).map((r) => r.outcome)` deep-equals `['would-trim', 'trimmed', 'trimmed']`; `log(d)[2].harness 'codex'` |

`test/misc.test.mjs` — directly after the test
`a replacement changes the field that holds the text and nothing else` (ends `:79`), three
tests (`detectHarnessSignal`, `readResponse`, `replacementOutput` and `loadConfig` are
already imported, `:7-9`); add
`const FIXTURE = new URL('./fixtures/codex-post-tool-use.json', import.meta.url)` beside
`BIN` (`:14`):

| Case | Input | Expected |
|---|---|---|
| `Codex fixture: the captured PostToolUse input carries a bare-string tool_response, read as text` | `fx = JSON.parse(readFileSync(FIXTURE, 'utf8'))` | `Object.keys(fx).sort()` deep-equals `['cwd','hook_event_name','model','permission_mode','session_id','tool_input','tool_name','tool_response','tool_use_id','transcript_path','turn_id']`; `readResponse(fx.tool_response)` deep-equals `{stdout: '1\n2\n3\n4\n5\n', stderr: '', rest: null, shape: 'text'}`; `detectHarnessSignal({}, fx)` deep-equals `{harness: 'codex', signal: 'stdin'}`; `detectHarnessSignal({CLAUDECODE: '1'}, fx).harness === 'codex'` |
| `Codex replacement: continue false by default, trimmed text then [stderr] then the note last; block behind codex.mode` | `res = readResponse('x')`; `n = 'trimhook: 9 characters elided from this result.'` | `replacementOutput('codex', res, 'OUT', 'ERR', n)` deep-equals `{continue: false, stopReason: 'OUT\n[stderr]\nERR\ntrimhook: 9 characters elided from this result.'}`; `replacementOutput('codex', res, 'OUT\n', '', n, 'continue')` deep-equals `{continue: false, stopReason: 'OUT\ntrimhook: 9 characters elided from this result.'}` (no blank line); `replacementOutput('codex', res, 'OUT', 'ERR', n, 'block')` deep-equals `{decision: 'block', reason: 'OUT\n[stderr]\nERR\ntrimhook: 9 characters elided from this result.', systemMessage: n}`; `replacementOutput('claude', readResponse({stdout:'a',stderr:''}), 'cut', '', n, 'block').hookSpecificOutput.updatedToolOutput.stdout === 'cut'` |
| `Codex config: codex.mode defaults to continue, is validated, is denied to a repository file, and doctor shows it` | `d = tmp()`, `e = env(d)`: (1) no files; (2) user `{"codex":{"replace":true,"mode":"block"}}`; (3) same user plus repo `join(d,'.trimhook.json')` = `{"codex":{"mode":"continue"}}`; (4) fresh `d2 = tmp()`, user `{"codex":{"mode":"stop"}}` | (1) `cfg.codex` deep-equals `{replace: false, mode: 'continue'}`, `problems []`. (2) `cfg.codex.mode 'block'`, `problems []`; `doctor({cwd: d, env: e}).lines` has one line matching `/^  ok    mode .* · codex\.replace true · codex\.mode block$/` and one matching `/^  warn  codex\.mode block: Codex records the replacement as a failed tool call/`; with state (1) neither the warning nor `codex.mode block` appears. (3) `cfg.codex.mode 'block'`; `problems` deep-equals `` [`${join(d, '.trimhook.json')}: codex.mode may only be set in ~/.trimhook.json or the environment`] ``. (4) `cfg.codex.mode 'continue'`; `problems` deep-equals `['codex.mode must be continue|block, got "stop" — using "continue"']` |

`readFileSync` is already imported in `test/misc.test.mjs` (`:3`).

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='Codex' test/handlers.test.mjs test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '
#   # pass 4 (or more), # fail 0
seq6000='process.stdout.write(JSON.stringify({hook_event_name:"PostToolUse",session_id:"s",turn_id:"t",tool_use_id:"c1",tool_name:"Bash",tool_input:{command:"seq 1 6000"},tool_response:Array.from({length:6000},(_,i)=>i+1).join("\n")}))'
printf '{"codex":{"replace":true}}' > $d/u.json && node -e "$seq6000" | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(o.continue,typeof o.stopReason,"decision" in o,o.stopReason.trim().split("\n").at(-1).startsWith("trimhook:"))'
#   false string false true
printf '{"codex":{"replace":true,"mode":"block"}}' > $d/u.json && node -e "$seq6000" | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(o.decision)'
#   block
rm $d/u.json && node -e "$seq6000" | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | wc -c
#   0   (replacement still opt-in)
RUNNER_TEMP=$d bash -e -c "$(sed -n '33,42p' .github/workflows/ci.yml | sed 's/^          //')"; echo "exit $?"
#   exit 0
printf '{"codex":{"mode":"block"}}' > "$d/.trimhook.json" && (cd "$d" && TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" node "$R/bin/trimhook.mjs" doctor) | grep -c 'codex.mode may only be set'
#   1
(cd "$d" && TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" node "$R/bin/trimhook.mjs" doctor) | grep -c 'codex.mode continue'
#   1   (the repository value was refused; the default stands and is shown)
grep -c 'max_output_tokens' README.md; grep -c '"mode": "continue"' README.md
#   1 or more; 1
git diff --quiet main -- .github codex hooks && echo unchanged
#   unchanged
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
```

`sed -n '33,42p'` is the CI handler block (`ci.yml:32` is `- run: |`, `:42` the Codex
opt-in line); S8 does not edit `ci.yml`, so the range holds.

### Acceptance criteria

- [ ] The four `Codex` tests pass; the Claude Code replacement tests pass unchanged.
- [ ] With `codex.replace` off (the default) Codex output is unchanged: nothing printed,
  `would-trim` logged, the CI block exits 0.
- [ ] `continue: false` by default when opted in; `block` only with `codex.mode: block`;
  the note is the last line of the text in both.
- [ ] A repository file cannot set `codex.mode`; `doctor` shows the effective value.
- [ ] The fixture carries no real path, id, user name or output.
- [ ] G holds.

---

---

## S9 · `report --cap N`, the written cap rule, one source for the sweep

Implements D3 (the instrument and the written rule) and D8's cap-table clause; decides
Structure note 6 and the S9 part of note 2.

> **Decided here — note 6, what `report --cap N` recomputes.**
>
> 1. **`perCommand` is not honoured.** N applies to every result. The number it answers
>    is "what would the week have saved had the *default* been N", which is the question
>    D3 puts; the logged `cap` already has the week's `perCommand` baked in, and today's
>    config may not be the week's. `evals/local.mjs:270-289` (`sweep`) does the same, so
>    the two instruments agree. The output says `perCommand ignored`.
> 2. **Pre-collapse `before`.** The collapse does not depend on the cap — only *whether* it
>    runs does (`before > cap`, `bin/lib/handlers.mjs:28`) — and every `trimmed` or
>    `would-trim` record logs `collapsed`, the characters it removed. So for a record with a
>    numeric `collapsed`, the recomputation replays the handler: post-collapse size
>    `P = before - collapsed`, cut when `P - N >= minSaving`, else a collapse-only
>    replacement when `before - P >= minSaving`, else kept. That is exact up to the
>    synthetic body. A record **without** `collapsed` (every `kept` record) whose `before`
>    exceeds N is treated as uncollapsed and counted on an `approximate` line: at N below
>    the week's cap its collapse was never logged. At N at or above the week's cap — the
>    8,000 and 12,000 S14 asks for, after a week at 4,000 — every result over N was over
>    the week's cap too and carries `collapsed`, bar the few kept ones with an overflow
>    under `minSaving` at 4,000, which at 8,000 are under the cap anyway. This replaces the
>    Structure's risk-row fallback ("say it is overstated"): the figure is no longer
>    biased in one known direction, it is exact where the log allows and flagged where not.
> 3. **Records without `before`** — S6's error records carry no size — are left out and
>    counted on a `left out` line. **`spillRead` records** are never cut at any cap (D9's
>    exemption does not depend on the cap) and are counted on their own line.
> 4. `minSaving` and `head` are `DEFAULTS`'s (1,500, 0.6), as `sweep` uses; the synthetic
>    marker path is the sweep's `'/data/spill/s/t.txt'` (`evals/local.mjs:279`) so the two
>    marker lengths match.
>
> **Decided here — note 2 for S9, the rule's `check`.** The rule lives in its own README
> subsection, `### How the week decides the default cap`, and `check` tests each of the
> rule's terms **inside that subsection only** (from the heading to the next `##` or `###`
> heading), one regex per term, each keyed on its number or its one irreplaceable word.
> Whole-README regexes would pass on a `10%` or a `20` anywhere else — S15 adds the week's
> own percentages beside the table. Words are joined by `\s+`, so a rewrap never fails
> the check; a changed number or a dropped term always does. The seven terms and their
> regexes are in **Changes** below.

### Files touched

| Path | Action |
|---|---|
| `bin/lib/report.mjs` | modify — `recompute`, `renderAt`, `report(dir, {cap})` |
| `bin/trimhook.mjs` | modify — help line, `report` case, `readmeSection` + `CAP_RULE`, one block in `check()` |
| `test/misc.test.mjs` | modify — two tests |
| `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `BACKLOG.md`, `ROADMAP.md` | modify (ROADMAP regenerated) |

### Changes

#### `bin/lib/report.mjs`

**Imports** (after `import { readRecords } from './store.mjs'`, `:2`):

```js
import { DEFAULTS } from './config.mjs'
import { trimResult } from './trim.mjs'
```

**New, after `summarize` (ends `:27`, before `const k = …` `:29`):**

```js
// D3, TH-10: the logged week's saving at another cap. Sizes only, as evals/local.mjs
// sweeps: a synthetic body of each logged size stands in for the text, the logged
// collapse is replayed, one cap applies to every result (perCommand ignored — the
// question is what a default of `cap` would have done). Not an input to the D3 rule,
// which votes on re-reads (evals/reads.mjs); this is the saving side.
const SWEEP_SPILL = '/data/spill/s/t.txt' // the sweep's placeholder: same marker length
export function recompute(records, cap, { minSaving = DEFAULTS.minSaving, head = DEFAULTS.head } = {}) {}
// → { cap, minSaving, results, cut, collapseOnly, before, after, saved,
//     byTool: { [tool]: { n, saved } }, noSize, spillReads, approximate }
```

**Expected behaviour of `recompute`** — start with every count 0 and `byTool {}`; for each
record `r`:

1. `typeof r.before !== 'number' || !Number.isFinite(r.before)` → `noSize += 1`, next.
2. `results += 1`, `before += r.before`; let `B = r.before`, `a = B` (the after).
3. `r.spillRead === true` → `spillReads += 1`, `after += B`, next.
4. `B > cap`:
   - `known = typeof r.collapsed === 'number'`; if `!known`, `approximate += 1`;
     `C = known ? r.collapsed : 0`; `P = B - C`.
   - `t = trimResult({ stdout: 'x'.repeat(P), stderr: '' }, { cap, head, minSaving }, SWEEP_SPILL)`.
   - `t` → `a = t.after`, `cut += 1`; else if `C && B - P >= minSaving` → `a = P`,
     `collapseOnly += 1`; else `a = B`.
5. `after += a`; if `a < B`: `const e = (byTool[r.tool ?? 'Bash'] ??= { n: 0, saved: 0 })`,
   `e.n += 1`, `e.saved += B - a`.
6. At the end `saved = before - after`. Return the object with `cap` and `minSaving` as
   passed.

**New, after `render` (ends `:41`):**

```js
export function renderAt(r) {} // → the lines below, joined by '\n'
```

**Expected output of `renderAt`**, in this order, `k` = `toLocaleString('en-US')` (the
existing `k`, `:29`); a line in brackets appears only when its count is non-zero:

1. `` `## at cap ${k(r.cap)} — the logged sizes recomputed (TH-10)` ``
2. `` `cut ${k(r.cut)} of ${k(r.results)} results${r.collapseOnly ? ` · collapsed only ${k(r.collapseOnly)}` : ''} · characters: ${k(r.before)} before → ${k(r.after)} after · saved ${k(r.saved)} (≈ ${k(Math.round(r.saved / 4))} tokens at four characters each)` ``
3. [any `byTool` entry] `` `by tool: ${entries sorted by saved, descending, as `${tool} ${k(saved)} (${k(n)})`, joined ' · '}` ``
4. [`noSize`] `` `left out, no size (error records): ${k(r.noSize)}` ``
5. [`spillReads`] `` `spill reads, never cut (D9): ${k(r.spillReads)}` ``
6. [`approximate`] `` `approximate, collapse not logged: ${k(r.approximate)}` ``
7. `` `method: one cap for every result (perCommand ignored), minSaving ${k(r.minSaving)}, each result a synthetic body of its logged size less its logged collapse — the sweep evals/local.mjs runs` ``

**`report` (`:43`)** becomes:

```js
export const report = (dir, { cap } = {}) => {}
// records = readRecords(dir); base = render(summarize(records));
// cap === undefined || !records.length ? base : `${base}\n\n${renderAt(recompute(records, cap))}`
```

**Do NOT touch:** `summarize`, `render`, S6's `flagLine` — `report` without a cap prints
exactly what it printed before this step.

#### `bin/trimhook.mjs`

1. **Help line `:7`**
   `//   trimhook report           results, characters saved, top commands — from the local log`
   → `//   trimhook report [--cap N] results, characters saved, top commands — from the local log; --cap N recomputes them at cap N`.
   The line count of the header does not change (`help()` prints `split('\n').slice(1, 9)`, `:117`).
2. **The `report` case (`:134-139`)** becomes, between `case 'report': {` and `break`:

   ```js
       const { report } = await import('./lib/report.mjs')
       const { dataDir } = await import('./lib/harness.mjs')
       const { RULES } = await import('./lib/config.mjs')
       // `--cap N` or `--cap=N`; the same bounds as the config key, so a typo is an error
       // rather than a sweep at a cap nobody could set.
       const args = process.argv.slice(3)
       const i = args.findIndex((a) => a === '--cap' || a.startsWith('--cap='))
       let cap
       if (i >= 0) {
         const raw = args[i].startsWith('--cap=') ? args[i].slice(6) : args[i + 1]
         cap = Number(raw)
         const ok = RULES.cap(cap)
         if (ok !== true) {
           console.error(`trimhook report: --cap must be ${ok}, got ${JSON.stringify(raw ?? null)}`)
           process.exit(2)
         }
       }
       console.log(report(dataDir(), { cap }))
   ```

   (`RULES` is exported since S7.)
3. **Module level, directly before `function check()` (`:74`):**

   ```js
   // The README text under one heading, up to the next ## or ### heading; null when the
   // heading is absent. A term guarded inside its own section cannot be satisfied by the
   // same number written somewhere else.
   function readmeSection(text, heading) {}
   // D3, D8: the rule that turns the TH-10 week into a default cap, one regex per term.
   const CAP_RULE_HEADING = '### How the week decides the default cap'
   const CAP_RULE = [
     [/at\s+least\s+20\s+cuts/, 'floor (at least 20 cuts per tool)'],
     [/12\s+tool\s+uses/, 'window (the next 12 tool uses)'],
     [/at\s+or\s+under\s+10%/, 'threshold (at or under 10%)'],
     [/9,500/, 'subset (a post-collapse size of 9,500 or more)'],
     [/4,000\s+→\s+8,000\s+→\s+12,000/, 'ladder (4,000 → 8,000 → 12,000)'],
     [/pooled\s+rate/, 'pooled rate (reported, does not vote)'],
     [/upper\s+bound/, 'weak spot (an upper bound for 8,000)'],
   ]
   ```

   `readmeSection` behaviour: `start = text.indexOf(\`\n${heading}\n\`)`; `-1` → `null`;
   `body = text.slice(start + heading.length + 2)`; `end = body.search(/^#{2,3} /m)`;
   return `end < 0 ? body : body.slice(0, end)`.
4. **`check()`, the README block** (`if (existsSync(join(ROOT, 'README.md'))) {`, `:96-101`):
   directly after the `BASH_MAX_OUTPUT_LENGTH` line (`:100`) add

   ```js
       const rule = readmeSection(readme, CAP_RULE_HEADING)
       if (rule === null) fail(`README.md must state the default-cap rule under "${CAP_RULE_HEADING}" (TH-10)`)
       else for (const [re, what] of CAP_RULE) if (!re.test(rule)) fail(`README.md must state the default-cap rule's ${what} under "${CAP_RULE_HEADING}"`)
   ```

**Do NOT touch:** the three existing README regexes (S11 edits the third), S3's workflow
block, `handler()`, `logError`.

#### Docs — `README.md`, "What the transcripts say" (`:130-150`)

1. **`:132-135`** ("From 142 local Claude Code sessions and 8 Codex sessions — 28,545 tool
   results, 28.5 M characters — measured …") becomes, re-read from
   `evals/results/2026-09-23-local.json` (`claude` 142 sessions / 28,785 results, `codex`
   8 / 15, `table[*].before` 28,758,748):

   `From 142 local Claude Code sessions and 8 Codex sessions — 28,800 shell results, 28.8 M characters — measured on this machine and sent nowhere (node evals/local.mjs, 2026-09-23; the run is committed as evals/results/2026-09-23-local.json, the one source this table and the design cite). The transcripts hold what the harness gave the model, after its own flat cut, so this is what trimhook adds on top:`

   (code spans on the command and the path.)
2. **The table `:137-142`** becomes (from `table` in the same JSON; tokens = saved / 4):

   ```
   | Cap | Results trimmed | Characters saved | Share of all result characters |
   |---:|---:|---:|---:|
   | 4,000 | 807 of 28,800 | 4,678,275 (≈ 1.17 M tokens) | 16% |
   | **8,000** (default) | 289 | 1,960,876 (≈ 490 k tokens) | 7% |
   | 12,000 | 134 | 957,401 | 3% |
   | 16,000 | 67 | 467,423 | 2% |
   ```
3. **`:144-150`** ("One result in a hundred … a count of how often the model went and read
   a spill file.") becomes:

   `One result in a hundred is over 8,000 characters (289 of 28,800). Trimming them to 8,000 recovers 7%; halving the cap recovers 16%, at the price of hiding more middles. cat, sed, echo and for loops lead the list of what gets cut — whole-file reads and hand-rolled loops, not test runs. The sweep is a benchmark, not a replay: each result stands in as one synthetic stream of its size with no line to snap to, so its after is the cap to the character, where a real cut can land a little short of it (see What it does, exactly). The sweep is shell output only; the live week cuts Read and WebFetch too, and it decides the default under the rule below.`

   (code spans on `cat`, `sed`, `echo`, `for`, `Read`, `WebFetch`; "What it does,
   exactly" as a link `[What it does, exactly](#what-it-does-exactly)`.) The "18%" clause
   is dropped: the committed JSON does not carry it, and every number here now comes from
   that one file.
4. **New subsection** directly after that paragraph, before `### It is not only Bash`
   (`:152`) — the rule, exact wording (it is the decision; rewrap freely, the `check`
   regexes allow any whitespace between words, but keep every number and the `→` ladder):

   ```markdown
   ### How the week decides the default cap

   The default cap stays 8,000 in this release. The week that settles it (TH-10) runs with
   `~/.trimhook.json` holding `cap: 4000` and all three tools, and this rule, written before
   the week, turns its numbers into a default:

   - **Per tool.** For each tool with at least 20 cuts in the week, its re-read rate is its
     spill reads plus its re-runs within the next 12 tool uses, over its cuts, as
     `node evals/reads.mjs` counts them. A tool with fewer than 20 cuts is reported as
     unmeasured and does not vote.
   - **Two rates per tool:** over all its cuts, and over the cuts 8,000 would also have made
     — a post-collapse size of 9,500 or more, 8,000 plus `minSaving`. A tool with no cut
     that large passes the second.
   - **The ladder, 4,000 → 8,000 → 12,000.** The default becomes 4,000 if every voting tool
     is at or under 10% on both rates; else 8,000 if every voting tool is at or under 10% on
     the second; else 12,000, and this README says the week rejected both.
   - **The pooled rate is reported and does not vote:** Bash's volume would decide for
     tools it does not represent.
   - **The weak spot.** A re-read at 4,000 of a result of 9,500 or more is an upper bound
     for its re-read at 8,000, which shows more of the head and the tail — so the rule can
     reject 8,000 unfairly, never accept it unfairly.

   Why 10%: a re-read costs one `Read` of the spill, so even half the cuts read back would
   still save characters; but a re-read is the only visible sign of a middle the model
   needed, so the bar sits far below break-even. Twenty cuts is the fewest at which one
   re-read moves a rate by five points. `node evals/reads.mjs` prints the verdict line, and
   the maintainer checks its arithmetic before the default changes.

   `trimhook report --cap N` gives the saving side: the week's logged sizes recomputed at
   cap N, one cap for every result (`perCommand` ignored), the logged collapse replayed,
   a synthetic body per result as the sweep above. A result whose collapse was never
   logged is counted as approximate, and the rule does not use these figures.
   ```

   Assumption A7 (maintainer to confirm) is the clause "the maintainer checks its
   arithmetic before the default changes". "In this release" (not "in 0.2.0") follows A1
   and saves S15 a version edit.
5. **Do not write `"cap": 4000` with quotes anywhere in the README**: S15 greps
   `"cap": <default>` and expects exactly one hit, the config block.

#### Docs — the others

- `CONTRIBUTING.md`, item 2 **Live** (`:25-29`, as S4 left it): the first sentence
  "install the checkout, work for a week, then `trimhook report`: results, `trimmed`
  count, characters saved, top commands." becomes
  `install the checkout, set ~/.trimhook.json to {"cap": 4000, "tools": ["Bash", "Read", "WebFetch"]}, work for a week, then trimhook report, trimhook report --cap 8000 and trimhook report --cap 12000: results, trimmed count, characters saved, top commands, at the cap the week ran at and at the two rungs above it.`
  (code spans on the path, the JSON, the three commands, `trimmed`.) After S4's sentence
  about `node evals/reads.mjs` and the kept "A cap that is never followed by a read can
  drop; one that is read often is too low." append
  `The README's "How the week decides the default cap" turns the two into a default.`
- `BACKLOG.md:74-77` (TH-10), stays `- [ ]`, metadata unchanged
  (`<!-- th: prio=high size=M labels=benchmark -->`). The text becomes:
  `**TH-10 — Live measurement, one week**: a week at cap: 4000 with all three tools; trimhook report (and --cap 8000, --cap 12000) for the saving, node evals/reads.mjs for the spill reads and re-runs per tool; both numbers into the README beside the transcript table, and the default cap decided by the rule the README states before the week (per tool, a 20-cut floor, at or under 10% over all cuts and over the 9,500 subset, 4,000 → 8,000 → 12,000). Does not gate 0.2.0 (TH-1).`
  (code spans on `cap: 4000`, the commands, `--cap 8000`, `--cap 12000`.) The removal of
  "**Gates the release.**" is Assumption A1 (maintainer to confirm). Then
  `node scripts/backlog.mjs roadmap`.
- `CHANGELOG.md`, first bullet under `### Added`:
  `- trimhook report --cap N recomputes the logged results at cap N — one cap for every result, perCommand ignored, the logged collapse replayed on a synthetic body of each logged size, as evals/local.mjs sweeps — so a week run at 4,000 can be read at 8,000 and 12,000 too. Error records (no size) are left out, spill reads are never cut, and a result whose collapse was never logged is counted as approximate. The README now states the rule that turns the week into a default cap, and check guards each of its terms (TH-10, D3).`
  (code spans on the command, `perCommand`, `evals/local.mjs`, `check`.)
- `CHANGELOG.md`, first bullet under `### Fixed`:
  `- The README's cap table cited an earlier run (802 of 28,545 results at 4,000); it now reads the committed evals/results/2026-09-23-local.json (807 of 28,800), the run the design cites (TH-1, D8).`

### Tests

`test/misc.test.mjs`; add `recompute, renderAt` to the `report.mjs` import (`:10`).

| Case | Where | Input | Expected |
|---|---|---|---|
| `report: --cap recomputes the logged sizes at another cap` | directly after S6's `report: flag counts …` test (which follows the report test ending `:103`) | `recs = [{outcome:'trimmed',tool:'Bash',command:'cat',before:30000,after:8000,cap:8000,collapsed:0}, {outcome:'kept',tool:'Read',command:'Read',before:6000,after:6000,cap:8000}, {outcome:'kept',tool:'Read',command:'Read',before:20000,after:20000,cap:8000,spillRead:true}, {outcome:'kept',tool:'Bash',error:'EACCES'}, {outcome:'trimmed',tool:'Bash',command:'seq',before:12000,after:8000,cap:8000,collapsed:3000}, {outcome:'kept',tool:'WebFetch',command:'WebFetch',before:5000,after:5000,cap:8000}]` | `recompute(recs, 4000)` has `results 5, cut 3, collapseOnly 0, before 73000, after 37000, saved 36000, noSize 1, spillReads 1, approximate 2` and `byTool` deep-equal `{Bash:{n:2,saved:34000}, Read:{n:1,saved:2000}}`. `renderAt(recompute(recs, 4000))` equals exactly the seven lines: `## at cap 4,000 — the logged sizes recomputed (TH-10)` / `cut 3 of 5 results · characters: 73,000 before → 37,000 after · saved 36,000 (≈ 9,000 tokens at four characters each)` / `by tool: Bash 34,000 (2) · Read 2,000 (1)` / `left out, no size (error records): 1` / `spill reads, never cut (D9): 1` / `approximate, collapse not logged: 2` / `method: one cap for every result (perCommand ignored), minSaving 1,500, each result a synthetic body of its logged size less its logged collapse — the sweep evals/local.mjs runs`. `recompute(recs, 8000)`: `cut 1, collapseOnly 1, after 48000, saved 25000, approximate 0`, `byTool` `{Bash:{n:2,saved:25000}}`, and its render's second line is `cut 1 of 5 results · collapsed only 1 · characters: 73,000 before → 48,000 after · saved 25,000 (≈ 6,250 tokens at four characters each)` with no `approximate` line. `recompute(recs, 12000)`: `cut 1, collapseOnly 0, after 55000, saved 18000`. `recompute([{outcome:'kept',error:'X'}], 4000)`: `results 0, noSize 1, saved 0` |
| `e2e: report --cap recomputes at another cap on the CLI; a bad --cap exits 2` | directly after S6's `e2e: a thrown error …` test (after the e2e test ending `:141`; `run` is defined at `:116`) | `d = tmp()`; `writeFileSync(join(d,'results.jsonl'), '{"outcome":"trimmed","tool":"Bash","command":"cat","before":30000,"after":8000,"cap":8000}\n{"outcome":"kept","tool":"Read","command":"Read","before":6000,"after":6000,"cap":8000}\n')`; `run(['report'], '', {TRIMHOOK_DATA: d})`, `run(['report','--cap','4000'], '', {TRIMHOOK_DATA: d})`, `run(['report','--cap=4000'], '', {TRIMHOOK_DATA: d})`, `run(['report','--cap','4,000'], '', {TRIMHOOK_DATA: d})` | plain: `code 0`, stdout does not match `/at cap/`. `--cap 4000`: `code 0`; `stdout.startsWith(plain.stdout.trimEnd() + '\n\n## at cap 4,000 — ')`; stdout matches `/^cut 2 of 2 results · /m` and `/^approximate, collapse not logged: 2$/m`. `--cap=4000`: same stdout as `--cap 4000`. `--cap 4,000`: `code 2`, `stdout ''`, `stderr` equals `trimhook report: --cap must be an integer in [500, 200000], got "4,000"\n` |

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='another cap' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '
#   # pass 2, # fail 0
printf '%s\n' '{"outcome":"trimmed","tool":"Bash","command":"cat","before":30000,"after":8000,"cap":8000}' '{"outcome":"kept","tool":"Read","command":"Read","before":6000,"after":6000,"cap":8000}' > $d/results.jsonl && TRIMHOOK_DATA=$d node bin/trimhook.mjs report --cap 4000
#   the plain report, a blank line, then:
#   ## at cap 4,000 — the logged sizes recomputed (TH-10)
#   cut 2 of 2 results · characters: 36,000 before → 8,000 after · saved 28,000 (≈ 7,000 tokens at four characters each)
#   by tool: Bash 26,000 (1) · Read 2,000 (1)
#   approximate, collapse not logged: 2
#   method: …
# Before committing (HEAD is still the tree without this step): the plain report is unchanged.
mkdir "$d/base" && git archive HEAD bin | tar -x -C "$d/base" && diff <(TRIMHOOK_DATA=$d node "$d/base/bin/trimhook.mjs" report) <(TRIMHOOK_DATA=$d node bin/trimhook.mjs report) && echo same
#   same
node bin/trimhook.mjs report --cap 4,000; echo "exit $?"
#   trimhook report: --cap must be an integer in [500, 200000], got "4,000"   /  exit 2
node bin/trimhook.mjs help | grep -c -- '--cap N'
#   1
grep -c '802 of 28,545' README.md; grep -c '807 of 28,800' README.md; grep -c '9,500' README.md; grep -c '"cap": 4000' README.md
#   0; 1; 2 or more; 0
grep -c '^### How the week decides the default cap$' README.md
#   1
node bin/trimhook.mjs check
#   ok — one hook, two harnesses, manifests in sync at …
# The check bites, once per term (a fresh copy each time):
for pat in '9,500' '12 tool uses' 'at least 20 cuts' 'pooled rate' 'upper bound' '→ 8,000 →' 'at or under 10%' '^### How the week decides'; do
  c=$(mktemp -d) && cp -R "$R" "$c/r" && perl -i -ne "print unless /$pat/" "$c/r/README.md" && node "$c/r/bin/trimhook.mjs" check 2>&1 | grep -c '^✗ README.md must state the default-cap rule'; done
#   eight lines, each 1 or more (a wrapped term may need the phrase on one line — see below)
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1
#   ok — ROADMAP.md is in step with BACKLOG.md
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
```

The bite loop deletes every line containing the phrase. If the executor's wrap splits a
phrase across two lines (legal for `check`, which allows any whitespace), `perl` finds no
line and that iteration prints `0`; then re-run that iteration with one word of the phrase
(`20 cuts`, `10%`, `pooled`, `upper`) — the point is that deleting the term fails `check`.

### Acceptance criteria

- [ ] Both `another cap` tests pass; the existing report test and S6's flag test pass
  unchanged; `report` with no `--cap` prints byte-for-byte what it printed before.
- [ ] The README table and its header numbers equal `evals/results/2026-09-23-local.json`.
- [ ] The rule subsection exists with all seven terms, and deleting any one fails `check`.
- [ ] TH-10 is reworded and still open; ROADMAP regenerated.
- [ ] G and B hold.

---

---

## S10 · The README states the numbers and bounds; `check` guards them

Implements D8 (the README statements and their guard); decides the S10 part of note 2. No
runtime change.

> **Decided here — note 2 for S10.** Same mechanism as S9: the statements live in
> `## What it does, exactly`, and `check` tests each inside that section only (S9's
> `readmeSection`), one regex per statement keyed on its number, words joined by `\s+`.
> Seven terms: the stderr floor, what `minSaving` counts, the snap slack, the two-stream
> bound, the timeout, the p50, the maximum. The bound is not only stderr's: a tiny
> **stdout** share beside a huge stderr hits the same `room >= 200` clamp
> (`bin/lib/trim.mjs:34`) at the default cap — `splitBudget(8000, 3000, 100000)` gives
> stdout 234 — so the README and the test say "a share", and test both streams.

If the session passes 40% context, split as the Structure allows: **S10a** = README text +
`check`; **S10b** = the bound test.

### Files touched

| Path | Action |
|---|---|
| `bin/trimhook.mjs` | modify — `EXACT_HEADING`, `EXACT_TERMS`, one block in `check()` |
| `test/trim.test.mjs` | modify — one test |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md` | modify |

### Changes

#### `README.md`, `## What it does, exactly`

Replace the paragraph
"`stdout` and `stderr` share one cap, split in proportion to their sizes with a floor for
`stderr`, so a short error is never squeezed out by a long log." (`:50-51`) with the three
paragraphs below, exact wording, blank lines between them. Rewrap freely **except** keep
on one line each: "`stderr` gets at least 20%" (the Structure's `grep -E 'stderr.*20%'`
is per line) and "156 ms".

`stdout and stderr share one cap, split in proportion to their sizes with a floor: stderr gets at least 20% of the cap, or all of itself when it is shorter, so a short error is never squeezed out by a long log. Each stream over its share is cut on its own, with its own marker, so a result with both streams cut carries two. A share too small to hold a marker still keeps 200 characters of its stream, so a tiny share — a few hundred characters of one stream beside a huge other — can exceed its slice by at most 200 characters plus the marker's length. That bound is accepted, tested (test/trim.test.mjs) and not fixed: holding the cap to the character there would mean dropping a stream.`

`minSaving (1,500 by default) counts the overflow above the cap: a result is cut only when it is over the cap by at least that much, so at the default cap nothing under 9,500 characters is cut. A cut snaps to a line boundary within 200 characters, keeping less rather than more, so a cut result can come in up to 200 characters per cut under the cap.`

`**Fast enough to need no deadline.** The hook runs under a 5 s timeout ("timeout": 5 in both hooks files). Measured on 2026-09-28 at fb4f5b6, Node 23.3.0, Node's start-up included: a 150,000-character result — one body the collapse folds to a single line, one of 30,000 distinct lines cut to the cap, four rounds of ten each — took p50 75-83 ms and at most 156 ms, about 3% of the timeout, so the handler sets no deadline of its own.`

Code spans on `stdout`, `stderr`, `test/trim.test.mjs`, `minSaving`, `"timeout": 5`,
`fb4f5b6`. S2's "**What a failure does.**" paragraph and "**Fail-open, always.**" follow
unchanged.

#### `bin/trimhook.mjs`

**Where:** module level, directly after S9's `CAP_RULE` array.

```js
// D8: what the code guarantees and where the cap bends, each keyed on its number
// (bin/lib/trim.mjs:21-28, :34, :48, :56; hooks/hooks.json timeout; timing 2026-09-28).
const EXACT_HEADING = '## What it does, exactly'
const EXACT_TERMS = [
  [/stderr`?\s+gets\s+at\s+least\s+20%/, 'the stderr floor (at least 20% of the cap)'],
  [/overflow\s+above\s+the\s+cap/, 'what minSaving counts (the overflow above the cap)'],
  [/within\s+200\s+characters/, 'the line-snap slack (within 200 characters)'],
  [/at\s+most\s+200\s+characters\s+plus\s+the\s+marker/, 'the two-stream bound (at most 200 characters plus the marker)'],
  [/under\s+a\s+5\s+s\s+timeout/, 'the hook timeout (5 s)'],
  [/p50\s+75-83\s+ms/, 'the measured p50 (75-83 ms)'],
  [/156\s+ms/, 'the measured maximum (156 ms)'],
]
```

**Where:** `check()`, the README block, directly after S9's `CAP_RULE` lines
(`const rule = readmeSection(readme, CAP_RULE_HEADING)` and its two `fail` lines).

```js
    const exact = readmeSection(readme, EXACT_HEADING)
    if (exact === null) fail(`README.md must keep the section "${EXACT_HEADING}"`)
    else for (const [re, what] of EXACT_TERMS) if (!re.test(exact)) fail(`README.md must state ${what} under "${EXACT_HEADING}"`)
```

**Do NOT touch:** `readmeSection`, `CAP_RULE`, the older README regexes (S11 edits the
`BASH_MAX_OUTPUT_LENGTH` one), `bin/lib/trim.mjs` (the bound is documented, not fixed —
D8's rejected alternative).

#### Docs — the others

- `CLAUDE.md`, "Verifying a change": directly after S3's paragraph ("`check` also fails when
  a workflow under `.github/workflows/` names the sibling project …"), a new paragraph:

  `check also holds the README to what the code does: under "What it does, exactly" the stderr floor, what minSaving counts, the snap and two-stream slack, the 5 s timeout and its measured cost; under "How the week decides the default cap" each term of the D3 rule. One regex per statement, on its number, inside its own section — a rewording that keeps the number passes, a lost number fails.`

  Code spans on `check` and `minSaving`.
- `CHANGELOG.md`, first bullet under `### Changed`:

  `- The README states the numbers the code runs on and where the cap bends: stderr's 20% floor, minSaving as the overflow above the cap, the 200-character line snap, the two-marker cut and its bound (a tiny share may exceed its slice by at most 200 characters plus the marker), and the 5 s hook timeout against a measured p50 of 75-83 ms and a maximum of 156 ms (2026-09-28). check fails when any of them goes missing, and a test pins the bound (TH-1, D8).`

  Code spans on `stderr`, `minSaving`, `check`.

### Tests

`test/trim.test.mjs`, directly after
`stdout and stderr share the cap proportionally, with a floor for stderr` (ends `:40`):

| Case | Input | Expected |
|---|---|---|
| `a share too small for a marker exceeds its slice by at most 200 plus the marker length` | (1) `so = lines(20000)` (208,893 characters), `se = 'e'.repeat(1000)`, `cfg = {cap: 500, head: 0.6, minSaving: 0}`, `b = splitBudget(500, so.length, se.length)`, `r = trimResult({stdout: so, stderr: se}, cfg, '/p')`, `m = marker(se.length, se.length, '/p').length`; (2) `so2 = 'o'.repeat(3000)`, `se2 = lines(12000)`, `cfg2 = {cap: 8000, head: 0.6, minSaving: 1500}`, `b2 = splitBudget(8000, so2.length, se2.length)`, `r2 = trimResult({stdout: so2, stderr: se2}, cfg2, '/p')`, `m2 = marker(so2.length, so2.length, '/p').length` | (1) `b` deep-equals `{out: 400, err: 100}`; `r.stdout.length <= 400`; `r.stderr.length === 265` (120 head + 65 marker + 80 tail); `r.stderr.length > b.err` (the bound is real); `r.stderr.length - b.err <= 200 + m` (`m` is 67); `r.after <= 500 + 200 + m`. (2) `b2.out < 200 + m2` (the default cap reaches the clamp through stdout); `r2.stdout.length > b2.out`; `r2.stdout.length - b2.out <= 200 + m2`; `r2.stderr.length <= b2.err` |

(Measured when planning: `lines(12000)` is 120,893 characters, `b2` is `{out: 194, err: 7806}`,
`r2.stdout.length` 267, `m2` 67. Assert the inequalities, not these values.)

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='at most 200' test/trim.test.mjs 2>&1 | grep -E '^# (pass|fail) '
#   # pass 1, # fail 0
grep -c '156 ms' README.md; grep -cE 'stderr.*20%|20%.*stderr' README.md; grep -c 'overflow above the cap' README.md
#   1 or more, each
node bin/trimhook.mjs check
#   ok — …
for pat in '20%' 'overflow above' 'within 200' 'at most 200' '5 s timeout' '75-83 ms' '156 ms' '^## What it does, exactly'; do
  c=$(mktemp -d) && cp -R "$R" "$c/r" && perl -i -ne "print unless /$pat/" "$c/r/README.md" && node "$c/r/bin/trimhook.mjs" check 2>&1 | grep -cE '^✗ README.md must (state .* under "## What it does, exactly"|keep the section)'; done
#   eight lines, each 1 or more
git diff --quiet HEAD -- bin/lib && echo 'no runtime change'
#   no runtime change   (before committing)
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
```

If a rewrap splits a bite phrase across lines, that iteration prints `0` — re-run it with
the number alone (`200`, `ms`), as in S9.

### Acceptance criteria

- [ ] The `at most 200` test passes; every other test unchanged.
- [ ] The three paragraphs are in `## What it does, exactly`; deleting any guarded term
  fails `check`.
- [ ] No file under `bin/lib/` changed.
- [ ] G holds.

---

---

## S11 · `doctor` reads `bashOutputMaxChars` and says its verdict is from the environment

Implements D8 (the `doctor` clauses and the harness-cap sentence); uses part one's A5
signature; decides the S11 part of note 2.

> **Decided here.**
>
> - **Which files.** Exactly the four D8 names, highest first: the managed file
>   (`MANAGED_SETTINGS`, per platform), `<cwd>/.claude/settings.local.json`,
>   `<cwd>/.claude/settings.json`, `<home>/.claude/settings.json`. The managed paths were
>   re-read on 2026-09-29 from code.claude.com/docs/en/managed-settings.md: macOS
>   `/Library/Application Support/ClaudeCode/managed-settings.json`, Linux and WSL
>   `/etc/claude-code/managed-settings.json`, Windows
>   `C:\Program Files\ClaudeCode\managed-settings.json`. Not read, and named in the README
>   as gaps: `--settings` on the command line (no hook or terminal command can see it),
>   `managed-settings.d/` drop-ins, MDM, the registry and server-managed settings.
> - **What counts as set.** A top-level `bashOutputMaxChars` that is a positive integer
>   (the reference's type). Anything else in a file — a missing file, bad JSON, a string —
>   is skipped and the next level is read; `doctor` never goes BAD over a Claude Code
>   settings file, which is not trimhook's to judge.
> - **The effective value** is the first found, clamped to 4,000-128,000; when one exists,
>   `BASH_MAX_OUTPUT_LENGTH` is not compared at all and gets one `ok` line saying it is
>   ignored.
> - **Note 2 for S11 — the `check` regexes**, whole-README (the statements span two
>   sections): `BASH_MAX_OUTPUT_LENGTH` and `bashOutputMaxChars` **in one paragraph**
>   (today they already sit together at `README.md:22-23`, so the guard is that neither
>   drifts away from the other), the clamp `4,000-128,000`, and `--settings`.

### Files touched

| Path | Action |
|---|---|
| `bin/lib/doctor.mjs` | modify — imports, `MANAGED_SETTINGS`, `harnessSettingsCap`, `doctor` signature, `:16-17`, `:34-36` |
| `bin/trimhook.mjs` | modify — `HARNESS_CAP`, the `BASH_MAX_OUTPUT_LENGTH` line in `check()` |
| `test/misc.test.mjs` | modify — the existing doctor test isolated, two tests |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md` | modify |

### Changes

#### `bin/lib/doctor.mjs`

1. **Imports** (`:3-5`): add `readFileSync` to the `node:fs` import; add
   `import { homedir } from 'node:os'` and `import { join } from 'node:path'`.
2. **Module level, before `export function doctor`:**

   ```js
   // D8: Claude Code's own inline limit for Bash. bashOutputMaxChars, set in any of four
   // settings files, wins over BASH_MAX_OUTPUT_LENGTH, the highest level first, clamped to
   // 4,000-128,000 (code.claude.com settings reference, read 2026-09-23; managed paths
   // re-read 2026-09-29). Best-effort: a --settings flag, MDM or managed-settings.d/ is
   // invisible here, and a file that cannot be read is skipped, never an error.
   export const MANAGED_SETTINGS =
     process.platform === 'darwin' ? '/Library/Application Support/ClaudeCode/managed-settings.json'
     : process.platform === 'win32' ? 'C:\\Program Files\\ClaudeCode\\managed-settings.json'
     : '/etc/claude-code/managed-settings.json'
   export function harnessSettingsCap({ cwd, home, managedSettingsPath }) {} // → { value, path } | null
   ```

   **Behaviour:** for `path` in `[managedSettingsPath, join(cwd, '.claude', 'settings.local.json'), join(cwd, '.claude', 'settings.json'), join(home, '.claude', 'settings.json')]`,
   in that order: inside `try { … } catch { continue }`,
   `v = JSON.parse(readFileSync(path, 'utf8'))?.bashOutputMaxChars`; if
   `Number.isInteger(v) && v > 0` return `{ value: v, path }`. After the loop return `null`.
3. **Signature** (`:7`): `export function doctor({ cwd = process.cwd(), env = process.env, home = homedir(), managedSettingsPath = MANAGED_SETTINGS } = {})`
   — exactly part one's A5.
4. **`:16-17`**, the harness line: the `ok(\`harness: ${harness} (decided by …)\`)` call
   keeps its text and gains, at the end of the template, the suffix
   ` — from the environment only; doctor sees no hook input`. The line then reads, from a
   terminal, `  ok    harness: claude (decided by default — no harness signal in the environment, running outside a hook) — from the environment only; doctor sees no hook input`.
5. **`:34-36`** (the comment `// The harness has its own flat cut; …`, `const harnessCap = Number(env.BASH_MAX_OUTPUT_LENGTH)`
   and its `if (harnessCap && harnessCap < cfg.cap) warn(…)`) become:

   ```js
     // The harness has its own cut; trimhook can only see what survives it. The setting,
     // when any level sets it, is the one Claude Code obeys (D8).
     const n = (x) => x.toLocaleString('en-US')
     const set = harnessSettingsCap({ cwd, home, managedSettingsPath })
     if (set) {
       const eff = Math.min(128000, Math.max(4000, set.value))
       const where = `${set.path}${eff !== set.value ? `, ${n(set.value)} clamped to 4,000-128,000` : ''}`
       if (env.BASH_MAX_OUTPUT_LENGTH) ok(`BASH_MAX_OUTPUT_LENGTH=${env.BASH_MAX_OUTPUT_LENGTH} ignored: bashOutputMaxChars is set in ${set.path}`)
       if (eff < cfg.cap) warn(`bashOutputMaxChars ${n(eff)} (${where}) is below trimhook's cap ${cfg.cap}: Claude Code moves a longer Bash output to a file and sends a preview first, and trimhook never sees the rest`)
       else ok(`harness cap: bashOutputMaxChars ${n(eff)} (${where}), above trimhook's cap ${cfg.cap}`)
     } else {
       const harnessCap = Number(env.BASH_MAX_OUTPUT_LENGTH)
       if (harnessCap && harnessCap < cfg.cap) warn(/* the existing message, unchanged */)
     }
   ```

   The existing `BASH_MAX_OUTPUT_LENGTH=${harnessCap} is below trimhook's cap …` message
   text is kept verbatim inside the `else`.

**Do NOT touch:** S6's `log:` block, S8's `codex.mode` line and warning, the
`codex.replace is off` warning (S13), `loadConfig`.

#### `bin/trimhook.mjs`

**Where:** module level, directly after S10's `EXACT_TERMS`:

```js
// D8: the harness's own limit is two knobs and the setting wins, so the README names
// them together, with the clamp and the one level no hook can read.
const HARNESS_CAP = [
  [/BASH_MAX_OUTPUT_LENGTH(?:(?!\n\n)[\s\S])*bashOutputMaxChars|bashOutputMaxChars(?:(?!\n\n)[\s\S])*BASH_MAX_OUTPUT_LENGTH/, "the harness's own cap — BASH_MAX_OUTPUT_LENGTH and bashOutputMaxChars in one paragraph — and how trimhook relates to it"],
  [/4,000-128,000/, 'the bashOutputMaxChars clamp (4,000-128,000)'],
  [/--settings/, 'what doctor cannot read (--settings)'],
]
```

**Where:** `check()`, the line
`    if (!/BASH_MAX_OUTPUT_LENGTH/.test(readme)) fail("README.md must name the harness's own cap (BASH_MAX_OUTPUT_LENGTH) and how trimhook relates to it")`
(`:100`) — replace it with
`    for (const [re, what] of HARNESS_CAP) if (!re.test(readme)) fail(\`README.md must state ${what}\`)`.
S9's and S10's blocks stay after it.

#### Docs

- `README.md:22-26`, the first paragraph of "Why a hook and not a setting" ("Claude Code
  already cuts Bash output flat at `BASH_MAX_OUTPUT_LENGTH` (default 30,000 characters; the
  `bashOutputMaxChars` setting overrides it), and Codex budgets tool output by tokens
  (`tool_output_token_limit`). Those are ceilings, …"): replace its first sentence (up to
  and including "(`tool_output_token_limit`).") with

  `Claude Code already limits Bash output. BASH_MAX_OUTPUT_LENGTH (default 30,000 characters) cuts it flat — unless bashOutputMaxChars is set in a settings file (managed, .claude/settings.local.json, .claude/settings.json or ~/.claude/settings.json, the highest level winning, clamped to 4,000-128,000), and then the variable is ignored. Above that limit the harness already writes the output to a file and sends the model a preview and the path (Claude Code 2.1.261 or later): trimhook is the same idea at a lower cap, keeping the tail too. Codex budgets tool output by tokens (tool_output_token_limit).`

  Code spans on both names, the four paths, `tool_output_token_limit`. Keep "Those are
  ceilings, and they cut from the end: …" and the rest of the paragraph.
- `README.md:84-86` ("Then `trimhook doctor` says which harness it sees, … trimhook never
  sees the rest."): append

  `It reads bashOutputMaxChars from those four files, best-effort, and BASH_MAX_OUTPUT_LENGTH only when none sets it. It cannot see a --settings file passed on the command line, which no hook or terminal command can read, nor managed policy delivered by MDM, the registry, managed-settings.d/ or the claude.ai console; and it has no hook input, so its harness verdict comes from the environment only.`

  Code spans on `bashOutputMaxChars`, `BASH_MAX_OUTPUT_LENGTH`, `--settings`,
  `managed-settings.d/`.
- `CLAUDE.md:62-64`, rule 5 ("**Under the harness's ceiling.** Claude Code's
  `BASH_MAX_OUTPUT_LENGTH` (default 30,000) cuts first, flat; trimhook works on what
  survives. `doctor` warns when the harness cap is below ours.") becomes
  `**Under the harness's ceiling.** Claude Code's own limit — bashOutputMaxChars from the settings files when set (clamped 4,000-128,000), else BASH_MAX_OUTPUT_LENGTH (default 30,000) — acts first; trimhook works on what survives. doctor reads both, best-effort, and warns when the one in force is below ours.`
  (code spans on the names and `doctor`.)
- `CLAUDE.md:82`, the sentence "`BASH_MAX_OUTPUT_LENGTH` default 30,000, max 150,000,
  overridden by `bashOutputMaxChars`." (S2 appended its `PostToolUseFailure` sentence after
  it; leave that) becomes
  `BASH_MAX_OUTPUT_LENGTH default 30,000, max 150,000; bashOutputMaxChars (v2.1.261+, top-level, any of the four settings files, highest level wins, clamped 4,000-128,000) makes Claude Code ignore it, and above it saves the output to a file and sends a preview plus the path (settings reference, read 2026-09-23). Managed file paths (re-read 2026-09-29): /Library/Application Support/ClaudeCode/, /etc/claude-code/, C:\Program Files\ClaudeCode\.`
  (code spans on the names and paths.)
- `CLAUDE.md`, S10's "Verifying a change" paragraph ("`check` also holds the README to
  what the code does: …"): before its last sentence ("One regex per statement, …") insert
  `It also wants BASH_MAX_OUTPUT_LENGTH and bashOutputMaxChars in one README paragraph, the 4,000-128,000 clamp, and the --settings gap doctor cannot read.`
- `CHANGELOG.md`, first bullet under `### Changed`:
  `- doctor reads bashOutputMaxChars from the four Claude Code settings files — managed, .claude/settings.local.json, .claude/settings.json, ~/.claude/settings.json; the highest level wins, clamped to 4,000-128,000 — and compares trimhook's cap against it, falling back to BASH_MAX_OUTPUT_LENGTH only when none sets it, since Claude Code then ignores the variable. doctor also says its harness verdict comes from the environment only, and the README names what it cannot see: --settings on the command line and managed policy that is not a file (TH-1, D8).`

### Tests

`test/misc.test.mjs`:

- **The existing doctor test**
  `doctor: writable data dir, config problems are BAD, the harness cap is a warning`
  (`:105-113`): each of its three `doctor({ cwd: d, env: … })` calls gains
  `home: d, managedSettingsPath: join(d, 'managed.json')`, so a real
  `~/.claude/settings.json` or managed file that sets `bashOutputMaxChars` cannot silence
  its `BASH_MAX_OUTPUT_LENGTH` assertion. Do the same for S6's `doctor warns …` test and
  S8's `doctor(…)` call in `Codex config: …`. No assertion changes.
- Two new tests, directly after S6's `doctor warns when the log holds …` test (which follows
  the doctor test above). In both: `d = tmp()`, `home = join(d, 'home')`,
  `managed = join(d, 'managed.json')`, `mkdirSync(join(home, '.claude'), {recursive: true})`,
  `mkdirSync(join(d, '.claude'))`; `w = (p, o) => writeFileSync(p, typeof o === 'string' ? o : JSON.stringify(o))`;
  `dr = (extra = {}) => doctor({ cwd: d, env: env(d, extra), home, managedSettingsPath: managed })`;
  and `w(join(d, 'user.json'), {cap: 8000})` first — `env(d)` points `TRIMHOOK_USER_CONFIG`
  there, and the explicit cap keeps every `8000` below true if S15 moves the default.
  Add `mkdirSync` to the `node:fs` import (`:3`).

| Case | Input (cumulative, in this order) | Expected |
|---|---|---|
| `doctor: bashOutputMaxChars from the settings files wins over BASH_MAX_OUTPUT_LENGTH, highest level first` | (a) `w(join(home,'.claude','settings.json'), {bashOutputMaxChars: 100000})`; `r = dr({BASH_MAX_OUTPUT_LENGTH: '4000'})` | no line matches `/^  warn/`; one line equals `` `  ok    BASH_MAX_OUTPUT_LENGTH=4000 ignored: bashOutputMaxChars is set in ${join(home,'.claude','settings.json')}` ``; one equals `` `  ok    harness cap: bashOutputMaxChars 100,000 (${join(home,'.claude','settings.json')}), above trimhook's cap 8000` ``; `r.broken false` |
| (same test) | (b) `w(join(d,'.claude','settings.json'), {bashOutputMaxChars: 6000})`; `r = dr()` | one line starts `` `  warn  bashOutputMaxChars 6,000 (${join(d,'.claude','settings.json')}) is below trimhook's cap 8000: ` ``; no line contains `BASH_MAX_OUTPUT_LENGTH` |
| (same test) | (c) `w(join(d,'.claude','settings.local.json'), {bashOutputMaxChars: 50000})`; `r = dr()` | no `warn` line; one line contains `bashOutputMaxChars 50,000 (${join(d,'.claude','settings.local.json')})` |
| (same test) | (d) `w(managed, {bashOutputMaxChars: 1000})`; `r = dr()` | one line starts `` `  warn  bashOutputMaxChars 4,000 (${managed}, 1,000 clamped to 4,000-128,000) is below trimhook's cap 8000` `` |
| (same test) | (e) `w(managed, 'not json')`; `w(join(d,'.claude','settings.local.json'), {bashOutputMaxChars: 'lots'})`; `r = dr()` | the value from (b) applies: one line starts `  warn  bashOutputMaxChars 6,000 (` and contains `join(d,'.claude','settings.json')`; `r.broken false` |
| `doctor: with no bashOutputMaxChars set, BASH_MAX_OUTPUT_LENGTH decides; the harness verdict is from the environment only` | nothing written; `r = dr({BASH_MAX_OUTPUT_LENGTH: '4000'})` | one line matches `/^  warn  BASH_MAX_OUTPUT_LENGTH=4000 is below trimhook's cap 8000/`; no line contains `bashOutputMaxChars`; the first line matches `/^  ok    harness: claude \(decided by CLAUDE_PLUGIN_ROOT\) — from the environment only; doctor sees no hook input$/` (`env()` sets `CLAUDE_PLUGIN_ROOT`) |

Neither test reads the real `~/.claude` or the real managed file.

### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node --test --test-reporter=tap --test-name-pattern='bashOutputMaxChars' test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '
#   # pass 2, # fail 0
mkdir -p "$d/.claude" "$d/home" && printf '{"bashOutputMaxChars":5000}' > "$d/.claude/settings.json" && (cd "$d" && HOME="$d/home" TRIMHOOK_DATA="$d/data" TRIMHOOK_USER_CONFIG="$d/u.json" BASH_MAX_OUTPUT_LENGTH=100000 node "$R/bin/trimhook.mjs" doctor)
#     ok    harness: claude (decided by default — …) — from the environment only; doctor sees no hook input
#     ok    BASH_MAX_OUTPUT_LENGTH=100000 ignored: bashOutputMaxChars is set in …/.claude/settings.json
#     warn  bashOutputMaxChars 5,000 (…/.claude/settings.json) is below trimhook's cap 8000: …
#   and no warn line naming BASH_MAX_OUTPUT_LENGTH. (A managed-settings.json on this machine
#   that sets bashOutputMaxChars would win here — that is the precedence working; check with
#   ls "/Library/Application Support/ClaudeCode/" /etc/claude-code/ 2>/dev/null.)
grep -c -- '--settings' README.md; grep -c '4,000-128,000' README.md
#   1 or more; 1 or more
node bin/trimhook.mjs check
#   ok — …
for pat in 'bashOutputMaxChars' '4,000-128,000' '--settings'; do
  c=$(mktemp -d) && cp -R "$R" "$c/r" && perl -i -ne "print unless /\Q$pat\E/" "$c/r/README.md" && node "$c/r/bin/trimhook.mjs" check 2>&1 | grep -c '^✗ README.md must state'; done
#   three lines, each 1 or more
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
```

### Acceptance criteria

- [ ] Both `bashOutputMaxChars` tests pass; the existing doctor tests pass with the
  isolation arguments and no other change.
- [ ] `doctor` from a terminal prints the environment-only line and, with a settings value,
  compares against it and not against `BASH_MAX_OUTPUT_LENGTH`.
- [ ] No test reads the real home or the real managed file.
- [ ] Deleting any guarded README statement fails `check`.
- [ ] G holds.

---

---

## S12 · TH-9: the Codex run, live — human

Implements D5's observation. **Who:** the maintainer, with Codex CLI and a model session.
An agent cannot stand in: the verdict is what the model did. It runs the protocol S5 wrote
into `evals/codex-live.md` (`## Protocol`, nine steps) and records six runs.

### Files touched

| Path | Action |
|---|---|
| `evals/codex-live.md` | modify — rows under `## Runs`; the `**Verdict:**` line |
| `thoughts/TH-1-output-hygiene/99-progress.md` | modify — the S12 row in `## Step status`, one dated row in `## Verifications run` |

Nothing executable changes. Nothing else is committed: the scratch repository, its
`u.json`, `data/` and `stderr-*.txt` stay on the machine.

### What an agent can prepare beforehand

An agent session may do P1-P4 and nothing after them; it reports the four outputs to the
maintainer.

- **P1 — S8 is merged in this checkout.**
  `grep -c "mode: 'continue'" bin/lib/config.mjs` prints `1`;
  `grep -c '^## Runs' evals/codex-live.md` prints `1`;
  `grep -cE '^\*\*Verdict:\*\* pending' evals/codex-live.md` prints `1`.
  Any other output: stop — S12 runs only after S5 and S8 (`03-structure.md`, edges).
- **P2 — the shape the runs will exercise.** Part two's S8 Verify pipe, opted in, prints
  `false string false true`:

  ```bash
  d=$(mktemp -d)
  seq6000='process.stdout.write(JSON.stringify({hook_event_name:"PostToolUse",session_id:"s",turn_id:"t",tool_use_id:"c1",tool_name:"Bash",tool_input:{command:"seq 1 6000"},tool_response:Array.from({length:6000},(_,i)=>i+1).join("\n")}))'
  printf '{"codex":{"replace":true}}' > $d/u.json && node -e "$seq6000" | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(o.continue,typeof o.stopReason,"decision" in o,o.stopReason.trim().split("\n").at(-1).startsWith("trimhook:"))'
  ```
- **P3 — green.** `npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '`
  prints `# fail 0` and `# todo 0`.
- **P4 — the branch.** `git switch -c th-9-live-run main`. The maintainer runs the
  protocol **from this checkout and does not switch its branch until the six runs are
  done**: `print-hooks` writes this checkout's absolute path into the scratch repository's
  hooks file, so a branch switch changes the hook mid-series.

### Protocol — the maintainer

Run in one terminal, from the checkout root, in this order. Every command after step 2 is
the one `evals/codex-live.md` `## Protocol` gives; the numbers in brackets are that file's
step numbers.

1. **Codex version.** `codex --version` prints `codex-cli <version>`. It must be 0.155 or
   later; below that, update Codex and start again. Write the version down (e.g.
   `0.155.1`); every row carries it. If Codex updates between runs, discard the rows so
   far and restart the series — all six rows carry one version.
2. **Scratch repository and config** ([1]-[3]):

   ```bash
   R=$(git rev-parse --show-toplevel)
   S=$(mktemp -d) && cd "$S" && git init -q && mkdir -p .codex
   node "$R/bin/trimhook.mjs" print-hooks > .codex/hooks.json
   printf '{"codex":{"replace":true,"mode":"continue"}}' > "$S/u.json"
   export TRIMHOOK_USER_CONFIG="$S/u.json" TRIMHOOK_DATA="$S/data"
   ```

   Which config goes where, and why:
   - `$S/.codex/hooks.json` — the hook, pointing at `$R/bin/trimhook.mjs`. Nothing is
     written to `~/.codex/hooks.json`.
   - `$S/u.json`, via `TRIMHOOK_USER_CONFIG` — trimhook's user layer for this shell only.
     `~/.trimhook.json` is neither read nor changed, so a live week (S14) running at the
     same time keeps its cap. No `.trimhook.json` goes into `$S`: a repository file may
     not set `codex.*` (denied, part one S7) and would only add a `problems` entry.
   - `$S/data`, via `TRIMHOOK_DATA` — the log and the spill files. The runs never enter
     the week's log in `~/.trimhook`.
3. **Three runs with `mode: continue`**, `N` = 1, 2, 3. For each:
   1. `N=1` (then 2, 3), and the `codex exec` command of [4] exactly as the file gives it,
      from `$S`.
   2. [5] `grep -c 'error=' "$S/stderr-$N.txt"` → the count for **Router error=**. When it
      is not `0`, `grep 'error=' "$S/stderr-$N.txt"` and read the line: a line from Codex's
      hook dispatch counts; a line plainly about something else (network, auth) does not
      and is written `0 (1 unrelated)`.
   3. [6] `F=$(ls -t ~/.codex/sessions/*/*/*/*.jsonl | head -1)` and the file's `node -e`
      extraction. Then, **once per run**, keep the session file out of S14's scan:
      `mkdir -p ~/.trimhook && echo "$F" >> ~/.trimhook/th-9-sessions.txt` (a local list,
      never committed).
   4. The model name, for the version cell:
      `node -e 'for(const l of require("fs").readFileSync(process.argv[1],"utf8").split("\n")){try{const p=(JSON.parse(l).payload)??{};if(typeof p.model==="string"){console.log(p.model);break}}catch{}}' "$F"`
      — prints the first `model` field in the session, or nothing (write `model unknown`).
   5. [7] the tool-names one-liner over `$S/data/results.jsonl`, and check the last record:
      `tail -1 "$S/data/results.jsonl"` shows `"outcome":"trimmed"` and `"before":28893`.
      If `before` is about 500, the model passed `max_output_tokens` and Codex cut before
      the hook: **discard the run** (no row), count it, and repeat the same `N`.
   6. [8] Read the model's reply — what `codex exec` printed on stdout, in the terminal.
4. **Three runs with `mode: block`**, for the README's comparison:
   `printf '{"codex":{"replace":true,"mode":"block"}}' > "$S/u.json"`, then step 3 again
   with `N` = 4, 5, 6.
5. **Clean up** ([9]): `rm "$S/.codex/hooks.json"; unset TRIMHOOK_USER_CONFIG TRIMHOOK_DATA; cd "$R"`.

### How each run is recorded

One row per run under `## Runs`, in run order, directly under the table's separator line
(replacing nothing; the "One row per run …" sentence S5 wrote stays below the table). The
nine cells, exactly these values:

| Column | Value |
|---|---|
| Date | `date +%F` on the day of the run, e.g. `2026-10-02` |
| Codex version | `<version> / <model>`, e.g. `0.155.1 / <model name from step 3.4>` |
| Mode | `continue` or `block` — the value in `u.json` for that run |
| Tool names seen | step 3.5's output, comma-separated, e.g. `Bash` |
| Error prefix | from step 3.3's `output` line: `none`; `Script failed` (the text starts with it); `Script error` (it carries it); both → `Script failed + Script error`; `untrimmed` when the output carries no `trimhook:` at all — the replacement never reached the model |
| Router error= | step 3.2's count: `0`, `1`, … (or `0 (1 unrelated)`) |
| Head quoted | `yes` if the reply gives `1` as the first line; `no`; `no — turn stopped` if Codex ended with no reply after the tool call |
| Tail quoted | `yes` if the reply gives `6000` as the last line; `no`; `no — turn stopped` |
| Re-run | `no` when step 3.3 prints exactly one `call` line running `seq`; else `yes (<n> calls)` |

A row for mode `continue` in Bash, for example:
`| 2026-10-02 | 0.155.1 / <model> | continue | Bash | none | 0 | yes | yes | no |`.

**Another tool.** When step 3.5 prints a tool other than `Bash` (e.g. `Bash,Read`), the
run gets one more row, same date, version and mode, with **Tool names seen** = that tool
alone and the other cells judged on that tool's own `call`/`output` pair from step 3.3.
The Bash row lists every tool seen (`Bash,Read`).

Nothing else goes in a cell: no path, no session id, no quoted reply beyond `1`/`6000`.

### The verdict

**Pass** when every `continue` row — the three Bash rows and any other tool's rows — reads
Error prefix `none`, Router error= `0` (or `0 (… unrelated)`), Head `yes`, Tail `yes`,
Re-run `no`. Anything else in any `continue` row is **fail**. `block` rows never decide
(D5: they are the comparison the README will cite).

Replace the line `**Verdict:** pending — pass or fail, with the date and the Codex version.`
with **one line** (do not wrap it — the Verify grep is per line):

- Pass:
  `**Verdict:** pass — <date of run 3>, Codex <version> (<model>): continue 3 of 3 — trimmed text, no error prefix, no router error=, head and tail quoted, no re-run; block <k> of 3 prefixed "Script failed", router error= in <k> of 3, head and tail quoted in <h> of 3; tools seen: <list>; runs discarded for max_output_tokens: <n>.`
- Fail:
  `**Verdict:** fail — <date of run 3>, Codex <version> (<model>): continue <j> of 3 passed — <each failed criterion with its run numbers, e.g. "run 2: turn stopped, no reply"; "runs 1-3: Script error prefix">; block <k> of 3 prefixed "Script failed", router error= in <k> of 3, head and tail quoted in <h> of 3; tools seen: <list>; runs discarded for max_output_tokens: <n>.`

S13 reads the first word after `**Verdict:**` and the clause after `continue` and quotes
both into the README, so they must be exact.

### `99-progress.md`

- `## Step status`: the S12 row becomes
  `| S12 | done | — | <short sha of this commit, filled after committing, or —> | TH-9 <pass|fail> — evals/codex-live.md |`
  (add the row if the table has none for S12).
- `## Verifications run`: one row, dated —
  `| TH-9 protocol, evals/codex-live.md ## Runs | S12, <date of run 3> | <pass|fail> — Codex <version>, 3 continue + 3 block runs, <n> discarded; verdict line in evals/codex-live.md |`.

### Verify

```bash
grep -cE '^\| 2026-[0-9-]+ \|.*\| continue \|' evals/codex-live.md   # 3 or more
grep -cE '^\| 2026-[0-9-]+ \|.*\| block \|' evals/codex-live.md      # 3 or more
grep -nE '^\*\*Verdict:\*\* (pass|fail) — 2026-[0-9]{2}-[0-9]{2}, Codex [0-9]+\.[0-9]+' evals/codex-live.md
#   one line
grep -cE '^\*\*Verdict:\*\* pending' evals/codex-live.md              # 0
node -e 'const rows=require("fs").readFileSync("evals/codex-live.md","utf8").split("\n").filter(l=>/^\| 2026-/.test(l)).map(l=>l.split("|").slice(1,-1).map(s=>s.trim()));const seen=new Set(rows.flatMap(r=>r[3].split(/,\s*/)));const missing=[...seen].filter(t=>t!=="Bash"&&!rows.some(r=>r[3]===t));console.log(rows.length+" rows; tools "+[...seen].join(",")+"; missing own row: "+(missing.join(",")||"none"))'
#   6 rows; tools Bash; missing own row: none      (more rows if another tool was seen)
grep -c 'evals/codex-live.md' thoughts/TH-1-output-hygiene/99-progress.md   # 1 or more
git add evals/codex-live.md thoughts/TH-1-output-hygiene/99-progress.md
git diff --cached -U0 | grep -E '^\+[^+]' | grep -nE '/Users/|/home/|/var/folders/|/tmp/|rollout-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-'
#   nothing
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
git commit -m 'TH-9: the Codex run, live — <pass|fail> on Codex <version> (TH-1 S12)'
```

No CHANGELOG entry and no BACKLOG edit: nothing shipped changes (`evals/` is not in the
package), and TH-9 is ticked by S13.

### Acceptance criteria

- [ ] Six rows or more, three per mode, one Codex version throughout; every non-Bash tool
  seen has its own row.
- [ ] One verdict line, `pass` or `fail`, dated, naming version and model.
- [ ] `99-progress.md` points at the file; the privacy grep prints nothing; G holds.

---

---

## S13 · Apply the TH-9 verdict

Implements D5's outcome. **Who:** agent, reading what S12 recorded. TH-9 is done on either
branch. Serialised with S15 (`bin/lib/config.mjs`, `.github/workflows/ci.yml`, the README
config block): if S15 merged first, rebase on it and keep its cap wherever the two meet.

### Step 0 — read the verdict (both branches)

```bash
sed -nE 's/^\*\*Verdict:\*\* (pass|fail) — ([0-9]{4}-[0-9]{2}-[0-9]{2}), Codex ([0-9][0-9.]*).*/\1 \2 \3/p' evals/codex-live.md
#   e.g.  pass 2026-10-02 0.155.1
```

The three words are `<verdict> <date> <version>` below. No output, or more than one line:
stop — S12 is not recorded; say so in `99-progress.md` and do nothing else. Also copy the
verdict line's two clauses verbatim for the fail branch: `<continue clause>` = the text
from `continue ` up to the next `;`, `<block clause>` = from `block ` up to the next `;`.
`<cap>` = `node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.cap))'`
(8000 unless S15 has landed).

---

### Branch PASS — `codex.replace` defaults `true`, `mode: continue`

#### Files touched

| Path | Action |
|---|---|
| `bin/lib/config.mjs` | modify — one line |
| `bin/lib/doctor.mjs` | modify — one message |
| `test/handlers.test.mjs`, `test/misc.test.mjs` | modify — the Codex tests' default expectations |
| `.github/workflows/ci.yml` | modify — the comment and the Codex line of the handler block |
| `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `BACKLOG.md`, `ROADMAP.md` | modify (ROADMAP regenerated) |

#### Changes

**`bin/lib/config.mjs`** — the `DEFAULTS` line S8 left,
`  codex: { replace: false, mode: 'continue' }, // replacement is opt-in until TH-9's live run`,
becomes
`  codex: { replace: true, mode: 'continue' }, // TH-9, <date>, Codex <version>: continue: false reached the model as the tool's result, 3 of 3`.
The three-line `// D5: …` comment above it stays. **Do NOT touch:** `cap`, `RULES`,
`REPO_CLASS` (`codex.replace` stays `denied` to a repository file).

**`bin/lib/doctor.mjs`** — the warning
`'codex.replace is off: on Codex trimhook measures (outcome would-trim) and does not replace the result — see README'`
becomes
`'codex.replace is off (the default is on since TH-9): on Codex trimhook measures (outcome would-trim) and does not replace the result — see README'`.
Condition unchanged (`harness === 'codex' && !cfg.codex.replace`). If the README quotes the
old text (`grep -n 'codex.replace is off' README.md`), change it the same way.

**`test/handlers.test.mjs`** — the test S8 titled
`Codex: measured only until codex.replace is on; then continue false (default) or decision block (codex.mode) carries the trimmed text`:

- Retitle it `Codex: continue false carries the trimmed text by default (TH-9); decision block behind codex.mode; codex.replace false measures only`.
- Its first call ran with no user file and expected `null` and `would-trim`. Now, before
  that call, `writeFileSync(join(d, 'user.json'), JSON.stringify({ cap: 8000 }))`, and the
  call's expectations become S8's case (2) assertions (`out.continue === false`, a string
  `stopReason`, no `decision`, the last line matching `/^trimhook: [\d,]+ characters elided/`,
  the body `<= 8000`), plus `log(d).at(-1).outcome === 'trimmed'` and
  `log(d).at(-1).harness === 'codex'`.
- S8's cases (2) and (3) stay as they are.
- A last case: `{"cap":8000,"codex":{"replace":false}}` → the call returns `null` and
  `log(d).at(-1).outcome === 'would-trim'`.
- Where S8's assertions index the log by position (`log(d)[0]`, `log(d)[1]`), switch them
  to `log(d).at(-1)` after each call; the order of calls is now (1) default, (2), (3),
  (4) off.

**`test/misc.test.mjs`** — in `Codex config: codex.mode defaults to continue, …`, case (1)
`cfg.codex` deep-equals `{replace: false, mode: 'continue'}` → `{replace: true, mode: 'continue'}`.
Then `grep -nE "codex\.replace|replace: (true|false)|would-trim|PLUGIN_ROOT" test/*.mjs`
and review each hit outside `test/trim.test.mjs`: an assertion that the **default** is
`false`, or that Codex under a config without `codex.replace` prints nothing or logs
`would-trim`, flips to the replacement; a repository-layer denial test that sets
`codex.replace: true` in the repository file changes it to `false`, so the denied value
still differs from the one above it. Audit-mode tests (`TRIMHOOK_MODE: 'audit'`) and
assertions under an explicit `replace: false` are right as they are.

**`.github/workflows/ci.yml`** (the handler block, `:29-42`):

- The comment's last clause (`:31`) "and, on Codex, as nothing until codex.replace is on."
  becomes "and, on Codex, as continue: false with the trimmed text in stopReason (TH-9)."
  — the comment stays three lines.
- The Codex check (`:42`, the line
  `test -z "$out" || { echo "Codex: replacement must be opt-in, got $out"; exit 1; }`)
  becomes this one line, ten-space indent, with `8000` replaced by `<cap>` if S15 moved it
  (the same number as the Claude Code bound at `:40`):

  ```bash
          echo "$out" | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));const t=o.stopReason,i=t.lastIndexOf("\n");if(!(o.continue===false&&!("decision" in o)&&t.slice(i+1).startsWith("trimhook:")&&t.slice(0,i).length<=8000&&/trimhook: [\d,]+ of/.test(t)))process.exit(1)' || { echo "Codex: expected continue: false with the trimmed text, got $out"; exit 1; }
  ```

  The block is still `:33-42` (one line replaced by one line), so `sed -n '33,42p'` holds.

**`README.md`**:

- The `:42` Effect cell, S8's parenthesis: replace
  "on Codex, opt-in until verified live, `continue: false` with the trimmed text as the
  `stopReason` — then `[stderr]` if any, and the note as its last line — or
  `decision: block` when `codex.mode` is `block`" with
  "on Codex, `continue: false` with the trimmed text as the `stopReason` — then `[stderr]`
  if any, and the note as its last line — verified live on <date>, Codex <version>;
  `decision: block` only when `codex.mode` is `block`".
- The Codex paragraph S8 added after the install block: its first two sentences
  ("On Codex the replacement is opt-in: `"codex": { "replace": true }` in
  `~/.trimhook.json`. It answers `continue: false` by default.") become
  "On Codex the replacement is on by default since TH-9: it answers `continue: false`,
  which Codex <version> passed to the model as the tool's own result — no failure label,
  no router `error=`, head and tail quoted, no re-run, in 3 of 3 runs on <date>
  (`evals/codex-live.md`). `"codex": { "replace": false }` in `~/.trimhook.json` turns it
  back to measuring only." The rest of the paragraph (`"mode": "block"`, `max_output_tokens`)
  is unchanged.
- The config block line `  "codex": { "replace": false, "mode": "continue" },` →
  `  "codex": { "replace": true, "mode": "continue" },`.
- `grep -nE 'opt-in|opt in' README.md`: every remaining hit about the **Codex
  replacement** is rewritten to say it is on by default since TH-9; other hits stay.

**`CLAUDE.md`**:

- Rule 8 (`:70-71`) becomes:
  `8. **Codex replacement is on by default since TH-9** (codex.replace, codex.mode: continue): continue: false was observed live on <date>, Codex <version>, 3 of 3 runs (evals/codex-live.md). decision: block is never the default — Codex records it as a failed call. On a new Codex, re-run that protocol before changing either.`
  (code spans on the keys, values, shapes and the path; wrap to the file's width.)
- The end-to-end paragraph (`:107-108`): "`codex.replace: true` in `~/.trimhook.json`, "
  is removed; after "in a scratch repo" add "(the replacement is on by default)".

**`CHANGELOG.md`**, first bullet under `### Changed`:
`- Codex: the replacement is on by default (codex.replace: true, codex.mode: continue). TH-9's live run on Codex <version> (<date>) saw continue: false reach the model as the tool's own result in 3 of 3 runs — no "Script failed" label, no router error=, head and tail quoted, no re-run; decision: block stays behind codex.mode. "codex": { "replace": false } in ~/.trimhook.json measures only (TH-9).`
(code spans on keys, values, shapes and the path.)

**`BACKLOG.md`** TH-9 (`:70-73`, as S5 left it): `- [ ]` → `- [x]`; before the trailer
insert ` Done <date>: continue: false passed 3 of 3 on Codex <version>; codex.replace defaults to true (evals/codex-live.md).`
(code spans); the trailer becomes `<!-- th: prio=high size=S labels=hook,tests ver=main -->`.
Then `node scripts/backlog.mjs roadmap`.

#### Tests

| Case | Input | Expected |
|---|---|---|
| Codex default replaces | handlers Codex test, user file `{"cap":8000}` | `continue === false`; last line `trimhook: …`; body `<= 8000`; log `trimmed`, `codex` |
| block still behind the mode | `{"cap":8000,"codex":{"replace":true,"mode":"block"}}` | `decision === 'block'` (S8's case 3, unchanged) |
| opting out measures | `{"cap":8000,"codex":{"replace":false}}` | `null`; log `would-trim` |
| config default | `loadConfig(d, env(d))`, no files | `cfg.codex` deep-equals `{replace: true, mode: 'continue'}` |
| CI contract | the handler block, locally | `exit 0` |

#### Verify

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
seq6000='process.stdout.write(JSON.stringify({hook_event_name:"PostToolUse",session_id:"s",turn_id:"t",tool_use_id:"c1",tool_name:"Bash",tool_input:{command:"seq 1 6000"},tool_response:Array.from({length:6000},(_,i)=>i+1).join("\n")}))'
node -e "$seq6000" | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/none.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | node -e 'const o=JSON.parse(require("fs").readFileSync(0,"utf8"));console.log(o.continue,typeof o.stopReason,"decision" in o,o.stopReason.trim().split("\n").at(-1).startsWith("trimhook:"))'
#   false string false true      (no user config: the default replaces)
printf '{"codex":{"replace":false}}' > $d/u.json && node -e "$seq6000" | TRIMHOOK_DATA=$d TRIMHOOK_USER_CONFIG=$d/u.json PLUGIN_ROOT=/plugin node bin/trimhook.mjs post-tool-use | wc -c
#   0
RUNNER_TEMP=$d bash -e -c "$(sed -n '33,42p' .github/workflows/ci.yml | sed 's/^          //')"; echo "exit $?"
#   exit 0
node -e 'import("./bin/lib/config.mjs").then(m=>console.log(JSON.stringify(m.DEFAULTS.codex)))'
#   {"replace":true,"mode":"continue"}
grep -c '"codex": { "replace": true, "mode": "continue" }' README.md      # 1
grep -c 'opt-in until verified live' README.md CLAUDE.md                  # README.md:0, CLAUDE.md:0
node --test --test-reporter=tap --test-name-pattern='Codex' test/handlers.test.mjs test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '
#   # pass 4 (or more), # fail 0
grep -cE '^- \[x\] \*\*TH-9 ' BACKLOG.md                                   # 1
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1         # ok — ROADMAP.md is in step with BACKLOG.md
npm run build:site >/dev/null && echo site ok                              # site ok
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
```

`TRIMHOOK_USER_CONFIG=$d/none.json` names a file that does not exist, so the executor's
own `~/.trimhook.json` cannot change the answer.

#### Acceptance criteria

- [ ] With no configuration, Codex gets `{continue: false, stopReason}`; `replace: false`
  measures only; `block` only behind `codex.mode`.
- [ ] CI expects the `continue: false` shape; the local run of the block exits 0.
- [ ] README, CLAUDE.md rule 8 and the e2e paragraph, CHANGELOG say it, dated, with the
  version; TH-9 ticked `ver=main`; G and B hold.

---

### Branch FAIL — the default stays `false`; the README says what each shape did

#### Files touched

| Path | Action |
|---|---|
| `README.md`, `CLAUDE.md`, `CHANGELOG.md`, `BACKLOG.md`, `ROADMAP.md` | modify (ROADMAP regenerated) |

No code, no test, no workflow: `bin/`, `test/`, `.github/` are untouched.

#### Changes

**`README.md`**:

- The `:42` Effect cell: "opt-in until verified live" → "opt-in (TH-9, <date>: neither
  shape passed live)". The rest of the cell unchanged.
- The Codex paragraph S8 added after the install block: after its first sentence
  ("On Codex the replacement is opt-in: …"), insert, starting on a new physical line so the
  date and the shape share it:
  "Both shapes were tried live on <date>, Codex <version> (TH-9, `evals/codex-live.md`):
  `continue: false` <continue clause>; `decision: block` <block clause>. So the default
  stays off, and `codex.mode: continue` is the shape an opt-in gets."
  The two clauses are the verdict line's, verbatim.
- The config block is unchanged (`"replace": false`).

**`CLAUDE.md`** — rule 8 (`:70-71`) becomes:
`8. **Codex replacement stays opt-in** (codex.replace): TH-9 tried both shapes live on <date>, Codex <version> (evals/codex-live.md) — continue: false <continue clause>; decision: block is recorded as a failed call. On a newer Codex, re-run that protocol before changing the default.`
(code spans; wrap.) The end-to-end paragraph stays as it is.

**`CHANGELOG.md`**, first bullet under `### Changed`:
`- Codex: the replacement stays opt-in. TH-9 tried both shapes live on Codex <version> (<date>): continue: false <continue clause>; decision: block is recorded as a failed call. The README says so, dated; codex.mode: continue remains the shape an opt-in gets (TH-9).`

**`BACKLOG.md`** TH-9: `- [ ]` → `- [x]`; before the trailer insert
` Done <date>: neither shape passed on Codex <version> (evals/codex-live.md); codex.replace stays opt-in, and the README says what each did.`;
trailer `<!-- th: prio=high size=S labels=hook,tests ver=main -->`. Then
`node scripts/backlog.mjs roadmap`.

#### Tests

None new: nothing executable changes. The Verify greps are the tests.

#### Verify

```bash
node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.codex.replace))'   # false
grep -c 'tried live on <date>' README.md                                   # 1   (the real date substituted)
grep -c 'tried both shapes live on <date>' CLAUDE.md                        # 1
grep -c 'continue: false' README.md                                        # 1 or more
git diff --quiet main -- bin test .github && echo unchanged                 # unchanged
grep -cE '^- \[x\] \*\*TH-9 ' BACKLOG.md                                    # 1
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1          # ok — ROADMAP.md is in step with BACKLOG.md
npm run build:site >/dev/null && echo site ok                               # site ok
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
```

#### Acceptance criteria

- [ ] No code changed; the default is `false`.
- [ ] README (cell and paragraph), CLAUDE.md rule 8 and CHANGELOG say both shapes were
  tried, what each did, dated, with the version; TH-9 ticked `ver=main`; G and B hold.

---

### Both branches

- One commit: `TH-9: <Codex replacement on by default | Codex replacement stays opt-in> — the live verdict applied (TH-1 S13)`.
- `99-progress.md`: the S13 row `| S13 | done | <session> | <sha> | TH-9 <pass|fail> applied |`.
- **Release.** The entry sits under `## [Unreleased]`. On pass it changes what every Codex
  install does, so it ships in a minor (0.2.0 if merged before that tag, else the next);
  on fail it is documentation and rides any release.

---

---

## S14 · TH-10: the live week at cap 4,000 — human

Implements D3 and D6's measurement. **Who:** the maintainer — their own Claude Code (and,
if used, Codex) sessions for at least seven days. Runs beside S10-S13; it commits records
only.

### Files touched

| Path | Action |
|---|---|
| `evals/results/<YYYY-MM-DD>-reads.json` | new — written by `node evals/reads.mjs --json` at the end of the week, anonymised before commit |
| `BACKLOG.md`, `ROADMAP.md` | modify — one dated **State** sentence in TH-10 (ROADMAP regenerated) |
| `thoughts/TH-1-output-hygiene/99-progress.md` | modify — the S14 row, one dated row in `## Verifications run` |

Nothing else is committed: the log, the transcripts, the report text and the scratch
view of the week stay on the machine.

### Two things neither script does, and how the protocol makes up for them

- **Neither `report` nor `evals/reads.mjs` has a date filter.** `report` reads every record
  in the data dir; `reads.mjs` reads every transcript under `HOME`. So day 0 renames the
  old log out of `report`'s sight, and the end of the week points `reads.mjs` at a `HOME`
  that holds only the week's session files (symlinks — `files()` follows them, and
  `isSpillRead` never reads `HOME`, Minimum context).
- **A session resumed from before the week carries pre-week cuts at 8,000.** Close every
  session before day 0 and do not resume any of them during the week.

### What an agent can prepare beforehand

An agent session may do P1-P3 and report the outputs; the maintainer does the rest.

- **P1 — the steps the week needs are merged** (from `main`'s root):

  ```bash
  grep -c 'readsSpill' bin/lib/store.mjs                        # 1 or more  (S1)
  grep -c 'SUBSET = 9500' evals/reads.mjs                       # 1          (S4)
  grep -c 'flags' bin/lib/report.mjs                            # 1 or more  (S6)
  grep -c 'export const REPO_CLASS' bin/lib/config.mjs          # 1          (S7)
  grep -c 'export function recompute' bin/lib/report.mjs        # 1          (S9)
  grep -c '^### How the week decides the default cap' README.md # 1          (S9)
  grep -c 'export const MANAGED_SETTINGS' bin/lib/doctor.mjs    # 1          (S11, recommended)
  ```

  Any required count missing: stop — the week cannot start (`03-structure.md`, S14 edges).
  S11 missing: the week may start, but step 4's `bashOutputMaxChars` check is then blind.
- **P2 — green:** G prints `# fail 0` and `# todo 0`.
- **P3 — the pinned checkout for the week:**
  `git worktree add ../trimhook-week "$(git rev-parse --short main)" && git -C ../trimhook-week rev-parse --short HEAD`
  → prints `<sha>`, the commit the whole week runs. Both harnesses run the hook from that
  worktree, so switching branches in the main checkout never changes the hook mid-week.

### Day 0 — the maintainer

In a plain terminal (not inside a harness session: a hook there would cut these outputs).
`WK=$(cd ../trimhook-week && pwd)` first; every command below uses it.

1. **Install from the pinned worktree.**
   - Claude Code: in a session opened in `$WK`, `/plugin marketplace add .` then
     `/plugin install trimhook@trimhook`. If a trimhook marketplace or plugin from GitHub or
     npm is already installed, remove it first through `/plugin`: exactly one trimhook hook
     may run, or every result is cut and logged twice. Restart Claude Code.
   - Codex, only if you will use it this week:
     `test -e ~/.codex/hooks.json && cp ~/.codex/hooks.json ~/.codex/hooks.json.before-th10; node "$WK/bin/trimhook.mjs" print-hooks > ~/.codex/hooks.json`,
     and trust it when Codex asks. Codex cuts reach `reads.mjs` only when the Codex
     replacement is on (S13's pass, or `codex.replace: true`); with it off they are
     logged `would-trim`, counted by `report`, and invisible to the rule.
2. **The week's config.**

   ```bash
   test -e ~/.trimhook.json && cp ~/.trimhook.json ~/.trimhook.json.before-th10
   printf '{"cap": 4000, "tools": ["Bash", "Read", "WebFetch"]}\n' > ~/.trimhook.json
   env | grep '^TRIMHOOK_'            # nothing
   ```

   Exactly these two keys: no `perCommand` (the rule assumes one cap), no `mode`,
   `minSaving` or `head` (the rule's 9,500 is 8,000 plus the default `minSaving`). A
   `TRIMHOOK_*` variable in the shell profile overrides the file: remove it for the week.
3. **Check it.** `node "$WK/bin/trimhook.mjs" doctor` prints a line starting
   `  ok    mode trim · cap 4000 · head 0.6 · minSaving 1500 ·`, no `BAD` line, and no
   warning containing `is below trimhook's cap 4000` (neither `bashOutputMaxChars` nor
   `BASH_MAX_OUTPUT_LENGTH`). A repository's `.trimhook.json` may set `cap` and
   `perCommand` (class `either`): run the same `doctor` from the root of each repository
   you expect to work in this week; any that does not print `cap 4000` has its file moved
   aside for the week, or is not worked in.
4. **Smoke test** — before the stamp, so it stays out of the week. In a fresh Claude Code
   session: ask it to run `seq 1 5000`, then to run `cat` on the path the marker names.
   Expected: the first result is a head, one line
   `… [trimhook: <about 20,000> of 23,892 characters elided. Full output: <path>] …`, and a
   tail, at most 4,000 characters in all; the `cat` result has no marker and ends with
   `5000` (S1's exemption is installed — `cat`, not `Read`, because `Read` stops at 2,000
   lines by itself); `tail -1 ~/.trimhook/results.jsonl` shows `"spillRead":true`.
   Close that session and never resume it.
5. **Start clean, stamp the start.**

   ```bash
   D=~/.trimhook
   for f in results.jsonl results.1.jsonl; do test -e "$D/$f" && mv "$D/$f" "$D/pre-th10-$f"; done
   touch "$D/th-10-start" && date +%F        # <start date>
   ```

   Nothing is deleted: the old log keeps its content under a name `report` does not read.
   Close every Claude Code and Codex session opened before this point.

### Days 1-7

Work as usual. Do not edit `~/.trimhook.json`, reinstall the plugin, or move `$WK` off
`<sha>`. If the hook must change (a bug), the week restarts from day 0 with a new start
date: a change mid-week splits the sample. Once a day, read-only, from a plain terminal:

```bash
node "$WK/bin/trimhook.mjs" report | grep -E '^(## trimhook|trimmed )'   # the count grows
node "$WK/bin/trimhook.mjs" doctor | grep -cE '^  BAD|cap 4000'          # 1 (the cap line, no BAD)
```

### End of the week — day 7 or later

Close every Claude Code and Codex session first, so nothing writes to the log or to a
transcript while the numbers are taken; run everything in a plain terminal, from the
**main** checkout root (not `$WK`: the JSON is committed from there), on a new branch:
`git switch -c th-10-week main`.

6. **The week's transcripts only** — every session file written since the stamp, less the
   S12 runs S12 listed:

   ```bash
   D=~/.trimhook; WK_HOME=$(mktemp -d); touch "$D/th-9-sessions.txt"
   for root in .claude/projects .codex/sessions; do
     test -d "$HOME/$root" || continue
     find "$HOME/$root" -name '*.jsonl' -newer "$D/th-10-start" | grep -vxFf "$D/th-9-sessions.txt" | while IFS= read -r f; do
       rel=${f#"$HOME"/}; mkdir -p "$WK_HOME/$(dirname "$rel")"; ln -s "$f" "$WK_HOME/$rel"
     done
   done
   find "$WK_HOME" -name '*.jsonl' | wc -l     # the week's session files: more than 0
   ```
7. **The re-read count** (writes the JSON):
   `HOME="$WK_HOME" node evals/reads.mjs --json | tee "$WK_HOME/reads.txt"`
   — first line `## What the model did after a cut (TH-10, window 12)`, a per-tool table,
   a line starting `- D3 rule, for a week run at cap 4,000: default ` or `- D3 rule: no verdict`,
   and last `written …/evals/results/<YYYY-MM-DD>-reads.json`. Set
   `F=evals/results/<YYYY-MM-DD>-reads.json` (that file). The date must be at least seven
   days after `<start date>`; if not, the week is not over.
8. **The saving side** (the log now holds only the week):

   ```bash
   node bin/trimhook.mjs report            | grep -E '^(## trimhook|trimmed |characters: |flags on kept)'
   node bin/trimhook.mjs report --cap 8000  | sed -n '/^## at cap/,/^cut /p'
   node bin/trimhook.mjs report --cap 12000 | sed -n '/^## at cap/,/^cut /p'
   ```

   Copy the numbers only; never the `top commands` line.
9. **Cross-checks** — the log's spill reads against the scan's, and the cap every record ran at:

   ```bash
   node -e 'const fs=require("fs"),p=require("path"),d=p.join(require("os").homedir(),".trimhook");let n=0,c=0,o=0;for(const f of ["results.1.jsonl","results.jsonl"]){let s="";try{s=fs.readFileSync(p.join(d,f),"utf8")}catch{continue}for(const l of s.split("\n")){let r;try{r=JSON.parse(l)}catch{continue}if(r.spillRead===true)n++;if(typeof r.cap==="number"){c++;if(r.cap!==4000)o++}}}console.log("log spillRead "+n+" · records with a cap "+c+" · at another cap "+o)'
   node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));console.log("scan spill reads "+(j.readBack+j.readBackLate)+" (in window "+j.readBack+")")' "$F"
   ```

   Expected: log `spillRead` **at least** the scan's total (the log sees every read of a
   spill path, the scan only an exact-path read after its cut); `at another cap 0`. Either
   expectation broken: record it as it is in the State line, add a row to
   `99-progress.md` `## Discoveries` (log below scan suggests the S1 exemption missed a
   form of read), and tell the maintainer; the rule still uses the scan's numbers.
10. **Anonymise the JSON** — `byCommand` keeps generic command names only, the rest folds
    into `(other)` with counts summed:

    ```bash
    node -e 'const fs=require("fs"),f=process.argv[1],j=JSON.parse(fs.readFileSync(f,"utf8"));const keep=/^(cat|sed|head|tail|grep|rg|find|ls|echo|for|while|awk|jq|curl|wc|diff|node|npx|npm( [a-z-]+)?|git( [a-z-]+)?|Read|WebFetch|\(codex\))$/;const out={};for(const[k,v]of Object.entries(j.byCommand||{})){const o=out[keep.test(k)?k:"(other)"]??={cuts:0,reads:0,reruns:0};o.cuts+=v.cuts;o.reads+=v.reads;o.reruns+=v.reruns}j.byCommand=out;fs.writeFileSync(f,JSON.stringify(j,null,2)+"\n")' "$F"
    node -e 'console.log(Object.keys(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).byCommand).join(" | "))' "$F"
    grep -nE '/Users/|/home/|/var/folders/|/tmp/|rollout-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-' "$F"   # nothing
    ```

    Read the key list: every key must be a generic command (`git log`, `npm test`, `cat`)
    or `(other)`. A key that names a private script or tool — `npm run <name>` is two words
    and so safe, but `git <alias>` may not be — is folded into `(other)` by hand, counts
    summed. The other fields are counts and tool names.
11. **The State line.** The per-tool figures, formatted:

    ```bash
    node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const p=(a,b)=>b?(100*a/b).toFixed(1)+"%":"n/a";let c=0,r=0;const t=[];for(const[n,v]of Object.entries(j.byTool)){c+=v.cuts;r+=v.reads+v.reruns;t.push(n+" "+v.cuts+" cuts, "+p(v.reads+v.reruns,v.cuts)+" (≥ 9,500: "+v.subset.cuts+", "+p(v.subset.reads+v.subset.reruns,v.subset.cuts)+")")}console.log(j.cuts+" cuts across "+j.sessions+" sessions ("+j.byHarness.claude+" Claude Code, "+j.byHarness.codex+" Codex); "+t.join("; ")+"; pooled "+p(r,c)+"; verdict line: "+(j.verdict.cap?"default "+j.verdict.cap:"no verdict")+", unmeasured: "+(j.verdict.unmeasured.join(", ")||"none"))' "$F"
    ```

    In `BACKLOG.md` TH-10 (the text S9 wrote, still `- [ ]`), before the trailer
    `<!-- th: prio=high size=M labels=benchmark -->`, insert one sentence, rewrapped:

    ` **State, <end date>:** week <start date> to <end date> at cap: 4000, commit <sha>. evals/reads.mjs (window 12): <the line step 11 printed>. trimhook report: <results> results, trimmed <n>, saved <chars> at 4,000; recomputed at 8,000: cut <n>, saved <chars>; at 12,000: cut <n>, saved <chars>. Spill reads: log <n>, scan <m>; records at another cap: <n>. Numbers in evals/results/<YYYY-MM-DD>-reads.json; the default is S15's.`

    (code spans on `cap: 4000`, the two commands, the path.) Counts, rates and dates only
    — no command name, no path, no session id. Rewrap freely **except** keep
    `**State, <end date>:** week <start date> to <end date> at `cap: 4000`, commit <sha>.`
    on one physical line: S15 and the Verify below grep it per line. Then
    `node scripts/backlog.mjs roadmap`.
12. **`99-progress.md`**: the S14 row
    `| S14 | done | — | — | TH-10 week <start date> to <end date>; verdict line: default <cap> or no verdict |`;
    in `## Verifications run`:
    `| node evals/reads.mjs --json, trimhook report (--cap 8000, --cap 12000) | S14, <end date> | <cuts> cuts; verdict line default <cap> (or no verdict); spill reads log <n> ≥ scan <m> |`.
13. **After committing,** restore what day 0 changed if you want your old setup back:
    `cp ~/.trimhook.json.before-th10 ~/.trimhook.json` (when it exists; otherwise leave
    `cap: 4000` until S15 sets the default) and the Codex hooks backup likewise. Keep
    `~/.trimhook/pre-th10-*` and `th-10-start` until S15 has merged.

**No verdict** (`- D3 rule: no verdict`, every tool under 20 cuts): commit nothing but the
State line (with "no verdict: extending") and the `99-progress.md` rows, keep the
config, and continue the week from the same stamp; re-run steps 6-12 when a tool has 20
cuts. A tool under 20 cuts beside voting ones does not stop S15: it is reported as
unmeasured (D3; `03-structure.md` risk S14 — extend rather than lower the floor).

### Verify

```bash
ls evals/results/*-reads.json                    # lists F
node -e 'const f=process.argv[1];const j=JSON.parse(require("fs").readFileSync(f,"utf8"));console.log(Object.keys(j.byTool))' "$F"
#   [ 'Bash', 'Read', 'WebFetch' ]  (the tools that were cut; Codex cuts are Bash)
grep -oE 'State, [0-9-]+:\*\* week [0-9-]+ to [0-9-]+ at `?cap: 4000' BACKLOG.md
#   one line
node -e 'const b=require("fs").readFileSync("BACKLOG.md","utf8");const m=b.match(/week (\d{4}-\d\d-\d\d) to (\d{4}-\d\d-\d\d) at `?cap: 4000/);const f=process.argv[1].match(/(\d{4}-\d\d-\d\d)-reads/)[1];console.log((Date.parse(f)-Date.parse(m[1]))/864e5>=7?"seven days or more":"too short")' "$F"
#   seven days or more
git add "$F" BACKLOG.md ROADMAP.md thoughts/TH-1-output-hygiene/99-progress.md
git diff --cached -U0 | grep -E '^\+[^+]' | grep -nE '/Users/|/home/|/var/folders/|/tmp/|rollout-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-'
#   nothing
npm run backlog 2>&1 | tail -1                   # ok — ROADMAP.md is in step with BACKLOG.md
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
git commit -m 'TH-10: the live week at cap 4,000, <start> to <end> (TH-1 S14)'
```

No CHANGELOG entry (nothing shipped changes); S15 writes one.

### Acceptance criteria

- [ ] The week ran seven days or more from one commit and one config; the JSON is dated
  at least seven days after the start.
- [ ] `byCommand` holds generic names only; the privacy grep prints nothing.
- [ ] TH-10 carries a dated State sentence of counts and rates; the item stays open;
  `99-progress.md` points at the JSON; G and B hold.

---

---

## S15 · Apply the D3 rule to the default cap

Implements D3's verdict. **Who:** agent, applying the README rule to what S14 committed;
the maintainer confirms the arithmetic before merge (A7). Serialised with S13
(`bin/lib/config.mjs`, `.github/workflows/ci.yml`, the README config block): if S13
merged first, rebase on it; if S13's pass branch is in, its Codex CI line carries the same
cap bound as `:40` and moves with it.

> **Assumption (maintainer to confirm) — A1.** 0.2.0 does not wait for TH-10. A branch that
> changes the default (4,000 or 12,000) merges **after the 0.2.0 tag** and ships in the
> next minor; never in a patch, because it changes what every install's model sees. The
> 8,000 branch changes documentation only and may ride any release.
>
> **Assumption (maintainer to confirm) — A7.** The verdict `evals/reads.mjs` printed is
> mechanical; Step 0 recomputes it from the committed JSON, and the pull request carries
> both so the maintainer can check the arithmetic before merging.

### Step 0 — the inputs, and the rule recomputed (every branch)

```bash
F=$(ls evals/results/*-reads.json | tail -1); echo "$F"
grep -oE 'State, [0-9-]+:\*\* week [0-9-]+ to [0-9-]+ at `?cap: 4000`?, commit [0-9a-f]+' BACKLOG.md
#   → <start>, <end>, <sha>
node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const r=b=>b.cuts?(b.reads+b.reruns)/b.cuts:0;const v=Object.entries(j.byTool).filter(([,b])=>b.cuts>=20);const cap=!v.length?null:v.every(([,b])=>r(b)<=0.1&&r(b.subset)<=0.1)?4000:v.every(([,b])=>r(b.subset)<=0.1)?8000:12000;console.log("recomputed "+cap+" · reads.mjs "+j.verdict.cap+" · voting "+v.map(([t])=>t).join(",")+" · unmeasured "+(j.verdict.unmeasured.join(",")||"none")+" · "+(cap===j.verdict.cap?"agree":"DISAGREE"))' "$F"
#   e.g.  recomputed 8000 · reads.mjs 8000 · voting Bash,Read · unmeasured WebFetch · agree
```

- `DISAGREE`, or no State line: stop. Record it in `99-progress.md` `## Deviations from
  the plan` (the plan said the two agree; `evals/reads.mjs` `verdict()` or the JSON is
  wrong) and change nothing.
- `recomputed null`: no tool reached 20 cuts — S14's "No verdict" case. Stop; the week is
  extended, not judged.
- Otherwise `<answer>` = the recomputed cap, and the branch below with that number is the
  one to execute. `<answer,>` is it with a thousands separator (`4,000`), `<floor>` =
  `<answer>` + 1,500 with a separator (`5,500` · `9,500` · `13,500`).

The per-tool table for the README, from the JSON — counts only, one row per tool:

```bash
node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));const k=n=>n.toLocaleString("en-US"),p=(a,b)=>b?(100*a/b).toFixed(1)+"%":"—";const vo=new Set(Object.entries(j.byTool).filter(([,b])=>b.cuts>=20).map(([t])=>t));console.log("| Tool | Cuts | Read the spill | Ran it again | Re-read rate | Cuts ≥ 9,500 | Re-read rate ≥ 9,500 | Votes |\n|---|---:|---:|---:|---:|---:|---:|---|");let c=0,r=0;for(const[t,b]of Object.entries(j.byTool)){c+=b.cuts;r+=b.reads+b.reruns;console.log("| "+t+" | "+k(b.cuts)+" | "+k(b.reads)+" | "+k(b.reruns)+" | "+p(b.reads+b.reruns,b.cuts)+" | "+k(b.subset.cuts)+" | "+p(b.subset.reads+b.subset.reruns,b.subset.cuts)+" | "+(vo.has(t)?"yes":"no, under 20 cuts")+" |")}console.log("\npooled "+p(r,c))' "$F"
```

### Every branch — the documentation

**`README.md`**:

1. `### How the week decides the default cap`, its first sentence
   "The default cap stays 8,000 in this release." becomes, by branch:
   - 4,000: "The default cap is 4,000 since the week of <start> to <end> (TH-10): every
     voting tool stayed at or under 10% on both rates."
   - 8,000: "The default cap stays 8,000, now measured: the week of <start> to <end>
     (TH-10) kept every voting tool at or under 10% on the cuts 8,000 would also make, but
     not on all its cuts."
   - 12,000: "The default cap is 12,000 since the week of <start> to <end> (TH-10), which
     rejected both 4,000 and 8,000: <the voting tools over 10% on the second rate> re-read
     more than 10% even of the cuts 8,000 would make."

   In the next sentence "The week that settles it (TH-10) runs with" → "The week (TH-10)
   ran with". Everything else in the subsection stays — its five bullets, "Why 10%", the
   `report --cap N` paragraph — and every `CAP_RULE` regex (part two) stays true.
2. A new subsection directly after it, before `### It is not only Bash`:

   ```markdown
   ### What the week measured (TH-10, <start> to <end>)

   One maintainer's own sessions at `cap: 4000` with all three tools, commit `<sha>`,
   counted by `node evals/reads.mjs` (window 12) and `trimhook report`, sizes and counts
   only — committed as `evals/results/<YYYY-MM-DD>-reads.json`:

   <the table Step 0 printed>

   Pooled over the tools the re-read rate was <pooled> — reported, not voting.
   <"Every tool had 20 cuts or more." | "<tools> had fewer than 20 cuts and did not vote.">
   The rule's answer: **<answer,>**. On the saving side, the week's <results> results lost
   <saved> characters at 4,000; recomputed from the logged sizes, 8,000 would have saved
   <saved at 8,000> and 12,000 <saved at 12,000> (`trimhook report --cap N`, which the
   rule does not use). The log counted <n> reads of a spill file, the transcripts <m>.
   ```

   Every number comes from the TH-10 State line or the JSON; nothing else goes in. Do not
   write `"cap": ` with quotes here: the config block must stay its only occurrence.
3. The `> **Status:` blockquote at the top: the sentence that calls the default cap "a
   reasoned choice rather than a measured one" (and the clause before it naming TH-10 as
   unmeasured) becomes "A week of live use (<start> to <end>, TH-10) set the default cap
   at <answer,> under a rule written before it." If the blockquote, as the 0.2.0 release
   left it, no longer says the cap is unmeasured, leave it.

**`CHANGELOG.md`**, first bullet under `### Changed`, by branch:

- 4,000: `- The default cap is 4,000, down from 8,000: a week of live use at 4,000 (<start> to <end>) kept every voting tool at or under 10% re-reads, over all its cuts and over those 8,000 would also make, under the rule the README stated before the week. Results are now cut from 5,500 characters, not 9,500; "cap": 8000 in ~/.trimhook.json restores the old behaviour (TH-10).`
- 8,000: `- The default cap stays 8,000, now measured: a week of live use at 4,000 (<start> to <end>) kept every voting tool at or under 10% on the cuts 8,000 would also make, not on all its cuts, under the rule the README stated before the week. The per-tool numbers are in the README (TH-10).`
- 12,000: `- The default cap is 12,000, up from 8,000: in a week of live use at 4,000 (<start> to <end>) <tools> re-read more than 10% even of the cuts 8,000 would make, so the README's rule rejected both 4,000 and 8,000. Results are now cut from 13,500 characters, not 9,500; "cap": 8000 in ~/.trimhook.json restores the old behaviour (TH-10).`

(code spans on `"cap": 8000` and the path.)

**`BACKLOG.md`**:

- TH-10: `- [ ]` → `- [x]`; after S14's State sentence insert
  ` Done <today>: the rule chose <answer,> (README, "What the week measured").`; trailer
  `<!-- th: prio=high size=M labels=benchmark ver=main -->`.
- TH-1 (`:37-46`): its latest `**State, <date>:**` sentence is replaced by
  `**State, <today>:** S1-S15 of thoughts/TH-1-output-hygiene/ landed; TH-9 <ticked | open>, TH-10 chose <answer,>.`
  Tick TH-1 (`- [x]`, `ver=main`) only when TH-9 is ticked too
  (`grep -cE '^- \[x\] \*\*TH-9 ' BACKLOG.md` prints `1`); otherwise leave its box.
- Then `node scripts/backlog.mjs roadmap`.

**`99-progress.md`**: the S15 row `| S15 | done | <session> | <sha> | default cap <answer> (TH-10) |`.

**Pull request** (the A7 check): its description carries Step 0's recomputation line and
the per-tool table, and says "A7: the maintainer confirms this arithmetic before merge".

`CLAUDE.md` rule 7 is satisfied as it stands; nothing to change there on the 8,000 branch.

---

### Branch 8,000 — no code

Nothing else. `bin/`, `test/` and `.github/` are untouched; the transcript table keeps
`**8,000** (default)`; "nothing under 9,500 characters is cut" stays true.

**Verify:**

```bash
node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.cap))'   # 8000
grep -c '"cap": 8000' README.md                                                  # 1
grep -c 'nothing under 9,500 characters is cut' README.md                        # 1
grep -c 'The default cap stays 8,000 in this release' README.md                  # 0
grep -c '^### What the week measured (TH-10, ' README.md                          # 1
echo "$(git show main:README.md | grep -c TH-10) → $(grep -c TH-10 README.md)"   # the second is higher
git diff --quiet main -- bin test .github && echo unchanged                      # unchanged
```

then the **Common verify** below.

---

### Branches 4,000 and 12,000 — the default moves

#### Files touched

| Path | Action |
|---|---|
| `bin/lib/config.mjs` | modify — `DEFAULTS.cap` |
| `test/handlers.test.mjs`, `test/misc.test.mjs` | modify — tests tied to the default |
| `.github/workflows/ci.yml` | modify — the cap bound(s) |
| `README.md`, `CLAUDE.md` | modify — every statement of the default |
| `CHANGELOG.md`, `BACKLOG.md`, `ROADMAP.md` | as above |

#### `bin/lib/config.mjs`

The `DEFAULTS` line
`  cap: 8000, // characters of stdout+stderr the model sees; above it, head + tail + a pointer`
becomes
`  cap: <answer>, // characters of stdout+stderr the model sees; above it, head + tail + a pointer — <answer,> since the TH-10 week, <start> to <end> (README, "What the week measured")`.
**Do NOT touch** `minSaving`, `head`, `codex`, `RULES` (`cap` is validated as it was).

#### Tests — make every default-cap assumption explicit

In both files, import `DEFAULTS`: `test/misc.test.mjs` adds it to its existing named import
from `'../bin/lib/config.mjs'`; `test/handlers.test.mjs` adds
`import { DEFAULTS } from '../bin/lib/config.mjs'` directly after its
`import { commandPrefix, postToolUse } from '../bin/lib/handlers.mjs'` line (or adds
`DEFAULTS` to an existing import from that module).

| Test (by title) | Change | Why |
|---|---|---|
| `config: defaults, user file, repository file, env, validation with defaults winning` | `assert.equal(bad.cfg.cap, 8000)` → `assert.equal(bad.cfg.cap, DEFAULTS.cap)` | the invalid `cap: 10` falls back to the default, whatever it is |
| `doctor: writable data dir, config problems are BAD, the harness cap is a warning` | first line after `const d = tmp()`: `writeFileSync(join(d, 'user.json'), JSON.stringify({ cap: 8000 }))` | at 4,000, `BASH_MAX_OUTPUT_LENGTH=4000` is no longer below the cap and the warning vanishes; the later `'{nope'` write stays |
| `e2e: a long result comes back trimmed in Claude Code shape; …` | `<= 8000` → `<= DEFAULTS.cap` | the bound is the default's |
| `a long result is replaced in Claude Code shape, spilled to a 0600 file the marker names` | `u.stdout.length <= 8000` → `<= DEFAULTS.cap` | same |
| `a broken config is a problem for doctor, not a change to the result` | `<= 8000, 'defaults applied'` → `<= DEFAULTS.cap, 'defaults applied'` | same |
| `a long Read is cut inside the file content, …` | `u.file.content.length <= 8000` → `<= DEFAULTS.cap` | same |
| `a long WebFetch is cut inside the fetched text, …` | `u.result.length <= 8000` → `<= DEFAULTS.cap` | same |
| `with spill turned off the cut is taken and the marker names no file` | `u.stdout.length <= 8000` → `<= DEFAULTS.cap` | its user file sets only `spill: false` |
| `a result that is kept whole leaves no spill file` | `input('x'.repeat(8500))` → `input('x'.repeat(DEFAULTS.cap + 500))` | "over the cap, but under minSaving" must stay true at any default |
| `collapsing is off when the config says so, and never fires under the cap` | its user file `{ collapse: { enabled: false } }` → `{ collapse: { enabled: false }, cap: 8000 }` | its 10,400 characters must be cut; at 12,000 they are not |

Leave alone: `test/trim.test.mjs` (explicit `cfg` and budgets throughout), user files that
already write `cap: 8000` (S8's Codex test, S11's `bashOutputMaxChars` tests), S9's
`report --cap` records, and `cap: 12000` in the config test (a user value, not the
default).

Then sweep: `grep -nE '8000|8,000|8500|9500|9,500' test/*.mjs`. Every hit left must be an
explicit cap or size argument, or an assertion inside a test whose user file pins
`cap: 8000`; convert any other the same way. Then run G. A test that still fails because
its input was sized for 8,000 (S1's, S6's or S11's included) gets
`cap: 8000` merged into its user file before its first handler call — never a loosened
assertion, never a deleted test.

#### `.github/workflows/ci.yml`

- `:40`, in the Claude Code check: `s.length<=8000` → `s.length<=<answer>`.
- If S13's pass branch is merged, the Codex line (`:42`): `t.slice(0,i).length<=8000` →
  `t.slice(0,i).length<=<answer>`.
- The input stays `seq 1 5000` (23,892 characters, cut at every rung); the comment and the
  line range `:33-42` are unchanged.

#### `README.md`, beyond the common edits

- Config block: `  "cap": 8000,` → `  "cap": <answer>,`.
- `## What the transcripts say`, the table: the bold and ` (default)` move from the 8,000
  row to the answer's row — `| **4,000** (default) | 807 of 28,800 | …` and `| 8,000 | 289 | …`,
  or `| **12,000** (default) | 134 | …` and `| 8,000 | 289 | …`. Other cells unchanged.
- `## What it does, exactly` (part two, S10): "so at the default cap nothing under 9,500
  characters is cut" → "so at the default cap nothing under <floor> characters is cut".
  `check` does not catch this sentence (its regex is on "overflow above the cap"); the
  Verify below does.
- Measurements taken at 8,000 that say "the default cap": `grep -n 'default cap' README.md`.
  Each dated before the week — `### It is not only Bash` ("the share the cut would take at
  the default cap (2026-09-23)", `:155`), and the two collapse figures "(2026-09-23, at the
  default cap)" (`:180`) and "(2026-09-23, default cap)" (`:201`) — becomes "at 8,000, the
  default until <end>" (or "(2026-09-23, at 8,000)"). The minSaving sentence and the new
  first sentence of the rule subsection, which state the default itself, stay as written.
- Then `grep -nE '8,000|8000|9,500' README.md` and classify every hit: **kept** — the
  transcript table's 8,000 row; the paragraph "One result in a hundred is over 8,000
  characters (289 of 28,800). Trimming them to 8,000 …" (it describes the sweep); every hit
  inside `### How the week decides the default cap` (the 8,000 rung, the 9,500 subset — the
  `CAP_RULE` regexes need it); the figures at 8,000 in the new subsection; the "at 8,000"
  labels just written. **Changed** — any other sentence that says what the default *is*.

#### `CLAUDE.md`

The end-to-end paragraph (`:104-106`): "run a command that prints more than 8,000
characters (`seq 1 5000`)" → "run a command that prints more than <answer,> characters
(`seq 1 5000` prints 23,892)". Rule 7 needs nothing.

#### Verify (4,000 and 12,000)

```bash
R=$(git rev-parse --show-toplevel); d=$(mktemp -d)
node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.cap))'   # <answer>
grep -c "\"cap\": $(node -e 'import("./bin/lib/config.mjs").then(m=>console.log(m.DEFAULTS.cap))')" README.md
#   1   (the config block)
grep -cE '^\| \*\*<answer,>\*\* \(default\) \|' README.md                         # 1
grep -c '^| \*\*8,000\*\*' README.md                                             # 0
grep -c 'nothing under <floor> characters is cut' README.md                      # 1
grep -c 'nothing under 9,500 characters is cut' README.md                        # 0
grep -c 'at the default cap (2026-09-23)' README.md                              # 0
grep -c '<=<answer>' .github/workflows/ci.yml                                    # 1 (2 with S13's pass merged)
grep -c '<=8000' .github/workflows/ci.yml                                        # 0
RUNNER_TEMP=$d bash -e -c "$(sed -n '33,42p' .github/workflows/ci.yml | sed 's/^          //')"; echo "exit $?"
#   exit 0      (re-read the range first if the block moved)
grep -c 'more than <answer,> characters' CLAUDE.md                               # 1
grep -c '^### What the week measured (TH-10, ' README.md                          # 1
echo "$(git show main:README.md | grep -c TH-10) → $(grep -c TH-10 README.md)"   # the second is higher
node --test --test-reporter=tap test/handlers.test.mjs test/misc.test.mjs 2>&1 | grep -E '^# (pass|fail) '
#   # pass <all>, # fail 0
```

then the **Common verify**.

#### Acceptance criteria (4,000 and 12,000)

- [ ] `DEFAULTS.cap`, the README config block, the table's bold row, the minSaving
  sentence, CI's bound(s) and CLAUDE.md's e2e sentence all say `<answer>`.
- [ ] No test depends on the default implicitly; no assertion was loosened.
- [ ] Measurements taken at 8,000 say "at 8,000", not "at the default cap".

---

### Common verify (every branch)

```bash
node bin/trimhook.mjs check                                                      # ok — one hook, two harnesses, manifests in sync at <version>
grep -cE '^- \[x\] \*\*TH-10 ' BACKLOG.md                                         # 1
node scripts/backlog.mjs roadmap && npm run backlog 2>&1 | tail -1               # ok — ROADMAP.md is in step with BACKLOG.md
npm run build:site >/dev/null && echo site ok                                    # site ok
git add -A && git diff --cached -U0 | grep -E '^\+[^+]' | grep -nE '/Users/|/home/|/var/folders/|/tmp/|rollout-|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-'
#   nothing
npm test >/dev/null && node --test --test-reporter=tap 2>&1 | grep -E '^# (fail|todo) '
#   # fail 0, # todo 0
git commit -m 'TH-10: the default cap is <answer,>, measured (TH-1 S15)'
```

`check` passing proves the rule subsection kept every `CAP_RULE` term and the S10
paragraphs every `EXACT_TERMS` number; it does not prove the minSaving sentence moved with
the default — the branch Verify does.

### Acceptance criteria (every branch)

- [ ] Step 0 printed `agree`; the pull request carries the recomputation and the table
  for the maintainer's A7 check.
- [ ] The README names the answer, the week's dates, the per-tool numbers, the pooled
  rate, the unmeasured tools and the saving at 4,000 / 8,000 / 12,000, dated.
- [ ] CHANGELOG `### Changed`, TH-10 ticked `ver=main`, TH-1's State line updated; G and B
  hold; the 4,000 and 12,000 branches merge after the 0.2.0 tag (A1).

---

---

## Rollback

Nothing here migrates data; the log stays JSONL with additive fields, so every step
reverts cleanly with `git revert <sha>` of its one commit. Where a step edited
`BACKLOG.md`, run `node scripts/backlog.mjs roadmap` after the revert and commit that too.

- **S1** — revert: spill reads are cut again (TH-26 reopens; restore its `- [ ]` and the
  `todo` test comes back with the revert). Old `spillRead` records are ignored by the
  reverted `report`.
- **S2** — revert: `interrupted: true` results are cut again (seen 0 times in 27,549);
  the README goes back to "on any error".
- **S3** — revert restores the `HG-n` comments and the stale release text; nothing runs
  differently. If the new check ever blocks a legitimate workflow line, reword the line;
  do not widen the regex's exclusions.
- **S4** — revert restores the old scan; no shipped code depends on it (`evals/` is not in
  the tarball). Committed `evals/results/*-reads.json` files stay readable as data.
- **S5** — delete `evals/codex-live.md` by reverting; the TH-9 sentence goes with it.
- **S6** — revert: errors print their stderr line only, as in 0.1.0; `error` records
  already on disk are ignored by the reverted `report`/`doctor`.
- **S7** — revert restores 0.1.0's flat merge (a repository may set every key again);
  remove the `### Changed` breaking entry with it. User files and the environment behave
  the same either way.

---

Nothing migrates; each step is one commit and reverts with `git revert <sha>`. Where a step
edited `BACKLOG.md`, run `node scripts/backlog.mjs roadmap` after the revert and commit it.
Revert in reverse merge order where two steps share a range (S11 before S10 before S9 in
`check()`; S11 before S8 in `doctor.mjs`).

- **S8** — revert: Codex answers `decision: block` again when `codex.replace` is on, the
  note back in `systemMessage` only; `codex.mode` leaves `RULES`, so a user file that set it
  is silently ignored (no rule, no problem line). With `codex.replace` off — the default —
  nothing a user sees changes either way. The fixture goes with the commit. If S12 has
  started, record in `evals/codex-live.md` that the runs after the revert used `block`.
- **S9** — the README rule must stand **before and during** the week (D3). If S14 has
  started, do not revert the commit: revert only `bin/lib/report.mjs` and the `report`
  case and help line in `bin/trimhook.mjs` by hand, keep the rule, its `check` and the
  table, and note it in the CHANGELOG. Before the week, a full revert restores the older
  table (802 of 28,545) and TH-10's "**Gates the release.**".
- **S10** — docs, a `check` block and a test; reverts cleanly, no runtime effect.
- **S11** — revert: `doctor` compares against `BASH_MAX_OUTPUT_LENGTH` only, as in 0.1.0.
  If a managed path proves wrong on a platform, fix `MANAGED_SETTINGS` rather than revert:
  a wrong path only makes `doctor` miss that level, never go BAD.

---

Every step here is one commit; `git revert <sha>` backs it out. A revert that touches
`BACKLOG.md` is followed by `node scripts/backlog.mjs roadmap` in the same commit (gate B).
S13 and S15 share `ci.yml` and the README config block: revert them in the reverse of the
order they merged.

- **S12** — records only. A wrong row is not reverted but corrected: add the right row
  and a one-line note under the table saying which row it replaces and why. Revert the
  commit only if the runs were made before S8 was merged (the protocol forbids it). The
  scratch repository is a `mktemp -d` directory and holds nothing committed.
- **S13, pass** — revert: `codex.replace` defaults `false` again, CI expects nothing from
  Codex, the README and CLAUDE.md rule 8 go back to opt-in. If a release already carried
  it, ship the revert as a patch; until then a user sets `"codex": { "replace": false }`
  in `~/.trimhook.json` (the CHANGELOG entry says so). TH-9 is re-opened by the revert.
- **S13, fail** — documentation only; revert freely.
- **S14** — revert the commit (the JSON, the State sentence, the progress rows). On the
  machine, undo day 0: `cp ~/.trimhook.json.before-th10 ~/.trimhook.json` and
  `cp ~/.codex/hooks.json.before-th10 ~/.codex/hooks.json` where those backups exist;
  rename the week's log (`results*.jsonl` → `th10-results*.jsonl`) before renaming
  `pre-th10-results*.jsonl` back, so the two never mix; `git worktree remove ../trimhook-week`;
  reinstall the plugin from its usual source through `/plugin`.
- **S15, 4,000 or 12,000** — revert: `DEFAULTS.cap` is 8,000 again, and the tests stay
  green because they now read `DEFAULTS.cap` or pin `cap: 8000`. If a release carried the
  new default, ship the revert as a patch; until then `"cap": 8000` in `~/.trimhook.json`
  restores the old behaviour (the CHANGELOG entry says so). TH-10 re-opens; the committed
  JSON stays in `evals/results/` either way — a measurement is not undone by disagreeing
  with it.
- **S15, 8,000** — documentation only; revert freely.

---

---

## Interfaces between the planning sessions

### Interfaces S8-S15 rely on

Stated as they stand after S1-S7 merge. Line numbers will have moved: find each by name.

**Functions and signatures**

- `bin/lib/store.mjs` — `readsSpill({ dir, home, cwd, tool, input }) → boolean` (S1): `Read` with `input.file_path` resolved against `cwd` under `resolve(dir,'spill') + sep`; `Bash` with `input.command` containing `resolve(dir,'spill')` or its `~/…` form when under `home`; anything else `false`.
- `bin/lib/handlers.mjs` — `postToolUse(input, deps = {})`, `deps` defaults `{ env: process.env, now: Date.now, home: homedir() }` (S1). Order inside: tool filter → `readResponse` → `command`, `cap` → `before` → base `record` → spill-read exemption → spill path → collapse → cut → kept / failed spill / trimmed-or-would-trim → `replacementOutput(harness, res, stdout, stderr, note)` (still the last line; S8 adds the mode argument there).
- `bin/lib/harness.mjs` — `readResponse(r)`: Bash shape with `interrupted === true` → `null` (S2); the string branch (Codex) unchanged — S8's fixture tests it. `replacementOutput` untouched by S1-S7.
- `bin/lib/config.mjs` (S7) — `export const RULES` (now exported); `export const REPO_CLASS` (frozen map key → `'either' | 'narrow' | 'denied'`); a `RULES` key missing from `REPO_CLASS` is treated as `denied`, and the test `config, repository layer: every key has a class…` fails until it is added — **S8 must add `'codex.mode': (v) => ['continue','block'].includes(v) || 'continue|block'` to `RULES` and `'codex.mode': 'denied'` to `REPO_CLASS`**. `loadConfig(cwd, env) → { cfg, path, userPath, problems }` (shape unchanged); `DEFAULTS` unchanged (`cap` 8,000 at its line, `codex: { replace: false }`).
- `bin/lib/report.mjs` (S6) — `summarize(records)` returns the old fields plus `flags: { spillRead, spillFailed, error }`; `render(s)` adds `flags on kept results: …` after the trimmed/kept line when any flag is non-zero; `report(dir) = render(summarize(readRecords(dir)))` unchanged. S9's `report --cap N` sits beside `summarize` and must skip records whose `before` is not a number (error records have none).
- `bin/lib/doctor.mjs` — `doctor({ cwd, env })` → `{ lines, broken }`, unchanged signature in S1-S7; S6 adds the `log:` warning after the `mode audit` warning. **Decided for S11** (A5): `doctor({ cwd = process.cwd(), env = process.env, home = homedir(), managedSettingsPath = MANAGED_SETTINGS } = {})`, tests pass temp paths for both.
- `bin/trimhook.mjs` — `logError(input, e)` (S6, module-private) called from `handler()`'s catch after the stderr line; `check()` gains the workflow block (S3) **after** the social-preview block — the README block (`nothing leaves the machine`, `fail-open`, `BASH_MAX_OUTPUT_LENGTH`) is untouched and is where S9, S10 and S11 add their regexes.
- `evals/reads.mjs` (S4) — module-private `markers`, `scanClaude`, `scanCodex`, `isSpillRead`, `isRerun`, `verdict(byTool) → { cap: 4000|8000|12000|null, voting, unmeasured }`; constants `SUBSET = 9500`, `FLOOR = 20`, `LIMIT = 0.1`, `WINDOW` default 12. Not importable (top-level script); tested by spawn with `HOME`.

**Log record fields** (`results.jsonl`, one JSON object per line)

- Base (every record from `postToolUse`): `at, session, harness, mode, tool, command, before, cap, outcome`; `after` on all; `elided, collapsed, spill` on `trimmed`/`would-trim`.
- `outcome` values unchanged: `trimmed`, `would-trim`, `kept`. Flags ride on `kept` only: `spillRead: true` (S1), `spillFailed: true` (TH-24, unchanged), `error: <code or name>` (S6).
- The error record (S6) has **exactly** `at, session, harness, tool, outcome: 'kept', error` — no `before`, `after`, `cap`, `mode`, `command`.

**Config key classes** (repository layer, S7): either — `cap`, `perCommand`, `minSaving`, `head`; narrow — `collapse.enabled` (to `false` only), `collapse.minRun` (up only), `tools` (subset); denied — `collapse.strict`, `mode`, `spill`, `spillTtlDays`, `codex.replace` (S8 adds `codex.mode`). Problem strings, exactly:
`<path>: <key> may only be set in ~/.trimhook.json or the environment` ·
`<path>: <key> may only narrow <upper JSON>, got <value JSON>` ·
`<path>: <key> must be <rule>, got <value JSON> — using <upper JSON>` ·
`<path>: <codex|collapse> must be an object, got <value JSON>`; `doctor` prints each as `  BAD   config: <problem>`. `TRIMHOOK_CONFIG` is the repository layer when set.

**`evals/reads.mjs` output** (S4) — first line `## What the model did after a cut (TH-10, window N)`; the per-tool table header `| Tool | Cuts | Read the spill | Ran it again | Re-read rate | Cuts ≥ 9,500 | Re-read rate ≥ 9,500 |`; the verdict line starts `- D3 rule, for a week run at cap 4,000: default ` or `- D3 rule: no verdict`. `--json` writes `evals/results/<YYYY-MM-DD>-reads.json` = `{at, window, subsetMin, floor, sessions, byHarness: {claude, codex}, cuts, skipped, elided, readBack, readBackLate, reran, subset: {cuts, reads, reruns}, byTool: {<tool>: {cuts, reads, reruns, subset: {cuts, reads, reruns}}}, byCommand: {<key>: {cuts, reads, reruns}}, verdict: {cap, voting, unmeasured}}`. Rate per tool = `(reads + reruns) / cuts`, window-only; the subset is a cut whose summed marker totals are ≥ 9,500. Codex cuts are bucketed as tool `Bash`, command `(codex)`. S9's README rule should cite these names; S14 reads `byTool` (`Object.keys(j.byTool)`).

**Files**

- `evals/codex-live.md` (S5): `## Before you start`, `## Protocol` (nine steps, `codex.mode` in `u.json`), `## Pass rule` (D5 verbatim, "3 of 3"), `## Runs` (header `| Date | Codex version | Mode | Tool names seen | Error prefix | Router error= | Head quoted | Tail quoted | Re-run |`, no rows), last line `**Verdict:** pending — …`. S12 adds rows and replaces `pending …` with `pass …` or `fail …`.
- `test/reads.test.mjs` (S4, new) — helpers `run(home, ...args)`, `use`, `result`, `cut`, `claude`, `codex` at the top.
- Tests added in `test/misc.test.mjs` (after their anchors): `config, repository layer: …` ×5 (S7), `readResponse: an interrupted Bash result falls through` (S2), `report: flag counts …` (S6), `doctor warns …` (S6), `e2e: a thrown error …` (S6). In `test/handlers.test.mjs`: `TH-26: …` ×6 replacing the old `todo` (S1). S8's Codex test anchor ("Codex: measured only until codex.replace is on…") is untouched.

**Docs state after S1-S7** — README: the spill bullet names the exemption; `:42` Effect column no longer says "on any error" and still says `decision: block` for Codex (S8 changes it); a "What a failure does" paragraph before "Fail-open, always"; the chain says `TRIMHOOK_CONFIG` takes the repository file's place, followed by the key-class table (S8 adds `codex.mode` to its last row); the config JSON block is unchanged (S8 adds `"mode": "continue"`, S15 the cap). CHANGELOG `[Unreleased]` carries one S1, S3 entry under Fixed, S6 under Added, S2, S4, S7 under Changed. BACKLOG: TH-26 `[x] ver=main`; TH-4 reworded, still `[x]`; TH-9 points at `evals/codex-live.md`, still open; TH-10 untouched (A1).

---

### Interfaces S12-S15 rely on

Stated as they stand after S1-S11 merge; find each by name, not by line.

**`codex.mode`** (S8)

- Values `'continue' | 'block'`; default `'continue'`, in `DEFAULTS` as the single line
  `  codex: { replace: false, mode: 'continue' }, // replacement is opt-in until TH-9's live run`
  under a three-line `// D5: …` comment. S13 on **pass** changes only `replace: false` →
  `replace: true` (and the trailing comment); on **fail** touches no code.
- `RULES['codex.mode']` → problem text `codex.mode must be continue|block, got <JSON> — using <upper JSON>`;
  `REPO_CLASS['codex.mode'] = 'denied'` → `<path>: codex.mode may only be set in ~/.trimhook.json or the environment`.
  No environment variable sets it.
- `doctor`: the settings line ends `· codex.replace <bool> · codex.mode <mode>`; the warning
  `codex.mode block: Codex records the replacement as a failed tool call — …` appears when
  `replace` is on and the mode is `block`; the `codex.replace is off: …` warning is where it
  was, wording untouched (S13's to change).

**The Codex reply** (S8) — `replacementOutput(harness, original, stdout, stderr, note, codexMode = 'continue')`:

- `text = body + (body.endsWith('\n') ? '' : '\n') + note`, with
  `body = stderr ? \`${stdout}\n[stderr]\n${stderr}\` : stdout`. The last line of `text`
  always starts `trimhook:`.
- `continue` (and any value but `'block'`): `{ continue: false, stopReason: text }` — no
  `decision`, no `systemMessage`.
- `block`: `{ decision: 'block', reason: text, systemMessage: note }`.
- The S8 Verify pipe (the `$seq6000` event through `post-tool-use` with `PLUGIN_ROOT=/plugin`)
  prints `false string false true` when opted in; S13's pass branch reuses it with no user
  config and rewrites `ci.yml:41-42` to expect that shape (parse the JSON, `o.continue === false`,
  last line of `o.stopReason` starts `trimhook:`, text before it `<= 8000`). S8-S11 leave
  `ci.yml` untouched, so `sed -n '33,42p'` is still the handler block.
- README: the `:42` cell names both shapes and says "opt-in until verified live"; the Codex
  paragraph after the install block names `block`'s failed-call label (0.155.1,
  2026-09-23) and `max_output_tokens`. S13 edits those two places and `CLAUDE.md` rule 8.

**`report --cap N`** (S9) — `trimhook report --cap N` or `--cap=N`, N an integer in
[500, 200000] (else stderr `trimhook report: --cap must be an integer in [500, 200000], got "<raw>"`, exit 2).
Output: the plain `report` text unchanged, one blank line, then:

```
## at cap <N> — the logged sizes recomputed (TH-10)
cut <cut> of <results> results[ · collapsed only <n>] · characters: <before> before → <after> after · saved <saved> (≈ <saved/4> tokens at four characters each)
[by tool: <Tool> <saved> (<n>) · …]              sorted by saved, descending
[left out, no size (error records): <n>]
[spill reads, never cut (D9): <n>]
[approximate, collapse not logged: <n>]
method: one cap for every result (perCommand ignored), minSaving 1,500, each result a synthetic body of its logged size less its logged collapse — the sweep evals/local.mjs runs
```

Numbers carry thousands separators. `export function recompute(records, cap, {minSaving, head})`
and `renderAt(r)` are in `bin/lib/report.mjs`; `report(dir, { cap })`. S14 records the
`## at cap 8,000` and `## at cap 12,000` blocks in TH-10's State line; they are the saving
side only and never vote.

**The README after S9-S11**

- `## What the transcripts say`: header sentence "… 28,800 shell results, 28.8 M characters
  … committed as `evals/results/2026-09-23-local.json` …"; the table
  `| Cap | Results trimmed | Characters saved | Share of all result characters |` with rows
  4,000 (`807 of 28,800`), `**8,000** (default)` (289), 12,000 (134), 16,000 (67). S15 moves
  the bold and `(default)` to its answer's row if that is not 8,000, and adds the week's
  numbers beside the table — as a paragraph at the end of `### How the week decides the
  default cap` or as a new `###` subsection directly after it, dated, naming the rung the
  rule chose and any tool reported unmeasured.
- `### How the week decides the default cap` — first sentence "The default cap stays 8,000
  in this release."; S15 replaces that sentence with the answer and its date and keeps the
  rest. Five bullets (Per tool, Two rates per tool, The ladder, The pooled rate, The weak
  spot), the "Why 10%" paragraph (it carries A7: the maintainer checks the arithmetic), the
  `report --cap N` paragraph.
- `## What it does, exactly` — the three S10 paragraphs. **If S15 changes the default, the
  sentence "so at the default cap nothing under 9,500 characters is cut" must change with
  it** (cap + 1,500: 5,500 at 4,000, 13,500 at 12,000); `check` does not catch this — its
  regex is on "overflow above the cap" — so it is listed here.
- `"cap": ` (quoted) appears once, in the config block (`"cap": 8000`); the rule writes
  `cap: 4000` unquoted. S15's `grep -c "\"cap\": <default>" README.md` → `1` depends on it.
- The config block's Codex line: `  "codex": { "replace": false, "mode": "continue" },`.

**`check` regexes S12-S15 must keep true** (`bin/trimhook.mjs`, module level)

- `CAP_RULE`, tested only inside `### How the week decides the default cap` (to the next
  `##`/`###`): `/at\s+least\s+20\s+cuts/`, `/12\s+tool\s+uses/`, `/at\s+or\s+under\s+10%/`,
  `/9,500/`, `/4,000\s+→\s+8,000\s+→\s+12,000/`, `/pooled\s+rate/`, `/upper\s+bound/`; the
  heading itself must exist. The 9,500 subset is the 8,000 rung's and stays whatever S15
  decides.
- `EXACT_TERMS`, tested only inside `## What it does, exactly`: `/stderr`?\s+gets\s+at\s+least\s+20%/`,
  `/overflow\s+above\s+the\s+cap/`, `/within\s+200\s+characters/`,
  `/at\s+most\s+200\s+characters\s+plus\s+the\s+marker/`, `/under\s+a\s+5\s+s\s+timeout/`,
  `/p50\s+75-83\s+ms/`, `/156\s+ms/`. A re-measured timing changes the number and its regex
  in the same commit.
- `HARNESS_CAP`, whole README: `BASH_MAX_OUTPUT_LENGTH` and `bashOutputMaxChars` in one
  paragraph (no blank line between), `/4,000-128,000/`, `/--settings/`.
- Unchanged from 0.1.0: `/nothing leaves the machine/i`, `/fail-open|fails open/i`; S3's
  workflow grep for `hookgate|\bHG-`.

**Tests pinned to the cap** — S8's Codex handler test and S11's two `bashOutputMaxChars`
tests write `cap: 8000` into the user file, so they survive S15. Still tied to the default:
`ci.yml:40` (`s.length<=8000`), `test/handlers.test.mjs` and `test/misc.test.mjs` assertions
of `<= 8000` on default-config results (e.g. the e2e test `:131`, the handler tests near
`:206`) — S15's to update if the answer is 12,000.

**`doctor`** (S11) — `doctor({ cwd, env, home = homedir(), managedSettingsPath = MANAGED_SETTINGS })`;
exports `MANAGED_SETTINGS`, `harnessSettingsCap({cwd, home, managedSettingsPath}) → {value, path} | null`.
Harness line ends `— from the environment only; doctor sees no hook input`. S14's
recommended pre-flight: `trimhook doctor` shows no `bashOutputMaxChars … is below` and no
`BASH_MAX_OUTPUT_LENGTH=… is below` warning at `cap: 4000`.

**Docs state after S8-S11** — CHANGELOG `[Unreleased]`: S8 and S9 under Added, S9's table
fix under Fixed, S10 and S11 under Changed. BACKLOG: TH-10 reworded, still `- [ ]`, no
"Gates the release" (A1); TH-9 as S5 left it. `CONTRIBUTING.md` item 2 names the week's
config and the three `report` runs.

---

---

## Status

- [x] Every step has exact paths
- [x] Every new function has a complete signature
- [x] Every test case has inputs and expected outputs
- [x] Every verification command is copy-pasteable
- [x] **Zero-context test:** an agent reading only this file can execute it
- [x] Rollback plan present

> Next phase: **Implement**. It receives: this file + `99-progress.md`.
> One session per step.
