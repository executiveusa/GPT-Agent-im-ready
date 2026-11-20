(async () => {
/* pauli-board opener phase (head seat discovery brief) —
   the opener runs ONCE before round 1, takes NO position and casts NO vote; its brief is
   proposal context, so blind-first still holds: no seat sees any other seat's statement in
   round 1; the brief is priced in the estimate, recorded in usage and the receipt, shown to
   round-1 seats and the chair with a not-a-position label; unknown opener ids are refused;
   boards without an openerSeat behave exactly as before. */
'use strict';
const A = require('./_assert.js');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { makePauliCouncil } = require('../sidecar/pauli-council.js');
const { makePauliCouncilRunner } = require('../sidecar/pauli-council-runner.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pauli-board-opener-test-'));
let now = 2000000;
const clock = () => now;
let seq = 0;
const idgen = () => String(++seq).padStart(6, '0');
const PRICES = {
  'free-seat': { inputPerMToken: 0, outputPerMToken: 0 },
  'free-chair': { inputPerMToken: 0, outputPerMToken: 0 },
  'grok-4.5': { inputPerMToken: 0.20, outputPerMToken: 0.50 }
};
const SEATS = [
  { id: 'king-doe', model: 'free-seat', weight: 1 },
  { id: 'finance', model: 'grok-4.5' },
  { id: 'skeptic', model: 'free-seat' }
];
const CHAIR = 'free-chair';
const PROPOSAL = 'launch the roast-room board';
const GRANT = { missionId: 'msn-board', provider: 'openrouter', model: 'free-chair', expiresAt: 3000000, budgetUSD: 1.00 };
const BRAINS = { 'king-doe': 'DISCOVERY BRAIN: ask what they want, what is in the way, what outcome pays.' };

const mkCouncil = () => makePauliCouncil({ fs, pathMod: path, root, clock, idgen, crypto });
const mkRunner = council => makePauliCouncilRunner({ council, callModel: null, prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
const mkRoom = council => council.openRoom({ participants: [{ id: 'p1' }] }).roomId;

function runner0estimate(live) {
  const council = mkCouncil();
  const runner = makePauliCouncilRunner({ council, callModel: () => ({ text: '{}' }), prices: JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'districts', 'pauli', 'board', 'prices.free.json'), 'utf8')), fs, pathMod: path, root, clock, idgen, crypto });
  return runner.estimateBoard({ proposal: 'x', seats: live.seats, chairModel: live.chairModel, openerSeatId: live.openerSeat });
}


// call log + stub: opener returns framing JSON, seats/chair return contract JSON
const mkCalls = () => {
  const calls = [];
  const callModel = ({ role, seat, prompt }) => {
    calls.push({ role, seat, prompt });
    if (role === 'opener') return { text: JSON.stringify({ framing: 'Q: what do you actually want? Q: what is in the way?' }), usage: { costUSD: 0 } };
    if (role === 'chair') return { text: JSON.stringify({ ruling: 'APPROVE', judge_reasoning: 'sound', recommendation: 'go', scores: { confidence: 8, dissent: 1 } }), usage: { costUSD: 0 } };
    return { text: JSON.stringify({ position: seat + ' position', vote: 'APPROVE', reason: 'r' }), usage: { costUSD: 0 } };
  };
  return { calls, callModel };
};

