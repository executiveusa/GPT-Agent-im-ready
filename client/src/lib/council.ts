/**
 * LLM Council Logic — Pi Multi-Agent Runtime
 * 3-stage pipeline: Parallel Response → Peer Ranking → Synthesis
 * Supports any agent pair from the Pi fleet.
 */

import { getAgent, AGENTS, type AgentDefinition } from './agents';
import { resolveProvider, type ProviderResolutionContext, type ApiProvider } from './provider-routing';

export interface AgentMessage {
  id: string;
  agent: string;
  agentName: string;
  agentColor: string;
  content: string;
  timestamp: number;
  stage?: 'response' | 'ranking' | 'synthesis';
  provider?: string;
  model?: string;
  error?: string;
}

export interface CouncilState {
  messages: AgentMessage[];
  isProcessing: boolean;
  currentStage: 'idle' | 'stage1' | 'stage2' | 'stage3';
  mode: CouncilMode;
}

export type CouncilMode = 'debate' | 'podcast' | 'design' | 'plan';

export interface CouncilSettings {
  openaiKey?: string;
  anthropicKey?: string;
  defaultProvider?: ApiProvider;
  demoModeLocked?: boolean;
}

const MODE_PROMPTS: Record<CouncilMode, string> = {
  debate: 'Have a structured debate exploring multiple sides. Challenge each other respectfully with evidence.',
  podcast: 'Have a natural podcast-style conversation. Be entertaining, insightful, and engaging like co-hosts.',
  design: 'Collaborate on a design or creative solution. Iterate on each other\'s ideas constructively.',
  plan: 'Work together to create a detailed action plan. Build on each other\'s suggestions step by step.',
};

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function callAgent(
  agent: AgentDefinition,
  prompt: string,
  settings?: CouncilSettings
): Promise<{ content: string; provider: string; model: string; error?: string }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  // Support both legacy and unified routing
  const useUnifiedRouter = process.env.NEXT_PUBLIC_USE_UNIFIED_ROUTER === 'true';

  if (useUnifiedRouter) {
    // Route through unified system with BYOK support
    const response = await fetch('/api/agent-unified', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        agentId: agent.id,
        prompt,
        userKey: settings?.openaiKey || settings?.anthropicKey, // BYOK mode
        model: 'claude-sonnet-4-5',
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error?.message || `Agent ${agent.id} failed: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      content: data.content || '',
      provider: data.provider || 'unknown',
      model: data.model || 'unknown',
      error: data.error?.message,
    };
  }

  // Legacy routing via original /api/agent endpoint
  if (settings?.openaiKey) headers['x-openai-key'] = settings.openaiKey;
  if (settings?.anthropicKey) headers['x-anthropic-key'] = settings.anthropicKey;

  const resolution = resolveProvider({
    selectedProvider: settings?.defaultProvider,
    browserOpenaiKey: settings?.openaiKey,
    browserAnthropicKey: settings?.anthropicKey,
    demoModeLocked: settings?.demoModeLocked,
  });

  const response = await fetch('/api/agent', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      prompt,
      agentId: agent.id,
      providerOverride: resolution.provider !== 'demo' ? resolution.provider : undefined,
      allowDemoFallback: resolution.canFallbackToDemo,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error?.message || `Agent ${agent.id} failed: ${response.statusText}`);
  }

  const data = await response.json();

  // Check if the response is an error
  if (!data.ok) {
    throw new Error(data.error?.message || 'Agent request failed');
  }

  return {
    content: data.content || 'No response generated.',
    provider: data.provider || 'demo',
    model: data.model || 'unknown',
  };
}

/**
 * Stage 1: Independent parallel responses from both agents
 */
async function stage1ParallelResponses(
  topic: string,
  mode: CouncilMode,
  conversationHistory: AgentMessage[],
  agent1: AgentDefinition,
  agent2: AgentDefinition,
  onMessage: (msg: AgentMessage) => void,
  settings?: CouncilSettings
): Promise<{ response1: string; response2: string }> {
  const historyContext = conversationHistory
    .slice(-10)
    .map((m) => `${m.agentName}: ${m.content}`)
    .join('\n');

  const modeInstruction = MODE_PROMPTS[mode];

  const buildPrompt = (agent: AgentDefinition, partner: AgentDefinition) =>
    historyContext
      ? `${agent.systemPrompt}\n\nMode: ${modeInstruction}\n\nYou are talking with ${partner.name} (${partner.role}).\n\nConversation so far:\n${historyContext}\n\nTopic: ${topic}\n\nContinue the conversation naturally:`
      : `${agent.systemPrompt}\n\nMode: ${modeInstruction}\n\nYou are talking with ${partner.name} (${partner.role}).\n\nTopic: ${topic}\n\nStart the conversation:`;

  const makeRequest = async (agent: AgentDefinition, partner: AgentDefinition): Promise<string> => {
    const result = await callAgent(agent, buildPrompt(agent, partner), settings);
    const msg: AgentMessage = {
      id: generateId(),
      agent: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      content: result.content,
      timestamp: Date.now(),
      stage: 'response',
      provider: result.provider,
      model: result.model,
    };
    onMessage(msg);
    return result.content;
  };

  const [response1, response2] = await Promise.all([
    makeRequest(agent1, agent2),
    makeRequest(agent2, agent1),
  ]);

  return { response1, response2 };
}

/**
 * Stage 2: Peer ranking — each agent evaluates the other's response
 */
async function stage2PeerRanking(
  topic: string,
  agent1: AgentDefinition,
  agent2: AgentDefinition,
  response1: string,
  response2: string,
  onMessage: (msg: AgentMessage) => void,
  settings?: CouncilSettings
): Promise<{ rank1: string; rank2: string }> {
  const rankPrompt = (evaluator: AgentDefinition, other: AgentDefinition, otherResponse: string) =>
    `${evaluator.systemPrompt}\n\nYou just discussed: "${topic}"\n\n${other.name} said: "${otherResponse}"\n\nBriefly acknowledge their key point, rate it 1-10 for insight, and share what you'd add or challenge. Under 80 words.`;

  const [result1, result2] = await Promise.all([
    callAgent(agent1, rankPrompt(agent1, agent2, response2), settings),
    callAgent(agent2, rankPrompt(agent2, agent1, response1), settings),
  ]);

  onMessage({
    id: generateId(),
    agent: agent1.id,
    agentName: agent1.name,
    agentColor: agent1.color,
    content: result1.content,
    timestamp: Date.now(),
    stage: 'ranking',
    provider: result1.provider,
    model: result1.model,
  });

  onMessage({
    id: generateId(),
    agent: agent2.id,
    agentName: agent2.name,
    agentColor: agent2.color,
    content: result2.content,
    timestamp: Date.now(),
    stage: 'ranking',
    provider: result2.provider,
    model: result2.model,
  });

  return { rank1: result1.content, rank2: result2.content };
}

/**
 * Stage 3: Council synthesis — combine both perspectives
 */
async function stage3Synthesis(
  topic: string,
  agent1: AgentDefinition,
  agent2: AgentDefinition,
  response1: string,
  response2: string,
  rank1: string,
  rank2: string,
  onMessage: (msg: AgentMessage) => void,
  settings?: CouncilSettings
): Promise<void> {
  const synthesisPrompt = `You are the Council Moderator synthesizing a discussion between ${agent1.name} (${agent1.role}) and ${agent2.name} (${agent2.role}).

Topic: "${topic}"

${agent1.name}'s position: "${response1}"
${agent2.name}'s position: "${response2}"

${agent1.name}'s evaluation: "${rank1}"
${agent2.name}'s evaluation: "${rank2}"

Synthesize into a clear, actionable conclusion that honors both perspectives. Highlight key agreements and productive tensions. Under 120 words.`;

  const result = await callAgent(AGENTS.marco, synthesisPrompt, {
    ...settings,
    defaultProvider: settings?.defaultProvider,
  });

  onMessage({
    id: generateId(),
    agent: 'council',
    agentName: 'Council',
    agentColor: '#d4af37',
    content: result.content,
    timestamp: Date.now(),
    stage: 'synthesis',
    provider: result.provider,
    model: result.model,
  });
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
  agentIds: { agent1Id: string; agent2Id: string } = { agent1Id: 'marco', agent2Id: 'luna' },
  settings?: CouncilSettings
): Promise<void> {
  const agent1 = getAgent(agentIds.agent1Id) ?? AGENTS.marco;
  const agent2 = getAgent(agentIds.agent2Id) ?? AGENTS.luna;

  onStageChange('stage1');
  const { response1, response2 } = await stage1ParallelResponses(
    topic, mode, history, agent1, agent2, onMessage, settings
  );

  onStageChange('stage2');
  const { rank1, rank2 } = await stage2PeerRanking(
    topic, agent1, agent2, response1, response2, onMessage, settings
  );

  onStageChange('stage3');
  await stage3Synthesis(
    topic, agent1, agent2, response1, response2, rank1, rank2, onMessage, settings
  );

  onStageChange('idle');
}
