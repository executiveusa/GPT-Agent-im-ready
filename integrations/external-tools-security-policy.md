# External Tools Security Policy

Version: 1.0  
Applies to: all fleet repositories participating in external tool integrations

## 1) Installation policy

- Approved source required: official GitHub release/tag or internally mirrored artifact.
- Version pinning required: install by immutable version/tag and recorded checksum.
- Integrity verification required: sha256 (or stronger) must match release metadata.
- `curl | bash` is disallowed by default in fleet automation.
- Any installer script must be downloaded, inspected, checksum-verified, and executed from a reviewed artifact.

## 2) Runtime policy

- Least privilege credentials only; no shared admin tokens.
- Secrets must come from environment/secret manager; never committed or logged.
- Network egress allowlist for integration domains.
- Default to read-only mode where tool supports it.
- Mutating actions require explicit approval path when classified as `SENSITIVE-ALLOWED`.

## 3) ACIP classification gate

Every integration action is classified before execution:

- `SAFE`: execute and log.
- `SENSITIVE-ALLOWED`: execute only with approval gate and log.
- `DISALLOWED`: block execution, log event, notify Cynthia.

## 4) Logging and audit

- Emit structured telemetry for all install/invoke/approval/deny events.
- Include `tool`, `repo`, `agent`, `classification`, `trace_id`, and sanitized error details.
- Never include secrets, tokens, private prompts, or raw PII in payloads.

## 5) Exception process

- Emergency override requires explicit owner approval.
- Override event must include reason, scope, and expiration.
- Override is auto-expired and must be re-authorized for continued use.
