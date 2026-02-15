"""
Meeting Bridge — Connects GPT-Agent-im-ready (CAMEL dual-agent) to Devika's
Visual Agent Meeting Room backend.

This module:
1. Wraps the legacy CAMEL agent_convo into meeting-room-compatible agents
2. Provides Flask blueprint with routes that proxy to Devika's meeting API
3. Enables the React frontend to join meetings with the full agent roster

Environment:
    DEVIKA_MEETING_URL  — Devika backend URL (default: http://localhost:1337)
"""

import os
import requests
from flask import Blueprint, jsonify, request

DEVIKA_URL = os.environ.get("DEVIKA_MEETING_URL", "http://localhost:1337")

meeting_bridge_bp = Blueprint("meeting_bridge", __name__)


def _devika_api(method: str, path: str, json_data=None):
    """Forward a request to Devika's meeting API."""
    url = f"{DEVIKA_URL}{path}"
    try:
        if method == "GET":
            resp = requests.get(url, timeout=10)
        elif method == "POST":
            resp = requests.post(url, json=json_data, timeout=10)
        elif method == "DELETE":
            resp = requests.delete(url, timeout=10)
        else:
            return {"error": f"Unsupported method {method}"}, 400
        return resp.json(), resp.status_code
    except requests.ConnectionError:
        return {"error": "Cannot reach Devika meeting server", "url": url}, 503
    except Exception as e:
        return {"error": str(e)}, 500


# ── Proxy endpoints ──────────────────────────────────────────────────────────

@meeting_bridge_bp.route("/meeting/status", methods=["GET"])
def meeting_status():
    """Check if Devika meeting server is reachable."""
    data, code = _devika_api("GET", "/api/status")
    return jsonify({"devika_status": data, "bridge": "online"}), code


@meeting_bridge_bp.route("/meeting/list", methods=["GET"])
def list_meetings():
    data, code = _devika_api("GET", "/api/meetings")
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/create", methods=["POST"])
def create_meeting():
    payload = request.json or {}
    data, code = _devika_api("POST", "/api/meetings", payload)
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/<meeting_id>", methods=["GET"])
def get_meeting(meeting_id):
    data, code = _devika_api("GET", f"/api/meetings/{meeting_id}")
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/<meeting_id>/start", methods=["POST"])
def start_meeting(meeting_id):
    data, code = _devika_api("POST", f"/api/meetings/{meeting_id}/start")
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/<meeting_id>/end", methods=["POST"])
def end_meeting(meeting_id):
    data, code = _devika_api("POST", f"/api/meetings/{meeting_id}/end")
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/<meeting_id>/messages", methods=["GET"])
def get_messages(meeting_id):
    data, code = _devika_api("GET", f"/api/meetings/{meeting_id}/messages")
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/<meeting_id>/messages", methods=["POST"])
def send_message(meeting_id):
    payload = request.json or {}
    data, code = _devika_api("POST", f"/api/meetings/{meeting_id}/messages", payload)
    return jsonify(data), code


@meeting_bridge_bp.route("/meeting/agents", methods=["GET"])
def list_agents():
    data, code = _devika_api("GET", "/api/agents")
    return jsonify(data), code


# ── CAMEL Session → Meeting Adapter ──────────────────────────────────────────

@meeting_bridge_bp.route("/meeting/from-camel", methods=["POST"])
def create_meeting_from_camel():
    """
    Create a Devika meeting from an existing CAMEL session.
    Expects: { "sessId": <int>, "role1": "...", "role2": "...", "task": "..." }
    """
    payload = request.json or {}
    role1 = payload.get("role1", "Agent A")
    role2 = payload.get("role2", "Agent B")
    task = payload.get("task", "Collaborative discussion")

    meeting_data = {
        "title": f"CAMEL: {role1} × {role2}",
        "agenda": task,
        "invite_agents": [],  # agents are seeded by devika
    }
    data, code = _devika_api("POST", "/api/meetings", meeting_data)
    if code == 200 or code == 201:
        data["camel_session_id"] = payload.get("sessId")
        data["adapted_from"] = "GPT-Agent-im-ready"
    return jsonify(data), code


# ── Integration status ───────────────────────────────────────────────────────

@meeting_bridge_bp.route("/meeting/integrations", methods=["GET"])
def integration_status():
    data, code = _devika_api("GET", "/api/integrations/status")
    return jsonify(data), code
