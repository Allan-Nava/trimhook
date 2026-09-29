// `trimhook report`: what the hook saved, from sizes alone.
import { readRecords } from './store.mjs'
import { DEFAULTS } from './config.mjs'
import { trimResult } from './trim.mjs'

export function summarize(records) {
  const s = { results: 0, trimmed: 0, wouldTrim: 0, unconfirmed: 0, before: 0, after: 0, saved: 0, wouldSave: 0, byCommand: {}, byTool: {}, flags: { spillRead: 0, spillFailed: 0, error: 0, instructions: 0, holdout: 0 } }
  for (const r of records) {
    s.results += 1
    s.before += r.before ?? 0
    s.after += r.after ?? r.before ?? 0
    if (r.outcome === 'trimmed') s.trimmed += 1
    if (r.outcome === 'would-trim') s.wouldTrim += 1
    if (r.outcome === 'unconfirmed') s.unconfirmed += 1
    if (r.spillRead === true) s.flags.spillRead += 1
    if (r.instructions === true) s.flags.instructions += 1
    if (r.holdout === true) s.flags.holdout += 1
    if (r.spillFailed === true) s.flags.spillFailed += 1
    if (typeof r.error === 'string' && r.error) s.flags.error += 1
    if (r.outcome !== 'kept') {
      const saved = (r.before ?? 0) - (r.after ?? 0)
      // TH-34: only a cut the model received is saved; audit, Codex without replace and
      // an unconfirmed Codex shape are what the cut would have saved.
      if (r.outcome === 'trimmed') s.saved += saved
      else s.wouldSave += saved
      const c = (s.byCommand[r.command ?? '?'] ??= { n: 0, saved: 0 })
      c.n += 1
      c.saved += saved
      // By tool as well as by command, so a saving claimed for Read or WebFetch can be
      // told apart from Bash's — the first thing to look at if a replacement turns out
      // not to be accepted (TH-20).
      const t = (s.byTool[r.tool ?? 'Bash'] ??= { n: 0, saved: 0 })
      t.n += 1
      t.saved += saved
    }
  }
  return s
}

// D3, TH-10: the logged week's saving at another cap. Sizes only, as evals/local.mjs
// sweeps: a synthetic body of each logged size stands in for the text, the logged
// collapse is replayed, one cap applies to every result (perCommand ignored — the
// question is what a default of `cap` would have done). Not an input to the D3 rule,
// which votes on re-reads (evals/reads.mjs); this is the saving side.
const SWEEP_SPILL = '/data/spill/s/t.txt' // the sweep's placeholder: same marker length
export function recompute(records, cap, { minSaving = DEFAULTS.minSaving, head = DEFAULTS.head } = {}) {
  const r = { cap, minSaving, results: 0, cut: 0, collapseOnly: 0, before: 0, after: 0, saved: 0, byTool: {}, noSize: 0, spillReads: 0, approximate: 0 }
  for (const rec of records) {
    // S6's error records carry no size: nothing to recompute, so they are counted apart.
    if (typeof rec.before !== 'number' || !Number.isFinite(rec.before)) { r.noSize += 1; continue }
    r.results += 1
    r.before += rec.before
    const B = rec.before
    let a = B
    // D9: a spill read comes back whole at any cap.
    if (rec.spillRead === true) { r.spillReads += 1; r.after += B; continue }
    if (B > cap) {
      // The collapse does not depend on the cap, only whether it runs; a record that never
      // logged one (a kept result) is treated as uncollapsed and flagged.
      const known = typeof rec.collapsed === 'number'
      if (!known) r.approximate += 1
      const C = known ? rec.collapsed : 0
      const P = B - C
      const t = trimResult({ stdout: 'x'.repeat(P), stderr: '' }, { cap, head, minSaving }, SWEEP_SPILL)
      if (t) { a = t.after; r.cut += 1 } else if (C && B - P >= minSaving) { a = P; r.collapseOnly += 1 }
    }
    r.after += a
    if (a < B) {
      const e = (r.byTool[rec.tool ?? 'Bash'] ??= { n: 0, saved: 0 })
      e.n += 1
      e.saved += B - a
    }
  }
  r.saved = r.before - r.after
  return r
}

const k = (n) => n.toLocaleString('en-US')
// D7, D9: why a result was left whole, when there is a reason worth counting.
const flagLine = (f = {}) => { const parts = ['spillRead', 'instructions', 'holdout', 'spillFailed', 'error'].filter((n) => f[n]).map((n) => `${n} ${k(f[n])}`); return parts.length ? `flags on kept results: ${parts.join(' · ')}` : '' }
export function render(s) {
  if (!s.results) return 'no results logged yet'
  const top = Object.entries(s.byCommand).sort((a, b) => b[1].saved - a[1].saved).slice(0, 8)
  const tools = Object.entries(s.byTool ?? {}).sort((a, b) => b[1].saved - a[1].saved)
  return [
    `## trimhook — ${k(s.results)} tool results`,
    `trimmed ${k(s.trimmed)} · would trim (audit or Codex without replace) ${k(s.wouldTrim)}${s.unconfirmed ? ` · unconfirmed (a Codex reply not known to apply) ${k(s.unconfirmed)}` : ''} · kept ${k(s.results - s.trimmed - s.wouldTrim - s.unconfirmed)}`,
    `characters: ${k(s.before)} before · saved ${k(s.saved)} (≈ ${k(Math.round(s.saved / 4))} tokens at four characters each)${s.wouldSave ? ` · would save ${k(s.wouldSave)} more, not applied` : ''}`,
    flagLine(s.flags),
    tools.length > 1 ? `by tool: ${tools.map(([t, v]) => `${t} ${k(v.saved)} (${v.n})`).join(' · ')}` : '',
    top.length ? `top commands by characters cut (applied or not): ${top.map(([c, v]) => `\`${c}\` ${k(v.saved)} (${v.n})`).join(' · ')}` : '',
  ].filter(Boolean).join('\n')
}


export function renderAt(r) {
  const tools = Object.entries(r.byTool).sort((a, b) => b[1].saved - a[1].saved)
  return [
    `## at cap ${k(r.cap)} — the logged sizes recomputed (TH-10)`,
    `cut ${k(r.cut)} of ${k(r.results)} results${r.collapseOnly ? ` · collapsed only ${k(r.collapseOnly)}` : ''} · characters: ${k(r.before)} before → ${k(r.after)} after · saved ${k(r.saved)} (≈ ${k(Math.round(r.saved / 4))} tokens at four characters each)`,
    tools.length ? `by tool: ${tools.map(([t, v]) => `${t} ${k(v.saved)} (${k(v.n)})`).join(' · ')}` : '',
    r.noSize ? `left out, no size (error records): ${k(r.noSize)}` : '',
    r.spillReads ? `spill reads, never cut (D9): ${k(r.spillReads)}` : '',
    r.approximate ? `approximate, collapse not logged: ${k(r.approximate)}` : '',
    `method: one cap for every result (perCommand ignored), minSaving ${k(r.minSaving)}, each result a synthetic body of its logged size less its logged collapse — the sweep evals/local.mjs runs`,
  ].filter(Boolean).join('\n')
}

// Without a cap, exactly the plain report; with one, the recomputation appended.
export const report = (dir, { cap } = {}) => {
  const records = readRecords(dir)
  const base = render(summarize(records))
  return cap === undefined || !records.length ? base : `${base}\n\n${renderAt(recompute(records, cap))}`
}
