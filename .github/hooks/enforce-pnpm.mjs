import { Buffer } from 'node:buffer';
import process from 'node:process';

const TERMINAL_TOOLS = new Set([
  'run_in_terminal',
  'send_to_terminal',
  'create_and_run_task',
]);

const SHELL_NPM_PATTERN = /(?:^|&&|\|\||;|\n)\s*(?:sudo\s+)?npm(?=\s|$)/m;

const readStdin = async () => {
  const chunks = [];

  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks).toString('utf8');
};

const buildDenyResponse = () => {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: 'Use pnpm instead of npm in this workspace.',
      additionalContext: [
        'This repository uses pnpm.',
        'Replace npm install with pnpm add or pnpm install.',
        'Replace npm run <script> with pnpm <script> or pnpm run <script>.',
        'Replace npm exec <tool> with pnpm exec <tool>.',
      ].join(' '),
    },
  };
};

const isBlockedCommand = (command) => {
  return typeof command === 'string' && SHELL_NPM_PATTERN.test(command.trim());
};

const shouldBlockToolUse = (payload) => {
  if (!TERMINAL_TOOLS.has(payload.tool_name)) {
    return false;
  }

  if (payload.tool_name === 'create_and_run_task') {
    return isBlockedCommand(payload.tool_input?.task?.command);
  }

  return isBlockedCommand(payload.tool_input?.command);
};

const main = async () => {
  const rawInput = await readStdin();

  if (!rawInput.trim()) {
    process.stdout.write('{}');
    return;
  }

  let payload;

  try {
    payload = JSON.parse(rawInput);
  } catch {
    process.stdout.write('{}');
    return;
  }

  if (!shouldBlockToolUse(payload)) {
    process.stdout.write('{}');
    return;
  }

  process.stdout.write(JSON.stringify(buildDenyResponse()));
};

// eslint-disable-next-line antfu/no-top-level-await
await main();
