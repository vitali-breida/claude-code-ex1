---
name: security-review
description: |
  Runs a security code review across the entire project (all src/ TypeScript files).
  Use this skill whenever the user asks to: review code for security issues, check for
  vulnerabilities, audit the codebase, find security problems, or says anything like
  "is this code secure?", "security review", "check for secrets", "audit my code".
  Also trigger proactively after significant changes to tool handlers, agent loop, or
  any file that handles external input or API credentials.
---

# Security Review Skill

Scan all TypeScript files in `src/` and produce a structured security report with proposed fixes for every finding.

## How to run

1. Use Glob to find all `.ts` files under `src/`
2. Read each file with the Read tool
3. Analyse each file against the checklist below
4. Produce the report (format defined at the bottom)

## Security checklist

For every file, check each category. Note the file path and line number for every finding.

### 🔴 Critical

**Hardcoded secrets**
- API keys, tokens, passwords assigned directly to variables (not read from `process.env`)
- Any string matching patterns like `sk-ant-`, `Bearer `, `password =`, `secret =`

**Unsafe dynamic execution**
- `eval()`, `new Function()`, `setTimeout(string)`, `setInterval(string)`

**Prototype pollution**
- Unsafe merge/assign of untrusted user input into objects without validation

---

### 🟠 High

**Injection risks**
- Shell injection: user input passed to `exec()`, `spawn()` without sanitisation
- Path traversal: file paths constructed from user input without normalisation (e.g. `../` not stripped)

**Sensitive data in logs**
- `console.log` / `console.error` printing full error objects, request inputs, or API responses that may contain keys or PII
- Tool inputs logged verbatim when they might contain user-supplied data

**Unvalidated external input**
- Tool handler inputs cast directly (`as string`, `as number`) with no runtime validation
- No check that required fields are actually present before use

---

### 🟡 Medium

**Error messages leaking internals**
- Stack traces or internal paths returned to the caller
- `catch (e) { return e.message }` patterns that expose implementation details

**Missing environment variable checks**
- `process.env.SOME_KEY` used without a fallback or startup assertion — will silently be `undefined` at runtime

**Overly broad catch blocks**
- `catch (_) {}` or empty catch that silently swallows errors, hiding real failures

---

### 🟢 Low / Best practice

**Type assertion safety**
- `as unknown as X` double-cast patterns that bypass TypeScript's type system
- Any `@ts-ignore` or `@ts-expect-error` comments

**Dependency hygiene**
- `*` or very broad version ranges in `package.json`

---

## Report format

Produce the report in this exact structure:

```
# Security Review — <date>

## Summary
| Severity | Count |
|----------|-------|
| 🔴 Critical | N |
| 🟠 High     | N |
| 🟡 Medium   | N |
| 🟢 Low      | N |

## Findings

### [SEVERITY] Title
**File:** `path/to/file.ts` line N
**Issue:** One sentence describing what the problem is and why it matters.
**Current code:**
\```typescript
// the problematic snippet
\```
**Proposed fix:**
\```typescript
// the corrected version
\```

(repeat for each finding)

## No issues found in
List files that passed all checks with ✅
```

If no findings exist at a severity level, omit that section.
Keep each finding concise — the proposed fix is the most important part.
