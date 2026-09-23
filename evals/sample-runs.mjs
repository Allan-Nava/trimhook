#!/usr/bin/env node
// TH-19: what does a masked collapse fold that a strict one does not?
//
// `collapse.strict: false` is worth 2.6% of what the model reads against strict's 0.2%
// (TH-15/TH-16, 2026-09-23). The whole difference is runs whose lines are not identical
// — they match only once digits, hex blobs, spacing and colour codes are masked. Some of
// those are a progress bar, where the moving numbers are the noise. Some are a line per
// item, where the moving numbers are the point.
//
// Nothing but a human eye separates the two, so this prints a sample to look at:
//
//   node evals/sample-runs.mjs                 40 runs, seed 1
//   node evals/sample-runs.mjs --n 80 --seed 7
//   node evals/sample-runs.mjs --width 200     more of each line
//
// It reads the same local transcripts as evals/local.mjs and **writes nothing**. Unlike
// every other counter here it puts output text on your screen, which is the only way to
// judge it — so it prints a bounded sample, three lines per run, truncated, and never a
// whole result. The sample is deterministic in the seed: quote the seed and anyone can
// reproduce the same runs and check the verdicts.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { collapseRuns, normaliseLine } from '../bin/lib/collapse.mjs'
import { DEFAULTS } from '../bin/lib/config.mjs'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? Number(argv[i + 1]) : fallback
}
const N = arg('n', 40)
const SEED = arg('seed', 1)
const WIDTH = arg('width', 120)

// Deterministic, so a verdict can be re-checked rather than taken on trust.
function mulberry32(a) {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function* files(root, ext) {
  if (!existsSync(root)) return
  const walk = function* (d, depth) {
    for (const f of readdirSync(d)) {
      const p = join(d, f)
      let st
      try {
        st = statSync(p)
      } catch {
        continue
      }
      if (st.isDirectory() && depth < 4) yield* walk(p, depth + 1)
      else if (f.endsWith(ext)) yield p
    }
  }
  yield* walk(root, 0)
}

// Every run a masked collapse folds and a strict one does not: same normalised form,
// not all the same bytes.
function maskedOnlyRuns(text) {
  const out = []
  const lines = text.split(/\r\n|\r|\n/)
  let i = 0
  while (i < lines.length) {
    const key = normaliseLine(lines[i])
    let j = i + 1
    if (key !== '') while (j < lines.length && normaliseLine(lines[j]) === key) j++
    const run = lines.slice(i, j)
    if (run.length >= DEFAULTS.collapse.minRun && new Set(run).size > 1) {
      // The same two gates the hook applies, or the sample fills with runs nothing would
      // ever fold: a strict pass must leave the run alone, and a masked pass must find
      // the marker worth its place. A three-line run of closing braces fails the second
      // — the marker is longer than the seven characters it would replace — and counting
      // those as folded content would have put the false-positive rate out by a third.
      const body = run.join('\n')
      const masked = collapseRuns(body, { strict: false })
      if (masked.collapsed > 0 && collapseRuns(body, { strict: true }).collapsed === 0) out.push({ key, run, chars: masked.collapsed })
    }
    i = j > i ? j : i + 1
  }
  return out
}

const results = []
for (const file of files(join(homedir(), '.claude', 'projects'), '.jsonl')) {
  let lines
  try {
    lines = readFileSync(file, 'utf8').split('\n')
  } catch {
    continue
  }
  const uses = new Set()
  for (const line of lines) {
    if (!line) continue
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    const msg = e.message
    if (!msg || !Array.isArray(msg.content)) continue
    for (const c of msg.content) {
      if (c.type === 'tool_use' && c.name === 'Bash') uses.add(c.id)
      if (c.type === 'tool_result' && uses.has(c.tool_use_id)) {
        const text = typeof c.content === 'string' ? c.content : Array.isArray(c.content) ? c.content.map((x) => x.text ?? '').join('') : ''
        if (text.length > DEFAULTS.cap) results.push(text)
      }
    }
  }
}

const runs = results.flatMap(maskedOnlyRuns)
const total = runs.reduce((a, r) => a + r.chars, 0)

const rnd = mulberry32(SEED)
const picked = []
const taken = new Set()
while (picked.length < Math.min(N, runs.length)) {
  const i = Math.floor(rnd() * runs.length)
  if (taken.has(i)) continue
  taken.add(i)
  picked.push(runs[i])
}

const cut = (s) => (s.length > WIDTH ? `${s.slice(0, WIDTH)}…` : s)

console.log(`# Runs a masked collapse folds and a strict one does not`)
console.log(``)
console.log(`${runs.length.toLocaleString('en-US')} such runs over ${results.length.toLocaleString('en-US')} results above the cap, ${total.toLocaleString('en-US')} characters at stake.`)
console.log(`Sample of ${picked.length}, seed ${SEED}, ${picked.reduce((a, r) => a + r.chars, 0).toLocaleString('en-US')} characters between them. Three lines each, truncated at ${WIDTH}.`)
console.log(``)
picked.forEach((r, n) => {
  console.log(`## ${n + 1} — ${r.run.length} lines, ${r.chars.toLocaleString('en-US')} characters`)
  for (const l of r.run.slice(0, 3)) console.log(`    ${cut(l)}`)
  if (r.run.length > 3) console.log(`    … and ${r.run.length - 3} more`)
  console.log(``)
})
