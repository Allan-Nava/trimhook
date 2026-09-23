// Collapsing runs (TH-16). Pure, like the cut it feeds: no filesystem, no environment.
//
// Long output is rarely long because it says many things. It is long because it says one
// thing many times — a progress bar redrawn four hundred times, a loop printing the same
// line per file. The head-and-tail cut pays for that repetition at the same rate as for
// content: on the local corpus, 1,011,413 characters of near-identical lines survive the
// cut and reach the model, 3.8% of everything it reads (TH-15, 2026-09-23).
//
// This collapses a run of such lines to its first line and a count. It runs before the
// cut, so the budget then buys distinct content rather than the same line again; the
// spill file is written from the original, so nothing here is unrecoverable.
//
// Two strictnesses, because they carry different risks:
//
//   strict     lines must be byte-identical. Cannot lose information: the second copy
//              of a line says exactly what the first one did.
//   masked     lines must match once digits, hex blobs, spacing and colour codes are
//              masked. Catches the progress bar, whose whole point is that the numbers
//              move — but a run of `test 1 passed` … `test 9 passed` collapses too, and
//              which ones passed is then only in the spill.
//
// The default is strict, and `evals/local.mjs` prints what each is worth before anyone
// widens it.

// ANSI colour and cursor control, then the parts of a line that move without saying
// anything new. Deliberately narrow: every false positive is paid in content the model
// never sees.
const ANSI = /\[[0-9;?]*[ -/]*[@-~]/g

export const normaliseLine = (line) =>
  String(line)
    .replace(ANSI, '')
    .replace(/[0-9a-f]{8,}/gi, 'H')
    .replace(/\d+/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()

export function collapseMarker(n) {
  return `… [trimhook: ${n.toLocaleString('en-US')} more like it] …`
}

// A progress bar redraws with a carriage return and may never emit a newline at all, so
// both end a line here. Each line keeps the separator it was written with, so what
// survives is the original bytes of the lines that survive — this function only deletes.
const TOKENS = /([^\r\n]*)(\r\n|\r|\n|$)/g

function tokenise(text) {
  const out = []
  for (const m of text.matchAll(TOKENS)) {
    // matchAll yields one empty match past the last separator; it is not a line.
    if (m[1] === '' && m[2] === '' && m.index === text.length) break
    out.push({ line: m[1], sep: m[2] })
  }
  return out
}

// The text with each run of `minRun` or more matching lines reduced to its first line
// plus a marker, and the number of characters that removed. A run is collapsed only when
// doing so is actually shorter — a marker is not free.
export function collapseRuns(text, { minRun = 3, strict = true } = {}) {
  const s = String(text ?? '')
  if (!s) return { text: s, collapsed: 0, runs: 0 }
  const key = strict ? (l) => l : normaliseLine
  const tokens = tokenise(s)
  const out = []
  let collapsed = 0
  let runs = 0
  let i = 0
  while (i < tokens.length) {
    const k = key(tokens[i].line)
    let j = i + 1
    // A blank run is not worth naming: collapsing whitespace reads as damage, and it is
    // worth 769 characters in the whole corpus (TH-15).
    if (k !== '') while (j < tokens.length && key(tokens[j].line) === k) j++
    const n = j - i
    if (n >= minRun) {
      const dropped = tokens.slice(i + 1, j)
      const droppedChars = dropped.reduce((a, t) => a + t.line.length + t.sep.length, 0)
      const marker = collapseMarker(n - 1)
      // The marker takes the separator of the last line it replaces, so a blob written
      // with carriage returns alone stays that way — and a run that reaches the end of a
      // text with no final newline does not acquire one.
      const sep = tokens[j - 1].sep
      if (droppedChars > marker.length + sep.length) {
        out.push(tokens[i], { line: marker, sep })
        collapsed += droppedChars - (marker.length + sep.length)
        runs++
        i = j
        continue
      }
    }
    out.push(tokens[i])
    i++
  }
  return { text: out.map((t) => t.line + t.sep).join(''), collapsed, runs }
}
