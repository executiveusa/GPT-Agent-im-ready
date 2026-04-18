import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    const { prompt, agent } = await request.json();

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid prompt' },
        { status: 400 }
      );
    }

    if (!OPENAI_API_KEY) {
      // Fallback: return demo responses when no API key
      return NextResponse.json({
        content: getDemoResponse(agent, prompt),
        agent,
        model: 'demo',
      });
    }

    const model = agent === 'council' ? 'gpt-4o' : 'gpt-4o-mini';

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: agent === 'marco' ? 0.6 : agent === 'luna' ? 0.85 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI API error:', errText);
      return NextResponse.json({
        content: getDemoResponse(agent, prompt),
        agent,
        model: 'demo-fallback',
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || 'No response.';

    return NextResponse.json({ content, agent, model });
  } catch (error) {
    console.error('Council API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
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
  return `Both Marco and Luna bring essential perspectives. Marco's analytical framework provides rigor, while Luna's creative intuition uncovers the human dimensions that data alone misses. The synthesis: approach with structured experimentation, but measure success through both quantitative metrics and qualitative resonance. This is where true intelligence emerges — at the intersection of logic and empathy.`;
}
