# Backlog — trimhook

Single source of truth for what is planned. Items keep a stable `TH-n` id so commits,
the CHANGELOG, the `thoughts/` artifacts and the issues can reference them. New ideas go
here rather than into scattered TODO comments.

[ROADMAP.md](ROADMAP.md) is a **generated** view of this file, grouped by milestone. Do
not edit it by hand — run `node scripts/backlog.mjs roadmap` after touching this file,
or CI fails. The GitHub issues are another generated view, synced one way on every push
to `main` that changes this file.

## How to write an item

```
## v0.2.0 — Title of the milestone <!-- ms: phase=next -->

- [ ] **TH-99 — Short name**: what it is, why it earns its place, what it needs to
  touch. <!-- th: prio=high size=M labels=hook -->
```

- The **id never changes**; a new item takes the next free number.
- `- [ ]` open, `- [x]` shipped with `ver=x.y.z` (or `ver=0.2.0` when merged, unreleased);
  decided against → ticked with `ver=dropped` and the reason in the body.
- Metadata: `prio` (`high|med|low`), `size` (`S|M|L|XL`), `labels` from: `hook`,
  `benchmark`, `release`, `docs`, `project`, `tests`, `enhancement`.

## v0.1.0 — One cut, one number <!-- ms: phase=now -->

The first release: the hook as shipped in the scaffold, its default cap chosen from a
live measurement rather than a guess, Codex's replacement verified on a real session,
and the README saying what it saved and what it hid.

**The measurement is the gate on this milestone.** No `trimhook--v0.1.0` before a week
of `trimhook report` on real work is in the README beside the transcript table, with the
count of spill files the model actually went back to read.

- [x] **TH-1 — Run QRSPI on the brief: Questions → Research → Spec → Plan**: input
  `thoughts/TH-1-output-hygiene/00-brief.md`, one fresh session per phase. The open
  design questions it must settle: the default cap (4,000 saves 16%, 8,000 saves 6% on
  the transcripts — at what cost in hidden middles?), what counts as evidence that a
  middle was needed, whether `stderr` deserves its own cap, and what the Codex
  replacement looks like to the model. **State, 2026-09-28:** Questions answered (defaults
  accepted), Research done with its addendum, Design D1-D8 written and reviewed against
  `main`. D1 shipped as TH-24; the review left four blocking comments, all written in the
  Review section of `02-design.md` with the per-decision status. Next: re-enter Design for
  those comments, then Structure and Plan. **Done, 2026-09-29:** the review comments
  resolved (D9 added for TH-26), Structure in fifteen steps, Plan in `04-plan.md` —
  planned in three fresh sessions because the steps do not fit one. Implementation is
  TH-27. <!-- th: prio=high size=L labels=hook,benchmark ver=0.2.0 -->
- [x] **TH-2 — The PostToolUse cut**: `bin/lib/trim.mjs` — head, tail, marker, line
  boundaries, one cap shared by stdout and stderr with a floor; `updatedToolOutput` in
  Claude Code's Bash shape; `minSaving` so a 9,000-character result is not cut for 1,000.
  <!-- th: prio=high size=M labels=hook ver=0.2.0 -->
- [x] **TH-3 — Spill files**: the whole output at `<data>/spill/<session>/<tool-use>.txt`,
  0600, named in the marker, pruned after `spillTtlDays`; no cut without a spill.
  <!-- th: prio=high size=S labels=hook ver=0.2.0 -->
- [x] **TH-4 — Config with a trust order**: defaults → `~/.trimhook.json` →
  repository file, or `TRIMHOOK_CONFIG` in its place → env; every value validated with
  the default winning; the repository layer classed per key since TH-1 (either way,
  narrow only, denied); `perCommand` caps by first word or two; `audit` mode.
  <!-- th: prio=med size=S labels=hook ver=0.2.0 -->
