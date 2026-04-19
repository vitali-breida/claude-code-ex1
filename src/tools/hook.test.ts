import { describe, it, expect, beforeEach } from "vitest";
import { intercept, escalationLog } from "./hook.ts";
import type Anthropic from "@anthropic-ai/sdk";

function makeToolUse(name: string, input: Record<string, unknown>): Anthropic.ToolUseBlock {
  return { type: "tool_use", id: "test-id", name, input };
}

// ── transfer_funds escalation ─────────────────────────────────────────────────

describe("intercept — transfer_funds", () => {
  it("allows transfers below the threshold", () => {
    const result = intercept(makeToolUse("transfer_funds", { amount: 999 }));
    expect(result.wasBlocked).toBe(false);
  });

  it("allows transfers exactly at the threshold", () => {
    const result = intercept(makeToolUse("transfer_funds", { amount: 1000 }));
    expect(result.wasBlocked).toBe(false);
  });

  // Regression: TRANSFER_THRESHOLD must not be 0 — all legitimate transfers would be blocked
  it("allows a $1 transfer (guards against zero threshold regression)", () => {
    const result = intercept(makeToolUse("transfer_funds", { amount: 1 }));
    expect(result.wasBlocked).toBe(false);
  });

  it("blocks transfers above the threshold and creates escalation ticket", () => {
    const before = escalationLog.length;
    const result = intercept(makeToolUse("transfer_funds", { amount: 1001 }));
    expect(result.wasBlocked).toBe(true);
    expect(result.escalationMessage).toContain("ESC-");
    expect(escalationLog.length).toBe(before + 1);
  });

  it("escalation message states the transfer was NOT processed", () => {
    const result = intercept(makeToolUse("transfer_funds", { amount: 5000 }));
    expect(result.escalationMessage).toContain("NOT been processed");
  });
});

// ── freeze_account escalation ─────────────────────────────────────────────────

describe("intercept — freeze_account", () => {
  it("Scenario: allows freeze with a normal reason", () => {
    const result = intercept(makeToolUse("freeze_account", { accountId: "SAVINGS-001", reason: "suspicious login" }));
    expect(result.wasBlocked).toBe(false);
  });

  it("Scenario: blocks freeze when reason contains 'bulk'", () => {
    const result = intercept(makeToolUse("freeze_account", { accountId: "SAVINGS-001", reason: "bulk audit sweep" }));
    expect(result.wasBlocked).toBe(true);
    expect(result.escalationMessage).toContain("ESC-");
    expect(result.escalationMessage).toContain("NOT been frozen");
  });

  it("Scenario: blocks freeze when reason contains 'system'", () => {
    const result = intercept(makeToolUse("freeze_account", { accountId: "SAVINGS-001", reason: "system maintenance" }));
    expect(result.wasBlocked).toBe(true);
  });

  it("keyword matching is case-insensitive", () => {
    const result = intercept(makeToolUse("freeze_account", { accountId: "SAVINGS-001", reason: "BULK cleanup" }));
    expect(result.wasBlocked).toBe(true);
  });
});

// ── other tools ───────────────────────────────────────────────────────────────

describe("intercept — other tools", () => {
  it("passes through get_account_balance without blocking", () => {
    const result = intercept(makeToolUse("get_account_balance", { accountId: "SAVINGS-001" }));
    expect(result.wasBlocked).toBe(false);
  });

  it("passes through get_exchange_rate without blocking", () => {
    const result = intercept(makeToolUse("get_exchange_rate", { from: "USD", to: "EUR" }));
    expect(result.wasBlocked).toBe(false);
  });
});
