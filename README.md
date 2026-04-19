# Multi-Tool Finance Agent

A CLI assistant that manages a fake personal finance account.
You type a request in plain English — the agent calls the right tools and responds.

Built with [Anthropic SDK](https://github.com/anthropic/anthropic-sdk-typescript) + TypeScript.

---

## Setup

**1. Install dependencies**
```bash
npm install
```

**2. Create a `.env` file in the project root**
```
ANTHROPIC_API_KEY=sk-ant-...
```

**3. Start the assistant**
```bash
npm start
```

You'll see:
```
Finance Assistant ready. Type your message or "exit" to quit.

>
```

Type `exit` to quit.

---

## Available tools

| Tool | Description |
|------|-------------|
| `get_account_balance` | Current balance snapshot for an account |
| `get_transaction_history` | Recent debit/credit events for an account |
| `transfer_funds` | Move money between accounts (escalated if > $1000) |
| `get_exchange_rate` | Exchange rate between two currency codes |
| `freeze_account` | Block outgoing transfers (escalated if reason contains "bulk"/"system") |

---

## What you can do

### Check a balance
```
> what's my savings balance?
> how much is in my checking account?
```

### View transaction history
```
> what happened in my checking account recently?
> show me the last 3 transactions in savings
```

### Transfer funds
```
> transfer $500 from savings to checking
```

Transfers above **$1000** are blocked and routed for approval:
```
> transfer $1500 from savings to checking
# → creates an escalation ticket, transfer is NOT processed
```

### Freeze an account
```
> freeze my savings account, suspicious login detected
```

System-initiated freezes (reason contains `"bulk"` or `"system"`) are escalated for approval:
```
> freeze checking account for bulk system maintenance
# → creates an escalation ticket, account is NOT frozen
```

Once frozen, outgoing transfers are blocked:
```
> transfer $50 from savings to checking
# → permission error if savings is frozen
```

### Get an exchange rate
```
> get exchange rate from USD to EUR
> how much is 1 GBP in USD?
```

Supported currency pairs: `USD↔EUR`, `USD↔GBP`, `EUR↔GBP`

### Multiple requests at once
```
> check my balance and transfer $500 from savings to checking
```

---

## Error scenarios

The agent explains errors in plain English. You can trigger them intentionally:

| Scenario | Example |
|---|---|
| Unknown currency (transient error) | `get exchange rate for XYZ to USD` |
| Negative transfer amount (validation error) | `transfer -50 from savings to checking` |
| Same-account transfer (permission error) | `transfer $500 from savings to savings` |
| Large transfer (escalation) | `transfer $1500 from savings to checking` |
| Freeze already-frozen account | `freeze savings account again` |
| Freeze with system reason (escalation) | `freeze account for bulk audit` |

---

## Fake account data

| Account | Balance |
|---|---|
| `SAVINGS-001` | $2,340.50 |
| `CHECKING-001` | $850.00 |

---

## Scripts

| Script | Description |
|---|---|
| `npm start` | Start the interactive CLI |
| `npm test` | Run unit tests (Vitest, 27 tests) |
| `npm run typecheck` | TypeScript type check only |
| `npm run ci` | typecheck + test — run before pushing |

---

## Observability

The agent writes structured JSON-L logs to `stderr` on every iteration:

```jsonl
{"ts":"...","event":"agent_iteration","stop_reason":"tool_use"}
{"ts":"...","event":"tool_call","tool":"freeze_account","status":"ok","durationMs":1}
{"ts":"...","event":"tool_escalated","tool":"transfer_funds","input":{...}}
{"ts":"...","event":"agent_iteration","stop_reason":"end_turn"}
```

Separate logs from user output: `npm start 2>> agent.log`

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic API key |
| `MODEL` | `claude-opus-4-5` | Claude model to use |
