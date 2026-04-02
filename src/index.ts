import "dotenv/config";
import * as readline from "readline";
import Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "./agent.ts";

const history: Anthropic.MessageParam[] = [];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('Finance Assistant ready. Type your message or "exit" to quit.\n');

function prompt() {
  rl.question("> ", async (line) => {
    const input = line.trim();

    if (!input) return prompt();
    if (input === "exit") { rl.close(); return; }

    try {
      const response = await runAgent(input, history);
      console.log(`\n${response}\n`);
    } catch (err) {
      console.error("Error:", err);
    }

    prompt();
  });
}

prompt();
