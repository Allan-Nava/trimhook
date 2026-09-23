// Two harnesses, one file. Claude Code and Codex CLI send the same stdin JSON and
// differ in the answer shape. Detection trusts the hook's own signals before the
// ambient ones: an explicit TRIMHOOK_HARNESS, the plugin root each harness sets for
// this very process, the stdin shape (Codex carries `turn_id`, Claude Code
// `prompt_id`), and only then CLAUDECODE / CLAUDE_PROJECT_DIR / CODEX_HOME, which
// outlive the shell that set them — a Codex hook launched from a terminal opened
// inside Claude Code inherits CLAUDECODE. A manifest-only Codex install sets none of
// its variables (measured on 0.155.1), so the stdin rule is what recognises it.
import { homedir } from 'node:os'
import { join } from 'node:path'

export function detectHarnessSignal(env = process.env, input = {}) {
  if (env.TRIMHOOK_HARNESS === 'codex' || env.TRIMHOOK_HARNESS === 'claude') return { harness: env.TRIMHOOK_HARNESS, signal: 'TRIMHOOK_HARNESS' }
  if (env.CLAUDE_PLUGIN_ROOT) return { harness: 'claude', signal: 'CLAUDE_PLUGIN_ROOT' }
  if (env.PLUGIN_ROOT) return { harness: 'codex', signal: 'PLUGIN_ROOT' }
  if (input && input.turn_id && !input.prompt_id) return { harness: 'codex', signal: 'stdin' }
  if (input && input.prompt_id && !input.turn_id) return { harness: 'claude', signal: 'stdin' }
  if (env.CLAUDECODE) return { harness: 'claude', signal: 'CLAUDECODE' }
  if (env.CLAUDE_PROJECT_DIR) return { harness: 'claude', signal: 'CLAUDE_PROJECT_DIR' }
  if (env.CODEX_HOME) return { harness: 'codex', signal: 'CODEX_HOME' }
  return { harness: 'claude', signal: 'default' }
}
export const detectHarness = (env, input) => detectHarnessSignal(env, input).harness

export function dataDir(env = process.env) {
  return env.TRIMHOOK_DATA ?? env.CLAUDE_PLUGIN_DATA ?? env.PLUGIN_DATA ?? join(homedir(), '.trimhook')
}

// The tool_response shapes, read off 2026-09-23 transcripts rather than guessed:
//
//   Bash      {stdout, stderr, interrupted, isImage, noOutputExpected}   25,555 results
//   Read      {type: 'text', file: {filePath, content, numLines, …}}        680 results
//             — and {type: 'image', file: {base64, …}}, which is refused
//   WebFetch  {bytes, code, codeText, result, durationMs, url}             135 results
//
// Codex sends the model-facing output instead, a string or an object.
//
// Returns {stdout, stderr, rest, shape} or null when there is nothing text-like to trim.
// `shape` is what puts the text back where it came from: the harness ignores an
// updatedToolOutput that does not match the tool's own output shape, so a replacement
// changes the one field that holds the text and carries every other field through
// untouched.
export function readResponse(r) {
  if (typeof r === 'string') return { stdout: r, stderr: '', rest: null, shape: 'text' }
  if (!r || typeof r !== 'object') return null
  if (r.isImage) return null
  if (typeof r.stdout === 'string' || typeof r.stderr === 'string') return { stdout: r.stdout ?? '', stderr: r.stderr ?? '', rest: r, shape: 'bash' }
  // Read: the file's own content. An image Read has no text and a base64 body that must
  // never be cut — numLines and totalLines still describe the file, not the excerpt, so
  // they are left alone and the marker says what is missing.
  if (r.file && typeof r.file === 'object' && typeof r.file.content === 'string') {
    if (r.type === 'image' || typeof r.file.base64 === 'string') return null
    return { stdout: r.file.content, stderr: '', rest: r, shape: 'file' }
  }
  // WebFetch: the fetched text, beside the status and timing that describe the fetch.
  if (typeof r.result === 'string' && typeof r.url === 'string') return { stdout: r.result, stderr: '', rest: r, shape: 'result' }
  if (typeof r.output === 'string') return { stdout: r.output, stderr: '', rest: r, shape: 'output' }
  return null
}

// The JSON a handler prints to replace the result. `null` means fall through.
export function replacementOutput(harness, original, stdout, stderr, note) {
  if (harness === 'codex') {
    // learn.chatgpt.com/docs/hooks (2026-09-23): on PostToolUse, `decision: "block"`
    // "replaces the tool result with that feedback and continues the model from the
    // hook-provided message". The feedback is the trimmed output itself.
    const text = stderr ? `${stdout}\n[stderr]\n${stderr}` : stdout
    return { decision: 'block', reason: text, systemMessage: note }
  }
  const rest = original?.rest ?? {}
  const updated = (() => {
    switch (original?.shape) {
      case 'file':
        return { ...rest, file: { ...rest.file, content: stdout } }
      case 'result':
        return { ...rest, result: stdout }
      case 'output':
        return { ...rest, output: stdout }
      default:
        return { ...rest, stdout, stderr, interrupted: rest.interrupted ?? false, isImage: false }
    }
  })()
  return { hookSpecificOutput: { hookEventName: 'PostToolUse', updatedToolOutput: updated } }
}
