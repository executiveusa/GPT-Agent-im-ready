(async () => {
/* pauli-board (board mode: persona seats, weighted vote, chair ruling - built INTO the council) —
   headless proof: board debates open with 2..13 seats and an independent chair; BLIND-FIRST: every
   seat locks its round-1 position seeing only the proposal, then round 2 shows every round-1
   position and each seat argues to a final vote; the tally counts only final votes; the chair
   summarizes and locks the section-3 contract extended with statements, rounds, seat->model map,
   tally and a scored recommendation; 'halt' escalates; the ASTRA gate prices and refuses BEFORE
   any model call; every run leaves a hashed receipt that names each seat's model. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');
const { makePauliCouncilRunner } = require('../sidecar/pauli-council-runner.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-board-test-'));
let now = 2000000;
const clock = () => now;
let seq = 0;
const idgen = () => String(++seq).padStart(6, '0');
const PRICES = {
  'free-seat': { inputPerMToken: 0, outputPerMToken: 0 },
  'free-chair': { inputPerMToken: 0, outputPerMToken: 0 },
  'grok-4.5': { inputPerMToken: 0.20, outputPerMToken: 0.50 },
  'claude-fable-5': { inputPerMToken: 3.00, outputPerMToken: 15.00 },
  'gpt-6-astra': { inputPerMToken: 10.00, outputPerMToken: 30.00 }
};
const SEATS = [
  { id: 'operator', model: 'free-seat', weight: 2 },
  { id: 'finance', model: 'grok-4.5' },                 // weight defaults to 1
  { id: 'skeptic', model: 'free-seat' }
];
const CHAIR = 'claude-fable-5';
const PROPOSAL = 'launch the roast-room board'; // 27 chars -> 7 tokens
const GRANT = { missionId: 'msn-board', provider: 'openrouter', model: 'claude-fable-5', expiresAt: 3000000, budgetUSD: 1.00 };

const mkCouncil = () => makePauliCouncil({ fs, pathMod: path, root, clock, idgen, crypto });
const mkRunner = (council, callModel) => makePauliCouncilRunner({ council, callModel, prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
const mkRoom = council => council.openRoom({ participants: [{ id: 'p1' }] }).roomId;

// --- the live manifest must fit the seat cap (a board over the cap silently never opens) ---
{
  const live = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'districts', 'pauli', 'board', 'manifest.json'), 'utf8'));
  const c = mkCouncil(); const r = mkRoom(c);
  const seats = live.seats.map(s => ({ id: s.id, model: 'free-seat', weight: s.weight }));
  A.ok(live.seats.some(s => s.id === 'kallaway'), 'live manifest includes the kallaway seat');
  A.ok(c.startBoardDebate(r, { proposal: PROPOSAL, seats, chairModel: CHAIR }).ok, 'a board with ALL ' + seats.length + ' live manifest seats opens');
  const c2 = mkCouncil(); const r2 = mkRoom(c2);
  const tooMany = Array.from({ length: 13 }, (_, i) => ({ id: 's' + i, model: 'free-seat' }));
  const wayTooMany = Array.from({ length: 14 }, (_, i) => ({ id: 's' + i, model: 'free-seat' }));
  A.ok(!c2.startBoardDebate(r2, { proposal: PROPOSAL, seats: wayTooMany, chairModel: CHAIR }).ok, '14 seats still refused (cap is 13, raised for the king-doe head seat)');
}

// --- council rules: opening a board ----------------------------------------
let council = mkCouncil();
let roomId = mkRoom(council);
A.ok(!council.startBoardDebate(roomId, { proposal: ' ', seats: SEATS, chairModel: CHAIR }).ok, 'empty proposal refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: [SEATS[0]], chairModel: CHAIR }).ok, 'fewer than 2 seats refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS.concat([{ id: 'operator', model: 'grok-4.5' }]), chairModel: CHAIR }).ok, 'duplicate seat id refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: [{ id: 'x', model: 'free-seat', weight: 0 }, SEATS[1]], chairModel: CHAIR }).ok, 'zero weight refused');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: 'free-seat' }).ok, 'chair sharing a seat model refused (independence)');
A.ok(!council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS }).ok, 'missing chair refused');
const opened = council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, expectedCost: 0 });
A.eq(opened.ok, true, 'board debate opens');
const deb = opened.debateId;

// --- round 1: blind positions ----------------------------------------------
A.ok(!council.boardSpeak(roomId, deb, 'finance', { text: 'early', vote: 'APPROVE' }).ok, 'out-of-order seat refused');
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: ' ', vote: 'APPROVE' }).ok, 'empty statement refused');
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: 'go', vote: 'YAS' }).ok, 'bad vote refused');
const v0 = council.boardView(roomId, deb, 'operator').visible;
A.eq(v0.round, 1, 'first turn is round 1');
A.eq((v0.statements || []).length, 0, 'first seat sees the proposal only');
council.boardSpeak(roomId, deb, 'operator', { text: 'Ship it lean.', vote: 'APPROVE', reason: 'cheap to try' });
const v1 = council.boardView(roomId, deb, 'finance').visible;
A.eq(v1.round, 1, 'second seat still in round 1');
A.eq(v1.statements.length, 0, 'BLIND: second seat sees no round-1 positions');
council.boardSpeak(roomId, deb, 'finance', { text: 'Margin first.', vote: 'MODIFY', reason: 'cap spend' });
const v2 = council.boardView(roomId, deb, 'skeptic').visible;
A.eq(v2.statements.length, 0, 'BLIND: third seat sees no round-1 positions');
council.boardSpeak(roomId, deb, 'skeptic', { text: 'Funnel bait risk.', vote: 'REJECT', reason: 'unverified quality' });

// --- round 2: argument to a final vote --------------------------------------
const w0 = council.boardView(roomId, deb, 'operator').visible;
A.eq(w0.round, 2, 'after every seat spoke once, round 2 begins');
A.eq(w0.statements.length, 3, 'argument round shows every round-1 position');
A.eq(w0.statements[0].seat, 'operator', 'round-1 positions carry their seat');
A.eq(w0.statements[0].weight, undefined, 'seats do not see each others weights - the chair weighs');
A.ok(!council.boardSpeak(roomId, deb, 'finance', { text: 'skip', vote: 'APPROVE' }).ok, 'round-2 order enforced: operator argues first');
council.boardSpeak(roomId, deb, 'operator', { text: 'Still ship, cap the room.', vote: 'APPROVE', reason: 'holds' });
const w1 = council.boardView(roomId, deb, 'finance').visible;
A.eq(w1.statements.length, 3, 'round 2 shows round-1 positions only, not other arguments');
A.ok(!w1.statements.some(s => s.text === 'Still ship, cap the room.'), 'round-2 arguments stay hidden from other seats');
council.boardSpeak(roomId, deb, 'finance', { text: 'Persuaded - approve with the cap.', vote: 'APPROVE', reason: 'operator cap argument wins' });
council.boardSpeak(roomId, deb, 'skeptic', { text: 'Still a no.', vote: 'REJECT', reason: 'unconvinced' });
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: 'third', vote: 'APPROVE' }).ok, 'no third round: every seat spoke twice');
const early = council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR }).debateId;
council.boardSpeak(roomId, early, 'operator', { text: 'r1', vote: 'APPROVE' });
council.boardSpeak(roomId, early, 'finance', { text: 'r1', vote: 'APPROVE' });
council.boardSpeak(roomId, early, 'skeptic', { text: 'r1', vote: 'APPROVE' });
A.ok(!council.boardRule(roomId, early, { ruling: 'APPROVE', reasoning: 'r', recommendation: 'x' }).ok, 'chair cannot rule after round 1 only');
const cv = council.boardView(roomId, deb, 'chair').visible;
A.eq(cv.statements.length, 6, 'chair sees every statement from both rounds');
A.eq(cv.tally.APPROVE, 3, 'tally counts FINAL votes only (operator x2 + finance x1)');
A.eq(cv.tally.REJECT, 1, 'tally counts the standing reject');
A.eq(cv.tally.MODIFY, 0, 'finance round-1 MODIFY is argument, not the final vote');

// --- chair ruling contract --------------------------------------------------
A.ok(!council.boardRule(roomId, deb, { ruling: 'APPROVE', reasoning: 'fine' }).ok, 'missing recommendation refused');
A.ok(!council.boardRule(roomId, deb, { ruling: 'MODIFY', reasoning: 'r', recommendation: 'x' }).ok, 'MODIFY without new text refused');
const ruled = council.boardRule(roomId, deb, {
  ruling: 'MODIFY', modifications: 'pilot on one real decision', reasoning: 'blind positions split 1-1-1; argument round converged on approve-with-cap',
  recommendation: 'Run one NW Kids board with free seats, review the receipt.', scores: { confidence: 7, dissent: 4 }
});
A.eq(ruled.ok, true, 'chair locks the ruling');
A.eq(ruled.locked.mode, 'board', 'locked contract carries board mode');
A.eq(ruled.locked.statements.length, 6, 'locked contract carries both rounds of statements');
A.eq(ruled.locked.statements[3].round, 2, 'locked statements carry their round');
A.eq(ruled.locked.tally.MODIFY, 0, 'locked tally is final votes only');
A.eq(ruled.locked.chair_model, CHAIR, 'locked contract names the chair model');
A.eq(ruled.locked.models.chair, CHAIR, 'locked contract carries the seat->model map (chair)');
A.eq(ruled.locked.models.seats.finance, 'grok-4.5', 'locked contract carries the seat->model map (seat)');
A.eq(ruled.locked.recommendation.includes('NW Kids'), true, 'scored recommendation locked');
A.ok(!council.boardSpeak(roomId, deb, 'operator', { text: 'late', vote: 'APPROVE' }).ok, 'settled board refuses more turns');
const day = new Date(clock()).toISOString().slice(0, 10);
A.ok(fs.existsSync(path.join(root, 'pauli-council', 'decisions', day, deb + '.json')), 'locked ruling persisted');

// --- halt escalates ----------------------------------------------------------
council = mkCouncil();
roomId = mkRoom(council);
const h = council.startBoardDebate(roomId, { proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR }).debateId;
for (const vote of ['APPROVE', 'APPROVE', 'REJECT', 'APPROVE', 'APPROVE', 'REJECT']) {
  const seat = SEATS[council.boardView(roomId, h, 'chair').visible.statements.length % 3];
  council.boardSpeak(roomId, h, seat.id, { text: 'x', vote });
}
const halted = council.boardRule(roomId, h, { ruling: 'halt' });
A.eq(halted.escalated, true, 'halt escalates to the human');

// --- minutes receipt carries board debates ----------------------------------
const closed = council.close(roomId);
A.eq(closed.ok, true, 'room closes');
A.eq(closed.receipt.debates[0].mode, 'board', 'minutes receipt marks the board debate');
A.eq(closed.receipt.debates[0].turns, 6, 'minutes receipt counts both rounds of statements as turns');

// --- runner: estimate + gates ------------------------------------------------
council = mkCouncil();
let runner = mkRunner(council, () => ({ text: '{}' }));
const est = runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR });
A.eq(est.ok, true, 'board estimate succeeds');
A.eq(est.estimate.mode, 'board', 'estimate marked board');
A.eq(est.estimate.rounds, 2, 'estimate declares the two rounds');
A.eq(est.estimate.turns.length, 7, 'estimate covers 3 blind + 3 argument + chair');
A.eq(est.estimate.turns[0].inputTokens, 7, 'blind round input is the proposal only');
A.eq(est.estimate.turns[3].inputTokens, 1207, 'argument round input grows by all round-1 positions');
A.eq(est.estimate.turns[6].role, 'chair', 'chair priced last');
A.eq(est.estimate.turns[0].costUSD, 0, 'free seat costs $0');
A.eq(est.estimate.models.chair, CHAIR, 'estimate names the chair model');
A.eq(est.estimate.models.seats.operator, 'free-seat', 'estimate names each seat model');
A.ok(est.estimate.totalCostUSD > 0, 'paid seats and chair still priced');
A.ok(!runner.estimateBoard({ proposal: PROPOSAL, seats: [{ id: 'm', model: 'mystery' }, SEATS[0]], chairModel: CHAIR }).ok, 'unpriced seat model refused');
A.ok(!runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: 'free-seat' }).ok, 'chair conflict refused at estimate');

// --- model overrides (swap a seat model without editing the manifest) --------
const ovr = runner.applyModelOverrides({ chairModel: CHAIR, seats: SEATS }, { finance: 'free-seat', chair: 'free-chair' });
A.eq(ovr.ok, true, 'model override applies');
A.eq(ovr.manifest.seats[1].model, 'free-seat', 'seat model swapped');
A.eq(ovr.manifest.chairModel, 'free-chair', 'chair model swapped');
A.eq(SEATS[1].model, 'grok-4.5', 'override never mutates the source manifest');
A.eq(runner.applyModelOverrides({ chairModel: CHAIR, seats: SEATS }, { nobody: 'free-seat' }).error, 'unknown-seat', 'unknown seat refused');
A.ok(!runner.applyModelOverrides({ chairModel: CHAIR, seats: SEATS }, { finance: ' ' }).ok, 'empty override model refused');

const calls = [];
const boardStub = (req) => {
  calls.push(req);
  if (req.role === 'chair') return { text: JSON.stringify({ ruling: 'APPROVE', judge_reasoning: 'blind split, argument converged', recommendation: 'ship the pilot', scores: { confidence: 8, dissent: 2 } }), usage: { costUSD: 0.02 } };
  return { text: JSON.stringify({ position: req.seat + ' position', vote: 'APPROVE', reason: 'r' }), usage: { costUSD: 0 } };
};
roomId = mkRoom(council);
A.ok(!await runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR }).ok, 'no grant -> refused (deny-by-default)');
A.eq(calls.length, 0, 'no model call without a grant');
A.ok(!await runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: Object.assign({}, GRANT, { budgetUSD: 0.0000001 }) }).ok, 'over-budget refused before any call');
A.ok(!await runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: 'gpt-6-astra', grant: GRANT }).ok, 'cheap grant does not unlock an Astra chair');
A.eq(calls.length, 0, 'gates refuse before any model call');

// --- runner: happy path, blind-first prompts ---------------------------------
calls.length = 0;
council = mkCouncil();
runner = mkRunner(council, boardStub);
roomId = mkRoom(council);
const ran = await runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT, seatInstructions: { operator: 'BRAIN: lean operator docs' } });
A.eq(ran.ok, true, 'granted board run executes');
A.eq(calls.map(c => c.role).join(','), 'seat,seat,seat,seat,seat,seat,chair', 'six seat calls (two rounds) then the chair');
A.ok(calls[0].prompt.includes('BRAIN: lean operator docs'), 'seat brain folder content reaches its seat prompt');
A.ok(calls[0].prompt.includes('BLIND'), 'round-1 prompt declares the blind rule');
A.ok(!calls[0].prompt.includes('SEAT finance'), 'round-1 prompt carries no other seat');
A.ok(!calls[2].prompt.includes('SEAT operator'), 'last round-1 prompt still blind');
A.ok(calls[3].prompt.includes('ARGUE'), 'round-2 prompt declares the argument rule');
A.ok(calls[3].prompt.includes('SEAT operator') && calls[3].prompt.includes('SEAT finance') && calls[3].prompt.includes('SEAT skeptic'), 'round-2 prompt carries every round-1 position');
A.ok(!calls[4].prompt.includes('ROUND 2'), 'seat prompts never see other round-2 arguments');
A.ok(calls[6].prompt.includes('WEIGHTED TALLY (final votes): APPROVE=4'), 'chair prompt carries the final-vote tally (operator weight 2 + two x1)');
A.ok(calls[6].prompt.includes('ROUND 2 - SEAT skeptic'), 'chair prompt marks each statement round');
A.eq(calls.every(c => c.missionId === 'msn-board'), true, 'every call bound to the mission');
A.eq(ran.result.locked.ruling, 'APPROVE', 'locked ruling returned');
A.eq(ran.result.receipt.mode, 'board', 'receipt marked board');
A.eq(ran.result.receipt.models.chair, CHAIR, 'receipt names the chair model');
A.eq(ran.result.receipt.models.seats.skeptic, 'free-seat', 'receipt names each seat model');
A.eq(ran.result.usage.turns.length, 7, 'usage records both rounds + the chair');
A.eq(ran.result.usage.turns[3].round, 2, 'usage records the round per turn');
A.eq(ran.result.usage.turns[6].role, 'chair', 'chair usage recorded last');
A.eq(typeof ran.result.receipt.receiptHash, 'string', 'receipt hashed');
const ledger = fs.readFileSync(path.join(root, 'pauli-council', 'executions.jsonl'), 'utf8').trim().split('\n');
A.eq(JSON.parse(ledger[ledger.length - 1]).receiptHash, ran.result.receipt.receiptHash, 'board receipt landed in the mission ledger');

// --- runner: failure shapes ---------------------------------------------------
council = mkCouncil();
const badSeat = mkRunner(council, (req) => ({ text: req.role === 'chair' ? '{}' : 'not json' }));
A.eq((await badSeat.runBoard({ roomId: mkRoom(council), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT })).error, 'seat-unparseable', 'non-JSON seat output refuses cleanly');
council = mkCouncil();
const haltChair = mkRunner(council, (req) => ({ text: req.role === 'chair' ? JSON.stringify({ ruling: 'halt' }) : JSON.stringify({ position: 'p', vote: 'APPROVE', reason: 'r' }) }));
const hrun = await haltChair.runBoard({ roomId: mkRoom(council), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT });
A.eq(hrun.result.escalated, true, 'chair halt escalates');
A.eq(hrun.result.locked, null, 'no locked ruling on halt');
A.eq(hrun.result.receipt.outcome, 'escalated', 'receipt records the escalation');

// free-first: an all-free board prices at $0 and passes a $0 budget
council = mkCouncil();
const freeSeats = [{ id: 'a', model: 'free-seat' }, { id: 'b', model: 'free-seat' }];
const freeRunner = mkRunner(council, boardStub);
const freeEst = freeRunner.estimateBoard({ proposal: PROPOSAL, seats: freeSeats, chairModel: 'free-chair' });
A.eq(freeEst.estimate.totalCostUSD, 0, 'all-free board estimates $0');
A.ok(!freeRunner.estimateBoard({ proposal: PROPOSAL, seats: freeSeats, chairModel: 'free-chair' }).estimate.astra, 'no astra in free lineup');

A.report();

/* CLI input guards (OCR run 38838498928 findings): bad --grant-ttl-min, unreadable
   manifest/prices/brain files must exit 2 with a clear message, never crash raw. */
{
  const { spawnSync } = require('node:child_process');
  const cli = path.join(__dirname, '..', 'scripts', 'pauli-board.js');
  const manifestOk = path.join(root, 'mini-manifest.json');
  fs.writeFileSync(manifestOk, JSON.stringify({ seats: [{ id: 'a', weight: 1 }], chairModel: 'm' }));
  const pricesOk = path.join(root, 'mini-prices.json');
  fs.writeFileSync(pricesOk, '{}');
  const baseArgs = [cli, '--proposal', 'p', '--mission', 'm1', '--budget', '1', '--grant-model', 'm', '--board', manifestOk, '--prices', pricesOk];
  const run = args => spawnSync('node', args, { encoding: 'utf8' });

  const badTtl = run([...baseArgs, '--grant-ttl-min', 'abc']);
  A.eq(badTtl.status, 2, 'non-numeric --grant-ttl-min exits 2');
  A.ok(/grant-ttl-min must be a positive integer/.test(badTtl.stderr), 'ttl message is clear');

  const noManifest = run([cli, '--proposal', 'p', '--mission', 'm1', '--budget', '1', '--grant-model', 'm', '--board', path.join(root, 'nope.json'), '--prices', pricesOk]);
  A.eq(noManifest.status, 2, 'missing manifest exits 2');
  A.ok(/cannot read\/parse board manifest/.test(noManifest.stderr), 'manifest message is clear');

  const noPrices = run([cli, '--proposal', 'p', '--mission', 'm1', '--budget', '1', '--grant-model', 'm', '--board', manifestOk, '--prices', path.join(root, 'nope.json')]);
  A.eq(noPrices.status, 2, 'missing prices exits 2');
  A.ok(/cannot read\/parse prices file/.test(noPrices.stderr), 'prices message is clear');

  const manifestBrain = path.join(root, 'brain-manifest.json');
  fs.writeFileSync(manifestBrain, JSON.stringify({ seats: [{ id: 'a', weight: 1, brain: 'missing-brain.md' }], chairModel: 'm' }));
  const noBrain = run([cli, '--proposal', 'p', '--mission', 'm1', '--budget', '1', '--grant-model', 'm', '--board', manifestBrain, '--prices', pricesOk]);
  A.eq(noBrain.status, 2, 'missing brain file exits 2');
  A.ok(/cannot read brain file/.test(noBrain.stderr), 'brain message is clear');
}

})().catch(e => { console.error(e); process.exit(1); });
