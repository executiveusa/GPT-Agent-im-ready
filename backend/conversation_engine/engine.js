const scripts = [
  {
    speaker: 'Strategist',
    text: 'Team, let us align on priorities for this sprint. The Pi fleet needs a clear execution vector.',
    emotion: 'confident',
  },
  {
    speaker: 'Engineer',
    text: 'I can ship the WebSocket event flow and sphere animation loop by end of day.',
    emotion: 'thinking',
  },
  {
    speaker: 'Researcher',
    text: 'I validated local voice and lipsync fallbacks — the stack runs cleanly without external secrets.',
    emotion: 'happy',
  },
  {
    speaker: 'Creative',
    text: 'The visual system needs a stronger brand beat. The sphere palette is on point — let us push the motion language further.',
    emotion: 'excited',
  },
  {
    speaker: 'Safety',
    text: 'All inter-agent envelopes are passing ACIP validation. No anomalies in the last 24-hour window.',
    emotion: 'confident',
  },
  {
    speaker: 'Strategist',
    text: 'Good. DVK-002 — confirm the delegation queue is unblocked. We need the browser harness PR merged before 18:00.',
    emotion: 'focused',
  },
  {
    speaker: 'Engineer',
    text: 'Queue is clear. Browser harness is in review. ETA on merge: 2 hours.',
    emotion: 'thinking',
  },
  {
    speaker: 'Researcher',
    text: 'Multi-provider routing is live. OpenAI and Anthropic both responding within SLA on demo traffic.',
    emotion: 'happy',
  },
];

export function nextTurn(index) {
  return scripts[index % scripts.length];
}
