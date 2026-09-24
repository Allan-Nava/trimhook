// The one handler: read the result, decide, spill, replace, log — and on any error,
// print nothing, so the model sees exactly what it would have seen without trimhook.
import { collapseRuns } from './collapse.mjs'
import { capFor, loadConfig } from './config.mjs'
import { dataDir, detectHarness, readResponse, replacementOutput } from './harness.mjs'
import { appendRecord, pruneSpill, spill } from './store.mjs'
import { trimResult } from './trim.mjs'

export async function postToolUse(input, deps = {}) {
  deps = { env: process.env, now: Date.now, ...deps }
  const { cfg } = loadConfig(input.cwd ?? process.cwd(), deps.env)
  const harness = detectHarness(deps.env, input)
  const dir = dataDir(deps.env)
  if (!cfg.tools.includes(input.tool_name)) return null
  const res = readResponse(input.tool_response)
  if (!res) return null
  // Only Bash has a command; for the others the tool's own name is what the log and the
  // per-command caps key on, so `perCommand: { "Read": 20000 }` works the same way.
  const command = input.tool_name === 'Bash' ? (input.tool_input?.command ?? '') : input.tool_name
  const cap = capFor(cfg, command)
  const path = cfg.spill && cfg.mode === 'trim' ? spill(dir, input.session_id, input.tool_use_id, res.stdout, res.stderr) : null
  const before = res.stdout.length + res.stderr.length
  // TH-16, and it runs first on purpose: the cut should spend its budget on distinct
  // content, not on the same line again. The spill above is written from the original,
  // so what a run loses here is recoverable exactly as an elided middle is.
  const col = cfg.collapse.enabled && before > cap ? { out: collapseRuns(res.stdout, cfg.collapse), err: collapseRuns(res.stderr, cfg.collapse) } : null
  const collapsed = col ? col.out.collapsed + col.err.collapsed : 0
  const body = collapsed ? { stdout: col.out.text, stderr: col.err.text } : res
  const t = trimResult(body, { cap, head: cfg.head, minSaving: cfg.minSaving }, path)
  const record = { at: new Date(deps.now()).toISOString(), session: input.session_id ?? null, harness, mode: cfg.mode, tool: input.tool_name, command: commandPrefix(command), before, cap }
  // Collapsing alone can bring a result under the cap, and then there is nothing left to
  // elide — but there is still a shorter result to hand back.
  const after = t ? t.after : body.stdout.length + body.stderr.length
  if (!t && !(collapsed && before - after >= cfg.minSaving)) {
    appendRecord(dir, { ...record, outcome: 'kept', after: record.before })
    return null
  }
  if (Math.random() < 0.05) pruneSpill(dir, cfg.spillTtlDays * 86400000, deps.now())
  const replaced = cfg.mode === 'trim' && (harness !== 'codex' || cfg.codex.replace)
  const elided = t ? t.elided : 0
  appendRecord(dir, { ...record, outcome: replaced ? 'trimmed' : 'would-trim', after, elided, collapsed, spill: path })
  if (!replaced) return null
  const removed = [elided && `${elided.toLocaleString('en-US')} characters elided`, collapsed && `${collapsed.toLocaleString('en-US')} in repeated lines`].filter(Boolean).join(', ')
  const note = `trimhook: ${removed} from this result${path ? `; the whole output is at ${path}` : ''}.`
  return replacementOutput(harness, res, t ? t.stdout : body.stdout, t ? t.stderr : body.stderr, note)
}

// For the log: the command's first word, or first two when the first takes a
// subcommand — never the whole command, which can carry anything.
//
// "Anything" is not hypothetical. A leading assignment makes the first word the value:
// `AWS_SECRET_ACCESS_KEY=wJalrXUt npm run deploy` logged its key, and
// `S=/private/tmp/…; echo` logged a path (found 2026-09-24 by evals/reads.mjs, which
// prints these prefixes in a table). So leading assignments are skipped exactly as `cd`
// hops are, an absolute path is reduced to the program's own name, and what is left is
// capped — a token that long is not a command name anyway.
const LEADING = /^(?:(?:cd\s+\S+|[A-Za-z_][A-Za-z0-9_]*=\S*)\s*(?:&&|;|\n)?\s*)+/
const MAX = 32

export function commandPrefix(command) {
  const words = String(command ?? '')
    .trim()
    .replace(LEADING, '')
    .split(/\s+/)
  // Everything was assignments: say so rather than logging a value.
  const head = words[0] ?? ''
  if (!head) return '(env)'
  const name = (w) => ((w.split('/').pop() || w).slice(0, MAX))
  const first = name(head)
  const sub = ['git', 'npm', 'npx', 'pnpm', 'yarn', 'docker', 'kubectl', 'gh', 'cargo', 'go', 'make', 'python', 'python3', 'node', 'pip']
  // The subcommand gets the same treatment: `python3 /home/me/private/report.py` is a
  // path in the log as surely as the interpreter was.
  return sub.includes(first) && words[1] && !words[1].startsWith('-') ? `${first} ${name(words[1])}` : first
}
