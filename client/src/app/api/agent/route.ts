import { NextRequest, NextResponse } from 'next/server';
import { AGENTS, getAgent, type AgentDefinition } from '@/lib/agents';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      agentId = 'marco',
      providerOverride,
      modelOverride,
    } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const clientOpenaiKey = request.headers.get('x-openai-key') || '';
    const clientAnthropicKey = request.headers.get('x-anthropic-key') || '';
    const openaiKey = clientOpenaiKey || process.env.OPENAI_API_KEY || '';
    const anthropicKey = clientAnthropicKey || process.env.ANTHROPIC_API_KEY || '';

    const agent: AgentDefinition | undefined = getAgent(agentId) ?? AGENTS.marco;
    const provider = providerOverride ?? agent.provider;
    const model = modelOverride ?? agent.model;

    const effectiveProvider =
      provider === 'anthropic' && anthropicKey
        ? 'anthropic'
        : provider === 'openai' && openaiKey
        ? 'openai'
        : openaiKey
        ? 'openai'
        : anthropicKey
        ? 'anthropic'
        : 'demo';

    if (effectiveProvider === 'demo') {
      return NextResponse.json({
        content: getDemoResponse(agentId, prompt),
        agentId,
        model: 'demo',
        provider: 'demo',
      });
    }

    if (effectiveProvider === 'anthropic') {
      return callAnthropic({
        prompt,
        systemPrompt: agent.systemPrompt,
        model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        apiKey: anthropicKey,
        agentId,
      });
    }

    return callOpenAI({
      prompt,
      systemPrompt: agent.systemPrompt,
      model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      apiKey: openaiKey,
      agentId,
    });
  } catch (err) {
    console.error('[/api/agent] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

interface CallParams {
  prompt: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  apiKey: string;
  agentId: string;
}

async function callOpenAI(p: CallParams): Promise<NextResponse> {
  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${p.apiKey}`,
    },
    body: JSON.stringify({
      model: p.model,
      messages: [
        { role: 'system', content: p.systemPrompt },
        { role: 'user', content: p.prompt },
      ],
      max_tokens: p.maxTokens,
      temperature: p.temperature,
    }),
  });

  if (!res.ok) {
    console.error('[/api/agent] OpenAI error:', await res.text());
    return NextResponse.json({
      content: getDemoResponse(p.agentId, p.prompt),
      agentId: p.agentId,
      model: 'demo-fallback',
      provider: 'demo',
    });
  }

  const data = await res.json();
  return NextResponse.json({
    content: data.choices?.[0]?.message?.content ?? 'No response.',
    agentId: p.agentId,
    model: p.model,
    provider: 'openai',
  });
}

async function callAnthropic(p: CallParams): Promise<NextResponse> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': p.apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: p.model,
      max_tokens: p.maxTokens,
      system: p.systemPrompt,
      messages: [{ role: 'user', content: p.prompt }],
      temperature: p.temperature,
    }),
  });

  if (!res.ok) {
    console.error('[/api/agent] Anthropic error:', await res.text());
    return NextResponse.json({
      content: getDemoResponse(p.agentId, p.prompt),
      agentId: p.agentId,
      model: 'demo-fallback',
      provider: 'demo',
    });
  }

  const data = await res.json();
  return NextResponse.json({
    content: data.content?.[0]?.text ?? 'No response.',
    agentId: p.agentId,
    model: p.model,
    provider: 'anthropic',
  });
}

function getDemoResponse(agentId: string, prompt: string): string {
  const topic = prompt.slice(0, 80);

  const demoMap: Record<string, string> = {
    marco: `From an analytical standpoint, "${topic}" presents clear structural patterns. The key variables are efficiency, scalability, and measurable impact. I'd map the causal chain first, then stress-test each node against available data. What's your intuitive read on the human dimension here?`,
    luna: `What excites me about "${topic}" is the creative potential beneath the surface. Numbers tell part of the story, but the emotional texture drives real change. I'd start by asking what people actually feel about this, then design backwards from that experience. What patterns do you see in the structure?`,
    pauli: `Pauli is present. The approach is directionally correct but underweighted on execution risk. Recommend tightening the feedback loop before committing to scale. Pauli recedes.`,
    darya: `The brief has strong bones but the creative strategy is too safe. We need tension and unexpectedness — not just polish. Push the concept further before we touch execution.`,
    devika: `Task decomposed: (1) define success metrics, (2) identify dependencies, (3) assign owners. The critical path runs through metric definition — everything else gates on it.`,
    synthia: `The emotional register of this topic matters as much as the logic. People will remember how this made them feel long after they forget the details. That's our lever.`,
    cynthia: `Risk assessment: moderate. The main exposure is in the edge cases — what happens when the happy path fails? We need a monitoring strategy before we go live.`,
    agent_zero: `Strategic read: this is a coordination problem, not a capability problem. The fleet has the tools. The gap is in the handoff protocol. Recommend a synchronization point at hour 6.`,
  };

  return demoMap[agentId] ?? `Analyzing "${topic}" — the intersection of logic and creativity is where the most durable solutions emerge. Both structural rigor and human intuition are required.`;
}
