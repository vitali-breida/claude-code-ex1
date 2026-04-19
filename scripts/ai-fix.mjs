// Reads failing test output, calls Claude API, applies a fix commit, and comments on the PR.
// Runs inside GitHub Actions after a test failure on a pull request.
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

const testOutput = readFileSync("test-output.txt", "utf8");
const prNumber = process.env.PR_NUMBER;

// ── Extract failing source files from vitest output ───────────────────────────
// vitest prints lines like: ❯ src/tools/hook.test.ts:14:31
const testFilePaths = [...testOutput.matchAll(/❯\s+(src\/[^\s:]+\.test\.ts)/g)]
  .map((m) => m[1]);
const sourceFilePaths = [...new Set(testFilePaths.map((f) => f.replace(".test.ts", ".ts")))];

// Always include hook.ts and handlers.ts as they contain business logic
const filesToRead = [...new Set([...sourceFilePaths, "src/tools/hook.ts", "src/tools/handlers.ts", "src/types.ts"])];

const filesContext = filesToRead
  .filter(existsSync)
  .map((f) => `### ${f}\n\`\`\`typescript\n${readFileSync(f, "utf8")}\n\`\`\``)
  .join("\n\n");

// ── Call Claude ───────────────────────────────────────────────────────────────
const anthropic = new Anthropic();

const response = await anthropic.messages.create({
  model: process.env.MODEL ?? "claude-opus-4-5",
  max_tokens: 4096,
  messages: [
    {
      role: "user",
      content: `You are an automated code fixer working on a TypeScript project.
A CI test failed on a pull request. Analyze the failure and provide a minimal fix.

## Failing test output
\`\`\`
${testOutput}
\`\`\`

## Source files
${filesContext}

## Instructions
- Fix ONLY what the test output indicates is broken
- Do not refactor, rename, or change anything unrelated to the failure
- If you cannot determine a safe, minimal fix, respond with <no-fix>reason</no-fix>
- For each file that needs to change, respond using this format exactly:

<fix>
<file>src/path/to/file.ts</file>
<content>
[complete new file content]
</content>
</fix>`,
    },
  ],
});

const text = response.content[0].text;

// ── Handle no-fix case ────────────────────────────────────────────────────────
const noFixMatch = text.match(/<no-fix>([\s\S]*?)<\/no-fix>/);
if (noFixMatch) {
  const reason = noFixMatch[1].trim();
  console.log("AI could not determine a safe fix:", reason);
  execSync(
    `gh pr comment ${prNumber} --body "🤖 **AI Fix Attempted** — could not determine a safe fix automatically.\n\n**Reason:** ${reason}\n\nManual review required."`,
    { stdio: "inherit" }
  );
  process.exit(0);
}

// ── Parse and apply fixes ─────────────────────────────────────────────────────
const fixes = [...text.matchAll(/<fix>\s*<file>(.*?)<\/file>\s*<content>([\s\S]*?)<\/content>\s*<\/fix>/g)];

if (fixes.length === 0) {
  console.log("No fix blocks found in AI response. Skipping.");
  process.exit(0);
}

for (const [, filePath, content] of fixes) {
  const path = filePath.trim();
  const fileContent = content.replace(/^\n/, "").replace(/\n$/, "");
  console.log(`Applying fix to ${path}`);
  writeFileSync(path, fileContent);
}

// ── Commit and push ───────────────────────────────────────────────────────────
execSync('git config user.name "github-actions[bot]"');
execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');

const changedPaths = fixes.map(([, f]) => f.trim()).join(" ");
execSync(`git add ${changedPaths}`);
execSync(`git commit -m "fix(ai): automated fix for failing tests [needs-review]"`);
execSync("git push");

// ── Comment on PR ─────────────────────────────────────────────────────────────
const fixedList = fixes.map(([, f]) => `- \`${f.trim()}\``).join("\n");
execSync(
  `gh pr comment ${prNumber} --body "🤖 **AI Auto-Fix Applied** *(needs human review before merge)*\n\nI detected failing tests and committed a fix to:\n${fixedList}\n\nPlease review the changes carefully. The commit is tagged \`[needs-review]\`."`,
  { stdio: "inherit" }
);

console.log("AI fix applied and pushed.");
