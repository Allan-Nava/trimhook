#!/usr/bin/env node
// TH-10's second number: when the cut hides a middle, does the model go and read it?
//
// The saving is easy to count and `trimhook report` counts it. The cost is not: a cut
// only hurts when the model needed the middle, and the one observable sign of that is
// what it does next. Two signs, both in the transcript, counted per tool:
//
//   read     a later `Read` whose file_path is the spill file the marker named, or a
//            Bash command — or a Codex call's input — that contains that path
//   re-run   the same call made again after the cut: the same command for Bash, the same
//            file_path for Read (whatever its offset), the same url for WebFetch, the
//            same input on Codex — the model paying twice for what it could read once
//
// Claude Code transcripts (~/.claude/projects) and Codex sessions (~/.codex/sessions)
// are both walked; on Codex a cut is the marker inside a custom_tool_call_output or a
// function_call_output. The last lines apply TH-10's rule (D3) mechanically; a human
// confirms the verdict before the default cap changes.
//
//   node evals/reads.mjs                 the counts
//   node evals/reads.mjs --window 12     how many later tool uses count as "after"
//   node evals/reads.mjs --holdout 0.1   also the control group (TH-31): with the share the
//                                        week ran with, the long uncut results the hook held
//                                        out, and their re-runs beside the cuts'
//   node evals/reads.mjs --json          also write evals/results/<date>-reads.json
//
// After a cut Read it also counts (TH-28) pages of the same file (a Read with offset or
// limit) and Edits of it that failed — the cost of a middle an Edit needed.
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
import { heldOut } from '../bin/lib/holdout.mjs'
import { readsInstructions } from '../bin/lib/store.mjs'
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
// TH-31: the share the week ran with (`holdout` in ~/.trimhook.json). The hook and this
// scan agree on who was held out by hashing the same id, so the log carries no id.
const HOLDOUT = arg('holdout', 0)
// D3's subset: the cuts 8,000 would also have made — post-collapse size at least the
// 8,000 cap plus the 1,500 minSaving (trim.mjs:56). Fixed on purpose: it names the
// 8,000 rung of the rule, not whatever DEFAULTS.cap is today.
const SUBSET = 8000 + 1500
const FLOOR = 20 // D3: a tool with fewer cuts than this is unmeasured and does not vote
const LIMIT = 0.1 // D3: 10%
const MARKER_G = new RegExp(MARKER_RE.source, 'g')

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

// Use = { at, name, cmd, path, url }   — cmd '' unless Bash/Codex; path, url null unless set
// Cut = { at, tool, elided, size, spill, cmd, path, url }

// One result is one cut, however many markers it carries: a result cut in two places is
// as big as all its markers say, or the subset below would miss the cuts that matter.
function markers(text) {
  let hit = false
  let elided = 0
  let size = 0
  let spill = null
  for (const m of String(text).matchAll(MARKER_G)) {
    hit = true
    elided += Number(m[1].replace(/,/g, ''))
    size += Number(m[2].replace(/,/g, ''))
    if (spill === null && m[3]) spill = m[3]
  }
  return hit ? { elided, size, spill } : null
}

const parsed = (file) => {
  let lines
  try {
    lines = readFileSync(file, 'utf8').split('\n')
  } catch {
    return []
  }
  const out = []
  for (const line of lines) {
    if (!line) continue
    try {
      out.push(JSON.parse(line))
    } catch {
      continue
    }
  }
  return out
}

