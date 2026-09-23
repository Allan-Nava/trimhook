// `trimhook doctor`: why is nothing being trimmed? Non-zero only on a broken
// configuration.
import { accessSync, constants, existsSync, mkdirSync } from 'node:fs'
import { loadConfig } from './config.mjs'
import { dataDir, detectHarnessSignal } from './harness.mjs'

export function doctor({ cwd = process.cwd(), env = process.env } = {}) {
  const lines = []
  let broken = false
  const ok = (m) => lines.push(`  ok    ${m}`)
  const warn = (m) => lines.push(`  warn  ${m}`)
  const bad = (m) => {
    lines.push(`  BAD   ${m}`)
    broken = true
  }
  const { harness, signal } = detectHarnessSignal(env)
  ok(`harness: ${harness} (decided by ${signal === 'default' ? 'default — no harness signal in the environment, running outside a hook' : signal})`)
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
  ok(`mode ${cfg.mode} · cap ${cfg.cap} · head ${cfg.head} · minSaving ${cfg.minSaving} · spill ${cfg.spill} (${cfg.spillTtlDays} days) · codex.replace ${cfg.codex.replace}`)
  if (Object.keys(cfg.perCommand).length) ok(`per-command caps: ${Object.entries(cfg.perCommand).map(([c, n]) => `${c}=${n}`).join(', ')}`)
  // The harness has its own flat cut; trimhook can only see what survives it.
  const harnessCap = Number(env.BASH_MAX_OUTPUT_LENGTH)
  if (harnessCap && harnessCap < cfg.cap) warn(`BASH_MAX_OUTPUT_LENGTH=${harnessCap} is below trimhook's cap ${cfg.cap}: Claude Code cuts first, flat, and trimhook never sees the rest`)
  if (harness === 'codex' && !cfg.codex.replace) warn('codex.replace is off: on Codex trimhook measures (outcome would-trim) and does not replace the result — see README')
  if (cfg.mode === 'audit') warn('mode audit: results are measured, none is replaced')
  return { lines, broken }
}
