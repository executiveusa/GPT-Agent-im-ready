import http from 'node:http';
import { URL } from 'node:url';

import { nextTurn } from '../conversation_engine/engine.js';

const host = process.env.BACKEND_HOST || process.env.HOST || '0.0.0.0';
const port = Number(process.env.BACKEND_PORT || process.env.PORT || 4001);

const state = {
  turnIndex: 0,
};

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  });
  res.end(body);
}

function getTurn(index) {
  const turn = nextTurn(index);
  return {
    index,
    speaker: turn.speaker,
    text: turn.text,
    emotion: turn.emotion,
  };
}

function handleHealth(res) {
  jsonResponse(res, 200, {
    ok: true,
    service: 'backend-websocket-server',
    status: 'running',
    host,
    port,
    nextTurnIndex: state.turnIndex,
  });
}

function handleTurn(req, res, url) {
  const indexParam = url.searchParams.get('index');
  const parsedIndex = indexParam === null ? state.turnIndex : Number.parseInt(indexParam, 10);
  const index = Number.isFinite(parsedIndex) ? parsedIndex : 0;
  const turn = getTurn(index);

  if (req.method === 'POST') {
    state.turnIndex = index + 1;
  }

  jsonResponse(res, 200, {
    ok: true,
    turn,
    nextIndex: state.turnIndex,
  });
}

const server = http.createServer((req, res) => {
  if (!req.url) {
    jsonResponse(res, 400, { ok: false, error: 'Missing request URL' });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && url.pathname === '/health') {
    handleHealth(res);
    return;
  }

  if ((req.method === 'GET' || req.method === 'POST') && url.pathname === '/api/turn') {
    handleTurn(req, res, url);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/advance') {
    const next = getTurn(state.turnIndex);
    state.turnIndex += 1;
    jsonResponse(res, 200, {
      ok: true,
      turn: next,
      nextIndex: state.turnIndex,
    });
    return;
  }

  jsonResponse(res, 404, {
    ok: false,
    error: 'Not found',
  });
});

server.listen(port, host, () => {
  console.log(`[backend-websocket-server] listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`[backend-websocket-server] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