// One Claude Code session, flattened into the order the model saw: every tool use, and
// every result that carried a marker.
function scanClaude(file) {
  const uses = []
  const cuts = []
  const index = new Map()
  for (const e of parsed(file)) {
    const msg = e?.message
    if (!msg || !Array.isArray(msg.content)) continue
    for (const c of msg.content) {
      if (c?.type === 'tool_use') {
        index.set(c.id, uses.length)
        uses.push({ at: uses.length, id: c.id, name: c.name, cmd: c.name === 'Bash' ? String(c.input?.command ?? '') : '', path: c.input?.file_path ?? null, url: c.input?.url ?? null, paged: c.input?.offset != null || c.input?.limit != null, size: 0, cut: false, error: false })
      }
      if (c?.type === 'tool_result') {
        const text = typeof c.content === 'string' ? c.content : Array.isArray(c.content) ? c.content.map((x) => x?.text ?? '').join('') : ''
        // `at` is the tool use this result answered, found by id: with parallel tool uses
        // the last use is not the one answered, and "after the cut" means after its call.
        const at = index.get(c.tool_use_id) ?? uses.length - 1
        const u = uses[at]
        // TH-31, TH-28: every result's size (the control group is the long uncut ones) and
        // whether it was an error (a failed Edit is the cost of a hidden middle).
        if (u) {
          u.size = text.length
          u.error = c.is_error === true || text.includes('<tool_use_error>')
        }
        const m = markers(text)
        if (!m) continue
        if (u) u.cut = true
        cuts.push({ at, tool: u?.name ?? 'Bash', ...m, cmd: u?.cmd ?? '', path: u?.path ?? null, url: u?.url ?? null })
      }
    }
  }
  return { harness: 'claude', uses, cuts }
}

// A Codex output is an array of input_text parts (0.155.1), or a string — sometimes a
// JSON envelope whose escaped `output` would hide the marker's newlines from MARKER_RE.
const codexText = (o) => {
  if (Array.isArray(o)) return o.map((x) => (typeof x === 'string' ? x : (x?.text ?? ''))).join('\n')
  if (typeof o !== 'string') return ''
  try {
    const j = JSON.parse(o)
    if (j && typeof j === 'object' && typeof j.output === 'string') return j.output
  } catch {
    // not an envelope: the string is the output
  }
  return o
}

// One Codex session. Every call is `Bash`: Codex has been seen to send the hook only
// tool_name "Bash" (TH-1 research, Addendum item 3). A custom and a function call are
// the same thing here — a cut is the marker, not the record type (TH-27 S4, A3).
function scanCodex(file) {
  const uses = []
  const cuts = []
  const index = new Map()
  for (const e of parsed(file)) {
    const p = e?.payload ?? e
    if (!p || typeof p !== 'object') continue
    if (p.type === 'custom_tool_call' || p.type === 'function_call') {
      index.set(p.call_id, uses.length)
      uses.push({ at: uses.length, id: p.call_id, name: 'Bash', cmd: String((p.type === 'custom_tool_call' ? p.input : p.arguments) ?? ''), path: null, url: null, paged: false, size: 0, cut: false, error: false })
    } else if (p.type === 'custom_tool_call_output' || p.type === 'function_call_output') {
      const text = codexText(p.output)
      const at = index.get(p.call_id) ?? uses.length - 1
      if (uses[at]) uses[at].size = text.length
      const m = markers(text)
      if (!m) continue
      if (uses[at]) uses[at].cut = true
      cuts.push({ at, tool: 'Bash', ...m, cmd: uses[at]?.cmd ?? '', path: null, url: null })
    }
  }
  return { harness: 'codex', uses, cuts }
}

// A spill read is a Read of the spill file, or a command that names it (`sed`, `cat`,
// `grep` — the model reaching for a slice rather than the whole file).
const isSpillRead = (u, spill) => !!spill && ((u.name === 'Read' && u.path === spill) || (u.name === 'Bash' && u.cmd.includes(spill)))

// A re-run is the same call, byte for byte, for its own tool: a different command that
// happens to start with the same word is the model moving on, not repeating itself. A
// Read of the same file at another offset is the same call — the model paging through
// what the cut hid.
function isRerun(u, cut) {
  if (u.name !== cut.tool) return false
  if (cut.tool === 'Bash') return cut.cmd !== '' && u.cmd === cut.cmd
  if (cut.tool === 'Read') return cut.path != null && u.path === cut.path
  if (cut.tool === 'WebFetch') return cut.url != null && u.url === cut.url
  return false
}

