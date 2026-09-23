# 00 · Questions — TH-1 Tool output trimmed at the source


The default assumption is what makes this phase non-blocking: work can proceed
without waiting for answers, and the assumptions are on the record.

---

## Ticket

**ID:** TH-1
**Link:** https://github.com/Allan-Nava/trimhook/blob/main/BACKLOG.md
**Title:** Tool output trimmed at the source

**Goal.** In a coding agent's session the largest avoidable token sink is tool output
the model reads once and then carries in context for the rest of the session. A sweep
of 131 local Claude Code sessions measured shell (`Bash`) results at 27.8 million
characters (about 7 million tokens), 89% of everything tools returned; the 1% of results
over 8,000 characters hold 17% of it. trimhook is a Claude Code plugin (also usable from
Codex CLI) that cuts oversized `Bash` results *before* they reach the model, with no
model in the loop, nothing leaving the machine, and failing open.

**Done when.**

- `/plugin install trimhook@trimhook` in any repo: a `Bash` result over the cap reaches
  the model as head + marker + tail; the marker names an existing, mode-0600 file that
  holds the whole output; a result under the cap, an image, or any error reaches the
  model unchanged. `trimhook report` shows number of results, characters saved and the
  top commands.
- The same behaviour on Codex CLI via `trimhook print-hooks > .codex/hooks.json`, with
  the result replacement verified on a live Codex session and the `codex.replace`
  default set from what was observed.
- The README carries two dated measurements — the transcript sweep (`evals/local.mjs`)
  and one week of live `trimhook report` beside a count of how often the model went back
  to read a spill file — and the default cap is chosen from those numbers, not guessed.
- `npm test` validates the manifests, both hooks files and the README's three
  load-bearing statements; CI runs on Node 18/20/22/24 without `npm install`; releases
  are cut by tag and published over OIDC.

**In scope.** One `PostToolUse` hook on `Bash`, serving both harnesses from one file
(`updatedToolOutput` on Claude Code; `decision: block` carrying the trimmed text on
Codex). The cut: one cap shared by stdout and stderr in proportion with a floor for
stderr, 60/40 head/tail split, cuts on line boundaries, a marker that pays for itself
within the budget, a `minSaving` threshold so small overruns are left alone. Spill files
under the plugin data directory, pruned; a sizes-only log; `doctor` and `report`
subcommands; config with a trust order and validation; per-command caps; an `audit`
mode. The transcript benchmark and the live measurement protocol.

**Constraints.**

- Claude Code's own `BASH_MAX_OUTPUT_LENGTH` (default 30,000 characters) cuts first and
  flat; trimhook only sees what survives it, so the transcript numbers are post-cut and
  understate the true source size by an unknown amount. `doctor` must warn when the
  harness cap is below trimhook's.
- Hook timeout is 5 s in both hooks files; the handler must finish in tens of
  milliseconds on a 150,000-character result.
- Zero runtime dependencies, Node 18+, `check` green on Node 18.
- The name is our own; no other product's mark.

**Decisions already taken (not to be reopened in Research).**

- `PostToolUse`, not `PreToolUse`: rewriting the command would break users' permission
  rules (`Bash(npm test *)` stops matching); result replacement is documented on both
  harnesses.
- No cut without a spill — the elided middle must always be recoverable on disk.
- The log carries sizes only; the spill file is for the model, the log for the report.
- Codex replacement is opt-in until observed live.

**Working assumptions in the brief.** Starting cap 8,000 characters (6% of result
characters saved on the transcripts, one cut per hundred results; 4,000 would save 16%
and cut one in forty). Four characters per token in the report, labelled as an
estimate. The model reads a spill file rarely; if the live count says otherwise the cap
moves up before 0.1.0.

**Open risks named in the brief.** A hidden middle that mattered (stack trace, failing
assertion, compiler error in the elided region, never read back). Codex's
`decision: block` may read as a failure to the model. The harness's flat cut hides the
true size. A team that already lowered the harness cap gets less from trimhook.

---

## Questions

### Q1 · What exactly counts as "an error reaches the model unchanged" — a harness-level tool error, or any non-zero exit code?

