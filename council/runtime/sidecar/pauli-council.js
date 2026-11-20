/* sidecar/pauli-council.js — Pauli's council sessions (multiplayer-ai patterns port, chunk 3).

   Port of the room/session patterns from executiveusa/pauli-multiplayer-ai (MIT, upstream
   yc-software/qm @ 6deb7c2a - room/user-scoped sessions: per-participant keychains, permissions,
   file scoping, work queue) fused with the adversarial three-turn debate protocol imported
   verbatim from PAULIS-PLACE (districts/pauli/canon/paulis-place/COUNCIL.md; source
   icm/instructions/COUNCIL.md @ 328e3aee). See districts/pauli/imports/multiplayer-ai/IMPORT.md.

   ROOMS (multiplayer-ai): a council room is a scoped session. Every participant gets an ISOLATED
   keychain - a participant can read only their own secrets; cross reads are denied, never leaked.
   Each room carries a FIFO work queue with monotonic sequence numbers.

   DEBATE (COUNCIL.md): exactly three turns, no rebuttals.
     Turn 1 ADVOCATE argues FOR (sees only the proposal)
     Turn 2 CRITIC argues AGAINST (sees proposal + advocate)
     Turn 3 JUDGE locks the ruling (sees everything; MUST NOT be the advocate or critic model)
   view(debate, role) returns exactly what that role may see - the information asymmetry is
   enforced here, not by prompt etiquette. The judge's ruling is locked in the COUNCIL.md §3
   contract shape and saved to icm/memory/decisions/<YYYY-MM-DD>/<debate_id>.json.
   A judge ruling of 'halt' ESCALATES to the human - never auto-proceeds (COUNCIL.md §5).

   MINUTES: close(roomId) drains nothing silently - it seals the room and emits a minutes receipt
   (participants, debates + rulings, queue depth handled, opened/closed timestamps, receipt hash)
   appended to the minutes ledger. The receipt is the scribe-owned proof the session happened.

   Every ambient dependency is INJECTED (fs, pathMod, clock, idgen, crypto). No Date.now /
   Math.random - the fake clock + fake ids keep tests deterministic. Storage failures FAIL-OPEN.

   makePauliCouncil({ fs, pathMod, root, clock, idgen, crypto, reDebateAfterMs? })
     openRoom({ participants: [{ id, model }], policy? })            -> { ok, roomId? | error }
     putSecret(roomId, participantId, key, value)                    -> { ok | error }
     getSecret(roomId, requesterId, ownerId, key)                    -> { ok, value, denied? }
     enqueue(roomId, participantId, item)                            -> { ok, seq? | error }
     drain(roomId)                                                   -> { ok, items }            // FIFO
     requiresDebate({ blastRadius?, servicesTouched? })              -> boolean                  // COUNCIL.md §4 thresholds
     startDebate(roomId, { proposal, advocateModel, criticModel, judgeModel, expectedCost? })
                                                                     -> { ok, debateId? | error }
     view(roomId, debateId, role)                                    -> { ok, visible }          // per-role information gate
     speak(roomId, debateId, role, text)                             -> { ok, turn? | error }    // advocate then critic only
     rule(roomId, debateId, { ruling, modifications?, reasoning })   -> { ok, locked? | error }  // turn 3; 'halt' escalates
     close(roomId)                                                   -> { ok, receipt? | error } // minutes receipt to ledger */
'use strict';

const ROLES = ['advocate', 'critic', 'judge'];
const RULINGS = ['APPROVE', 'REJECT', 'MODIFY'];
const BLAST_RADIUS_DEBATE_MIN = 5;   // COUNCIL.md §4: blast_radius > $5 requires debate
const SERVICES_DEBATE_MIN = 2;       // COUNCIL.md §4: services_touched >= 2 requires debate

