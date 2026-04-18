'use client';

import { Navbar } from '@/components/navbar';
import { CouncilChat } from '@/components/council-chat';

export default function CouncilPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] h-screen flex flex-col">
        <CouncilChat />
      </main>
    </>
  );
}
