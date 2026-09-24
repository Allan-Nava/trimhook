#!/usr/bin/env node
// TH-13: does the cut hide the part that says what went wrong?
//
// The head-and-tail cut keeps the first lines, which say what ran, and the last, which
// say how it ended. The bet is that a failure announces itself in one of the two. This
// checks the bet rather than trusting it, because TH-19 has already shown once that an
// obviously-right heuristic was wrong on real output.
//
//   node evals/middles.mjs                 counts, at the default cap
//   node evals/middles.mjs --cap 4000      at another cap
//   node evals/middles.mjs --show 12       print a sample of the hidden lines
//
// Counts only, like evals/local.mjs, unless --show is passed: that prints the signal
// lines themselves, truncated, because a rate without examples is not evidence anyone
// can check. It writes nothing either way.
//
// The question is not "does the middle contain a failure" — the middle contains most of
// everything. It is "does a failure appear ONLY in the middle", because a failure the
// head or the tail already shows is one the model reads anyway.

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULTS } from '../bin/lib/config.mjs'
import { MARKER_RE, trimResult } from '../bin/lib/trim.mjs'

const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? Number(argv[i + 1]) : fallback
}
const CAP = arg('cap', DEFAULTS.cap)
const SHOW = arg('show', 0)
const WIDTH = arg('width', 110)

// Narrow on purpose, and each one is a line a build or a test run writes when something
// has gone wrong — not a line that merely mentions an error. `error` alone would match
// every log line about error handling, every grep for the word, this file's own comments.
const SIGNALS = [
  /^\s*(?:FAIL|FAILED|FAILURE)\b/,
  /^\s*(?:Error|error):\s/,
  /^\s*✖|^\s*✗|^\s*×\s/,
  /^not ok \d+/, // TAP
  /\bAssertionError\b/,
  /\berror TS\d+:/, // tsc
  /^\s*E\s{3}/, // pytest
  /^Traceback \(most recent call last\):/,
  /^\s*panic:/, // go
  /^\s*\w+Error:\s/, // ReferenceError:, TypeError:, …
  /\bSegmentation fault\b/,
  /^\s*\d+ (?:failing|failed)\b/,
]
const isSignal = (line) => SIGNALS.some((re) => re.test(line))

// The risk in a narrow pattern set is not a false positive — those show up in --show and
// can be dismissed. It is a failure the patterns miss entirely. So every count is also
// taken with a deliberately over-wide net, as an upper bound: if the wide net finds no
// more hidden-only cases than the narrow one, the narrow one is not the thing limiting
// the answer.
const LOOSE = /\b(?:fail(?:ed|ure|ing)?|error|errors|exception|traceback|panic|fatal|refused|denied|timed out|timeout)\b/i
const isLoose = (line) => LOOSE.test(line)

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
        if (text.length > CAP) results.push(text)
      }
    }
  }
}

const cfg = { cap: CAP, head: DEFAULTS.head, minSaving: DEFAULTS.minSaving }
// The marker's one definition lives beside the code that writes it (TH-22).

let cut = 0
let withSignal = 0
let signalSurvives = 0
let signalHidden = 0
let signalOnlyHidden = 0
let hiddenLines = 0
let looseWith = 0
let looseOnlyHidden = 0
const examples = []
const looseExamples = []

for (const text of results) {
  const t = trimResult({ stdout: text, stderr: '' }, cfg, '/data/spill/s/t.txt')
  if (!t) continue
  cut++
  const lines = text.split(/\r\n|\r|\n/)
  // What the model is left with, marker removed — the same reconstruction evals/local.mjs
  // uses, so "survives" means "is in the text the model actually reads".
  const kept = t.stdout.replace(MARKER_RE, '')
  const keptLines = new Set(kept.split(/\r\n|\r|\n/))
  const loose = lines.filter(isLoose)
  if (loose.length) {
    looseWith++
    const lh = loose.filter((l) => !keptLines.has(l))
    if (lh.length === loose.length) {
      looseOnlyHidden++
      if (looseExamples.length < SHOW) looseExamples.push(lh.slice(0, 3))
    }
  }
  const all = lines.filter(isSignal)
  if (!all.length) continue
  withSignal++
  const hidden = all.filter((l) => !keptLines.has(l))
  if (hidden.length) {
    signalHidden++
    hiddenLines += hidden.length
    if (hidden.length === all.length) {
      signalOnlyHidden++
      if (examples.length < SHOW) examples.push(hidden.slice(0, 3))
    }
  }
  if (hidden.length < all.length) signalSurvives++
}

const k = (n) => n.toLocaleString('en-US')
const pct = (n, d) => `${d ? ((n / d) * 100).toFixed(1) : '0.0'}%`

console.log(`# Does the cut hide the failure? (TH-13, cap ${k(CAP)})`)
console.log(``)
console.log(`- ${k(results.length)} results over the cap, ${k(cut)} of them actually cut.`)
console.log(`- ${k(withSignal)} of those carry at least one line that announces a failure (${pct(withSignal, cut)}).`)
console.log(`- ${k(signalSurvives)} have at least one such line in the head or the tail the model reads (${pct(signalSurvives, withSignal)} of them).`)
console.log(`- ${k(signalHidden)} have at least one hidden in the elided middle (${pct(signalHidden, withSignal)}), ${k(hiddenLines)} lines in total.`)
console.log(`- **${k(signalOnlyHidden)} have every such line hidden** (${pct(signalOnlyHidden, withSignal)} of results with a signal, ${pct(signalOnlyHidden, cut)} of all cuts). This is the number TH-13 is judged on: the cases where the cut, and not the harness, is what the model has to thank for not seeing the failure.`)
console.log(``)
console.log(`With a deliberately over-wide net — any line mentioning fail, error, exception, traceback, panic, fatal, refused, denied or a timeout — ${k(looseWith)} of the ${k(cut)} cuts match somewhere, and **${k(looseOnlyHidden)}** have every match hidden (${pct(looseOnlyHidden, cut)}). That is the upper bound on what a format-aware cut could rescue, false positives included.`)
if (SHOW && examples.length) {
  console.log(``)
  console.log(`## ${examples.length} of them, first three lines each`)
  console.log(``)
  for (const [n, ex] of examples.entries()) {
    console.log(`### ${n + 1}`)
    for (const l of ex) console.log(`    ${l.length > WIDTH ? `${l.slice(0, WIDTH)}…` : l}`)
    console.log(``)
  }
}
if (SHOW && looseExamples.length) {
  console.log(`## The wide net's hidden-only cases, ${looseExamples.length} of them`)
  console.log(``)
  for (const [n, ex] of looseExamples.entries()) {
    console.log(`### ${n + 1}`)
    for (const l of ex) console.log(`    ${l.length > WIDTH ? `${l.slice(0, WIDTH)}…` : l}`)
    console.log(``)
  }
}
