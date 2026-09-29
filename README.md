<p align="center"><img src="https://raw.githubusercontent.com/Allan-Nava/trimhook/main/assets/logo.svg" width="96" height="96" alt="trimhook"></p>

# trimhook — tool output trimmed at the source

A shell command that prints 30,000 characters costs the model 30,000 characters — every
turn, for the rest of the session. trimhook is a `PostToolUse` hook for Claude Code and
Codex CLI that keeps the **head and the tail** of a long result, elides the middle behind
one line that says how much is missing and **where the whole output is**, and logs what it
saved. Nothing is decided by a model, nothing leaves the machine, and when anything goes
wrong the model sees exactly what it would have seen without the plugin.

> **Status: 0.1.0. The mechanism is verified live; the numbers are still from
> transcripts.** The hook, the spill files, `doctor` and `report` are in and released,
> and a live Claude Code session on 2026-09-24 confirmed the harness accepts the
> replacement for `Bash` and for `Read`. What is still unmeasured is the part only time
> can give: what it saves over a week of real work, and whether a head-and-tail ever hid
> something the model needed (TH-10). Until that lands the default cap is a reasoned
> choice rather than a measured one.

## Why a hook and not a setting

Claude Code already limits Bash output. `BASH_MAX_OUTPUT_LENGTH` (default 30,000
characters) cuts it flat — unless `bashOutputMaxChars` is set in a settings file (managed,
`.claude/settings.local.json`, `.claude/settings.json` or `~/.claude/settings.json`, the
highest level winning, clamped to 4,000-128,000), and then the variable is ignored. Above
that limit the harness already writes the output to a file and sends the model a preview
and the path (Claude Code 2.1.261 or later): trimhook is the same idea at a lower cap,
keeping the tail too. Codex budgets tool output by tokens (`tool_output_token_limit`).
Those are ceilings, and they cut from the end: a test run's summary line, the part that says how it ended, is the first thing to go.
trimhook sits under the harness's ceiling and does three things a flat cut does not:

- **Keeps the tail.** The last lines of a build, a test run or a log are usually the ones
  that matter; 60% of the budget goes to the head, 40% to the tail, cuts fall on line
  boundaries.
- **Spills the whole output to a file** under `~/.trimhook` and names it in the elision
  marker, so the model can `Read` the part it did not see, on demand, instead of
  re-running the command. Only a result that is cut is written; if the file cannot be
  written, the result is left whole. A `Read` of that file, or a Bash command that names
  it (`sed -n 1400,1600p <path>`, `grep`, `cat`), comes back whole: a spill is never cut
  again.
- **Never cuts instructions.** A `Read` of `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`,
  `GEMINI.md` or `SKILL.md`, or of anything under `.claude/commands/`, `.claude/agents/`
  or `.claude/skills/`, comes back whole: a cut drops the middle of a file, and in a file
  of rules that is where rules go missing. Exact names only, and `Read` only — a Bash
  `cat` of one is cut like any output.
