// ── Error types ──────────────────────────────────────────────────────────────

export type ErrorCategory = "transient" | "validation" | "permission";

export interface ToolErrorResponse {
  errorCategory: ErrorCategory;
  isRetryable: boolean;
  description: string;
}

// ── Tool response wrapper ─────────────────────────────────────────────────────
// Every tool handler returns either { data: T } or { error: ToolErrorResponse }

export type ToolResponse<T> = { data: T } | { error: ToolErrorResponse };

// ── Escalation types ──────────────────────────────────────────────────────────

export interface EscalationRequest {
  requestedTool: string;
  input: Record<string, unknown>;
  reason: string;
}

export interface EscalationRecord {
  ticketId: string;
  timestamp: string;
  status: "pending_approval";
  request: EscalationRequest;
}

export interface InterceptResult {
  wasBlocked: boolean;
  escalationMessage?: string;
}