const ORDER = ['Bash', 'Read', 'WebFetch']
const rank = (t) => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length)
const byOrder = (a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0)

// D3, mechanically: a tool votes once it has FLOOR cuts; the default can go to 4,000 when
// every voting tool re-reads at most LIMIT of its cuts, overall and in the subset; to
// 8,000 when only the subset holds; otherwise 12,000. A cut both read and re-run counts
// twice — the conservative direction.
function verdict(byTool) {
  const rate = (b) => (b.cuts ? (b.reads + b.reruns) / b.cuts : 0)
  const tools = [...new Set([...ORDER, ...byTool.keys()])].sort(byOrder)
  const voting = tools.filter((t) => (byTool.get(t)?.cuts ?? 0) >= FLOOR)
  const unmeasured = tools.filter((t) => !voting.includes(t))
  const votes = voting.map((t) => byTool.get(t))
  let cap = null
  if (voting.length) {
    if (votes.every((b) => rate(b) <= LIMIT && rate(b.subset) <= LIMIT)) cap = 4000
    else if (votes.every((b) => rate(b.subset) <= LIMIT)) cap = 8000
    else cap = 12000
  }
  return { cap, voting, unmeasured }
}

const bucket = () => ({ cuts: 0, reads: 0, reruns: 0 })
const add = (b, read, rerun) => {
  b.cuts++
  if (read) b.reads++
  if (rerun) b.reruns++
}

let sessions = 0
let cutCount = 0
let skipped = 0
let elided = 0
let readBack = 0
let readBackLate = 0
let reran = 0
const byHarness = { claude: 0, codex: 0 }
const subset = bucket()
const byTool = new Map()
const byCommand = new Map()
// TH-28: after a cut Read, the same file paged (offset/limit) and Edits of it that failed.
const afterRead = () => ({ reads: 0, paged: 0, edits: 0, failed: 0 })
const cutReads = afterRead()
const heldReads = afterRead()
const readCost = (b, own, window) => {
  b.reads++
  if (window.some((u) => u.name === 'Read' && u.path === own.path && u.paged)) b.paged++
  const edits = window.filter((u) => (u.name === 'Edit' || u.name === 'MultiEdit') && u.path === own.path)
  b.edits += edits.length
  b.failed += edits.filter((u) => u.error).length
}
// TH-31: the control group, per tool.
let held = 0
let heldRerun = 0
const heldByTool = new Map()

