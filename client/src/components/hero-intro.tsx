'use client';

import { useLanguage } from '@/lib/language-context';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

export function HeroIntro() {
  const { t } = useLanguage();

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background — deep purple radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,#2e1065_0%,#150f24_40%,#0d0815_80%)]" />

      {/* Flower image — positioned bottom-left as the hero anchor */}
      <div className="absolute bottom-0 left-0 w-[60vw] max-w-[700px] h-[70vh] pointer-events-none select-none">
        <Image
          src="/hero-flower.png"
          alt=""
          fill
          className="object-contain object-bottom opacity-90"
          priority
          sizes="(max-width: 768px) 90vw, 60vw"
        />
        {/* Soft fade edges */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0815] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0d0815]/60" />
      </div>

      {/* Subtle particle/noise overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content — right-aligned text */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 w-full">
        <div className="ml-auto max-w-xl text-right">
          {/* Small accent line */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 48 }}
            transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}
            className="h-px bg-coral-500/60 mb-8 ml-auto"
          />

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-[1.1] tracking-tight text-[#ede9f5]"
          >
            {t('hero.title')}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8, ease: 'easeOut' }}
            className="mt-6 text-lg md:text-xl text-[#9b8fb8] font-body font-light leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.6, ease: 'easeOut' }}
            className="mt-10"
          >
            <Link
              href="/council"
              className="inline-flex items-center gap-3 px-6 py-3 rounded-lg bg-coral-500 text-surface-950 font-body font-semibold text-sm hover:bg-coral-400 transition-colors duration-150"
            >
              {t('hero.cta')}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                className="translate-x-0 group-hover:translate-x-1 transition-transform"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </motion.div>

          {/* Agent preview badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5, duration: 1 }}
            className="mt-12 flex justify-end gap-4"
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-800/60 border border-violet-900/30">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-xs font-body text-[#9b8fb8]">Marco</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-800/60 border border-coral-500/20">
              <div className="w-2 h-2 rounded-full bg-coral-400" />
              <span className="text-xs font-body text-[#9b8fb8]">Luna</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-xs text-[#9b8fb8]/60 font-body tracking-wider uppercase">
          scroll
        </span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="w-px h-8 bg-gradient-to-b from-violet-500/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
