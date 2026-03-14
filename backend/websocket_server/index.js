import express from 'express';
import cors from 'cors';
import http from 'http';
import fs from 'node:fs';
import path from 'node:path';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { nextTurn } from '../conversation_engine/engine.js';
import { generateSpeech } from '../voice_pipeline/generateSpeech.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const registryPath = path.join(repoRoot, 'backend', 'data', 'agent_registry.json');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/avatars_generated', express.static(path.join(repoRoot, 'assets', 'avatars_generated')));
app.use('/voices', express.static(path.join(repoRoot, 'assets', 'voices')));
app.use('/lipsync', express.static(path.join(repoRoot, 'assets', 'lipsync')));

app.get('/agent_registry', (req, res) => {
  if (!fs.existsSync(registryPath)) return res.json({});
  return res.json(JSON.parse(fs.readFileSync(registryPath, 'utf-8')));
});

app.post('/tts', (req, res) => {
  const { text, voice = 'en', speaker = 'agent', turnId = Date.now() } = req.body;
  try {
    const out = generateSpeech({ speaker, text, voice, turnId });
    res.json(out);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

io.on('connection', (socket) => {
  socket.emit('connected', { ok: true });
});

let turn = 0;
setInterval(() => {
  if (!fs.existsSync(registryPath)) return;
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  const payload = nextTurn(turn++);
  const cfg = registry[payload.speaker];
  if (!cfg) return;

  const turnId = `${Date.now()}`;
  try {
    const speech = generateSpeech({
      speaker: payload.speaker,
      text: payload.text,
      voice: cfg.voice,
      turnId,
    });

    io.emit('conversation_turn', {
      ...payload,
      ...speech,
      seat: cfg.seat,
    });
    io.emit('agent_speaking', { speaker: payload.speaker });
  } catch (error) {
    console.error(error);
  }
}, 9000);

const port = process.env.AGENT_WORLD_PORT || 8788;
server.listen(port, () => {
  console.log(`Agent world server on :${port}`);
});
