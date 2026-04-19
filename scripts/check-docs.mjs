// Verifies that every tool name defined in definitions.ts is mentioned in README.md.
// Exits with code 1 if any tool is missing — used as a CI gate.
import { readFileSync } from "fs";

const definitions = readFileSync("src/tools/definitions.ts", "utf8");
const readme = readFileSync("README.md", "utf8");

const toolNames = [...definitions.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);

const missing = toolNames.filter((name) => !readme.includes(name));

if (missing.length > 0) {
  console.error("❌ Tools missing from README.md:", missing.join(", "));
  process.exit(1);
}

console.log(`✅ All ${toolNames.length} tools documented in README.md:`, toolNames.join(", "));
