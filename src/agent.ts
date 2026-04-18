import Anthropic from "@anthropic-ai/sdk";
import { TOOL_DEFINITIONS } from "./tools/definitions.ts";
import { executeToolHandler } from "./tools/handlers.ts";
import { intercept } from "./tools/hook.ts";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.MODEL ?? "claude-opus-4-5";

// ── Structured logger ─────────────────────────────────────────────────────────

function log(event: string, data: Record<string, unknown>): void {
  process.stderr.write(JSON.stringify({ ts: new Date().toISOString(), event, ...data }) + "\n");
}

export async function runAgent(
  userMessage: string,
  history: Anthropic.MessageParam[]
): Promise<string> {
  history.push({ role: "user", content: userMessage });

  while (true) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      tools: TOOL_DEFINITIONS,
      messages: history,
    });

    // Store the full content array — tool_use blocks must stay in history
    history.push({ role: "assistant", content: response.content });

    log("agent_iteration", { stop_reason: response.stop_reason });

    // ── Branch 1: Claude is done ─────────────────────────────────────────────
    if (response.stop_reason === "end_turn") {
      const textBlocks = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text);
      return textBlocks.join("\n");
    }

    // ── Branch 2: Claude wants to call tools ─────────────────────────────────
    if (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUseBlock of toolUseBlocks) {
        // ── Hook: check business rules before executing ──────────────────────
        const interceptResult = intercept(toolUseBlock);
        if (interceptResult.wasBlocked) {
          log("tool_escalated", { tool: toolUseBlock.name, input: toolUseBlock.input });
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUseBlock.id,
            content: interceptResult.escalationMessage!,
            is_error: false,
          });
          continue;
        }

        // ── Execute the tool handler ─────────────────────────────────────────
        const t0 = Date.now();
        const result = executeToolHandler(
          toolUseBlock.name,
          toolUseBlock.input as Record<string, unknown>
        );

        const isError = "error" in result;
        log("tool_call", {
          tool: toolUseBlock.name,
          input: toolUseBlock.input,
          status: isError ? "error" : "ok",
          durationMs: Date.now() - t0,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUseBlock.id,
          content: JSON.stringify(isError ? result.error : result.data),
          is_error: isError,
        });
      }

      // Feed results back as a user message — loop continues
    history.push({ role: "user", content: toolResults });
      continue;
    }

    // Unexpected stop_reason (e.g. "max_tokens") — surface it
    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`);
  }
}
