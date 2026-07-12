import assert from "node:assert/strict";
import test from "node:test";

import { createOpenAIAgentsSdkBoundary } from "../src/openai-boundary.mjs";
import { createRick } from "../src/rick.mjs";
import { createRickServer } from "../src/server.mjs";

const NOW = new Date("2026-07-12T10:00:00.000Z");
const baseTask = {
  contractVersion: "v1alpha1",
  taskId: "task-401",
  workflowId: "workflow-41",
  parentTaskId: "task-400",
  sender: "orin",
  recipient: "rick",
  objective: "Review a Tembusu Circle content action.",
  inputs: { action: "draft-markdown" },
  contextReferences: [],
  risk: "low",
  approvalId: null,
  requestedAt: "2026-07-12T09:59:00.000Z",
};

test("allows low-risk Markdown drafting automatically", async () => {
  const result = await createRick({ now: () => NOW }).handleTask(baseTask);

  assert.equal(result.status, "completed");
  assert.equal(result.outputs.governance.outcome, "allow");
  assert.equal(result.outputs.governance.approvalState, "not-required");
  assert.equal(result.outputs.approvalRequest, undefined);
});

test("requires founder approval before writing into Gatsby content", async () => {
  const result = await createRick({ now: () => NOW }).handleTask({
    ...baseTask,
    taskId: "task-402",
    risk: "medium",
    inputs: {
      action: "write-gatsby-content",
      payloadReference: "artifact://scribe/task-201/workshop.md",
    },
  });

  assert.equal(result.status, "approval-required");
  assert.equal(result.outputs.governance.outcome, "require-approval");
  assert.deepEqual(result.outputs.approvalRequest, {
    contractVersion: "v1alpha1",
    approvalId: "approval-task-402",
    taskId: "task-402",
    requester: "orin",
    action: "write-gatsby-content",
    risk: "medium",
    reason: "write-gatsby-content requires explicit founder approval under default-risk-policy.",
    payloadReference: "artifact://scribe/task-201/workshop.md",
    requestedAt: NOW.toISOString(),
  });
});

test("requires approval for deploy, external publishing, credentials, and permission changes", async () => {
  const rick = createRick({ now: () => NOW });
  for (const action of ["public-deploy", "external-publishing", "access-credentials", "change-permissions"]) {
    const result = await rick.handleTask({
      ...baseTask,
      taskId: `task-${action}`,
      risk: "high",
      inputs: { action },
    });
    assert.equal(result.outputs.governance.outcome, "require-approval", action);
    assert.equal(result.outputs.approvalRequest.risk, "high", action);
  }
});

test("denies non-bypassable actions and understated risk", async () => {
  const rick = createRick({ now: () => NOW });
  const bypass = await rick.handleTask({
    ...baseTask,
    risk: "high",
    inputs: { action: "bypass-founder-approval" },
  });
  const understated = await rick.handleTask({
    ...baseTask,
    inputs: { action: "public-deploy" },
  });

  assert.equal(bypass.outputs.governance.outcome, "deny");
  assert.equal(understated.outputs.governance.outcome, "deny");
  assert.equal(understated.outputs.governance.approvalState, "invalid-risk");
});

test("maps the existing approval-decision lifecycle", async () => {
  const rick = createRick({ now: () => NOW });
  const request = {
    contractVersion: "v1alpha1",
    approvalId: "approval-77",
    taskId: "task-402",
    requester: "orin",
    action: "write-gatsby-content",
    risk: "medium",
    reason: "Founder approval is required before the draft enters Gatsby content.",
    payloadReference: "artifact://scribe/task-201/workshop.md",
    requestedAt: "2026-07-12T09:55:00.000Z",
  };
  const pending = await rick.reviewApproval({ request });
  const approved = await rick.reviewApproval({
    request,
    decision: {
      contractVersion: "v1alpha1",
      approvalId: "approval-77",
      decision: "approved",
      decidedBy: "founder",
      conditions: ["Publish only the reviewed Markdown artifact."],
      reason: "Reviewed in the orchestration dashboard.",
      decidedAt: "2026-07-12T09:58:00.000Z",
    },
  });

  assert.equal(pending.governance.outcome, "require-approval");
  assert.equal(approved.governance.outcome, "allow");
  assert.equal(approved.governance.approvalState, "approved");
  assert.deepEqual(approved.governance.conditions, ["Publish only the reviewed Markdown artifact."]);
});

test("rejects mismatched approval IDs", async () => {
  const rick = createRick({ now: () => NOW });
  await assert.rejects(() => rick.reviewApproval({
    request: {
      contractVersion: "v1alpha1",
      approvalId: "approval-1",
      taskId: "task-1",
      requester: "orin",
      action: "publish-content",
      risk: "medium",
      reason: "Publishing requires approval.",
    },
    decision: {
      contractVersion: "v1alpha1",
      approvalId: "approval-2",
      decision: "approved",
      decidedBy: "founder",
      decidedAt: "2026-07-12T09:58:00.000Z",
    },
  }), /same approvalId/);
});

test("keeps the deterministic decision authoritative at the OpenAI boundary", async () => {
  const advisor = createOpenAIAgentsSdkBoundary({
    agent: { name: "Rick" },
    runner: async () => ({
      finalOutput: {
        outcome: "allow",
        reasons: ["Model supplied a clearer policy explanation."],
        conditions: ["Founder must approve."],
      },
    }),
  });
  const result = await createRick({ advisor, now: () => NOW }).handleTask({
    ...baseTask,
    risk: "high",
    inputs: { action: "public-deploy" },
  });

  assert.equal(result.outputs.governance.outcome, "require-approval");
  assert.deepEqual(result.outputs.governance.conditions, ["Founder must approve."]);
});

test("serves health, capabilities, tasks, and approval review over HTTP", async (t) => {
  const server = createRickServer({ rick: createRick({ now: () => NOW }) });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const health = await fetch(`${baseUrl}/health`).then((response) => response.json());
  const capabilities = await fetch(`${baseUrl}/capabilities`).then((response) => response.json());
  const task = await fetch(`${baseUrl}/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(baseTask),
  }).then((response) => response.json());
  const review = await fetch(`${baseUrl}/approval-review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contractVersion: "v1alpha1",
      approvalId: "approval-88",
      taskId: "task-88",
      requester: "orin",
      action: "publish-content",
      risk: "medium",
      reason: "Publishing requires approval.",
    }),
  }).then((response) => response.json());

  assert.equal(health.status, "ok");
  assert.ok(capabilities.decisions.includes("require-approval"));
  assert.equal(task.outputs.governance.outcome, "allow");
  assert.equal(review.governance.approvalState, "pending");
});
