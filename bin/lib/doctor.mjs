// `trimhook doctor`: why is nothing being trimmed? Non-zero only on a broken
// configuration.
import { accessSync, constants, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadConfig } from './config.mjs'
import { dataDir, detectHarnessSignal, matcherCovers } from './harness.mjs'
import { readRecords } from './store.mjs'

const PLUGIN_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

// TH-36: `tools` says what trimhook will act on; the matcher in the hooks file says what
// the harness hands it. A name in the first and not the second is the quietest failure
// this plugin has — no cut, no log line, nothing to read anywhere. The two files are
// registered one per harness, so the one that matters is the one for the harness in
// front of us.
export function uncoveredTools(cfg, harness, root = PLUGIN_ROOT) {
  const file = harness === 'codex' ? join(root, 'codex', 'hooks.json') : join(root, 'hooks', 'hooks.json')
  let entries
  try {
    entries = JSON.parse(readFileSync(file, 'utf8'))?.hooks?.PostToolUse ?? []
  } catch {
    return null // not installed from a checkout: nothing to compare against, say nothing
  }
  const matchers = entries.map((e) => e.matcher)
  return { file, tools: cfg.tools.filter((t) => !matchers.some((m) => matcherCovers(m, t))) }
}

// D8: Claude Code's own inline limit for Bash. bashOutputMaxChars, set in any of four
// settings files, wins over BASH_MAX_OUTPUT_LENGTH, the highest level first, clamped to
// 4,000-128,000 (code.claude.com settings reference, read 2026-09-23; managed paths
// re-read 2026-09-29). Best-effort: a --settings flag, MDM or managed-settings.d/ is
// invisible here, and a file that cannot be read is skipped, never an error.
export const MANAGED_SETTINGS =
  process.platform === 'darwin' ? '/Library/Application Support/ClaudeCode/managed-settings.json'
  : process.platform === 'win32' ? 'C:\\Program Files\\ClaudeCode\\managed-settings.json'
  : '/etc/claude-code/managed-settings.json'

export function harnessSettingsCap({ cwd, home, managedSettingsPath }) {
  for (const path of [managedSettingsPath, join(cwd, '.claude', 'settings.local.json'), join(cwd, '.claude', 'settings.json'), join(home, '.claude', 'settings.json')]) {
    try {
      const v = JSON.parse(readFileSync(path, 'utf8'))?.bashOutputMaxChars
      if (Number.isInteger(v) && v > 0) return { value: v, path }
    } catch {
      continue
    }
  }
  return null
}

