import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ApiProvider } from './provider-routing';

export type { ApiProvider };

export interface ApiHealth {
  openai: 'unknown' | 'ok' | 'error';
  anthropic: 'unknown' | 'ok' | 'error';
  custom: 'unknown' | 'ok' | 'error';
}

interface SettingsState {
  // API Keys
  openaiKey: string;
  anthropicKey: string;

  // Provider Selection
  defaultProvider: ApiProvider;
  demoModeLocked: boolean;

  // Models
  openaiModel: string;
  anthropicModel: string;

  // Custom Provider (future)
  customBaseUrl?: string;
  customApiKey?: string;
  customModel?: string;

  // Agent Selection
  agent1Id: string;
  agent2Id: string;
  mediatorId?: string;

  // UI Settings
  sphereVisualization: boolean;
  voiceEnabled: boolean;
  showPauli: boolean;
  reducedMotion: boolean;

  // Health & Error Tracking
  apiHealth: ApiHealth;
  lastProviderError?: string;
  activeKeySource: 'server-env' | 'browser-local' | 'none';

  // Actions
  setOpenaiKey: (k: string) => void;
  setAnthropicKey: (k: string) => void;
  setDefaultProvider: (p: ApiProvider) => void;
  setDemoModeLocked: (v: boolean) => void;
  setOpenaiModel: (m: string) => void;
  setAnthropicModel: (m: string) => void;
  setAgents: (a1: string, a2: string) => void;
  setMediatorId: (id: string | undefined) => void;
  setSphereVisualization: (v: boolean) => void;
  setVoiceEnabled: (v: boolean) => void;
  setShowPauli: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setApiHealth: (health: ApiHealth) => void;
  setLastProviderError: (error: string | undefined) => void;
  setActiveKeySource: (source: 'server-env' | 'browser-local' | 'none') => void;
}

const ssrStorage = {
  getItem: (_name: string) => null,
  setItem: (_name: string, _value: string) => {},
  removeItem: (_name: string) => {},
};

const defaultHealth: ApiHealth = {
  openai: 'unknown',
  anthropic: 'unknown',
  custom: 'unknown',
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      openaiKey: '',
      anthropicKey: '',
      defaultProvider: 'demo',
      demoModeLocked: false,
      openaiModel: 'gpt-4o-mini',
      anthropicModel: 'claude-sonnet-4-6',
      customBaseUrl: undefined,
      customApiKey: undefined,
      customModel: undefined,
      agent1Id: 'marco',
      agent2Id: 'luna',
      mediatorId: undefined,
      sphereVisualization: true,
      voiceEnabled: false,
      showPauli: false,
      reducedMotion: false,
      apiHealth: defaultHealth,
      lastProviderError: undefined,
      activeKeySource: 'none',

      setOpenaiKey: (k) => set({ openaiKey: k }),
      setAnthropicKey: (k) => set({ anthropicKey: k }),
      setDefaultProvider: (p) => set({ defaultProvider: p }),
      setDemoModeLocked: (v) => set({ demoModeLocked: v }),
      setOpenaiModel: (m) => set({ openaiModel: m }),
      setAnthropicModel: (m) => set({ anthropicModel: m }),
      setAgents: (a1, a2) => set({ agent1Id: a1, agent2Id: a2 }),
      setMediatorId: (id) => set({ mediatorId: id }),
      setSphereVisualization: (v) => set({ sphereVisualization: v }),
      setVoiceEnabled: (v) => set({ voiceEnabled: v }),
      setShowPauli: (v) => set({ showPauli: v }),
      setReducedMotion: (v) => set({ reducedMotion: v }),
      setApiHealth: (health) => set({ apiHealth: health }),
      setLastProviderError: (error) => set({ lastProviderError: error }),
      setActiveKeySource: (source) => set({ activeKeySource: source }),
    }),
    {
      name: 'pi-agent-settings',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ssrStorage
      ),
    }
  )
);
