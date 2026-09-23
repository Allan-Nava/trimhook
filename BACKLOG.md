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
- [ ] **TH-11 — First release 0.1.0**: bootstrap publish by hand, trusted publisher, tag
  — after TH-10. <!-- th: prio=med size=S labels=release -->

## v0.2.0 — Beyond Bash <!-- ms: phase=next -->

- [ ] **TH-12 — Other tools**: `Read` of a large file, `WebFetch`, `Grep` results — the
  same cut where the tool's output shape allows `updatedToolOutput`; measured first, as
  TH-6 did for Bash (`Read` is 1.6 M of the 30 M characters in the same transcripts).
  <!-- th: prio=med size=M labels=hook,benchmark -->
- [ ] **TH-13 — Smarter cuts for known formats**: a test runner's failures block, a
  build's error lines, a JSON's shape — kept whole even in the middle, when the pattern
  is unambiguous. Only with a measured false-positive rate. <!-- th: prio=low size=L labels=hook,enhancement -->
- [ ] **TH-14 — Social preview and brand assets**: the OG card rendered from an HTML
  source with headless Chrome, as qrspi and hookgate do. <!-- th: prio=low size=S labels=docs -->