- [x] **TH-5 — doctor and report**: harness by the signal that decided it, data dir
  writability, config problems, the harness's own `BASH_MAX_OUTPUT_LENGTH` below ours;
  results, characters saved, top commands. <!-- th: prio=med size=S labels=enhancement ver=0.2.0 -->
- [x] **TH-6 — Transcript benchmark**: `evals/local.mjs`, sizes only, cap sweep, top
  commands, Claude Code and Codex sessions; 2026-09-23: 28,219 results, 6% saved at
  8,000, 16% at 4,000. <!-- th: prio=high size=M labels=benchmark ver=0.2.0 -->
- [x] **TH-7 — Manifests, check, CI, release by tag, site**: four manifests held to one
  version; `check` also requires the README to state fail-open, "nothing leaves the
  machine" and the harness cap; CI on Node 18/20/22/24; OIDC release; Pages from README.
  <!-- th: prio=med size=M labels=project,release ver=0.2.0 -->
- [x] **TH-8 — Backlog as the single source of truth**: this file, the generated
  roadmap, the one-way issue sync, the planner test. <!-- th: prio=low size=S labels=project ver=0.2.0 -->
- [x] **TH-9 — Verify the Codex replacement live**: `decision: block` with the trimmed
  text is documented to replace the result; observe on Codex 0.155+ what the model sees,
  whether it reads as an error, and whether `continue: false` reads better; then flip
  `codex.replace` to default on or record why not. The protocol and its pass rule are
  in `evals/codex-live.md` (TH-1, D5): three runs per `codex.mode`, judged on `Bash`. Done 2026-09-29: neither shape passed on Codex 0.155.1 (`evals/codex-live.md`); `codex.replace` stays opt-in, and the README says what each did. <!-- th: prio=high size=S labels=hook,tests ver=0.2.0 -->
- [ ] **TH-10 — Live measurement, one week**: a week at `cap: 4000` with all three tools;
  `trimhook report` (and `--cap 8000`, `--cap 12000`) for the saving, `node evals/reads.mjs`
  for the spill reads and re-runs per tool; both numbers into the README beside the
  transcript table, and the default cap decided by the rule the README states before the
  week (per tool, a 20-cut floor, at or under 10% over all cuts and over the 9,500 subset,
  4,000 → 8,000 → 12,000). Does not gate 0.2.0 (TH-1). <!-- th: prio=high size=M labels=benchmark -->
- [x] **TH-11 — First release 0.1.0**: bootstrap publish by hand, trusted publisher, tag
  — after TH-10. Published 2026-09-23 ahead of TH-10, deliberately: the README states
  that the numbers are transcript-only and the default cap reasoned rather than
  measured. <!-- th: prio=med size=S labels=release ver=0.1.0 -->

## v0.2.0 — Beyond Bash <!-- ms: phase=next -->

- [x] **TH-12 — Other tools**: measured first, as TH-6 did for Bash. Of what each tool
  prints, the cut would take 6.7% of Bash's, 26.6% of Read's, 62.4% of WebFetch's, 50.2%
  of Agent's, and nothing at all from anything else (2026-09-23). Read and WebFetch add
  1.38 M characters to Bash's 1.93 M, from 1,019 results against 28,761. Both shapes read
  off real transcripts — Read cuts `file.content`, WebFetch cuts `result`, every other
  field carried through — and the matcher now reads `Bash|Read|WebFetch`. `Agent` is left
  out: its result is a list of message blocks, not one text field.
  <!-- th: prio=med size=M labels=hook,benchmark ver=0.2.0 -->
- [x] **TH-20 — Verify the Read and WebFetch replacement live**: done 2026-09-24 in a
  Claude Code session with the checkout installed as a plugin. A `Read` of 23,715
  characters came back at 7,923 with the marker inside `file.content` and the whole file
  in the spill; the log recorded `Read trimmed elided=15,986`, and the model demonstrably
  received the cut text — so the saving is real, not a replacement refused in silence. A
  `seq` of 11,392 characters confirmed Bash in the same session. WebFetch is still only
  proven against its recorded shape, not live.
  <!-- th: prio=high size=S labels=hook,tests ver=0.2.0 -->
