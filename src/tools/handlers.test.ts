import { describe, it, expect, beforeEach } from "vitest";
import { executeToolHandler } from "./handlers.ts";

// ── get_account_balance ───────────────────────────────────────────────────────

describe("get_account_balance", () => {
  it("returns balance for a known account", () => {
    const result = executeToolHandler("get_account_balance", { accountId: "SAVINGS-001" });
    expect(result).toEqual({ data: { accountId: "SAVINGS-001", balance: 2340.5, currency: "USD" } });
  });

  it("returns validation error for unknown account", () => {
    const result = executeToolHandler("get_account_balance", { accountId: "UNKNOWN-999" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.errorCategory).toBe("validation");
      expect(result.error.isRetryable).toBe(false);
    }
  });
});

// ── get_transaction_history ───────────────────────────────────────────────────

describe("get_transaction_history", () => {
  it("returns up to 5 transactions by default", () => {
    const result = executeToolHandler("get_transaction_history", { accountId: "SAVINGS-001" });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      const data = result.data as { transactions: unknown[] };
      expect(data.transactions.length).toBeLessThanOrEqual(5);
    }
  });

  it("respects the limit parameter", () => {
    const result = executeToolHandler("get_transaction_history", { accountId: "SAVINGS-001", limit: 2 });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      const data = result.data as { transactions: unknown[] };
      expect(data.transactions).toHaveLength(2);
    }
  });

  it("returns validation error for unknown account", () => {
    const result = executeToolHandler("get_transaction_history", { accountId: "UNKNOWN-999" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.errorCategory).toBe("validation");
  });
});

// ── transfer_funds ────────────────────────────────────────────────────────────

describe("transfer_funds", () => {
  it("completes a valid transfer", () => {
    const result = executeToolHandler("transfer_funds", {
      fromAccount: "SAVINGS-001",
      toAccount: "CHECKING-001",
      amount: 100,
    });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      const data = result.data as { status: string };
      expect(data.status).toBe("completed");
    }
  });

  it("rejects negative amount", () => {
    const result = executeToolHandler("transfer_funds", {
      fromAccount: "SAVINGS-001",
      toAccount: "CHECKING-001",
      amount: -50,
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.errorCategory).toBe("validation");
  });

  it("rejects same-account transfer", () => {
    const result = executeToolHandler("transfer_funds", {
      fromAccount: "SAVINGS-001",
      toAccount: "SAVINGS-001",
      amount: 100,
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.errorCategory).toBe("permission");
  });

  it("rejects transfer from unknown account", () => {
    const result = executeToolHandler("transfer_funds", {
      fromAccount: "UNKNOWN-999",
      toAccount: "CHECKING-001",
      amount: 100,
    });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.errorCategory).toBe("validation");
  });
});

// ── get_exchange_rate ─────────────────────────────────────────────────────────

describe("get_exchange_rate", () => {
  it("returns rate for a supported pair", () => {
    const result = executeToolHandler("get_exchange_rate", { from: "USD", to: "EUR" });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      const data = result.data as { rate: number };
      expect(data.rate).toBe(0.92);
    }
  });

  it("returns transient error for XYZ currency", () => {
    const result = executeToolHandler("get_exchange_rate", { from: "XYZ", to: "USD" });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.errorCategory).toBe("transient");
      expect(result.error.isRetryable).toBe(true);
    }
  });

  it("returns validation error for unsupported pair", () => {
    const result = executeToolHandler("get_exchange_rate", { from: "USD", to: "JPY" });
    expect("error" in result).toBe(true);
    if ("error" in result) expect(result.error.errorCategory).toBe("validation");
  });
});

// ── freeze_account (from SCRUM-7 Gherkin scenarios) ───────────────────────────

describe("freeze_account", () => {
  // Each test gets a fresh module state — but frozenAccounts is module-level,
  // so we test scenarios that don't collide with each other across accounts.

  it("Scenario: successfully freeze an active account", () => {
    const result = executeToolHandler("freeze_account", {
      accountId: "CHECKING-001",
      reason: "suspicious login",
    });
    expect("data" in result).toBe(true);
    if ("data" in result) {
      const data = result.data as { status: string; frozenAt: string; reason: string };
      expect(data.status).toBe("frozen");
      expect(data.frozenAt).toBeTruthy();
      expect(data.reason).toBe("suspicious login");
    }
  });

  it("Scenario: transfer from frozen account is blocked", () => {
    // CHECKING-001 is frozen from the test above (module-level state)
    const result = executeToolHandler("transfer_funds", {
      fromAccount: "CHECKING-001",
      toAccount: "SAVINGS-001",
      amount: 50,
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.errorCategory).toBe("permission");
      expect(result.error.isRetryable).toBe(false);
    }
  });

  it("Scenario: freeze an already-frozen account returns validation error", () => {
    // CHECKING-001 still frozen from above
    const result = executeToolHandler("freeze_account", {
      accountId: "CHECKING-001",
      reason: "double check",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.errorCategory).toBe("validation");
      expect(result.error.isRetryable).toBe(false);
    }
  });

  it("Scenario: balance check still works on a frozen account", () => {
    // CHECKING-001 still frozen — reads must pass
    const result = executeToolHandler("get_account_balance", { accountId: "CHECKING-001" });
    expect("data" in result).toBe(true);
  });

  it("Scenario: freeze a non-existent account returns validation error", () => {
    const result = executeToolHandler("freeze_account", {
      accountId: "UNKNOWN-999",
      reason: "test",
    });
    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.error.errorCategory).toBe("validation");
      expect(result.error.isRetryable).toBe(false);
    }
  });
});
