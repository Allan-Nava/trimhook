# Changelog

All notable changes to trimhook. The format is [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/). Items reference their `TH-n` backlog id.

## [Unreleased]

### Fixed
- The Pages site wore hookgate's wordmark: the header now reads `trimhook`. The inline
  logo no longer carries its width and height twice, and the page title no longer repeats
  the tagline the README's H1 already has (TH-8).

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
