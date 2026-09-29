import assert from 'node:assert/strict'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { commandPrefix, postToolUse } from '../bin/lib/handlers.mjs'
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
  assert.equal(await postToolUse(input(lines(5000), { tool_name: 'Glob' }), { env: env(d) }), null)
  assert.equal(await postToolUse(input(lines(5000), { tool_name: 'Read', tool_response: { type: 'image', file: { base64: 'AAAA' } } }), { env: env(d) }), null)
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

test('Codex: measured only until codex.replace is on; then continue false (default) or decision block (codex.mode) carries the trimmed text', async () => {
  const d = tmp()
  const codex = { TRIMHOOK_DATA: d, PLUGIN_ROOT: '/codex-plugin', TRIMHOOK_USER_CONFIG: join(d, 'user.json') }
  const codexInput = input(lines(5000), { turn_id: 't1', tool_response: lines(5000) })
  delete codexInput.hook_event_name
  assert.equal(await postToolUse(codexInput, { env: codex }), null)
  assert.equal(log(d)[0].outcome, 'would-trim')
  // The explicit cap pins the 8,000 bounds below, so the default can move without this test.
  writeFileSync(join(d, 'user.json'), JSON.stringify({ cap: 8000, codex: { replace: true } }))
  const out = await postToolUse(codexInput, { env: codex })
  assert.equal(out.continue, false)
  assert.equal(typeof out.stopReason, 'string')
  assert.equal('decision' in out, false)
  const cut = out.stopReason.lastIndexOf('\n')
  const last = out.stopReason.slice(cut + 1)
  const body = out.stopReason.slice(0, cut)
  assert.match(last, /^trimhook: [\d,]+ characters elided from this result; the whole output is at .+\.txt\.$/)
  assert.ok(body.length <= 8000)
  assert.match(body, /trimhook: [\d,]+ of/)
  assert.ok(body.endsWith('line 5000'))
  writeFileSync(join(d, 'user.json'), JSON.stringify({ cap: 8000, codex: { replace: true, mode: 'block' } }))
  const blocked = await postToolUse(codexInput, { env: codex })
  assert.equal(blocked.decision, 'block')
  assert.ok(blocked.reason.endsWith('\n' + blocked.systemMessage))
  assert.match(blocked.systemMessage, /^trimhook: /)
  assert.equal('continue' in blocked, false)
  assert.deepEqual(log(d).map((r) => r.outcome), ['would-trim', 'trimmed', 'trimmed'])
  assert.equal(log(d)[2].harness, 'codex')
})

test('a broken config is a problem for doctor, not a change to the result', async () => {
  const d = tmp()
  writeFileSync(join(d, 'user.json'), '{not json')
  const out = await postToolUse(input(lines(5000)), { env: env(d) })
  assert.ok(out.hookSpecificOutput.updatedToolOutput.stdout.length <= 8000, 'defaults applied')
})

test('runs of repeated lines are collapsed before the cut, and the spill keeps them all', async () => {
  const d = tmp()
  const repeated = 'downloading a package from somewhere\n'.repeat(400)
  const out = await postToolUse(input(`${lines(60)}\n${repeated}${lines(60)}`), { env: env(d) })
  const u = out.hookSpecificOutput.updatedToolOutput
  assert.match(u.stdout, /… \[trimhook: 399 more like it\] …/)
  assert.equal(u.stdout.split('downloading a package from somewhere').length - 1, 1, 'the run is down to one line')
  // Collapsing alone brings this under the cap, so there is no elision at all: the head
  // and the tail are the whole output.
  assert.ok(!/characters elided/.test(u.stdout), 'no middle was cut')
  assert.ok(u.stdout.startsWith('line 1\n') && u.stdout.endsWith('line 60'))
  const [r] = log(d)
  assert.equal(r.outcome, 'trimmed')
  assert.equal(r.elided, 0)
  assert.ok(r.collapsed > 14000, `collapsed ${r.collapsed}`)
  assert.equal(readFileSync(r.spill, 'utf8').split('downloading a package from somewhere').length - 1, 400, 'the spill has every line')
})

test('collapsing is off when the config says so, and never fires under the cap', async () => {
  const d = tmp()
  writeFileSync(join(d, 'user.json'), JSON.stringify({ collapse: { enabled: false } }))
  const out = await postToolUse(input('a repeated line of output\n'.repeat(400)), { env: env(d) })
  assert.ok(!/more like it/.test(out.hookSpecificOutput.updatedToolOutput.stdout), 'no collapsing')
  assert.match(out.hookSpecificOutput.updatedToolOutput.stdout, /characters elided/)

  const d2 = tmp()
  assert.equal(await postToolUse(input('short\n'.repeat(3)), { env: env(d2) }), null)
  assert.deepEqual(log(d2).map((r) => r.outcome), ['kept'])
})

