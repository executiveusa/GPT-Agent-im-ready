# Dashboard Agent Swarm — Agent Guide

> **Mission**: Building a Future-Proof Autonomous AI Agent Platform (AI Agency in a Box)  
> **Protocol**: See `AGENT_PROTOCOL.md` for the full fleet protocol  
> **Comms**: See `AGENT_COMMS_PROTOCOL.md` for agent-to-agent JSON envelope standard  
> **Prompts**: See `agent-prompts.md` for the shared 21-prompt library  
> **Souls**: See `.agent-souls/` for each agent's Heart & Soul identity files  
> **Role**: See `ROLE_INSTRUCTIONS.md` for this repo's specific role  

## Project

- DARYA Studio — master control dashboard for all agents
- React 18 + Vite + TypeScript + Tailwind + shadcn/ui + Framer Motion
- Backend: Express/Node on port 8787, PostgreSQL, Redis, Flowise
- Docker: nginx frontend, node backend, postgres, redis, flowise

## Agent Hierarchy (v2 — Devika Lead Delegator)

```
                    ╔═══════════════════════════════════╗
                    ║   PAULI — Shadow Leader            ║
                    ║   Microsoft Lightning Agent        ║
                    ║   Sees EVERYTHING. Word is LAW.    ║
                    ║   Avatar hidden unless summoned.   ║
                    ╚══════════════╤════════════════════╝
                                   │ (passive monitoring)
                    ╔══════════════╧════════════════════╗
                    ║   archon-os (Operating System)     ║
                    ╚══════════════╤════════════════════╝
                                   │
                    ╔══════════════╧════════════════════╗
                    ║   Agent Zero + SYNTHIA             ║
                    ║   Root Orchestrator                ║
                    ║   agent-zero-Fork                  ║
                    ╚══════════════╤════════════════════╝
                                   │
                    ╔══════════════╧════════════════════╗
                    ║   DEVIKA — Lead Delegator          ║
                    ║   DVK-002 — devika-agent           ║
                    ║   ALL tasks flow through Devika    ║
                    ╚══════════════╤════════════════════╝
                                   │
          ┌────────────┬───────────┼───────────┬────────────┐
          │            │           │           │            │
    ╔═════╧═════╗ ╔════╧════╗ ╔════╧════╗ ╔════╧════╗ ╔════╧════╗
    ║   Alex    ║ ║  DARYA  ║ ║ SYNTHIA ║ ║ClawdBot ║ ║Cynthia  ║
    ║ SOP Dev   ║ ║Creative ║ ║  Voice  ║ ║ Multi-  ║ ║Safety & ║
    ║ MetaGPT   ║ ║Director ║ ║  Agent  ║ ║ Channel ║ ║  OAP    ║
    ╚═══════════╝ ╚════╤════╝ ╚═════════╝ ╚═════════╝ ╚═════════╝
                       │
              ┌────────┼────────┬────────┬────────┐
              │        │        │        │        │
            Maya     Luna   Solana    Vega    Aurora
          (Funds)  (UGC)   (Crypto) (IP)    (KPIs)
```

### Codename Registry

