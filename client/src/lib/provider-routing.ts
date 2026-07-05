export type ApiProvider = 'demo' | 'openai' | 'anthropic';

export interface ProviderResolutionContext {
  selectedProvider?: ApiProvider;
  browserOpenaiKey?: string;
  browserAnthropicKey?: string;
  serverEnvDetected?: boolean;
  demoModeLocked?: boolean;
}

export interface ProviderResolutionResult {
  provider: ApiProvider;
  keySource: 'browser-local' | 'server-env' | 'none';
  hasValidKey: boolean;
  canFallbackToDemo: boolean;
}

function hasOpenAIKey(key?: string): boolean {
  if (!key) return false;
  return /^sk-(proj-)?[A-Za-z0-9_-]{20,}$/.test(key);
}

function hasAnthropicKey(key?: string): boolean {
  if (!key) return false;
  return /^sk-ant-[A-Za-z0-9_-]{8,}$/.test(key) || key.length >= 20;
}

export function isValidApiKeyFormat(key: string, provider: 'openai' | 'anthropic'): boolean {
  if (provider === 'openai') return hasOpenAIKey(key);
  return hasAnthropicKey(key);
}

export function canUseProvider(provider: ApiProvider, context: ProviderResolutionContext): boolean {
  if (provider === 'demo') return true;

  if (provider === 'openai') {
    return hasOpenAIKey(context.browserOpenaiKey) || !!context.serverEnvDetected;
  }

  if (provider === 'anthropic') {
    return hasAnthropicKey(context.browserAnthropicKey) || !!context.serverEnvDetected;
  }

  return false;
}

export function resolveProvider(context: ProviderResolutionContext): ProviderResolutionResult {
  if (context.demoModeLocked || context.selectedProvider === 'demo') {
    return {
      provider: 'demo',
      keySource: 'none',
      hasValidKey: false,
      canFallbackToDemo: true,
    };
  }

  const selected = context.selectedProvider;

  if (selected === 'openai') {
    if (hasOpenAIKey(context.browserOpenaiKey)) {
      return {
        provider: 'openai',
        keySource: 'browser-local',
        hasValidKey: true,
        canFallbackToDemo: true,
      };
    }

    if (context.serverEnvDetected) {
      return {
        provider: 'openai',
        keySource: 'server-env',
        hasValidKey: true,
        canFallbackToDemo: true,
      };
    }

    return {
      provider: 'demo',
      keySource: 'none',
      hasValidKey: false,
      canFallbackToDemo: true,
    };
  }

  if (selected === 'anthropic') {
    if (hasAnthropicKey(context.browserAnthropicKey)) {
      return {
        provider: 'anthropic',
        keySource: 'browser-local',
        hasValidKey: true,
        canFallbackToDemo: true,
      };
    }

    if (context.serverEnvDetected) {
      return {
        provider: 'anthropic',
        keySource: 'server-env',
        hasValidKey: true,
        canFallbackToDemo: true,
      };
    }

    return {
      provider: 'demo',
      keySource: 'none',
      hasValidKey: false,
      canFallbackToDemo: true,
    };
  }

  if (hasOpenAIKey(context.browserOpenaiKey)) {
    return {
      provider: 'openai',
      keySource: 'browser-local',
      hasValidKey: true,
      canFallbackToDemo: true,
    };
  }

  if (hasAnthropicKey(context.browserAnthropicKey)) {
    return {
      provider: 'anthropic',
      keySource: 'browser-local',
      hasValidKey: true,
      canFallbackToDemo: true,
    };
  }

  if (context.serverEnvDetected) {
    return {
      provider: 'openai',
      keySource: 'server-env',
      hasValidKey: true,
      canFallbackToDemo: true,
    };
  }

  return {
    provider: 'demo',
    keySource: 'none',
    hasValidKey: false,
    canFallbackToDemo: true,
  };
}
