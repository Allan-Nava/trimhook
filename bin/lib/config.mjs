// Configuration, in trust order: defaults, the user's file (~/.trimhook.json or
// TRIMHOOK_USER_CONFIG), an explicit TRIMHOOK_CONFIG, the repository's file
// (.trimhook.json, .claude/trimhook.json or .codex/trimhook.json in the working
// directory), then the environment. A malformed file is a diagnostic for `doctor`,
// never a reason to change what the model sees — the layer below applies.
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DEFAULTS = Object.freeze({
  mode: 'trim', // trim | audit — audit measures every result and never replaces one
  cap: 8000, // characters of stdout+stderr the model sees; above it, head + tail + a pointer
  head: 0.6, // share of the cap given to the head; the tail gets the rest
  minSaving: 1500, // do not trim when fewer than this many characters would be elided
  perCommand: {}, // { "git log": 4000, "npm test": 16000 } — by the command's first word or first two
  spill: true, // write the whole output to a file the model can read
  spillTtlDays: 7, // spill files older than this are pruned
  codex: { replace: false }, // Codex's result replacement is documented but not yet verified live: opt in
  // TH-16: a run of identical lines is collapsed to its first line and a count, before
  // the cut, so the budget buys distinct content.
  //
  // On by default, and strict by default, which is the conservative pair: strict
  // compares lines byte for byte, so the copies it drops said exactly what the line it
  // keeps says. It is worth 0.2% of what the model reads (2026-09-23) — small, but it
  // cannot cost anything either.
  //
  // `strict: false` compares lines with digits, hex and colour codes masked. That is
  // worth 2.6%, ten times as much — and a sample of 40 of the runs it folds says 38 of
  // them are content, not noise: table rows, grep hits, version tags, log lines that
  // differ by a timestamp (TH-19, 2026-09-23). A redrawn progress bar, the case the mask
  // was written for, barely survives into a transcript at all. So it is off, and it is
  // not a default in waiting: turn it on only for output you know is machine chatter.
  collapse: { enabled: true, minRun: 3, strict: true },
  // TH-12. Bash is most of the mass, but not most of the waste per result: of the
  // characters each tool prints, the cut would take 6.7% of Bash's, 26.6% of Read's and
  // 62.4% of WebFetch's (2026-09-23). A tool is listed here only when its output shape
  // is known — `harness.mjs` names the three it has seen — because the harness ignores a
  // replacement that does not match the tool's own shape, and an ignored replacement is
  // a saving the log would claim and the model would not get (TH-20 verifies it live).
  tools: ['Bash', 'Read', 'WebFetch'],
})

const merge = (a, b) => {
  const out = { ...a }
  for (const [k, v] of Object.entries(b ?? {})) out[k] = v && typeof v === 'object' && !Array.isArray(v) ? merge(a[k] ?? {}, v) : v
  return out
}

function readJson(path, problems) {
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch {
    return null
  }
  try {
    const v = JSON.parse(text)
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
      problems.push(`${path}: the top level must be an object`)
      return {}
    }
    return v
  } catch (e) {
    problems.push(`${path}: ${e.message}`)
    return {}
  }
}

export const userConfigPath = (env = process.env) => env.TRIMHOOK_USER_CONFIG ?? join(homedir(), '.trimhook.json')

const num = (x) => typeof x === 'number' && Number.isFinite(x)
const RULES = {
  mode: (v) => ['trim', 'audit'].includes(v) || 'trim|audit',
  cap: (v) => (Number.isInteger(v) && v >= 500 && v <= 200000) || 'an integer in [500, 200000]',
  head: (v) => (num(v) && v >= 0.1 && v <= 0.9) || 'a number in [0.1, 0.9]',
  minSaving: (v) => (Number.isInteger(v) && v >= 0) || 'an integer ≥ 0',
  perCommand: (v) => (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((n) => Number.isInteger(n) && n >= 500)) || 'an object of command → integer cap ≥ 500',
  spill: (v) => typeof v === 'boolean' || 'true|false',
  spillTtlDays: (v) => (num(v) && v >= 0) || 'a number of days ≥ 0',
  'codex.replace': (v) => typeof v === 'boolean' || 'true|false',
  'collapse.enabled': (v) => typeof v === 'boolean' || 'true|false',
  'collapse.minRun': (v) => (Number.isInteger(v) && v >= 2) || 'an integer ≥ 2',
  'collapse.strict': (v) => typeof v === 'boolean' || 'true|false',
  tools: (v) => (Array.isArray(v) && v.length > 0 && v.every((n) => typeof n === 'string' && n)) || 'a non-empty array of tool names',
}
const get = (o, path) => path.split('.').reduce((a, k) => (a && typeof a === 'object' ? a[k] : undefined), o)
const set = (o, path, v) => {
  const ks = path.split('.')
  let cur = o
  for (const k of ks.slice(0, -1)) cur = cur[k] = { ...(cur[k] ?? {}) }
  cur[ks.at(-1)] = v
}

export function loadConfig(cwd = process.cwd(), env = process.env) {
  const problems = []
  const userPath = userConfigPath(env)
  let cfg = merge(DEFAULTS, readJson(userPath, problems) ?? {})
  let path
  if (env.TRIMHOOK_CONFIG) {
    path = env.TRIMHOOK_CONFIG
    cfg = merge(cfg, readJson(path, problems) ?? {})
  } else {
    const candidates = [join(cwd, '.trimhook.json'), join(cwd, '.claude', 'trimhook.json'), join(cwd, '.codex', 'trimhook.json')]
    path = candidates.find(existsSync) ?? candidates[0]
    cfg = merge(cfg, readJson(path, problems) ?? {})
  }
  if (env.TRIMHOOK_MODE) cfg.mode = env.TRIMHOOK_MODE
  if (env.TRIMHOOK_CAP) cfg.cap = Number(env.TRIMHOOK_CAP)
  for (const [key, rule] of Object.entries(RULES)) {
    const v = get(cfg, key)
    const r = rule(v)
    if (r === true) continue
    problems.push(`${key} must be ${r}, got ${JSON.stringify(v)} — using ${JSON.stringify(get(DEFAULTS, key))}`)
    set(cfg, key, get(DEFAULTS, key))
  }
  return { cfg, path, userPath, problems }
}

// The cap that applies to one command: the most specific perCommand key wins
// ("git log" over "git"), else the global cap.
export function capFor(cfg, command) {
  const words = String(command ?? '').trim().replace(/^(?:cd\s+\S+\s*(?:&&|;|\n)\s*)+/, '').split(/\s+/)
  const two = words.slice(0, 2).join(' ')
  const one = words[0] ?? ''
  if (Object.hasOwn(cfg.perCommand, two)) return cfg.perCommand[two]
  if (Object.hasOwn(cfg.perCommand, one)) return cfg.perCommand[one]
  return cfg.cap
}
