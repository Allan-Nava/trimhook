#!/usr/bin/env node
// trimhook — tool output trimmed at the source, for Claude Code and Codex CLI hooks.
//
//   trimhook check            validate the manifests, hooks files and this package
//   trimhook post-tool-use    PostToolUse handler: head + tail + a pointer to the whole output (stdin JSON)
//   trimhook doctor           harness, data dir, config, the harness's own cap
//   trimhook report           results, characters saved, top commands — from the local log
//   trimhook print-hooks      a .codex/hooks.json for this checkout, absolute paths
//   trimhook help
//
// The handler FAILS OPEN: exit 0 with no JSON means "leave the result alone". A
// malformed result, an unwritable data directory, a bug here — the model sees exactly
// what it would have seen without the plugin. Nothing leaves the machine: the whole
// output goes to a file under the plugin's data directory, and the log keeps sizes only.
//
// Zero dependencies, Node 18+: a hook starts on every tool call.

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => readFileSync(join(ROOT, p), 'utf8')
const json = (p) => JSON.parse(read(p))
const [cmd = 'help'] = process.argv.slice(2)

async function readStdin() {
  let s = ''
  for await (const chunk of process.stdin) s += chunk
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

async function handler() {
  const input = await readStdin()
  if (!input) process.exit(0)
  try {
    const { postToolUse } = await import('./lib/handlers.mjs')
    const out = await postToolUse(input)
    // A replaced result can be several kilobytes: wait for the pipe to drain before
    // exiting, or the harness reads a truncated JSON and ignores the whole answer.
    if (out) await new Promise((r) => process.stdout.write(`${JSON.stringify(out)}\n`, r))
  } catch (e) {
    process.stderr.write(`trimhook: failed open: ${e.message}\n`)
  }
  process.exit(0)
}

function checkHooksFile(path, rootVar, fail) {
  const hooks = json(path)
  const entries = hooks.hooks?.PostToolUse ?? []
  if (!entries.some((e) => e.matcher === 'Bash')) fail(`${path}: the PostToolUse hook must match Bash`)
  for (const [event, es] of Object.entries(hooks.hooks ?? {})) {
    if (event !== 'PostToolUse') fail(`${path}: unexpected event ${event} — trimhook is one PostToolUse hook`)
    for (const e of es) {
      for (const h of e.hooks ?? []) {
        const handlerName = Array.isArray(h.args) ? h.args[0] : h.command.split(/\s+/).at(-1)
        const bin = Array.isArray(h.args) ? h.command : h.command.replace(/^node\s+"?/, '').replace(/"?\s+\S+$/, '')
        if (bin !== `${rootVar}/bin/trimhook.mjs`) fail(`${path}: command must run ${rootVar}/bin/trimhook.mjs, got ${h.command}`)
        if (handlerName !== 'post-tool-use') fail(`${path}: the command must end in post-tool-use, got ${handlerName}`)
        if (typeof h.timeout !== 'number' || h.timeout > 10) fail(`${path}: timeout must be set and at most 10 s`)
      }
    }
  }
  return hooks
}

function check() {
  const errors = []
  const fail = (m) => errors.push(m)
  const pkg = json('package.json')
  const plugin = json('.claude-plugin/plugin.json')
  const market = json('.claude-plugin/marketplace.json')
  const codex = json('.codex-plugin/plugin.json')
  const versions = { 'package.json': pkg.version, 'plugin.json': plugin.version, 'marketplace.json': market.metadata?.version, 'codex plugin.json': codex.version }
  if (new Set(Object.values(versions)).size !== 1) fail(`versions differ: ${JSON.stringify(versions)}`)
  if (pkg.name !== 'trimhook' || plugin.name !== 'trimhook' || codex.name !== 'trimhook') fail('every manifest must be named trimhook')
  if (!(market.plugins ?? []).some((p) => p.name === 'trimhook' && p.source === './')) fail('marketplace.json must list the trimhook plugin with source "./"')
  if (!/^(?:git\+)?https:\/\/github\.com\/Allan-Nava\/trimhook(?:\.git)?$/.test(pkg.repository?.url ?? '')) fail('package.json#repository must be the GitHub repo URL, exactly')
  if (pkg.dependencies && Object.keys(pkg.dependencies).length) fail('no runtime dependencies — a hook runs on every tool call')
  for (const f of ['bin', 'hooks', 'codex', '.claude-plugin', '.codex-plugin', 'README.md', 'CHANGELOG.md', 'LICENSE']) if (!pkg.files?.includes(f)) fail(`package.json#files is missing ${f}`)
  checkHooksFile('hooks/hooks.json', '${CLAUDE_PLUGIN_ROOT}', fail)
  checkHooksFile('codex/hooks.json', '${PLUGIN_ROOT}', fail)
  for (const f of ['README.md', 'CONTRIBUTING.md', 'CLAUDE.md', 'LICENSE', 'BACKLOG.md', 'ROADMAP.md', 'CHANGELOG.md']) if (!existsSync(join(ROOT, f))) fail(`${f} is missing`)
  if (existsSync(join(ROOT, 'CHANGELOG.md'))) {
    const log = read('CHANGELOG.md')
    if (!/^## \[Unreleased\]/m.test(log)) fail('CHANGELOG.md needs an [Unreleased] section')
    if (!log.includes(`## [${pkg.version}]`)) fail(`CHANGELOG.md has no section for ${pkg.version}`)
  }
  if (existsSync(join(ROOT, 'README.md'))) {
    const readme = read('README.md')
    if (!/nothing leaves the machine/i.test(readme)) fail('README.md must state that nothing leaves the machine')
    if (!/fail-open|fails open/i.test(readme)) fail('README.md must state the fail-open rule')
    if (!/BASH_MAX_OUTPUT_LENGTH/.test(readme)) fail("README.md must name the harness's own cap (BASH_MAX_OUTPUT_LENGTH) and how trimhook relates to it")
  }
  for (const m of ['config.mjs', 'harness.mjs', 'trim.mjs', 'store.mjs', 'handlers.mjs', 'report.mjs', 'doctor.mjs']) if (!existsSync(join(ROOT, 'bin', 'lib', m))) fail(`bin/lib/${m} is missing`)
  if (errors.length) {
    for (const e of errors) console.error(`✗ ${e}`)
    process.exit(1)
  }
  console.log(`ok — one hook, two harnesses, manifests in sync at ${pkg.version}`)
}

function help() {
  console.log(read('bin/trimhook.mjs').split('\n').slice(1, 9).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'))
}

switch (cmd) {
  case 'check':
    check()
    break
  case 'post-tool-use':
    await handler()
    break
  case 'doctor': {
    const { doctor } = await import('./lib/doctor.mjs')
    const { lines, broken } = doctor()
    console.log(`trimhook doctor\n${lines.join('\n')}`)
    process.exit(broken ? 1 : 0)
    break
  }
  case 'report': {
    const { report } = await import('./lib/report.mjs')
    const { dataDir } = await import('./lib/harness.mjs')
    console.log(report(dataDir()))
    break
  }
  case 'print-hooks': {
    const tpl = json('codex/hooks.json')
    const bin = join(ROOT, 'bin', 'trimhook.mjs')
    for (const entries of Object.values(tpl.hooks)) for (const e of entries) for (const h of e.hooks) h.command = h.command.replace('${PLUGIN_ROOT}/bin/trimhook.mjs', bin)
    tpl.description = `trimhook for Codex CLI, pointing at ${bin}. Save as .codex/hooks.json in the repository (or ~/.codex/hooks.json) and trust it when Codex asks.`
    console.log(JSON.stringify(tpl, null, 2))
    break
  }
  default:
    help()
}
