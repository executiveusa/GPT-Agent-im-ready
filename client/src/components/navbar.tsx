'use client';

import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { LanguageToggle } from './language-toggle';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/', label: t('nav.home') },
    { href: '/council', label: t('nav.council') },
    { href: '/#viewing-room', label: t('nav.viewingRoom') },
    { href: '/#about', label: t('nav.about') },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-violet-900/20 bg-surface-950/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 rounded-lg bg-coral-500/20 border border-coral-500/30 flex items-center justify-center">
            <span className="text-coral-400 font-display text-sm font-bold">IR</span>
          </div>
          <span className="font-display text-lg font-semibold text-violet-400 tracking-tight">
            I&apos;m Ready
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[#9b8fb8] hover:text-[#ede9f5] transition-colors duration-150 font-body"
            >
              {link.label}
            </Link>
          ))}
          <LanguageToggle />
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-[#9b8fb8] hover:text-[#ede9f5]"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden mt-4 pb-4 border-t border-violet-900/20 pt-4 space-y-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block text-sm text-[#9b8fb8] hover:text-[#ede9f5] transition-colors duration-150 font-body px-2 py-1"
            >
              {link.label}
            </Link>
          ))}
          <div className="px-2 pt-2">
            <LanguageToggle />
          </div>
        </div>
      )}
    </nav>
  );
}
