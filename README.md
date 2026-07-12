# Rick

> Security, permissions and policy enforcement for Kingdom of PAL.

Rick evaluates requested actions against kingdom policy, enforces least
privilege, blocks unauthorised behaviour and records reviewable security
decisions.

## Status

Deterministic `v1alpha1` governance runtime implemented for the Tembusu Circle
demo. Rick produces `allow`, `deny`, or `require-approval` outcomes while using
the existing approval request and founder decision contracts unchanged.

## Core responsibilities

- Review agent permissions and requested actions
- Classify privacy, access and security risk
- Enforce approval and access policies
- Block actions outside declared permissions
- Maintain security decisions and escalate incidents

## Boundaries

Rick cannot grant permissions autonomously, expose credentials or sensitive
architecture, bypass founder approval, or expand its own permissions.

See [`agent.yaml`](agent.yaml) for the machine-readable contract and
[`docs/ROLE.md`](docs/ROLE.md) for detailed operating rules.

## Kingdom integration

- Registry: `promptalchemistlabs/sleeping-prince/agent-registry.yaml`
- Contracts: `promptalchemistlabs/sleeping-prince/shared-contracts/`
- Workflows: `community-campaign`, `operational-diagnosis`

## HTTP API

- `GET /health`
- `GET /capabilities`
- `POST /tasks` with a `v1alpha1` task request addressed to `rick`
- `POST /approval-review` with `{ request, decision? }`, where `request` is an
  approval request and `decision` is the matching optional founder decision

`/approval-review` also accepts a raw approval request to read its pending state.
An approved founder decision allows the reviewed action; rejection denies it;
`changes-requested` keeps it in the approval-required state.

## Tembusu Circle policy

- Drafting Markdown is low risk and automatic.
- Writing an artifact into Gatsby content requires founder approval.
- Public deployment, external publishing, credential access, and permission
  changes require founder approval.
- Approval bypass, self-granted permissions, credential disclosure, and hiding
  a material incident are always denied.
- Unknown actions default to high risk.

## Development

From this directory:

```sh
npm test
npm start
```

`npm start` reads only the root `../../.env`. The default runtime is completely
deterministic and requires no credentials. `src/openai-boundary.mjs` provides an
optional OpenAI Agents SDK-compatible advisory boundary; deterministic policy
remains authoritative and the model cannot relax an outcome.

## Licence

No licence has been selected yet.
