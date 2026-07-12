const LOW_RISK_ACTIONS = new Set([
  "draft-content",
  "draft-markdown",
  "summarise",
  "organise-knowledge",
  "create-task-plan",
  "run-read-only-health-check",
]);

const MEDIUM_RISK_ACTIONS = new Set([
  "write-gatsby-content",
  "publish-content",
  "update-website",
  "send-community-message",
  "change-workflow-configuration",
  "apply-operational-fix",
]);

const HIGH_RISK_ACTIONS = new Set([
  "public-deploy",
  "external-publishing",
  "delete-data",
  "modify-production",
  "spend-money",
  "access-credentials",
  "change-permissions",
  "share-private-information",
  "make-legal-or-financial-commitment",
]);

const DENIED_ACTIONS = new Set([
  "bypass-founder-approval",
  "grant-self-permission",
  "reveal-credentials",
  "conceal-security-incident",
]);

export function classifyAction(action) {
  if (DENIED_ACTIONS.has(action)) return { risk: "high", policy: "deny" };
  if (LOW_RISK_ACTIONS.has(action)) return { risk: "low", policy: "automatic" };
  if (MEDIUM_RISK_ACTIONS.has(action)) return { risk: "medium", policy: "founder-approval" };
  if (HIGH_RISK_ACTIONS.has(action)) return { risk: "high", policy: "founder-approval" };
  return { risk: "high", policy: "founder-approval", unknown: true };
}

export function deterministicDecision({ action, declaredRisk, approvalDecision }) {
  const classification = classifyAction(action);
  const risk = classification.risk;

  if (classification.policy === "deny") {
    return {
      outcome: "deny",
      action,
      risk,
      approvalState: "not-applicable",
      reasons: [`${action} conflicts with Rick's non-bypassable security boundaries.`],
      conditions: [],
    };
  }

  if (declaredRisk && riskRank(declaredRisk) < riskRank(risk)) {
    return {
      outcome: "deny",
      action,
      risk,
      approvalState: "invalid-risk",
      reasons: [`Declared risk ${declaredRisk} understates policy risk ${risk}.`],
      conditions: ["Resubmit the action using the policy-classified risk."],
    };
  }

  if (classification.policy === "automatic") {
    return {
      outcome: "allow",
      action,
      risk,
      approvalState: "not-required",
      reasons: ["The action is low-risk and automatic under default-risk-policy."],
      conditions: ["Keep the output as an unpublished Markdown draft."],
    };
  }

  if (!approvalDecision) {
    return {
      outcome: "require-approval",
      action,
      risk,
      approvalState: "pending",
      reasons: [classification.unknown
        ? "Unknown actions default to high risk and require founder approval."
        : `${action} requires explicit founder approval under default-risk-policy.`],
      conditions: [],
    };
  }

  if (approvalDecision.decision === "approved") {
    return {
      outcome: "allow",
      action,
      risk,
      approvalState: "approved",
      reasons: ["The founder approved the matching approval request."],
      conditions: approvalDecision.conditions ?? [],
    };
  }
  if (approvalDecision.decision === "rejected") {
    return {
      outcome: "deny",
      action,
      risk,
      approvalState: "rejected",
      reasons: [approvalDecision.reason ?? "The founder rejected the action."],
      conditions: [],
    };
  }
  return {
    outcome: "require-approval",
    action,
    risk,
    approvalState: "changes-requested",
    reasons: [approvalDecision.reason ?? "The founder requested changes before approval."],
    conditions: approvalDecision.conditions ?? [],
  };
}

function riskRank(risk) {
  return { low: 0, medium: 1, high: 2 }[risk] ?? -1;
}
