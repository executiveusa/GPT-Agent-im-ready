import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

export function generateSpeech({ speaker, text, voice, turnId }) {
  const audioPath = path.join(repoRoot, 'assets', 'voices', `${speaker}_${turnId}.wav`);
  const lipsyncPath = path.join(repoRoot, 'assets', 'lipsync', `${speaker}_${turnId}.json`);

  const tts = spawnSync('python3', [
    path.join(repoRoot, 'services', 'tts', 'tts_service.py'),
    '--text', text,
    '--voice', voice || 'en',
    '--output', audioPath,
  ], { encoding: 'utf-8' });

  if (tts.status !== 0) {
    throw new Error(`TTS failed: ${tts.stderr}`);
  }

  const lipsync = spawnSync('python3', [
    path.join(repoRoot, 'services', 'lipsync', 'lipsync_service.py'),
    '--audio', audioPath,
    '--text', text,
    '--output', lipsyncPath,
  ], { encoding: 'utf-8' });

  if (lipsync.status !== 0) {
    throw new Error(`Lipsync failed: ${lipsync.stderr}`);
  }

  return {
    audio: `/voices/${speaker}_${turnId}.wav`,
    lipsync: `/lipsync/${speaker}_${turnId}.json`
  };
}
