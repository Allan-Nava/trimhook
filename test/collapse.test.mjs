import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collapseMarker, collapseRuns, normaliseLine } from '../bin/lib/collapse.mjs'

const ESC = ''

test('a run of identical lines becomes its first line and a count', () => {
  const s = `start\n${'downloading\n'.repeat(50)}done\n`
  const r = collapseRuns(s)
  assert.equal(r.text, `start\ndownloading\n${collapseMarker(49)}\ndone\n`)
  assert.equal(r.runs, 1)
  assert.equal(r.collapsed, s.length - r.text.length)
})

test('collapsing only ever deletes: what survives is byte for byte what was there', () => {
  for (const s of [`a\nb\nc\n`, `x\nx\ny\n`, `${'same\n'.repeat(20)}`, `head\n${'same\n'.repeat(9)}tail`]) {
    const r = collapseRuns(s)
    assert.ok(r.text.length <= s.length, `${r.text.length} > ${s.length}`)
    // Every line of the result is either a marker or a line of the original, unchanged.
    for (const line of r.text.split('\n')) {
      if (line === '' || /^… \[trimhook: /.test(line)) continue
      assert.ok(s.split(/\r\n|\r|\n/).includes(line), `invented line: ${JSON.stringify(line)}`)
    }
  }
})

test('a run shorter than minRun, or one a marker would not shorten, is left alone', () => {
  assert.equal(collapseRuns('x\nx\ny\n').text, 'x\nx\ny\n', 'two lines is not a run')
  assert.equal(collapseRuns('x\nx\nx\ny\n').text, 'x\nx\nx\ny\n', 'three short lines cost less than the marker')
  assert.equal(collapseRuns('x\nx\nx\ny\n', { minRun: 2 }).text, 'x\nx\nx\ny\n', 'still not worth a marker')
  const long = `${'a line with some length to it\n'.repeat(3)}z\n`
  assert.ok(collapseRuns(long).collapsed > 0, 'three long lines are worth it')
})

test('strict compares bytes; masked folds the numbers, the hex and the colour codes', () => {
  const progress = ['downloaded 1 of 9', 'downloaded 2 of 9', 'downloaded 3 of 9', 'downloaded 4 of 9'].join('\n')
  assert.equal(collapseRuns(progress).collapsed, 0, 'strict keeps lines that differ')
  const masked = collapseRuns(progress, { strict: false })
  assert.ok(masked.collapsed > 0)
  assert.ok(masked.text.startsWith('downloaded 1 of 9\n'), 'the first line of the run is the one kept')

  assert.equal(normaliseLine(`${ESC}[32mok${ESC}[0m`), 'ok', 'colour codes are not content')
  assert.equal(normaliseLine('deadbeefcafe0123 built'), 'H built')
  assert.equal(normaliseLine('  spaced   out  '), 'spaced out')
  assert.notEqual(normaliseLine('error here'), normaliseLine('errors here'), 'the mask is narrow')
})

test('blank runs are left alone: collapsing whitespace reads as damage', () => {
  const s = `a\n${'\n'.repeat(40)}b\n`
  assert.equal(collapseRuns(s).collapsed, 0)
  assert.equal(collapseRuns(s, { strict: false }).collapsed, 0)
})

test('a progress blob written with carriage returns alone is collapsed, and stays \\r-separated', () => {
  const s = `${'fetching objects...\r'.repeat(30)}done\n`
  const r = collapseRuns(s)
  assert.ok(r.collapsed > 0, 'a blob with no newline in it is still lines')
  assert.ok(r.text.includes(`\r${collapseMarker(29)}\r`), 'the marker inherits the run separator')
  assert.ok(!r.text.slice(0, -1).includes('\n'), 'no newline is introduced')
})

test('the empty string, one line, and a text with no trailing separator', () => {
  assert.deepEqual(collapseRuns(''), { text: '', collapsed: 0, runs: 0 })
  assert.equal(collapseRuns('only').text, 'only')
  const s = `${'repeat me please\n'.repeat(9)}repeat me please`
  const r = collapseRuns(s)
  assert.ok(r.collapsed > 0)
  assert.ok(!r.text.endsWith('\n'), 'a missing final newline is not invented')
})
