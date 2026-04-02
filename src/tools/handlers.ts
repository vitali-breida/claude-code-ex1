import type { ToolErrorResponse, ToolResponse } from "../types.ts";

// ── Fake data ─────────────────────────────────────────────────────────────────

const ACCOUNTS: Record<string, { balance: number; currency: string }> = {
  "SAVINGS-001": { balance: 2340.5, currency: "USD" },
  "CHECKING-001": { balance: 850.0, currency: "USD" },
};

const EXCHANGE_RATES: Record<string, number> = {
  "USD-EUR": 0.92,
  "USD-GBP": 0.79,
  "EUR-USD": 1.09,
  "EUR-GBP": 0.86,
  "GBP-USD": 1.27,
};

// ── Handlers ──────────────────────────────────────────────────────────────────

function getAccountBalance(accountId: string): ToolResponse<{
  accountId: string;
  balance: number;
  currency: string;
}> {
  const account = ACCOUNTS[accountId];
  if (!account) {
    const err: ToolErrorResponse = {
      errorCategory: "validation",
      isRetryable: false,
      description: `Account '${accountId}' not found. Valid accounts: ${Object.keys(ACCOUNTS).join(", ")}`,
    };
    return { error: err };
  }
  return { data: { accountId, ...account } };
}

function getTransactionHistory(
  accountId: string,
  limit = 5
): ToolResponse<{ accountId: string; transactions: object[] }> {
  if (!ACCOUNTS[accountId]) {
    const err: ToolErrorResponse = {
      errorCategory: "validation",
      isRetryable: false,
      description: `Account '${accountId}' not found. Valid accounts: ${Object.keys(ACCOUNTS).join(", ")}`,
    };
    return { error: err };
  }

  const allTransactions = [
    { date: "2025-03-28", type: "debit",  amount: 45.00,  description: "Grocery store" },
    { date: "2025-03-27", type: "credit", amount: 2000.00, description: "Salary deposit" },
    { date: "2025-03-25", type: "debit",  amount: 120.00, description: "Electric bill" },
    { date: "2025-03-22", type: "debit",  amount: 9.99,   description: "Streaming service" },
    { date: "2025-03-20", type: "debit",  amount: 60.00,  description: "Gas station" },
    { date: "2025-03-18", type: "credit", amount: 150.00, description: "Refund" },
    { date: "2025-03-15", type: "debit",  amount: 300.00, description: "Rent payment" },
  ];

  return {
    data: {
      accountId,
      transactions: allTransactions.slice(0, limit),
    },
  };
}

function transferFunds(
  fromAccount: string,
  toAccount: string,
  amount: number
): ToolResponse<{ fromAccount: string; toAccount: string; amount: number; status: string }> {
  if (amount <= 0) {
    const err: ToolErrorResponse = {
      errorCategory: "validation",
      isRetryable: false,
      description: `Transfer amount must be positive. Received: ${amount}`,
    };
    return { error: err };
  }

  if (fromAccount === toAccount) {
    const err: ToolErrorResponse = {
      errorCategory: "permission",
      isRetryable: false,
      description: "Cannot transfer funds to the same account.",
    };
    return { error: err };
  }

  if (!ACCOUNTS[fromAccount]) {
    const err: ToolErrorResponse = {
      errorCategory: "validation",
      isRetryable: false,
      description: `Source account '${fromAccount}' not found.`,
    };
    return { error: err };
  }

  return {
    data: { fromAccount, toAccount, amount, status: "completed" },
  };
}

function getExchangeRate(
  from: string,
  to: string
): ToolResponse<{ from: string; to: string; rate: number }> {
  // Simulate transient failure for unknown/unsupported currencies
  if (from === "XYZ" || to === "XYZ") {
    const err: ToolErrorResponse = {
      errorCategory: "transient",
      isRetryable: true,
      description: "Exchange rate service temporarily unavailable. Please try again shortly.",
    };
    return { error: err };
  }

  const key = `${from}-${to}`;
  const rate = EXCHANGE_RATES[key];

  if (!rate) {
    const err: ToolErrorResponse = {
      errorCategory: "validation",
      isRetryable: false,
      description: `Exchange rate for ${from}→${to} is not supported. Supported pairs: ${Object.keys(EXCHANGE_RATES).join(", ")}`,
    };
    return { error: err };
  }

  return { data: { from, to, rate } };
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export function executeToolHandler(
  name: string,
  input: Record<string, unknown>
): ToolResponse<unknown> {
  switch (name) {
    case "get_account_balance":
      return getAccountBalance(input.accountId as string);

    case "get_transaction_history":
      return getTransactionHistory(
        input.accountId as string,
        input.limit as number | undefined
      );

    case "transfer_funds":
      return transferFunds(
        input.fromAccount as string,
        input.toAccount as string,
        input.amount as number
      );

    case "get_exchange_rate":
      return getExchangeRate(input.from as string, input.to as string);

    default:
      return {
        error: {
          errorCategory: "validation",
          isRetryable: false,
          description: `Unknown tool: '${name}'`,
        },
      };
  }
}
