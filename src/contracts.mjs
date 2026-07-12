const RISKS = new Set(["low", "medium", "high"]);
const FOUNDER_DECISIONS = new Set(["approved", "rejected", "changes-requested"]);

export class ContractError extends Error {
  constructor(message) {
    super(message);
    this.name = "ContractError";
  }
}

function object(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ContractError(`${field} must be an object`);
  }
}

function string(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ContractError(`${field} must be a non-empty string`);
  }
}

function dateTime(value, field) {
  string(value, field);
  if (Number.isNaN(Date.parse(value))) throw new ContractError(`${field} must be a date-time`);
}

export function validateTaskRequest(request) {
  object(request, "task request");
  for (const field of [
    "contractVersion", "taskId", "workflowId", "sender", "recipient", "objective", "risk",
  ]) string(request[field], field);

  if (request.contractVersion !== "v1alpha1") {
    throw new ContractError("Rick only accepts contractVersion v1alpha1");
  }
  if (request.recipient !== "rick") throw new ContractError("task recipient must be rick");
  if (!RISKS.has(request.risk)) throw new ContractError("risk must be low, medium, or high");
  object(request.inputs, "inputs");
  string(request.inputs.action, "inputs.action");
  return request;
}

export function validateApprovalRequest(request) {
  object(request, "approval request");
  for (const field of [
    "contractVersion", "approvalId", "taskId", "requester", "action", "risk", "reason",
  ]) string(request[field], field);
  if (request.contractVersion !== "v1alpha1") {
    throw new ContractError("approval request contractVersion must be v1alpha1");
  }
  if (!new Set(["medium", "high"]).has(request.risk)) {
    throw new ContractError("approval request risk must be medium or high");
  }
  if (request.requestedAt !== undefined) dateTime(request.requestedAt, "requestedAt");
  return request;
}

export function validateApprovalDecision(decision, approvalId) {
  object(decision, "approval decision");
  for (const field of ["contractVersion", "approvalId", "decision", "decidedBy", "decidedAt"]) {
    string(decision[field], field);
  }
  if (decision.contractVersion !== "v1alpha1") {
    throw new ContractError("approval decision contractVersion must be v1alpha1");
  }
  if (decision.approvalId !== approvalId) {
    throw new ContractError("approval decision must reference the same approvalId");
  }
  if (!FOUNDER_DECISIONS.has(decision.decision)) {
    throw new ContractError("decision must be approved, rejected, or changes-requested");
  }
  dateTime(decision.decidedAt, "decidedAt");
  if (decision.conditions !== undefined && !Array.isArray(decision.conditions)) {
    throw new ContractError("conditions must be an array");
  }
  return decision;
}

export function resultBase(request, now) {
  return {
    contractVersion: "v1alpha1",
    taskId: request?.taskId ?? "invalid-task",
    agentId: "rick",
    completedAt: now().toISOString(),
  };
}
