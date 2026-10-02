import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'

// trimhook:allow-private-shapes — this file defines the patterns it forbids.
//
// TH-37: this repository is public, and most of what it publishes is generated — an
// eval run, a committed scorecard, a commit message quoting a sample. Each of those
// carries whatever the tool read, which here is the author's own transcripts.
//
// The names worth forbidding — a client, a private repository, an internal host — cannot
// be listed here: a list of secrets in a public file publishes them. So this guard knows
// two things that need no list, and takes a third from outside:
//
//   shapes    a private IPv4 address, a key with a vendor's prefix, an email address.
//             Generic, safe to publish, and none of them has a reason to be in this tree.
//   this host the home directory of whoever runs `check`, read at runtime. On this
//             machine that catches a pasted path; in CI it is /home/runner and matches
//             nothing, which is honest — the guard is for the machine with the material.
//   a list    TRIMHOOK_PRIVATE_NAMES, a file of one forbidden substring per line, kept
//             outside the repository. Without it the names a shape cannot see get past.
const SHAPES = [
  [/(?:\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}|\b192\.168\.\d{1,3}\.\d{1,3}|\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/, 'a private IPv4 address'],
  [/AKIA[0-9A-Z]{16}/, 'an AWS access key id'],
  [/gh[posu]_[A-Za-z0-9]{30,}/, 'a GitHub token'],
  [/sk-[A-Za-z0-9_-]{24,}/, 'an API key'],
  [/xox[baprs]-[A-Za-z0-9-]{12,}/, 'a Slack token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}\b/, 'an email address'],
]

// A file that defines or tests these shapes has to contain them. It says so in a line of
// its own, which is visible in review in a way an allow-list of paths elsewhere is not —
// and the exemption is for the shapes only. A name from the external list is forbidden
// everywhere, marker or no marker: that is the rule nobody may opt out of.
export function privateStringRules(env = process.env, home = homedir()) {
  const rules = SHAPES.map(([re, what]) => ({ re, what }))
  // A home of "/" or "/root" would match half the tree; a real one is deeper.
  if (home && home.split('/').filter(Boolean).length >= 2) {
    rules.push({ re: new RegExp(home.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), what: "this machine's home directory" })
  }
  const listPath = env.TRIMHOOK_PRIVATE_NAMES
  if (listPath) {
    let lines = []
    try {
      lines = readFileSync(listPath, 'utf8').split('\n')
    } catch {
      lines = []
    }
    for (const raw of lines) {
      const word = raw.trim()
      if (!word || word.startsWith('#')) continue
      rules.push({ re: new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), what: `a name from ${listPath}`, redact: true })
    }
  }
  return rules
}

export const ALLOW_SHAPES = '// trimhook:allow-private-shapes'