- **Measures.** One JSON line per result, sizes only, and `trimhook report` prints what
  was saved, by command. "Saved" counts only a cut the model received (`trimmed`); a cut
  measured in audit mode or on Codex without the replacement (`would-trim`), or a Codex
  reply not known to apply (`unconfirmed`, below), is shown apart as "would save", never
  as saved. A result left whole is logged too, as `kept`, with a flag when
  there is a reason: `spillRead` (a read of a spill file), `instructions` (an instruction
  file, above), `spillFailed` (the spill could
  not be written) or `error` (trimhook threw — the error's code, never its message).
  `report` counts the flags, and `doctor` warns on the last two.

## What it does, exactly

| Event | Match | Decision | Effect |
|---|---|---|---|
| `PostToolUse` | `Bash`, `Read`, `WebFetch` | none — the tool has already run | If `stdout + stderr` exceed the cap by at least `minSaving`, the result is replaced by head + marker + tail (`updatedToolOutput` on Claude Code; on Codex, opt-in (TH-9, 2026-09-29: neither shape passed live), `continue: false` with the trimmed text as the `stopReason` — then `[stderr]` if any, and the note as its last line — or `decision: block` when `codex.mode` is `block`). Below the cap, on an image result, on an interrupted Bash result, or on anything trimhook cannot read: no output, the harness proceeds unchanged. A failed call never gets here — see below. |

The marker reads, verbatim:

```
… [trimhook: 21,540 of 29,540 characters elided. Full output: ~/.trimhook/spill/<session>/<tool-use>.txt] …
```

`stdout` and `stderr` share one cap, split in proportion to their sizes with a floor:
`stderr` gets at least 20% of the cap, or all of itself when it is shorter, so a short
error is never squeezed out by a long log. Each stream over its share is cut on its own,
with its own marker, so a result with both streams cut carries two. A share too small to
hold a marker still keeps 200 characters of its stream, so a tiny share — a few hundred
characters of one stream beside a huge other — can exceed its slice by at most 200
characters plus the marker's length. That bound is accepted, tested
(`test/trim.test.mjs`) and not fixed: holding the cap to the character there would mean
dropping a stream.

`minSaving` (1,500 by default) counts the overflow above the cap: a result is cut only
when it is over the cap by at least that much, so at the default cap nothing under 9,500
characters is cut. A cut snaps to a line boundary within 200 characters, keeping less
rather than more, so a cut result can come in up to 200 characters per cut under the cap.

**Fast enough to need no deadline.** The hook runs under a 5 s timeout (`"timeout": 5` in
both hooks files). Measured on 2026-09-28 at `fb4f5b6`, Node 23.3.0, Node's start-up
included: a 150,000-character result — one body the collapse folds to a single line, one
of 30,000 distinct lines cut to the cap, four rounds of ten each — took p50 75-83 ms and
at most 156 ms, about 3% of the timeout, so the handler sets no deadline of its own.

**What a failure does.** On Claude Code a tool call that fails — a Bash command that exits
non-zero, a `Read` or `WebFetch` that errors — fires `PostToolUseFailure` instead of
`PostToolUse`, with the error text and no `tool_response`: the model reads the harness's
own error (for Bash, `Exit code N` and the output), and trimhook never sees it, so it
neither cuts nor logs it. On Codex, `PostToolUse` runs after a non-zero exit too and the
result carries no exit code, so a failing command there is trimmed by size like any other,
with the `stderr` floor and the tail keeping its ending.

**Fail-open, always.** Exit 0 with no JSON means "leave the result alone": a malformed
event, an unwritable data directory, a bug in this file — the model reads the original.
There is no fail-closed mode, because there is nothing to protect against here, only
tokens to save.

**Nothing leaves the machine.** trimhook makes no network request. The whole output is
written to a file with owner-only permissions under `~/.trimhook` (or `TRIMHOOK_DATA`),
pruned after seven days; the log keeps sizes, the command's first word or two and, when
trimhook fails, the error's code — never the output, never an error message. One home on purpose: the harness's own plugin data directory is set for the
hook process alone, and a log `trimhook report` cannot find is not a log. The spill file
holds whatever the command printed — treat that directory as you treat your shell
history.

## Install

Claude Code:

```
/plugin marketplace add Allan-Nava/trimhook
/plugin install trimhook@trimhook
```

Codex CLI reads the same repository as a plugin, but has dropped plugin-bundled hooks
(0.155), so the hook is registered per repository:

```
codex plugin marketplace add Allan-Nava/trimhook
codex plugin add trimhook@trimhook
trimhook print-hooks > .codex/hooks.json      # or ~/.codex/hooks.json; trust it when Codex asks
```

On Codex the replacement is opt-in: `"codex": { "replace": true }` in `~/.trimhook.json`.
Both shapes were tried live on 2026-09-29, Codex 0.155.1 (TH-9, `evals/codex-live.md`):
`continue: false`: 0 of 3 passed — runs 1-3: untrimmed, Codex logged "hook: PostToolUse Stopped" yet gave the model the whole 28,893-character output, no marker, and the turn went on;
`decision: block`: 3 of 3 prefixed "Script failed", router error= in 3 of 3, head and tail quoted in 3 of 3.
So the default stays off: on that version `continue: false` changes nothing the model
sees, and `decision: block` replaces the text only behind an error prefix. An opt-in
still gets `codex.mode: continue` unless it sets `block`; such a result is logged
`unconfirmed`, not `trimmed`, so `report` never counts a saving the model did not get
(TH-34).
It answers `continue: false` by default. `"mode": "block"` answers `decision: block`
instead, which Codex 0.155.1 records as a failed tool call — the model reads
`Script failed` and `Script error:` before the trimmed text (2026-09-23) — so it is there
to compare against, not to use. Codex can also cut before trimhook does: the model may
pass `max_output_tokens`, and Codex truncates the output to it before the hook runs (one
live run handed the hook 504 of 28,893 characters).

Then `trimhook doctor` says which harness it sees, where it writes, and whether the
harness's own cap sits below trimhook's — in which case the harness cuts first and
trimhook never sees the rest. It reads `bashOutputMaxChars` from those four files,
best-effort, and `BASH_MAX_OUTPUT_LENGTH` only when none sets it. It cannot see a
`--settings` file passed on the command line, which no hook or terminal command can read,
nor managed policy delivered by MDM, the registry, `managed-settings.d/` or the claude.ai
console; and it has no hook input, so its harness verdict comes from the environment only.

## Configure

`~/.trimhook.json` (yours), then the repository's `.trimhook.json` (or
`.claude/trimhook.json`, `.codex/trimhook.json`) — or the file `TRIMHOOK_CONFIG` names,
which takes the repository file's place — then `TRIMHOOK_MODE` and `TRIMHOOK_CAP`. Every
key is optional:

