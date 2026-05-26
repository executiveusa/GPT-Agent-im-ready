'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/language-context';
import { useSettings } from '@/lib/settings-store';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, MessageSquare, Podcast, Lightbulb, Target, Settings, Users, Globe, X } from 'lucide-react';
import { runCouncilRound, type AgentMessage, type CouncilState, type CouncilMode } from '@/lib/council';
import { getAgent, getVisibleAgents, getAllAgents, AGENTS } from '@/lib/agents';
import { AgentOrb } from './agent-orb';
import { FleetGrid } from './fleet-grid';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const MODE_ICONS: Record<CouncilMode, typeof MessageSquare> = {
  debate: MessageSquare,
  podcast: Podcast,
  design: Lightbulb,
  plan: Target,
};

export function CouncilChat() {
  const { t, lang } = useLanguage();
  const settings = useSettings();
  const searchParams = useSearchParams();

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<CouncilState['currentStage']>('idle');
  const [mode, setMode] = useState<CouncilMode>('debate');
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const [browseContext, setBrowseContext] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Resolve active agents from URL params or settings
  const a1Id = searchParams?.get('a1') || settings.agent1Id;
  const a2Id = searchParams?.get('a2') || settings.agent2Id;
  const [agent1Id, setAgent1Id] = useState(a1Id);
  const [agent2Id, setAgent2Id] = useState(a2Id);

  const agent1 = getAgent(agent1Id) ?? AGENTS.marco;
  const agent2 = getAgent(agent2Id) ?? AGENTS.luna;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleBrowse = useCallback(async () => {
    const url = urlInput.trim();
    if (!url || browsing) return;
    setBrowsing(true);
    try {
      const res = await fetch('/api/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.content) {
        setBrowseContext(data.content.slice(0, 2000));
        setUrlInput('');
      }
    } catch {
      // ignore
    } finally {
      setBrowsing(false);
    }
  }, [urlInput, browsing]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const topic = input.trim();
      if (!topic || isProcessing) return;

      const fullTopic = browseContext
        ? `${topic}\n\n[Web context for reference]:\n${browseContext}`
        : topic;

      setInput('');
      setIsProcessing(true);

      try {
        await runCouncilRound(
          fullTopic,
          mode,
          messages,
          (msg) => setMessages((prev) => [...prev, msg]),
          setCurrentStage,
          { agent1Id, agent2Id },
          {
            openaiKey: settings.openaiKey,
            anthropicKey: settings.anthropicKey,
            defaultProvider: settings.defaultProvider,
          }
        );
      } catch (err) {
        console.error('Council error:', err);
      } finally {
        setIsProcessing(false);
        setCurrentStage('idle');
        inputRef.current?.focus();
      }
    },
    [input, isProcessing, mode, messages, agent1Id, agent2Id, settings, browseContext]
  );

  const stageLabel: Record<CouncilState['currentStage'], string> = {
    idle: '',
    stage1: lang === 'es' ? 'Los agentes están respondiendo...' : 'Agents are responding...',
    stage2: lang === 'es' ? 'Evaluando perspectivas...' : 'Evaluating perspectives...',
    stage3: lang === 'es' ? 'Sintetizando conclusión...' : 'Synthesizing conclusion...',
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-72px)] relative">
      {/* Agent Selector Overlay */}
      <AnimatePresence>
        {showAgentSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 bg-surface-950/95 backdrop-blur-sm flex flex-col p-6 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-display text-xl font-semibold text-[#ede9f5]">Select Agents</h3>
                <p className="text-xs text-[#9b8fb8] font-body mt-0.5">Choose two agents for this council session</p>
              </div>
              <button
                onClick={() => setShowAgentSelector(false)}
                className="p-1.5 rounded-lg text-[#9b8fb8] hover:text-[#ede9f5] hover:bg-surface-800/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-body font-medium text-[#9b8fb8] mb-3">Agent 1</p>
                <FleetGrid
                  compact
                  showHidden={settings.showPauli}
                  selectedIds={[agent1Id]}
                  onSelectAgent={(id) => {
                    if (id !== agent2Id) setAgent1Id(id);
                  }}
                />
              </div>
              <div>
                <p className="text-xs font-body font-medium text-[#9b8fb8] mb-3">Agent 2</p>
                <FleetGrid
                  compact
                  showHidden={settings.showPauli}
                  selectedIds={[agent2Id]}
                  onSelectAgent={(id) => {
                    if (id !== agent1Id) setAgent2Id(id);
                  }}
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  settings.setAgents(agent1Id, agent2Id);
                  setShowAgentSelector(false);
                  setMessages([]);
                }}
                className="px-5 py-2 rounded-lg bg-coral-500 text-surface-950 text-sm font-body font-semibold hover:bg-coral-400 transition-colors"
              >
                Start Council
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Council Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-violet-900/20 bg-surface-950">
        {/* Agent pair display */}
        <div className="flex items-center gap-3">
          {settings.sphereVisualization && (
            <>
              <AgentOrb
                agent={agent1}
                speaking={isProcessing && currentStage === 'stage1'}
                size="sm"
              />
              <span className="text-[#9b8fb8]/40 text-xs font-mono">×</span>
              <AgentOrb
                agent={agent2}
                speaking={isProcessing && currentStage === 'stage1'}
                size="sm"
              />
            </>
          )}
          <div className="hidden sm:block">
            <p className="text-xs font-body font-semibold text-[#ede9f5]">
              {agent1.name} × {agent2.name}
            </p>
            <p className="text-[10px] font-mono text-[#9b8fb8]/50">
              {agent1.codename} · {agent2.codename}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowBrowse((v) => !v)}
            className={cn(
              'p-1.5 rounded-lg transition-colors text-[#9b8fb8] hover:text-[#ede9f5] hover:bg-surface-800/60',
              showBrowse && 'text-violet-400 bg-violet-900/20'
            )}
            title="Browser harness — give agents a URL to reference"
          >
            <Globe className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAgentSelector(true)}
            className="p-1.5 rounded-lg text-[#9b8fb8] hover:text-[#ede9f5] hover:bg-surface-800/60 transition-colors"
            title="Change agents"
          >
            <Users className="w-4 h-4" />
          </button>
          <Link
            href="/settings"
            className="p-1.5 rounded-lg text-[#9b8fb8] hover:text-[#ede9f5] hover:bg-surface-800/60 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Browser Harness Bar */}
      <AnimatePresence>
        {showBrowse && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-violet-900/15"
          >
            <div className="flex items-center gap-2 px-6 py-2.5 bg-surface-900/50">
              <Globe className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
                placeholder="https://... — agents will reference this page"
                className="flex-1 bg-transparent text-xs font-mono text-[#ede9f5] placeholder:text-[#9b8fb8]/40 focus:outline-none"
              />
              {browseContext && (
                <span className="text-[10px] font-mono text-emerald-400 shrink-0">✓ loaded</span>
              )}
              <button
                onClick={handleBrowse}
                disabled={browsing || !urlInput.trim()}
                className="text-[10px] font-body px-2 py-1 rounded bg-violet-900/40 text-violet-300 hover:bg-violet-800/40 transition-colors disabled:opacity-40"
              >
                {browsing ? 'Loading...' : 'Fetch'}
              </button>
              {browseContext && (
                <button
                  onClick={() => setBrowseContext('')}
                  className="text-[10px] text-[#9b8fb8]/60 hover:text-[#9b8fb8] transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mode selector */}
      <div className="flex items-center gap-2 px-6 py-2.5 border-b border-violet-900/15">
        {(Object.keys(MODE_ICONS) as CouncilMode[]).map((m) => {
          const Icon = MODE_ICONS[m];
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-body font-medium transition-colors duration-150',
                mode === m
                  ? 'bg-violet-900/40 text-violet-300 border border-violet-700/40'
                  : 'text-[#9b8fb8] hover:text-[#ede9f5] hover:bg-surface-800/40'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(`mode.${m}`)}
            </button>
          );
        })}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            {settings.sphereVisualization && (
              <div className="flex items-center gap-6 mb-8">
                <AgentOrb agent={agent1} size="lg" showName showCodename />
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[#9b8fb8]/30 font-mono text-lg">×</span>
                  <span className="text-[10px] font-mono text-[#9b8fb8]/30">council</span>
                </div>
                <AgentOrb agent={agent2} size="lg" showName showCodename />
              </div>
            )}
            <h2 className="font-display text-2xl font-semibold text-[#ede9f5] mb-2">
              {t('council.title')}
            </h2>
            <p className="text-sm text-[#9b8fb8] max-w-md font-body">
              {lang === 'es'
                ? `Dale un tema a ${agent1.name} y ${agent2.name} para debatir usando el método LLM Council.`
                : `Give ${agent1.name} and ${agent2.name} a topic to discuss using the Pi LLM Council method.`}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isRight = msg.agent === agent2Id;
            const isCouncil = msg.agent === 'council';

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: isRight ? 20 : isCouncil ? 0 : -20, y: isCouncil ? 10 : 0 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                className={cn(
                  'max-w-[85%]',
                  !isRight && !isCouncil && 'mr-auto',
                  isRight && 'ml-auto',
                  isCouncil && 'mx-auto max-w-[90%]'
                )}
              >
                {/* Agent header */}
                <div className={cn('flex items-center gap-2 mb-1', isRight && 'justify-end')}>
                  {!isRight && !isCouncil && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: msg.agentColor }} />
                  )}
                  <span className="text-xs font-body font-medium text-[#9b8fb8]">
                    {isCouncil ? t('council.synthesis') : msg.agentName}
                  </span>
                  {msg.stage === 'ranking' && (
                    <span className="text-[10px] text-violet-500/60 font-mono">eval</span>
                  )}
                  {isRight && (
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: msg.agentColor }} />
                  )}
                </div>

                {/* Message bubble */}
                <div
                  className={cn(
                    'rounded-xl px-4 py-3 text-sm font-body leading-relaxed border',
                    isCouncil
                      ? 'bg-violet-900/20 border-violet-700/30 text-violet-200'
                      : 'bg-surface-800 text-[#ede9f5]'
                  )}
                  style={
                    !isCouncil
                      ? { borderColor: `${msg.agentColor}25` }
                      : {}
                  }
                >
                  {msg.content}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Stage indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-3"
          >
            <div className="flex gap-1">
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: agent1.color }}
              />
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: agent2.color, animationDelay: '0.3s' }}
              />
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
            <span className="text-xs text-[#9b8fb8] font-body">{stageLabel[currentStage]}</span>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="px-6 py-4 border-t border-violet-900/20">
        <div className="flex items-center gap-3 max-w-3xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t('council.placeholder')}
            disabled={isProcessing}
            className="flex-1 bg-surface-800 border border-violet-900/30 rounded-lg px-4 py-2.5 text-sm font-body text-[#ede9f5] placeholder:text-[#9b8fb8]/50 focus:outline-none focus:border-violet-600/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="p-2.5 rounded-lg bg-coral-500 text-surface-950 hover:bg-coral-400 transition-colors duration-150 disabled:opacity-30 disabled:hover:bg-coral-500"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
