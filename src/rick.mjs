import {
  ContractError,
  resultBase,
  validateApprovalDecision,
  validateApprovalRequest,
  validateTaskRequest,
} from "./contracts.mjs";
import { deterministicDecision } from "./policy.mjs";

export function createRick({ advisor, now = () => new Date() } = {}) {
  async function review({ action, declaredRisk, approvalDecision }) {
    const fixed = deterministicDecision({ action, declaredRisk, approvalDecision });
    return advisor ? advisor.advise({ action, deterministicDecision: fixed }) : fixed;
  }

  return {
    id: "rick",
    mode: advisor?.mode ?? "mock",

    health() {
      return {
        agentId: "rick",
        status: "ok",
        mode: this.mode,
        policy: "default-risk-policy",
        contractVersion: "v1alpha1",
      };
    },

    capabilities() {
      return {
        agentId: "rick",
        capabilities: ["permission-review", "policy-enforcement", "privacy-review", "security-audit"],
        decisions: ["allow", "deny", "require-approval"],
        approvalDecisions: ["approved", "rejected", "changes-requested"],
      };
    },

    async handleTask(untrustedRequest) {
      let request;
      try {
        request = validateTaskRequest(untrustedRequest);
        let approvalDecision;
        if (request.inputs.approvalDecision) {
          if (!request.approvalId) throw new ContractError("approvalId is required with approvalDecision");
          approvalDecision = validateApprovalDecision(request.inputs.approvalDecision, request.approvalId);
        }
        const governance = await review({
          action: request.inputs.action,
          declaredRisk: request.risk,
          approvalDecision,
        });
        const approvalId = governance.outcome === "require-approval"
          ? request.approvalId ?? `approval-${request.taskId}`
          : request.approvalId ?? null;
        const approvalRequest = governance.outcome === "require-approval"
          ? createApprovalRequest(request, governance, approvalId, now)
          : undefined;
        return {
          ...resultBase(request, now),
          status: statusFor(governance.outcome),
          summary: summaryFor(governance),
          outputs: {
            governance: {
              ...governance,
              policy: "default-risk-policy",
              approvalId,
            },
            ...(approvalRequest ? { approvalRequest } : {}),
          },
          artifacts: [],
          memorySummary: `Recorded ${governance.outcome} for ${request.inputs.action}.`,
          error: null,
        };
      } catch (error) {
        if (!(error instanceof ContractError)) throw error;
        return {
          ...resultBase(untrustedRequest, now),
          status: "failed",
          summary: "Rick rejected an invalid governance request.",
          outputs: {},
          artifacts: [],
          memorySummary: null,
          error: error.message,
        };
      }
    },

    async reviewApproval(payload) {
      const envelope = payload?.request ? payload : { request: payload };
      const request = validateApprovalRequest(envelope.request);
      const decision = envelope.decision
        ? validateApprovalDecision(envelope.decision, request.approvalId)
        : undefined;
      const governance = await review({
        action: request.action,
        declaredRisk: request.risk,
        approvalDecision: decision,
      });
      return {
        contractVersion: "v1alpha1",
        approvalId: request.approvalId,
        taskId: request.taskId,
        governance: {
          ...governance,
          policy: "default-risk-policy",
          approvalId: request.approvalId,
        },
        request,
        ...(decision ? { decision } : {}),
        reviewedAt: now().toISOString(),
      };
    },
  };
}

function createApprovalRequest(request, governance, approvalId, now) {
  return {
    contractVersion: "v1alpha1",
    approvalId,
    taskId: request.taskId,
    requester: request.sender,
    action: request.inputs.action,
    risk: governance.risk,
    reason: governance.reasons.join(" "),
    payloadReference: request.inputs.payloadReference ?? null,
    requestedAt: now().toISOString(),
  };
}

function statusFor(outcome) {
  return { allow: "completed", deny: "blocked", "require-approval": "approval-required" }[outcome];
}

function summaryFor(governance) {
  return {
    allow: `Rick allowed ${governance.action}.`,
    deny: `Rick denied ${governance.action}.`,
    "require-approval": `Rick requires founder approval for ${governance.action}.`,
  }[governance.outcome];
}
