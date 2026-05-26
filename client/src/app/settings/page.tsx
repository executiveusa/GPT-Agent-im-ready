'use client';

import { Navbar } from '@/components/navbar';
import { useSettings } from '@/lib/settings-store';
import { getVisibleAgents, getAllAgents } from '@/lib/agents';
import { AgentOrb } from '@/components/agent-orb';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Eye, EyeOff, Save, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const settings = useSettings();
  const [saved, setSaved] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);

  const allAgents = getAllAgents();
  const visibleAgents = getVisibleAgents();

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <>
      <Navbar />
      <main className="pt-[72px] min-h-screen bg-surface-950">
        <div className="max-w-2xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-10"
          >
            <div className="w-8 h-px bg-coral-500/60 mb-5" />
            <h1 className="font-display text-3xl font-semibold text-[#ede9f5] mb-2">
              Platform Settings
            </h1>
            <p className="text-sm text-[#9b8fb8] font-body">
              Configure API providers, agent pairs, and feature flags. Keys are stored locally in your browser.
            </p>
          </motion.div>

          <div className="space-y-8">
            {/* Section: API Configuration */}
            <Section title="API Configuration" index={0}>
              {/* Default Provider */}
              <FieldGroup label="Default Provider">
                <div className="flex gap-2">
                  {(['demo', 'openai', 'anthropic'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => settings.setDefaultProvider(p)}
                      className={cn(
                        'flex-1 py-2 px-3 rounded-lg text-xs font-body font-medium border transition-all',
                        settings.defaultProvider === p
                          ? 'bg-violet-900/40 border-violet-600/50 text-violet-300'
                          : 'border-violet-900/25 text-[#9b8fb8] hover:text-[#ede9f5] hover:border-violet-800/40 bg-surface-900'
                      )}
                    >
                      {p === 'demo' ? 'Demo (no key)' : p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </FieldGroup>

              {/* OpenAI Key */}
              <FieldGroup label="OpenAI API Key">
                <KeyInput
                  value={settings.openaiKey}
                  onChange={settings.setOpenaiKey}
                  placeholder="sk-..."
                  show={showOpenaiKey}
                  onToggleShow={() => setShowOpenaiKey((v) => !v)}
                />
              </FieldGroup>

              {/* OpenAI Model */}
              <FieldGroup label="OpenAI Model">
                <select
                  value={settings.openaiModel}
                  onChange={(e) => settings.setOpenaiModel(e.target.value)}
                  className="w-full bg-surface-800 border border-violet-900/30 rounded-lg px-3 py-2 text-sm font-body text-[#ede9f5] focus:outline-none focus:border-violet-600/50"
                >
                  <option value="gpt-4o">gpt-4o</option>
                  <option value="gpt-4o-mini">gpt-4o-mini</option>
                  <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                </select>
              </FieldGroup>

              {/* Anthropic Key */}
              <FieldGroup label="Anthropic API Key">
                <KeyInput
                  value={settings.anthropicKey}
                  onChange={settings.setAnthropicKey}
                  placeholder="sk-ant-..."
                  show={showAnthropicKey}
                  onToggleShow={() => setShowAnthropicKey((v) => !v)}
                />
              </FieldGroup>

              {/* Anthropic Model */}
              <FieldGroup label="Anthropic Model">
                <select
                  value={settings.anthropicModel}
                  onChange={(e) => settings.setAnthropicModel(e.target.value)}
                  className="w-full bg-surface-800 border border-violet-900/30 rounded-lg px-3 py-2 text-sm font-body text-[#ede9f5] focus:outline-none focus:border-violet-600/50"
                >
                  <option value="claude-opus-4-7">claude-opus-4-7 (most capable)</option>
                  <option value="claude-sonnet-4-6">claude-sonnet-4-6 (recommended)</option>
                  <option value="claude-haiku-4-5-20251001">claude-haiku-4-5 (fast)</option>
                </select>
              </FieldGroup>
            </Section>

            {/* Section: Agent Configuration */}
            <Section title="Default Council Agents" index={1}>
              <p className="text-xs text-[#9b8fb8]/70 font-body mb-4">
                Select which two agents participate in council discussions by default.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <AgentPickerGroup
                  label="Agent 1"
                  agents={visibleAgents}
                  selected={settings.agent1Id}
                  onSelect={(id) => settings.setAgents(id, settings.agent2Id)}
                />
                <AgentPickerGroup
                  label="Agent 2"
                  agents={visibleAgents}
                  selected={settings.agent2Id}
                  onSelect={(id) => settings.setAgents(settings.agent1Id, id)}
                />
              </div>
            </Section>

            {/* Section: Features */}
            <Section title="Feature Flags" index={2}>
              <ToggleRow
                label="3D Sphere Visualization"
                description="Show glowing orb avatars for each agent"
                checked={settings.sphereVisualization}
                onChange={settings.setSphereVisualization}
              />
              <ToggleRow
                label="Show Pauli"
                description="Reveal the Shadow Leader in the fleet and agent selector"
                checked={settings.showPauli}
                onChange={settings.setShowPauli}
              />
              <ToggleRow
                label="Voice Mode"
                description="Real-time voice interactions via SYNTHIA"
                checked={settings.voiceEnabled}
                onChange={settings.setVoiceEnabled}
                badge="Coming Soon"
              />
            </Section>

            {/* Save */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-body font-semibold transition-all duration-200',
                  saved
                    ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-600/40'
                    : 'bg-coral-500 text-surface-950 hover:bg-coral-400'
                )}
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Saved
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ title, children, index }: { title: string; children: React.ReactNode; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.08, duration: 0.4 }}
      className="rounded-xl border border-violet-900/25 bg-surface-900 p-5 space-y-4"
    >
      <h2 className="text-sm font-body font-semibold text-[#ede9f5] border-b border-violet-900/20 pb-3">
        {title}
      </h2>
      {children}
    </motion.div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-body font-medium text-[#9b8fb8]">{label}</label>
      {children}
    </div>
  );
}