- [x] **TH-21 — The log needs one home**: found while verifying TH-20. `dataDir()`
  preferred `CLAUDE_PLUGIN_DATA`, which the harness sets for the hook process alone, so
  the hook wrote to `~/.claude/plugins/data/trimhook-inline` while `trimhook report` in a
  terminal read `~/.trimhook` and answered "no results logged yet" — the log was
  unreadable by the one command that exists to read it, and TH-10 is a week of exactly
  that command. Now `TRIMHOOK_DATA` or `~/.trimhook`, nothing else; the marker's spill
  paths are absolute either way, so the model never depended on it.
  <!-- th: prio=high size=S labels=hook ver=0.2.0 -->
- [x] **TH-24 — No spill without a cut**: TH-3 promises "no cut without a spill"; the
  handler also does the converse wrong. `postToolUse` in `bin/lib/handlers.mjs` writes the
  spill *before* `trimResult` decides, so every result of a listed tool lands on disk,
  cut or not. Measured on one install on 2026-09-28: 2,551 results logged, 47 cut, 2,551
  spill files (3.1 MB) — 2,504 of them whole copies of outputs the model saw in full,
  named by no marker, kept `spillTtlDays` at 0600. That is a week of every command's
  output, secrets included, for nothing. The path is deterministic from the session and
  the tool-use id, so the marker can name it before the file exists: decide first, write
  only when the cut is taken. Found while comparing trimhook with headroom (TH-25). Done
  when a test asserts a kept result leaves no file, and the prune still covers the old
  ones. **Fixed:** `store.mjs` splits `spillPath` from `writeSpill`, and the handler
  writes only when it replaces. The same change restores rule 3, which the old order
  broke the other way: a failed write used to cut anyway, with no pointer, and now
  leaves the result whole (`spillFailed` in the log). Old orphans age out under the
  existing prune. <!-- th: prio=high size=S labels=hook ver=0.2.0 -->
- [x] **TH-26 — A read of a spill file is cut again**: the spill exists so the model can
  read the middle it did not see — but since TH-12 a `Read` is cut like a Bash result,
  and nothing exempted the spill directory. Reproduced on 2026-09-28: a 3,000-line Bash
  result is cut, the model's `Read` of the 88,889-character spill comes back at 7,971
  characters with a new marker, a second spill is written, and line 1,500 is still not
  visible. The same happened to a `cat`, `sed` or `grep` of the spill in Bash. Fixed by
  TH-1's D9: a `Read` whose `file_path`, resolved against the hook's `cwd`, lies under
  `<data>/spill/`, and a Bash command containing that directory's path — absolute, or
  `~/…` when the data dir is under home — come back whole and are logged `kept` with
  `spillRead: true`; `WebFetch` is never exempt. The reproduction is an ordinary test in
  `test/handlers.test.mjs`. <!-- th: prio=high size=S labels=hook ver=0.2.0 -->
- [ ] **TH-27 — Implement the TH-1 plan**: `thoughts/TH-1-output-hygiene/04-plan.md`,
  one fresh session per step, progress in `99-progress.md`. Thirteen agent steps — S1 the
  spill-read exemption (closes TH-26), S2 interrupted results, S3 stray strings in the
  workflows, S4 `evals/reads.mjs` for three tools and both harnesses, S5 the TH-9
  protocol file, S6 failure records, S7 per-layer key classes (breaking for repository
  files; 0.2.0), S8 Codex `continue: false` behind `codex.mode`, S9 `report --cap N` and
  the written cap rule, S10 the README numbers guarded by `check`, S11 `doctor` reading
  `bashOutputMaxChars`, S13 and S15 applying the two live verdicts — and two human ones:
  S12 is TH-9, S14 is TH-10. S1-S7 have no dependencies on each other. Assumptions for the
  maintainer to confirm are labelled in the plan: 0.2.0 does not wait for TH-10, and the
  week's verdict is confirmed before the default cap changes.
  <!-- th: prio=high size=L labels=hook,enhancement -->
