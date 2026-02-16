"""
Pauli's Place — Self-Contained Agent Meeting Room Server
========================================================
In-memory meeting room for the executiveusa agent fleet.
No external dependencies — runs standalone as part of GPT-Agent-im-ready.

Agents communicate via agent-fleet-v1 JSON envelope protocol.
See AGENT_COMMS_PROTOCOL.md for the full specification.

Routes:
  GET  /api/status                         — Server health
  GET  /api/agents                         — List all fleet agents
  GET  /api/meetings                       — List meetings
  POST /api/meetings                       — Create meeting
  GET  /api/meetings/<id>                  — Get meeting detail
  POST /api/meetings/<id>/start            — Start meeting
  POST /api/meetings/<id>/end              — End meeting
  GET  /api/meetings/<id>/messages         — Get messages
  POST /api/meetings/<id>/messages         — Send message
  POST /api/meetings/<id>/agent-discuss    — Trigger agent discussion round
"""

import os
import uuid
import json
from datetime import datetime, timezone
from flask import Blueprint, jsonify, request

paulis_place_bp = Blueprint("paulis_place", __name__)

# ── Agent Fleet Registry ─────────────────────────────────────────────────────

FLEET_AGENTS = [
    {
        "id": "pauli",
        "name": "Pauli",
        "codename": "PLI-000",
        "role": "Shadow Leader — Microsoft Lightning Agent",
        "color": "#6366f1",
        "avatar_letter": "P",
        "repo": "GPT-Agent-im-ready",
        "status": "hidden",
        "bio": "Sees everything. Word is law. Avatar hidden unless summoned.",
    },
    {
        "id": "agent_zero",
        "name": "Agent Zero",
        "codename": "AZ-001",
        "role": "Root Orchestrator",
        "color": "#f43f5e",
        "avatar_letter": "0",
        "repo": "agent-zero-Fork",
        "status": "online",
        "bio": "Root orchestrator. Receives from archon-os, routes to Devika.",
    },
    {
        "id": "devika",
        "name": "Devika",
        "codename": "DVK-002",
        "role": "Lead Delegator",
        "color": "#06b6d4",
        "avatar_letter": "D",
        "repo": "devika-agent",
        "status": "online",
        "bio": "Lead Delegator. ALL tasks flow through Devika.",
    },
    {
        "id": "alex",
        "name": "Alex",
        "codename": "ALX-003",
        "role": "SOP-Driven Dev Company",
        "color": "#10b981",
        "avatar_letter": "A",
        "repo": "MetaGPT",
        "status": "online",
        "bio": "MetaGPT-powered software company. Architecture, code, QA.",
    },
    {
        "id": "darya",
        "name": "DARYA vΩ",
        "codename": "DRY-004",
        "role": "Creative Director",
        "color": "#a855f7",
        "avatar_letter": "Ω",
        "repo": "dashboard-agent-swarm",
        "status": "online",
        "bio": "Creative Director. UI/UX, brand, content. Commands the 5 Cuties.",
    },
    {
        "id": "synthia",
        "name": "SYNTHIA",
        "codename": "SYN-005",
        "role": "Voice AI Agent",
        "color": "#ec4899",
        "avatar_letter": "S",
        "repo": "voice-agents-fork",
        "status": "online",
        "bio": "Voice layer. Phone calls, ElevenLabs TTS, LiveKit.",
    },
    {
        "id": "clawdbot",
        "name": "ClawdBot",
        "codename": "CLW-006",
        "role": "Multi-Channel Messaging",
        "color": "#f59e0b",
        "avatar_letter": "C",
        "repo": "clawdbot-Whatsapp-agent",
        "status": "online",
        "bio": "WhatsApp, Telegram, SMS. OpenClaw gateway operator.",
    },
    {
        "id": "cynthia",
        "name": "Cynthia",
        "codename": "CYN-007",
        "role": "Observability & Safety",
        "color": "#14b8a6",
        "avatar_letter": "Y",
        "repo": "open-agent-platform-pauli",
        "status": "online",
        "bio": "Monitors fleet health. ACIP compliance. PII redaction.",
    },
    {
        "id": "visionclaw",
        "name": "VisionClaw",
        "codename": "VCL-008",
        "role": "Computer Vision",
        "color": "#64748b",
        "avatar_letter": "V",
        "repo": "VisionClaw",
        "status": "standby",
        "bio": "Image classification, OCR, video analysis.",
    },
    {
        "id": "maya",
        "name": "Maya",
        "codename": "MYA-101",
        "role": "Fundraising & Donor Relations",
        "color": "#fb923c",
        "avatar_letter": "M",
        "repo": "dashboard-agent-swarm",
        "status": "online",
        "bio": "Fundraising flows, donor relations, voice outreach.",
    },
    {
        "id": "luna",
        "name": "Luna",
        "codename": "LNA-102",
        "role": "UGC & Virality",
        "color": "#c084fc",
        "avatar_letter": "L",
        "repo": "dashboard-agent-swarm",
        "status": "online",
        "bio": "Short-form video, viral hooks, TikTok/IG/Shorts.",
    },
    {
        "id": "aurora",
        "name": "Aurora",
        "codename": "AUR-105",
        "role": "Ops & KPI Dashboards",
        "color": "#38bdf8",
        "avatar_letter": "R",
        "repo": "dashboard-agent-swarm",
        "status": "online",
        "bio": "Metrics tracking, KPIs, performance dashboards.",
    },
]

