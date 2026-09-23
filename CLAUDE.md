# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this repo is

`trimhook` is a **Claude Code plugin** — and a Codex CLI plugin from the same files —
whose whole product is one `PostToolUse` hook on `Bash`: when a shell result is longer
than a cap, the model gets its head and tail plus one marker line naming a file that
holds the whole output. No model is consulted, nothing leaves the machine, and every
failure path is "print nothing". It is modelled on
[hookgate](https://github.com/Allan-Nava/hookgate) and [qrspi](https://github.com/Allan-Nava/qrspi):
dependency-free, manifests in step, releases by tag, BACKLOG.md as the single source of
truth, the same prose conventions.

`thoughts/TH-1-output-hygiene/00-brief.md` is the task definition; the QRSPI run's
artifacts sit beside it.

## Layout

```
bin/trimhook.mjs       the CLI: check · post-tool-use · doctor · report · print-hooks
bin/lib/               config (defaults → ~/.trimhook.json → TRIMHOOK_CONFIG → repo file → env,
                       validated), harness (detection by the hook's own signals first, both
                       answer shapes), trim (the pure cut: budgets, line-snapped head and tail,
                       the marker), store (sizes-only log, spill files 0600, pruning),
                       handlers (the orchestration), report, doctor
test/                  node:test suites — the cut, both harness shapes, spill, config, doctor,
                       and an end-to-end spawn of the real CLI; `npm test` runs them after `check`
evals/local.mjs        the transcript benchmark: sizes only, cap sweep, top commands;
                       results/ holds dated runs — the README table comes from there
hooks/hooks.json       Claude Code registration, ${CLAUDE_PLUGIN_ROOT} path
codex/hooks.json       the same handler in Codex's single-command form, ${PLUGIN_ROOT} path;
                       `trimhook print-hooks` writes it with absolute paths for a repo
.claude-plugin/        plugin.json + single-plugin marketplace.json (Codex reads it too)
.codex-plugin/         plugin.json for Codex — same version, `check` enforces it
.github/workflows/     ci.yml (check on Node 18/20/22/24, pack), release.yml (tag trimhook--v*:
                       npm over OIDC, GitHub release, close the milestone), release-drift.yml,
                       pages.yml, codeql.yml, backlog-issues.yml (one-way sync)
site/build.mjs         generates site/dist/index.html FROM README.md; adds only the hook
                       inventory read off hooks/hooks.json
assets/                logo.svg (single source for favicon, site, README), logo-mono.svg
BACKLOG.md             single source of truth: stable TH-n ids, `<!-- th: ... -->` metadata
ROADMAP.md             GENERATED from BACKLOG.md — never edit
scripts/backlog.mjs    lint · roadmap · check · stats · issues [--apply]
CHANGELOG.md           Keep a Changelog with TH-n ids; `check` wants [Unreleased] and the version
CONTRIBUTING.md        local loop, benchmark protocol, release runbook
```

## The rules the code encodes

1. **Fail-open, always.** Every path that is not "a clean cut of a text result" prints
   nothing. There is no fail-closed: nothing here protects, it only saves.
2. **The cut is arithmetic.** No model, no heuristics about content. Head, tail, marker,
   line boundaries. `bin/lib/trim.mjs` has no imports and is fully unit-tested.
3. **The middle is always recoverable.** A result is never elided without its whole
   output spilled first; if the spill fails, the result is left alone.
4. **Sizes only in the log.** The audit log never carries output text; the command is
   reduced to its first word or two. The spill files hold the output and are 0600.
5. **Under the harness's ceiling.** Claude Code's `BASH_MAX_OUTPUT_LENGTH` (default
   30,000) cuts first, flat; trimhook works on what survives. `doctor` warns when the
   harness cap is below ours.
6. **Never widen, never change a command.** No `PreToolUse`, no `updatedInput`: a
   rewritten command is what the harness evaluates permission rules against, and that
   would prompt where the user's rules did not.
7. **Every number in the README is measured and dated**, from `evals/local.mjs` or a
   live run, with the caveat that transcripts are post-harness-cut.
8. **Codex replacement stays opt-in until verified live** (`codex.replace`): the
   contract is documented, the behaviour is not yet observed on a real session.

## Facts the code depends on (dated — re-verify before every tag)

**Claude Code hooks** (code.claude.com/docs/en/hooks.md, read 2026-09-23): `PostToolUse`
input carries `tool_name`, `tool_input`, `tool_response`, `tool_use_id`, `session_id`,
`prompt_id` (v2.1.196+), `cwd`; `hookSpecificOutput.updatedToolOutput` "replaces the
tool's output with the provided value before it is sent to Claude" and must match the
tool's output shape — for `Bash`: `{stdout, stderr, interrupted, isImage}`; a value that
does not match the schema is ignored and the original is used. `updatedInput` on
`PreToolUse` makes the harness evaluate permission rules against the rewritten input.
`BASH_MAX_OUTPUT_LENGTH` default 30,000, max 150,000, overridden by `bashOutputMaxChars`.

**Codex CLI hooks** (learn.chatgpt.com/docs/hooks.md, read 2026-09-23): `PostToolUse` runs
after Bash including non-zero exits; input has `turn_id`, `tool_name`, `tool_use_id`,
`tool_input`, `tool_response` ("model-facing output"); `decision: "block"` with `reason`
"replaces the tool result with that feedback, and continues the model from the
hook-provided message"; `continue: false` also replaces the result; `updatedMCPToolOutput`
and `suppressOutput` are "parsed but not supported yet". Plugin-bundled hooks are gone
since 0.155 (repo or user `hooks.json`, trust required); hook processes from a repo-level
file get none of `PLUGIN_ROOT`/`PLUGIN_DATA`/`CODEX_HOME` and inherit `CLAUDECODE`
(measured, hookgate `01-research.md` addendum item 3). `tool_output_token_limit` is
Codex's own output budget.

## Verifying a change

```bash
npm test                      # check + node --test
node evals/local.mjs          # the transcript numbers, no key, no network
node bin/trimhook.mjs doctor
npm run backlog && npm run build:site
```

End to end in Claude Code: install the checkout (`/plugin marketplace add .`,
`/plugin install trimhook@trimhook`), run a command that prints more than 8,000
characters (`seq 1 5000`), and read the result: head, one marker line with a path, tail;
`trimhook report` shows one `trimmed`. Under Codex: `trimhook print-hooks >
.codex/hooks.json` in a scratch repo, `codex.replace: true` in `~/.trimhook.json`, same
command through `codex exec --approve-for-me --dangerously-bypass-hook-trust '…' < /dev/null`.

## Conventions

- BACKLOG.md first: every idea is a `TH-n` item; shipped items say `ver=`. Regenerate
  ROADMAP.md, `check` fails when it is stale.
- CHANGELOG under `[Unreleased]` in the same pull request as the change.
- Prose: British-leaning spelling, em-dashes, no marketing filler, no decorative emoji
  (the status glyphs in `99-progress.md` are the one functional use).
- Zero runtime dependencies, Node 18+, no build step, no `postinstall`.
- Names: the plugin never uses another product's mark in its own name.
