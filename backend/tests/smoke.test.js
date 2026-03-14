import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const inputDir = path.resolve('assets/avatars_input');
fs.mkdirSync(inputDir, { recursive: true });

const onePxPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zq8QAAAAASUVORK5CYII=',
  'base64'
);

for (const name of ['Strategist', 'Engineer', 'Researcher']) {
  fs.writeFileSync(path.join(inputDir, `${name}.png`), onePxPng);
}

const build = spawnSync('node', ['backend/avatar_pipeline/build-avatars.js'], { stdio: 'inherit' });
if (build.status !== 0) process.exit(build.status);

const registry = JSON.parse(fs.readFileSync('backend/data/agent_registry.json', 'utf-8'));
if (!registry.Strategist || !registry.Engineer || !registry.Researcher) {
  console.error('Missing demo agents in registry');
  process.exit(1);
}

for (const name of ['Strategist', 'Engineer', 'Researcher']) {
  const p = path.join(inputDir, `${name}.png`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

console.log('backend smoke test passed');
