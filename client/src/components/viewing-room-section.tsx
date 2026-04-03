'use client';

import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/language-context';
import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

// Dynamic import for Three.js (no SSR)
const ViewingRoom = dynamic(
  () => import('./viewing-room').then((mod) => ({ default: mod.ViewingRoom })),
  { ssr: false, loading: () => <ViewingRoomSkeleton /> }
);

function ViewingRoomSkeleton() {
  return (
    <div className="w-full h-[500px] md:h-[600px] rounded-xl bg-surface-900 border border-violet-900/20 flex items-center justify-center">
      <div className="flex gap-1">
        <span className="w-2 h-2 rounded-full bg-violet-400/40 animate-pulse" />
        <span className="w-2 h-2 rounded-full bg-violet-400/40 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 rounded-full bg-violet-400/40 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

export function ViewingRoomSection() {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [speakingAgent, setSpeakingAgent] = useState<'marco' | 'luna' | null>(null);

  // Auto-alternate speaking for demo
  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setSpeakingAgent((prev) => {
        if (prev === 'marco') return 'luna';
        if (prev === 'luna') return null;
        return 'marco';
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section id="viewing-room" ref={ref} className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-12"
        >
          <div className="w-8 h-px bg-coral-500/60 mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#ede9f5] tracking-tight mb-3">
            {t('viewing.title')}
          </h2>
          <p className="text-base text-[#9b8fb8] font-body">
            {t('viewing.enter')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
        >
          {isInView && <ViewingRoom speakingAgent={speakingAgent} />}
        </motion.div>
      </div>
    </section>
  );
}
