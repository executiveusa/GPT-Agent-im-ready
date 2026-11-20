## Safety limits of the extracted implementation

This is a source publication, not production hardening. The ordinary `npm test` command is offline and uses no account credentials. Running the live CLI is a separate manual decision.

- A CLI `--yes` flag and local mission grant are configuration, not proof of authenticated owner permission.
- The inherited numeric checks do not reject all nonfinite values. Do not rely on them as a security or spending boundary.
- The estimate does not account for all prompt/profile text. The caller has no explicit provider output-token cap or request timeout. Verify current pricing and use independent provider-side limits before any authorized live use.
- Manifest brain paths are trusted local configuration. Do not feed untrusted manifests or project-provided paths into this CLI.
- Local storage and registry errors may fail open. These receipts are not an audit-durable approval system.

Offline tests verify the protocol behavior they exercise. They do not prove secure authorization, spending enforcement or live readiness.