- [x] **TH-34 — The Codex log claims savings the model never got**: found by TH-27 S13,
  2026-09-29. With `codex.replace: true` and the default `codex.mode: continue`, the hook
  logs `outcome: 'trimmed'` — but TH-9 showed that on Codex 0.155.1 `continue: false` is
  read (`hook: PostToolUse Stopped`) and the model still receives the whole output, so
  `report` would count characters saved that never left the context. Log such a result
  as `would-trim` (or a distinct outcome) whenever the harness is Codex and the mode is
  `continue`, until a live run shows the shape replacing the result; and drop the stale
  comment on `DEFAULTS.codex` in `bin/lib/config.mjs` ("opt-in until TH-9's live run" —
  that run has happened). **Done 2026-09-29, and wider than filed:** `summarize` had
  counted every non-kept result as saved, so audit mode's `would-trim` inflated the
  figure too. Now the outcome is `unconfirmed` for a Codex `continue` reply, and `report`
  splits "saved" (only `trimmed`) from "would save". <!-- th: prio=med size=S labels=hook ver=0.2.0 -->
- [x] **TH-13 — Smarter cuts for known formats**: measured with `evals/middles.mjs`
  before building, and **dropped**. The premise was that the cut hides the part saying
  what went wrong. On 287 real cuts (2026-09-24) it does not: 13 carry a line that
  announces a failure, 10 of those show it in the head or the tail anyway, and the 3
  where it is hidden are all false positives of the patterns themselves —
  `error: (error) => {` in a source file, `FAIL="$FAIL …"` in a shell script, a `×` used
  as a bullet in a diagram. A deliberately over-wide net puts the ceiling at 28 of 287
  (9.8%); a sample of 12 of those found **one** genuine case, a `gh run view --log` whose
  `fatal:` and `##[error]` lines sat in the middle. So the real rate is around 1%, and
  the pattern that would rescue it also pulls in eleven files, greps and READMEs that
  merely discuss failure — trimhook's corpus is mostly text *about* code, where
  "announces a failure" and "mentions one" are the same string. The marker already names
  the spill; whether an elided middle actually costs anything is TH-10's re-read count,
  not a pattern's. <!-- th: prio=low size=L labels=hook,enhancement ver=dropped -->
- [x] **TH-22 — Count what a cut costs, not only what it saves**: `evals/reads.mjs`
  scans the transcripts for cuts and asks what the model did next — read the spill the
  marker named, or run the same command again. Both are the cost side of the cap that
  `trimhook report` cannot see, and TH-10 cannot be decided without them. A cut is found
  by `MARKER_RE`, exported from `trim.mjs` beside the function that writes the marker, so
  a reworded marker cannot leave the scan silently reading zero; `local.mjs` and
  `middles.mjs` now share that one definition too. Reads near zero until trimhook has
  been running for a while, which is what TH-10 is.
  <!-- th: prio=high size=M labels=benchmark ver=0.2.0 -->
- [x] **TH-23 — The log recorded values, not command names**: found the moment TH-22
  printed its table. `commandPrefix` took the first word, and a leading assignment makes
  the first word a value — `AWS_SECRET_ACCESS_KEY=… npm run deploy` wrote the key to
  `results.jsonl`, `S=/private/tmp/… ; echo` wrote a path. Leading assignments are now
  skipped as `cd` hops already were, a program is reduced to its own name rather than its
  path, both words are capped at 32 characters, and a command that is nothing but
  assignments logs `(env)`. This is rule 4 of `CLAUDE.md` — sizes only, never the output
  — which the log had been quietly breaking since 0.0.1.
  <!-- th: prio=high size=S labels=hook ver=0.2.0 -->
