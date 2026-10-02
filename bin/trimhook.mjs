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

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { breakingOutOfPlace } from './lib/changelog.mjs'

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

// The walker stays here because it needs this file's ROOT; the rules are pure and live
// in bin/lib/private.mjs, which is also the one file allowed to quote the shapes.
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist'])
const SKIP_EXT = /\.(?:png|jpg|jpeg|gif|ico|webm|mp4|woff2?|tgz|zip|pdf)$/i

function* textFiles(dir) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) yield* textFiles(p)
    else if (!SKIP_EXT.test(name) && st.size < 4 * 1024 * 1024) yield p
  }
}

async function checkPrivateStrings(fail, env = process.env) {
  const { ALLOW_SHAPES, privateStringRules } = await import('./lib/private.mjs')
  const rules = privateStringRules(env)
  // A list that was asked for and is not there checks no names at all, and would do it
  // in silence — the failure this release spent its day removing.
  if (env.TRIMHOOK_PRIVATE_NAMES && !rules.some((r) => r.redact)) {
    fail(`TRIMHOOK_PRIVATE_NAMES is set to ${env.TRIMHOOK_PRIVATE_NAMES}, which is missing, empty or all comments — no names are being checked, only shapes`)
  }
  for (const file of textFiles(ROOT)) {
    const rel = relative(ROOT, file)
    let text
    try {
      text = readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const exempt = text.includes(ALLOW_SHAPES)
    for (const { re, what, redact } of rules) {
      if (exempt && !redact) continue
      const m = text.match(re)
      if (!m) continue
      const line = text.slice(0, m.index).split('\n').length
      // The finding names the file and the kind, never the match — an error message is
      // printed, logged by CI and pasted into issues.
      fail(`${rel}:${line} looks like ${what}${redact ? '' : ` (${m[0].length} characters)`} — this repository is public; see the publishing rules`)
      break
    }
  }
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
// D8: what the code guarantees and where the cap bends, each keyed on its number
// (bin/lib/trim.mjs:21-28, :34, :48, :56; hooks/hooks.json timeout; timing 2026-09-28).
const EXACT_HEADING = '## What it does, exactly'
const EXACT_TERMS = [
  [/stderr`?\s+gets\s+at\s+least\s+20%/, 'the stderr floor (at least 20% of the cap)'],
  [/overflow\s+above\s+the\s+cap/, 'what minSaving counts (the overflow above the cap)'],
  [/within\s+200\s+characters/, 'the line-snap slack (within 200 characters)'],
  [/at\s+most\s+200\s+characters\s+plus\s+the\s+marker/, 'the two-stream bound (at most 200 characters plus the marker)'],
  [/under\s+a\s+5\s+s\s+timeout/, 'the hook timeout (5 s)'],
  [/p50\s+75-83\s+ms/, 'the measured p50 (75-83 ms)'],
  [/156\s+ms/, 'the measured maximum (156 ms)'],
]

// D8: the harness's own limit is two knobs and the setting wins, so the README names
// them together, with the clamp and the one level no hook can read.
const HARNESS_CAP = [
  [/BASH_MAX_OUTPUT_LENGTH(?:(?!\n\n)[\s\S])*bashOutputMaxChars|bashOutputMaxChars(?:(?!\n\n)[\s\S])*BASH_MAX_OUTPUT_LENGTH/, "the harness's own cap — BASH_MAX_OUTPUT_LENGTH and bashOutputMaxChars in one paragraph — and how trimhook relates to it"],
  [/4,000-128,000/, 'the bashOutputMaxChars clamp (4,000-128,000)'],
  [/--settings/, 'what doctor cannot read (--settings)'],
]

async function check() {
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
  const manifests = [
    ['hooks/hooks.json', checkHooksFile('hooks/hooks.json', '${CLAUDE_PLUGIN_ROOT}', fail)],
    ['codex/hooks.json', checkHooksFile('codex/hooks.json', '${PLUGIN_ROOT}', fail)],
  ]
  for (const f of ['README.md', 'CONTRIBUTING.md', 'CLAUDE.md', 'LICENSE', 'BACKLOG.md', 'ROADMAP.md', 'CHANGELOG.md']) if (!existsSync(join(ROOT, f))) fail(`${f} is missing`)
  if (existsSync(join(ROOT, 'CHANGELOG.md'))) {
    const log = read('CHANGELOG.md')
    if (!/^## \[Unreleased\]/m.test(log)) fail('CHANGELOG.md needs an [Unreleased] section')
    if (!log.includes(`## [${pkg.version}]`)) fail(`CHANGELOG.md has no section for ${pkg.version}`)
    // TH-35: a Breaking entry leads its heading, so it leads the release notes too.
    for (const b of breakingOutOfPlace(log)) fail(`CHANGELOG.md [${b.section}] ### ${b.heading}: a **Breaking** entry must be the first under its heading`)
  }
  // TH-35: the release notes open with the tag's CHANGELOG section; a release.yml that
  // stopped calling the script would publish notes from pull-request titles alone.
  const release = join(ROOT, '.github', 'workflows', 'release.yml')
  if (existsSync(release) && !read('.github/workflows/release.yml').includes('scripts/release-notes.mjs')) fail('release.yml must build the notes from the CHANGELOG with scripts/release-notes.mjs (TH-35)')
  if (existsSync(join(ROOT, 'README.md'))) {
    const readme = read('README.md')
    if (!/nothing leaves the machine/i.test(readme)) fail('README.md must state that nothing leaves the machine')
    if (!/fail-open|fails open/i.test(readme)) fail('README.md must state the fail-open rule')
    for (const [re, what] of HARNESS_CAP) if (!re.test(readme)) fail(`README.md must state ${what}`)
    const rule = readmeSection(readme, CAP_RULE_HEADING)
    if (rule === null) fail(`README.md must state the default-cap rule under "${CAP_RULE_HEADING}" (TH-10)`)
    else for (const [re, what] of CAP_RULE) if (!re.test(rule)) fail(`README.md must state the default-cap rule's ${what} under "${CAP_RULE_HEADING}"`)
    const exact = readmeSection(readme, EXACT_HEADING)
    if (exact === null) fail(`README.md must keep the section "${EXACT_HEADING}"`)
    else for (const [re, what] of EXACT_TERMS) if (!re.test(exact)) fail(`README.md must state ${what} under "${EXACT_HEADING}"`)
  }
  for (const m of ['config.mjs', 'harness.mjs', 'trim.mjs', 'store.mjs', 'handlers.mjs', 'report.mjs', 'doctor.mjs']) if (!existsSync(join(ROOT, 'bin', 'lib', m))) fail(`bin/lib/${m} is missing`)
  // The site's og:image named this file for weeks before it existed, and a card that
  // 404s is worse than none: every link unfurls blank. Regenerate with `npm run
  // build:social` after touching the logo or assets/social-preview.html.
  if (existsSync(join(ROOT, 'site', 'build.mjs')) && read('site/build.mjs').includes('social-preview.png') && !existsSync(join(ROOT, 'assets', 'social-preview.png'))) {
    fail('site/build.mjs names assets/social-preview.png, which does not exist — run npm run build:social')
  }
  await checkPrivateStrings(fail)
  // The defaults must be deliverable: a tool trimhook ships ready to cut and the harness
  // never hands it is a silence nobody can debug (TH-36). `doctor` says the same thing
  // about a user's own config; this says it about what the repository ships.
  const { DEFAULTS } = await import('./lib/config.mjs')
  const { matcherCovers } = await import('./lib/harness.mjs')
  for (const [file, hooks] of manifests) {
    const matchers = (hooks.hooks?.PostToolUse ?? []).map((e) => e.matcher)
    for (const tool of DEFAULTS.tools) {
      if (!matchers.some((m) => matcherCovers(m, tool))) fail(`${file}: the default tools include ${tool}, which the matcher ${JSON.stringify(matchers.join(' '))} does not deliver`)
    }
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
    await check()
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
