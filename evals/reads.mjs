#!/usr/bin/env node
// TH-10's second number: when the cut hides a middle, does the model go and read it?
//
// The saving is easy to count and `trimhook report` counts it. The cost is not: a cut
// only hurts when the model needed the middle, and the one observable sign of that is
// what it does next. Two signs, both in the transcript:
//
//   read     a later `Read` whose file_path is the spill file the marker named
//   re-run   the same command run again after the cut, which is the model paying twice
//            for what it could have read once
//
//   node evals/reads.mjs                 the counts
//   node evals/reads.mjs --window 12     how many later tool uses count as "after"
//   node evals/reads.mjs --json          also write evals/results/<date>-reads.json
//
// Counts only, nothing leaves the machine, nothing is written without --json.
//
// A cut is found by `MARKER_RE`, the same definition `trim.mjs` writes with, so a
// reworded marker cannot leave this scan silently reading zero.
//
// It reads zero until trimhook has been installed and working for a while — that is not
// a bug in the instrument, it is what TH-10 is: a week of real sessions. Run it at the
// end of the week, not before.

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { commandPrefix } from '../bin/lib/handlers.mjs'
import { MARKER_RE } from '../bin/lib/trim.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i >= 0 ? Number(argv[i + 1]) : fallback
}
// "After" has to end somewhere: a command re-run forty turns later is a new intention,
// not a retry. Twelve tool uses is about two exchanges.
const WINDOW = arg('window', 12)

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

// One session, flattened into the order the model saw: every tool use, and every result
// that carried a marker.
function scan(file) {
  const uses = []
  const cuts = []
  let lines
  try {
    lines = readFileSync(file, 'utf8').split('\n')
  } catch {
    return { uses, cuts }
  }
  const command = new Map()
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
      if (c.type === 'tool_use') {
        const cmd = c.name === 'Bash' ? (c.input?.command ?? '') : ''
        command.set(c.id, cmd)
        uses.push({ at: uses.length, name: c.name, cmd, path: c.input?.file_path ?? null })
      }
      if (c.type === 'tool_result') {
        const text = typeof c.content === 'string' ? c.content : Array.isArray(c.content) ? c.content.map((x) => x.text ?? '').join('') : ''
        const m = text.match(MARKER_RE)
        // `at` is the position of the tool use this answered, so "after the cut" means
        // after the call that produced it.
        if (m) cuts.push({ at: uses.length - 1, elided: Number(m[1].replace(/,/g, '')), spill: m[3] ?? null, cmd: command.get(c.tool_use_id) ?? '' })
      }
    }
  }
  return { uses, cuts }
}

let sessions = 0
let cutCount = 0
let elided = 0
let readBack = 0
let readBackLate = 0
let reran = 0
const byCommand = new Map()

for (const file of files(join(homedir(), '.claude', 'projects'), '.jsonl')) {
  const { uses, cuts } = scan(file)
  if (!cuts.length) continue
  sessions++
  for (const cut of cuts) {
    cutCount++
    elided += cut.elided
    const after = uses.slice(cut.at + 1)
    const window = after.slice(0, WINDOW)
    const readsSpill = (u) => u.name === 'Read' && cut.spill && u.path === cut.spill
    const inWindow = window.some(readsSpill)
    const everywhere = after.some(readsSpill)
    if (inWindow) readBack++
    else if (everywhere) readBackLate++
    // A re-run is the same command, byte for byte: a different command that happens to
    // start with the same word is the model moving on, not repeating itself.
    if (cut.cmd && window.some((u) => u.name === 'Bash' && u.cmd === cut.cmd)) reran++
    const key = commandPrefix(cut.cmd) || '(other tool)'
    const b = byCommand.get(key) ?? { cuts: 0, reads: 0, reruns: 0 }
    b.cuts++
    if (inWindow || everywhere) b.reads++
    if (cut.cmd && window.some((u) => u.name === 'Bash' && u.cmd === cut.cmd)) b.reruns++
    byCommand.set(key, b)
  }
}

const k = (n) => n.toLocaleString('en-US')
const pct = (n, d) => `${d ? ((n / d) * 100).toFixed(1) : '0.0'}%`
const top = [...byCommand.entries()].sort((a, b) => b[1].cuts - a[1].cuts).slice(0, 8)

const out = [
  `## What the model did after a cut (TH-10, window ${WINDOW})`,
  '',
  cutCount
    ? `- ${k(cutCount)} cuts across ${k(sessions)} sessions, ${k(elided)} characters elided.`
    : `- No cut found in the local transcripts. Either trimhook has not been running, or it has not had a long result yet — this is the instrument for TH-10, not the week itself.`,
]
if (cutCount) {
  out.push(
    `- Read back within the window: ${k(readBack)} (${pct(readBack, cutCount)}); later than that: ${k(readBackLate)} (${pct(readBackLate, cutCount)}).`,
    `- Same command run again within the window: ${k(reran)} (${pct(reran, cutCount)}).`,
    '',
    '| Command | Cuts | Read the spill | Ran it again |',
    '|---|---:|---:|---:|',
    ...top.map(([c, v]) => `| \`${c}\` | ${k(v.cuts)} | ${k(v.reads)} | ${k(v.reruns)} |`),
    '',
    'A cap that is never read back and never re-run is not costing the model anything and could go lower. One that is read back often is too low, and the characters it saves are being paid for twice.',
  )
}
console.log(out.join('\n'))

if (argv.includes('--json')) {
  mkdirSync(join(HERE, 'results'), { recursive: true })
  const f = join(HERE, 'results', `${new Date().toISOString().slice(0, 10)}-reads.json`)
  writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), window: WINDOW, sessions, cuts: cutCount, elided, readBack, readBackLate, reran, byCommand: Object.fromEntries(byCommand) }, null, 2))
  console.log(`\nwritten ${f}`)
}
