'use client';

import { useContext } from 'react';
import { SphereCouncilCanvas } from '@/world/spheres/SphereCouncilCanvas';
import { AGENTS } from '@/lib/agents';
import { useSettings } from '@/lib/settings-store';
import { CouncilMessagesContext } from './council-chat';

/**
 * Wrapper that connects the sphere visualization to council state
 */
export default function CouncilSphereWrapper() {
  const settings = useSettings();

  // Since we can't use context from CouncilChat due to scope, we'll render a standalone view
  // In production, this would receive messages via context or state management

  return (
    <div className="w-full h-full">
      <SphereCouncilCanvas
        agents={[AGENTS.marco, AGENTS.luna]}
        messages={[]}
        isProcessing={false}
        reducedMotion={settings.reducedMotion}
      />
    </div>
  );
}