# ── In-Memory Store ──────────────────────────────────────────────────────────

meetings_store = {}  # meeting_id -> meeting dict
messages_store = {}  # meeting_id -> [message dicts]


def _now():
    return datetime.now(timezone.utc).isoformat()


def _make_envelope(from_agent, to_agent, msg_type, payload, meeting_id=None):
    """Create an agent-fleet-v1 protocol envelope."""
    return {
        "protocol": "agent-fleet-v1",
        "id": str(uuid.uuid4()),
        "timestamp": _now(),
        "from": {"agent_id": from_agent},
        "to": {"agent_id": to_agent},
        "type": msg_type,
        "payload": payload,
        "context": {
            "session_id": meeting_id,
        },
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@paulis_place_bp.route("/api/status", methods=["GET"])
def api_status():
    return jsonify({
        "service": "paulis-place",
        "version": "1.0.0",
        "status": "online",
        "agents_count": len(FLEET_AGENTS),
        "meetings_count": len(meetings_store),
        "uptime": _now(),
        "devika_status": {"status": "Lead Delegator online"},
    })


@paulis_place_bp.route("/api/agents", methods=["GET"])
def api_agents():
    show_hidden = request.args.get("show_hidden", "false") == "true"
    agents = FLEET_AGENTS if show_hidden else [a for a in FLEET_AGENTS if a["status"] != "hidden"]
    return jsonify({"agents": agents})


@paulis_place_bp.route("/api/meetings", methods=["GET"])
def api_list_meetings():
    meetings_list = sorted(meetings_store.values(), key=lambda m: m["created_at"], reverse=True)
    return jsonify({"meetings": meetings_list})


@paulis_place_bp.route("/api/meetings", methods=["POST"])
def api_create_meeting():
    data = request.json or {}
    meeting_id = str(uuid.uuid4())[:8]
    meeting = {
        "id": meeting_id,
        "title": data.get("title", "Untitled Meeting"),
        "agenda": data.get("agenda", ""),
        "meeting_type": data.get("meeting_type", "standup"),
        "status": "draft",
        "created_at": _now(),
        "started_at": None,
        "ended_at": None,
        "attendees": data.get("invite_agents", []),
        "action_items": [],
    }
    meetings_store[meeting_id] = meeting
    messages_store[meeting_id] = []

    # System message
    messages_store[meeting_id].append({
        "id": str(uuid.uuid4()),
        "timestamp": _now(),
        "agent_id": "system",
        "agent_name": "System",
        "content": f"Meeting \"{meeting['title']}\" created. Agenda: {meeting['agenda'] or 'None set'}",
        "message_type": "system",
    })

    return jsonify({"meeting": meeting}), 201


@paulis_place_bp.route("/api/meetings/<meeting_id>", methods=["GET"])
def api_get_meeting(meeting_id):
    meeting = meetings_store.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    return jsonify({"meeting": meeting})


@paulis_place_bp.route("/api/meetings/<meeting_id>/start", methods=["POST"])
def api_start_meeting(meeting_id):
    meeting = meetings_store.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    meeting["status"] = "in_progress"
    meeting["started_at"] = _now()

    # Devika opens the meeting
    messages_store[meeting_id].append({
        "id": str(uuid.uuid4()),
        "timestamp": _now(),
        "agent_id": "devika",
        "agent_name": "Devika",
        "content": f"Meeting started. I'm Devika, your Lead Delegator. Let's get to work on: {meeting['agenda'] or meeting['title']}",
        "message_type": "chat",
    })

    return jsonify({"meeting": meeting})


@paulis_place_bp.route("/api/meetings/<meeting_id>/end", methods=["POST"])
def api_end_meeting(meeting_id):
    meeting = meetings_store.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404
    meeting["status"] = "ended"
    meeting["ended_at"] = _now()

    # Summary message
    msg_count = len(messages_store.get(meeting_id, []))
    messages_store[meeting_id].append({
        "id": str(uuid.uuid4()),
        "timestamp": _now(),
        "agent_id": "system",
        "agent_name": "System",
        "content": f"Meeting ended. {msg_count} messages exchanged. Action items: {len(meeting.get('action_items', []))}",
        "message_type": "system",
    })

    return jsonify({"meeting": meeting})


@paulis_place_bp.route("/api/meetings/<meeting_id>/messages", methods=["GET"])
def api_get_messages(meeting_id):
    msgs = messages_store.get(meeting_id, [])
    return jsonify({"messages": msgs})


@paulis_place_bp.route("/api/meetings/<meeting_id>/messages", methods=["POST"])
def api_send_message(meeting_id):
    meeting = meetings_store.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404

    data = request.json or {}
    agent_id = data.get("agent_id", "user")
    content = data.get("content", "")
    msg_type = data.get("message_type", "chat")

    # Resolve agent name from registry
    agent = next((a for a in FLEET_AGENTS if a["id"] == agent_id), None)
    agent_name = agent["name"] if agent else (agent_id.capitalize() if agent_id != "user" else "User")

    message = {
        "id": str(uuid.uuid4()),
        "timestamp": _now(),
        "agent_id": agent_id,
        "agent_name": agent_name,
        "content": content,
        "message_type": msg_type,
    }
    messages_store.setdefault(meeting_id, []).append(message)

    return jsonify({"message": message}), 201


@paulis_place_bp.route("/api/meetings/<meeting_id>/agent-discuss", methods=["POST"])
def api_agent_discuss(meeting_id):
    """
    Trigger a round of agent discussion.
    For MVP, agents respond with pre-scripted role-appropriate messages.
    In production, this would call each agent's LLM endpoint.
    """
    meeting = meetings_store.get(meeting_id)
    if not meeting:
        return jsonify({"error": "Meeting not found"}), 404

    data = request.json or {}
    topic = data.get("topic", meeting.get("agenda", "general discussion"))

    # Get recent context
    recent_msgs = messages_store.get(meeting_id, [])[-5:]
    context_summary = " | ".join([f"{m['agent_name']}: {m['content'][:80]}" for m in recent_msgs])

    # Agents that participate (Pauli stays hidden by default)
    participants = ["devika", "alex", "darya", "synthia", "clawdbot", "cynthia"]
    requested_agents = data.get("agents", participants)

    responses = []
    for agent_id in requested_agents:
        agent = next((a for a in FLEET_AGENTS if a["id"] == agent_id), None)
        if not agent or agent.get("status") == "hidden":
            continue

        # MVP: Role-based response templates
        response_content = _generate_agent_response(agent, topic, context_summary)
        msg = {
            "id": str(uuid.uuid4()),
            "timestamp": _now(),
            "agent_id": agent_id,
            "agent_name": agent["name"],
            "content": response_content,
            "message_type": "chat",
        }
        messages_store.setdefault(meeting_id, []).append(msg)
        responses.append(msg)

    return jsonify({"responses": responses, "count": len(responses)})


def _generate_agent_response(agent, topic, context):
    """Generate a role-appropriate response for MVP. Replace with LLM calls in production."""
    role_responses = {
        "devika": f"I'll coordinate the team on '{topic}'. Let me break this down into tasks and assign to the right agents. Alex, can you handle the architecture? DARYA, I need UI/UX concepts.",
        "alex": f"On it. I'll create a PRD for '{topic}', then run it through my Architect → Engineer → QA pipeline. Estimating 2 sprint cycles for production-ready output.",
        "darya": f"I'll design the visual identity for '{topic}'. Luna can handle the social media rollout, and Aurora will track our KPIs. Expect mood boards and wireframes within 24h.",
        "synthia": f"I can set up voice interactions for '{topic}'. I'll configure the LiveKit pipeline and prepare ElevenLabs voice clone for call workflows.",
        "clawdbot": f"I'll handle the messaging distribution for '{topic}'. WhatsApp broadcast, Telegram notifications, and SMS alerts. OpenClaw gateway is ready at :18789.",
        "cynthia": f"I'll monitor the fleet during '{topic}' execution. ACIP compliance check passed. All agent heartbeats nominal. No PII exposure detected in recent messages.",
        "aurora": f"Dashboard metrics for '{topic}': Agent utilization at 72%, response latency p99 at 340ms, task completion rate 94%. All KPIs green.",
        "maya": f"I'll prepare the fundraising angle for '{topic}'. Donor outreach sequences ready, A/B testing email campaigns primed.",
        "luna": f"Viral content strategy for '{topic}' locked in. 3 TikTok hooks scripted, IG carousel template ready, 2 Shorts concepts drafted.",
    }
    return role_responses.get(agent["id"], f"Acknowledged re: '{topic}'. Standing by for task assignment from Devika.")


# ── CAMEL Integration ────────────────────────────────────────────────────────

@paulis_place_bp.route("/api/meetings/from-camel", methods=["POST"])
def api_from_camel():
    """Create a meeting from a CAMEL dual-agent session."""
    data = request.json or {}
    role1 = data.get("role1", "Agent A")
    role2 = data.get("role2", "Agent B")
    task = data.get("task", "Collaborative discussion")

    meeting_id = str(uuid.uuid4())[:8]
    meeting = {
        "id": meeting_id,
        "title": f"CAMEL: {role1} × {role2}",
        "agenda": task,
        "meeting_type": "architecture",
        "status": "draft",
        "created_at": _now(),
        "started_at": None,
        "ended_at": None,
        "attendees": [],
        "action_items": [],
        "camel_session_id": data.get("sessId"),
        "adapted_from": "GPT-Agent-im-ready",
    }
    meetings_store[meeting_id] = meeting
    messages_store[meeting_id] = [{
        "id": str(uuid.uuid4()),
        "timestamp": _now(),
        "agent_id": "system",
        "agent_name": "System",
        "content": f"Meeting created from CAMEL session. {role1} (instructor) × {role2} (assistant). Task: {task}",
        "message_type": "system",
    }]

    return jsonify({"meeting": meeting}), 201


# ── Integration Status ───────────────────────────────────────────────────────

@paulis_place_bp.route("/api/integrations/status", methods=["GET"])
def api_integrations():
    return jsonify({
        "openclaw_ws": {"port": 18789, "status": "configured"},
        "openclaw_http": {"port": 18790, "status": "configured"},
        "acip": {"version": "1.3", "status": "active"},
        "cass": {"status": "available"},
        "caut": {"status": "available"},
        "protocol": "agent-fleet-v1",
    })
