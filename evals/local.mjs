#!/usr/bin/env node
// Local benchmark: no network, nothing leaves the machine. It reads Claude Code's own
// transcripts under ~/.claude/projects and Codex's sessions under ~/.codex/sessions,
// keeps only sizes, and answers one question: how many characters would trimhook's
// cut have taken out of the tool results the model actually read?
//
//   node evals/local.mjs                 the table for the default cap and a sweep
//   node evals/local.mjs --cap 12000     one cap
//   node evals/local.mjs --json          also write evals/results/<date>-local.json
//
// The transcripts hold what the harness gave the model, i.e. after the harness's own
// flat cut (Claude Code: BASH_MAX_OUTPUT_LENGTH, default 30,000 characters). The saving
// counted here is therefore what trimhook adds on top of that cut, not instead of it.
//
// TH-15 adds a second question to the first: how much of what the model reads is the
// same thing said twice? Two counters, both over the same corpus — runs of
// near-identical lines inside one result, and results byte-identical to an earlier
// result in the same session. They are the gate on TH-16 and TH-17: an idea worth
// under a couple of per cent here is dropped rather than built.
//
// Answering that needs the text, which the size-only counters never did. The rule the
// rest of the repo keeps still holds: the text is read, measured and dropped inside
// this process — every number below, and every field written to results/, is a count.

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULTS } from '../bin/lib/config.mjs'
import { commandPrefix } from '../bin/lib/handlers.mjs'
import { trimResult } from '../bin/lib/trim.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const capArg = argv.indexOf('--cap')
const caps = capArg >= 0 ? [Number(argv[capArg + 1])] : [4000, 8000, 12000, 16000]
const k = (n) => Math.round(n).toLocaleString('en-US')
const pct = (x) => `${Math.round(x * 100)}%`

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

// --- repetition (TH-15) -----------------------------------------------------

// The main cut's own configuration: the repetition numbers are stated at one cap, the
// default, while the table above sweeps. A share of a moving denominator is not a
// number anyone can act on.
const MAIN = { cap: DEFAULTS.cap, head: DEFAULTS.head, minSaving: DEFAULTS.minSaving }

// A line is "the same again" when it differs only in what makes progress output move:
// the numbers, the byte blobs, the spacing between fields, the colour codes. The mask
// is deliberately narrow. A wider one would collapse lines that really do say
// different things, and TH-16 pays for every false positive in content the model then
// never sees.
const normalise = (line) =>
  line
    // eslint-disable-next-line no-control-regex
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/[0-9a-f]{8,}/gi, 'H')
    .replace(/\d+/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()

// Progress output redraws itself with \r, not \n. Both end a line here — a spinner
// that never emits a newline is exactly the case this counter exists for.
const SPLIT = /\r\n|\r|\n/

// What a run-collapsing cut could take out of one text: in every run of two or more
// consecutive lines with the same normalised form, everything after the first. Blank
// runs are counted apart rather than folded in — collapsing them is a more intrusive
// decision, and mixing them into the headline would flatter it.
function runStats(text) {
  let repeated = 0
  let blank = 0
  let runs = 0
  let prev = null
  let len = 0
  for (const line of text.split(SPLIT)) {
    const key = normalise(line)
    if (key === prev) {
      len++
      if (len === 1) runs++
      if (key === '') blank += line.length + 1
      else repeated += line.length + 1
    } else {
      prev = key
      len = 0
    }
  }
  return { repeated, blank, runs }
}

// The head and the tail the model actually reads, marker excluded. Repetition the cut
// already removes needs no removing twice: this is the denominator TH-16 is judged on.
// The marker goes out whole, newlines included: the head ends at a line start and the
// tail begins at one, so removing it reconstructs exactly what the model reads minus
// the marker. Leaving either newline in would invent a blank line at the junction and
// count it as repetition that is not there.
const MARKER = /\n… \[trimhook:[^\]]*\] …\n/
function keptText(text) {
  const t = trimResult({ stdout: text, stderr: '' }, MAIN, '/data/spill/s/t.txt')
  return t ? t.stdout.replace(MARKER, '') : text
}

