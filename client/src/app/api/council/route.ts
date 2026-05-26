/**
 * Legacy council API — kept for backward compatibility.
 * New code should use /api/agent instead.
 */
import { NextRequest, NextResponse } from 'next/server';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { prompt, agent } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid prompt' }, { status: 400 });
    }

    const openaiKey = request.headers.get('x-openai-key') || process.env.OPENAI_API_KEY;

    if (!openaiKey) {
      return NextResponse.json({
        content: getDemoResponse(agent, prompt),
        agent,
        model: 'demo',
      });
    }

    const model = agent === 'council' ? 'gpt-4o' : 'gpt-4o-mini';
    const temperature = agent === 'marco' ? 0.6 : agent === 'luna' ? 0.85 : 0.7;

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature,
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        content: getDemoResponse(agent, prompt),
        agent,
        model: 'demo-fallback',
      });
    }

    const data = await response.json();
    return NextResponse.json({
      content: data.choices?.[0]?.message?.content || 'No response.',
      agent,
      model,
    });
  } catch (error) {
    console.error('Council API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getDemoResponse(agent: string, prompt: string): string {
  const topic = prompt.slice(0, 80);
  if (agent === 'marco') {
    return `From an analytical standpoint, "${topic}" presents interesting structural patterns. The key variables here are efficiency, scalability, and measured impact. I'd approach this by mapping the causal chain first, then testing each assumption against available data. Luna, I'm curious — what does your intuition tell you about the human dimension here?`;
  }
  if (agent === 'luna') {
    return `What excites me about "${topic}" is the creative potential beneath the surface. Numbers tell part of the story, but the emotional resonance is what drives real change. I'd start by exploring what people actually feel about this, then design backwards from that experience. Marco, your structured lens would really help ground this — what patterns do you see?`;
  }
  return `Both perspectives bring essential insight. The synthesis: approach with structured experimentation, but measure success through both quantitative metrics and qualitative resonance. This is where true intelligence emerges — at the intersection of logic and empathy.`;
}
