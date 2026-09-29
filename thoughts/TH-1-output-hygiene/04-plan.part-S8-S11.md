# 04 · Plan — TH-1 Tool output trimmed at the source — part S8-S11

This file plans steps S8-S11 of `03-structure.md` (groups P2, P3, P4). It builds on
[`04-plan.part-S1-S7.md`](./04-plan.part-S1-S7.md): read that file's **Minimum context for
the executor** and **Interfaces S8-S15 rely on** first — every fact there holds here and is
not repeated. S12-S15 build on **Interfaces S12-S15 rely on** at the end of this file.

---

## References

- Structure: [`03-structure.md`](./03-structure.md) — S8-S11, the gates G and B, "Where new
  tests go", the serialisation list, under-specified notes 2, 6 and 7.
- Design: [`02-design.md`](./02-design.md) — D3, D5, D8.
- Plan, part one: [`04-plan.part-S1-S7.md`](./04-plan.part-S1-S7.md) — the code as it stands
  after S1-S7.
- Research: [`01-research.md`](./01-research.md) Addendum item 3 (the Codex hook input and
  what `decision: block` does, `:232-241`) and item 4 (`bashOutputMaxChars`, `:243-247`) —
  read only for those, and only if a fact below seems wrong.

Line numbers are for branch `th-1-spec` at `e3510d3`, **before** S1-S7. S1-S7 move many of
them; every edit below is anchored by quoted text as well as by a number — find the text,
not the number.

**Order.** S8 and S9 are parallel (P2) and may merge in either order; S10 after S9 (and
S3); S11 after S8 and S10. Where two of these steps edit the same range (`check()`'s README
block, `doctor.mjs`, `test/misc.test.mjs`) the later step's anchor names what the earlier
one left there.

**Assumptions used here** (both settled with the caller, labelled where used):

- **A1 (from part one), maintainer to confirm** — 0.2.0 does not wait for TH-10; S15 lands
  later. S9 therefore removes "**Gates the release.**" from TH-10 in `BACKLOG.md`.
- **A7, maintainer to confirm** — the D3 verdict `evals/reads.mjs` prints is confirmed by
  the maintainer before the default changes. S9's README rule says so in one clause.

---

## Minimum context for the executor

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

## Rollback

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

## Interfaces S12-S15 rely on

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

## Status

- [x] Every step has exact paths
- [x] Every new function has a complete signature
- [x] Every test case has inputs and expected outputs
- [x] Every verification command is copy-pasteable
- [x] **Zero-context test:** an agent reading only this file and part one's context and
  interface sections can execute it (limits: README rewraps are the executor's; the bite
  loops in S9 and S10 need a shorter phrase when a rewrap splits one; S11's CLI Verify is
  affected by a real managed-settings file on the machine, which the tests are not)
- [x] Rollback plan present

> Next phase: **Implement**. It receives: this file, part one, and `99-progress.md`.
> One session per step; S8 ‖ S9 in parallel worktrees, then S10, then S11
> (`03-structure.md`, Recommended execution order).
