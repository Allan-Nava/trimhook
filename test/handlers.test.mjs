import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { postToolUse } from '../bin/lib/handlers.mjs'
import { env, input, lines, tmp } from './helpers.mjs'

const log = (d) => readFileSync(join(d, 'results.jsonl'), 'utf8').trim().split('\n').map(JSON.parse)

test('a short result is left alone and logged as kept', async () => {
  const d = tmp()
  assert.equal(await postToolUse(input('ok\n'), { env: env(d) }), null)
  assert.deepEqual(log(d).map((r) => r.outcome), ['kept'])
})

test('a long result is replaced in Claude Code shape, spilled to a 0600 file the marker names', async () => {
  const d = tmp()
  const out = await postToolUse(input(lines(5000)), { env: env(d) })
  const u = out.hookSpecificOutput.updatedToolOutput
  assert.equal(out.hookSpecificOutput.hookEventName, 'PostToolUse')
  assert.ok(u.stdout.length <= 8000)
  assert.equal(u.stderr, '')
  assert.equal(u.interrupted, false)
  assert.equal(u.isImage, false)
  const path = u.stdout.match(/Full output: (\S+)\]/)[1]
  assert.ok(existsSync(path))
  assert.ok(path.startsWith(join(d, 'spill', 's1')))
  assert.equal(statSync(path).mode & 0o777, 0o600)
  assert.equal(readFileSync(path, 'utf8'), lines(5000))
  const [r] = log(d)
  assert.equal(r.outcome, 'trimmed')
  assert.equal(r.command, 'npm test')
  assert.ok(r.before > r.after)
  assert.equal(r.spill, path)
})

test('other tools, images and unknown response shapes fall through', async () => {
  const d = tmp()
  assert.equal(await postToolUse(input(lines(5000), { tool_name: 'Read' }), { env: env(d) }), null)
  assert.equal(await postToolUse(input(lines(5000), { tool_response: { stdout: lines(5000), isImage: true } }), { env: env(d) }), null)
  assert.equal(await postToolUse(input(lines(5000), { tool_response: 42 }), { env: env(d) }), null)
  assert.equal(await postToolUse(input(lines(5000), { tool_response: { weird: true } }), { env: env(d) }), null)
})

test('audit mode measures and never replaces; the log says would-trim', async () => {
  const d = tmp()
  assert.equal(await postToolUse(input(lines(5000)), { env: env(d, { TRIMHOOK_MODE: 'audit' }) }), null)
  assert.equal(log(d)[0].outcome, 'would-trim')
  assert.equal(existsSync(join(d, 'spill')), false, 'audit spills nothing')
})

test('per-command caps and the env cap apply; a repository file is read', async () => {
  const d = tmp()
  const repo = join(d, 'repo')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(repo)
  writeFileSync(join(repo, '.trimhook.json'), JSON.stringify({ perCommand: { 'git log': 1000 } }))
  const out = await postToolUse(input(lines(400), { cwd: repo, tool_input: { command: 'git log --oneline' } }), { env: env(d) })
  assert.ok(out.hookSpecificOutput.updatedToolOutput.stdout.length <= 1000)
  const big = await postToolUse(input(lines(2000), { cwd: repo }), { env: env(d, { TRIMHOOK_CAP: '3000' }) })
  assert.ok(big.hookSpecificOutput.updatedToolOutput.stdout.length <= 3000)
})

test('Codex: measured only until codex.replace is on; then decision block carries the trimmed text', async () => {
  const d = tmp()
  const codex = { TRIMHOOK_DATA: d, PLUGIN_ROOT: '/codex-plugin', TRIMHOOK_USER_CONFIG: join(d, 'user.json') }
  const codexInput = input(lines(5000), { turn_id: 't1', tool_response: lines(5000) })
  delete codexInput.hook_event_name
  assert.equal(await postToolUse(codexInput, { env: codex }), null)
  assert.equal(log(d)[0].outcome, 'would-trim')
  writeFileSync(join(d, 'user.json'), JSON.stringify({ codex: { replace: true } }))
  const out = await postToolUse(codexInput, { env: codex })
  assert.equal(out.decision, 'block')
  assert.ok(out.reason.length <= 8000)
  assert.match(out.reason, /trimhook: [\d,]+ of/)
  assert.match(out.systemMessage, /^trimhook: /)
  assert.equal(log(d)[1].outcome, 'trimmed')
  assert.equal(log(d)[1].harness, 'codex')
})

test('a broken config is a problem for doctor, not a change to the result', async () => {
  const d = tmp()
  writeFileSync(join(d, 'user.json'), '{not json')
  const out = await postToolUse(input(lines(5000)), { env: env(d) })
  assert.ok(out.hookSpecificOutput.updatedToolOutput.stdout.length <= 8000, 'defaults applied')
})
