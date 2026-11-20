/* test/_assert.js — zero-dep assertion helpers + a fake U.bus, matching the
   err()-counter + process.exit(fail?1:0) convention used by the v7 headless tests.
   Each test file: run assertions, then call report() last. */
'use strict';

let fail = 0, pass = 0;
const err = m => { fail++; console.log('FAIL: ' + m); };

function ok(cond, msg) { if (cond) pass++; else err(msg || 'expected truthy value'); }

function eq(actual, expected, msg) {
  const A = JSON.stringify(actual), B = JSON.stringify(expected);
  if (A === B) pass++; else err((msg || 'eq') + ' — expected ' + B + ', got ' + A);
}

function throws(fn, msg) {
  try { fn(); err((msg || 'throws') + ' — did not throw'); }
  catch (e) { pass++; }
}

function notThrows(fn, msg) {
  try { fn(); pass++; }
  catch (e) { err((msg || 'notThrows') + ' — threw: ' + (e && e.message)); }
}

/* a fake bus mirroring frontend/js/util.js U.bus: handler throws are swallowed. */
function makeBus() {
  const h = {};
  return {
    _h: h,
    on(ev, fn) { (h[ev] = h[ev] || []).push(fn); },
    emit(ev, data) { (h[ev] || []).forEach(fn => { try { fn(data); } catch (e) { /* swallowed, as in U.bus */ } }); }
  };
}

/* subscribe to the given event names; returns an array filled in emit order. */
function collectBus(bus, names) {
  const log = [];
  for (const n of names) bus.on(n, payload => log.push({ name: n, payload }));
  return log;
}

/* fnBody(src, header) → the source of exactly ONE function, from its declaration to its OWN closing brace.
   Source-lock tests in this repo slice chat.js by a magic char count (`src.slice(i, i + 2600)`), which silently
   overruns into the NEXT function as bodies grow: a `why:` assertion aimed at suggestCandidate happily matched
   seedCandidate's, and deleting the line under test left the test green. Brace-count to the real end instead —
   then every lock binds the function it names, and nothing else. Quotes, template literals and comments are
   skipped so a brace inside a string or a prose comment can't end the body early.
   THE ONE CONCRETE HAZARD, named rather than hand-waved: REGEX LITERALS ARE NOT PARSED. A quote character inside
   a regex CHARACTER CLASS — `/[^']+/`, `/["']/` — opens the string-skip above, which then runs to the next
   matching quote somewhere later in the file, swallowing every brace in between. The scan does not end at the
   function's real closing brace and the returned slice RUNS LONG into whatever follows. It fails open (a longer
   body still contains everything the caller asserts) but a `!/…/.test(body)` assertion aimed at that function can
   then be satisfied — or falsified — by a NEIGHBOUR's source. So: any caller scanning a function that contains a
   quote inside a regex class MUST keep a length guard (assert the body is non-empty AND shorter than the file, or
   shorter than a sane bound) — that guard is what catches a mis-scan. This is a test helper, not a JS parser, and
   teaching it regex-vs-division would cost more than the guard. Returns '' if the header is absent. */
function fnBody(src, header) {
  const start = src.indexOf(header);
  if (start < 0) return '';
  let i = src.indexOf('{', start);
  if (i < 0) return '';
  let depth = 0;
  for (; i < src.length; i++) {
    const c = src[i], n = src[i + 1];
    if (c === '/' && n === '/') { const nl = src.indexOf('\n', i); i = nl < 0 ? src.length : nl; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c;
      for (i++; i < src.length; i++) { if (src[i] === '\\') { i++; continue; } if (src[i] === q) break; }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return src.slice(start, i + 1); }
  }
  return src.slice(start);
}

let reported = false;

function report(title) {
  reported = true;
  console.log((title || 'tests') + ': ' + (fail ? (fail + ' problem(s), ' + pass + ' ok') : ('OK (' + pass + ' assertions)')));
  process.exit(fail ? 1 : 0);
}

/* SILENT-EARLY-EXIT GUARD (2026-07-25). Calling report() is necessary but not sufficient: a file can EXIT
   BEFORE reaching it and still leave exit code 0, so the runner scores it green having verified nothing.
   That is not hypothetical — it happened while adding a browser test here. Node's event loop can drain
   mid-await when the only thing outstanding is an unref'd timer (the CDP client unrefs its timeout timers),
   and an un-awaited async IIFE has the same effect. Both look identical to the runner: no output, exit 0.
   So: if any assertion ran and the process leaves with a success code without report() having been called,
   turn it red and say why. A test whose asserts never finished is a failing test, not a passing one. */
process.on('exit', (code) => {
  if (reported || code !== 0) return;
  if (pass === 0 && fail === 0) return;   // a file that asserted nothing is some other lint's problem
  console.log('FAIL: the test process exited before report() was reached — ' + pass + ' assertion(s) had run.');
  console.log('      Exit code 0 here would be scored GREEN having verified nothing. Usual causes: an');
  console.log('      un-awaited async block, or the event loop draining while only unref\'d timers remain');
  console.log('      (hold it open with a setInterval for the duration of the wait).');
  process.exitCode = 1;
});

module.exports = { ok, eq, throws, notThrows, makeBus, collectBus, report, fnBody, fails: () => fail };
