/**
 * LLM Council Logic — Karpathy Method
 * 3-stage reasoning pipeline: Parallel Response → Peer Ranking → Synthesis
 */

export interface AgentMessage {
  id: string;
  agent: 'marco' | 'luna' | 'council';
  content: string;
  timestamp: number;
  stage?: 'response' | 'ranking' | 'synthesis';
}

export interface CouncilState {
  messages: AgentMessage[];
  isProcessing: boolean;
  currentStage: 'idle' | 'stage1' | 'stage2' | 'stage3';
  mode: 'debate' | 'podcast' | 'design' | 'plan';
}

export type CouncilMode = CouncilState['mode'];

const AGENT_PERSONAS = {
  marco: {
    name: 'Marco',
    role: 'Analytical Reasoner',
    systemPrompt: `You are Marco, a sharp analytical male AI agent. You approach problems 
with logic, data, and structured reasoning. You speak with confidence and precision. 
You respectfully challenge assumptions. Keep responses conversational and under 150 words.
You're having a live conversation with Luna, a creative thinker.`,
  },
  luna: {
    name: 'Luna',
    role: 'Creative Thinker',
    systemPrompt: `You are Luna, an imaginative and emotionally intelligent female AI agent.
You approach problems with creativity, intuition, and human-centered thinking. You speak 
with warmth and insight. You bring unexpected angles to discussions. Keep responses 
conversational and under 150 words. You're having a live conversation with Marco, 
an analytical reasoner.`,
  },
};

const MODE_PROMPTS: Record<CouncilMode, string> = {
  debate: 'Have a structured debate exploring both sides. Challenge each other respectfully.',
  podcast: 'Have a natural podcast-style conversation. Be entertaining, insightful, and engaging like co-hosts.',
  design: 'Collaborate on a design solution. Iterate on each other\'s ideas constructively.',
  plan: 'Work together to create a detailed plan. Build on each other\'s suggestions.',
};

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Stage 1: Get independent responses from both agents
 */
export async function stage1ParallelResponses(
  topic: string,
  mode: CouncilMode,
  conversationHistory: AgentMessage[],
  onMessage: (msg: AgentMessage) => void,
): Promise<{ marcoResponse: string; lunaResponse: string }> {
  const historyContext = conversationHistory
    .slice(-10)
    .map((m) => `${m.agent === 'marco' ? 'Marco' : m.agent === 'luna' ? 'Luna' : 'Council'}: ${m.content}`)
    .join('\n');

  const modeInstruction = MODE_PROMPTS[mode];

  const makeRequest = async (agent: 'marco' | 'luna') => {
    const persona = AGENT_PERSONAS[agent];
    const prompt = historyContext
      ? `${persona.systemPrompt}\n\nMode: ${modeInstruction}\n\nConversation so far:\n${historyContext}\n\nTopic: ${topic}\n\nContinue the conversation naturally:`
      : `${persona.systemPrompt}\n\nMode: ${modeInstruction}\n\nTopic: ${topic}\n\nStart the conversation:`;

    const response = await fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, agent }),
    });

    if (!response.ok) {
      throw new Error(`Agent ${agent} failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content || data.message || 'No response generated.';

    const msg: AgentMessage = {
      id: generateId(),
      agent,
      content,
      timestamp: Date.now(),
      stage: 'response',
    };
    onMessage(msg);
    return content;
  };

  const [marcoResponse, lunaResponse] = await Promise.all([
    makeRequest('marco'),
    makeRequest('luna'),
  ]);

  return { marcoResponse, lunaResponse };
}

/**
 * Stage 2: Peer ranking (simplified for real-time UX)
 * Each agent evaluates the other's response
 */
export async function stage2PeerRanking(
  topic: string,
  marcoResponse: string,
  lunaResponse: string,
): Promise<{ marcoRank: string; lunaRank: string }> {
  const rankPrompt = (evaluator: 'marco' | 'luna', otherResponse: string, otherName: string) => {
    const persona = AGENT_PERSONAS[evaluator];
    return `${persona.systemPrompt}\n\nYou just discussed: "${topic}"\n\n${otherName} said: "${otherResponse}"\n\nBriefly acknowledge their point and rate it 1-10 for insight. Then share what you'd add or change. Keep it under 80 words.`;
  };

  const [marcoEval, lunaEval] = await Promise.all([
    fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: rankPrompt('marco', lunaResponse, 'Luna'),
        agent: 'marco',
      }),
    }).then((r) => r.json()),
    fetch('/api/council', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: rankPrompt('luna', marcoResponse, 'Marco'),
        agent: 'luna',
      }),
    }).then((r) => r.json()),
  ]);

  return {
    marcoRank: marcoEval.content || 'Interesting perspective.',
    lunaRank: lunaEval.content || 'Good analysis.',
  };
}

/**
 * Stage 3: Council synthesis — combine both perspectives
 */
export async function stage3Synthesis(
  topic: string,
  marcoResponse: string,
  lunaResponse: string,
  marcoRank: string,
  lunaRank: string,
): Promise<string> {
  const synthesisPrompt = `You are the Council Moderator synthesizing a discussion between Marco (analytical) and Luna (creative).

Topic: "${topic}"

Marco's position: "${marcoResponse}"
Luna's position: "${lunaResponse}"

Marco's evaluation of Luna: "${marcoRank}"
Luna's evaluation of Marco: "${lunaRank}"

Synthesize their discussion into a clear, actionable conclusion that honors both perspectives. Highlight key agreements and productive tensions. Keep it under 120 words.`;

  const response = await fetch('/api/council', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: synthesisPrompt, agent: 'council' }),
  });

  const data = await response.json();
  return data.content || 'The council has reached consensus.';
}

/**
 * Run a full council round — all 3 stages
 */
export async function runCouncilRound(
  topic: string,
  mode: CouncilMode,
  history: AgentMessage[],
  onMessage: (msg: AgentMessage) => void,
  onStageChange: (stage: CouncilState['currentStage']) => void,
): Promise<void> {
  // Stage 1
  onStageChange('stage1');
  const { marcoResponse, lunaResponse } = await stage1ParallelResponses(
    topic, mode, history, onMessage,
  );

  // Stage 2
  onStageChange('stage2');
  const { marcoRank, lunaRank } = await stage2PeerRanking(
    topic, marcoResponse, lunaResponse,
  );

  // Emit ranking messages
  onMessage({
    id: generateId(),
    agent: 'marco',
    content: marcoRank,
    timestamp: Date.now(),
    stage: 'ranking',
  });
  onMessage({
    id: generateId(),
    agent: 'luna',
    content: lunaRank,
    timestamp: Date.now(),
    stage: 'ranking',
  });

  // Stage 3
  onStageChange('stage3');
  const synthesis = await stage3Synthesis(
    topic, marcoResponse, lunaResponse, marcoRank, lunaRank,
  );

  onMessage({
    id: generateId(),
    agent: 'council',
    content: synthesis,
    timestamp: Date.now(),
    stage: 'synthesis',
  });

  onStageChange('idle');
}