// One result in, counts out. The text is measured here and referenced nowhere after:
// what survives this function is numbers, a command prefix and a digest.
function measure(text, command, session) {
  const kept = keptText(text)
  const whole = runStats(text)
  const inKept = runStats(kept)
  return {
    chars: text.length,
    kept: kept.length,
    command,
    session,
    hash: createHash('sha256').update(text).digest('hex'),
    repeated: whole.repeated,
    blank: whole.blank,
    runs: whole.runs,
    keptRepeated: inKept.repeated,
    keptBlank: inKept.blank,
  }
}

// A result byte-identical to an earlier one in the same session. `worth` is the subset
// whose kept size still exceeds 200 characters: below that the marker TH-17 would put
// in its place costs about as much as the text it replaces.
function duplicates(results) {
  const seen = new Set()
  let count = 0
  let chars = 0
  let kept = 0
  let worth = 0
  let worthKept = 0
  for (const r of results) {
    if (!r.chars) continue
    const key = `${r.session}\u0000${r.hash}`
    if (seen.has(key)) {
      count++
      chars += r.chars
      kept += r.kept
      if (r.kept > 200) {
        worth++
        worthKept += r.kept
      }
    } else seen.add(key)
  }
  return { count, chars, kept, worth, worthKept }
}

// One Bash result per entry: { chars, command }.
function claudeResults() {
  const out = []
  let sessions = 0
  for (const file of files(join(homedir(), '.claude', 'projects'), '.jsonl')) {
    let lines
    try {
      lines = readFileSync(file, 'utf8').split('\n')
    } catch {
      continue
    }
    const uses = new Map()
    let any = false
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
        if (c.type === 'tool_use' && c.name === 'Bash') uses.set(c.id, c.input?.command ?? '')
        if (c.type === 'tool_result' && uses.has(c.tool_use_id)) {
          const text = typeof c.content === 'string' ? c.content : Array.isArray(c.content) ? c.content.map((x) => x.text ?? '').join('') : ''
          out.push(measure(text, commandPrefix(uses.get(c.tool_use_id)), file))
          any = true
        }
      }
    }
    if (any) sessions++
  }
  return { sessions, results: out }
}

function codexResults() {
  const out = []
  let sessions = 0
  for (const file of files(join(homedir(), '.codex', 'sessions'), '.jsonl')) {
    let lines
    try {
      lines = readFileSync(file, 'utf8').split('\n')
    } catch {
      continue
    }
    let any = false
    for (const line of lines) {
      if (!line) continue
      let e
      try {
        e = JSON.parse(line)
      } catch {
        continue
      }
      const p = e.payload ?? e
      if (p?.type === 'function_call_output' || p?.type === 'custom_tool_call_output') {
        const o = p.output
        const text = typeof o === 'string' ? o : JSON.stringify(o ?? '')
        out.push(measure(text, '(codex)', file))
        any = true
      }
    }
    if (any) sessions++
  }
  return { sessions, results: out }
}

