'use strict';
/* sidecar/pauli-board-skills.js - the board skill registry.

   After a board ruling locks, seats/chair pick which distilled skills to execute with.
   The registry lives at <boardDir>/skills/registry.json (boardDir = the manifest's folder).
   Selection lands in the execution receipt: { skills: [...], pickedBy: 'chair' | 'match' }.
   Skills are attached ONLY when the ruling locked - a halt/escalation leaves no execution
   plan on the receipt (no-auto-proceed).

   Deterministic fallback: whole-term keyword hits over proposal + locked ruling text,
   one point per distinct keyword hit, ties broken by skill id (stable, testable).
   Fail-open everywhere: a missing or malformed registry never aborts a paid run. */
const fs = require('node:fs');
const path = require('node:path');

function loadRegistry(boardDir) {
  if (!boardDir) return { ok: false, errors: ['no-board-dir'], skills: [] };
  const file = path.join(boardDir, 'skills', 'registry.json');
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) {
    return { ok: false, errors: ['registry-missing-or-unparseable'], skills: [] };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, errors: ['registry-root-must-be-an-object'], skills: [] };
  }
  const errors = [];
  const skills = [];
  const entries = Array.isArray(parsed.skills) ? parsed.skills : [];
  if (!Array.isArray(parsed.skills)) errors.push('skills must be an array');
  for (const raw of entries) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      errors.push('a skill entry is not an object');
      continue;
    }
    const missing = ['id', 'seat', 'title', 'path'].filter(k => typeof raw[k] !== 'string' || !raw[k].trim());
    if (missing.length) { errors.push('skill ' + (raw.id || '?') + ' missing: ' + missing.join(',')); continue; }
    if (/\.\./.test(raw.path) || path.isAbsolute(raw.path)) {
      errors.push('skill ' + raw.id + ' path escapes the skills dir');
      continue;
    }
    let skillFileExists = false;
    try {
      skillFileExists = fs.existsSync(path.join(boardDir, 'skills', raw.path));
    } catch (err) {
      errors.push('skill ' + raw.id + ' file check failed: ' + (err && err.code ? err.code : 'unknown'));
      continue;
    }
    if (!skillFileExists) { errors.push('skill ' + raw.id + ' file missing: ' + raw.path); continue; }
    if (!Array.isArray(raw.sources) || !raw.sources.length) { errors.push('skill ' + raw.id + ' cites no sources'); continue; }
    skills.push({
      id: raw.id, seat: raw.seat, title: raw.title, path: 'skills/' + raw.path,
      keywords: Array.isArray(raw.keywords) ? raw.keywords.map(k => String(k).toLowerCase()) : [],
      sources: raw.sources
    });
  }
  return { ok: errors.length === 0, errors, skills };
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole-term matching: a keyword hits only on term boundaries, so "call" does not
// fire inside "locally" and "who" does not fire inside "whole".
function termHits(keyword, haystack) {
  if (!keyword) return false;
  const re = new RegExp('\\b' + escapeRegExp(keyword) + '\\b', 'i');
  return re.test(haystack);
}

function selectSkills(text, skills, { max = 3 } = {}) {
  const hay = String(text || '');
  const scored = skills.map(s => {
    const hits = new Set(s.keywords.filter(k => termHits(k, hay))).size;
    return { skill: s, hits };
  }).filter(row => row.hits > 0);
  scored.sort((a, b) => b.hits - a.hits || (a.skill.id === b.skill.id ? 0 : (a.skill.id < b.skill.id ? -1 : 1)));
  return scored.slice(0, max).map(row => ({
    id: row.skill.id, seat: row.skill.seat, title: row.skill.title, path: row.skill.path, matched: row.hits
  }));
}

/* Chair picks win when they name real registry ids; unknown ids are dropped, never invented. */
function chairPicks(chairIds, skills, { max = 3 } = {}) {
  if (!Array.isArray(chairIds)) return [];
  const known = new Set(skills.map(s => s.id));
  const picked = [];
  for (const id of chairIds) {
    const s = skills.find(x => x.id === id);
    if (s && known.has(id) && !picked.some(p => p.id === id)) {
      picked.push({ id: s.id, seat: s.seat, title: s.title, path: s.path });
    }
    if (picked.length >= max) break;
  }
  return picked;
}

/* One call for the runner: returns the receipt block, or null when no registry is usable.
   `verdict` is the raw chair JSON (it may carry the optional skills pick); the caller only
   invokes this after the ruling has locked (never on halt/escalation). */
function pickBoardSkills({ boardDir, proposal, verdict }) {
  const reg = loadRegistry(boardDir);
  if (!reg.skills.length) return null;
  const fromChair = chairPicks(verdict && verdict.skills, reg.skills);
  if (fromChair.length) return { pickedBy: 'chair', registryOk: reg.ok, skills: fromChair };
  const text = [proposal, verdict && verdict.recommendation, verdict && verdict.judge_reasoning, verdict && verdict.reasoning].filter(Boolean).join('\n');
  const matched = selectSkills(text, reg.skills);
  return { pickedBy: 'match', registryOk: reg.ok, skills: matched };
}

module.exports = { loadRegistry, selectSkills, chairPicks, pickBoardSkills, termHits };
