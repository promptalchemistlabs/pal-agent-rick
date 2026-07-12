# Rick

> Security, permissions and policy enforcement for Kingdom of PAL.

Rick evaluates requested actions against kingdom policy, enforces least
privilege, blocks unauthorised behaviour and records reviewable security
decisions.

## Status

Contract scaffold only. The runtime is not implemented yet.

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

## Development

The language, framework and runtime entrypoint are deliberately undecided. Add
implementation code only after the kingdom contracts and runtime architecture
are approved.

## Licence

No licence has been selected yet.
