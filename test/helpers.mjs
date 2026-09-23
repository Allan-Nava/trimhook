import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const tmp = () => mkdtempSync(join(tmpdir(), 'trimhook-'))
// TRIMHOOK_USER_CONFIG points inside the temp dir so a real ~/.trimhook.json never leaks in.
export const env = (dir, extra = {}) => ({ TRIMHOOK_DATA: dir, CLAUDE_PLUGIN_ROOT: '/plugin', TRIMHOOK_USER_CONFIG: join(dir, 'user.json'), ...extra })
export const lines = (n, prefix = 'line') => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`).join('\n')
export const input = (stdout, extra = {}) => ({
  hook_event_name: 'PostToolUse',
  session_id: 's1',
  tool_use_id: 'toolu_01',
  tool_name: 'Bash',
  tool_input: { command: 'npm test' },
  tool_response: { stdout, stderr: '', interrupted: false, isImage: false },
  cwd: '/tmp/repo',
  ...extra,
})