- [x] **TH-14 — Social preview and brand assets**: `assets/social-preview.html` rendered
  to `assets/social-preview.png` by `scripts/social.mjs` with headless Chrome, 1280×640
  at 2×, no dependency added. The card shows the marker line itself, because that line is
  the product. The mark is `assets/logo.svg` referenced rather than copied, so it cannot
  drift from the favicon; `check` now fails when the PNG the meta tags name is missing,
  which it had been for weeks. <!-- th: prio=low size=S labels=docs ver=0.2.0 -->

## v0.3.0 — Less of the same <!-- ms: phase=later -->

The cut so far is head and tail of one result, and it treats every line as worth the same.
Most long output is not long because it says many things: it is long because it says one
thing many times — a progress line redrawn four hundred times, the same `git status`
printed in eight turns. This milestone goes after the repetition, and stays arithmetic:
run length and equality, no model, no guess about meaning.

**The measurement comes first, as it did for the cut itself.** No item here is built
before TH-15 says what it is worth on the transcripts; an idea that saves under a couple
of per cent is dropped rather than shipped.

TH-15 answered on 2026-09-23, and the rule was applied: line runs 3.8%, so TH-16 is
built; repeated results 0.4%, so TH-17 and TH-18 are dropped. One item of four survives,
which is what a gate is for.

TH-16 then split the 3.8% in an awkward place: what the shipped pipeline actually saves
is 0.2% when lines must match byte for byte, and 2.6% when their numbers are masked. The
conservative half ships on; TH-19 then looked at what the other half folds and found 38
of 40 sampled runs were content, so it stays off for good rather than for now. Of the
four items this milestone opened with, one shipped and three are closed by measurement.

- [x] **TH-15 — What the repetition is worth**: `evals/local.mjs` extended with two
  counters over the same corpus — characters inside runs of near-identical lines, and
  characters in results byte-identical to an earlier result in the same session. Both
  marginal: counted inside the head and tail the cut keeps, not over the whole output.
  2026-09-23, 28,545 results: line runs 1,011,413 characters, **3.8%** of what the model
  reads; repeated results 100,217, **0.4%**. In the README, dated.
  <!-- th: prio=high size=M labels=benchmark ver=0.2.0 -->
- [x] **TH-16 — Collapse the runs**: a run of identical lines becomes its first line and
  a count, before the cut, so the budget buys distinct content; the spill keeps the
  output whole, so nothing it drops is unrecoverable. `bin/lib/collapse.mjs`, pure and
  unit-tested; `collapse: { enabled, minRun, strict }`. On and strict by default —
  byte-identical lines only, 0.2% of what the model reads, which cannot cost anything.
  The masked comparison is worth 2.6% and stays opt-in until TH-19 measures what it
  folds by mistake. <!-- th: prio=med size=M labels=hook,enhancement ver=0.2.0 -->
- [x] **TH-19 — The false-positive rate of a masked collapse**: `evals/sample-runs.mjs`,
  a seeded sample of the runs a masked collapse folds and a strict one does not, for a
  human to judge. 2026-09-23, 40 runs of 63, seed 1: **38 content, 2 noise — 95% by run,
  98.8% by character**. Table rows, grep hits, version tags, log lines differing by a
  timestamp; not one progress bar, because a redrawn one barely reaches a transcript.
  `strict: false` stays off and is documented as not a default in waiting.
  <!-- th: prio=med size=M labels=benchmark,hook ver=0.2.0 -->
- [x] **TH-17 — The same result twice**: a result whose hash matches one already seen in
  the session would be replaced by a marker naming the earlier `tool_use_id` and its
  spill. **Dropped on the measurement** (TH-15, 2026-09-23): 1,052 repeated results in
  28,545, worth 100,217 characters — 0.4% of what the model reads, against a bar of 2%.
  Only 93 of them are still over 200 characters once cut, which is about what the marker
  replacing them would cost. A session-scoped index and an answer to "has this really not
  changed?" is a lot of machinery for that. Re-open if a corpus says otherwise.
  <!-- th: prio=med size=L labels=hook ver=dropped -->
