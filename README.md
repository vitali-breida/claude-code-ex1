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

---

## Fake account data

| Account | Balance |
|---|---|
| `SAVINGS-001` | $2,340.50 |
| `CHECKING-001` | $850.00 |

---

## Configuration

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic API key |
| `MODEL` | `claude-opus-4-5` | Claude model to use |
