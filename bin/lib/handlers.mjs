// The one handler: read the result, decide, spill, replace, log — and on any error,
// print nothing, so the model sees exactly what it would have seen without trimhook.
import { capFor, loadConfig } from './config.mjs'
import { dataDir, detectHarness, readResponse, replacementOutput } from './harness.mjs'
import { appendRecord, pruneSpill, spill } from './store.mjs'
import { trimResult } from './trim.mjs'

export async function postToolUse(input, deps = {}) {
  deps = { env: process.env, now: Date.now, ...deps }
  const { cfg } = loadConfig(input.cwd ?? process.cwd(), deps.env)
  const harness = detectHarness(deps.env, input)
  const dir = dataDir(deps.env)
  if (input.tool_name !== 'Bash') return null
  const res = readResponse(input.tool_response)
  if (!res) return null
  const command = input.tool_input?.command ?? ''
  const cap = capFor(cfg, command)
  const path = cfg.spill && cfg.mode === 'trim' ? spill(dir, input.session_id, input.tool_use_id, res.stdout, res.stderr) : null
  const t = trimResult(res, { cap, head: cfg.head, minSaving: cfg.minSaving }, path)
  const record = { at: new Date(deps.now()).toISOString(), session: input.session_id ?? null, harness, mode: cfg.mode, command: commandPrefix(command), before: res.stdout.length + res.stderr.length, cap }
  if (!t) {
    appendRecord(dir, { ...record, outcome: 'kept', after: record.before })
    return null
  }
  if (Math.random() < 0.05) pruneSpill(dir, cfg.spillTtlDays * 86400000, deps.now())
  const replaced = cfg.mode === 'trim' && (harness !== 'codex' || cfg.codex.replace)
  appendRecord(dir, { ...record, outcome: replaced ? 'trimmed' : 'would-trim', after: t.after, elided: t.elided, spill: path })
  if (!replaced) return null
  const note = `trimhook: ${t.elided.toLocaleString('en-US')} characters of this result were elided${path ? `; the whole output is at ${path}` : ''}.`
  return replacementOutput(harness, res, t.stdout, t.stderr, note)
}

// For the log: the command's first word, or first two when the first takes a
// subcommand — never the whole command, which can carry anything.
export function commandPrefix(command) {
  const words = String(command ?? '').trim().replace(/^(?:cd\s+\S+\s*(?:&&|;|\n)\s*)+/, '').split(/\s+/)
  const first = words[0] ?? ''
  const sub = ['git', 'npm', 'npx', 'pnpm', 'yarn', 'docker', 'kubectl', 'gh', 'cargo', 'go', 'make', 'python', 'python3', 'node', 'pip']
  return sub.includes(first) && words[1] && !words[1].startsWith('-') ? `${first} ${words[1]}` : first
}
