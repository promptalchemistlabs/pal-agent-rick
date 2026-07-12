# Contributor instructions

This repository owns Rick only. Kingdom-wide contracts, policies and workflows
belong in `promptalchemistlabs/sleeping-prince`.

- Treat `agent.yaml` and `docs/ROLE.md` as the local sources of truth.
- Do not broaden capabilities or permissions without a registry and policy review.
- Preserve compatibility with the declared `v1alpha1` contracts.
- Keep security decisions separate from Orin's coordination, Scribe's content
  production, and Bastion's operational diagnosis.
- Default to deny when a required policy, permission or approval is missing.
- Add tests for every policy decision and contract change.
- Never commit credentials, private community data, runtime memory or production logs.
- Mark unimplemented behaviour explicitly; do not present roadmap features as ready.
- Update the manifest version when behaviour or interfaces change.