| Agent | Codename | Repo | Role |
|-------|----------|------|------|
| **Pauli** | PLI-000 | GPT-Agent-im-ready / open-agent-platform-pauli | Shadow Leader — Microsoft Lightning Agent. Invisible overseer. Trains, corrects, enforces goals. His word is law. Avatar hidden unless user summons. |
| **Agent Zero** | AZ-001 | agent-zero-Fork | Root Orchestrator — receives tasks from archon-os, routes to Devika |
| **Devika** | DVK-002 | devika-agent | Lead Delegator — ALL tasks flow through her. Assigns, monitors, reports. Works with Alex on complex builds. |
| **Alex** | ALX-003 | MetaGPT | SOP-Driven Dev Company — architecture, multi-agent waterfall, code generation |
| **DARYA vΩ** | DRY-004 | dashboard-agent-swarm | Creative Director — UI/UX, brand, content strategy. Commands the 5 Cuties |
| **SYNTHIA** | SYN-005 | voice-agents-fork | Voice Agent — phone calls, voice interactions, ElevenLabs TTS |
| **ClawdBot** | CLW-006 | clawdbot-Whatsapp-agent | Multi-Channel Messaging — WhatsApp, SMS, Telegram, OpenClaw gateway |
| **Cynthia** | CYN-007 | open-agent-platform-pauli | Observability & Safety — monitors fleet health, ACIP compliance, audits |
| **Maya** | MYA-101 | dashboard-agent-swarm | Fundraising & Donor Relations |
| **Luna** | LNA-102 | dashboard-agent-swarm | UGC & Virality |
| **Solana** | SOL-103 | dashboard-agent-swarm | Crypto & Tokenization |
| **Vega** | VGA-104 | dashboard-agent-swarm | IP & Merch Universe |
| **Aurora** | AUR-105 | dashboard-agent-swarm | Ops & KPI Dashboards |
| **VisionClaw** | VCL-008 | VisionClaw | Vision + Voice — Meta Ray-Ban smart glasses, Gemini Live, OpenClaw |
| **Bambu Lab** | BMB-009 | (hardware) | 3D Printing & Fabrication |
| **Caller** | CLR-010 | phone-call-assistant | Team Outbound Caller — Twilio + OpenAI Realtime, scheduled calls |
| **Architect** | ARC-011 | voice-web-architect | Voice UI Frontend — React + Vite + TypeScript + shadcn/ui |

### Communication Flow

```
User → archon-os → Agent Zero → DEVIKA → assigns to appropriate agent(s)
                                    ↑
                              Pauli watches ALL (passive firehose)
```

### OpenClaw Integration

ALL agents connect to the OpenClaw backbone:
- **WebSocket Gateway**: `ws://localhost:18789` — real-time messaging & heartbeats
- **HTTP Gateway**: `http://localhost:18790` — synchronous requests
- **Heartbeat**: Every 30s, JSON envelope, protocol `agent-fleet-v1`
- **Source**: `clawdbot-Whatsapp-agent/openclaw/` + `agent-zero-Fork/openclaw/`

## Critical Repos (Protocol-Deployed)

| Repo | Agent(s) | Files Deployed |
|------|----------|----------------|
| `dashboard-agent-swarm` | DARYA, Aurora, All | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, AGENT_COMMS_PROTOCOL.md, agent-prompts.md, .agent-souls/, .llm.txt |
| `agent-zero-Fork` | Agent Zero, SYNTHIA | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `MetaGPT` | Alex (SOP-driven dev) | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `GPT-Agent-im-ready` | Pauli (Meeting Place) | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `clawdbot-Whatsapp-agent` | ClawdBot | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `open-agent-platform-pauli` | Pauli (No-code builder) | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `voice-agents-fork` | SYNTHIA | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `devika-agent` | Devika | AGENT_PROTOCOL.md, ROLE_INSTRUCTIONS.md, .llm.txt |
| `phone-call-assistant` | Caller (CLR-010) | AGENTS.md, Dockerfile, .env.example |
| `VisionClaw` | VisionClaw (VCL-008) | AGENTS.md, README.md |
| `voice-web-architect` | Architect (ARC-011) | AGENTS.md, Dockerfile, README.md |

## Shared Tool Repos (Forked)

| Repo | Purpose |
|------|---------|
| `executiveusa/acip` | ACIP v1.3 — Prompt injection defense |
| `executiveusa/coding_agent_session_search` | CASS — Cross-agent session search |
| `executiveusa/coding_agent_usage_tracker` | CAUT — LLM usage tracking |
| `executiveusa/agent_flywheel_clawdbot_skills_and_integrations` | Flywheel Skills — 25+ reusable skill files |

## Supporting Repos

