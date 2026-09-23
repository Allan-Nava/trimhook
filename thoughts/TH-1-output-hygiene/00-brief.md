# TH-1 — Brief: tool output trimmed at the source

**Repository:** https://github.com/Allan-Nava/trimhook · **Ticket:** TH-1 in `BACKLOG.md`
**Date:** 2026-09-23 · **Author:** Allan Nava, with Claude

## Goal

The largest avoidable token sink in a coding agent's session is tool output the model
reads once and carries forever: in 131 local Claude Code sessions, shell results weigh
27.8 million characters (≈ 7 million tokens), 89% of everything the tools returned, and
one result in a hundred — the ones over 8,000 characters — holds 17% of it. trimhook
cuts those at the source: a `PostToolUse` hook keeps the head and tail, elides the
middle behind a marker that names a file with the whole output, and reports what it
saved. No model in the loop, nothing leaves the machine, fail-open.

## Done when

- `/plugin install trimhook@trimhook` in any repo: a Bash result over the cap reaches
  the model as head + marker + tail; the marker names an existing 0600 file holding the
  whole output; a result under the cap, an image, or any error reaches the model
  unchanged. `trimhook report` shows results, characters saved, top commands.
- The same on Codex CLI through `trimhook print-hooks > .codex/hooks.json`, with the
  replacement verified on a live session and `codex.replace` defaulted accordingly.
- The README carries two dated measurements: the transcript sweep (`evals/local.mjs`)
  and one week of live `trimhook report` beside a count of how often the model went back
  to read a spill file — and the default cap is chosen from those, not guessed.
- `npm test` validates manifests, both hooks files, the README's three load-bearing
  statements; CI on Node 18/20/22/24 without `npm install`; release by tag over OIDC.

## In scope

- One hook, `PostToolUse` on `Bash`, both harnesses from one file; `updatedToolOutput`
  on Claude Code, `decision: block` with the trimmed text on Codex.
- The cut: one cap shared by stdout and stderr in proportion with a floor for stderr,
  60/40 head/tail, cuts on line boundaries, a marker that pays for itself within the
  budget, `minSaving` so small overruns are left alone.
- Spill files under the plugin data directory, pruned; a sizes-only log; `doctor`,
  `report`; config with a trust order and validation; per-command caps; `audit` mode.
- The transcript benchmark and the live measurement protocol.

## Out of scope

- Rewriting commands (`PreToolUse` `updatedInput`): the harness evaluates permission
  rules against the rewritten command, so a user's `Bash(npm test *)` rule stops
  matching and prompts appear where they did not. Decided against.
- Judging content with a model: the sibling plugin hookgate exists for judgement; this
  cut is arithmetic.
- Tools other than `Bash` in 0.1.0 (`Read`, `WebFetch`, `Grep` are v0.2.0, measured first).
- Format-aware cuts (keep a test runner's failure block whole) — v0.2.0, only with a
  measured false-positive rate.
- Any network request, telemetry, or shared state between sessions.

## Constraints

- Under the harness's own ceiling: Claude Code's `BASH_MAX_OUTPUT_LENGTH` (default
  30,000 characters) cuts first, flat; trimhook only ever sees what survives it, and the
  transcript numbers are therefore post-cut. `doctor` warns when the harness cap is
  below ours.
- Hook timeout 5 s in both hooks files; the handler must finish in tens of milliseconds
  on a 150,000-character result.
- Zero dependencies, Node 18+, `check` green on Node 18.
- The name is our own; no other product's mark.

## Decisions taken

- **`PostToolUse`, not `PreToolUse`** — for the permission reason above, and because
  the result replacement is documented on both harnesses (Claude Code
  `updatedToolOutput`, Codex `decision: block` / `continue: false`).
- **No cut without a spill** — the middle must always be recoverable, or a wrong cap
  becomes a wrong answer.
- **Sizes only in the log** — the log is for the report; the spill is for the model.
- **Codex replacement opt-in** until observed live.

## Assumptions (proceeding this way unless corrected)

- 8,000 characters as the starting cap: 6% of result characters saved on the
  transcripts, one cut per hundred results. 4,000 would save 16% and cut one in forty.
- Four characters per token as the conversion in the report — an estimate, labelled as
  such; the exact count needs the model's tokenizer.
- The model reads a spill file rarely; if the live count says otherwise, the cap is too
  low and moves up before 0.1.0.

## Open risks

- **A hidden middle that mattered.** A stack trace, a failing assertion, a compiler error
  that sits in the elided region and is never read back. The live measurement must look
  for the pattern "trimmed result → command re-run or spill read" and count it.
- **Codex's `decision: block` may read as a failure to the model** even though the docs
  say it replaces the result — the reason `codex.replace` is opt-in.
- **The harness's flat cut hides the true size.** A 30,000-character result in the
  transcript may have been 300,000 at the source; the transcript sweep understates what
  trimhook sees in a live session and cannot say by how much.
- **Interaction with `bashOutputMaxChars` set by a team** — a user who already lowered
  the harness cap gets less from trimhook; `doctor` says so, the README must too.
