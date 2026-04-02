# Multi-Tool Agent — Exercise 1

Learning project: agentic loop with tool integration, structured errors, and escalation logic.
Built with [Anthropic SDK](https://github.com/anthropic/anthropic-sdk-typescript) + TypeScript.

## What it does

A CLI assistant that manages a fake personal finance account. You type a request in plain English, the agent calls the appropriate tools and returns a response.

**Available tools:**
- `get_account_balance` — current balance for an account
- `get_transaction_history` — list of past transactions
- `transfer_funds` — move money between accounts (blocked above $1000)
- `get_exchange_rate` — currency conversion rate

## Setup

```bash
npm install
```

Add your API key to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

## Run

```bash
npm start
```

## Example requests

```
> what's my savings balance?
> what happened in my checking account recently?
> transfer $500 from savings to checking
> transfer $1500 from savings to checking
> get exchange rate from USD to EUR
> check my balance and transfer $500 from savings to checking
```

## Project structure

```
src/
├── index.ts          # CLI REPL
├── agent.ts          # Agentic loop (while + stop_reason)
├── types.ts          # Shared types (ToolResponse, ErrorCategory, EscalationRecord)
└── tools/
    ├── definitions.ts  # Tool schemas sent to Claude
    ├── handlers.ts     # Tool implementations (fake data)
    └── hook.ts         # Pre-execution interceptor + escalation
```
