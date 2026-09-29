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
| S1 | ✅ done | S1 | this PR | `readsSpill()` in `store.mjs`; a Read under `<data>/spill/` or a Bash command naming a spill path comes back whole, logged `spillRead`; TH-26 closed; no deviation |
| S2 | ✅ done | S2 | `04eb280` (#36) | `interrupted: true` falls through; README "What a failure does."; no deviation |
| S3 | ⬜ todo | — | — | |
| S4 | ⬜ todo | — | — | |
| S5 | ✅ done | S5 | `9d4f041` (#37) | `evals/codex-live.md`: protocol, pass rule, empty Runs table, pending verdict; no deviation |
| S6 | ✅ done | S6 | `d74ad80` (#38) | thrown errors logged `kept` + `error` (code or name only); `report` and `doctor` count flags; no deviation |
| S7 | ✅ done | S7 | `5bc7bb9` (#39) | `REPO_CLASS`: either / narrow / denied per key; breaking for repository files (0.2.0); CHANGELOG conflict with S2 resolved by keeping both, breaking entry first |
| S8 | ✅ done | S8 | `49b1eaa` (#40) | Codex replies `{continue: false, stopReason}` by default, `block` behind `codex.mode`; anonymised fixture; see Discoveries |
| S9 | ⏸️ blocked | — | — | waits on S4, S6 |
| S10 | ⏸️ blocked | — | — | waits on S3, S9 |
| S11 | ⏸️ blocked | — | — | waits on S6, S8, S10 |
| S12 | ⬜ todo | — | — | unblocked: S1, S5, S8 merged |
| S13 | ⏸️ blocked | — | — | waits on S12 |
| S14 | ⏸️ blocked | — | — | TH-10 live week; waits on S1, S4, S6, S7, S9 |
| S15 | ⏸️ blocked | — | — | waits on S14 |

Legend: ⬜ todo · 🔄 in progress · ✅ done · ⏸️ blocked · ❌ failed

Order chosen by the maintainer on 2026-09-29: TH-9 first — S2, S5, S6, S7 in
parallel, then S8, then S12 and S13 — and the rest after.

---

## Where I left off

**Current step:** S12

**Next concrete action:** run the live Codex protocol in `evals/codex-live.md` from a checkout of main on branch `th-9-live-run`

---

## Discoveries

- **S8, 2026-09-29 — the plan's privacy grep matches its own fixture.** The staged-diff
  grep (`/Users/|/home/|/var/folders/|/tmp/|rollout-|<uuid shape>`) matches four lines of
  `test/fixtures/codex-post-tool-use.json`: `session_id`, `turn_id`, `transcript_path`,
  `cwd`. They are the neutral placeholders the plan prescribes (`/home/user`, all-zero
  UUIDs), so the commit stands. A transcription slip in `04-plan.md`, not an upstream
  error: the grep is meant for the human steps' records (S12, S14); later steps run it
  with `':!test/fixtures/'` as a pathspec.

---

## Deviations

