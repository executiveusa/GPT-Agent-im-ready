import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ApiProvider = 'openai' | 'anthropic' | 'demo';

interface SettingsState {
  openaiKey: string;
  anthropicKey: string;
  defaultProvider: ApiProvider;
  openaiModel: string;
  anthropicModel: string;
  agent1Id: string;
  agent2Id: string;
  sphereVisualization: boolean;
  voiceEnabled: boolean;
  showPauli: boolean;

  setOpenaiKey: (k: string) => void;
  setAnthropicKey: (k: string) => void;
  setDefaultProvider: (p: ApiProvider) => void;
  setOpenaiModel: (m: string) => void;
  setAnthropicModel: (m: string) => void;
  setAgents: (a1: string, a2: string) => void;
  setSphereVisualization: (v: boolean) => void;
  setVoiceEnabled: (v: boolean) => void;
  setShowPauli: (v: boolean) => void;
}

const ssrStorage = {
  getItem: (_name: string) => null,
  setItem: (_name: string, _value: string) => {},
  removeItem: (_name: string) => {},
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      openaiKey: '',
      anthropicKey: '',
      defaultProvider: 'demo',
      openaiModel: 'gpt-4o-mini',
      anthropicModel: 'claude-sonnet-4-6',
      agent1Id: 'marco',
      agent2Id: 'luna',
      sphereVisualization: true,
      voiceEnabled: false,
      showPauli: false,

      setOpenaiKey: (k) => set({ openaiKey: k }),
      setAnthropicKey: (k) => set({ anthropicKey: k }),
      setDefaultProvider: (p) => set({ defaultProvider: p }),
      setOpenaiModel: (m) => set({ openaiModel: m }),
      setAnthropicModel: (m) => set({ anthropicModel: m }),
      setAgents: (a1, a2) => set({ agent1Id: a1, agent2Id: a2 }),
      setSphereVisualization: (v) => set({ sphereVisualization: v }),
      setVoiceEnabled: (v) => set({ voiceEnabled: v }),
      setShowPauli: (v) => set({ showPauli: v }),
    }),
    {
      name: 'pi-agent-settings',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? localStorage : ssrStorage
      ),
    }
  )
);