function KeyInput({
  value,
  onChange,
  placeholder,
  show,
  onToggleShow,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-surface-800 border border-violet-900/30 rounded-lg px-3 py-2 text-sm font-mono text-[#ede9f5] placeholder:text-[#9b8fb8]/40 focus:outline-none focus:border-violet-600/50 transition-colors"
      />
      <button
        onClick={onToggleShow}
        className="p-2 rounded-lg border border-violet-900/30 text-[#9b8fb8] hover:text-[#ede9f5] hover:border-violet-800/40 transition-colors bg-surface-800"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  badge,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-body text-[#ede9f5]">{label}</span>
          {badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-900/30 text-violet-400 border border-violet-700/30">
              {badge}
            </span>
          )}
        </div>
        <p className="text-xs text-[#9b8fb8]/70 font-body">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-10 h-5 rounded-full transition-all duration-200 border',
          checked
            ? 'bg-violet-600/60 border-violet-500/60'
            : 'bg-surface-800 border-violet-900/30'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200',
            checked ? 'left-[22px]' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

function AgentPickerGroup({
  label,
  agents,
  selected,
  onSelect,
}: {
  label: string;
  agents: ReturnType<typeof getVisibleAgents>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-body font-medium text-[#9b8fb8]">{label}</p>
      <div className="space-y-1.5">
        {agents.map((a) => (
          <button
            key={a.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-all border',
              selected === a.id
                ? 'bg-surface-800 border-opacity-60'
                : 'border-transparent bg-surface-800/40 hover:bg-surface-800'
            )}
            style={selected === a.id ? { borderColor: a.color } : {}}
          >
            <AgentOrb agent={a} size="sm" />
            <div>
              <p className="text-xs font-body font-semibold text-[#ede9f5]">{a.name}</p>
              <p className="text-[10px] font-mono text-[#9b8fb8]/60">{a.codename}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
