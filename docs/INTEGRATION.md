# Rick integration

Rick keeps two decision vocabularies deliberately separate.

## Governance outcome

Rick writes this inside `task-result.outputs.governance`:

```json
{
  "outcome": "allow | deny | require-approval",
  "action": "write-gatsby-content",
  "risk": "medium",
  "reasons": ["..."],
  "conditions": [],
  "policy": "default-risk-policy",
  "approvalState": "pending",
  "approvalId": "approval-task-402"
}
```

A `require-approval` result also includes `outputs.approvalRequest`, which
matches `shared-contracts/approval-request.schema.json` exactly.

## Founder lifecycle

The orchestration UI submits the existing approval decision shape:

```json
{
  "request": { "contractVersion": "v1alpha1", "approvalId": "approval-task-402" },
  "decision": {
    "contractVersion": "v1alpha1",
    "approvalId": "approval-task-402",
    "decision": "approved",
    "decidedBy": "founder",
    "decidedAt": "2026-07-12T10:00:00.000Z"
  }
}
```

The abbreviated request above is illustrative; real requests must contain all
fields required by the shared approval-request schema. Rick rejects mismatched
approval IDs.

Lifecycle mapping:

| Founder decision | Rick outcome | UI state |
| --- | --- | --- |
| absent | `require-approval` | pending |
| `approved` | `allow` | approved |
| `rejected` | `deny` | rejected |
| `changes-requested` | `require-approval` | changes requested |
