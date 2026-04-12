// block-env-files.js
// PreToolUse hook: blocks Read, Edit, Bash access to .env files

let raw = '';
process.stdin.on('data', chunk => raw += chunk);
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw || '{}');
    const toolInput = input.tool_input || {};

    const filePath = toolInput.file_path || '';
    const command  = toolInput.command  || '';

    // Matches: .env  .env.local  .env.production  etc.
    const envFilePattern = /(^|[/\\])\.env(\.|$)/;
    // Matches .env or .env.something appearing in a shell command
    const envCmdPattern  = /(?<![a-zA-Z0-9])\.env(?:\b|\.)/;

    const blocked = envFilePattern.test(filePath) || envCmdPattern.test(command);

    if (blocked) {
      console.log(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: '.env files are blocked — they contain sensitive credentials (API keys, secrets)',
        },
      }));
    }
  } catch (_) {
    // Parse error — don't block
  }
});
