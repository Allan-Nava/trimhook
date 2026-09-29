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
| S1 | ⬜ todo | — | — | spill-read exemption, closes TH-26 |
| S2 | ✅ done | S2 | `04eb280` (#36) | `interrupted: true` falls through; README "What a failure does."; no deviation |
| S3 | ⬜ todo | — | — | |
| S4 | ⬜ todo | — | — | |
| S5 | ✅ done | S5 | this PR | `evals/codex-live.md`: protocol, pass rule, empty Runs table, pending verdict; no deviation |
| S6 | 🔄 in progress | S6 | — | |
| S7 | 🔄 in progress | S7 | — | breaking for repository config files (0.2.0) |
| S8 | ⏸️ blocked | — | — | waits on S2, S5, S6, S7 |
| S9 | ⏸️ blocked | — | — | waits on S4, S6 |
| S10 | ⏸️ blocked | — | — | waits on S3, S9 |
| S11 | ⏸️ blocked | — | — | waits on S6, S8, S10 |
| S12 | ⏸️ blocked | — | — | TH-9 live Codex run; waits on S5, S8 |
| S13 | ⏸️ blocked | — | — | waits on S12 |
| S14 | ⏸️ blocked | — | — | TH-10 live week; waits on S1, S4, S6, S7, S9 |
| S15 | ⏸️ blocked | — | — | waits on S14 |

Legend: ⬜ todo · 🔄 in progress · ✅ done · ⏸️ blocked · ❌ failed

Order chosen by the maintainer on 2026-09-29: TH-9 first — S2, S5, S6, S7 in
parallel, then S8, then S12 and S13 — and the rest after.

---

## Where I left off

**Current step:** S2, S5, S6, S7 (parallel sessions, one worktree each).

**Next concrete action:** merge the four branches one at a time; then S8.

---

## Discoveries

---

## Deviations

