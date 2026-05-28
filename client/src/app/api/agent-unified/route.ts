/**
 * Unified Agent Endpoint
 * Routes through free proxy, BYOK gateway, NVIDIA, or direct providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { routeToProvider, llmChat, checkHealth } from '@/lib/llm-router';

export const runtime = 'nodejs';

interface AgentRequest {
  agentId: string;
  prompt: string;
  userKey?: string; // BYOK mode: caller's API key
  model?: string;
  stream?: boolean;
}

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const startTime = Date.now();

  try {
    const body = (await req.json()) as AgentRequest;
    const { agentId, prompt, userKey, model = 'claude-sonnet-4-5', stream = false } = body;

    if (!prompt) {
      return NextResponse.json(
        { ok: false, error: { code: 'MISSING_PROMPT', message: 'prompt required' } },
        { status: 400 }
      );
    }

    // Route through unified system
    const route = routeToProvider(model, undefined, userKey);

    // Check if route is available
    const health = await checkHealth();
    if (!health[route.provider] && route.tier !== 'demo') {
      // Try fallback to demo if primary route unavailable
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'PROVIDER_UNAVAILABLE',
            provider: route.provider,
            message: `${route.provider} is currently unavailable. Please check API keys or try again later.`,
          },
          requestId,
        },
        { status: 503 }
      );
    }

    if (stream) {
      // Streaming response
      return new NextResponse(
        (async function* () {
          try {
            const { llmStream } = await import('@/lib/llm-router');
            for await (const chunk of llmStream(
              [{ role: 'user', content: prompt }],
              model,
              undefined,
              userKey
            )) {
              yield chunk;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            yield `ERROR: ${message}`;
          }
        })(),
        {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Request-ID': requestId,
            'X-Provider': route.provider,
            'X-Model': model,
          },
        }
      );
    } else {
      // Regular response
      const response = await llmChat(
        [{ role: 'user', content: prompt }],
        model,
        undefined,
        userKey
      );

      return NextResponse.json(
        {
          ok: true,
          content: response,
          agentId,
          provider: route.provider,
          tier: route.tier,
          model,
          requestId,
          latencyMs: Date.now() - startTime,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'AGENT_ERROR',
          message,
        },
        requestId,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const health = await checkHealth();
  return NextResponse.json({
    ok: true,
    status: 'operational',
    providers: health,
  });
}
