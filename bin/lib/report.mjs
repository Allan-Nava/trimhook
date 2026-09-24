// `trimhook report`: what the hook saved, from sizes alone.
import { readRecords } from './store.mjs'

export function summarize(records) {
  const s = { results: 0, trimmed: 0, wouldTrim: 0, before: 0, after: 0, byCommand: {}, byTool: {} }
  for (const r of records) {
    s.results += 1
    s.before += r.before ?? 0
    s.after += r.after ?? r.before ?? 0
    if (r.outcome === 'trimmed') s.trimmed += 1
    if (r.outcome === 'would-trim') s.wouldTrim += 1
    if (r.outcome !== 'kept') {
      const saved = (r.before ?? 0) - (r.after ?? 0)
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
  s.saved = s.before - s.after
  return s
}

const k = (n) => n.toLocaleString('en-US')
export function render(s) {
  if (!s.results) return 'no results logged yet'
  const top = Object.entries(s.byCommand).sort((a, b) => b[1].saved - a[1].saved).slice(0, 8)
  const tools = Object.entries(s.byTool ?? {}).sort((a, b) => b[1].saved - a[1].saved)
  return [
    `## trimhook — ${k(s.results)} tool results`,
    `trimmed ${k(s.trimmed)} · would trim (audit or Codex without replace) ${k(s.wouldTrim)} · kept ${k(s.results - s.trimmed - s.wouldTrim)}`,
    `characters: ${k(s.before)} before → ${k(s.after)} after · saved ${k(s.saved)} (≈ ${k(Math.round(s.saved / 4))} tokens at four characters each)`,
    tools.length > 1 ? `by tool: ${tools.map(([t, v]) => `${t} ${k(v.saved)} (${v.n})`).join(' · ')}` : '',
    top.length ? `top commands by characters saved: ${top.map(([c, v]) => `\`${c}\` ${k(v.saved)} (${v.n})`).join(' · ')}` : '',
  ].filter(Boolean).join('\n')
}

export const report = (dir) => render(summarize(readRecords(dir)))