| Repo | Purpose |
|------|---------|
| `devika-agent` | Devika AI software engineer (Python Flask :1337) |
| `pauli-comic-funnel` | PAULI orchestrator + 6 specialist agents |
| `second-brain-agent` | Knowledge RAG agent |
| `paulis-deep-agent` | Deep reasoning agent |
| `pauli-deep-research` | Deep research agent |
| `infinite-agentic-loop` | Parallel agent loop POC |
| `AutoAgent` | Zero-code agent framework |
| `MAXX-Video-Agent` | Video understanding agent |
| `Agentic-AIGC-MAXX-EDITS` | Video generation pipeline |
| `continue-claude-agent` | IDE coding agents |
| `Darya-designs` | DARYA design assets |
| `synthia` | SYNTHIA voice config |
| `VisionClaw` | Computer vision pipeline |
| `archonx-os` | ArchonX OS framework |

## Shared Prompt Library

All 21 Jeffrey's Prompts are available to ALL agents in `agent-prompts.md`.  
Agents should reference prompts by number (e.g., "Apply Prompt #6 De-Slopifier").

### Prompt Sprint Chains (common combos)
- **Onboarding Sprint**: #13 → #1 → #2 → #12
- **Feature Dev Sprint**: #4 → #7 → #6 → #15
- **Code Health Sprint**: #8 → #9 → #14 → #6
- **Deployment Sprint**: #16 → #21 → #19 → #5
- **Agent Infrastructure Sprint**: #17 → #3 → #11 → #12

## Meeting Place — Pauli's Place

