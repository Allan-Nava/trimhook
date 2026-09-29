# 99 · Progress — TH-1 Tool output trimmed at the source

> Shared state across Implement sessions (backlog item TH-27). **Update it before
> closing every session.** Self-contained: explicit paths, no reference to session
> context. The plan is `thoughts/TH-1-output-hygiene/04-plan.md`; one fresh session per
> step, each on its own branch `th-27-sN`, merged to `main` one at a time with a rebase
> in between. The orchestrating session keeps this file; step sessions do not edit it.

---

## Step status

| Step | Status | Session | Commit | Note |
|---|---|---|---|---|
| S1 | ✅ done | S1 | `71059d6` (#41) | `readsSpill()` in `store.mjs`; a Read under `<data>/spill/` or a Bash command naming a spill path comes back whole, logged `spillRead`; TH-26 closed; no deviation |
| S2 | ✅ done | S2 | `04eb280` (#36) | `interrupted: true` falls through; README "What a failure does."; no deviation |
| S3 | ✅ done | S3 | `322e98d` (#43) | `check` greps the workflows for `hookgate` / `HG-`; strays fixed; no deviation |
| S4 | ✅ done | S4 | this PR | `evals/reads.mjs` per tool and harness, D3 verdict line; `test/reads.test.mjs`; first real run: 64 cuts, 10.9% read back, 0 re-runs — pre-week only |
| S5 | ✅ done | S5 | `9d4f041` (#37) | `evals/codex-live.md`: protocol, pass rule, empty Runs table, pending verdict; no deviation |
| S6 | ✅ done | S6 | `d74ad80` (#38) | thrown errors logged `kept` + `error` (code or name only); `report` and `doctor` count flags; no deviation |
| S7 | ✅ done | S7 | `5bc7bb9` (#39) | `REPO_CLASS`: either / narrow / denied per key; breaking for repository files (0.2.0); CHANGELOG conflict with S2 resolved by keeping both, breaking entry first |
| S8 | ✅ done | S8 | `49b1eaa` (#40) | Codex replies `{continue: false, stopReason}` by default, `block` behind `codex.mode`; anonymised fixture; see Discoveries |
| S9 | ⬜ todo | — | — | unblocked: S4, S6 merged |
| S10 | ⏸️ blocked | — | — | waits on S3, S9 |
| S11 | ⏸️ blocked | — | — | waits on S6, S8, S10 |
| S12 | ✅ done | orchestrator | `0975840` (#42) | TH-9 fail — `evals/codex-live.md` |
| S13 | ✅ done | S13 | `1b9d8ec` (#44) | fail branch: default stays off; README/CLAUDE.md/CHANGELOG say what 0.155.1 did; TH-9 ticked; see Deviations |
| S14 | ⏸️ blocked | — | — | TH-10 live week; waits on S1, S4, S6, S7, S9 |
| S15 | ⏸️ blocked | — | — | waits on S14 |

Legend: ⬜ todo · 🔄 in progress · ✅ done · ⏸️ blocked · ❌ failed

Order chosen by the maintainer on 2026-09-29: TH-9 first — S2, S5, S6, S7 in
parallel, then S8, then S12 and S13 — and the rest after.

---

## Where I left off

**Current step:** S9

**Next concrete action:** run S9 (report --cap N, the written cap rule) in a fresh session; then S10, S11

---

## Verifications run

| What | Step, date | Result |
|---|---|---|
| TH-9 protocol, evals/codex-live.md ## Runs | S12, 2026-09-29 | fail — Codex 0.155.1, 3 continue + 3 block runs, 0 discarded; verdict line in evals/codex-live.md. Run by the orchestrating Claude session at the maintainer's request ("completa prima le th 9"), following the protocol step by step; the six `codex exec` runs were real and the facts were read off the session logs and stderr. |

---

## Discoveries

- **S12, 2026-09-29 — `continue: false` does not replace a PostToolUse result on Codex
  0.155.1.** Codex reads it (stderr: `hook: PostToolUse Stopped`), but the model receives
  the original output whole and the turn continues, so D5's candidate shape is inert, not
  harmful. `block` replaces the text, marker included, and labels it "Script failed" /
  "Script error"; the model still quoted head and tail in 3 of 3. `codex.replace` stays
  off by default, so no user was ever affected.

- **S8, 2026-09-29 — the plan's privacy grep matches its own fixture.** The staged-diff
  grep (`/Users/|/home/|/var/folders/|/tmp/|rollout-|<uuid shape>`) matches four lines of
  `test/fixtures/codex-post-tool-use.json`: `session_id`, `turn_id`, `transcript_path`,
  `cwd`. They are the neutral placeholders the plan prescribes (`/home/user`, all-zero
  UUIDs), so the commit stands. A transcription slip in `04-plan.md`, not an upstream
  error: the grep is meant for the human steps' records (S12, S14); later steps run it
  with `':!test/fixtures/'` as a pathspec.

---

## Deviations

- **S13, 2026-09-29 — the fail branch assumed a different failure.** Plan said: keep the
  default off, and "`codex.mode: continue` is the shape an opt-in gets". Reality: on
  0.155.1 `continue: false` replaces nothing, so an opt-in on the default mode gets no
  cut at all and `block` is the only shape that replaces, behind an error prefix. The
  README and CHANGELOG say that instead. Artifact: `04-plan.md`, S13 Branch FAIL — its
  wording; the decision (default off) held. Also: quoting the verdict clause verbatim
  after the shape's name doubled a word ("`continue: false` continue 0 of 3"); the
  orchestrator rewrote it as "`continue: false`: 0 of 3", content unchanged. Filed from
  S13's discoveries: TH-34 (the Codex log counts `trimmed` for results the model got
  whole; a stale comment on `DEFAULTS.codex`).

