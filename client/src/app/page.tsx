'use client';

import { Navbar } from '@/components/navbar';
import { HeroIntro } from '@/components/hero-intro';
import { ScrollReveal } from '@/components/scroll-reveal';
import { ViewingRoomSection } from '@/components/viewing-room-section';
import { AboutSection } from '@/components/about-section';

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroIntro />
        <ScrollReveal />
        <ViewingRoomSection />
        <AboutSection />

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-violet-900/15">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-xs text-[#9b8fb8]/50 font-body">
              Kupuri Media™ — LLM Council Method
            </p>
            <p className="text-xs text-[#9b8fb8]/50 font-mono">
              v1.0.0
            </p>
          </div>
        </footer>
      </main>
    </>
  );
}
