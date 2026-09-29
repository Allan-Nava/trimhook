// Configuration, in trust order: defaults, the user's file (~/.trimhook.json or
// TRIMHOOK_USER_CONFIG), the repository layer — the repository's file (.trimhook.json,
// .claude/trimhook.json or .codex/trimhook.json in the working directory), or the file
// TRIMHOOK_CONFIG names, which takes its place — then the environment. The repository
// layer is somebody's checkout, so each key has a class (REPO_CLASS, D4): the user file
// and the environment keep every key. A malformed file or a refused key is a diagnostic
// for `doctor`, never a reason to change what the model sees — the layer below applies.
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
  // D5: `continue` answers {continue: false, stopReason}; `block` answers decision:
  // block, which Codex 0.155.1 logs as a failed call ("Script failed …", router
  // error=1, 2026-09-23) — kept for the TH-9 comparison, never a default.
  codex: { replace: false, mode: 'continue' }, // opt-in: TH-9 (2026-09-29) found neither shape applies cleanly on 0.155.1
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
  // a saving the log would claim and the model would not get. Verified live on
  // 2026-09-24: a 23,715-character Read came back at 7,923 with the marker inside
  // `file.content`, so Claude Code accepts the replacement for Read, not only Bash.
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
export const RULES = {
  mode: (v) => ['trim', 'audit'].includes(v) || 'trim|audit',
  cap: (v) => (Number.isInteger(v) && v >= 500 && v <= 200000) || 'an integer in [500, 200000]',
  head: (v) => (num(v) && v >= 0.1 && v <= 0.9) || 'a number in [0.1, 0.9]',
  minSaving: (v) => (Number.isInteger(v) && v >= 0) || 'an integer ≥ 0',
  perCommand: (v) => (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((n) => Number.isInteger(n) && n >= 500)) || 'an object of command → integer cap ≥ 500',
  spill: (v) => typeof v === 'boolean' || 'true|false',
  spillTtlDays: (v) => (num(v) && v >= 0) || 'a number of days ≥ 0',
  'codex.replace': (v) => typeof v === 'boolean' || 'true|false',
  'codex.mode': (v) => ['continue', 'block'].includes(v) || 'continue|block',
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

// D4: what the repository layer may do to each key. `either` moves it both ways (how
// much of a cut result shows; every cut still spills); `narrow` only towards less
// (collapse off, a longer minRun, a subset of tools — a user who chose to see more keeps
// it); `denied` is for recoverability and for what reaches the model on Codex.
export const REPO_CLASS = Object.freeze({
  cap: 'either', perCommand: 'either', minSaving: 'either', head: 'either',
  'collapse.enabled': 'narrow', 'collapse.minRun': 'narrow', tools: 'narrow',
  'collapse.strict': 'denied', mode: 'denied', spill: 'denied', spillTtlDays: 'denied', 'codex.replace': 'denied', 'codex.mode': 'denied',
})
const plain = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)
// Delete a dotted key from a plain-object tree; a no-op when it is absent.
const unset = (o, path) => {
  const ks = path.split('.')
  const parent = ks.length > 1 ? get(o, ks.slice(0, -1).join('.')) : o
  if (plain(parent)) delete parent[ks.at(-1)]
}
const NARROWER = {
  'collapse.enabled': (v, u) => v === false || v === u,
  'collapse.minRun': (v, u) => v >= u,
  tools: (v, u) => v.every((t) => Array.isArray(u) && u.includes(t)),
}
// The repository object with every refused key removed, each refusal a problem. A value
// that fails its rule is dropped too, so the upper value stands rather than the default.
function repoLayer(repo, upper, path, problems) {
  const out = structuredClone(repo)
  for (const top of ['codex', 'collapse']) {
    if (Object.hasOwn(out, top) && !plain(out[top])) {
      problems.push(`${path}: ${top} must be an object, got ${JSON.stringify(out[top])}`)
      delete out[top]
    }
  }
  for (const key of Object.keys(RULES)) {
    const v = get(out, key)
    if (v === undefined) continue
    const cls = REPO_CLASS[key] ?? 'denied'
    const u = get(upper, key)
    if (cls === 'denied') {
      problems.push(`${path}: ${key} may only be set in ~/.trimhook.json or the environment`)
      unset(out, key)
      continue
    }
    const r = RULES[key](v)
    if (r !== true) {
      problems.push(`${path}: ${key} must be ${r}, got ${JSON.stringify(v)} — using ${JSON.stringify(u)}`)
      unset(out, key)
      continue
    }
    if (cls === 'narrow' && !NARROWER[key](v, u)) {
      problems.push(`${path}: ${key} may only narrow ${JSON.stringify(u)}, got ${JSON.stringify(v)}`)
      unset(out, key)
    }
  }
  return out
}

export function loadConfig(cwd = process.cwd(), env = process.env) {
  const problems = []
  const userPath = userConfigPath(env)
  const upper = merge(DEFAULTS, readJson(userPath, problems) ?? {})
  let path
  if (env.TRIMHOOK_CONFIG) {
    path = env.TRIMHOOK_CONFIG
  } else {
    const candidates = [join(cwd, '.trimhook.json'), join(cwd, '.claude', 'trimhook.json'), join(cwd, '.codex', 'trimhook.json')]
    path = candidates.find(existsSync) ?? candidates[0]
  }
  const repo = readJson(path, problems)
  const cfg = merge(upper, repo ? repoLayer(repo, upper, path, problems) : {})
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
