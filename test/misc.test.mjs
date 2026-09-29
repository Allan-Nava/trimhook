import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { capFor, loadConfig, REPO_CLASS, RULES } from '../bin/lib/config.mjs'
import { doctor } from '../bin/lib/doctor.mjs'
import { dataDir, detectHarnessSignal, readResponse, replacementOutput } from '../bin/lib/harness.mjs'
import { render, summarize } from '../bin/lib/report.mjs'
import { pruneSpill, spill } from '../bin/lib/store.mjs'
import { env, input, lines, tmp } from './helpers.mjs'

const BIN = new URL('../bin/trimhook.mjs', import.meta.url).pathname

test('config: defaults, user file, repository file, env, validation with defaults winning', () => {
  const d = tmp()
  const e = env(d)
  writeFileSync(e.TRIMHOOK_USER_CONFIG, JSON.stringify({ cap: 12000, perCommand: { 'npm test': 20000 } }))
  const { cfg, problems } = loadConfig(d, e)
  assert.equal(cfg.cap, 12000)
  assert.deepEqual(problems, [])
  assert.equal(capFor(cfg, 'npm test -- --grep x'), 20000)
  assert.equal(capFor(cfg, 'cd src && npm test'), 20000)
  assert.equal(capFor(cfg, 'npm run build'), 12000)
  assert.equal(loadConfig(d, { ...e, TRIMHOOK_CAP: '3000' }).cfg.cap, 3000)
  writeFileSync(e.TRIMHOOK_USER_CONFIG, JSON.stringify({ cap: 10, head: 5, mode: 'loud', perCommand: { ls: 1 } }))
  const bad = loadConfig(d, e)
  assert.equal(bad.problems.length, 4)
  assert.equal(bad.cfg.cap, 8000)
  assert.equal(bad.cfg.head, 0.6)
  assert.equal(bad.cfg.mode, 'trim')
})

test('config, repository layer: cap, perCommand, minSaving and head move either way', () => {
  const d = tmp()
  const e = env(d)
  const repo = join(d, '.trimhook.json')
  writeFileSync(e.TRIMHOOK_USER_CONFIG, JSON.stringify({ cap: 8000, perCommand: { 'npm test': 16000 } }))
  writeFileSync(repo, JSON.stringify({ cap: 12000, minSaving: 500, head: 0.7, perCommand: { 'npm test': 30000 } }))
  const up = loadConfig(d, e)
  assert.equal(up.cfg.cap, 12000)
  assert.equal(up.cfg.minSaving, 500)
  assert.equal(up.cfg.head, 0.7)
  assert.deepEqual(up.cfg.perCommand, { 'npm test': 30000 })
  assert.deepEqual(up.problems, [])
  writeFileSync(repo, JSON.stringify({ cap: 2000 }))
  const down = loadConfig(d, e)
  assert.equal(down.cfg.cap, 2000)
  assert.deepEqual(down.problems, [])
})

test('config, repository layer: collapse and tools may only narrow', () => {
  const d = tmp()
  const e = env(d)
  writeFileSync(e.TRIMHOOK_USER_CONFIG, JSON.stringify({ collapse: { enabled: false }, tools: ['Bash', 'Read'] }))
  writeFileSync(join(d, '.trimhook.json'), JSON.stringify({ collapse: { enabled: true, minRun: 2 }, tools: ['Bash', 'WebFetch'] }))
  const { cfg, problems } = loadConfig(d, e)
  assert.equal(cfg.collapse.enabled, false)
  assert.equal(cfg.collapse.minRun, 3)
  assert.deepEqual(cfg.tools, ['Bash', 'Read'])
  assert.equal(problems.length, 3)
  for (const p of problems) {
    assert.ok(p.startsWith(`${join(d, '.trimhook.json')}: `), p)
    assert.match(p, /: (collapse\.enabled|collapse\.minRun|tools) may only narrow /)
  }
  const d2 = tmp()
  const e2 = env(d2)
  writeFileSync(e2.TRIMHOOK_USER_CONFIG, '{}')
  writeFileSync(join(d2, '.trimhook.json'), JSON.stringify({ collapse: { enabled: false, minRun: 5 }, tools: ['Bash'] }))
  const narrow = loadConfig(d2, e2)
  assert.equal(narrow.cfg.collapse.enabled, false)
  assert.equal(narrow.cfg.collapse.minRun, 5)
  assert.deepEqual(narrow.cfg.tools, ['Bash'])
  assert.deepEqual(narrow.problems, [])
})

