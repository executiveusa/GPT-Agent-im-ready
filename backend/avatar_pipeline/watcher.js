import chokidar from 'chokidar';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const inputDir = path.join(repoRoot, 'assets', 'avatars_input');

function rebuild() {
  const proc = spawn('node', [path.join(__dirname, 'build-avatars.js')], { stdio: 'inherit' });
  proc.on('exit', (code) => console.log(`Avatar build finished with ${code}`));
}

chokidar.watch(inputDir, { ignoreInitial: false }).on('add', rebuild).on('change', rebuild);
console.log(`Watching ${inputDir}`);
