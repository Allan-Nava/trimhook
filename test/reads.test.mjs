import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { marker } from '../bin/lib/trim.mjs'
import { tmp } from './helpers.mjs'

const SCRIPT = new URL('../evals/reads.mjs', import.meta.url).pathname
// os.homedir() honours HOME on POSIX; CI runs on Ubuntu. The real ~/.claude is never read.
const run = (home, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH, HOME: home }, encoding: 'utf8' })
const use = (id, name, input) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } })
const result = (id, text) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content: text }] } })
const cut = (spill, elided = 21000, total = 29000) => `head${marker(elided, total, spill)}tail`
const claude = (home, name, entries) => {
  const p = join(home, '.claude', 'projects', 'p')
  mkdirSync(p, { recursive: true })
  writeFileSync(join(p, `${name}.jsonl`), entries.map((e) => JSON.stringify(e)).join('\n'))
}
const codex = (home, entries) => {
  const p = join(home, '.codex', 'sessions', '2026', '09', '28')
  mkdirSync(p, { recursive: true })
  writeFileSync(join(p, 'rollout-1.jsonl'), entries.map((e) => JSON.stringify({ type: 'response_item', payload: e })).join('\n'))
}
const stdout = (home) => {
  const r = run(home)
  assert.equal(r.status, 0, r.stderr)
  return r.stdout
}

const S = '/h/.trimhook/spill/s/t1.txt'

test('reads: a Read of the spill and a Bash sed of it both count as spill reads', () => {
  const home = tmp()
  const S2 = '/h/.trimhook/spill/s/t2.txt'
  claude(home, 'a', [use('t1', 'Bash', { command: 'npm test' }), result('t1', cut(S)), use('t2', 'Read', { file_path: S }), result('t2', 'x')])
  claude(home, 'b', [use('t1', 'Bash', { command: 'npm test' }), result('t1', cut(S2)), use('t2', 'Bash', { command: `sed -n 1,10p ${S2}` })])
  assert.match(stdout(home), /Read back within the window: 2 \(100\.0%\)/)
})

test('reads: a re-run is the same command, file or URL for its own tool', () => {
  const home = tmp()
  claude(home, 's', [
    use('r1', 'Read', { file_path: '/a/big.ts' }),
    result('r1', cut(null)),
    use('r2', 'Read', { file_path: '/a/big.ts', offset: 100 }),
    use('w1', 'WebFetch', { url: 'https://e.x/a' }),
    result('w1', cut(null)),
    use('w2', 'WebFetch', { url: 'https://e.x/a' }),
    use('b1', 'Bash', { command: 'npm test' }),
    result('b1', cut(null)),
    use('b2', 'Bash', { command: 'npm test -- --grep x' }),
  ])
  assert.match(stdout(home), /Same call made again within the window: 2 \(66\.7%\)/)
})

test('reads: every marker in a result counts toward its size', () => {
  const home = tmp()
  claude(home, 's', [
    use('t1', 'Bash', { command: 'npm test' }),
    result('t1', `h${marker(3000, 6000, S)}m${marker(2000, 4000, S)}t`),
    use('t2', 'Bash', { command: 'npm run build' }),
    result('t2', cut(S, 1000, 9000)),
  ])
  const out = stdout(home)
  assert.ok(out.includes('2 cuts across 1 sessions (2 on Claude Code, 0 on Codex), 6,000 characters elided.'), out)
  assert.ok(out.includes('| Bash | 2 | 0 | 0 | 0.0% | 1 | 0.0% |'), out)
})

test('reads: buckets are the tool for Read and WebFetch and the command prefix for Bash, window only', () => {
  const home = tmp()
  claude(home, 's', [
    use('g', 'Bash', { command: 'git log --oneline' }),
    result('g', cut(S)),
    ...Array.from({ length: 13 }, (_, i) => use(`e${i + 1}`, 'Bash', { command: `echo ${i + 1}` })),
    use('late', 'Read', { file_path: S }),
    use('rb', 'Read', { file_path: '/a/big.ts' }),
    result('rb', cut(null)),
  ])
  const out = stdout(home)
  assert.ok(out.includes('later than that: 1 (50.0%)'), out)
  assert.ok(out.includes('| `git log` | 1 | 0 | 0 |'), out)
  assert.ok(out.includes('| `Read` | 1 | 0 | 0 |'), out)
})