- [x] **TH-18 — One spill per content**: identical outputs share one file, named by
  hash; the TTL prune counts references, not files. **Dropped with TH-17**, which it
  depended on: 100,217 characters of repeated results across the whole corpus is not a
  disk problem. <!-- th: prio=low size=S labels=hook ver=dropped -->
- [x] **TH-25 — Format-native lossless folds, from headroom**: [headroom](https://github.com/headroomlabs-ai/headroom)
  (0.39.1) ships reversible, stdlib-only folds that keep an output looking like itself —
  grep rows headed by file or directory, a path listing headed by directory, a diff
  without its `index` lines, a repeated block replaced by a back-reference — each
  verified by a round-trip and discarded when it is not smaller. Measured on 2026-09-28
  on 500 long tool results from real sessions, with headroom's own `compact_lossless`
  run before trimhook's cut: the folds alone save 3.6%, and in front of the cut they
  move the total from 24.6% to 26.1% — 1.5 points, under this milestone's couple of per
  cent. **Dropped on the measurement.** headroom's own docs add the cost: the model reads
  only the folded side and has to reconstruct paths itself, which spends output tokens.
  The same run compared the two tools whole: headroom's full pipeline (its local
  Kompress model on CPU) saved 18.1% where trimhook saves 24.6%, at 840 ms a result p50
  against none, and kept 47.6% of error-mentioning lines verbatim against trimhook's
  78.5%, because it drops words inside lines. Its cross-turn dedup is TH-17 again, and
  its error protection is TH-13 again — both already closed by measurement here.
  <!-- th: prio=low size=M labels=benchmark ver=dropped -->

## v0.4.0 — What headroom measured <!-- ms: phase=later -->

[headroom](https://github.com/headroomlabs-ai/headroom) (0.39.1, Apache-2.0) is a proxy
that compresses tool output semantically, and its source carries measurements and
invariants that apply to a cut as much as to a compressor. TH-25 compared the two tools
whole on 2026-09-28 and dropped the one part that would transplant, its lossless folds.
This milestone takes the rest — not its code, its reasons — and holds each to the same
gate as v0.3.0: **measured first; an idea that saves under a couple of per cent is
dropped**, unless it is a correctness fix, which is judged by what it breaks. headroom's
error protection and cross-turn dedup are not here: they are TH-13 and TH-17, both closed
by measurement.

Sized on 2026-09-28 against local transcripts, at the default cap of 8,000, where a cut
takes place from 9,500 characters (cap plus `minSaving`): 281 results would be cut, and
the cut would take 2.42 M characters.

- [ ] **TH-28 — What a cut Read costs an Edit**: headroom keeps `Read` out of compression
  because the `Edit` that follows needs the file's exact bytes (`DEFAULT_EXCLUDE_TOOLS` in
  its `config.py`); trimhook cuts `Read` since TH-12. A cut is verbatim, so an `old_string`
  copied from the visible part is exact — the cost is the part not visible. Estimated on
  the transcripts: 38 Reads long enough to be cut, 155 Edits on the same files after them,
  and at least 15 of those (10%) with the `old_string` inside the part the cut would hide;
  a lower bound, since the match only finds strings within one line. Those Reads were not
  cut at the time, so what the model does instead is unknown. Measure it live in the TH-10
  week: after a cut `Read`, count the pages read with `offset`/`limit` and the Edits that
  fail on the same path (extend `evals/reads.mjs`). Then decide, with the number: keep
  `Read` in `tools`, give it its own higher cap (`perCommand: { "Read": … }` already
  exists), or take it out. **State, 2026-09-29:** the instrument is built — `node evals/reads.mjs` prints, after
  a cut Read, the pages of the same file and the Edits of it that failed, and beside them
  the held-out Reads when TH-31's holdout is on. The local transcripts hold no cut Read
  yet (the copy installed here predates TH-12), so the number comes from TH-10's week;
  the decision on Read's place in `tools` waits for it. <!-- th: prio=high size=M labels=benchmark,hook -->
