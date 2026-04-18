import Anthropic from "@anthropic-ai/sdk";
import type { EscalationRecord, EscalationRequest, InterceptResult } from "../types.ts";

// ── In-memory escalation log ──────────────────────────────────────────────────

export const escalationLog: EscalationRecord[] = [];
let ticketCounter = 1000;

// ── Escalation workflow ───────────────────────────────────────────────────────

function triggerEscalation(request: EscalationRequest): EscalationRecord {
  const ticketId = `ESC-${++ticketCounter}`;
  const record: EscalationRecord = {
    ticketId,
    timestamp: new Date().toISOString(),
    status: "pending_approval",
    request,
  };
  escalationLog.push(record);
  console.log(`\n[ESCALATION] Ticket ${ticketId} created: ${request.reason}`);
  return record;
}

// ── Pre-execution interceptor ─────────────────────────────────────────────────

const TRANSFER_THRESHOLD = 1000;

export function intercept(toolUseBlock: Anthropic.ToolUseBlock): InterceptResult {
  if (toolUseBlock.name === "freeze_account") {
    const reason = ((toolUseBlock.input as Record<string, unknown>).reason as string).toLowerCase();
    if (reason.includes("bulk") || reason.includes("system")) {
      const record = triggerEscalation({
        requestedTool: toolUseBlock.name,
        input: toolUseBlock.input as Record<string, unknown>,
        reason: `System-initiated freeze requires manager approval`,
      });
      return {
        wasBlocked: true,
        escalationMessage:
          `Automated freeze requires manager approval. ` +
          `Escalation ticket ${record.ticketId} has been created. ` +
          `The account has NOT been frozen and is pending approval.`,
      };
    }
    return { wasBlocked: false };
  }

  // Only transfer_funds is subject to the threshold rule
  if (toolUseBlock.name !== "transfer_funds") {
    return { wasBlocked: false };
  }

  const amount = (toolUseBlock.input as Record<string, unknown>).amount as number;

  if (amount > TRANSFER_THRESHOLD) {
    const record = triggerEscalation({
      requestedTool: toolUseBlock.name,
      input: toolUseBlock.input as Record<string, unknown>,
      reason: `Transfer of $${amount} exceeds the $${TRANSFER_THRESHOLD} threshold`,
    });

    return {
      wasBlocked: true,
      escalationMessage:
        `Transfer of $${amount} requires manager approval. ` +
        `Escalation ticket ${record.ticketId} has been created. ` +
        `The transfer has NOT been processed and is pending approval.`,
    };
  }

  return { wasBlocked: false };
}
