'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/language-context';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Mic, Podcast, Lightbulb, Target, MessageSquare } from 'lucide-react';
import {
  runCouncilRound,
  type AgentMessage,
  type CouncilState,
  type CouncilMode,
} from '@/lib/council';
import { cn } from '@/lib/utils';

const MODE_ICONS: Record<CouncilMode, typeof MessageSquare> = {
  debate: MessageSquare,
  podcast: Podcast,
  design: Lightbulb,
  plan: Target,
};

export function CouncilChat() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState<CouncilState['currentStage']>('idle');
  const [mode, setMode] = useState<CouncilMode>('debate');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      const topic = input.trim();
      if (!topic || isProcessing) return;

      setInput('');
      setIsProcessing(true);

      try {
        await runCouncilRound(
          topic,
          mode,
          messages,
          (msg) => setMessages((prev) => [...prev, msg]),
          setCurrentStage,
        );
      } catch (err) {
        console.error('Council error:', err);
      } finally {
        setIsProcessing(false);
        setCurrentStage('idle');
        inputRef.current?.focus();
      }
    },
    [input, isProcessing, mode, messages]
  );

  const stageLabel = {
    idle: '',
    stage1: lang === 'es' ? 'Los agentes están respondiendo...' : 'Agents are responding...',
    stage2: lang === 'es' ? 'Evaluando perspectivas...' : 'Evaluating perspectives...',
    stage3: lang === 'es' ? 'Sintetizando conclusión...' : 'Synthesizing conclusion...',
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-80px)]">
      {/* Mode selector */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-violet-900/20">
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
          <div className="flex flex-col items-center justify-center h-full text-center py-24">
            <div className="w-16 h-16 rounded-xl bg-surface-800 border border-violet-900/30 flex items-center justify-center mb-6">
              <MessageSquare className="w-7 h-7 text-violet-400/60" />
            </div>
            <h2 className="font-display text-2xl font-semibold text-[#ede9f5] mb-2">
              {t('council.title')}
            </h2>
            <p className="text-sm text-[#9b8fb8] max-w-md font-body">
              {lang === 'es'
                ? 'Dale un tema y observa cómo Marco y Luna razonan juntos usando el método Karpathy de LLM Council.'
                : 'Give a topic and watch Marco and Luna reason together using the Karpathy LLM Council method.'}
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, x: msg.agent === 'marco' ? -20 : msg.agent === 'luna' ? 20 : 0, y: msg.agent === 'council' ? 10 : 0 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className={cn(
                'max-w-[85%]',
                msg.agent === 'marco' && 'mr-auto',
                msg.agent === 'luna' && 'ml-auto',
                msg.agent === 'council' && 'mx-auto max-w-[90%]'
              )}
            >
              {/* Agent header */}
              <div
                className={cn(
                  'flex items-center gap-2 mb-1',
                  msg.agent === 'luna' && 'justify-end'
                )}
              >
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    msg.agent === 'marco' && 'bg-violet-400',
                    msg.agent === 'luna' && 'bg-coral-400',
                    msg.agent === 'council' && 'bg-gold-500'
                  )}
                />
                <span className="text-xs font-body font-medium text-[#9b8fb8]">
                  {msg.agent === 'marco'
                    ? t('agent.male')
                    : msg.agent === 'luna'
                    ? t('agent.female')
                    : t('council.synthesis')}
                </span>
                {msg.stage === 'ranking' && (
                  <span className="text-[10px] text-violet-500/60 font-mono">
                    eval
                  </span>
                )}
              </div>

              {/* Message bubble */}
              <div
                className={cn(
                  'rounded-xl px-4 py-3 text-sm font-body leading-relaxed',
                  msg.agent === 'marco' &&
                    'bg-surface-800 border border-violet-900/30 text-[#ede9f5]',
                  msg.agent === 'luna' &&
                    'bg-surface-800 border border-coral-500/15 text-[#ede9f5]',
                  msg.agent === 'council' &&
                    'bg-violet-900/20 border border-violet-700/30 text-violet-200'
                )}
              >
                {msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Stage indicator */}
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 py-3"
          >
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="w-1.5 h-1.5 rounded-full bg-coral-400 animate-pulse" style={{ animationDelay: '0.3s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" style={{ animationDelay: '0.6s' }} />
            </div>
            <span className="text-xs text-[#9b8fb8] font-body">{stageLabel[currentStage]}</span>
          </motion.div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="px-6 py-4 border-t border-violet-900/20"
      >
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
