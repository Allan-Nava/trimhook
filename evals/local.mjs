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
          out.push({ chars: text.length, command: commandPrefix(uses.get(c.tool_use_id)) })
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
        out.push({ chars: text.length, command: '(codex)' })
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
]
console.log(lines.join('\n'))
if (argv.includes('--json')) {
  mkdirSync(join(HERE, 'results'), { recursive: true })
  const f = join(HERE, 'results', `${new Date().toISOString().slice(0, 10)}-local.json`)
  writeFileSync(f, JSON.stringify({ at: new Date().toISOString(), claude: { sessions: claude.sessions, results: claude.results.length }, codex: { sessions: codex.sessions, results: codex.results.length }, table }, null, 2))
  console.log(`\nwritten ${f}`)
}
