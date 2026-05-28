/**
 * Unified LLM Router — Free + BYOK Gateway Support
 * Routes through:
 * 1. Local fcc-server (free tier with Groq/Mistral/OpenRouter)
 * 2. Synthia-gateway BYOK proxy (multi-provider with custom keys)
 * 3. Direct NVIDIA endpoints (free inference)
 * 4. Direct Gemini (if key available)
 */

export type ProviderTier = 'free' | 'byok' | 'nvidia' | 'direct';

export interface RouterConfig {
  gatewayUrl?: string; // synthia-gateway URL
  gatewayKey?: string; // GATEWAY_API_KEY for BYOK mode
  proxyUrl?: string; // fcc-server URL
  proxyToken?: string;
  nvidiaApiKey?: string;
  geminiApiKey?: string;
  enableFreeTier?: boolean;
}

export interface RouteChoice {
  provider: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  tier: ProviderTier;
  headers?: Record<string, string>;
}

const DEFAULT_CONFIG: RouterConfig = {
  proxyUrl: process.env.LLM_PROXY_URL ?? 'http://localhost:8082',
  proxyToken: process.env.LLM_PROXY_TOKEN ?? 'freecc',
  gatewayUrl: process.env.SYNTHIA_GATEWAY_URL ?? 'http://localhost:3000',
  gatewayKey: process.env.SYNTHIA_GATEWAY_KEY,
  nvidiaApiKey: process.env.NVIDIA_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  enableFreeTier: process.env.ENABLE_FREE_TIER !== 'false',
};

/**
 * Smart routing that picks the best provider
 * Priority: User selection → BYOK key available → Free tier available → Direct key
 */
export function routeToProvider(
  model: string,
  config: RouterConfig = DEFAULT_CONFIG,
  userProvidedKey?: string,
): RouteChoice {
  // If user provided a key via BYOK mode, route through synthia-gateway
  if (userProvidedKey && config.gatewayUrl) {
    return {
      provider: 'synthia-gateway',
      baseUrl: `${config.gatewayUrl}/v1`,
      apiKey: userProvidedKey,
      model,
      tier: 'byok',
      headers: {
        'Authorization': `Bearer ${userProvidedKey}`,
      },
    };
  }

  // NVIDIA free tier for supported models
  if (config.enableFreeTier && model.includes('nvidia')) {
    return {
      provider: 'nvidia',
      baseUrl: 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions',
      apiKey: config.nvidiaApiKey,
      model,
      tier: 'nvidia',
      headers: {
        'Authorization': `Bearer ${config.nvidiaApiKey || 'free'}`,
      },
    };
  }

  // Free tier via fcc-server proxy
  if (config.enableFreeTier && config.proxyUrl) {
    return {
      provider: 'free-proxy',
      baseUrl: `${config.proxyUrl}/v1`,
      apiKey: config.proxyToken,
      model,
      tier: 'free',
      headers: {
        'x-api-key': config.proxyToken!,
        'anthropic-version': '2023-06-01',
      },
    };
  }

  // Fallback to direct Gemini if available
  if (model.includes('gemini') && config.geminiApiKey) {
    return {
      provider: 'gemini',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
      apiKey: config.geminiApiKey,
      model,
      tier: 'direct',
    };
  }

  // Default fallback
  return {
    provider: 'demo',
    baseUrl: 'http://localhost:8082/v1',
    apiKey: 'freecc',
    model: 'claude-sonnet-4-5',
    tier: 'free',
  };
}

/**
 * OpenAI-compatible chat completion using smart routing
 */
export async function llmChat(
  messages: Array<{ role: string; content: string }>,
  model: string = 'claude-sonnet-4-5',
  config: RouterConfig = DEFAULT_CONFIG,
  userKey?: string,
) {
  const route = routeToProvider(model, config, userKey);

  const response = await fetch(`${route.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...route.headers,
    },
    body: JSON.stringify({
      model: route.model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

/**
 * Stream version of llmChat
 */
export async function* llmStream(
  messages: Array<{ role: string; content: string }>,
  model: string = 'claude-sonnet-4-5',
  config: RouterConfig = DEFAULT_CONFIG,
  userKey?: string,
) {
  const route = routeToProvider(model, config, userKey);

  const response = await fetch(`${route.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...route.headers,
    },
    body: JSON.stringify({
      model: route.model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM stream failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');

    // Process all complete lines
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));
          const content = data.choices?.[0]?.delta?.content;
          if (content) yield content;
        } catch {
          // Skip malformed JSON
        }
      }
    }

    // Keep incomplete line in buffer
    buffer = lines[lines.length - 1];
  }
}

/**
 * Health check for all routing tiers
 */
export async function checkHealth(
  config: RouterConfig = DEFAULT_CONFIG,
): Promise<Record<string, boolean>> {
  const checks: Record<string, boolean> = {};

  // Check free proxy
  if (config.proxyUrl) {
    try {
      const res = await fetch(`${config.proxyUrl}/v1/models`, {
        headers: { 'x-api-key': config.proxyToken! },
      });
      checks['free-proxy'] = res.ok;
    } catch {
      checks['free-proxy'] = false;
    }
  }

  // Check synthia-gateway
  if (config.gatewayUrl) {
    try {
      const res = await fetch(`${config.gatewayUrl}/health`);
      checks['synthia-gateway'] = res.ok;
    } catch {
      checks['synthia-gateway'] = false;
    }
  }

  // Check NVIDIA
  if (config.nvidiaApiKey) {
    checks['nvidia'] = true; // Assume valid if key exists
  }

  return checks;
}

export const ask = (q: string, model = 'claude-sonnet-4-5') =>
  llmChat([{ role: 'user', content: q }], model);

export const codeReview = (code: string) =>
  llmChat(
    [{ role: 'user', content: `Review this code:\n\`\`\`\n${code}\n\`\`\`` }],
    'claude-haiku-4-5',
  );

export const summarize = (text: string) =>
  llmChat([{ role: 'user', content: `Summarize:\n${text}` }], 'claude-haiku-4-5');

export const analyze = (text: string) =>
  llmChat([{ role: 'user', content: text }], 'claude-opus-4-5');
