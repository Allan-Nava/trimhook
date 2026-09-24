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
- `- [ ]` open, `- [x]` shipped with `ver=x.y.z` (or `ver=main` when merged, unreleased);
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

- [ ] **TH-1 — Run QRSPI on the brief: Questions → Research → Spec → Plan**: input
  `thoughts/TH-1-output-hygiene/00-brief.md`, one fresh session per phase. The open
  design questions it must settle: the default cap (4,000 saves 16%, 8,000 saves 6% on
  the transcripts — at what cost in hidden middles?), what counts as evidence that a
  middle was needed, whether `stderr` deserves its own cap, and what the Codex
  replacement looks like to the model. <!-- th: prio=high size=L labels=hook,benchmark -->
- [x] **TH-2 — The PostToolUse cut**: `bin/lib/trim.mjs` — head, tail, marker, line
  boundaries, one cap shared by stdout and stderr with a floor; `updatedToolOutput` in
  Claude Code's Bash shape; `minSaving` so a 9,000-character result is not cut for 1,000.
  <!-- th: prio=high size=M labels=hook ver=main -->
- [x] **TH-3 — Spill files**: the whole output at `<data>/spill/<session>/<tool-use>.txt`,
  0600, named in the marker, pruned after `spillTtlDays`; no cut without a spill.
  <!-- th: prio=high size=S labels=hook ver=main -->
- [x] **TH-4 — Config with a trust order**: defaults → `~/.trimhook.json` →
  `TRIMHOOK_CONFIG` → repository file → env; every value validated with the default
  winning; `perCommand` caps by first word or two; `audit` mode.
  <!-- th: prio=med size=S labels=hook ver=main -->
- [x] **TH-5 — doctor and report**: harness by the signal that decided it, data dir
  writability, config problems, the harness's own `BASH_MAX_OUTPUT_LENGTH` below ours;
  results, characters saved, top commands. <!-- th: prio=med size=S labels=enhancement ver=main -->
- [x] **TH-6 — Transcript benchmark**: `evals/local.mjs`, sizes only, cap sweep, top
  commands, Claude Code and Codex sessions; 2026-09-23: 28,219 results, 6% saved at
  8,000, 16% at 4,000. <!-- th: prio=high size=M labels=benchmark ver=main -->
- [x] **TH-7 — Manifests, check, CI, release by tag, site**: four manifests held to one
  version; `check` also requires the README to state fail-open, "nothing leaves the
  machine" and the harness cap; CI on Node 18/20/22/24; OIDC release; Pages from README.
  <!-- th: prio=med size=M labels=project,release ver=main -->
- [x] **TH-8 — Backlog as the single source of truth**: this file, the generated
  roadmap, the one-way issue sync, the planner test. <!-- th: prio=low size=S labels=project ver=main -->
- [ ] **TH-9 — Verify the Codex replacement live**: `decision: block` with the trimmed
  text is documented to replace the result; observe on Codex 0.155+ what the model sees,
  whether it reads as an error, and whether `continue: false` reads better; then flip
  `codex.replace` to default on or record why not. <!-- th: prio=high size=S labels=hook,tests -->
- [ ] **TH-10 — Live measurement, one week**: `trimhook report` on real sessions, plus
  the count of `Read` calls on spill files from the transcripts; both numbers into the
  README beside the transcript table, and the default cap decided from them.
  **Gates the release.** <!-- th: prio=high size=M labels=benchmark -->
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
  <!-- th: prio=med size=M labels=hook,benchmark ver=main -->
- [x] **TH-20 — Verify the Read and WebFetch replacement live**: done 2026-09-24 in a
  Claude Code session with the checkout installed as a plugin. A `Read` of 23,715
  characters came back at 7,923 with the marker inside `file.content` and the whole file
  in the spill; the log recorded `Read trimmed elided=15,986`, and the model demonstrably
  received the cut text — so the saving is real, not a replacement refused in silence. A
  `seq` of 11,392 characters confirmed Bash in the same session. WebFetch is still only
  proven against its recorded shape, not live.
  <!-- th: prio=high size=S labels=hook,tests ver=main -->
- [x] **TH-21 — The log needs one home**: found while verifying TH-20. `dataDir()`
  preferred `CLAUDE_PLUGIN_DATA`, which the harness sets for the hook process alone, so
  the hook wrote to `~/.claude/plugins/data/trimhook-inline` while `trimhook report` in a
  terminal read `~/.trimhook` and answered "no results logged yet" — the log was
  unreadable by the one command that exists to read it, and TH-10 is a week of exactly
  that command. Now `TRIMHOOK_DATA` or `~/.trimhook`, nothing else; the marker's spill
  paths are absolute either way, so the model never depended on it.
  <!-- th: prio=high size=S labels=hook ver=main -->
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
  <!-- th: prio=high size=M labels=benchmark ver=main -->
- [x] **TH-23 — The log recorded values, not command names**: found the moment TH-22
  printed its table. `commandPrefix` took the first word, and a leading assignment makes
  the first word a value — `AWS_SECRET_ACCESS_KEY=… npm run deploy` wrote the key to
  `results.jsonl`, `S=/private/tmp/… ; echo` wrote a path. Leading assignments are now
  skipped as `cd` hops already were, a program is reduced to its own name rather than its
  path, both words are capped at 32 characters, and a command that is nothing but
  assignments logs `(env)`. This is rule 4 of `CLAUDE.md` — sizes only, never the output
  — which the log had been quietly breaking since 0.0.1.
  <!-- th: prio=high size=S labels=hook ver=main -->
- [x] **TH-14 — Social preview and brand assets**: `assets/social-preview.html` rendered
  to `assets/social-preview.png` by `scripts/social.mjs` with headless Chrome, 1280×640
  at 2×, no dependency added. The card shows the marker line itself, because that line is
  the product. The mark is `assets/logo.svg` referenced rather than copied, so it cannot
  drift from the favicon; `check` now fails when the PNG the meta tags name is missing,
  which it had been for weeks. <!-- th: prio=low size=S labels=docs ver=main -->

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
  <!-- th: prio=high size=M labels=benchmark ver=main -->
- [x] **TH-16 — Collapse the runs**: a run of identical lines becomes its first line and
  a count, before the cut, so the budget buys distinct content; the spill keeps the
  output whole, so nothing it drops is unrecoverable. `bin/lib/collapse.mjs`, pure and
  unit-tested; `collapse: { enabled, minRun, strict }`. On and strict by default —
  byte-identical lines only, 0.2% of what the model reads, which cannot cost anything.
  The masked comparison is worth 2.6% and stays opt-in until TH-19 measures what it
  folds by mistake. <!-- th: prio=med size=M labels=hook,enhancement ver=main -->
- [x] **TH-19 — The false-positive rate of a masked collapse**: `evals/sample-runs.mjs`,
  a seeded sample of the runs a masked collapse folds and a strict one does not, for a
  human to judge. 2026-09-23, 40 runs of 63, seed 1: **38 content, 2 noise — 95% by run,
  98.8% by character**. Table rows, grep hits, version tags, log lines differing by a
  timestamp; not one progress bar, because a redrawn one barely reaches a transcript.
  `strict: false` stays off and is documented as not a default in waiting.
  <!-- th: prio=med size=M labels=benchmark,hook ver=main -->
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