```json
{
  "mode": "trim",
  "cap": 8000,
  "head": 0.6,
  "minSaving": 1500,
  "perCommand": { "git log": 4000, "npm test": 16000 },
  "spill": true,
  "spillTtlDays": 7,
  "holdout": 0,
  "codex": { "replace": false, "mode": "continue" },
  "collapse": { "enabled": true, "minRun": 3, "strict": true },
  "tools": ["Bash", "Read", "WebFetch"]
}
```

`mode: "audit"` measures every result and replaces none — start there if you want the
report before the effect. `perCommand` keys are the command's first word or first two
(`cd …` hops skipped), the more specific winning. Every value is validated; a bad one is
reported by `doctor` and the default takes its place.

`holdout` (0 to 0.5, default 0) is for measuring, not saving: that share of the results
trimhook would cut is left whole and logged `kept, holdout: true`, chosen from a hash of
the tool-use id so the same result is always in the same group. It gives the live week a
control group — `node evals/reads.mjs --holdout 0.1` compares what the model did after
those with what it did after the cuts (TH-31).

A repository file is somebody else's checkout, so it does not get every key. It may move
the saving knobs either way, may only narrow what you chose to see, and may not touch
what makes a cut recoverable or what reaches the model on Codex:

| Key | From a repository file |
|---|---|
| `cap`, `perCommand`, `minSaving`, `head` | either way — every cut still spills |
| `collapse.enabled`, `collapse.minRun` | only narrower: `enabled` may turn off, never back on; `minRun` may rise, never fall |
| `tools` | only a subset of the list above it |
| `mode`, `spill`, `spillTtlDays`, `holdout`, `codex.replace`, `codex.mode`, `collapse.strict` | never — set them in `~/.trimhook.json` or the environment |

A key outside its class is dropped, the value from your file or the default stands, and
`doctor` prints it as `BAD`. `~/.trimhook.json` and the environment keep every key.

`tools` is the list trimhook will cut. A tool is on it only when its output shape has
been read off real transcripts — the harness ignores a replacement that does not match
the tool's own shape, so an unknown shape would be a saving the log claims and the model
never gets. `perCommand` keys work for them too: `{ "Read": 20000 }` gives Read its own
cap. For Bash the whole `stdout`/`stderr` pair is cut; for Read it is `file.content`,
with `numLines` and `totalLines` left describing the file rather than the excerpt; for
WebFetch it is `result`, beside the status and timing that describe the fetch.