const walks = [
  [join(homedir(), '.claude', 'projects'), scanClaude],
  [join(homedir(), '.codex', 'sessions'), scanCodex],
]
for (const [root, scan] of walks) {
  for (const file of files(root, '.jsonl')) {
    const { harness, uses, cuts } = scan(file)
    let counted = 0
    cuts.forEach((cut, i) => {
      // Before TH-26 a read of a spill file could itself be cut: that is the model reading
      // what the first cut hid, not a new cut, and counting it would count the read twice.
      const own = uses[cut.at]
      if (own && cuts.slice(0, i).some((c) => isSpillRead(own, c.spill))) {
        skipped++
        return
      }
      counted++
      cutCount++
      elided += cut.elided
      byHarness[harness]++
      const after = uses.slice(cut.at + 1)
      const window = after.slice(0, WINDOW)
      const read = window.some((u) => isSpillRead(u, cut.spill))
      const late = !read && after.some((u) => isSpillRead(u, cut.spill))
      const rerun = window.some((u) => isRerun(u, cut))
      if (cut.tool === 'Read' && cut.path) readCost(cutReads, cut, window)
      const sub = cut.size >= SUBSET
      if (read) readBack++
      if (late) readBackLate++
      if (rerun) reran++
      if (sub) add(subset, read, rerun)
      const t = byTool.get(cut.tool) ?? { ...bucket(), subset: bucket() }
      add(t, read, rerun)
      if (sub) add(t.subset, read, rerun)
      byTool.set(cut.tool, t)
      const key = harness === 'codex' ? '(codex)' : cut.tool === 'Bash' ? commandPrefix(cut.cmd) : cut.tool
      const b = byCommand.get(key) ?? bucket()
      add(b, read, rerun)
      byCommand.set(key, b)
    })
    if (counted) sessions++
    // TH-31: a long result that carries no marker and whose id falls in the holdout share
    // is one the hook would have cut and held out. Spill reads (D9) and instruction files
    // (TH-29) are left whole for their own reasons and are not part of it.
    if (HOLDOUT > 0) {
      for (const u of uses) {
        if (u.cut || u.size < SUBSET || !ORDER.includes(u.name) || !heldOut(u.id, HOLDOUT)) continue
        if (u.name === 'Read' && readsInstructions({ tool: 'Read', input: { file_path: u.path } })) continue
        if (cuts.some((c) => isSpillRead(u, c.spill))) continue
        held++
        const window = uses.slice(u.at + 1, u.at + 1 + WINDOW)
        const rerun = window.some((w) => isRerun(w, { tool: u.name, cmd: u.cmd, path: u.path, url: u.url }))
        if (rerun) heldRerun++
        if (u.name === 'Read' && u.path) readCost(heldReads, u, window)
        const t = heldByTool.get(u.name) ?? { held: 0, reruns: 0 }
        t.held++
        if (rerun) t.reruns++
        heldByTool.set(u.name, t)
      }
    }
  }
}

const k = (n) => n.toLocaleString('en-US')
const pct = (n, d) => `${d ? ((n / d) * 100).toFixed(1) : '0.0'}%`
const top = [...byCommand.entries()].sort((a, b) => b[1].cuts - a[1].cuts).slice(0, 8)
const v = verdict(byTool)

