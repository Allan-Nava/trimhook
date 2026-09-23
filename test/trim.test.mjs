import assert from 'node:assert/strict'
import { test } from 'node:test'
import { marker, splitBudget, trimResult, trimText } from '../bin/lib/trim.mjs'
import { lines } from './helpers.mjs'

test('a result under the budget is returned untouched', () => {
  const r = trimText('short', 100, 0.6, null)
  assert.equal(r.text, 'short')
  assert.equal(r.elided, 0)
})

test('a long result keeps its head and tail, pays for the marker, and never exceeds the budget', () => {
  const s = lines(5000)
  for (const budget of [2000, 8000, 20000]) {
    const r = trimText(s, budget, 0.6, '/data/spill/s/t.txt')
    assert.ok(r.text.length <= budget, `${r.text.length} > ${budget}`)
    assert.ok(r.text.startsWith('line 1\nline 2\n'), 'head kept')
    assert.ok(r.text.endsWith('line 4999\nline 5000'), 'tail kept')
    assert.match(r.text, /… \[trimhook: [\d,]+ of [\d,]+ characters elided\. Full output: \/data\/spill\/s\/t\.txt\] …/)
    assert.equal(r.elided, s.length - (r.text.length - marker(r.elided, s.length, '/data/spill/s/t.txt').length))
  }
})

test('cuts snap to line boundaries so the marker never lands mid-line', () => {
  const r = trimText(lines(3000, 'a fairly long line of output'), 4000, 0.5, null)
  const [head, tail] = r.text.split(/\n… \[trimhook:[^\n]*\n/)
  assert.ok(head.endsWith('\n') || /\d$/.test(head), 'head ends at a line end')
  assert.ok(/^a fairly long line of output \d+/.test(tail), 'tail starts at a line start')
})

test('stdout and stderr share the cap proportionally, with a floor for stderr', () => {
  assert.deepEqual(splitBudget(8000, 3000, 1000), { out: 3000, err: 1000 })
  assert.deepEqual(splitBudget(8000, 20000, 0), { out: 8000, err: 0 })
  assert.deepEqual(splitBudget(8000, 0, 20000), { out: 0, err: 8000 })
  const b = splitBudget(8000, 100000, 500)
  assert.equal(b.err, 500, 'a short stderr is kept whole')
  assert.equal(b.out, 7500)
  const c = splitBudget(8000, 50000, 50000)
  assert.equal(c.out + c.err, 8000)
})

test('trimResult: null under the cap, null when the saving is below minSaving, a cut otherwise', () => {
  const cfg = { cap: 8000, head: 0.6, minSaving: 1500 }
  assert.equal(trimResult({ stdout: 'x'.repeat(7000), stderr: '' }, cfg, null), null)
  assert.equal(trimResult({ stdout: 'x'.repeat(9000), stderr: '' }, cfg, null), null, '1,000 saved is under minSaving')
  const r = trimResult({ stdout: lines(4000), stderr: 'warn\n'.repeat(100) }, cfg, '/p')
  assert.ok(r.after <= 8000)
  assert.equal(r.before, lines(4000).length + 500)
  assert.ok(r.elided > 0)
})
