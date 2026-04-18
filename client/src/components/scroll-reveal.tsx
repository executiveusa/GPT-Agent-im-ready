'use client';

import { useLanguage } from '@/lib/language-context';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function ScrollReveal() {
  const { t } = useLanguage();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start end', 'end start'],
  });

  const line1Opacity = useTransform(scrollYProgress, [0.1, 0.3], [0, 1]);
  const line1Y = useTransform(scrollYProgress, [0.1, 0.3], [60, 0]);
  const line1Blur = useTransform(scrollYProgress, [0.1, 0.25], [12, 0]);

  const line2Opacity = useTransform(scrollYProgress, [0.25, 0.45], [0, 1]);
  const line2Y = useTransform(scrollYProgress, [0.25, 0.45], [60, 0]);
  const line2Blur = useTransform(scrollYProgress, [0.25, 0.4], [12, 0]);

  const dividerWidth = useTransform(scrollYProgress, [0.35, 0.55], [0, 200]);
  const dividerOpacity = useTransform(scrollYProgress, [0.35, 0.55], [0, 0.6]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-[80vh] flex items-center justify-center py-32"
    >
      {/* Subtle vertical line */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-violet-900/20 to-transparent" />

      <div className="text-center px-6">
        {/* Line 1 */}
        <motion.p
          style={{
            opacity: line1Opacity,
            y: line1Y,
            filter: useTransform(line1Blur, (v) => `blur(${v}px)`),
          }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-[#ede9f5] tracking-tight"
        >
          {t('scroll.line1')}
        </motion.p>

        {/* Divider line */}
        <motion.div
          style={{ width: dividerWidth, opacity: dividerOpacity }}
          className="h-px bg-coral-500 mx-auto my-6"
        />

        {/* Line 2 */}
        <motion.p
          style={{
            opacity: line2Opacity,
            y: line2Y,
            filter: useTransform(line2Blur, (v) => `blur(${v}px)`),
          }}
          className="font-display text-4xl md:text-6xl lg:text-7xl font-light italic text-coral-400 tracking-tight"
        >
          {t('scroll.line2')}
        </motion.p>
      </div>
    </section>
  );
}
