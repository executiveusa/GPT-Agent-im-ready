# GPT-Agent-im-ready — Agent Guide

Use `bd` for persistent task tracking across sessions.

```bash
bd ready          # What's unblocked?
bd create "Title" --type task --priority 2
bd update <id> --claim
bd close <id> --reason "done"
bd sync           # End of session
```

## Project
- Visual meeting room ("Pauli's Place") for agent-to-agent conversations
- Flask backend + React frontend
- Key file: `server/meeting_bridge/__init__.py`
- Key page: `client/src/pages/MeetingRoom.js`

## Connected Repos
- `devika-agent` — Main agent backend (Python Flask, port 1337)
- `dashboard-agent-swarm` — Master control dashboard (React + Vite)
