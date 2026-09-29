#!/usr/bin/env node
// trimhook — tool output trimmed at the source, for Claude Code and Codex CLI hooks.
//
//   trimhook check            validate the manifests, hooks files and this package
//   trimhook post-tool-use    PostToolUse handler: head + tail + a pointer to the whole output (stdin JSON)
//   trimhook doctor           harness, data dir, config, the harness's own cap
//   trimhook report [--cap N] results, characters saved, top commands — from the local log; --cap N recomputes them at cap N
//   trimhook print-hooks      a .codex/hooks.json for this checkout, absolute paths
//   trimhook help
//
// The handler FAILS OPEN: exit 0 with no JSON means "leave the result alone". A
// malformed result, an unwritable data directory, a bug here — the model sees exactly
// what it would have seen without the plugin. Nothing leaves the machine: the whole
// output goes to a file under the plugin's data directory, and the log keeps sizes only.
//
// Zero dependencies, Node 18+: a hook starts on every tool call.

import { existsSync, readdirSync, readFileSync } from 'node:fs'
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

// D7: a thrown error leaves a record, best-effort — the error's code or name, never its
// message, which can carry a path or a line of output (rule 4). The model still gets the
// original result: this runs after the handler gave up, and prints nothing to stdout.
async function logError(input, e) {
  try {
    const { appendRecord } = await import('./lib/store.mjs')
    const { dataDir, detectHarness } = await import('./lib/harness.mjs')
    const cls = String((typeof e?.code === 'string' && e.code) || (typeof e?.name === 'string' && e.name) || 'Error').replace(/[^\w.-]/g, '_').slice(0, 64)
    appendRecord(dataDir(), {
      at: new Date().toISOString(),
      session: typeof input.session_id === 'string' ? input.session_id : null,
      harness: detectHarness(process.env, input),
      tool: typeof input.tool_name === 'string' ? input.tool_name : null,
      outcome: 'kept',
      error: cls,
    })
  } catch {}
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
    await logError(input, e)
  }
  process.exit(0)
}

function checkHooksFile(path, rootVar, fail) {
  const hooks = json(path)
  const entries = hooks.hooks?.PostToolUse ?? []
  // The matcher is a regular expression the harness applies to the tool name, so the
  // tools trimhook knows the shape of are alternatives in one entry. Bash must be among
  // them: it is 28.7 M of the 30 M characters (TH-12).
  if (!entries.some((e) => String(e.matcher ?? '').split('|').includes('Bash'))) fail(`${path}: the PostToolUse hook must match Bash`)
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

// The README text under one heading, up to the next ## or ### heading; null when the
// heading is absent. A term guarded inside its own section cannot be satisfied by the
// same number written somewhere else.
function readmeSection(text, heading) {
  const start = text.indexOf(`\n${heading}\n`)
  if (start === -1) return null
  const body = text.slice(start + heading.length + 2)
  const end = body.search(/^#{2,3} /m)
  return end < 0 ? body : body.slice(0, end)
}
// D3, D8: the rule that turns the TH-10 week into a default cap, one regex per term.
const CAP_RULE_HEADING = '### How the week decides the default cap'
const CAP_RULE = [
  [/at\s+least\s+20\s+cuts/, 'floor (at least 20 cuts per tool)'],
  [/12\s+tool\s+uses/, 'window (the next 12 tool uses)'],
  [/at\s+or\s+under\s+10%/, 'threshold (at or under 10%)'],
  [/9,500/, 'subset (a post-collapse size of 9,500 or more)'],
  [/4,000\s+→\s+8,000\s+→\s+12,000/, 'ladder (4,000 → 8,000 → 12,000)'],
  [/pooled\s+rate/, 'pooled rate (reported, does not vote)'],
  [/upper\s+bound/, 'weak spot (an upper bound for 8,000)'],
]

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
    const rule = readmeSection(readme, CAP_RULE_HEADING)
    if (rule === null) fail(`README.md must state the default-cap rule under "${CAP_RULE_HEADING}" (TH-10)`)
    else for (const [re, what] of CAP_RULE) if (!re.test(rule)) fail(`README.md must state the default-cap rule's ${what} under "${CAP_RULE_HEADING}"`)
  }
  for (const m of ['config.mjs', 'harness.mjs', 'trim.mjs', 'store.mjs', 'handlers.mjs', 'report.mjs', 'doctor.mjs']) if (!existsSync(join(ROOT, 'bin', 'lib', m))) fail(`bin/lib/${m} is missing`)
  // The site's og:image named this file for weeks before it existed, and a card that
  // 404s is worse than none: every link unfurls blank. Regenerate with `npm run
  // build:social` after touching the logo or assets/social-preview.html.
  if (existsSync(join(ROOT, 'site', 'build.mjs')) && read('site/build.mjs').includes('social-preview.png') && !existsSync(join(ROOT, 'assets', 'social-preview.png'))) {
    fail('site/build.mjs names assets/social-preview.png, which does not exist — run npm run build:social')
  }
  // D8: the workflows are the one place a sibling project's name is never meant to be.
  // The docs name hookgate on purpose (it is the model this repo follows); CI text that
  // says HG-n is a copy-paste stray. The npm tarball has no .github, hence the guard.
  const wf = join(ROOT, '.github', 'workflows')
  if (existsSync(wf)) {
    for (const f of readdirSync(wf).filter((n) => n.endsWith('.yml')).sort()) {
      read(`.github/workflows/${f}`).split('\n').forEach((l, i) => {
        if (/hookgate|\bHG-/.test(l)) fail(`.github/workflows/${f}:${i + 1} names the sibling project (hookgate or an HG-n id) — this repository's ids are TH-n`)
      })
    }
  }
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
    const { RULES } = await import('./lib/config.mjs')
    // `--cap N` or `--cap=N`; the same bounds as the config key, so a typo is an error
    // rather than a sweep at a cap nobody could set.
    const args = process.argv.slice(3)
    const i = args.findIndex((a) => a === '--cap' || a.startsWith('--cap='))
    let cap
    if (i >= 0) {
      const raw = args[i].startsWith('--cap=') ? args[i].slice(6) : args[i + 1]
      cap = Number(raw)
      const ok = RULES.cap(cap)
      if (ok !== true) {
        console.error(`trimhook report: --cap must be ${ok}, got ${JSON.stringify(raw ?? null)}`)
        process.exit(2)
      }
    }
    console.log(report(dataDir(), { cap }))
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
