import Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_account_balance",
    description:
      "Returns a single current balance amount (a point-in-time snapshot) for a specified account. " +
      "Use this when the user asks: how much money is in an account, what is the current balance, " +
      "how much do I have, or what is the account standing right now. " +
      "Do NOT use this when the user asks about past activity, recent transactions, spending history, " +
      "or what happened in the account — use get_transaction_history for those requests.",
    input_schema: {
      type: "object" as const,
      properties: {
        accountId: {
          type: "string",
          description:
            "Account identifier, e.g. 'SAVINGS-001' or 'CHECKING-001'",
        },
      },
      required: ["accountId"],
    },
  },
  {
    name: "get_transaction_history",
    description:
      "Returns a chronological list of past debit and credit events for a specified account. " +
      "Use this when the user asks about: recent activity, past transactions, spending history, " +
      "what happened in the account, recent charges, deposits, or withdrawals. " +
      "Do NOT use this when the user only wants the current balance or how much money is available — " +
      "use get_account_balance for that.",
    input_schema: {
      type: "object" as const,
      properties: {
        accountId: {
          type: "string",
          description: "Account identifier to retrieve transactions for",
        },
        limit: {
          type: "number",
          description: "Maximum number of transactions to return (default: 5)",
        },
      },
      required: ["accountId"],
    },
  },
  {
    name: "transfer_funds",
    description:
      "Transfers a specified amount of money from one account to another. " +
      "Use this when the user wants to move, send, or transfer money between accounts. " +
      "The amount must be a positive number. Transfers above $1000 may require approval.",
    input_schema: {
      type: "object" as const,
      properties: {
        fromAccount: {
          type: "string",
          description: "Source account identifier",
        },
        toAccount: {
          type: "string",
          description: "Destination account identifier",
        },
        amount: {
          type: "number",
          description: "Amount in USD to transfer (must be positive)",
        },
      },
      required: ["fromAccount", "toAccount", "amount"],
    },
  },
  {
    name: "get_exchange_rate",
    description:
      "Returns the current exchange rate between two currencies. " +
      "Use this when the user asks about currency conversion rates, forex rates, " +
      "or how much one currency is worth in another.",
    input_schema: {
      type: "object" as const,
      properties: {
        from: {
          type: "string",
          description: "Source currency code, e.g. 'USD', 'EUR', 'GBP'",
        },
        to: {
          type: "string",
          description: "Target currency code, e.g. 'USD', 'EUR', 'GBP'",
        },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "freeze_account",
    description:
      "Freezes a specified account, preventing any outgoing transfers. " +
      "Use this when suspicious activity is detected or the user wants to lock down an account. " +
      "Balance checks and transaction history remain accessible on a frozen account. " +
      "Freezing an already-frozen account returns an error.",
    input_schema: {
      type: "object" as const,
      properties: {
        accountId: {
          type: "string",
          description: "Account identifier to freeze, e.g. 'SAVINGS-001'",
        },
        reason: {
          type: "string",
          description: "Reason for freezing the account (recorded in audit log)",
        },
      },
      required: ["accountId", "reason"],
    },
  },
];