`collapse` folds a run of `minRun` or more identical lines down to its first line and a
count, before the cut, so the budget buys distinct content. `strict` compares lines byte
for byte: the copies it drops said exactly what the line it keeps says, so it cannot lose
information. `"strict": false` compares them with digits, hex blobs, spacing and colour
codes masked — ten times the saving, because it catches the progress bar whose whole
point is that the numbers move, but it will also fold a run of lines that differ only in
their numbers. See the measurement below before turning it on.

## What the transcripts say

From 142 local Claude Code sessions and 8 Codex sessions — 28,800 shell results,
28.8 M characters — measured on this machine and sent nowhere (`node evals/local.mjs`,
2026-09-23; the run is committed as `evals/results/2026-09-23-local.json`, the one source
this table and the design cite). The transcripts hold what the harness gave the model,
after its own flat cut, so this is what trimhook adds on top:

| Cap | Results trimmed | Characters saved | Share of all result characters |
|---:|---:|---:|---:|
| 4,000 | 807 of 28,800 | 4,678,275 (≈ 1.17 M tokens) | 16% |
| **8,000** (default) | 289 | 1,960,876 (≈ 490 k tokens) | 7% |
| 12,000 | 134 | 957,401 | 3% |
| 16,000 | 67 | 467,423 | 2% |

