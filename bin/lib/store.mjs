// Everything the plugin keeps lives under the harness's plugin data directory: the
// audit log (one JSON line per result, sizes only — never the output) and the spill
// files, which do hold the output the model did not see. Every write is best-effort:
// a full disk must never change what the model reads.
import { appendFileSync, chmodSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { basename, dirname, join, resolve, sep } from 'node:path'

const safe = (fn) => {
  try {
    return fn()
  } catch {
    return undefined
  }
}

export const LOG_MAX = 8 * 1024 * 1024

export function appendRecord(dir, record) {
  safe(() => {
    mkdirSync(dir, { recursive: true })
    const p = join(dir, 'results.jsonl')
    const size = safe(() => statSync(p).size) ?? 0
    if (size > LOG_MAX) renameSync(p, join(dir, 'results.1.jsonl'))
    appendFileSync(p, `${JSON.stringify(record)}\n`)
  })
}

export function readRecords(dir) {
  return ['results.1.jsonl', 'results.jsonl']
    .map((f) => safe(() => readFileSync(join(dir, f), 'utf8')) ?? '')
    .flatMap((t) => t.split('\n'))
    .filter(Boolean)
    .map((l) => safe(() => JSON.parse(l)))
    .filter(Boolean)
}

const slug = (s) => String(s || 'no-session').replace(/[^\w-]/g, '_').slice(0, 80)

// Where a result's whole output goes. Deterministic from the session and the tool-use
// id, so the marker can name the file before it exists — which is what lets the handler
// decide first and write only when the cut is taken (TH-24).
export function spillPath(dir, sessionId, toolUseId, content) {
  // TH-30: with no tool-use id the name comes from the content, never the clock, so the
  // marker naming the file is the same bytes every time the same result comes through.
  const id = toolUseId || (content === undefined ? String(Date.now()) : `c-${createHash('sha256').update(content).digest('hex').slice(0, 16)}`)
  return join(dir, 'spill', slug(sessionId), `${slug(id)}.txt`)
}

// TH-26 (D9): does this tool use read a spill file back? Such a read comes back whole —
// cutting it again would write a copy of a copy and leave the middle unseen (rule 3).
// String tests only: no realpath, so /tmp for /private/tmp or $HOME/… is missed and cut.
export function readsSpill({ dir, home, cwd, tool, input }) {
  const root = resolve(dir, 'spill')
  if (tool === 'Read') {
    const p = input?.file_path
    if (typeof p !== 'string' || !p) return false
    return resolve(typeof cwd === 'string' ? cwd : sep, p).startsWith(root + sep)
  }
  if (tool === 'Bash') {
    const c = input?.command
    if (typeof c !== 'string') return false
    if (c.includes(root)) return true
    // Erring broad is deliberate: an over-wide Bash match costs tokens only, a miss
    // breaks rule 3.
    if (typeof home === 'string' && home.length > 1 && root.startsWith(home + sep)) return c.includes('~' + root.slice(home.length))
    return false
  }
  return false
}

// TH-29: the files an agent reads as instructions. A cut drops the middle whole, and in
// a file of rules the rules in the middle are gone; headroom (0.39.1) excludes Claude
// Code's Skill tool for the lossy version of the same reason, having measured only 73.5%
// of negations surviving its compressor on 40 SKILL.md bodies. Read only, and exact names
// only: a look-alike is cut like any file, and so is a Bash `cat` of one.
const INSTRUCTION_NAMES = new Set(['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'GEMINI.md', 'SKILL.md'])
const INSTRUCTION_DIRS = ['commands', 'agents', 'skills'].map((d) => `${sep}.claude${sep}${d}${sep}`)
export function readsInstructions({ cwd, tool, input }) {
  if (tool !== 'Read') return false
  const p = input?.file_path
  if (typeof p !== 'string' || !p) return false
  const abs = resolve(typeof cwd === 'string' ? cwd : sep, p)
  return INSTRUCTION_NAMES.has(basename(abs)) || INSTRUCTION_DIRS.some((d) => abs.includes(d))
}

// The whole output, for the model to `Read` if the head and tail were not enough.
// Owner-only permissions: a command's output can hold whatever the command printed.
// Returns the path written, or null when the write failed.
export function writeSpill(p, stdout, stderr) {
  return safe(() => {
    mkdirSync(dirname(p), { recursive: true, mode: 0o700 })
    const body = stderr ? `${stdout}\n\n===== stderr =====\n${stderr}` : stdout
    writeFileSync(p, body, { mode: 0o600 })
    safe(() => chmodSync(p, 0o600))
    return p
  }) ?? null
}

export function spill(dir, sessionId, toolUseId, stdout, stderr) {
  return writeSpill(spillPath(dir, sessionId, toolUseId, `${stdout}\0${stderr}`), stdout, stderr)
}

export function pruneSpill(dir, ttlMs, now = Date.now()) {
  safe(() => {
    const root = join(dir, 'spill')
    for (const s of readdirSync(root)) {
      const d = join(root, s)
      for (const f of safe(() => readdirSync(d)) ?? []) {
        const p = join(d, f)
        if (now - statSync(p).mtimeMs > ttlMs) unlinkSync(p)
      }
    }
  })
}
