# External Tools Telemetry Schema

This schema defines the minimum event payload for external tool observability in `dashboard-agent-swarm`.

## Event categories

- `integration.install`
- `integration.invoke`
- `integration.approval`
- `integration.error`
- `integration.rollback`

## Required fields

| Field | Type | Description |
|---|---|---|
| `protocol` | string | Always `agent-fleet-v1` |
| `event` | string | Category from the list above |
| `tool` | string | Stable tool id (e.g. `ultimate_mcp_client`) |
| `repo` | string | Source repository name |
| `agent` | string | Agent id that executed the action |
| `classification` | string | `SAFE`, `SENSITIVE-ALLOWED`, `DISALLOWED` |
| `status` | string | `success`, `failure`, `blocked`, `approved`, `rolled_back` |
| `trace_id` | string | UUID v4 for cross-system correlation |
| `timestamp` | string | ISO-8601 UTC timestamp |

## Optional fields

| Field | Type | Description |
|---|---|---|
| `duration_ms` | number | Action duration in milliseconds |
| `attempt` | number | Retry attempt count |
| `error_code` | string | Normalized error code |
| `error_message` | string | Sanitized error summary |
| `approval_ticket` | string | Approval identifier for gated actions |
| `metadata` | object | Extra sanitized dimensions |

## Example

```json
{
  "protocol": "agent-fleet-v1",
  "event": "integration.invoke",
  "tool": "markdown_web_browser",
  "repo": "devika-agent",
  "agent": "devika",
  "classification": "SAFE",
  "status": "success",
  "duration_ms": 2480,
  "trace_id": "9ca9ec53-b553-4f26-9df7-8f9f0f6dbe2b",
  "timestamp": "2026-02-16T22:44:11.201Z",
  "metadata": {
    "mode": "robot",
    "target_count": 1
  }
}
```
