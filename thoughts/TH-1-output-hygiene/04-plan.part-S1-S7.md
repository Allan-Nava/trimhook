# 04 · Plan — TH-1 Tool output trimmed at the source — part S1-S7

This file plans steps S1-S7 of `03-structure.md` (group P1, all parallel). S8-S15 are
planned elsewhere and build on the section **Interfaces S8-S15 rely on** at the end.

---

## References

- Structure: [`03-structure.md`](./03-structure.md) — steps S1-S7, the gates G and B, "Where new tests go".
- Design: [`02-design.md`](./02-design.md) — D2, D4, D5 (protocol only), D6, D7, D8 (the grep), D9.
- Research: [`01-research.md`](./01-research.md) — Addendum item 1 (`PostToolUseFailure`) and item 3 (the Codex session log shape); read only for those.

Line numbers below are for branch `th-1-spec` at `00fdb9e`. Each P1 step starts from that
tree; if a sibling step merged first, re-find an anchor by the text quoted beside it, not
by the number.

---

## Minimum context for the executor

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

## Interfaces S8-S15 rely on

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

## Status

- [x] Every step has exact paths
- [x] Every new function has a complete signature
- [x] Every test case has inputs and expected outputs
- [x] Every verification command is copy-pasteable
- [x] **Zero-context test:** an agent reading only this file can execute it (limits: `README.md`/`CLAUDE.md` rewraps are left to the executor; S4's first real-transcript run is the only check of the Codex record shape against live data)
- [x] Rollback plan present

> Next phase: **Implement**. It receives: this file + `99-progress.md`.
> One session per step; S1-S7 may run in parallel worktrees and merge in the order
> S1, S2, S6, S7, S4, S3, S5 (`03-structure.md`, Recommended execution order).