test('a long Read is cut inside the file content, and the rest of the shape is untouched', async () => {
  const d = tmp()
  const content = lines(5000)
  const res = { type: 'text', file: { filePath: '/a/big.ts', content, numLines: 5000, startLine: 1, totalLines: 5000 } }
  const out = await postToolUse(input('', { tool_name: 'Read', tool_input: { file_path: '/a/big.ts' }, tool_response: res }), { env: env(d) })
  const u = out.hookSpecificOutput.updatedToolOutput
  assert.equal(u.type, 'text')
  assert.equal(u.file.filePath, '/a/big.ts')
  // numLines and totalLines describe the file, not the excerpt: the marker says what is
  // missing, and rewriting them would be a second, quieter lie.
  assert.equal(u.file.totalLines, 5000)
  assert.ok(u.file.content.length <= 8000)
  assert.match(u.file.content, /… \[trimhook: [\d,]+ of [\d,]+ characters elided/)
  const [r] = log(d)
  assert.equal(r.tool, 'Read')
  assert.equal(r.command, 'Read')
  assert.equal(readFileSync(r.spill, 'utf8'), content)
})

test('a long WebFetch is cut inside the fetched text, with the status and timing kept', async () => {
  const d = tmp()
  const res = { bytes: 999, code: 200, codeText: 'OK', result: lines(5000), durationMs: 2113, url: 'https://example.com/x' }
  const out = await postToolUse(input('', { tool_name: 'WebFetch', tool_input: { url: 'https://example.com/x' }, tool_response: res }), { env: env(d) })
  const u = out.hookSpecificOutput.updatedToolOutput
  assert.equal(u.code, 200)
  assert.equal(u.url, 'https://example.com/x')
  assert.equal(u.durationMs, 2113)
  assert.ok(u.result.length <= 8000)
  assert.equal(log(d)[0].tool, 'WebFetch')
})

test('a tool not on the list is left alone, however long its output', async () => {
  const d = tmp()
  writeFileSync(join(d, 'user.json'), JSON.stringify({ tools: ['Bash'] }))
  const res = { type: 'text', file: { filePath: '/a/big.ts', content: lines(5000), numLines: 5000, startLine: 1, totalLines: 5000 } }
  assert.equal(await postToolUse(input('', { tool_name: 'Read', tool_response: res }), { env: env(d) }), null)
})

// Found 2026-09-24 by evals/reads.mjs, which prints these prefixes in a table and showed
// a filesystem path where a command name belongs. The log is supposed to carry sizes and
// a command name, never a value — and a leading assignment made the value the name.
test('the logged command name never carries an assignment or a path', () => {
  assert.equal(commandPrefix('AWS_SECRET_ACCESS_KEY=wJalrXUt npm run deploy'), 'npm run')
  assert.equal(commandPrefix('TOKEN=sk-abc123 curl https://api.example.com'), 'curl')
  assert.equal(commandPrefix('S=/private/tmp/secret-dir; echo hi'), 'echo')
  assert.equal(commandPrefix('/usr/local/bin/python3 /home/me/private/report.py'), 'python3 report.py')
  assert.equal(commandPrefix('./scripts/deploy.sh --now'), 'deploy.sh')
  assert.equal(commandPrefix('X=1'), '(env)', 'nothing but assignments names no command')
  assert.ok(commandPrefix(`${'a'.repeat(200)} arg`).length <= 32, 'no unbounded token')
  // The cases that already worked keep working.
  assert.equal(commandPrefix('cd /repo && git status'), 'git status')
  assert.equal(commandPrefix('npm test'), 'npm test')
  assert.equal(commandPrefix('seq 1 5000'), 'seq')
})

// TH-24: the spill is written only when the cut is taken. It used to be written before
// the decision, so every result of a listed tool left a whole copy on disk for a week.
test('a result that is kept whole leaves no spill file', async () => {
  const d = tmp()
  assert.equal(await postToolUse(input('ok\n'), { env: env(d) }), null)
  // Over the cap, but under minSaving: the cut is not worth taking, so nothing is written.
  assert.equal(await postToolUse(input('x'.repeat(8500)), { env: env(d) }), null)
  assert.deepEqual(log(d).map((r) => r.outcome), ['kept', 'kept'])
  assert.equal(existsSync(join(d, 'spill')), false, 'no spill for results the model saw in full')
  const out = await postToolUse(input(lines(5000)), { env: env(d) })
  const path = out.hookSpecificOutput.updatedToolOutput.stdout.match(/Full output: (\S+)\]/)[1]
  assert.ok(existsSync(path), 'the cut result still spills')
})

test('when the spill cannot be written, the result is left whole (rule 3)', async () => {
  const d = tmp()
  writeFileSync(join(d, 'spill'), 'a file where the directory should be')
  assert.equal(await postToolUse(input(lines(5000)), { env: env(d) }), null)
  const [r] = log(d)
  assert.equal(r.outcome, 'kept')
  assert.equal(r.spillFailed, true)
  assert.equal(r.after, r.before)
})

test('with spill turned off the cut is taken and the marker names no file', async () => {
  const d = tmp()
  const repo = join(d, 'repo')
  const { mkdirSync } = await import('node:fs')
  mkdirSync(repo)
  writeFileSync(join(d, 'user.json'), JSON.stringify({ spill: false }))
  const out = await postToolUse(input(lines(5000), { cwd: repo }), { env: env(d, { TRIMHOOK_USER_CONFIG: join(d, 'user.json') }) })
  const u = out.hookSpecificOutput.updatedToolOutput
  assert.ok(u.stdout.length <= 8000)
  assert.doesNotMatch(u.stdout, /Full output:/)
  assert.equal(existsSync(join(d, 'spill')), false)
})

// TH-26, open: the spill exists so the model can read the middle it did not see, but a
// Read of it is cut like any other Read. Kept as a todo so the reproduction runs in CI
// without failing it; the fix turns it into an ordinary test.
test('a Read of a spill file comes back whole', { todo: 'TH-26 — a read of a spill file is cut again' }, async () => {
  const d = tmp()
  const out = await postToolUse(input(lines(5000)), { env: env(d) })
  const path = out.hookSpecificOutput.updatedToolOutput.stdout.match(/Full output: (\S+)\]/)[1]
  const content = readFileSync(path, 'utf8')
  const res = { type: 'text', file: { filePath: path, content, numLines: 5000, startLine: 1, totalLines: 5000 } }
  assert.equal(await postToolUse(input('', { tool_name: 'Read', tool_input: { file_path: path }, tool_response: res }), { env: env(d) }), null)
})
