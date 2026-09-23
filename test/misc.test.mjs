import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { readFileSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { capFor, loadConfig } from '../bin/lib/config.mjs'
import { doctor } from '../bin/lib/doctor.mjs'
import { detectHarnessSignal, readResponse, replacementOutput } from '../bin/lib/harness.mjs'
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

test('doctor: writable data dir, config problems are BAD, the harness cap is a warning', () => {
  const d = tmp()
  let r = doctor({ cwd: d, env: env(d) })
  assert.equal(r.broken, false)
  r = doctor({ cwd: d, env: env(d, { BASH_MAX_OUTPUT_LENGTH: '4000' }) })
  assert.ok(r.lines.some((l) => /warn.*BASH_MAX_OUTPUT_LENGTH=4000 is below/.test(l)))
  writeFileSync(join(d, 'user.json'), '{nope')
  assert.equal(doctor({ cwd: d, env: env(d) }).broken, true)
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
