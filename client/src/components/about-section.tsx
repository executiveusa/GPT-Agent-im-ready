'use client';

import { useLanguage } from '@/lib/language-context';
import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Podcast, Brain, Palette, User } from 'lucide-react';

const FEATURE_ICONS = [Podcast, Brain, Palette, User];

export function AboutSection() {
  const { t } = useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  return (
    <section id="about" ref={ref} className="py-32 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className="mb-16"
        >
          <div className="w-8 h-px bg-coral-500/60 mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-semibold text-[#ede9f5] tracking-tight mb-4">
            {t('about.title')}
          </h2>
          <p className="text-lg text-[#9b8fb8] font-body font-light leading-relaxed max-w-2xl">
            {t('about.desc')}
          </p>
        </motion.div>

        {/* Feature list — clean, no cards */}
        <div className="space-y-8">
          {[1, 2, 3, 4].map((i) => {
            const Icon = FEATURE_ICONS[i - 1];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeOut' }}
                className="flex items-start gap-4 group"
              >
                <div className="mt-1 w-8 h-8 rounded-lg bg-surface-800 border border-violet-900/30 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-violet-400/70" />
                </div>
                <p className="text-base text-[#ede9f5]/80 font-body leading-relaxed">
                  {t(`about.features.${i}`)}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
