/* sidecar/pauli-council-runner.js — live model wiring for Pauli's council (chunk 5).

   Wires the chunk-3 council protocol (sidecar/pauli-council.js) to real workers. The council
   module owns the rules; this runner owns the execution. The ASTRA GATE is execution config
   (districts/pauli/CONTEXT.md standing rule), hard-wired here:

   DENY-BY-DEFAULT: run() refuses to call ANY model without a mission-bound owner grant
   { missionId, provider, model, expiresAt, budgetUSD }. No grant, no tokens.

   ESTIMATE FIRST: estimate() prices the whole debate BEFORE anything runs - per-turn input
   tokens, expected output tokens, tool-loop headroom, and the math is exposed in the estimate
   object, because the owner approves THE ESTIMATE, not a blank check. If the estimate exceeds
   the grant budget, run() refuses before a single model call.

   ASTRA LANE: when the judge (or any role) is an Astra model (default id 'gpt-6-astra'), the
   grant's model field must cover the Astra lane - a grant for a cheap model does not unlock
   Pauli's judge. Free-first routing everywhere else: the runner takes whatever model ids the
   mission declares and prices them from an injected price table (unknown model = refused,
   never silently free).

   RECEIPTS: every finished or escalated run appends an execution receipt (missionId, grant,
   estimate, actual usage as reported by the workers, ruling/escalation) to
   pauli-council/executions.jsonl - the mission-ledger record the standing rule requires.

   All ambient I/O is INJECTED: callModel (the worker binding - production wires it to the
   repo's execution router; tests stub it), tokenizer, prices, fs/pathMod/clock/idgen/crypto.
   No model SDK here, no network, no Date.now/Math.random. Storage fails open.

   makePauliCouncilRunner({ council, callModel, prices, fs, pathMod, root, clock, idgen, crypto,
                            astraModel?, expectedOutputTokens?, headroomFactor? })
     estimate({ proposal, advocateModel, criticModel, judgeModel })   -> { ok, estimate? | error }
     run({ roomId, proposal, models, grant, roleInstructions? })      -> { ok, result? | error }
     isAstraModel(modelId)                                            -> boolean */
'use strict';
const { loadRegistry, pickBoardSkills } = require('./pauli-board-skills.js');

const DEFAULT_ASTRA = 'gpt-6-astra';
const DEFAULT_EXPECTED_OUTPUT = 400;  // tokens per role turn, COUNCIL.md role shapes are short
const DEFAULT_HEADROOM = 1.25;        // tool-loop headroom multiplier (CONTEXT.md: input + output + headroom)

