// The cut. Pure: no filesystem, no environment, so every branch is unit-tested.
//
// A result longer than the cap keeps its head and its tail — the first lines say what
// ran, the last say how it ended — and loses the middle to one marker line that states
// how much was elided and where the whole output is. Cuts fall on line boundaries when
// a line boundary is within reach, so a marker never lands mid-word.

export function marker(elided, total, path) {
  const where = path ? ` Full output: ${path}` : ''
  return `\n… [trimhook: ${elided.toLocaleString('en-US')} of ${total.toLocaleString('en-US')} characters elided.${where}] …\n`
}

// Snap a cut index to the nearest newline within `slack` characters, preferring to
// keep less rather than more so the budget is never exceeded.
const snapDown = (s, i, slack = 200) => {
  const nl = s.lastIndexOf('\n', i)
  return nl >= 0 && i - nl <= slack ? nl + 1 : i
}
const snapUp = (s, i, slack = 200) => {
  const nl = s.indexOf('\n', i)
  return nl >= 0 && nl - i <= slack ? nl + 1 : i
}

export function trimText(text, budget, headShare, path) {
  const s = String(text ?? '')
  if (s.length <= budget) return { text: s, elided: 0 }
  // The marker is paid for out of the budget, so the result never exceeds it.
  const room = Math.max(200, budget - marker(s.length, s.length, path).length)
  const headLen = snapDown(s, Math.floor(room * headShare))
  const tailStart = snapUp(s, s.length - (room - headLen))
  const elided = tailStart - headLen
  return { text: s.slice(0, headLen) + marker(elided, s.length, path) + s.slice(tailStart), elided }
}

// stdout and stderr share one cap. Each gets a slice proportional to its size, with a
// floor so a short stderr is never squeezed out by a huge stdout.
export function splitBudget(cap, outLen, errLen) {
  const total = outLen + errLen
  if (total <= cap) return { out: outLen, err: errLen }
  if (!errLen) return { out: cap, err: 0 }
  if (!outLen) return { out: 0, err: cap }
  const floor = Math.min(errLen, Math.floor(cap * 0.2))
  const err = Math.max(floor, Math.floor((cap * errLen) / total))
  return { out: cap - err, err }
}

// The whole decision for one result: returns null when nothing should change.
export function trimResult({ stdout, stderr }, { cap, head, minSaving }, path) {
  const total = stdout.length + stderr.length
  if (total <= cap || total - cap < minSaving) return null
  const b = splitBudget(cap, stdout.length, stderr.length)
  const o = trimText(stdout, b.out, head, path)
  const e = trimText(stderr, b.err, head, path)
  return { stdout: o.text, stderr: e.text, before: total, after: o.text.length + e.text.length, elided: o.elided + e.elided }
}