One result in a hundred is over 8,000 characters (289 of 28,800). Trimming them to 8,000
recovers 7%; halving the cap recovers 16%, at the price of hiding more middles. `cat`,
`sed`, `echo` and `for` loops lead the list of what gets cut — whole-file reads and
hand-rolled loops, not test runs. The sweep is a benchmark, not a replay: each result
stands in as one synthetic stream of its size with no line to snap to, so its after is the
cap to the character, where a real cut can land a little short of it (see
[What it does, exactly](#what-it-does-exactly)). The sweep is shell output only; the live
week cuts `Read` and `WebFetch` too, and it decides the default under the rule below.

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

### It is not only Bash

Bash is 28.7 M of the 30 M characters the tools printed, but not the worst offender per
result. Of what each tool prints, this is the share the cut would take at the default cap
(2026-09-23):

| Tool | Results | Characters | Over the cap | Saved | Share of its own |
|---|---:|---:|---:|---:|---:|
| Bash | 28,761 | 28,666,550 | 386 | 1,930,062 | 6.7% |
| Read | 880 | 2,651,454 | 94 | 704,824 | 26.6% |
| WebFetch | 139 | 1,082,613 | 24 | 675,065 | 62.4% |
| Agent | 49 | 205,494 | 6 | 103,211 | 50.2% |
| Edit, Write, WebSearch, … | 2,565 | 578,000 | 0 | 0 | 0% |

Read and WebFetch together add 1.38 M characters to Bash's 1.93 M — 72% more, from 1,019
results against Bash's 28,761. A fetched page is long nearly every time it is long at
all; a shell command usually is not. `Agent` is left out for now: its result is a list of
message blocks rather than one text field, and a shape guessed wrong is a replacement the
harness discards. Everything below it in the table never crosses the cap at all.

Verified live on 2026-09-24, which is the only way this can be verified: a `Read` of a
23,715-character file came back at 7,923 with the marker inside `file.content`, and the
log recorded `Read trimmed elided=15,986`. Claude Code accepts `updatedToolOutput` for
`Read`, not only for `Bash`.

### The same thing twice

The cut above spends the budget on repetition at the same rate as on content, so the
same run counts what that repetition is worth (2026-09-23, at the default cap):

| | Characters | Share of what the model reads |
|---|---:|---:|
| Runs of near-identical lines, inside the kept head and tail | 1,011,413 | 3.8% |
| Results byte-identical to an earlier one in the same session | 100,217 | 0.4% |

A line counts as the same again when it differs only in its numbers, its hex blobs, its
spacing and its colour codes; `\r` ends a line as `\n` does, which is how a redrawn
progress bar is counted at all. Blank runs are counted apart (769 characters in the whole
corpus) rather than folded in, so the headline is not flattered by whitespace.

Both numbers are marginal: they count what survives the head-and-tail cut, not what it
already removes. At 3.8% the line runs are worth collapsing (TH-16). At 0.4% the repeated
results are not — 1,052 of them, but only 93 still over 200 characters once cut, which is
about what the marker replacing them would cost — so TH-17 and TH-18 are dropped rather
than built, on this corpus, by the rule the milestone set before the measurement.

### What collapsing actually saves

3.8% is the ceiling. What the shipped pipeline takes out — collapse, then cut, against
cutting alone — is smaller, and splits in an awkward place (2026-09-23, default cap):

| `collapse.strict` | Characters | Share of what the model reads | |
|---|---:|---:|---|
| `true` (default) | 43,147 | 0.2% | byte-identical lines; cannot lose information |
| `false` | 692,174 | 2.6% | also folds lines that differ only in their numbers |

Ten times the saving sits on the other side of a risk, and the risk is not symmetrical: a
progress bar's numbers are noise, but `test 3 failed` in a run of `test N passed` is the
one line that mattered. So the default is the conservative pair — on, strict. The spill
always holds the output whole, so nothing a collapse drops is unrecoverable.

That risk has since been measured rather than argued (TH-19, 2026-09-23). Of the 63 runs
a masked collapse folds and a strict one leaves alone, a sample of 40
(`node evals/sample-runs.mjs --n 40 --seed 1`, reproducible) classifies as:

| | Runs | Characters |
|---|---:|---:|
| Content — each line carries a distinct fact | 38 | 64,559 (98.8%) |
| Noise — only the numbers move | 2 | 753 (1.2%) |

Not a progress bar in sight. What a masked collapse actually folds on these transcripts
is table rows, `grep` hits at different line numbers, version tags, log lines with
distinct timestamps, source lines, monitoring series — 2.6% bought by hiding data. The
two it may fold safely are repeated alerts and connection-terminated lines whose only
difference is a pid.

The explanation is in what the corpus is: these are Bash results as the harness gave them
to the model, and a redrawn progress bar rarely survives that far. **So `strict: false`
stays off, and it is not a default in waiting** — turn it on only if you know your output
is machine chatter, and read the spill when it matters.

## Design notes

**Why `PostToolUse` and not rewriting the command.** A `PreToolUse` hook can rewrite a
Bash command through `updatedInput`, but the harness then evaluates permission rules
against the rewritten command, so `npm test 2>&1 | head` no longer matches the user's
`Bash(npm test *)` rule and prompts where it did not before. Replacing the result after
the fact touches neither permissions nor the command the user approved.

**Why not a Noul.** A model judging "is this output worth keeping" would spend tokens to
say that other tokens were wasted. The cut here is arithmetic, deterministic, and free.

**Why a spill file and not nothing.** Eliding the middle is only safe if the middle is
recoverable. The file costs nothing until it is read, and the marker says exactly where
it is; if the model never reads them, the cap can drop.

## Prior art

- [hookgate](https://github.com/Allan-Nava/hookgate), the sibling plugin: calibrated
  gates in the same hooks, answered by a model. trimhook is what hookgate deliberately
  left out (its backlog item HG-8): output hygiene needs no judgement.
- [qrspi](https://github.com/Allan-Nava/qrspi), whose `token-efficiency` skill ranks
  untruncated tool output among the three largest token sinks and says to truncate at
  the source. This is the source.
- [headroom](https://github.com/headroomlabs-ai/headroom), a compression layer that
  sits as a proxy between the agent and the API and compresses tool output with format
  parsers and a local model, keeping originals for a retrieval tool. It is the heavier,
  semantic answer to the same waste. On the same 500 real results (2026-09-28) it saved
  18.1% to trimhook's 24.6%, at about 840 ms a result on CPU; the one part that would
  transplant, its lossless folds, was worth 1.5 points here (`BACKLOG.md`, TH-25). A cut
  made once, at write time, also leaves history bytes alone, so the prompt cache never
  sees them change; a proxy that recompresses every request has to be byte-deterministic
  to promise the same. A test holds trimhook to it: the same result gives the same bytes,
  marker and spill path included, in one process or two (TH-30).

## License

MIT.
