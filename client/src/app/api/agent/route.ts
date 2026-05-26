import { NextRequest, NextResponse } from 'next/server';
import { AGENTS, getAgent, type AgentDefinition } from '@/lib/agents';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId();

  try {
    const body = await request.json();
    const { prompt, agentId = 'marco', providerOverride, allowDemoFallback = false } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'missing_prompt',
            message: 'Request missing required field: prompt',
          },
          requestId,
        },
        { status: 400 }
      );
    }

    const clientOpenaiKey = request.headers.get('x-openai-key') || '';
    const clientAnthropicKey = request.headers.get('x-anthropic-key') || '';
    const serverOpenaiKey = process.env.OPENAI_API_KEY || '';
    const serverAnthropicKey = process.env.ANTHROPIC_API_KEY || '';

    const openaiKey = clientOpenaiKey || serverOpenaiKey;
    const anthropicKey = clientAnthropicKey || serverAnthropicKey;

    const agent: AgentDefinition | undefined = getAgent(agentId) ?? AGENTS.marco;
    const provider = providerOverride ?? agent.provider;

    // Determine effective provider
    let effectiveProvider: 'openai' | 'anthropic' | 'demo';
    let keySource: 'server-env' | 'browser-local' | 'none' = 'none';

    if (provider === 'demo') {
      effectiveProvider = 'demo';
    } else if (provider === 'anthropic' && anthropicKey) {
      effectiveProvider = 'anthropic';
      keySource = clientAnthropicKey ? 'browser-local' : 'server-env';
    } else if (provider === 'openai' && openaiKey) {
      effectiveProvider = 'openai';
      keySource = clientOpenaiKey ? 'browser-local' : 'server-env';
    } else if (openaiKey) {
      effectiveProvider = 'openai';
      keySource = clientOpenaiKey ? 'browser-local' : 'server-env';
    } else if (anthropicKey) {
      effectiveProvider = 'anthropic';
      keySource = clientAnthropicKey ? 'browser-local' : 'server-env';
    } else {
      effectiveProvider = 'demo';
    }

    // If provider was requested but no key available, return error (unless demo is allowed)
    if (provider !== 'demo' && effectiveProvider === 'demo' && !allowDemoFallback) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            provider: provider,
            status: 401,
            code: 'missing_api_key',
            message: `No valid API key found for provider: ${provider}. Add key in Settings or set server env variable.`,
          },
          requestId,
        },
        { status: 401 }
      );
    }

    // Handle demo mode
    if (effectiveProvider === 'demo') {
      return NextResponse.json({
        ok: true,
        content: getDemoResponse(agentId, prompt),
        agentId,
        model: 'demo',
        provider: 'demo-mode',
        requestId,
      });
    }

    // Call real provider
    if (effectiveProvider === 'anthropic') {
      return callAnthropic({
        prompt,
        systemPrompt: agent.systemPrompt,
        model: agent.model,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        apiKey: anthropicKey,
        agentId,
        requestId,
        allowDemoFallback,
      });
    }

    return callOpenAI({
      prompt,
      systemPrompt: agent.systemPrompt,
      model: agent.model,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      apiKey: openaiKey,
      agentId,
      requestId,
      allowDemoFallback,
    });
  } catch (err) {
    console.error(`[/api/agent] ${requestId} error:`, err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'internal_error',
          message: 'Internal server error. Check logs.',
        },
        requestId,
      },
      { status: 500 }
    );
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
  requestId: string;
  allowDemoFallback: boolean;
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

  const statusText = await res.text();

  if (!res.ok) {
    console.error(`[/api/agent] ${p.requestId} OpenAI error ${res.status}:`, statusText.slice(0, 200));

    // Try to parse error from OpenAI
    let errorCode = 'api_error';
    let errorMessage = 'OpenAI API request failed';

    try {
      const errorData = JSON.parse(statusText);
      if (errorData.error?.code) {
        errorCode = errorData.error.code;
      }
      if (errorData.error?.message) {
        errorMessage = errorData.error.message.slice(0, 200);
      }
    } catch {
      // couldn't parse error
    }

    // If demo fallback is allowed, return demo
    if (p.allowDemoFallback) {
      return NextResponse.json({
        ok: true,
        content: getDemoResponse(p.agentId, p.prompt),
        agentId: p.agentId,
        model: 'demo-fallback',
        provider: 'demo-fallback',
        requestId: p.requestId,
      });
    }

    // Otherwise return error
    return NextResponse.json(
      {
        ok: false,
        error: {
          provider: 'openai',
          status: res.status,
          code: errorCode,
          message: errorMessage,
        },
        requestId: p.requestId,
      },
      { status: res.status }
    );
  }

  const data = JSON.parse(statusText);
  return NextResponse.json({
    ok: true,
    content: data.choices?.[0]?.message?.content ?? 'No response.',
    agentId: p.agentId,
    model: p.model,
    provider: 'openai',
    requestId: p.requestId,
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

  const statusText = await res.text();

  if (!res.ok) {
    console.error(`[/api/agent] ${p.requestId} Anthropic error ${res.status}:`, statusText.slice(0, 200));

    // Try to parse error from Anthropic
    let errorCode = 'api_error';
    let errorMessage = 'Anthropic API request failed';

    try {
      const errorData = JSON.parse(statusText);
      if (errorData.error?.type) {
        errorCode = errorData.error.type;
      }
      if (errorData.error?.message) {
        errorMessage = errorData.error.message.slice(0, 200);
      }
    } catch {
      // couldn't parse error
    }

    // If demo fallback is allowed, return demo
    if (p.allowDemoFallback) {
      return NextResponse.json({
        ok: true,
        content: getDemoResponse(p.agentId, p.prompt),
        agentId: p.agentId,
        model: 'demo-fallback',
        provider: 'demo-fallback',
        requestId: p.requestId,
      });
    }

    // Otherwise return error
    return NextResponse.json(
      {
        ok: false,
        error: {
          provider: 'anthropic',
          status: res.status,
          code: errorCode,
          message: errorMessage,
        },
        requestId: p.requestId,
      },
      { status: res.status }
    );
  }

  const data = JSON.parse(statusText);
  return NextResponse.json({
    ok: true,
    content: data.content?.[0]?.text ?? 'No response.',
    agentId: p.agentId,
    model: p.model,
    provider: 'anthropic',
    requestId: p.requestId,
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