// --- opener runs first, exactly once, and round 1 stays blind ----------------
{
  const council = mkCouncil(); const { calls, callModel } = mkCalls();
  const runner = makePauliCouncilRunner({ council, callModel, prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
  const roomId = mkRoom(council);
  const ran = await runner.runBoard({ roomId, proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT, seatInstructions: BRAINS, openerSeatId: 'king-doe' });
  A.ok(ran.ok, 'board with an opener completes: ' + JSON.stringify(ran));
  const openers = calls.filter(c => c.role === 'opener');
  A.ok(openers.length === 1, 'opener called exactly once');
  A.ok(calls[0].role === 'opener', 'opener runs before any seat');
  A.ok(openers[0].prompt.indexOf('NOT casting a vote') !== -1 && openers[0].prompt.indexOf('DISCOVERY BRAIN') !== -1, 'opener prompt carries the brain and the no-vote rule');
  const round1 = calls.filter(c => c.role === 'seat').slice(0, SEATS.length);
  A.ok(round1.every(c => c.prompt.indexOf('OPENING DISCOVERY BRIEF') !== -1), 'every round-1 seat sees the brief');
  A.ok(round1.every(c => c.prompt.indexOf('NOT a position') !== -1), 'brief is labeled as not-a-position');
  A.ok(round1.every(c => c.prompt.indexOf('(voted ') === -1), 'round-1 prompts carry no seat statement blocks (blind-first preserved)');
  A.ok(round1.every(c => c.prompt.indexOf('finance position') === -1 && c.prompt.indexOf('skeptic position') === -1 && c.prompt.indexOf('king-doe position') === -1), 'no round-1 positions leak between seats');
  const chair = calls.find(c => c.role === 'chair');
  A.ok(chair.prompt.indexOf('OPENING DISCOVERY BRIEF') !== -1, 'chair sees the brief too');
  A.ok(ran.result.usage.turns.some(t => t.role === 'opener' && t.seat === 'king-doe'), 'opener turn recorded in usage');
  A.ok(ran.result.receipt.models.opener === 'king-doe' && typeof ran.result.receipt.openerBrief === 'string' && ran.result.receipt.openerBrief.length > 0, 'receipt names the opener and keeps the brief');
  const tally = ran.result.locked.tally;
  A.ok(tally.APPROVE === 3 && !Object.prototype.hasOwnProperty.call(tally, 'framing'), 'tally counts only seat votes - the opener cast none');
}

// --- estimate prices the opener turn ------------------------------------------
{
  const council = mkCouncil();
  const runner = makePauliCouncilRunner({ council, callModel: () => ({ text: '{}' }), prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
  const withOpener = runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, openerSeatId: 'king-doe' });
  A.ok(withOpener.ok && withOpener.estimate.opener === 'king-doe', 'estimate names the opener');
  A.ok(withOpener.estimate.turns.filter(t => t.role === 'opener').length === 1, 'estimate prices exactly one opener turn');
  const without = runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR });
  A.ok(without.ok && without.estimate.opener === null && without.estimate.turns.every(t => t.role !== 'opener'), 'no openerSeat, no opener turn');
  const bad = runner.estimateBoard({ proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, openerSeatId: 'nobody' });
  A.ok(!bad.ok && bad.error === 'unknown-opener', 'an opener that holds no seat is refused');
}

// --- opener worker failure and unparseable output fail safe --------------------
{
  const council = mkCouncil();
  const runner = makePauliCouncilRunner({ council, callModel: () => ({ text: '' }), prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
  const ran = await runner.runBoard({ roomId: mkRoom(council), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT, openerSeatId: 'king-doe' });
  A.ok(!ran.ok && ran.error === 'worker-failed', 'empty opener output fails before any seat speaks');
  const council2 = mkCouncil();
  const runner2 = makePauliCouncilRunner({ council: council2, callModel: () => ({ text: 'not json' }), prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
  const ran2 = await runner2.runBoard({ roomId: mkRoom(council2), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT, openerSeatId: 'king-doe' });
  A.ok(!ran2.ok && ran2.error === 'opener-unparseable', 'unparseable opener output leaves the debate open for review');
  const council3 = mkCouncil();
  const runner3 = makePauliCouncilRunner({ council: council3, callModel: () => ({ text: JSON.stringify({ framing: '  ' }) }), prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
  const ran3 = await runner3.runBoard({ roomId: mkRoom(council3), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT, openerSeatId: 'king-doe' });
  A.ok(!ran3.ok && ran3.error === 'opener-empty-framing', 'JSON-valid but empty framing is rejected before any seat speaks');
}

// --- without an opener the board is byte-identical in behavior ------------------
{
  const council = mkCouncil(); const { calls, callModel } = mkCalls();
  const runner = makePauliCouncilRunner({ council, callModel, prices: PRICES, fs, pathMod: path, root, clock, idgen, crypto });
  const ran = await runner.runBoard({ roomId: mkRoom(council), proposal: PROPOSAL, seats: SEATS, chairModel: CHAIR, grant: GRANT });
  A.ok(ran.ok && calls.every(c => c.role !== 'opener'), 'no opener configured: no opener call');
  A.ok(calls.filter(c => c.role === 'seat').slice(0, SEATS.length).every(c => c.prompt.indexOf('OPENING DISCOVERY BRIEF') === -1), 'no brief injected without an opener');
  A.ok(ran.result.receipt.models.opener === null && ran.result.receipt.openerBrief === null, 'receipt records no opener');
}

// --- every live manifest seat and chair model is priced ---------------------------
{
  const live = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'districts', 'pauli', 'board', 'manifest.json'), 'utf8'));
  const prices = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'districts', 'pauli', 'board', 'prices.free.json'), 'utf8'));
  const models = live.seats.map(s => s.id + '=' + s.model).concat(['chair=' + live.chairModel]);
  for (const entry of models) {
    const model = entry.split('=')[1];
    A.ok(prices[model] && typeof prices[model].inputPerMToken === 'number', 'live manifest model is priced: ' + entry);
  }
  const est = runner0estimate(live);
  A.ok(est.ok, 'live manifest passes estimateBoard with the opener: ' + JSON.stringify(est));
}

// --- the live manifest's opener holds a real seat -------------------------------
{
  const live = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'districts', 'pauli', 'board', 'manifest.json'), 'utf8'));
  A.ok(!live.openerSeat || live.seats.some(s => s.id === live.openerSeat), 'live manifest openerSeat resolves to a seated member');
}



A.report();

})().catch(e => { console.error(e); process.exit(1); });