export function doctor({ cwd = process.cwd(), env = process.env, home = homedir(), managedSettingsPath = MANAGED_SETTINGS } = {}) {
  const lines = []
  let broken = false
  const ok = (m) => lines.push(`  ok    ${m}`)
  const warn = (m) => lines.push(`  warn  ${m}`)
  const bad = (m) => {
    lines.push(`  BAD   ${m}`)
    broken = true
  }
  const { harness, signal } = detectHarnessSignal(env)
  ok(`harness: ${harness} (decided by ${signal === 'default' ? 'default — no harness signal in the environment, running outside a hook' : signal}) — from the environment only; doctor sees no hook input`)
  const dir = dataDir(env)
  try {
    mkdirSync(dir, { recursive: true })
    accessSync(dir, constants.W_OK)
    ok(`data dir: ${dir} (writable)`)
  } catch (e) {
    bad(`data dir: ${dir} is not writable (${e.message}) — spill files and the report cannot be written`)
  }
  const { cfg, path, userPath, problems } = loadConfig(cwd, env)
  ok(existsSync(userPath) ? `user config: ${userPath}` : `user config: none (${userPath})`)
  ok(existsSync(path) ? `repository config: ${path}` : `repository config: none (${path})`)
  for (const p of problems) bad(`config: ${p}`)
  ok(`mode ${cfg.mode} · cap ${cfg.cap} · head ${cfg.head} · minSaving ${cfg.minSaving} · spill ${cfg.spill} (${cfg.spillTtlDays} days) · codex.replace ${cfg.codex.replace} · codex.mode ${cfg.codex.mode}${cfg.holdout ? ` · holdout ${cfg.holdout} (TH-31: that share of cuttable results is left whole)` : ''}`)
  ok(`tools ${cfg.tools.join(', ')}`)
  const cover = uncoveredTools(cfg, harness)
  if (cover?.tools.length) {
    warn(
      `tools ${cover.tools.join(', ')} ${cover.tools.length > 1 ? 'are' : 'is'} configured but not matched by ${cover.file}: the harness never calls the hook for ${cover.tools.length > 1 ? 'them' : 'it'}, so nothing is cut and nothing is logged — add ${cover.tools.length > 1 ? 'them' : 'it'} to the matcher, or drop ${cover.tools.length > 1 ? 'them' : 'it'} from tools`,
    )
  }
  ok(`collapse ${cfg.collapse.enabled ? `on, ${cfg.collapse.strict ? 'strict' : 'masked'}, runs of ${cfg.collapse.minRun}+` : 'off'}`)
  if (Object.keys(cfg.perCommand).length) ok(`per-command caps: ${Object.entries(cfg.perCommand).map(([c, n]) => `${c}=${n}`).join(', ')}`)
  // The harness has its own cut; trimhook can only see what survives it. The setting,
  // when any level sets it, is the one Claude Code obeys (D8).
  const n = (x) => x.toLocaleString('en-US')
  const set = harnessSettingsCap({ cwd, home, managedSettingsPath })
  if (set) {
    const eff = Math.min(128000, Math.max(4000, set.value))
    const where = `${set.path}${eff !== set.value ? `, ${n(set.value)} clamped to 4,000-128,000` : ''}`
    if (env.BASH_MAX_OUTPUT_LENGTH) ok(`BASH_MAX_OUTPUT_LENGTH=${env.BASH_MAX_OUTPUT_LENGTH} ignored: bashOutputMaxChars is set in ${set.path}`)
    if (eff < cfg.cap) warn(`bashOutputMaxChars ${n(eff)} (${where}) is below trimhook's cap ${cfg.cap}: Claude Code moves a longer Bash output to a file and sends a preview first, and trimhook never sees the rest`)
    else ok(`harness cap: bashOutputMaxChars ${n(eff)} (${where}), above trimhook's cap ${cfg.cap}`)
  } else {
    const harnessCap = Number(env.BASH_MAX_OUTPUT_LENGTH)
    if (harnessCap && harnessCap < cfg.cap) warn(`BASH_MAX_OUTPUT_LENGTH=${harnessCap} is below trimhook's cap ${cfg.cap}: Claude Code cuts first, flat, and trimhook never sees the rest`)
  }
  if (harness === 'codex' && !cfg.codex.replace) warn('codex.replace is off: on Codex trimhook measures (outcome would-trim) and does not replace the result — see README')
  // D5: a reply Codex records as a failed tool call is a choice worth seeing wherever
  // doctor runs — from a terminal it rarely detects Codex.
  if (cfg.codex.replace && cfg.codex.mode === 'block') warn('codex.mode block: Codex records the replacement as a failed tool call — the model reads "Script failed" and "Script error:" before the trimmed text; codex.mode continue is the default — see README')
  if (cfg.mode === 'audit') warn('mode audit: results are measured, none is replaced')
  // D7: an install that fails saves nothing and says so only here and in `report`.
  const recs = readRecords(dir)
  const failed = { spillFailed: recs.filter((r) => r.spillFailed === true).length, error: recs.filter((r) => typeof r.error === 'string' && r.error).length }
  if (failed.spillFailed + failed.error) warn(`log: ${failed.spillFailed + failed.error} results left whole after a failure (spillFailed ${failed.spillFailed}, error ${failed.error}) — trimhook saved nothing on those; see trimhook report and the data dir line above`)
  return { lines, broken }
}