function makePauliCouncil(deps) {
  const fs = deps.fs, pathMod = deps.pathMod, clock = deps.clock, idgen = deps.idgen, crypto = deps.crypto;
  const root = deps.root;
  if (!fs || !pathMod || typeof clock !== 'function' || typeof idgen !== 'function' || !crypto || !root) {
    throw new Error('pauli-council: fs, pathMod, root, clock, idgen, crypto are required');
  }
  const reDebateAfterMs = typeof deps.reDebateAfterMs === 'number' ? deps.reDebateAfterMs : 7 * 24 * 3600 * 1000;
  const dir = pathMod.join(root, 'pauli-council');
  const minutesFile = pathMod.join(dir, 'minutes.jsonl');
  const rooms = new Map();

  const ok = extra => Object.assign({ ok: true }, extra || {});
  const bad = (error, msg) => ({ ok: false, error, msg: msg || error });

  function hash(text) { return crypto.createHash('sha256').update(String(text), 'utf8').digest('hex'); }
  function ensureDir(d) { try { fs.mkdirSync(d, { recursive: true }); return true; } catch (_) { return false; } }
  function append(file, entry) {
    try { ensureDir(pathMod.dirname(file)); fs.appendFileSync(file, JSON.stringify(entry) + '\n'); return true; } catch (_) { return false; }
  }

  function getRoom(roomId) { return rooms.get(String(roomId)) || null; }
  function getDebate(room, debateId) { return room.debates.get(String(debateId)) || null; }

  function openRoom({ participants, policy }) {
    if (!Array.isArray(participants) || participants.length === 0) return bad('no-participants', 'a room needs at least one participant');
    const ids = participants.map(p => p && p.id);
    if (ids.some(id => typeof id !== 'string' || !id.trim())) return bad('bad-participant', 'every participant needs an id');
    if (new Set(ids).size !== ids.length) return bad('duplicate-participant', 'participant ids must be unique');
    const roomId = 'room_' + idgen();
    const keychains = new Map();
    for (const p of participants) keychains.set(p.id, new Map());
    rooms.set(roomId, {
      roomId,
      participants: participants.map(p => ({ id: p.id, model: p.model || null })),
      policy: policy || {},
      keychains,
      queue: [],
      queueSeq: 0,
      debates: new Map(),
      openedAt: clock(),
      closed: false
    });
    return ok({ roomId });
  }

  function requireOpen(roomId) {
    const room = getRoom(roomId);
    if (!room) return { error: bad('no-room', 'unknown room') };
    if (room.closed) return { error: bad('room-closed', 'room is closed') };
    return { room };
  }

  function putSecret(roomId, participantId, key, value) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const chain = room.keychains.get(participantId);
    if (!chain) return bad('not-a-participant', 'only a participant can write a keychain');
    if (typeof key !== 'string' || !key.trim()) return bad('bad-key', 'key required');
    chain.set(key, value);
    return ok();
  }

  function getSecret(roomId, requesterId, ownerId, key) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    if (!room.keychains.has(requesterId)) return bad('not-a-participant', 'only a participant can read');
    if (requesterId !== ownerId) return ok({ value: null, denied: true }); // isolation: denied, never leaked
    const chain = room.keychains.get(ownerId);
    if (!chain) return ok({ value: null, denied: true });
    return ok({ value: chain.has(key) ? chain.get(key) : null });
  }

  function enqueue(roomId, participantId, item) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    if (!room.keychains.has(participantId)) return bad('not-a-participant', 'only a participant can enqueue work');
    const seq = ++room.queueSeq;
    room.queue.push({ seq, participantId, item });
    return ok({ seq });
  }

  function drain(roomId) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const items = room.queue;
    room.queue = [];
    return ok({ items });
  }

  function requiresDebate({ blastRadius, servicesTouched }) {
    const b = typeof blastRadius === 'number' ? blastRadius : 0;
    const s = typeof servicesTouched === 'number' ? servicesTouched : 0;
    return b > BLAST_RADIUS_DEBATE_MIN || s >= SERVICES_DEBATE_MIN;
  }

  function startDebate(roomId, { proposal, advocateModel, criticModel, judgeModel, expectedCost }) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    if (typeof proposal !== 'string' || !proposal.trim()) return bad('no-proposal', 'proposal text required');
    const modelArgs = { advocateModel, criticModel, judgeModel };
    for (const [m, v] of Object.entries(modelArgs)) {
      if (typeof v !== 'string' || !v.trim()) return bad('no-model', m + ' required');
    }
    if (judgeModel === advocateModel || judgeModel === criticModel) {
      return bad('judge-conflict', 'the judge must NOT be the same model as advocate or critic (COUNCIL.md §1)');
    }
    const debateId = 'deb_' + idgen();
    room.debates.set(debateId, {
      debate_id: debateId,
      proposal,
      models: { advocate: advocateModel, critic: criticModel, judge: judgeModel },
      expectedCost: typeof expectedCost === 'number' ? expectedCost : null, // COUNCIL.md §5: pre-flight cost declaration
      turns: [],          // [{ turn, role, text }] - max 3, roles in order
      ruling: null,       // 'APPROVE' | 'REJECT' | 'MODIFY'
      escalated: false,   // judge said halt
      locked: null,       // the locked-ruling contract object
      startedAt: clock()
    });
    return ok({ debateId });
  }

  function view(roomId, debateId, role) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const debate = getDebate(room, debateId);
    if (!debate) return bad('no-debate', 'unknown debate');
    if (!ROLES.includes(role)) return bad('bad-role', 'role must be advocate, critic, or judge');
    const visible = { proposal: debate.proposal };
    const advocateTurn = debate.turns.find(t => t.role === 'advocate');
    const criticTurn = debate.turns.find(t => t.role === 'critic');
    if (role === 'critic' || role === 'judge') visible.advocate_arg = advocateTurn ? advocateTurn.text : null;
    if (role === 'judge') visible.critic_arg = criticTurn ? criticTurn.text : null;
    return ok({ visible });
  }

  function speak(roomId, debateId, role, text) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const debate = getDebate(room, debateId);
    if (!debate) return bad('no-debate', 'unknown debate');
    if (role === 'judge') return bad('use-rule', 'the judge locks a ruling through rule(), not speak()');
    if (!ROLES.includes(role)) return bad('bad-role', 'role must be advocate, critic, or judge');
    if (debate.locked || debate.escalated) return bad('debate-over', 'debate is already settled');
    if (typeof text !== 'string' || !text.trim()) return bad('empty-turn', 'turn text required');
    const expectedRole = debate.turns.length === 0 ? 'advocate' : (debate.turns.length === 1 ? 'critic' : null);
    if (expectedRole === null) return bad('max-turns', 'max 3 turns; no rebuttals beyond turn 2 (COUNCIL.md §5)');
    if (role !== expectedRole) return bad('out-of-order', 'turn ' + (debate.turns.length + 1) + ' belongs to the ' + expectedRole);
    const turn = { turn: debate.turns.length + 1, role, text, at: clock() };
    debate.turns.push(turn);
    return ok({ turn: turn.turn });
  }

  function rule(roomId, debateId, { ruling, modifications, reasoning }) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const debate = getDebate(room, debateId);
    if (!debate) return bad('no-debate', 'unknown debate');
    if (debate.locked || debate.escalated) return bad('debate-over', 'debate is already settled');
    if (debate.turns.length !== 2) return bad('out-of-order', 'the judge rules after advocate + critic (turn 3)');
    if (ruling === 'halt') { // COUNCIL.md §5: escalate to human, no auto-proceed
      debate.escalated = true;
      return ok({ escalated: true });
    }
    if (!RULINGS.includes(ruling)) return bad('bad-ruling', 'ruling must be APPROVE, REJECT, MODIFY, or halt');
    if (ruling === 'MODIFY' && (typeof modifications !== 'string' || !modifications.trim())) {
      return bad('no-modifications', 'a MODIFY ruling must carry the new proposal text');
    }
    if (typeof reasoning !== 'string' || !reasoning.trim()) return bad('no-reasoning', 'judge_reasoning is required');
    const advocateTurn = debate.turns.find(t => t.role === 'advocate');
    const criticTurn = debate.turns.find(t => t.role === 'critic');
    const locked = { // COUNCIL.md §3 locked-ruling contract
      debate_id: debate.debate_id,
      proposal: debate.proposal,
      advocate_arg: advocateTurn.text,
      critic_arg: criticTurn.text,
      ruling,
      modifications: ruling === 'MODIFY' ? modifications : null,
      judge_model: debate.models.judge,
      judge_reasoning: reasoning,
      expires_at: new Date(clock() + reDebateAfterMs).toISOString()
    };
    debate.ruling = ruling;
    debate.locked = locked;
    const day = new Date(clock()).toISOString().slice(0, 10);
    append(pathMod.join(dir, 'decisions', day, debate.debate_id + '.json'), locked); // fail-open: the in-memory lock stands
    return ok({ locked });
  }

  function close(roomId) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    room.closed = true;
    const debates = Array.from(room.debates.values()).map(d => ({
      debate_id: d.debate_id, mode: d.mode === 'board' ? 'board' : 'debate', ruling: d.ruling, escalated: d.escalated,
      turns: d.mode === 'board' ? d.statements.length : d.turns.length
    }));
    const receiptCore = {
      roomId: room.roomId,
      participants: room.participants.map(p => p.id),
      debates,
      queue_depth_unhandled: room.queue.length,
      openedAt: new Date(room.openedAt).toISOString(),
      closedAt: new Date(clock()).toISOString()
    };
    const receipt = Object.assign({}, receiptCore, { receiptHash: hash(JSON.stringify(receiptCore)) });
    append(minutesFile, receipt); // fail-open
    return ok({ receipt });
  }


  /* BOARD MODE (opt-in parallel protocol; the 3-turn debate above is unchanged).
     N persona seats speak in declared seat order, each casting one weighted vote; a seat sees the
     proposal plus only the statements of the seats BEFORE it (the same information-asymmetry rule,
     generalized). The chair sees every statement plus the live tally and locks the section-3 ruling
     shape extended with the board record (statements, tally, scored recommendation). 'halt'
     escalates to the human, same as the debate. */
  const BOARD_SEATS_MIN = 2, BOARD_SEATS_MAX = 13; // raised for the king-doe head seat (board opens with all 13 live seats)

  function isBoard(debate) { return debate && debate.mode === 'board'; }

  function boardTally(debate) {
    // blind-first: a seat's LAST statement is its final vote; earlier rounds are argument, not votes
    const t = { APPROVE: 0, REJECT: 0, MODIFY: 0 };
    const final = new Map();
    for (const s of debate.statements) final.set(s.seat, s);
    for (const s of final.values()) t[s.vote] += s.weight;
    return t;
  }

  function startBoardDebate(roomId, { proposal, seats, chairModel, expectedCost }) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    if (typeof proposal !== 'string' || !proposal.trim()) return bad('no-proposal', 'proposal text required');
    if (!Array.isArray(seats) || seats.length < BOARD_SEATS_MIN || seats.length > BOARD_SEATS_MAX) {
      return bad('bad-seats', 'a board needs ' + BOARD_SEATS_MIN + '..' + BOARD_SEATS_MAX + ' seats');
    }
    const ids = seats.map(s => s && s.id);
    if (ids.some(id => typeof id !== 'string' || !id.trim())) return bad('bad-seat', 'every seat needs an id');
    if (new Set(ids).size !== ids.length) return bad('duplicate-seat', 'seat ids must be unique');
    for (const s of seats) {
      if (typeof s.model !== 'string' || !s.model.trim()) return bad('no-model', 'seat ' + s.id + ' needs a model');
      if (s.weight !== undefined && (typeof s.weight !== 'number' || !(s.weight > 0))) return bad('bad-weight', 'seat ' + s.id + ' weight must be a positive number');
    }
    if (typeof chairModel !== 'string' || !chairModel.trim()) return bad('no-model', 'chairModel required');
    if (seats.some(s => s.model === chairModel)) return bad('chair-conflict', 'the chair must NOT share a model with any seat (judge independence, COUNCIL.md section 1)');
    const debateId = 'deb_' + idgen();
    room.debates.set(debateId, {
      debate_id: debateId,
      mode: 'board',
      proposal,
      seats: seats.map(s => ({ id: s.id, model: s.model, weight: typeof s.weight === 'number' ? s.weight : 1 })),
      chairModel,
      expectedCost: typeof expectedCost === 'number' ? expectedCost : null,
      statements: [],      // [{ seq, round, seat, model, text, vote, weight, reason, at }] - round 1 = blind positions, round 2 = argument (final vote)
      ruling: null,
      escalated: false,
      locked: null,
      startedAt: clock()
    });
    return ok({ debateId });
  }

  function boardView(roomId, debateId, who) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const debate = getDebate(room, debateId);
    if (!debate) return bad('no-debate', 'unknown debate');
    if (!isBoard(debate)) return bad('not-board', 'debate is not a board session');
    const visible = { proposal: debate.proposal };
    if (who === 'chair') {
      visible.statements = debate.statements.map(s => ({ round: s.round, seat: s.seat, text: s.text, vote: s.vote, weight: s.weight, reason: s.reason }));
      visible.tally = boardTally(debate);
      return ok({ visible });
    }
    const idx = debate.seats.findIndex(s => s.id === who);
    if (idx === -1) return bad('bad-seat', 'who must be a seat id or chair');
    const round = Math.floor(debate.statements.length / debate.seats.length) + 1;
    visible.round = round;
    if (round === 1) {
      visible.statements = []; // blind-first: every seat locks its own position before seeing any other
    } else {
      visible.statements = debate.statements
        .filter(s => s.round === 1) // the argument round shows every round-1 position, never other round-2 arguments
        .map(s => ({ seat: s.seat, text: s.text, vote: s.vote, reason: s.reason }));
    }
    return ok({ visible });
  }

  function boardSpeak(roomId, debateId, seatId, { text, vote, reason }) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const debate = getDebate(room, debateId);
    if (!debate) return bad('no-debate', 'unknown debate');
    if (!isBoard(debate)) return bad('not-board', 'debate is not a board session');
    if (debate.locked || debate.escalated) return bad('debate-over', 'debate is already settled');
    const turn = debate.statements.length;
    const nSeats = debate.seats.length;
    if (turn >= nSeats * 2) return bad('max-turns', 'every seat has spoken in both rounds; the chair rules now');
    const round = Math.floor(turn / nSeats) + 1;
    const expected = debate.seats[turn % nSeats];
    if (seatId !== expected.id) return bad('out-of-order', 'turn ' + (turn + 1) + ' (round ' + round + ') belongs to seat ' + expected.id);
    if (typeof text !== 'string' || !text.trim()) return bad('empty-turn', 'statement text required');
    if (!RULINGS.includes(vote)) return bad('bad-vote', 'vote must be APPROVE, REJECT, or MODIFY');
    debate.statements.push({
      seq: turn, round, seat: seatId, model: expected.model,
      text, vote, weight: expected.weight,
      reason: typeof reason === 'string' ? reason : '',
      at: clock()
    });
    return ok({ turn: debate.statements.length });
  }

  function boardRule(roomId, debateId, { ruling, modifications, reasoning, recommendation, scores }) {
    const { room, error } = requireOpen(roomId); if (error) return error;
    const debate = getDebate(room, debateId);
    if (!debate) return bad('no-debate', 'unknown debate');
    if (!isBoard(debate)) return bad('not-board', 'debate is not a board session');
    if (debate.locked || debate.escalated) return bad('debate-over', 'debate is already settled');
    if (debate.statements.length !== debate.seats.length * 2) return bad('out-of-order', 'the chair rules after every seat has spoken in both rounds (blind position, then argument)');
    if (ruling === 'halt') { // same as the debate: escalate to the human, no auto-proceed
      debate.escalated = true;
      return ok({ escalated: true });
    }
    if (!RULINGS.includes(ruling)) return bad('bad-ruling', 'ruling must be APPROVE, REJECT, MODIFY, or halt');
    if (ruling === 'MODIFY' && (typeof modifications !== 'string' || !modifications.trim())) {
      return bad('no-modifications', 'a MODIFY ruling must carry the new proposal text');
    }
    if (typeof reasoning !== 'string' || !reasoning.trim()) return bad('no-reasoning', 'judge_reasoning is required');
    if (typeof recommendation !== 'string' || !recommendation.trim()) return bad('no-recommendation', 'a board ruling carries the scored recommendation');
    const locked = { // COUNCIL.md section-3 contract, board extension
      debate_id: debate.debate_id,
      mode: 'board',
      proposal: debate.proposal,
      statements: debate.statements.map(s => ({ round: s.round, seat: s.seat, model: s.model, text: s.text, vote: s.vote, weight: s.weight, reason: s.reason })),
      models: { chair: debate.chairModel, seats: Object.fromEntries(debate.seats.map(s => [s.id, s.model])) },
      tally: boardTally(debate),
      ruling,
      modifications: ruling === 'MODIFY' ? modifications : null,
      chair_model: debate.chairModel,
      judge_reasoning: reasoning,
      recommendation,
      scores: scores && typeof scores === 'object' ? scores : null,
      expires_at: new Date(clock() + reDebateAfterMs).toISOString()
    };
    debate.ruling = ruling;
    debate.locked = locked;
    const day = new Date(clock()).toISOString().slice(0, 10);
    append(pathMod.join(dir, 'decisions', day, debate.debate_id + '.json'), locked); // fail-open: the in-memory lock stands
    return ok({ locked });
  }

  return { openRoom, putSecret, getSecret, enqueue, drain, requiresDebate, startDebate, view, speak, rule, close, startBoardDebate, boardView, boardSpeak, boardRule };
}

module.exports = { makePauliCouncil };