test('reads: a cut that is itself a read of a spill is not counted', () => {
  const home = tmp()
  claude(home, 's', [
    use('t1', 'Bash', { command: 'npm test' }),
    result('t1', cut(S)),
    use('t2', 'Read', { file_path: S }),
    result('t2', cut('/h/.trimhook/spill/s/t2.txt')),
  ])
  const out = stdout(home)
  assert.ok(out.includes('1 cuts across 1 sessions'), out)
  assert.ok(out.includes('1 more cuts were themselves reads of a spill'), out)
  assert.ok(out.includes('Read back within the window: 1 (100.0%)'), out)
})

test('reads: Codex sessions are walked, custom and function tool outputs alike', () => {
  const home = tmp()
  codex(home, [
    { type: 'custom_tool_call', call_id: 'c1', name: 'exec', input: 'seq 1 6000' },
    { type: 'custom_tool_call_output', call_id: 'c1', output: [{ type: 'input_text', text: 'Script completed' }, { type: 'input_text', text: cut(S) }] },
    { type: 'custom_tool_call', call_id: 'c2', name: 'exec', input: `sed -n 1,5p ${S}` },
    { type: 'function_call', call_id: 'f1', name: 'shell', arguments: '{"command":["cat","big.log"]}' },
    { type: 'function_call_output', call_id: 'f1', output: JSON.stringify({ output: cut('/h/.trimhook/spill/s/f1.txt'), metadata: { exit_code: 0 } }) },
    { type: 'function_call', call_id: 'f2', name: 'shell', arguments: '{"command":["cat","big.log"]}' },
  ])
  const out = stdout(home)
  assert.ok(out.includes('(0 on Claude Code, 2 on Codex)'), out)
  assert.ok(out.includes('Read back within the window: 1 (50.0%)'), out)
  assert.ok(out.includes('Same call made again within the window: 1 (50.0%)'), out)
  assert.ok(out.includes('| `(codex)` | 2 | 1 | 1 |'), out)
})

test('reads: the D3 verdict picks 4,000, 8,000 or 12,000', () => {
  // Twenty Bash cuts in one session; `size(i)` is each cut's total, `reads` the cuts a
  // Read of their own spill follows.
  const session = (size, reads) => {
    const home = tmp()
    const entries = []
    for (let i = 0; i < 20; i++) {
      const spill = `/h/.trimhook/spill/s/c${i}.txt`
      const T = size(i)
      entries.push(use(`c${i}`, 'Bash', { command: `build --step ${i}` }), result(`c${i}`, cut(spill, T - 8000, T)))
      if (reads.includes(i)) entries.push(use(`r${i}`, 'Read', { file_path: spill }))
    }
    claude(home, 's', entries)
    return stdout(home)
  }
  const one = session(() => 29000, [0, 1])
  assert.match(one, /D3 rule, for a week run at cap 4,000: default 4,000 \(voting: Bash; unmeasured, under 20 cuts: Read, WebFetch\)/)
  const two = session((i) => (i < 10 ? 29000 : 9000), [10, 11, 12])
  assert.ok(two.includes('default 8,000'), two)
  const three = session(() => 29000, [0, 1, 2])
  assert.ok(three.includes('default 12,000'), three)
})

test('reads: an empty home prints the no-cut line, no verdict, and exits 0', () => {
  const r = run(tmp())
  assert.equal(r.status, 0, r.stderr)
  assert.ok(r.stdout.includes('No cut found'), r.stdout)
  assert.ok(!r.stdout.includes('D3 rule'), r.stdout)
})
