# 04 · Plan — TH-1 Tool output trimmed at the source — part S12-S15

This file plans steps S12-S15 of `03-structure.md`: two live observations a human runs
(S12, S14) and the two agent steps that apply what they found (S13, S15). It builds on
[`04-plan.part-S1-S7.md`](./04-plan.part-S1-S7.md) and
[`04-plan.part-S8-S11.md`](./04-plan.part-S8-S11.md): read part one's **Minimum context
for the executor**, part one's **Interfaces S8-S15 rely on** and part two's **Interfaces
S12-S15 rely on** first — every fact there holds here and is not repeated.

---

## References

- Structure: [`03-structure.md`](./03-structure.md) — S12-S15, the gates G and B, the
  serialisation list (`config.mjs`, `ci.yml` and README `:97` are S13's and S15's, one
  after the other), per-step risks S12, S14, S15.
- Design: [`02-design.md`](./02-design.md) — D3 (the rule and the ladder) and D5 (the
  pass rule and both outcomes).
- Plan, part one — S5 (the protocol in `evals/codex-live.md`) and S4 (`evals/reads.mjs`
  output and `--json`).
- Plan, part two — S8 (the Codex reply shape, its Verify pipe), S9 (`report --cap N`, the
  README rule), S10 (the minSaving sentence), S11 (`doctor` and the harness cap).

Line numbers are for branch `th-1-spec` at `fdcd6d4`, **before** S1-S11. By the time these
steps run, S1-S11 have moved most of them: every edit is anchored by quoted text as well —
find the text, not the number.

**Assumptions used here** (settled with the caller; the maintainer confirms both):

- **A1 — Assumption (maintainer to confirm).** 0.2.0 does not wait for TH-10, so S15 lands
  in a later minor than 0.2.0. S13 does not depend on a tag either.
- **A7 — Assumption (maintainer to confirm).** The maintainer confirms the verdict
  `evals/reads.mjs` prints, and the arithmetic behind it, before the default changes. S15
  recomputes it independently and stops on any disagreement.

---

## Minimum context for the executor

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

## Rollback

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

## Status

- [x] Every step has exact paths
- [x] Every new function has a complete signature (none is added: S13 and S15 change a
  default, a message, CI bounds and test expectations; S12 and S14 are protocols)
- [x] Every test case has inputs and expected outputs
- [x] Every verification command is copy-pasteable (placeholders in `<…>` are the step's
  own recorded values: date, version, sha, answer)
- [x] **Zero-context test:** an agent reading only this file and parts one and two's
  context and interface sections can execute S13 and S15; the maintainer can execute S12
  and S14 from their sections alone (limits: judging a Codex reply and a router `error=`
  line is the maintainer's; the `/plugin` steps depend on the Claude Code build of the day;
  README rewraps are the executor's)
- [x] Rollback plan present

> Next phase: **Implement**. It receives: this file, parts one and two, and
> `99-progress.md`. S12 once S8 has merged, S14 once S1, S4, S6, S7 and S9 have; then S13
> and S15, one after the other, each in its own session (`03-structure.md`, Recommended
> execution order).
