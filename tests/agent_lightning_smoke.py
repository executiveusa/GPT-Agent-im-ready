"""BEAD-0005: backend websocket server smoke test."""

from __future__ import annotations

import json
import os
import socket
import subprocess
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
SERVER_ENTRY = ROOT / "backend" / "websocket_server" / "index.js"


def _pick_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def _wait_for_health(port: int, proc: subprocess.Popen[str]) -> dict[str, object]:
    deadline = time.time() + 20
    last_error: Exception | None = None

    while time.time() < deadline:
        if proc.poll() is not None:
            raise AssertionError(f"server exited early with code {proc.returncode}")

        try:
            with urlopen(f"http://127.0.0.1:{port}/health", timeout=1) as response:
                return json.load(response)
        except (OSError, URLError, json.JSONDecodeError) as exc:
            last_error = exc
            time.sleep(0.25)

    raise AssertionError(f"backend server never became healthy: {last_error}")


def test_agent_lightning_smoke_stub() -> None:
    port = _pick_port()
    env = os.environ.copy()
    env["BACKEND_PORT"] = str(port)
    env["BACKEND_HOST"] = "127.0.0.1"
    env["NODE_ENV"] = "test"

    proc = subprocess.Popen(
        ["node", str(SERVER_ENTRY)],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    try:
        health = _wait_for_health(port, proc)
        assert health["ok"] is True
        assert health["service"] == "backend-websocket-server"

        with urlopen(f"http://127.0.0.1:{port}/api/turn?index=0", timeout=5) as response:
            turn_payload = json.load(response)

        assert turn_payload["ok"] is True
        assert turn_payload["turn"]["speaker"] == "Strategist"
        assert "text" in turn_payload["turn"]
    finally:
        if proc.poll() is None:
            proc.terminate()
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                proc.kill()
                proc.wait(timeout=10)
