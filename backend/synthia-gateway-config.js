/**
 * Synthia-Gateway Configuration & Bridge
 * Connects AI agents to LLM subscriptions with BYOK support
 */

const path = require('path');

const GATEWAY_CONFIG = {
  // Gateway server
  port: process.env.SYNTHIA_GATEWAY_PORT || 3000,
  host: process.env.SYNTHIA_GATEWAY_HOST || 'localhost',

  // Authentication mode: 'passthrough' (caller provides key) or 'gateway-key' (server manages)
  authMode: process.env.SYNTHIA_AUTH_MODE || 'passthrough',
  gatewayKey: process.env.SYNTHIA_GATEWAY_KEY,

  // Free tier proxy (fcc-server)
  freeProxy: {
    url: process.env.FCC_PROXY_URL || 'http://localhost:8082',
    token: process.env.FCC_PROXY_TOKEN || 'freecc',
    enabled: process.env.ENABLE_FREE_TIER !== 'false',
  },

  // NVIDIA endpoints (free inference)
  nvidia: {
    apiKey: process.env.NVIDIA_API_KEY,
    baseUrl: 'https://api.nvcf.nvidia.com/v2/nvcf/pexec/functions',
    enabled: !!process.env.NVIDIA_API_KEY,
    models: [
      'nvidia/llama2-70b',
      'nvidia/mistral-7b',
      'nvidia/nemotron-70b',
    ],
  },

  // Provider keys (gateway-key mode)
  providers: {
    openai: process.env.OPENAI_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    groq: process.env.GROQ_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    togetherAi: process.env.TOGETHER_API_KEY,
    ollama: {
      url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      enabled: process.env.OLLAMA_ENABLED === 'true',
    },
  },

  // Custom base URLs for self-hosted endpoints
  baseUrls: {
    openai: process.env.OPENAI_BASE_URL,
    anthropic: process.env.ANTHROPIC_BASE_URL,
    groq: process.env.GROQ_BASE_URL,
    mistral: process.env.MISTRAL_BASE_URL,
  },

  // Routing rules: which models go to which provider
  routing: {
    'gpt-': 'openai',
    'o1': 'openai',
    'o3': 'openai',
    'claude-': 'anthropic',
    'llama': 'groq',
    'gemma': 'groq',
    'mistral-': 'mistral',
    'mixtral-': 'mistral',
    'codestral-': 'mistral',
    'nvidia/': 'nvidia',
  },
};

/**
 * Detect provider from model name or X-Provider header
 */
function detectProvider(model, overrideHeader) {
  if (overrideHeader) return overrideHeader;

  for (const [prefix, provider] of Object.entries(GATEWAY_CONFIG.routing)) {
    if (model.startsWith(prefix)) return provider;
  }

  return 'passthrough'; // unknown — pass through caller's auth
}

/**
 * Build OpenAI-compatible client for detected provider
 */
function buildClientConfig(model, provider, callerKey) {
  const config = {
    model,
    headers: {},
  };

  switch (provider) {
    case 'openai':
      config.baseURL = GATEWAY_CONFIG.baseUrls.openai || 'https://api.openai.com/v1';
      config.apiKey = GATEWAY_CONFIG.providers.openai || callerKey;
      break;

    case 'anthropic':
      config.baseURL = GATEWAY_CONFIG.baseUrls.anthropic || 'https://api.anthropic.com';
      config.apiKey = GATEWAY_CONFIG.providers.anthropic || callerKey;
      config.headers['x-api-key'] = config.apiKey;
      config.headers['anthropic-version'] = '2023-06-01';
      break;

    case 'groq':
      config.baseURL = GATEWAY_CONFIG.baseUrls.groq || 'https://api.groq.com/openai/v1';
      config.apiKey = GATEWAY_CONFIG.providers.groq || callerKey;
      break;

    case 'mistral':
      config.baseURL = GATEWAY_CONFIG.baseUrls.mistral || 'https://api.mistral.ai/v1';
      config.apiKey = GATEWAY_CONFIG.providers.mistral || callerKey;
      break;

    case 'nvidia':
      config.baseURL = GATEWAY_CONFIG.nvidia.baseUrl;
      config.apiKey = GATEWAY_CONFIG.nvidia.apiKey || callerKey;
      break;

    case 'passthrough':
      // Caller provides everything
      config.apiKey = callerKey;
      break;

    default:
      throw new Error(`Unknown provider: ${provider}`);
  }

  return config;
}

/**
 * Free tier fallback routing
 * If BYOK fails or key is invalid, try free NVIDIA or fcc-server
 */
function getFreeierFallback(model) {
  // If it's a free NVIDIA model
  if (GATEWAY_CONFIG.nvidia.enabled && model.startsWith('nvidia/')) {
    return {
      provider: 'nvidia',
      baseURL: GATEWAY_CONFIG.nvidia.baseUrl,
      apiKey: GATEWAY_CONFIG.nvidia.apiKey,
    };
  }

  // Fallback to free proxy (fcc-server) if enabled
  if (GATEWAY_CONFIG.freeProxy.enabled) {
    return {
      provider: 'fcc-free-proxy',
      baseURL: `${GATEWAY_CONFIG.freeProxy.url}/v1`,
      apiKey: GATEWAY_CONFIG.freeProxy.token,
      headers: {
        'x-api-key': GATEWAY_CONFIG.freeProxy.token,
        'anthropic-version': '2023-06-01',
      },
    };
  }

  return null;
}

/**
 * Validate gateway authentication
 */
function validateAuth(req) {
  if (GATEWAY_CONFIG.authMode === 'passthrough') {
    // Caller must provide Authorization header
    const auth = req.headers.authorization;
    if (!auth) {
      throw new Error('Missing Authorization header in passthrough mode');
    }
    return auth.replace(/^Bearer\s+/, '');
  }

  if (GATEWAY_CONFIG.authMode === 'gateway-key') {
    // Validate against gateway key
    const auth = req.headers.authorization || req.headers['x-api-key'];
    if (auth !== `Bearer ${GATEWAY_CONFIG.gatewayKey}`) {
      throw new Error('Invalid gateway key');
    }
    return null; // Use server-side keys
  }

  throw new Error('Invalid auth mode');
}

module.exports = {
  GATEWAY_CONFIG,
  detectProvider,
  buildClientConfig,
  getFreeierFallback,
  validateAuth,
};
