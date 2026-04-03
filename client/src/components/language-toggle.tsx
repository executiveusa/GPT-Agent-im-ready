'use client';

import { useLanguage } from '@/lib/language-context';
import { Globe } from 'lucide-react';

export function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-800/40 bg-surface-900/60 text-sm font-body text-violet-400 hover:bg-surface-800/80 transition-colors duration-150"
      aria-label={lang === 'es' ? 'Switch to English' : 'Cambiar a Español'}
    >
      <Globe className="w-3.5 h-3.5" />
      <span className="font-medium">{lang === 'es' ? 'EN' : 'ES'}</span>
    </button>
  );
}