const out = [
  `## What the model did after a cut (TH-10, window ${WINDOW})`,
  '',
  cutCount
    ? `- ${k(cutCount)} cuts across ${k(sessions)} sessions (${k(byHarness.claude)} on Claude Code, ${k(byHarness.codex)} on Codex), ${k(elided)} characters elided.`
    : `- No cut found in the local transcripts. Either trimhook has not been running, or it has not had a long result yet — this is the instrument for TH-10, not the week itself.`,
]
if (cutCount) {
  if (skipped) out.push(`- ${k(skipped)} more cuts were themselves reads of a spill (transcripts from before TH-26) and are not counted.`)
  out.push(
    `- Read back within the window: ${k(readBack)} (${pct(readBack, cutCount)}); later than that: ${k(readBackLate)} (${pct(readBackLate, cutCount)}).`,
    `- Same call made again within the window: ${k(reran)} (${pct(reran, cutCount)}).`,
    '',
    '| Tool | Cuts | Read the spill | Ran it again | Re-read rate | Cuts ≥ 9,500 | Re-read rate ≥ 9,500 |',
    '|---|---:|---:|---:|---:|---:|---:|',
    ...[...byTool.keys()].sort(byOrder).map((t) => {
      const b = byTool.get(t)
      return `| ${t} | ${k(b.cuts)} | ${k(b.reads)} | ${k(b.reruns)} | ${pct(b.reads + b.reruns, b.cuts)} | ${k(b.subset.cuts)} | ${pct(b.subset.reads + b.subset.reruns, b.subset.cuts)} |`
    }),
    '',
    v.cap
      ? `- D3 rule, for a week run at cap 4,000: default ${k(v.cap)} (voting: ${v.voting.join(', ')}${v.unmeasured.length ? `; unmeasured, under 20 cuts: ${v.unmeasured.join(', ')}` : ''}). Mechanical — the maintainer confirms it before the default changes.`
      : `- D3 rule: no verdict — no tool has 20 cuts (unmeasured: ${v.unmeasured.join(', ')}).`,
    '',
    '| Command | Cuts | Read the spill | Ran it again |',
    '|---|---:|---:|---:|',
    ...top.map(([c, b]) => `| \`${c}\` | ${k(b.cuts)} | ${k(b.reads)} | ${k(b.reruns)} |`),
    '',
    'A cap that is never read back and never re-run is not costing the model anything and could go lower. One that is read back often is too low, and the characters it saves are being paid for twice.',
  )
}
if (cutReads.reads || heldReads.reads) {
  out.push(
    '',
    `## After a cut Read (TH-28, window ${WINDOW})`,
    '',
    `- Cut Reads: ${k(cutReads.reads)}. Paged the same file (offset or limit) within the window: ${k(cutReads.paged)} (${pct(cutReads.paged, cutReads.reads)}).`,
    `- Edits of that file within the window: ${k(cutReads.edits)}; failed: ${k(cutReads.failed)} (${pct(cutReads.failed, cutReads.edits)} of edits).`,
  )
  if (heldReads.reads) out.push(`- Held-out Reads, for comparison: ${k(heldReads.reads)}; paged ${k(heldReads.paged)} (${pct(heldReads.paged, heldReads.reads)}); edits ${k(heldReads.edits)}, failed ${k(heldReads.failed)} (${pct(heldReads.failed, heldReads.edits)} of edits).`)
  out.push('', 'A cut Read the model pages through, or an Edit that fails on the file it could not see, is what cutting Read costs; TH-28 decides from these whether Read stays in `tools`.')
}
if (HOLDOUT > 0) {
  const plural = (n) => `${k(n)} result${n === 1 ? '' : 's'}`
  out.push(
    '',
    `## The control group (TH-31, holdout ${HOLDOUT})`,
    '',
    `- Held out: ${plural(held)} over 9,500 characters, left whole. Ran again within the window: ${k(heldRerun)} (${pct(heldRerun, held)}).`,
    `- Cut, for comparison: ${k(cutCount)}. Ran again within the window: ${k(reran)} (${pct(reran, cutCount)}).`,
  )
  if (heldByTool.size) {
    out.push('', '| Tool | Held out | Ran again | Cut | Ran again |', '|---|---:|---:|---:|---:|')
    for (const t of [...new Set([...heldByTool.keys(), ...byTool.keys()])].sort(byOrder)) {
      const h = heldByTool.get(t) ?? { held: 0, reruns: 0 }
      const c = byTool.get(t) ?? bucket()
      out.push(`| ${t} | ${k(h.held)} | ${pct(h.reruns, h.held)} | ${k(c.cuts)} | ${pct(c.reruns, c.cuts)} |`)
    }
  }
  out.push('', 'The two groups are the same kind of result, one cut and one not: the difference between their re-run rates is what the cut costs, measured rather than estimated. Held-out results cannot be read back — there is no spill — so only re-runs compare.')
}
console.log(out.join('\n'))

if (argv.includes('--json')) {
  mkdirSync(join(HERE, 'results'), { recursive: true })
  const f = join(HERE, 'results', `${new Date().toISOString().slice(0, 10)}-reads.json`)
  const json = { at: new Date().toISOString(), window: WINDOW, subsetMin: SUBSET, floor: FLOOR, sessions, byHarness, cuts: cutCount, skipped, elided, readBack, readBackLate, reran, subset, byTool: Object.fromEntries(byTool), byCommand: Object.fromEntries(byCommand), verdict: v, afterRead: { cut: cutReads, held: heldReads }, holdout: HOLDOUT ? { share: HOLDOUT, held, heldRerun, byTool: Object.fromEntries(heldByTool) } : null }
  writeFileSync(f, JSON.stringify(json, null, 2))
  console.log(`\nwritten ${f}`)
}
