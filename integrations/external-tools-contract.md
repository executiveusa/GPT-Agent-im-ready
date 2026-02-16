# External Tools Contract (Phase 0)

Owner: `dashboard-agent-swarm`  
Protocol: `agent-fleet-v1`  
Execution model: domain-native integrations + dashboard observability

## Canonical decisions

- Rollout order: Core 4 repos first, then scale to all 11 repos.
- Placement: tool logic stays in domain repos; dashboard is source of truth for status, policy, and audit.
- Canonical skill home for shared skills: `executiveusa/agent_flywheel_clawdbot_skills_and_integrations`.
- Install policy: pinned artifacts only; no blind `curl | bash` execution.

## Core 4 wave (pilot)

1. `dashboard-agent-swarm`
2. `agent-zero-Fork`
3. `devika-agent`
4. `MetaGPT`

## Tool placement matrix

| Tool | Primary capability | Domain owner | Primary repo placement | Dashboard responsibility |
|---|---|---|---|---|
| `markdown_web_browser` | Deterministic web capture to markdown with provenance/OCR | Devika + Agent Zero | `devika-agent`, `agent-zero-Fork` adapters | Run status, failure telemetry, policy outcome |
| `brennerbot` workflow | Multi-agent reasoning/debate loop | Agent Zero | `agent-zero-Fork` orchestration templates | Gate status + audit trail |
| `CASS` | Cross-agent session search + memory retrieval | Cynthia + Devika | `coding_agent_session_search`, then orchestration repos | Search usage metrics + memory hit rate |
| `claude_code_agent_farm` | Parallel tmux-based coding swarm | Alex + Devika | `MetaGPT`, `devika-agent` | Queue telemetry + run outcomes |
| `simultaneous-launch-button` | Two-person approval gate for risky operations | Cynthia + Pauli | `agent-zero-Fork` hook boundary | Approval events + denied action logs |
| `ultimate_mcp_client` | Unified MCP control plane/gateway | Agent Zero + ClawdBot | `agent-zero-Fork`, `clawdbot-Whatsapp-agent` | Tool health + transport telemetry |
| `bulk_transcribe_youtube_videos_from_playlist` | Playlist/video transcription pipeline | SYNTHIA + Luna | `voice-agents-fork`, `phone-call-assistant` | Job visibility + transcript policy metrics |

## Canonical integration envelope

All external tool actions must emit events using this envelope:

```json
{
  "protocol": "agent-fleet-v1",
  "type": "integration-event",
  "tool": "tool_id",
  "action": "discover|install|invoke|approve|deny|rollback",
  "sourceRepo": "repo_name",
  "sourceAgent": "agent_id",
  "classification": "SAFE|SENSITIVE-ALLOWED|DISALLOWED",
  "trace_id": "uuid-v4",
  "timestamp": "ISO-8601",
  "payload": {}
}
```

## Out of scope for Phase 0

- Full runtime enablement in all 11 repos.
- UI feature expansion beyond observability and contract visibility.
- Production key provisioning.
