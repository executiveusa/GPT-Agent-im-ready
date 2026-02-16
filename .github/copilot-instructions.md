## Issue Tracking (Beads)

This project uses **bd (beads)** for persistent issue tracking and agent memory.
Run `bd prime` for workflow context.

**Quick reference:**
- `bd ready` - Find unblocked work
- `bd create "Title" --type task --priority 2` - Create issue
- `bd update <id> --claim` - Claim a task
- `bd close <id>` - Complete work
- `bd sync` - Sync with git (run at session end)

## Project Context

- **GPT-Agent-im-ready** — Visual meeting room ("Pauli's Place") where agents talk
- **Backend:** Flask (Python) with meeting_bridge blueprint
- **Frontend:** React with MeetingRoom page
- **Connected repos:** `devika-agent` (agent backend), `dashboard-agent-swarm` (control dashboard)

## NEVER commit secrets. All API keys via environment variables.