- **Risk if unresolved:** The two readings lead to opposite products. If "error" means
  any command that exited non-zero, then failing test runs, failing builds and failing
  linters — the longest and most repetitive outputs in a coding session, and the very
  place the brief's "hidden middle" risk lives — are never trimmed, and a large share of
  the 17% the ticket targets is left on the table while the README's savings claim is
  measured against a different population than it advertises. If "error" means only a
  harness-reported failure to run the tool, then a 60,000-character failing `npm test`
  is cut and the assertion in the middle is the first thing to go. Research needs to
  know which population to measure, and Design needs to know whether stderr's floor is
  the safety net or whether non-zero exit is.
- **Default assumption:** "Error" means the harness reports the tool call itself as
  failed (an error object or `is_error`-style flag in the hook payload, a timeout, an
  interrupted command). A command that ran and exited non-zero is an ordinary result
  and is trimmed like any other, with the stderr floor as its protection.
- **Answer:** _(to be filled — human)_

### Q2 · Does the `PostToolUse` payload deliver stdout and stderr as separate fields on both harnesses, or as one combined string?

- **Risk if unresolved:** The whole shape of the cut in the brief — one cap shared
  between the two streams in proportion, a floor for stderr — presupposes the hook can
  tell the streams apart. If either harness hands the hook a single already-interleaved
  string, that design has nothing to act on, the stderr floor cannot be implemented as
  written, and the replacement field may need to be filled in a different shape than
  the one it read. If the two harnesses differ, the "both harnesses from one file"
  promise needs a normalisation step that Design must know about before it draws the
  data flow. Getting this wrong is discovered in Implement, after Plan has been written
  around the wrong payload.
- **Default assumption:** Claude Code delivers a structured `tool_response` with
  `stdout` and `stderr` (and an interrupted/exit flag) for `Bash`, and accepts a
  structured or string `updatedToolOutput`; Codex delivers a single string and accepts a
  single string. The proportional cap and stderr floor apply where the streams are
  distinguishable; where they are not, the cap applies to the combined text. Research
  verifies both payloads against the current hook references, dated.
- **Answer:** _(to be filled — human)_

### Q3 · Where do spill files live on each harness, how long do they survive, and what stops a prune from deleting a file the current session's marker still points at?

- **Risk if unresolved:** "Plugin data directory" is a Claude Code concept; Codex has
  no equivalent, and a hook emitted by `print-hooks` into a project's `.codex/` has to
  find a writable home on its own. If the location differs per harness, or falls back
  to a project-relative path, spill files end up in the user's repository (and in
  `git status`), or in a temp directory the OS clears mid-session. The pruning rule is
  the sharper edge: the marker is a promise that the middle is recoverable, and a prune
  by age or by count that runs while a long session is still alive turns the marker into
  a dangling path — exactly the "wrong cap becomes a wrong answer" failure the decisions
  section forbids. Research needs a location per harness and Design needs the lifetime
  rule before the marker format is fixed.
- **Default assumption:** One user-level directory per harness under the user's home
  (the harness's plugin data directory on Claude Code where it exists; a
  `~/.trimhook`-style fallback elsewhere), never inside the working repository. Files
  are pruned by age with a generous window (days, not hours), pruning runs at hook
  start, and nothing written during the current calendar day is ever pruned. The marker
  carries an absolute path.
- **Answer:** _(to be filled — human)_

### Q4 · What does "verified on a live Codex session" mean concretely — who runs it, what is observed, and what happens to the 0.1.0 done-when if the replacement does not behave?

- **Risk if unresolved:** This is the one acceptance criterion that depends on
  observing another product's behaviour rather than on our own code. If "verified" is
  left undefined, either the release waits indefinitely on a test nobody owns, or the
  box gets ticked on a single successful run that did not exercise the failure mode the
  brief itself flags (the model reading `decision: block` as a refused command and
  re-running it). The `codex.replace` default and a README statement hang on the result,
  and `npm test` is meant to check that statement — so an unverified claim would be
  enforced by the test suite as if it were fact.
