const scripts = [
  { speaker: 'Strategist', text: 'Team, let us align on priorities for this sprint.', emotion: 'confident' },
  { speaker: 'Engineer', text: 'I can ship the websocket event flow and avatar animation loop today.', emotion: 'thinking' },
  { speaker: 'Researcher', text: 'I validated local voice and lip sync fallbacks so the stack runs without secrets.', emotion: 'happy' }
];

export function nextTurn(index) {
  return scripts[index % scripts.length];
}
