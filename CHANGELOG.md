# Changelog

All notable changes to trimhook. The format is [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/). Items reference their `TH-n` backlog id.

## [Unreleased]

### Added
- `evals/local.mjs` measures repetition as well as size: characters inside runs of
  near-identical lines, and results byte-identical to an earlier result in the same
  session. Both counted inside the head and tail the cut keeps, so the number is the
  marginal one. The text is read, measured and dropped in-process — the report and
  `evals/results/` hold counts only (TH-15).

### Changed
- README: the transcript table re-measured on 28,545 results, and a new section with the
  repetition numbers, dated. TH-16 earned its place at 3.8%; TH-17 and TH-18 are dropped
  at 0.4%, by the rule the milestone set before the measurement (TH-15, TH-17, TH-18).

## [0.1.0] — 2026-09-23

First published version. The hook is the one measured on transcripts; the live week
(TH-10) is still open, so the default cap is a reasoned choice and the README says so.

### Added
- Published to npm as `trimhook`, and installable as a Claude Code plugin from this
  repository's marketplace (TH-11).
- v0.3.0 milestone in the backlog — the repetition the head-and-tail cut still pays for
  in full: runs of near-identical lines, and the same result twice in a session
  (TH-15 … TH-18).

### Fixed
- The Pages site wore hookgate's wordmark: the header now reads `trimhook`. The inline
  logo no longer carries its width and height twice, and the page title no longer repeats
  the tagline the README's H1 already has (TH-8).
- The release notes told the reader to set `TYPESAFE_API_KEY`, which belongs to a
  different plugin: trimhook consults no model and needs no key (TH-7).

## [0.0.1] — 2026-09-23

Not published: the scaffold and the first working hook, measured on transcripts, before
the QRSPI design run.

### Added
- The `PostToolUse` hook on `Bash`: head and tail of a result over the cap, one marker
  line, the whole output spilled to a 0600 file under the plugin data directory, pruned
  after seven days; `updatedToolOutput` on Claude Code, `decision: block` on Codex behind
  `codex.replace` (TH-2, TH-3).
- Config with a trust order and validation; `perCommand` caps; `audit` mode (TH-4).
- `trimhook doctor` (harness by signal, data dir, config, the harness's own cap) and
  `trimhook report` (sizes saved, by command) (TH-5).
- `evals/local.mjs`: the transcript benchmark and its cap sweep; the README table is its
  2026-09-23 run (TH-6).
- Manifests for both harnesses, `check`, CI on Node 18/20/22/24, release by tag over
  OIDC, Pages site from the README, BACKLOG.md with the one-way issue sync (TH-7, TH-8).