function makePauliCouncilRunner(deps) {
  const council = deps.council, callModel = deps.callModel, prices = deps.prices;
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, idgen = deps.idgen, crypto = deps.crypto;
  const root = deps.root;
  if (!council || typeof callModel !== 'function' || !prices || !fs || !pathMod || typeof clock !== 'function' || typeof idgen !== 'function' || !crypto || !root) {
    throw new Error('pauli-council-runner: council, callModel, prices, fs, pathMod, root, clock, idgen, crypto are required');
  }
  const astraModel = deps.astraModel || DEFAULT_ASTRA;
  const expectedOutputTokens = typeof deps.expectedOutputTokens === 'number' ? deps.expectedOutputTokens : DEFAULT_EXPECTED_OUTPUT;
  const headroomFactor = typeof deps.headroomFactor === 'number' ? deps.headroomFactor : DEFAULT_HEADROOM;
  const dir = pathMod.join(root, 'pauli-council');
  const receiptsFile = pathMod.join(dir, 'executions.jsonl');

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });
  const tokenize = text => Math.ceil(String(text).length / 4); // deterministic chars/4 estimator

  function isAstraModel(modelId) { return modelId === astraModel; }

  function priceOf(modelId) {
    const p = prices[modelId];
    if (!p || typeof p.inputPerMToken !== 'number' || typeof p.outputPerMToken !== 'number') return null;
    return p;
  }

  function turnCost(modelId, inputTokens, outputTokens) {
    const p = priceOf(modelId);
    return (inputTokens * p.inputPerMToken + outputTokens * p.outputPerMToken) / 1e6;
  }

  // The full job priced before anything runs: each role's prompt is what view() lets it see,
  // so input tokens grow per turn; output is the expected per-turn shape; headroom covers the
  // tool loop. The math is IN the estimate object - the owner approves this, not a blank check.
  function estimate({ proposal, advocateModel, criticModel, judgeModel }) {
    if (typeof proposal !== 'string' || !proposal.trim()) return bad('no-proposal', 'proposal text required');
    const models = { advocate: advocateModel, critic: criticModel, judge: judgeModel };
    for (const [role, m] of Object.entries(models)) {
      if (typeof m !== 'string' || !m.trim()) return bad('no-model', role + ' model required');
      if (!priceOf(m)) return bad('unpriced-model', 'no price table entry for ' + m + ' (unknown models are never silently free)');
    }
    if (judgeModel === advocateModel || judgeModel === criticModel) return bad('judge-conflict', 'judge must differ from advocate and critic (COUNCIL.md §1)');
    const proposalTokens = tokenize(proposal);
    const argTokens = expectedOutputTokens; // each prior argument arrives as roughly one role turn
    const turns = [
      { role: 'advocate', model: advocateModel, inputTokens: proposalTokens, expectedOutputTokens, math: 'proposal(' + proposalTokens + ') in, ' + expectedOutputTokens + ' out' },
      { role: 'critic', model: criticModel, inputTokens: proposalTokens + argTokens, expectedOutputTokens, math: 'proposal + advocate in, ' + expectedOutputTokens + ' out' },
      { role: 'judge', model: judgeModel, inputTokens: proposalTokens + 2 * argTokens, expectedOutputTokens, math: 'proposal + advocate + critic in, ' + expectedOutputTokens + ' out' }
    ];
    for (const t of turns) {
      t.costUSD = turnCost(t.model, t.inputTokens, t.expectedOutputTokens);
      t.withHeadroomUSD = t.costUSD * headroomFactor;
    }
    const totalCostUSD = turns.reduce((s, t) => s + t.withHeadroomUSD, 0);
    return ok({
      estimate: {
        proposalTokens, expectedOutputTokensPerTurn: expectedOutputTokens, headroomFactor,
        turns, totalCostUSD,
        astra: Object.values(models).some(isAstraModel)
      }
    });
  }

  function validateGrant(grant, models, estimate) {
    if (!grant || typeof grant !== 'object') return bad('grant-required', 'deny-by-default: no mission-bound owner grant, no tokens (CONTEXT.md)');
    for (const f of ['missionId', 'provider', 'model', 'expiresAt', 'budgetUSD']) {
      if (grant[f] === undefined || grant[f] === null || grant[f] === '') return bad('grant-incomplete', 'grant needs missionId, provider, model, expiresAt, budgetUSD');
    }
    if (typeof grant.expiresAt !== 'number' || clock() > grant.expiresAt) return bad('grant-expired', 'grant expired before the run started');
    if (typeof grant.budgetUSD !== 'number' || estimate.totalCostUSD > grant.budgetUSD) {
      return bad('over-budget', 'estimate $' + estimate.totalCostUSD.toFixed(6) + ' exceeds grant budget $' + grant.budgetUSD + ' - refused before any model call');
    }
    for (const m of Object.values(models)) {
      if (isAstraModel(m) && grant.model !== astraModel) {
        return bad('astra-not-granted', 'an Astra-lane role needs a grant whose model covers ' + astraModel + ' - a cheaper grant does not unlock Pauli');
      }
    }
    return null;
  }

  function appendReceipt(receipt) {
    try { fs.mkdirSync(dir, { recursive: true }); fs.appendFileSync(receiptsFile, JSON.stringify(receipt) + '\n'); return true; } catch (_) { return false; }
  }

  function promptFor(role, visible, instructions) {
    const shape = role === 'advocate' ? 'One sentence thesis + 3 supporting points.'
      : role === 'critic' ? 'One sentence antithesis + 3 risks.'
      : 'Lock the ruling as the COUNCIL.md §3 contract: ruling APPROVE | REJECT | MODIFY (+ new proposal text) | halt, with one paragraph of reasoning.';
    let body = 'PROPOSAL:\n' + visible.proposal + '\n';
    if (visible.advocate_arg) body += '\nADVOCATE ARGUED:\n' + visible.advocate_arg + '\n';
    if (visible.critic_arg) body += '\nCRITIC ARGUED:\n' + visible.critic_arg + '\n';
    const extra = instructions && instructions[role] ? '\nMISSION INSTRUCTIONS:\n' + instructions[role] + '\n' : '';
    return 'You are the ' + role.toUpperCase() + ' in an adversarial three-turn debate (COUNCIL.md). ' + shape + extra + '\n' + body;
  }

  async function run({ roomId, proposal, models, grant, roleInstructions }) {
    models = models || {};
    const est = estimate({ proposal, advocateModel: models.advocate, criticModel: models.critic, judgeModel: models.judge });
    if (!est.ok) return est;
    const grantError = validateGrant(grant, models, est.estimate);
    if (grantError) return grantError;

    const started = council.startDebate(roomId, {
      proposal,
      advocateModel: models.advocate, criticModel: models.critic, judgeModel: models.judge,
      expectedCost: est.estimate.totalCostUSD
    });
    if (!started.ok) return started;
    const debateId = started.debateId;
    const usage = { turns: [], totalCostUSD: 0 };

    for (const role of ['advocate', 'critic']) {
      const visible = council.view(roomId, debateId, role).visible; // the protocol's information gate
      const resp = await callModel({ model: models[role], role, prompt: promptFor(role, visible, roleInstructions), missionId: grant.missionId });
      if (!resp || typeof resp.text !== 'string' || !resp.text.trim()) {
        return bad('worker-failed', role + ' worker returned no text - debate ' + debateId + ' left open for retry');
      }
      const spoke = council.speak(roomId, debateId, role, resp.text);
      if (!spoke.ok) return spoke;
      if (resp.usage && typeof resp.usage.costUSD === 'number') {
        usage.turns.push({ role, model: models[role], usage: resp.usage });
        usage.totalCostUSD += resp.usage.costUSD;
      }
    }

    const judgeVisible = council.view(roomId, debateId, 'judge').visible;
    const judged = await callModel({ model: models.judge, role: 'judge', prompt: promptFor('judge', judgeVisible, roleInstructions), missionId: grant.missionId });
    if (!judged || typeof judged.text !== 'string' || !judged.text.trim()) {
      return bad('worker-failed', 'judge worker returned no text - debate ' + debateId + ' left open for retry');
    }
    if (judged.usage && typeof judged.usage.costUSD === 'number') {
      usage.turns.push({ role: 'judge', model: models.judge, usage: judged.usage });
      usage.totalCostUSD += judged.usage.costUSD;
    }
    let verdict;
    try { verdict = JSON.parse(judged.text); } catch (_) {
      return bad('judge-unparseable', 'judge output is not the §3 contract JSON - debate ' + debateId + ' left open for review');
    }
    const ruled = council.rule(roomId, debateId, { ruling: verdict.ruling, modifications: verdict.modifications, reasoning: verdict.judge_reasoning || verdict.reasoning });
    if (!ruled.ok) return ruled;

    const receipt = {
      receiptId: 'exec_' + idgen(),
      debateId, roomId,
      missionId: grant.missionId,
      grant: { provider: grant.provider, model: grant.model, budgetUSD: grant.budgetUSD, expiresAt: grant.expiresAt },
      estimate: est.estimate,
      usage,
      outcome: ruled.escalated ? 'escalated' : ruled.locked.ruling,
      at: new Date(clock()).toISOString()
    };
    receipt.receiptHash = crypto.createHash('sha256').update(JSON.stringify(receipt), 'utf8').digest('hex');
    appendReceipt(receipt); // fail-open: the in-memory result stands
    return ok({ result: { debateId, escalated: !!ruled.escalated, locked: ruled.locked || null, usage, receipt } });
  }


  /* BOARD MODE: same ASTRA gate, same receipts, N persona seats + a chair. Free-first: seats price
     from the same table (a free model is a $0 table entry - an unknown model is still refused). */

  function estimateBoard({ proposal, seats, chairModel, openerSeatId }) {
    if (typeof proposal !== 'string' || !proposal.trim()) return bad('no-proposal', 'proposal text required');
    if (!Array.isArray(seats) || seats.length < 2) return bad('bad-seats', 'a board needs at least 2 seats');
    if (typeof chairModel !== 'string' || !chairModel.trim()) return bad('no-model', 'chairModel required');
    if (!priceOf(chairModel)) return bad('unpriced-model', 'no price table entry for ' + chairModel + ' (unknown models are never silently free)');
    if (seats.some(s => s.model === chairModel)) return bad('chair-conflict', 'chair must differ from every seat model (COUNCIL.md section 1 independence)');
    for (const s of seats) {
      if (!s || typeof s.id !== 'string' || !s.id.trim()) return bad('bad-seat', 'every seat needs an id');
      if (typeof s.model !== 'string' || !s.model.trim()) return bad('no-model', 'seat ' + s.id + ' needs a model');
      if (!priceOf(s.model)) return bad('unpriced-model', 'no price table entry for ' + s.model + ' (unknown models are never silently free)');
    }
    const openerSeat = openerSeatId === undefined || openerSeatId === null ? null : seats.find(s => s && s.id === openerSeatId);
    if (openerSeatId !== undefined && openerSeatId !== null && !openerSeat) return bad('unknown-opener', 'no seat ' + openerSeatId + ' in this board (the opener must hold a seat)');
    const proposalTokens = tokenize(proposal);
    const openerTokens = openerSeat ? expectedOutputTokens : 0; // the discovery brief rides along with the proposal context
    const turns = [];
    if (openerSeat) { // head seat opens the meeting: discovery framing only, never a position or vote
      const t = { role: 'opener', seat: openerSeat.id, model: openerSeat.model, inputTokens: proposalTokens, expectedOutputTokens, math: 'opening brief: proposal in, ' + expectedOutputTokens + ' out' };
      t.costUSD = turnCost(t.model, t.inputTokens, t.expectedOutputTokens);
      t.withHeadroomUSD = t.costUSD * headroomFactor;
      turns.push(t);
    }
    seats.forEach(s => { // round 1: blind - proposal only, no statements visible
      const t = { role: 'seat', round: 1, seat: s.id, model: s.model, inputTokens: proposalTokens + openerTokens, expectedOutputTokens, math: 'blind round: proposal' + (openerSeat ? ' + opening brief' : '') + ' only in, ' + expectedOutputTokens + ' out' };
      t.costUSD = turnCost(t.model, t.inputTokens, t.expectedOutputTokens);
      t.withHeadroomUSD = t.costUSD * headroomFactor;
      turns.push(t);
    });
    seats.forEach(s => { // round 2: argue - proposal + every round-1 position visible
      const inputTokens = proposalTokens + openerTokens + seats.length * expectedOutputTokens;
      const t = { role: 'seat', round: 2, seat: s.id, model: s.model, inputTokens, expectedOutputTokens, math: 'argument round: proposal + ' + seats.length + ' round-1 positions in, ' + expectedOutputTokens + ' out' };
      t.costUSD = turnCost(t.model, t.inputTokens, t.expectedOutputTokens);
      t.withHeadroomUSD = t.costUSD * headroomFactor;
      turns.push(t);
    });
    const chairTokens = proposalTokens + openerTokens + seats.length * 2 * expectedOutputTokens;
    const chair = { role: 'chair', model: chairModel, inputTokens: chairTokens, expectedOutputTokens, math: 'proposal + ' + (seats.length * 2) + ' statements (2 rounds) + tally in, ' + expectedOutputTokens + ' out' };
    chair.costUSD = turnCost(chairModel, chairTokens, expectedOutputTokens);
    chair.withHeadroomUSD = chair.costUSD * headroomFactor;
    turns.push(chair);
    const totalCostUSD = turns.reduce((sum, t) => sum + t.withHeadroomUSD, 0);
    return ok({
      estimate: {
        mode: 'board', proposalTokens, seats: seats.length, rounds: 2, opener: openerSeat ? openerSeat.id : null,
        models: { chair: chairModel, seats: Object.fromEntries(seats.map(s => [s.id, s.model])) },
        expectedOutputTokensPerTurn: expectedOutputTokens, headroomFactor,
        turns, totalCostUSD,
        astra: isAstraModel(chairModel) || seats.some(s => isAstraModel(s.model))
      }
    });
  }

  function seatPromptFor(seat, visible, instructions, openerBrief) {
    const round = visible.round || 1;
    let body = 'PROPOSAL:\n' + visible.proposal + '\n';
    if (openerBrief && round === 1) {
      body += '\nOPENING DISCOVERY BRIEF from the head seat (' + openerBrief.seat + ') - questions and framing only. It is NOT a position, carries NO vote, and every seat still answers blind:\n' + openerBrief.text + '\n';
    }
    for (const s of visible.statements || []) {
      body += '\nSEAT ' + s.seat + ' (voted ' + s.vote + '):\n' + s.text + '\n';
    }
    const brain = instructions && instructions[seat.id] ? '\nYOUR BRAIN (persona source material - answer from it, in its voice):\n' + instructions[seat.id] + '\n' : '';
    const ask = round === 1
      ? 'You hold the ' + seat.id.toUpperCase() + ' seat on a board of advisors. You are answering BLIND: no other seat has weighed in and you cannot see their positions. Give your own position in one short paragraph, then cast your vote.'
      : 'You hold the ' + seat.id.toUpperCase() + ' seat on a board of advisors. These are the opening positions of every seat (including yours). ARGUE: defend or change your position in one short paragraph - this vote is your final one.';
    return ask + brain + '\n' + body +
      '\nAnswer ONLY as JSON: {"position": "<paragraph>", "vote": "APPROVE" | "REJECT" | "MODIFY", "reason": "<one line>"}';
  }

  function chairPromptFor(visible, instructions, skillIds, openerBrief) {
    let body = 'PROPOSAL:\n' + visible.proposal + '\n';
    if (openerBrief) {
      body += '\nOPENING DISCOVERY BRIEF from the head seat (' + openerBrief.seat + ') - questions and framing only, NOT a position and NO vote:\n' + openerBrief.text + '\n';
    }
    for (const s of visible.statements || []) {
      body += '\nROUND ' + (s.round || 1) + ' - SEAT ' + s.seat + ' (weight ' + s.weight + ', voted ' + s.vote + '):\n' + s.text + '\nreason: ' + s.reason + '\n';
    }
    const t = visible.tally || { APPROVE: 0, REJECT: 0, MODIFY: 0 };
    body += '\nWEIGHTED TALLY (final votes): APPROVE=' + t.APPROVE + ' REJECT=' + t.REJECT + ' MODIFY=' + t.MODIFY + '\n';
    const extra = instructions && instructions.chair ? '\nMISSION INSTRUCTIONS:\n' + instructions.chair + '\n' : '';
    return 'You are the CHAIR of this board of advisors. Each seat answered blind in round 1, then argued in round 2 - round-2 votes are final. Summarize the debate in your reasoning, weigh the final votes (weights are not votes to count blindly - judge the arguments), then lock the ruling.' + extra + '\n' + body +
      '\nAnswer ONLY as JSON: {"ruling": "APPROVE" | "REJECT" | "MODIFY" | "halt", "modifications": "<if MODIFY, the new proposal text>", "judge_reasoning": "<one paragraph>", "recommendation": "<the scored recommendation the owner acts on>", "scores": {"confidence": 0-10, "dissent": 0-10}' +
      (Array.isArray(skillIds) && skillIds.length
        ? ', "skills": ["<optional: ids of the execution skills to run after this ruling - pick only from: ' + skillIds.join(', ') + '>"]'
        : '') + '}';
  }

  async function runBoard({ roomId, proposal, seats, chairModel, grant, seatInstructions, boardDir, openerSeatId }) {
    const est = estimateBoard({ proposal, seats, chairModel, openerSeatId });
    if (!est.ok) return est;
    const modelMap = { chair: chairModel };
    seats.forEach(s => { modelMap['seat:' + s.id] = s.model; });
    const grantError = validateGrant(grant, modelMap, est.estimate);
    if (grantError) return grantError;

    const started = council.startBoardDebate(roomId, { proposal, seats, chairModel, expectedCost: est.estimate.totalCostUSD });
    if (!started.ok) return started;
    const debateId = started.debateId;
    const usage = { turns: [], totalCostUSD: 0 };

    let openerBrief = null;
    if (openerSeatId) {
      const openerSeat = seats.find(s => s.id === openerSeatId); // estimateBoard already validated it exists
      const obrain = seatInstructions && seatInstructions[openerSeat.id] ? '\nYOUR BRAIN (persona source material - answer from it, in its voice):\n' + seatInstructions[openerSeat.id] + '\n' : '';
      const oprompt = 'You hold the ' + openerSeat.id.toUpperCase() + ' seat and OPEN this board meeting as its head. Before any seat takes a position, run discovery on the problem itself, in your method: the questions that make the owner say what they actually want, what is in the way, and what outcome would make the work worth doing - then one line of framing for the board. You are NOT taking a position and NOT casting a vote; positions and votes come later, blind.' + obrain + '\nPROPOSAL:\n' + proposal + '\n' +
        '\nAnswer ONLY as JSON: {"framing": "<one line of framing for the board>"}';
      const oresp = await callModel({ model: openerSeat.model, role: 'opener', seat: openerSeat.id, prompt: oprompt, missionId: grant.missionId });
      if (!oresp || typeof oresp.text !== 'string' || !oresp.text.trim()) {
        return bad('worker-failed', 'opener ' + openerSeat.id + ' worker returned no text - debate ' + debateId + ' left open for retry');
      }
      let oframing;
      try { oframing = JSON.parse(oresp.text); } catch (_) {
        return bad('opener-unparseable', 'opener ' + openerSeat.id + ' output is not the {framing} JSON - debate ' + debateId + ' left open for review');
      }
      if (typeof oframing.framing !== 'string' || !oframing.framing.trim()) {
        return bad('opener-empty-framing', 'opener ' + openerSeat.id + ' returned empty framing - debate ' + debateId + ' left open for review');
      }
      openerBrief = { seat: openerSeat.id, model: openerSeat.model, text: oframing.framing };
      if (oresp.usage && typeof oresp.usage.costUSD === 'number') {
        usage.turns.push({ role: 'opener', seat: openerSeat.id, model: openerSeat.model, usage: oresp.usage });
        usage.totalCostUSD += oresp.usage.costUSD;
      }
    }

    for (let round = 1; round <= 2; round++) { // round 1: blind positions; round 2: argument (final votes)
    for (const seat of seats) {
      const vres = council.boardView(roomId, debateId, seat.id);
      if (!vres.ok) return vres;
      const resp = await callModel({ model: seat.model, role: 'seat', seat: seat.id, prompt: seatPromptFor(seat, vres.visible, seatInstructions, openerBrief), missionId: grant.missionId });
      if (!resp || typeof resp.text !== 'string' || !resp.text.trim()) {
        return bad('worker-failed', 'seat ' + seat.id + ' worker returned no text - debate ' + debateId + ' left open for retry');
      }
      let stmt;
      try { stmt = JSON.parse(resp.text); } catch (_) {
        return bad('seat-unparseable', 'seat ' + seat.id + ' output is not the {position, vote, reason} JSON - debate ' + debateId + ' left open for review');
      }
      const spoke = council.boardSpeak(roomId, debateId, seat.id, { text: stmt.position || stmt.text, vote: stmt.vote, reason: stmt.reason });
      if (!spoke.ok) return spoke;
      if (resp.usage && typeof resp.usage.costUSD === 'number') {
        usage.turns.push({ role: 'seat', round, seat: seat.id, model: seat.model, usage: resp.usage });
        usage.totalCostUSD += resp.usage.costUSD;
      }
    }
    }

    const cvres = council.boardView(roomId, debateId, 'chair');
    if (!cvres.ok) return cvres;
    const boardSkillIds = boardDir ? loadRegistry(boardDir).skills.map(s => s.id) : [];
    const judged = await callModel({ model: chairModel, role: 'chair', prompt: chairPromptFor(cvres.visible, seatInstructions, boardSkillIds, openerBrief), missionId: grant.missionId });
    if (!judged || typeof judged.text !== 'string' || !judged.text.trim()) {
      return bad('worker-failed', 'chair worker returned no text - debate ' + debateId + ' left open for retry');
    }
    if (judged.usage && typeof judged.usage.costUSD === 'number') {
      usage.turns.push({ role: 'chair', model: chairModel, usage: judged.usage });
      usage.totalCostUSD += judged.usage.costUSD;
    }
    let verdict;
    try { verdict = JSON.parse(judged.text); } catch (_) {
      return bad('chair-unparseable', 'chair output is not the contract JSON - debate ' + debateId + ' left open for review');
    }
    const ruled = council.boardRule(roomId, debateId, {
      ruling: verdict.ruling, modifications: verdict.modifications,
      reasoning: verdict.judge_reasoning || verdict.reasoning,
      recommendation: verdict.recommendation, scores: verdict.scores
    });
    if (!ruled.ok) return ruled;

    // Execution skills attach only to a LOCKED ruling - a halt/escalation leaves no execution plan.
    const skillsPicked = (!ruled.escalated && ruled.locked) ? pickBoardSkills({ boardDir, proposal, verdict }) : null;

    const receipt = {
      receiptId: 'exec_' + idgen(),
      debateId, roomId, mode: 'board',
      models: { chair: chairModel, seats: Object.fromEntries(seats.map(s => [s.id, s.model])), opener: openerBrief ? openerBrief.seat : null },
      openerBrief: openerBrief ? openerBrief.text : null,
      missionId: grant.missionId,
      grant: { provider: grant.provider, model: grant.model, budgetUSD: grant.budgetUSD, expiresAt: grant.expiresAt },
      estimate: est.estimate,
      usage,
      outcome: ruled.escalated ? 'escalated' : ruled.locked.ruling,
      at: new Date(clock()).toISOString()
    };
    if (skillsPicked) receipt.skills = skillsPicked; // post-ruling execution skills; logged before hashing
    receipt.receiptHash = crypto.createHash('sha256').update(JSON.stringify(receipt), 'utf8').digest('hex');
    appendReceipt(receipt); // fail-open: the in-memory result stands
    return ok({ result: { debateId, escalated: !!ruled.escalated, locked: ruled.locked || null, usage, receipt } });
  }

  function applyModelOverrides(manifest, overrides) {
    // Swap seat/chair models without editing the manifest file: overrides = { '<seatId>': 'model-id', chair: 'model-id' }
    const out = JSON.parse(JSON.stringify(manifest || {}));
    for (const [id, model] of Object.entries(overrides || {})) {
      if (typeof model !== 'string' || !model.trim()) return bad('no-model', 'override for ' + id + ' needs a model id');
      if (id === 'chair') { out.chairModel = model; continue; }
      const seat = (out.seats || []).find(s => s.id === id);
      if (!seat) return bad('unknown-seat', 'no seat ' + id + ' in this manifest');
      seat.model = model;
    }
    return ok({ manifest: out });
  }

  return { estimate, run, estimateBoard, runBoard, isAstraModel, applyModelOverrides };
}

module.exports = { makePauliCouncilRunner };
