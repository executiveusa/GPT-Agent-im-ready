/**
 * Provider Routing Logic — Real Intelligent Provider Resolution
 * Resolves which provider to use based on: selection > available keys > server env > demo-only
 */

export type ApiProvider = 'openai' | 'anthropic' | 'demo';
export type Emotion =
  | 'neutral'
  | 'focused'
  | 'curious'
  | 'confident'
  | 'excited'
  | 'concerned'
  | 'blocked'
  | 'satisfied'
  | 'creative'
  | 'analytical';

export interface ProviderResolutionContext {
  selectedProvider?: ApiProvider;
  browserOpenaiKey?: string;
  browserAnthropicKey?: string;
  demoModeLocked?: boolean;
  allowDemoFallback?: boolean;
  serverEnvDetected?: boolean; // Set by API route based on process.env
}

export interface ProviderResolution {
  provider: ApiProvider;
  keySource: 'server-env' | 'browser-local' | 'none';
  canFallbackToDemo: boolean;
  hasValidKey: boolean;
}

/**
 * Resolve the actual provider to use based on selection and available keys.
 * This is the single source of truth for provider resolution.
 *
 * @param context Selection and available keys
 * @returns The provider to use and metadata
 */
export function resolveProvider(context: ProviderResolutionContext): ProviderResolution {
  const { selectedProvider, browserOpenaiKey, browserAnthropicKey, demoModeLocked, serverEnvDetected } = context;

  // If demo is explicitly locked, use demo
  if (demoModeLocked) {
    return {
      provider: 'demo',
      keySource: 'none',
      canFallbackToDemo: false,
      hasValidKey: false,
    };
  }

  // If selected provider is demo, use demo
  if (selectedProvider === 'demo') {
    return {
      provider: 'demo',
      keySource: 'none',
      canFallbackToDemo: false,
      hasValidKey: false,
    };
  }

  // If selected Anthropic and we have browser key, use it
  if (selectedProvider === 'anthropic' && browserAnthropicKey) {
    return {
      provider: 'anthropic',
      keySource: 'browser-local',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  // If selected OpenAI and we have browser key, use it
  if (selectedProvider === 'openai' && browserOpenaiKey) {
    return {
      provider: 'openai',
      keySource: 'browser-local',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  // If server env is detected (set by API route), we can use the provider
  if (selectedProvider === 'openai' && serverEnvDetected) {
    return {
      provider: 'openai',
      keySource: 'server-env',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  if (selectedProvider === 'anthropic' && serverEnvDetected) {
    return {
      provider: 'anthropic',
      keySource: 'server-env',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  // If no selection, try browser keys in priority order
  if (browserOpenaiKey) {
    return {
      provider: 'openai',
      keySource: 'browser-local',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  if (browserAnthropicKey) {
    return {
      provider: 'anthropic',
      keySource: 'browser-local',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  // If server env is detected but no selection, prefer openai
  if (serverEnvDetected) {
    return {
      provider: 'openai',
      keySource: 'server-env',
      canFallbackToDemo: true,
      hasValidKey: true,
    };
  }

  // Last resort: demo only
  return {
    provider: 'demo',
    keySource: 'none',
    canFallbackToDemo: false,
    hasValidKey: false,
  };
}

/**
 * Check if we can potentially use a provider (for health status display)
 */
export function canUseProvider(provider: ApiProvider, context: ProviderResolutionContext): boolean {
  if (provider === 'demo') return true;

  const { browserOpenaiKey, browserAnthropicKey, serverEnvDetected } = context;

  if (provider === 'openai') {
    return !!(browserOpenaiKey || serverEnvDetected);
  }

  if (provider === 'anthropic') {
    return !!(browserAnthropicKey || serverEnvDetected);
  }

  return false;
}

/**
 * Format a provider name for display
 */
export function formatProvider(provider: ApiProvider): string {
  const map: Record<ApiProvider, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    demo: 'Demo',
  };
  return map[provider];
}

/**
 * Validate an API key format (basic sanity check)
 */
export function isValidApiKeyFormat(key: string, provider: ApiProvider): boolean {
  if (!key || typeof key !== 'string') return false;

  if (provider === 'openai') {
    // OpenAI keys start with 'sk-' and are typically 48+ chars
    return /^sk-[A-Za-z0-9_\-]{20,}$/.test(key);
  }

  if (provider === 'anthropic') {
    // Anthropic keys are typically 'sk-ant-' or similar
    return key.length > 10;
  }

  return false;
}