test('config, repository layer: mode, spill, spillTtlDays, codex.replace and collapse.strict are denied', () => {
  const d = tmp()
  const e = env(d)
  const repo = join(d, '.trimhook.json')
  writeFileSync(e.TRIMHOOK_USER_CONFIG, JSON.stringify({ codex: { replace: true } }))
  writeFileSync(repo, JSON.stringify({ mode: 'audit', spill: false, spillTtlDays: 0, codex: { replace: false }, collapse: { strict: false } }))
  const { cfg, problems } = loadConfig(d, e)
  assert.equal(cfg.mode, 'trim')
  assert.equal(cfg.spill, true)
  assert.equal(cfg.spillTtlDays, 7)
  assert.equal(cfg.codex.replace, true)
  assert.equal(cfg.collapse.strict, true)
  assert.deepEqual(
    problems,
    ['mode', 'spill', 'spillTtlDays', 'codex.replace', 'collapse.strict'].map((k) => `${repo}: ${k} may only be set in ~/.trimhook.json or the environment`),
  )
  const d2 = tmp()
  const e2 = env(d2)
  writeFileSync(e2.TRIMHOOK_USER_CONFIG, JSON.stringify({ spill: false, mode: 'audit' }))
  const user = loadConfig(d2, e2)
  assert.equal(user.cfg.spill, false)
  assert.equal(user.cfg.mode, 'audit')
  writeFileSync(join(d2, '.trimhook.json'), JSON.stringify({ mode: 'trim' }))
  writeFileSync(e2.TRIMHOOK_USER_CONFIG, '{}')
  assert.equal(loadConfig(d2, { ...e2, TRIMHOOK_MODE: 'audit' }).cfg.mode, 'audit', 'the environment keeps every key')
})

test('config, repository layer: TRIMHOOK_CONFIG is classed the same way', () => {
  const d = tmp()
  const e = env(d)
  const explicit = join(d, 'explicit.json')
  writeFileSync(explicit, JSON.stringify({ spill: false, cap: 4000 }))
  writeFileSync(join(d, '.trimhook.json'), JSON.stringify({ cap: 9999 }))
  const { cfg, path, problems } = loadConfig(d, { ...e, TRIMHOOK_CONFIG: explicit })
  assert.equal(cfg.spill, true)
  assert.equal(cfg.cap, 4000)
  assert.equal(path, explicit)
  assert.deepEqual(problems, [`${explicit}: spill may only be set in ~/.trimhook.json or the environment`])
})

test('config, repository layer: every key has a class; bad values keep the upper one', () => {
  assert.deepEqual(Object.keys(RULES).filter((k) => !(k in REPO_CLASS)), [])
  const d = tmp()
  const e = env(d)
  writeFileSync(e.TRIMHOOK_USER_CONFIG, JSON.stringify({ codex: { replace: true }, collapse: { minRun: 10 } }))
  writeFileSync(join(d, '.trimhook.json'), JSON.stringify({ codex: 5, collapse: { minRun: 'x' } }))
  const { cfg, problems } = loadConfig(d, e)
  assert.equal(cfg.codex.replace, true)
  assert.equal(cfg.collapse.minRun, 10)
  assert.equal(problems.length, 2)
  assert.ok(problems.some((p) => p.endsWith(': codex must be an object, got 5')), problems.join('\n'))
  assert.ok(problems.some((p) => /: collapse\.minRun must be an integer ≥ 2, got "x" — using 10$/.test(p)), problems.join('\n'))
})

test('harness detection: own signals before ambient ones', () => {
  assert.deepEqual(detectHarnessSignal({ CLAUDE_PLUGIN_ROOT: '/x' }), { harness: 'claude', signal: 'CLAUDE_PLUGIN_ROOT' })
  assert.deepEqual(detectHarnessSignal({ PLUGIN_ROOT: '/x' }), { harness: 'codex', signal: 'PLUGIN_ROOT' })
  assert.deepEqual(detectHarnessSignal({ CLAUDECODE: '1' }, { turn_id: 't' }), { harness: 'codex', signal: 'stdin' }, 'a Codex hook in a Claude Code shell')
  assert.deepEqual(detectHarnessSignal({}, { prompt_id: 'p' }), { harness: 'claude', signal: 'stdin' })
  assert.deepEqual(detectHarnessSignal({ TRIMHOOK_HARNESS: 'codex', CLAUDE_PLUGIN_ROOT: '/x' }).harness, 'codex')
  assert.equal(detectHarnessSignal({}).signal, 'default')
})

test('readResponse understands both harnesses and refuses images', () => {
  assert.deepEqual(readResponse('text'), { stdout: 'text', stderr: '', rest: null, shape: 'text' })
  assert.equal(readResponse({ stdout: 'a', stderr: 'b', interrupted: false, isImage: false }).stderr, 'b')
  assert.equal(readResponse({ output: 'o' }).stdout, 'o')
  assert.equal(readResponse({ isImage: true, stdout: 'x' }), null)
  assert.equal(readResponse(null), null)
})

