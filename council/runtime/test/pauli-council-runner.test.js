(async () => {
/* pauli-council-runner (chunk 5: live model wiring, execution config only - no real model runs) —
   headless proof: estimate prices the whole job with the math exposed before anything runs; the
   Astra gate is deny-by-default (no grant / expired / over-budget / wrong-model all refused BEFORE
   a model is called); the happy path drives advocate -> critic -> judge through the council's
   information gate with prompts that only carry what each role may see; judge output must be the
   §3 contract JSON; halt escalates; every run leaves a hashed receipt in the mission ledger. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');
const { makePauliCouncilRunner } = require('../sidecar/pauli-council-runner.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-council-runner-test-'));
let now = 2000000;
const clock = () => now;
let seq = 0;
const idgen = () => String(++seq).padStart(6, '0');
const PRICES = {
  'grok-4.5': { inputPerMToken: 0.20, outputPerMToken: 0.50 },
  'qwen-3.5': { inputPerMToken: 0.10, outputPerMToken: 0.10 },
  'claude-fable-5': { inputPerMToken: 3.00, outputPerMToken: 15.00 },
  'gpt-6-astra': { inputPerMToken: 10.00, outputPerMToken: 30.00 }
};
const MODELS = { advocate: 'grok-4.5', critic: 'qwen-3.5', judge: 'claude-fable-5' };
const PROPOSAL = 'open a new revenue channel'; // 26 chars -> 7 tokens
const EST = { proposal: PROPOSAL, advocateModel: 'grok-4.5', criticModel: 'qwen-3.5', judgeModel: 'claude-fable-5' };

const calls = [];
const mkRunner = (council, callModel) => makePauliCouncilRunner({ council, callModel, prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
const mkCouncil = () => makePauliCouncil({ fs, pathMod: path, root, clock, idgen, crypto });
const mkRoom = council => council.openRoom({ participants: [{ id: 'p1' }] }).roomId;
const GRANT = { missionId: 'msn-1', provider: 'openrouter', model: 'claude-fable-5', expiresAt: 3000000, budgetUSD: 1.00 };

let council = mkCouncil();
let runner = mkRunner(council, (req) => { calls.push(req); return { text: 'stub' }; });

// --- estimate: the math is exposed before anything runs -------------------
const est = runner.estimate(EST);
A.eq(est.ok, true, 'estimate succeeds');
A.eq(est.estimate.turns.map(t => t.role), ['advocate', 'critic', 'judge'], 'estimate covers all three turns');
A.eq(est.estimate.turns[0].inputTokens, 7, 'advocate input is the proposal only');
A.eq(est.estimate.turns[1].inputTokens, 407, 'critic input is proposal + one expected turn');
A.eq(est.estimate.turns[2].inputTokens, 807, 'judge input is proposal + two expected turns');
A.eq(est.estimate.headroomFactor, 1.25, 'tool-loop headroom declared');
A.ok(est.estimate.totalCostUSD > 0, 'total cost computed');
A.ok(est.estimate.turns[2].costUSD > est.estimate.turns[0].costUSD, 'the judge (expensive model) dominates');
A.eq(est.estimate.astra, false, 'no Astra in this lineup');
A.eq(runner.estimate(Object.assign({}, EST, { judgeModel: 'gpt-6-astra' })).estimate.astra, true, 'Astra lineup flagged');
A.ok(!runner.estimate(Object.assign({}, EST, { judgeModel: 'mystery-model' })).ok, 'unpriced model refused - never silently free');
A.ok(!runner.estimate(Object.assign({}, EST, { proposal: ' ' })).ok, 'empty proposal refused');
A.ok(!runner.estimate({ proposal: PROPOSAL, advocateModel: 'same', criticModel: 'qwen-3.5', judgeModel: 'same' }).ok, 'judge conflict refused at estimate');

// --- the Astra gate: deny-by-default --------------------------------------
calls.length = 0;
const roomId = mkRoom(council);
A.ok(!await runner.run({ roomId, proposal: PROPOSAL, models: MODELS }).ok, 'no grant -> refused (deny-by-default)');
A.eq(calls.length, 0, 'no model call without a grant');
A.ok(!await runner.run({ roomId, proposal: PROPOSAL, models: MODELS, grant: { missionId: 'm' } }).ok, 'incomplete grant refused');
now = 4000000;
A.ok(!await runner.run({ roomId, proposal: PROPOSAL, models: MODELS, grant: GRANT }).ok, 'expired grant refused');
now = 2000000;
A.ok(!await runner.run({ roomId, proposal: PROPOSAL, models: MODELS, grant: Object.assign({}, GRANT, { budgetUSD: 0.000001 }) }).ok, 'over-budget grant refused');
A.eq(calls.length, 0, 'no model call when any gate fails');
const astraModels = { advocate: 'grok-4.5', critic: 'qwen-3.5', judge: 'gpt-6-astra' };
A.ok(!await runner.run({ roomId, proposal: PROPOSAL, models: astraModels, grant: GRANT }).ok, 'cheap grant does not unlock an Astra judge');
A.eq(calls.length, 0, 'Astra gate blocks before any call');

// --- happy path: prompts carry only what each role may see -----------------
calls.length = 0;
const stub = (req) => {
  calls.push(req);
  if (req.role === 'judge') return { text: JSON.stringify({ ruling: 'MODIFY', modifications: 'pilot with a $500 cap', judge_reasoning: 'cap the blast radius' }), usage: { costUSD: 0.02 } };
  return { text: req.role === 'advocate' ? 'Thesis + 3 points' : 'Antithesis + 3 risks', usage: { costUSD: 0.001 } };
};
council = mkCouncil();
runner = mkRunner(council, stub);
const room2 = mkRoom(council);
const ran = await runner.run({ roomId: room2, proposal: PROPOSAL, models: MODELS, grant: GRANT });
A.eq(ran.ok, true, 'granted run executes');
A.eq(calls.map(c => c.role), ['advocate', 'critic', 'judge'], 'workers called in protocol order');
A.ok(calls[0].prompt.includes(PROPOSAL) && !calls[0].prompt.includes('ADVOCATE ARGUED'), 'advocate prompt is the proposal only');
A.ok(calls[1].prompt.includes('ADVOCATE ARGUED:\nThesis + 3 points'), 'critic prompt carries the advocate argument');
A.ok(!calls[1].prompt.includes('CRITIC ARGUED'), 'critic prompt does not leak the judge view');
A.ok(calls[2].prompt.includes('ADVOCATE ARGUED') && calls[2].prompt.includes('CRITIC ARGUED:\nAntithesis + 3 risks'), 'judge prompt carries both arguments');
A.eq(calls.every(c => c.missionId === 'msn-1'), true, 'every call is bound to the mission');
A.eq(ran.result.locked.ruling, 'MODIFY', 'locked ruling returned');
A.eq(ran.result.locked.modifications, 'pilot with a $500 cap', 'modifications carried');
A.eq(ran.result.usage.totalCostUSD, 0.022, 'actual usage summed');
const receipt = ran.result.receipt;
A.eq(receipt.missionId, 'msn-1', 'receipt names the mission');
A.eq(receipt.outcome, 'MODIFY', 'receipt records the ruling');
A.eq(typeof receipt.receiptHash, 'string', 'receipt hashed');
A.eq(receipt.estimate.turns.length, 3, 'receipt carries the approved estimate');
const ledger = fs.readFileSync(path.join(root, 'pauli-council', 'executions.jsonl'), 'utf8').trim().split('\n');
A.eq(JSON.parse(ledger[ledger.length - 1]).receiptHash, receipt.receiptHash, 'receipt landed in the mission ledger');

// --- judge contract enforcement + halt -------------------------------------
council = mkCouncil();
const badJudge = mkRunner(council, (req) => ({ text: req.role === 'judge' ? 'not json' : 'arg' }));
A.eq((await badJudge.run({ roomId: mkRoom(council), proposal: PROPOSAL, models: MODELS, grant: GRANT })).error, 'judge-unparseable', 'non-contract judge output refuses, debate left open');
council = mkCouncil();
const haltJudge = mkRunner(council, (req) => ({ text: req.role === 'judge' ? JSON.stringify({ ruling: 'halt' }) : 'arg' }));
const halted = await haltJudge.run({ roomId: mkRoom(council), proposal: PROPOSAL, models: MODELS, grant: GRANT });
A.eq(halted.ok, true, 'halt run completes');
A.eq(halted.result.escalated, true, 'halt escalates to the human');
A.eq(halted.result.locked, null, 'no locked ruling on halt');
A.eq(halted.result.receipt.outcome, 'escalated', 'receipt records the escalation');

// worker failure leaves the debate open, no crash
council = mkCouncil();
const deadWorker = mkRunner(council, () => ({ text: '' }));
A.eq((await deadWorker.run({ roomId: mkRoom(council), proposal: PROPOSAL, models: MODELS, grant: GRANT })).error, 'worker-failed', 'empty worker response is a clean failure');

// fail-open receipt storage
const dc = mkCouncil();
const deadRunner = makePauliCouncilRunner({ council: dc, callModel: stub, prices: PRICES, fs, pathMod: path, root: path.join(root, 'no', '\0', 'dir'), clock, idgen, crypto });
A.eq((await deadRunner.run({ roomId: mkRoom(dc), proposal: PROPOSAL, models: MODELS, grant: GRANT })).ok, true, 'run succeeds even when the receipt cannot be written');

A.report();

})().catch(e => { console.error(e); process.exit(1); });
