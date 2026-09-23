// Everything the plugin keeps lives under the harness's plugin data directory: the
// audit log (one JSON line per result, sizes only — never the output) and the spill
// files, which do hold the output the model did not see. Every write is best-effort:
// a full disk must never change what the model reads.
import { appendFileSync, chmodSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

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

// The whole output, for the model to `Read` if the head and tail were not enough.
// Owner-only permissions: a command's output can hold whatever the command printed.
export function spill(dir, sessionId, toolUseId, stdout, stderr) {
  return safe(() => {
    const d = join(dir, 'spill', slug(sessionId))
    mkdirSync(d, { recursive: true, mode: 0o700 })
    const p = join(d, `${slug(toolUseId || Date.now())}.txt`)
    const body = stderr ? `${stdout}\n\n===== stderr =====\n${stderr}` : stdout
    writeFileSync(p, body, { mode: 0o600 })
    safe(() => chmodSync(p, 0o600))
    return p
  }) ?? null
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