- **Default assumption:** Verification is a written, repeatable protocol in the repo: a
  scratch project, a command that produces a known oversized output, the Codex session
  transcript inspected for (a) the trimmed text being what the model quotes back and
  (b) no re-run of the same command. Allan runs it once before 0.1.0. If it fails or
  cannot be run, `codex.replace` stays `false`, the README says so with the date, and
  0.1.0 still ships — Codex replacement is not a release blocker.
- **Answer:** _(to be filled — human)_

### Q5 · The README's default cap must be "chosen from the measurements", one of which is a week of live use — does 0.1.0 ship before that week exists, and on which cap?

- **Risk if unresolved:** The done-when is circular as written: the live week needs a
  shipped, installed trimhook running on some cap, and the cap is supposed to come from
  the live week. Left unresolved, either the release stalls or the number in the README
  is presented as measured when it was the starting guess. It also decides how Research
  spends its time: whether the transcript sweep alone has to carry the choice for 0.1.0
  (and therefore needs to be more careful about the post-harness-cut bias the brief
  names), or whether a provisional number is acceptable for the first tag.
- **Default assumption:** 0.1.0 ships on the transcript-derived starting cap (8,000
  characters), labelled in the README as chosen from the sweep and pending the live
  week. The live week runs on Allan's own sessions with that build; the cap is revisited
  and the README's second measurement is added in the next release, and `npm test`
  checks the statements as dated claims, not as "final".
- **Answer:** _(to be filled — human)_

### Q6 · How does the hook command reach trimhook's code on each harness — is `trimhook` a binary on `PATH`, a path inside the plugin, or an absolute path baked in by `print-hooks`?

- **Risk if unresolved:** `/plugin install` puts files under the plugin root but nothing
  on `PATH`, while `trimhook report`, `doctor` and `print-hooks` read as a CLI the user
  types. If the hooks file assumes a global binary that a plugin install never creates,
  the hook silently fails to run (fail-open, so nobody notices) and every number in the
  report is zero. On Codex, a hooks file printed once with a relative path breaks when
  the plugin updates or the checkout moves. This shapes the package layout, the
  `hooks.json` contents that `npm test` validates, and the install instructions —
  Structure cannot be drawn without it.
- **Default assumption:** One npm package with a `bin` entry, installable as a Claude
  Code plugin from its own marketplace. The Claude Code `hooks.json` invokes the handler
  through `${CLAUDE_PLUGIN_ROOT}`; `print-hooks` emits a Codex hooks file with the
  absolute path of the running installation resolved at print time. The CLI subcommands
  are reached with `npx trimhook …` or a global install; the hook never depends on
  `PATH`.
- **Answer:** _(to be filled — human)_

### Q7 · How is "the model went back to read a spill file" counted when the hook only observes `Bash` — from the hook itself, or from the transcripts after the fact?

- **Risk if unresolved:** This count is the single input that is allowed to move the
  cap before 0.1.0, and it is not obviously measurable with what is in scope. A `Read`
  of the spill file never passes through a `Bash` hook; a `cat` of it does. Counting
  only the `Bash` path undercounts, and the cap would be judged "fine" on evidence that
  cannot see half the re-reads. If the answer is "scan the local transcripts", that
  makes the measurement script — not the hook — the instrument, and Research must find
  where the spill path appears in a transcript and whether the `Read` tool's input is
  recorded there.
- **Default assumption:** Counted after the fact by the evals script over the local
  Claude Code transcripts, matching any tool call whose input contains a spill-file
  path, with the trimmed result that produced it and any re-run of the same command in
  the following turns. The hook itself records nothing about re-reads.
- **Answer:** _(to be filled — human)_

### Q8 · What does fail-open cover, and is a failure silent or visible — a hook exception, a timeout, an unwritable spill directory, a disk-full write, an unparseable payload?

- **Risk if unresolved:** "Fail-open" and "no cut without a spill" interact: if the
  spill write fails, the result must pass through untrimmed, which is correct — but
  silently, so a machine with a read-only home directory runs trimhook for a month at
  zero effect and the live measurement is invalid without anyone knowing. Conversely, a
  hook that writes to stderr on every failure shows up in the user's terminal on Claude
  Code and becomes noise. The `report` and `doctor` outputs depend on which failures are
  recorded, and Design needs the list to draw the error paths.
