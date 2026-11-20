#!/usr/bin/env node
/* scripts/pauli-board.js - the live caller for council board mode.

   Convenes a board of advisors on one proposal: persona seats (each with a brain folder) speak in
   order on free-first models, the chair locks a scored recommendation. The estimate prints BEFORE
   anything runs and the run only proceeds with --yes (the owner approves the estimate, never a
   blank check). Deny-by-default ASTRA gate: a mission-bound grant (--mission/--budget/--grant-model)
   is required. Free models price at $0 through the price table like everything else.

   Usage:
     # Set OPENROUTER_API_KEY through your existing secret manager, not inline.
     node scripts/pauli-board.js \
       --proposal "launch X" --board districts/pauli/board/manifest.json \
       --mission msn-1 --budget 0 --grant-model nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free

   The manifest: { "chairModel": "id", "seats": [{ "id", "model", "weight", "brain": "seats/x.md" }] }
   Swap any model at call time: --set hormozi=other/model:free --set chair=other/model:free (repeatable).
   Brains load relative to the manifest. --prices overrides the free-first price table. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');
const { makePauliCouncilRunner } = require('../sidecar/pauli-council-runner.js');

function arg(name, dflt) {
  const i = process.argv.indexOf('--' + name);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
}
const has = name => process.argv.includes('--' + name);
function argAll(name) {
  const out = [];
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === '--' + name && process.argv[i + 1]) out.push(process.argv[i + 1]);
  return out;
}

const proposal = arg('proposal', null);
const manifestPath = arg('board', null);
const missionId = arg('mission', null);
const budgetUSD = parseFloat(arg('budget', 'NaN'));
const grantModel = arg('grant-model', null);
const grantTtlMin = parseInt(arg('grant-ttl-min', '60'), 10);
if (Number.isNaN(grantTtlMin) || grantTtlMin <= 0) {
  console.error('--grant-ttl-min must be a positive integer (got: ' + arg('grant-ttl-min', '60') + ')');
  process.exit(2);
}
const repoRoot = path.join(__dirname, '..');
const pricesPath = arg('prices', path.join(repoRoot, 'districts', 'pauli', 'board', 'prices.free.json'));

if (!proposal || !manifestPath || !missionId || !grantModel || Number.isNaN(budgetUSD)) {
  console.error('required: --proposal --board --mission --budget --grant-model [--yes] [--prices] [--grant-ttl-min]');
  process.exit(2);
}
let manifest;
let prices;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
} catch (e) {
  console.error('cannot read/parse board manifest ' + manifestPath + ': ' + (e && e.message ? e.message : String(e)));
  process.exit(2);
}
const modelOverrides = {};
for (const pair of argAll('set')) { // --set hormozi=qwen/qwen-2.5-72b-instruct:free - repeatable; 'chair' swaps the chair model
  const eq = pair.indexOf('=');
  if (eq < 1) { console.error('--set needs seat=model (got: ' + pair + ')'); process.exit(2); }
  modelOverrides[pair.slice(0, eq)] = pair.slice(eq + 1);
}
const manifestDir = path.dirname(manifestPath);
try {
  prices = JSON.parse(fs.readFileSync(pricesPath, 'utf8'));
} catch (e) {
  console.error('cannot read/parse prices file ' + pricesPath + ': ' + (e && e.message ? e.message : String(e)));
  process.exit(2);
}
const seatInstructions = {};
for (const s of manifest.seats) {
  if (!s.brain) continue;
  const brainPath = path.join(manifestDir, s.brain);
  try {
    seatInstructions[s.id] = fs.readFileSync(brainPath, 'utf8');
  } catch (e) {
    console.error('cannot read brain file for seat ' + s.id + ' at ' + brainPath + ': ' + (e && e.message ? e.message : String(e)));
    process.exit(2);
  }
}

if (process.env.OPENROUTER_API_ENDPOINT && process.env.OPENROUTER_API_ENDPOINT !== 'https://openrouter.ai/api/v1/chat/completions') {
  console.error('custom API endpoints are disabled in this public package');
  process.exit(2);
}
const apiKey = process.env.OPENROUTER_API_KEY;
async function callModel({ model, prompt }) {
 try {
  if (!apiKey) return { text: '' }; // runner turns this into a clean worker-failed
  const apiEndpoint = 'https://openrouter.ai/api/v1/chat/completions';
  const res = await fetch(apiEndpoint, {
    method: 'POST',
    redirect: 'error',
    headers: { 'Authorization': 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] })
  });
  if (!res.ok) { const eb = await res.text().catch(() => ''); console.error('[callModel] ' + model + ' HTTP ' + res.status + ': ' + eb.slice(0, 300)); return { text: '' }; }
  const data = await res.json();
  const text = data && data.choices && data.choices[0] && data.choices[0].message ? String(data.choices[0].message.content || '') : '';
  if (!text) console.error('[callModel] ' + model + ' empty text; finish=' + (data && data.choices && data.choices[0] ? data.choices[0].finish_reason : 'no-choices') + ' body=' + JSON.stringify(data).slice(0, 300));
  const cost = data && data.usage && typeof data.usage.cost === 'number' ? data.usage.cost : 0;
  return { text, usage: { costUSD: cost } };
 } catch (e) { console.error('[callModel] ' + model + ' threw: ' + (e && e.message) + ' cause=' + (e && e.cause && e.cause.message)); return { text: '' }; }
}

(async () => {
  const council = makePauliCouncil({ fs, pathMod: path, root: repoRoot, clock: Date.now, idgen: () => crypto.randomUUID().slice(0, 8), crypto });
  const runner = makePauliCouncilRunner({ council, callModel, prices, fs, pathMod: path, root: repoRoot, clock: Date.now, idgen: () => crypto.randomUUID().slice(0, 8), crypto });
  const roomId = council.openRoom({ participants: manifest.seats.map(s => ({ id: s.id, model: s.model })).concat([{ id: 'chair', model: manifest.chairModel }]) }).roomId;

  if (Object.keys(modelOverrides).length) {
    const applied = runner.applyModelOverrides(manifest, modelOverrides);
    if (!applied.ok) { console.error('model override refused:', JSON.stringify(applied)); process.exit(1); }
    manifest.seats = applied.manifest.seats; manifest.chairModel = applied.manifest.chairModel;
  }
  console.log('BOARD LINEUP (seat -> model):');
  for (const s of manifest.seats) console.log('  ' + s.id + ' -> ' + s.model);
  console.log('  chair -> ' + manifest.chairModel);
  if (manifest.openerSeat) console.log('  opener -> ' + manifest.openerSeat + ' (head seat: discovery brief first, no position or vote)');
  const est = runner.estimateBoard({ proposal, seats: manifest.seats, chairModel: manifest.chairModel, openerSeatId: manifest.openerSeat });
  if (!est.ok) { console.error('estimate refused:', JSON.stringify(est)); process.exit(1); }
  console.log('ESTIMATE (approve this before anything runs):');
  console.log(JSON.stringify(est.estimate, null, 2));
  if (!has('yes')) { console.log('\nDry run only. Re-run with --yes to execute against this estimate.'); process.exit(0); }

  const provider = process.env.OPENROUTER_PROVIDER || 'openrouter';
  const grant = { missionId, provider, model: grantModel, expiresAt: Date.now() + grantTtlMin * 60000, budgetUSD };
  const ran = await runner.runBoard({ roomId, proposal, seats: manifest.seats, chairModel: manifest.chairModel, grant, seatInstructions, boardDir: manifestDir, openerSeatId: manifest.openerSeat });
  if (!ran.ok) { console.error('run refused/failed:', JSON.stringify(ran)); process.exit(1); }
  const closed = council.close(roomId);
  console.log('\nRESULT:');
  console.log(JSON.stringify({ debateId: ran.result.debateId, escalated: ran.result.escalated, models: ran.result.receipt.models, locked: ran.result.locked, usage: ran.result.usage, receiptHash: ran.result.receipt.receiptHash, minutesHash: closed.ok ? closed.receipt.receiptHash : null }, null, 2));
})().catch(e => { console.error('fatal:', e && e.message ? e.message : String(e)); process.exit(1); });
