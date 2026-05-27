import { Navbar } from '@/components/navbar';
import { Suspense } from 'react';
import { CouncilChat } from '@/components/council-chat';
import dynamic from 'next/dynamic';

// Dynamic import of sphere canvas to avoid SSR issues with Three.js
const SphereCouncilCanvasWrapper = dynamic(() => import('@/components/council-sphere-wrapper'), {
  ssr: false,
  loading: () => <div className="bg-surface-900" />,
});

export default function CouncilPage() {
  return (
    <>
      <Navbar />
      <main className="pt-[72px] h-screen flex flex-col">
        <div className="flex flex-1 gap-0 overflow-hidden">
          {/* Chat sidebar */}
          <Suspense>
            <CouncilChat />
          </Suspense>

          {/* Sphere visualization - hidden on mobile, shows on larger screens */}
          <div className="hidden lg:flex flex-1 bg-surface-900 border-l border-violet-900/20">
            <Suspense fallback={<div className="w-full bg-surface-900" />}>
              <SphereCouncilCanvasWrapper />
            </Suspense>
          </div>
        </div>
      </main>
    </>
  );
}