- **Default assumption:** Every failure path returns the result unchanged and writes
  nothing to stdout or stderr. If the sizes-only log is writable, one line records the
  failure class; `doctor` reads that log and reports failure counts, and checks the
  spill directory is writable. The hook exits 0 in every case.
- **Answer:** _(to be filled — human)_

### Q9 · Which configuration sources exist and which wins — and may a project checkout change the cap, the per-command caps, or where spill files are written?

- **Risk if unresolved:** A project-level config file is convenient for per-command
  caps, but a checkout is untrusted input: if it can redirect the spill directory, a
  cloned repository can make the hook write full command outputs to a path of its
  choosing. If it can disable trimming, a team's convenience setting silently undoes
  the user's. The trust order also decides what `doctor` validates and what `audit` mode
  reports against. Left to Implement, the order is chosen by whichever file is read
  first.
- **Default assumption:** Three sources — environment variables, a user-level config
  file, a project-level config file — plus built-in defaults; environment beats user
  beats project beats defaults. A project file may set the cap, `minSaving` and
  per-command caps; only the user level (or environment) may set the spill directory,
  log location and `codex.replace`. Per-command caps match on the command's leading
  words, the same shape users know from permission rules. `audit` computes and logs
  what would have been cut and never replaces.
- **Answer:** _(to be filled — human)_

### Q10 · Is the cap the size of what reaches the model (marker included) or the threshold above which a cut happens, and how do the 60/40 split, the stderr floor and `minSaving` interact at the boundary?

- **Risk if unresolved:** Off-by-a-marker ambiguity produces a hook that emits results
  *larger* than the cap on small overruns, or one whose measured saving in the report
  disagrees with the difference the transcripts show. The "marker pays for itself"
  phrase in the brief suggests the first reading, `minSaving` suggests there is a band
  just above the cap where nothing happens — but whether the band is measured against
  the combined text or per stream, and whether the stderr floor can push the total over
  the cap, decides the exact arithmetic the report and the benchmark both have to
  reproduce. The benchmark and the hook must agree to the character, or the README's
  numbers cannot be checked by `npm test`.
- **Default assumption:** The cap is the maximum size of what reaches the model,
  marker included. A result is cut only if its total exceeds the cap by at least
  `minSaving`; the budget below the cap is split between streams in proportion to their
  sizes with stderr guaranteed its floor, then 60/40 head/tail within each stream, on
  line boundaries, rounding towards keeping less rather than exceeding the cap. The
  benchmark script and the hook share the one function that does this.
- **Answer:** _(to be filled — human)_

---

## Out of scope

Things the ticket might suggest but that we are **not** doing in this task:

- Rewriting commands before they run (`PreToolUse` / `updatedInput`) — decided against
  in the brief for the permission-rule reason.
- Any model-based judgement of what to keep — the sibling plugin hookgate is for that;
  this cut is arithmetic only.
- Trimming tools other than `Bash` (`Read`, `WebFetch`, `Grep`, MCP tools) — v0.2.0,
  measured first.
- Format-aware cuts (keeping a test runner's failure block whole, recognising stack
  traces) — v0.2.0, only with a measured false-positive rate.
- Any network request, telemetry, or state shared between sessions or machines.
- Changing or overriding the harness's own output ceiling (`BASH_MAX_OUTPUT_LENGTH`,
  `bashOutputMaxChars`) — trimhook works under it and `doctor` reports it, nothing more.
- Exact token counts — the report uses a labelled characters-per-token estimate; no
  tokenizer, no API call.
- Supporting harnesses other than Claude Code and Codex CLI in 0.1.0.
- Retroactively compacting existing transcripts or context — the hook acts on new
  results only.
- A UI, dashboard or export format for `report` beyond terminal text.
- Encrypting, syncing or expiring spill files by anything other than the local prune.

---

## Status

- [x] Questions generated
- [ ] Reviewed by a human
- [ ] Answers collected (or assumptions explicitly accepted)

> Next phase: **Research**. The ticket is **not** passed to Research — only the
> questions and their answers.
