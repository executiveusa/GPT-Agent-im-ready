import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: 'Only http/https URLs allowed' }, { status: 400 });
    }

    const res = await fetch(parsedUrl.toString(), {
      headers: {
        'User-Agent': 'PiAgentBrowserHarness/1.0 (+https://github.com/executiveusa/GPT-Agent-im-ready)',
        Accept: 'text/html,text/plain,application/json',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 }
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    const rawText = await res.text();

    // Strip HTML tags for a clean text extract
    const cleaned = contentType.includes('html')
      ? rawText
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s{2,}/g, ' ')
          .trim()
          .slice(0, 6000)
      : rawText.slice(0, 6000);

    return NextResponse.json({ url: parsedUrl.toString(), content: cleaned });
  } catch (err) {
    console.error('[/api/browse] error:', err);
    return NextResponse.json({ error: 'Failed to fetch URL' }, { status: 500 });
  }
}
