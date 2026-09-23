<p align="center"><img src="https://raw.githubusercontent.com/Allan-Nava/trimhook/main/assets/logo.svg" width="96" height="96" alt="trimhook"></p>

# trimhook — tool output trimmed at the source

A shell command that prints 30,000 characters costs the model 30,000 characters — every
turn, for the rest of the session. trimhook is a `PostToolUse` hook for Claude Code and
Codex CLI that keeps the **head and the tail** of a long result, elides the middle behind
one line that says how much is missing and **where the whole output is**, and logs what it
saved. Nothing is decided by a model, nothing leaves the machine, and when anything goes
wrong the model sees exactly what it would have seen without the plugin.

> **Status: 0.1.0, measured on transcripts, not yet on live sessions.** The hook, the
> spill files, `doctor` and `report` are in and released. The number that matters — what
> it saves on real sessions, and whether a head-and-tail ever hid something the model
> needed — is measured below on local transcripts only; the live week (TH-10) is still
> open, and until it lands the default cap is a reasoned choice rather than a measured
> one.

## Why a hook and not a setting

Claude Code already cuts Bash output flat at `BASH_MAX_OUTPUT_LENGTH` (default 30,000
characters; the `bashOutputMaxChars` setting overrides it), and Codex budgets tool
output by tokens (`tool_output_token_limit`). Those are ceilings, and they cut from the
end: a test run's summary line, the part that says how it ended, is the first thing to go.
trimhook sits under the harness's ceiling and does three things a flat cut does not:

- **Keeps the tail.** The last lines of a build, a test run or a log are usually the ones
  that matter; 60% of the budget goes to the head, 40% to the tail, cuts fall on line
  boundaries.
- **Spills the whole output to a file** under the plugin's data directory and names it in
  the elision marker, so the model can `Read` the part it did not see, on demand, instead
  of re-running the command.
- **Measures.** One JSON line per result, sizes only, and `trimhook report` prints what
  was saved, by command.

## What it does, exactly

| Event | Match | Decision | Effect |
|---|---|---|---|
| `PostToolUse` | `Bash` | none — the command has already run | If `stdout + stderr` exceed the cap by at least `minSaving`, the result is replaced by head + marker + tail (`updatedToolOutput` on Claude Code; `decision: block` with the trimmed text as the feedback on Codex, opt-in until verified live). Below the cap, or on an image result, or on any error: no output, the harness proceeds unchanged. |

The marker reads, verbatim:

```
… [trimhook: 21,540 of 29,540 characters elided. Full output: ~/.trimhook/spill/<session>/<tool-use>.txt] …
```

`stdout` and `stderr` share one cap, split in proportion to their sizes with a floor for
`stderr`, so a short error is never squeezed out by a long log.

**Fail-open, always.** Exit 0 with no JSON means "leave the result alone": a malformed
event, an unwritable data directory, a bug in this file — the model reads the original.
There is no fail-closed mode, because there is nothing to protect against here, only
tokens to save.

**Nothing leaves the machine.** trimhook makes no network request. The whole output is
written to a file with owner-only permissions under the plugin's data directory
(`CLAUDE_PLUGIN_DATA`, `PLUGIN_DATA`, or `~/.trimhook`), pruned after seven days; the log
keeps sizes and the command's first word or two, never the output. The spill file holds
whatever the command printed — treat that directory as you treat your shell history.

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

Then `trimhook doctor` says which harness it sees, where it writes, and whether the
harness's own cap sits below trimhook's — in which case the harness cuts first and
trimhook never sees the rest.

## Configure

`~/.trimhook.json` (yours), then `TRIMHOOK_CONFIG` if set, then the repository's
`.trimhook.json` (or `.claude/trimhook.json`, `.codex/trimhook.json`), then
`TRIMHOOK_MODE` and `TRIMHOOK_CAP`. Every key is optional:

```json
{
  "mode": "trim",
  "cap": 8000,
  "head": 0.6,
  "minSaving": 1500,
  "perCommand": { "git log": 4000, "npm test": 16000 },
  "spill": true,
  "spillTtlDays": 7,
  "codex": { "replace": false },
  "collapse": { "enabled": true, "minRun": 3, "strict": true }
}
```

`mode: "audit"` measures every result and replaces none — start there if you want the
report before the effect. `perCommand` keys are the command's first word or first two
(`cd …` hops skipped), the more specific winning. Every value is validated; a bad one is
reported by `doctor` and the default takes its place.

`collapse` folds a run of `minRun` or more identical lines down to its first line and a
count, before the cut, so the budget buys distinct content. `strict` compares lines byte
for byte: the copies it drops said exactly what the line it keeps says, so it cannot lose
information. `"strict": false` compares them with digits, hex blobs, spacing and colour
codes masked — ten times the saving, because it catches the progress bar whose whole
point is that the numbers move, but it will also fold a run of lines that differ only in
their numbers. See the measurement below before turning it on.

## What the transcripts say

From 142 local Claude Code sessions and 8 Codex sessions — 28,545 tool results,
28.5 M characters — measured on this machine and sent nowhere (`node evals/local.mjs`,
2026-09-23). The transcripts hold what the harness gave the model, after its own flat
cut, so this is what trimhook adds on top:

| Cap | Results trimmed | Characters saved | Share of all result characters |
|---:|---:|---:|---:|
| 4,000 | 802 of 28,545 | 4,651,331 (≈ 1.16 M tokens) | 16% |
| **8,000** (default) | 288 | 1,951,109 (≈ 488 k tokens) | 7% |
| 12,000 | 133 | 951,634 | 3% |
| 16,000 | 66 | 465,656 | 2% |

One result in a hundred is over 8,000 characters, and those hold 18% of every character
the model read from a shell. Trimming them to 8,000 recovers 7%; halving the cap recovers
16%, at the price of hiding more middles. `cat`, `sed`, `echo` and `for` loops lead the
list of what gets cut — whole-file reads and hand-rolled loops, not test runs. The right
default cap is the open question the design phase carries (`thoughts/`), and the live
measurement (TH-10) is what settles it: `trimhook report` on a week of real work, plus a
count of how often the model went and read a spill file.

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

## License

MIT.
