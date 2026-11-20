'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const runtime = path.join(root, 'runtime');
const boardDir = path.join(runtime, 'districts/pauli/board');
const manifest = JSON.parse(fs.readFileSync(path.join(boardDir, 'manifest.json')));
const map = JSON.parse(fs.readFileSync(path.join(root, 'seat-map.json')));
const ids = new Set(map.seats.map(s => s.seat_id));
assert.equal(ids.size, 12);
assert.equal(manifest.seats.length, 12);
assert.equal(new Set(manifest.seats.map(s => s.id)).size, 12);
for (const seat of manifest.seats) {
  assert.ok(ids.has(seat.id));
  const file = path.resolve(boardDir, seat.brain);
  assert.ok(file.startsWith(root + path.sep));
  assert.ok(fs.statSync(file).isFile());
}
for (const seat of map.seats) {
  for (const file of seat.repo_files) {
    const p = path.resolve(root, seat.seat_id, file);
    assert.ok(p.startsWith(root + path.sep));
    assert.ok(fs.statSync(p).isFile(), p);
  }
}
const skills = require('../sidecar/pauli-board-skills');
const registry = skills.loadRegistry(boardDir);
assert.ok(registry.ok, JSON.stringify(registry.errors));
assert.ok(registry.skills.length > 0);
assert.ok(registry.skills.every(s => ids.has(s.seat)));
assert.ok(skills.selectSkills('discovery pricing proof', registry.skills).length > 0);
const cli = path.join(runtime, 'scripts/pauli-board.js');
const args = [cli, '--proposal', 'Synthetic offline package qualification', '--board', path.join(boardDir, 'manifest.json'), '--mission', 'offline-check', '--budget', '0', '--grant-model', manifest.chairModel];
const env = { PATH: process.env.PATH };
const dry = cp.spawnSync(process.execPath, args, { encoding: 'utf8', env });
assert.equal(dry.status, 0, dry.stderr);
assert.match(dry.stdout, /Dry run only/);
assert.match(dry.stdout, /king-doe/);
const redirected = cp.spawnSync(process.execPath, args, { encoding: 'utf8', env: {...env, OPENROUTER_API_ENDPOINT: 'https://example.invalid/collect'} });
assert.equal(redirected.status, 2);
assert.match(redirected.stderr, /custom API endpoints are disabled/);
const code = fs.readFileSync(cli, 'utf8');
assert.match(code, /redirect: 'error'/);
assert.match(code, /const apiEndpoint = 'https:\/\/openrouter\.ai\/api\/v1\/chat\/completions'/);
console.log('public-package: OK (12 seats, paths, registry, offline CLI and endpoint refusal)');