function sweep(results, cap) {
  const cfg = { cap, head: DEFAULTS.head, minSaving: DEFAULTS.minSaving }
  let before = 0
  let after = 0
  let trimmed = 0
  const byCommand = new Map()
  for (const r of results) {
    before += r.chars
    // Sizes only: a synthetic body of the same length stands in for the text.
    const t = r.chars > cap ? trimResult({ stdout: 'x'.repeat(r.chars), stderr: '' }, cfg, '/data/spill/s/t.txt') : null
    const a = t ? t.after : r.chars
    after += a
    if (t) {
      trimmed++
      byCommand.set(r.command, (byCommand.get(r.command) ?? 0) + (r.chars - a))
    }
  }
  const top = [...byCommand.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  return { cap, results: results.length, trimmed, before, after, saved: before - after, savedShare: before ? (before - after) / before : 0, top }
}

const claude = claudeResults()
const codex = codexResults()
const all = [...claude.results, ...codex.results]
const table = caps.map((cap) => sweep(all, cap))
const main = table.find((t) => t.cap === DEFAULTS.cap) ?? table[0]

// --- the repetition report --------------------------------------------------

const dup = duplicates(all)
const rep = all.reduce(
  (a, r) => ({
    chars: a.chars + r.chars,
    kept: a.kept + r.kept,
    repeated: a.repeated + r.repeated,
    blank: a.blank + r.blank,
    runs: a.runs + r.runs,
    keptRepeated: a.keptRepeated + r.keptRepeated,
    keptBlank: a.keptBlank + r.keptBlank,
  }),
  { chars: 0, kept: 0, repeated: 0, blank: 0, runs: 0, keptRepeated: 0, keptBlank: 0 },
)
const share = (n, d) => (d ? n / d : 0)
// The repetition shares live near the bar, where rounding to whole per cent decides
// the answer by itself.
const pct1 = (x) => `${(x * 100).toFixed(1)}%`
// The bar the milestone sets: under this, the item is dropped rather than built.
const BAR = 0.02
const verdict = (x) => (x >= BAR ? `above the ${pct1(BAR)} bar` : `below the ${pct1(BAR)} bar`)

const lines = [
  `## Tool results in local transcripts (sizes only, ${new Date().toISOString().slice(0, 10)})`,
  '',
  `- Claude Code: ${k(claude.sessions)} sessions, ${k(claude.results.length)} Bash results, ${k(claude.results.reduce((a, r) => a + r.chars, 0))} characters.`,
  `- Codex CLI: ${k(codex.sessions)} sessions, ${k(codex.results.length)} tool outputs, ${k(codex.results.reduce((a, r) => a + r.chars, 0))} characters.`,
  `- Over ${k(main.cap)} characters: ${k(main.trimmed)} results (${pct(main.trimmed / Math.max(1, main.results))}), holding ${pct(all.filter((r) => r.chars > main.cap).reduce((a, r) => a + r.chars, 0) / Math.max(1, main.before))} of all result characters.`,
  '',
  '| Cap | Results trimmed | Characters before | After | Saved | Share |',
  '|---:|---:|---:|---:|---:|---:|',
  ...table.map((t) => `| ${k(t.cap)} | ${k(t.trimmed)} | ${k(t.before)} | ${k(t.after)} | ${k(t.saved)} (≈ ${k(t.saved / 4)} tokens) | ${pct(t.savedShare)} |`),
  '',
  `Top commands by characters saved at cap ${k(main.cap)}: ${main.top.map(([c, n]) => `\`${c}\` ${k(n)}`).join(' · ')}.`,
  '',
  `## The same thing twice (TH-15, at cap ${k(MAIN.cap)})`,
  '',
  `- Runs of near-identical lines: ${k(rep.runs)} runs, ${k(rep.repeated)} characters — ${pct1(share(rep.repeated, rep.chars))} of everything the tools printed.`,
  `- Of those, ${k(rep.keptRepeated)} characters survive the cut, inside the head and the tail the model reads: ${pct1(share(rep.keptRepeated, rep.kept))} of what it reads, ${verdict(share(rep.keptRepeated, rep.kept))} — this is the number TH-16 is judged on.`,
  `- Blank runs, counted apart: ${k(rep.blank)} characters, ${k(rep.keptBlank)} of them in the kept region.`,
  `- Results byte-identical to an earlier one in the same session: ${k(dup.count)} results, ${k(dup.chars)} characters, ${k(dup.kept)} after the cut — ${pct1(share(dup.kept, rep.kept))} of what the model reads, ${verdict(share(dup.kept, rep.kept))}.`,
  `- Of those, ${k(dup.worth)} are still over 200 characters once cut (${k(dup.worthKept)} characters): below that a marker costs what the text does — this is the number TH-17 is judged on.`,
]
console.log(lines.join('\n'))
if (argv.includes('--json')) {
  mkdirSync(join(HERE, 'results'), { recursive: true })
  const f = join(HERE, 'results', `${new Date().toISOString().slice(0, 10)}-local.json`)
  writeFileSync(
    f,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        claude: { sessions: claude.sessions, results: claude.results.length },
        codex: { sessions: codex.sessions, results: codex.results.length },
        table,
        repetition: { cap: MAIN.cap, ...rep, duplicates: dup },
      },
      null,
      2,
    ),
  )
  console.log(`\nwritten ${f}`)
}
