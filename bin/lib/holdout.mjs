// TH-31: the control group. A share of the results trimhook would cut is left whole, so
// TH-10's week can compare what the model does after a cut with what it does after the
// same kind of result uncut — a measured cost, not an estimate (headroom offers the same
// holdout for its output savings). Chosen from a hash of the tool-use id, so the hook and
// `evals/reads.mjs` agree on who was held out without the log carrying the id, and a run
// is reproducible. Pure: no filesystem, no clock, no randomness.
import { createHash } from 'node:crypto'

// True when `id` falls in the first `share` of the hash space. Monotone in the share: an
// id held out at 0.1 is held out at 0.2. Never without an id, never at share 0.
export function heldOut(id, share) {
  if (typeof id !== 'string' || !id || !(share > 0)) return false
  const x = parseInt(createHash('sha256').update(id).digest('hex').slice(0, 8), 16) / 0x100000000
  return x < share
}