- [x] **TH-29 — Instruction files are never cut**: headroom excludes Claude Code's `Skill`
  tool because a lossy pass inverts instructions — on 40 real `SKILL.md` bodies only 73.5%
  of negations and 65.5% of modals survived (its `config.py`). trimhook's cut does not drop
  words, it drops the whole middle, which is worse for a file of rules: the rules in the
  middle are simply gone. Exempt a `Read` of `CLAUDE.md`, `CLAUDE.local.md`, `AGENTS.md`,
  `GEMINI.md`, `SKILL.md` and anything under `.claude/commands/`, `.claude/agents/` or
  `.claude/skills/`, the same way D9 exempts a spill read. A correctness fix, not a saving:
  22 such Reads in the transcripts, one over the cut, 0.12% of what the cut takes — so the
  exemption costs nothing. **Done 2026-09-29:** `readsInstructions` in `bin/lib/store.mjs`, logged
  `instructions: true`. <!-- th: prio=med size=S labels=hook ver=0.2.0 -->
- [x] **TH-30 — The cut is byte-deterministic, and a test says so**: the README's
  cache-safety claim (TH-25) rests on the cut being a pure function of its input — the
  same result gives the same bytes, marker and spill path included — so a prompt-cache
  prefix never changes. headroom documents the failure this rules out: a compressor that
  is not byte-deterministic loses the whole prefix discount on the next turn
  (`compress_assistant_text_blocks`, its `content_router.py`). Add the test: the same
  input through `postToolUse` twice, and through the CLI in two processes, gives
  identical stdout. **Done 2026-09-29:** three tests in `test/handlers.test.mjs`; the one gap —
  a spill named from the clock when the event has no tool-use id — now named from a
  content hash. <!-- th: prio=med size=S labels=tests ver=0.2.0 -->
- [x] **TH-31 — A holdout, so the cost is measured rather than estimated**: headroom
  reports its output savings as an estimate with a confidence range, and offers holding
  out 10% of conversations for a measured number. trimhook's week (TH-10) has the same
  gap: a re-read rate says what happened after a cut, not what would have happened
  without one. Add `holdout` (default 0): that share of cuttable results is left whole
  and logged `kept, holdout: true`, chosen from a hash of the tool-use id so a run is
  reproducible; `evals/reads.mjs` then compares re-reads, re-runs and the tokens of the
  following turn between the two groups. Denied to the repository layer (D4): it is a
  measurement knob. **Done 2026-09-29:** `bin/lib/holdout.mjs`, the `holdout` key, `--holdout` in
  `evals/reads.mjs`. The comparison is on re-runs — a held-out result has no spill to read
  back — and the next turn's tokens are left out: in a transcript they move with
  everything else in the turn, so they would not isolate the cut.
  <!-- th: prio=med size=M labels=benchmark,hook ver=0.2.0 -->
- [x] **TH-32 — JSON-aware cuts, from headroom's SmartCrusher**: headroom's JSON crusher
  reaches 90% on repeated arrays, and a head-and-tail cut of a JSON document leaves it
  unbalanced. **Dropped on the measurement:** 2 Bash results that are whole JSON
  documents would be cut, 0.18% of what the cut takes (2026-09-28). trimhook cuts only
  `Bash`, `Read` and `WebFetch`; re-open if `tools` grows to include a tool that returns
  JSON. <!-- th: prio=low size=M labels=benchmark ver=dropped -->
- [x] **TH-33 — Cite headroom as prior art for D9**: headroom excludes its own
  `headroom_retrieve` tool from recompression, because a recompressed original writes a
  marker nobody can redeem — the same reason D9 exempts a read of a spill file. One line
  in the Design. <!-- th: prio=low size=S labels=docs ver=0.2.0 -->
