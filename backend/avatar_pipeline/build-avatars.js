import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoAgents } from '../agents/demoAgents.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const inputDir = path.join(repoRoot, 'assets', 'avatars_input');
const outputDir = path.join(repoRoot, 'assets', 'avatars_generated');
const registryPath = path.join(repoRoot, 'backend', 'data', 'agent_registry.json');

fs.mkdirSync(outputDir, { recursive: true });

const registry = {};
for (const file of fs.readdirSync(inputDir)) {
  const ext = path.extname(file).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) continue;
  const agentId = path.basename(file, ext);
  const outGlb = path.join(outputDir, `${agentId}.glb`);
  const py = spawnSync('python3', [
    path.join(repoRoot, 'services', 'avatar_generation', 'generate_avatar.py'),
    path.join(inputDir, file),
    outGlb,
  ], { stdio: 'inherit' });
  if (py.status !== 0) continue;

  const demoCfg = demoAgents.find((a) => a.id === agentId);
  registry[agentId] = {
    avatar: `/avatars_generated/${agentId}.glb`,
    voice: demoCfg?.voice || 'en',
    seat: demoCfg?.seat ?? 0,
    style: demoCfg?.style || 'semi_realistic'
  };
}

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`Built ${Object.keys(registry).length} avatars.`);
