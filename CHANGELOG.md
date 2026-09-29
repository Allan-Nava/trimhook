# Changelog

All notable changes to trimhook. The format is [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [SemVer](https://semver.org/). Items reference their `TH-n` backlog id.

## [Unreleased]

### Added
- Failures leave a record. A thrown error is logged as `outcome: "kept"` with
  `error: <code>` — the error's code or name, never its message — and the stderr line
  stays; `trimhook report` counts `spillRead`, `spillFailed` and `error`, and `doctor`
  warns when the log holds a failed spill or an error, so an install that saves nothing
  says so (TH-1, D7).
- A social preview card: `assets/social-preview.html` rendered to
  `assets/social-preview.png` by `npm run build:social`, headless Chrome and no new
  dependency. `site/build.mjs` had named that file in `og:image` since before it existed,
  so every link to the site unfurled blank; `check` now fails if it goes missing again.
  The declared `og:image` dimensions now match the file, 2560×1280 (TH-14).
- `evals/reads.mjs`: what the model did after a cut — read the spill the marker named, or
  run the same command again. The cost side of the cap, which `report` cannot see and
  TH-10 needs. `MARKER_RE` is exported from `trim.mjs` so the scan and the marker cannot
  drift apart (TH-22).
- `evals/middles.mjs`: does the cut hide the line that says what went wrong? On 287 real
  cuts, almost never — and TH-13 is dropped on the answer rather than built (TH-13).
- The cut applies to `Read` and `WebFetch` as well as `Bash`, with the `tools` config key
  to narrow it. Both shapes were read off real transcripts: Read's `file.content` is cut
  with `numLines` and `totalLines` left describing the file, WebFetch's `result` is cut
  beside the status and timing, and every other field is carried through untouched. Worth
  1.38 M characters against Bash's 1.93 M on the local corpus. The matcher in both hook
  manifests is now `Bash|Read|WebFetch` (TH-12).
- `trimhook report` breaks its saving down by tool, and the log record carries the tool
  name — the place a replacement the harness silently refused would show up. Verified
  live on 2026-09-24: Claude Code accepts the replacement for `Read` as well as `Bash`
  (TH-12, TH-20).

### Fixed
- The spill file is written only when the cut is taken. It used to be written before
  the decision, so every result of a listed tool left a whole copy on disk for
  `spillTtlDays` — on one install, 2,551 files for 47 cuts. The same reorder restores
  rule 3: a spill that cannot be written now leaves the result whole instead of cutting
  it with no pointer (TH-24).
- **The audit log could record a secret.** `commandPrefix` reduced a command to its first
  word, but a leading assignment makes the first word a value: a command like
  `AWS_SECRET_ACCESS_KEY=… npm run deploy` wrote the key into `results.jsonl`, and
  `S=/private/tmp/…; echo` wrote a filesystem path. Leading assignments are now skipped
  as `cd` hops already were, a program is reduced to its own name rather than its path,
  and both words are capped. Present since 0.0.1; delete `~/.trimhook/results.jsonl` if
  you have run commands with inline credentials (TH-23).
- The log had two homes and the wrong one won. `dataDir()` preferred `CLAUDE_PLUGIN_DATA`,
  which the harness sets only for the hook process, so under a plugin install the hook
  wrote where `trimhook report` could not read: the log was invisible to the single
  command that exists to read it. It is now `TRIMHOOK_DATA` or `~/.trimhook` (TH-21).
- `evals/local.mjs` counts every tool's result mass, not only Bash's (TH-12).
- `evals/sample-runs.mjs`: a seeded, bounded sample of the runs a masked collapse folds,
  for a human to classify. The verdict on this corpus — 38 of 40 runs are content, not
  noise — is in the README, and `collapse.strict: false` is documented as a setting for
  known machine chatter rather than a default in waiting (TH-19).
- Runs of identical lines are collapsed to their first line and a count before the cut,
  so the budget buys distinct content: `bin/lib/collapse.mjs`, pure and unit-tested, with
  `collapse: { enabled, minRun, strict }` in the config. On and strict by default — only
  byte-identical lines, which cannot lose information, worth 0.2% of what the model
  reads. The masked comparison is worth 2.6% and is opt-in pending TH-19. A collapsed run
  is recoverable from the spill like any elided middle (TH-16).
- `evals/local.mjs` measures repetition as well as size: characters inside runs of
  near-identical lines, and results byte-identical to an earlier result in the same
  session. Both counted inside the head and tail the cut keeps, so the number is the
  marginal one. The text is read, measured and dropped in-process — the report and
  `evals/results/` hold counts only (TH-15).

### Changed
- **Breaking for repository config files.** A repository's `.trimhook.json` (or
  `.claude/` and `.codex/trimhook.json`, or the file `TRIMHOOK_CONFIG` names) may no
  longer set `mode`, `spill`, `spillTtlDays` or `codex.replace` — all accepted in 0.1.0 —
  nor `collapse.strict`; `collapse.enabled`, `collapse.minRun` and `tools` may only narrow
  the user's value; `cap`, `perCommand`, `minSaving` and `head` still move either way. A
  refused key keeps the value from `~/.trimhook.json` or the default, and `doctor` prints
  a `BAD` line: "`<path>: <key> may only be set in ~/.trimhook.json or the environment`"
  (TH-1, D4).
- An interrupted Bash result (`interrupted: true`) falls through untouched, and the README
  says what happens to a failing call: on Claude Code it fires `PostToolUseFailure`, which
  carries no output, so trimhook never sees it; on Codex a failing command is trimmed by
  size like any other. The README no longer says trimhook does nothing "on any error" — it
  never saw the error (TH-1, D2).
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