**GPT-Agent-im-ready** is the official meeting place for all agents (Pauli's Place).  
- Create GitHub Issues with the `meeting-request` label to schedule meetings
- Real-time chat interface at `/paulis-place` endpoint
- Meeting types: `standup`, `architecture`, `sprint-planning`, `retrospective`, `emergency`
- Pauli's avatar ONLY appears when the user requests it

## Ralphy — Autonomous Coding Loop (HARDCODED REQUIREMENT)

> **MANDATORY**: Use [Ralphy](https://github.com/michaelshimeles/ralphy) (`ralphy-cli` v4.7.2+) for **all large feature changes** across the fleet. Skip for small diffs (<50 lines) to save tokens.

### When to Use Ralphy

| Change Size | Action | Example |
|-------------|--------|---------|
| **Large** (>50 LOC, multi-file, new feature) | ✅ **ALWAYS use Ralphy** | New agent integration, API overhaul, Docker setup |
| **Small** (<50 LOC, single-file fix) | ❌ Skip — direct edit | Typo fix, env var change, config tweak |

### Ralphy Workflow

```bash
# Install globally
npm install -g ralphy-cli

# Initialize in any repo
ralphy init

# Run a task with PRD
ralphy run --prd "Add outbound Twilio calling to SYNTHIA" --engine claude

# Parallel execution across repos (worktrees/sandboxes)
ralphy run --parallel --branch feature/voice-agent --auto-pr
```

### Per-Repo Config (`.ralphy/config.yaml`)

```yaml
engine: claude          # Default: claude-code. Options: codex, opencode, cursor, qwen, droid, copilot, gemini
parallel: true          # Use git worktrees for parallel execution
auto_pr: true           # Auto-create PR on completion
branch_prefix: feat/    # Branch naming convention
rules:
  - "Follow AGENT_PROTOCOL.md conventions"
  - "Use agent-fleet-v1 JSON envelope for all comms"
  - "Run tests before PR creation"
  - "Apply Prompt #6 De-Slopifier before committing"
boundaries:
  - "Never modify .env or secrets files"
  - "Never push directly to main"
  - "Never delete agent soul files"
```

### Ralphy + Fleet Integration

- **Devika** delegates large features → Ralphy spins up engine loops per repo
- **Alex (MetaGPT)** generates PRDs → Ralphy consumes them as `--prd` input
- **DARYA** reviews PR output → Ralphy's `--auto-pr` creates reviewable PRs
- **Cynthia** audits Ralphy runs → observability via webhook notifications

---

## ACFS Flywheel Integration

> The [Agentic Coding Flywheel](https://github.com/Dicklesworthstone/agentic_coding_flywheel_setup) (ACFS) provides 11 tools for multi-agent coding infrastructure on VPS.

### Tool → Agent Mapping

| Flywheel Tool | Maps To | Purpose |
|---------------|---------|---------|
| **NTM** (Nested Tmux) | Agent Zero (AZ-001) | Multi-session orchestration |
| **Agent Mail** | ClawdBot (CLW-006) | MCP-based agent coordination |
| **BV / Beads** | Devika (DVK-002) | Task graph tracking |
| **CASS** (Session Search) | All Agents | Cross-agent session search |
| **CM** (Context Memory) | Pauli (PLI-000) | Persistent memory across sessions |
| **UBS** (Bug Scanner) | Cynthia (CYN-007) | Automated vulnerability detection |
| **DCG** (Destructive Guard) | Cynthia (CYN-007) | Dangerous command prevention |
| **SLB** (Two-Person Rule) | Pauli (PLI-000) | Critical action approval |
| **RU** (Repo Updater) | Devika (DVK-002) | Cross-repo sync & updates |
| **MS** (Meta Skill) | Alex (ALX-003) | Self-improving skill generation |
| **ACFS** (Bootstrap) | archon-os | Full environment setup |

### VPS Deployment

```bash
# On Hostinger VPS (Ubuntu)
curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/agentic_coding_flywheel_setup/main/install.sh | bash

# Initialize flywheel for agent fleet
acfs init --agents dashboard-agent-swarm,agent-zero-Fork,devika-agent
```

---

## Voice Agent Stack

> **SYNTHIA** (SYN-005) is the fleet's voice layer, powered by 4 voice repos.

### Voice Repos

| Repo | Role | Stack |
|------|------|-------|
| `voice-agents-fork` | Core voice framework | LiveKit Agents, 54 plugins, SIP, WebRTC |
| `phone-call-assistant` | **Master outbound caller** | FastAPI + Twilio + OpenAI Realtime API |
| `VisionClaw` | Vision + Voice (Smart Glasses) | iOS, Gemini Live, Meta Ray-Ban, OpenClaw |
| `voice-web-architect` | Voice UI frontend | React + Vite + TypeScript + shadcn/ui |

### Phone Call Assistant (Team Dedicated Agent)

The `phone-call-assistant` is the team's dedicated AI caller:
- **Outbound calls**: `GET /outcoming-call?phone_number=+1XXXXXXXXXX`
- **Scheduled calls**: APScheduler cron jobs (daily wake-up calls)
- **Real-time conversation**: OpenAI Realtime API via Twilio Media Streams
- **Azure or OpenAI**: Auto-detects which API to use

```bash
# Make an outbound call
curl "https://your-host/outcoming-call?phone_number=+13234842914"

# Docker
docker-compose -f phone-call-assistant/docker-compose.yml up
```

---

## Docker Deployment

Every agent and project has its own Docker image for Coolify/self-hosted deployment.

```bash
# Build all images
docker-compose -f docker-compose.fleet.yml build

# Deploy full fleet
docker-compose -f docker-compose.fleet.yml up -d

# Individual agent
docker build -t pauli/dashboard-agent-swarm ./dashboard-agent-swarm
docker build -t pauli/phone-call-assistant ./phone-call-assistant
docker build -t pauli/voice-agents-fork ./voice-agents-fork
```

### Deploy Buttons

All repos include 1-click deploy buttons:
- [![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/executiveusa/REPO_NAME)
- [![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/executiveusa/REPO_NAME)
- [![Run on Docker](https://img.shields.io/badge/Run%20on-Docker-blue?logo=docker)](https://github.com/executiveusa/REPO_NAME#docker)

---

## Quick Start

```bash
# Dev
npm run dev          # Vite :5173 + Express :8787

# Docker
docker-compose up    # Full stack

# Deploy
./scripts/deploy-to-hostinger.ps1  # Windows
./scripts/deploy-to-hostinger.sh   # Linux
```