test('readResponse: an interrupted Bash result falls through', () => {
  assert.equal(readResponse({ stdout: lines(5000), stderr: '', interrupted: true, isImage: false }), null)
  const done = readResponse({ stdout: 'a', stderr: '', interrupted: false, isImage: false })
  assert.equal(done.stdout, 'a')
  assert.equal(done.shape, 'bash')
  assert.equal(readResponse({ stdout: 'a' }).stdout, 'a')
  assert.notEqual(readResponse({ stdout: 'a', interrupted: 'yes' }), null, 'only the boolean true counts')
})

// The shapes are the ones the transcripts actually carry (2026-09-23), not invented ones.
test('readResponse finds the text in a Read and a WebFetch, and refuses an image Read', () => {
  const read = { type: 'text', file: { filePath: '/a/b.ts', content: 'const x = 1\n', numLines: 1, startLine: 1, totalLines: 400 } }
  assert.equal(readResponse(read).stdout, 'const x = 1\n')
  assert.equal(readResponse(read).shape, 'file')
  assert.equal(readResponse({ type: 'image', file: { base64: 'AAAA', type: 'png' } }), null)
  assert.equal(readResponse({ type: 'text', file: { base64: 'AAAA', content: 'x' } }), null)

  const fetched = { bytes: 23921, code: 200, codeText: 'OK', result: 'the page text', durationMs: 2113, url: 'https://example.com' }
  assert.equal(readResponse(fetched).stdout, 'the page text')
  assert.equal(readResponse(fetched).shape, 'result')
})

test('a replacement changes the field that holds the text and nothing else', () => {
  const read = { type: 'text', file: { filePath: '/a/b.ts', content: 'long', numLines: 1, startLine: 1, totalLines: 400 } }
  const out = replacementOutput('claude', readResponse(read), 'cut', '', 'note').hookSpecificOutput.updatedToolOutput
  assert.deepEqual(out, { type: 'text', file: { filePath: '/a/b.ts', content: 'cut', numLines: 1, startLine: 1, totalLines: 400 } })

  const fetched = { bytes: 23921, code: 200, codeText: 'OK', result: 'long', durationMs: 2113, url: 'https://example.com' }
  const out2 = replacementOutput('claude', readResponse(fetched), 'cut', '', 'note').hookSpecificOutput.updatedToolOutput
  assert.deepEqual(out2, { ...fetched, result: 'cut' })

  // Bash keeps the fields the harness sends that trimhook knows nothing about.
  const bash = { stdout: 'long', stderr: '', interrupted: false, isImage: false, noOutputExpected: false }
  const out3 = replacementOutput('claude', readResponse(bash), 'cut', '', 'note').hookSpecificOutput.updatedToolOutput
  assert.equal(out3.noOutputExpected, false)
  assert.equal(out3.stdout, 'cut')
})

test('spill files are pruned after the TTL', () => {
  const d = tmp()
  const p = spill(d, 's', 't', 'out', '')
  utimesSync(p, new Date(Date.now() - 9 * 86400000), new Date(Date.now() - 9 * 86400000))
  const fresh = spill(d, 's', 't2', 'out', 'err')
  assert.match(readFileSync(fresh, 'utf8'), /===== stderr =====/)
  pruneSpill(d, 7 * 86400000)
  assert.throws(() => readFileSync(p))
  assert.ok(readFileSync(fresh))
})

test('report sums sizes and ranks commands', () => {
  const s = summarize([
    { outcome: 'kept', before: 100, after: 100, command: 'ls' },
    { outcome: 'trimmed', before: 30000, after: 8000, command: 'npm test' },
    { outcome: 'would-trim', before: 20000, after: 8000, command: 'git log' },
  ])
  assert.equal(s.results, 3)
  assert.equal(s.saved, 34000)
  assert.match(render(s), /saved 34,000/)
  assert.match(render(s), /`npm test` 22,000 \(1\)/)
  assert.equal(render(summarize([])), 'no results logged yet')
})

test('report: flag counts for spillRead, spillFailed and error', () => {
  const s = summarize([
    { outcome: 'kept', before: 9000, after: 9000, spillRead: true },
    { outcome: 'kept', before: 20000, after: 20000, spillFailed: true },
    { outcome: 'kept', error: 'EACCES' },
    { outcome: 'kept', error: 'ENOSPC' },
    { outcome: 'trimmed', before: 30000, after: 8000, command: 'npm test' },
  ])
  assert.deepEqual(s.flags, { spillRead: 1, spillFailed: 1, error: 2 })
  assert.equal(s.saved, 22000)
  assert.match(render(s), /^flags on kept results: spillRead 1 · spillFailed 1 · error 2$/m)
  assert.doesNotMatch(render(summarize([{ outcome: 'trimmed', before: 30000, after: 8000 }])), /flags on kept results/)
})

