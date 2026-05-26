import { describe, it, expect } from 'vitest';
import { resolveProvider, canUseProvider, isValidApiKeyFormat } from './provider-routing';
import type { ProviderResolutionContext } from './provider-routing';

describe('Provider Routing', () => {
  describe('resolveProvider', () => {
    it('returns demo when explicitly selected', () => {
      const context: ProviderResolutionContext = {
        selectedProvider: 'demo',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('demo');
      expect(result.keySource).toBe('none');
    });

    it('returns demo when demo is locked', () => {
      const context: ProviderResolutionContext = {
        selectedProvider: 'openai',
        demoModeLocked: true,
        browserOpenaiKey: 'sk-test-key-123456789012345678901234',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('demo');
      expect(result.hasValidKey).toBe(false);
    });

    it('uses browser OpenAI key when selected and available', () => {
      const context: ProviderResolutionContext = {
        selectedProvider: 'openai',
        browserOpenaiKey: 'sk-test-key-123456789012345678901234',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('openai');
      expect(result.keySource).toBe('browser-local');
      expect(result.hasValidKey).toBe(true);
    });

    it('uses server env OpenAI key when selected and no browser key', () => {
      const context: ProviderResolutionContext = {
        selectedProvider: 'openai',
        serverEnvDetected: true,
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('openai');
      expect(result.keySource).toBe('server-env');
      expect(result.hasValidKey).toBe(true);
    });

    it('falls back to demo when OpenAI selected but no key available', () => {
      const context: ProviderResolutionContext = {
        selectedProvider: 'openai',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('demo');
      expect(result.hasValidKey).toBe(false);
    });

    it('uses browser Anthropic key when selected and available', () => {
      const context: ProviderResolutionContext = {
        selectedProvider: 'anthropic',
        browserAnthropicKey: 'sk-ant-test-key-123456789012345678901234',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('anthropic');
      expect(result.keySource).toBe('browser-local');
      expect(result.hasValidKey).toBe(true);
    });

    it('infers OpenAI from browser key when no selection', () => {
      const context: ProviderResolutionContext = {
        browserOpenaiKey: 'sk-test-key-123456789012345678901234',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('openai');
      expect(result.keySource).toBe('browser-local');
    });

    it('prefers OpenAI over Anthropic when both keys available', () => {
      const context: ProviderResolutionContext = {
        browserOpenaiKey: 'sk-test-key-123456789012345678901234',
        browserAnthropicKey: 'sk-ant-test-key-123456789012345678901234',
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('openai');
    });

    it('infers server env OpenAI when no browser keys', () => {
      const context: ProviderResolutionContext = {
        serverEnvDetected: true,
      };
      const result = resolveProvider(context);
      expect(result.provider).toBe('openai');
      expect(result.keySource).toBe('server-env');
    });
  });

  describe('canUseProvider', () => {
    it('returns true for demo', () => {
      expect(canUseProvider('demo', {})).toBe(true);
    });

    it('returns true for OpenAI with browser key', () => {
      expect(
        canUseProvider('openai', {
          browserOpenaiKey: 'sk-test-key-123456789012345678901234',
        })
      ).toBe(true);
    });

    it('returns true for OpenAI with server env', () => {
      expect(
        canUseProvider('openai', {
          serverEnvDetected: true,
        })
      ).toBe(true);
    });

    it('returns false for OpenAI without keys', () => {
      expect(canUseProvider('openai', {})).toBe(false);
    });

    it('returns true for Anthropic with browser key', () => {
      expect(
        canUseProvider('anthropic', {
          browserAnthropicKey: 'sk-ant-test-key-123456789012345678901234',
        })
      ).toBe(true);
    });
  });

  describe('isValidApiKeyFormat', () => {
    it('accepts valid OpenAI keys', () => {
      expect(isValidApiKeyFormat('sk-12345678901234567890123456789012', 'openai')).toBe(true);
      expect(isValidApiKeyFormat('sk-proj-abcdef1234567890abcdef1234567890', 'openai')).toBe(true);
    });

    it('rejects invalid OpenAI keys', () => {
      expect(isValidApiKeyFormat('invalid-key', 'openai')).toBe(false);
      expect(isValidApiKeyFormat('', 'openai')).toBe(false);
      expect(isValidApiKeyFormat('openai-key-123', 'openai')).toBe(false);
    });

    it('accepts valid Anthropic keys', () => {
      expect(isValidApiKeyFormat('sk-ant-1234567890abcdef', 'anthropic')).toBe(true);
      expect(isValidApiKeyFormat('some-valid-key-string-more-than-10-chars', 'anthropic')).toBe(true);
    });

    it('rejects short Anthropic keys', () => {
      expect(isValidApiKeyFormat('short', 'anthropic')).toBe(false);
      expect(isValidApiKeyFormat('', 'anthropic')).toBe(false);
    });
  });
});
