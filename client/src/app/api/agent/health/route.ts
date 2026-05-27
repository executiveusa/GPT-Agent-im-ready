import { NextRequest, NextResponse } from 'next/server';

const OPENAI_URL = 'https://api.openai.com/v1/models';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/models';
const ANTHROPIC_VERSION = '2023-06-01';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider, model, baseUrl, testPrompt = 'Say ok.' } = body;

    if (!provider || !model) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Missing provider or model',
        },
        { status: 400 }
      );
    }

    // Get keys from headers or env
    const clientOpenaiKey = request.headers.get('x-openai-key') || '';
    const clientAnthropicKey = request.headers.get('x-anthropic-key') || '';
    const serverOpenaiKey = process.env.OPENAI_API_KEY || '';
    const serverAnthropicKey = process.env.ANTHROPIC_API_KEY || '';

    if (provider === 'openai') {
      return testOpenAI({
        apiKey: clientOpenaiKey || serverOpenaiKey,
        model,
        testPrompt,
        keySource: clientOpenaiKey ? 'browser-local' : serverOpenaiKey ? 'server-env' : 'none',
      });
    }

    if (provider === 'anthropic') {
      return testAnthropic({
        apiKey: clientAnthropicKey || serverAnthropicKey,
        model,
        testPrompt,
        keySource: clientAnthropicKey ? 'browser-local' : serverAnthropicKey ? 'server-env' : 'none',
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: 'Unknown provider',
      },
      { status: 400 }
    );
  } catch (err) {
    console.error('[/api/agent/health] error:', err);
    return NextResponse.json(
      {
        ok: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

async function testOpenAI({
  apiKey,
  model,
  testPrompt,
  keySource,
}: {
  apiKey: string;
  model: string;
  testPrompt: string;
  keySource: 'browser-local' | 'server-env' | 'none';
}) {
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No OpenAI API key provided',
        provider: 'openai',
      },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: 10,
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const message = error.error?.message || 'Request failed';

      return NextResponse.json(
        {
          ok: false,
          error: message.slice(0, 200),
          provider: 'openai',
          model,
          status: res.status,
          keySource,
          latencyMs,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: 'openai',
      model,
      keySource,
      latencyMs,
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Connection failed';

    return NextResponse.json(
      {
        ok: false,
        error: message,
        provider: 'openai',
        model,
        keySource,
        latencyMs,
      },
      { status: 503 }
    );
  }
}

async function testAnthropic({
  apiKey,
  model,
  testPrompt,
  keySource,
}: {
  apiKey: string;
  model: string;
  testPrompt: string;
  keySource: 'browser-local' | 'server-env' | 'none';
}) {
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'No Anthropic API key provided',
        provider: 'anthropic',
      },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: testPrompt }],
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const message = error.error?.message || 'Request failed';

      return NextResponse.json(
        {
          ok: false,
          error: message.slice(0, 200),
          provider: 'anthropic',
          model,
          status: res.status,
          keySource,
          latencyMs,
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      ok: true,
      provider: 'anthropic',
      model,
      keySource,
      latencyMs,
    });
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    const message = err instanceof Error ? err.message : 'Connection failed';

    return NextResponse.json(
      {
        ok: false,
        error: message,
        provider: 'anthropic',
        model,
        keySource,
        latencyMs,
      },
      { status: 503 }
    );
  }
}