test('doctor: writable data dir, config problems are BAD, the harness cap is a warning', () => {
  const d = tmp()
  let r = doctor({ cwd: d, env: env(d) })
  assert.equal(r.broken, false)
  r = doctor({ cwd: d, env: env(d, { BASH_MAX_OUTPUT_LENGTH: '4000' }) })
  assert.ok(r.lines.some((l) => /warn.*BASH_MAX_OUTPUT_LENGTH=4000 is below/.test(l)))
  writeFileSync(join(d, 'user.json'), '{nope')
  assert.equal(doctor({ cwd: d, env: env(d) }).broken, true)
})

test('doctor warns when the log holds a spillFailed or error record', () => {
  const d = tmp()
  writeFileSync(join(d, 'results.jsonl'), '{"outcome":"kept","spillFailed":true}\n{"outcome":"kept","error":"EACCES"}\n{"outcome":"kept","spillRead":true}\n')
  const r = doctor({ cwd: d, env: env(d) })
  assert.ok(r.lines.some((l) => /^  warn  log: 2 results left whole after a failure \(spillFailed 1, error 1\)/.test(l)))
  assert.equal(r.broken, false)
  const clean = tmp()
  assert.ok(!doctor({ cwd: clean, env: env(clean) }).lines.some((l) => /warn  log:/.test(l)))
})

// The CLI contract, end to end: stdin → process → stdout, exit code always 0.
const run = (args, stdin, e) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [BIN, ...args], { env: { PATH: process.env.PATH, ...e } })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (c) => (stdout += c))
    child.stderr.on('data', (c) => (stderr += c))
    child.on('close', (code) => resolve({ code, stdout, stderr }))
    child.stdin.end(stdin)
  })

test('e2e: a long result comes back trimmed in Claude Code shape; garbage stdin and short results print nothing', async () => {
  const d = tmp()
  const r = await run(['post-tool-use'], JSON.stringify(input(lines(6000))), env(d))
  assert.equal(r.code, 0)
  const out = JSON.parse(r.stdout)
  assert.ok(out.hookSpecificOutput.updatedToolOutput.stdout.length <= 8000)
  const g = await run(['post-tool-use'], 'not json', env(d))
  assert.equal(g.code, 0)
  assert.equal(g.stdout, '')
  const s = await run(['post-tool-use'], JSON.stringify(input('fine\n')), env(d))
  assert.equal(s.stdout, '')
  const rep = await run(['report'], '', env(d))
  assert.match(rep.stdout, /2 tool results/)
  assert.match(rep.stdout, /trimmed 1/)
})

test('e2e: a thrown error prints its stderr line, exits 0 and logs kept with the error code', async () => {
  const d = tmp()
  // cwd: 5 makes join() inside loadConfig throw ERR_INVALID_ARG_TYPE.
  const r = await run(['post-tool-use'], JSON.stringify({ ...input(lines(10)), cwd: 5 }), env(d))
  assert.equal(r.code, 0)
  assert.equal(r.stdout, '')
  assert.match(r.stderr, /^trimhook: failed open: /)
  const raw = readFileSync(join(d, 'results.jsonl'), 'utf8')
  const rows = raw.split('\n').filter(Boolean)
  assert.equal(rows.length, 1)
  const rec = JSON.parse(rows[0])
  assert.deepEqual(Object.keys(rec), ['at', 'session', 'harness', 'tool', 'outcome', 'error'])
  assert.equal(rec.outcome, 'kept')
  assert.equal(rec.error, 'ERR_INVALID_ARG_TYPE')
  assert.equal(rec.session, 's1')
  assert.equal(rec.tool, 'Bash')
  assert.equal(rec.harness, 'claude')
  assert.ok(!raw.includes('must be of type'))
})

// Regression for 2026-09-24: the hook ran under Claude Code, wrote its log to the
// plugin data directory the harness sets for the hook process alone, and `trimhook
// report` in a terminal answered "no results logged yet". A log nobody can read is not
// a log.
test('the data dir ignores the harness plugin data dir, which only the hook process sees', () => {
  assert.equal(dataDir({ CLAUDE_PLUGIN_DATA: '/plugins/data/trimhook', HOME: '/home/a' }), join(homedir(), '.trimhook'))
  assert.equal(dataDir({ PLUGIN_DATA: '/codex/data/trimhook' }), join(homedir(), '.trimhook'))
  assert.equal(dataDir({ TRIMHOOK_DATA: '/tmp/elsewhere' }), '/tmp/elsewhere')
  assert.equal(dataDir({}), join(homedir(), '.trimhook'))
})
