'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei';
import { useRef, useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import type { AgentDefinition } from '@/lib/agents';
import type { AgentMessage } from '@/lib/council';
import { AuraSphere } from './AuraSphere';
import { EnergyLink } from './EnergyLink';
import { SpeakerHalo } from './SpeakerHalo';

export interface SphereNode {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  glowColor: string;
  baseRadius: number;
  isSpeaking: boolean;
  isThinking: boolean;
}

export interface SphereEdge {
  from: string;
  to: string;
  intensity: number;
}

interface SphereCouncilCanvasProps {
  agents: AgentDefinition[];
  messages: AgentMessage[];
  isProcessing: boolean;
  currentStage?: string;
  reducedMotion?: boolean;
}

function SphereScene({
  agents,
  messages,
  isProcessing,
  currentStage,
  reducedMotion,
}: SphereCouncilCanvasProps) {
  const [spheres, setSpheres] = useState<SphereNode[]>([]);
  const [edges, setEdges] = useState<SphereEdge[]>([]);
  const sceneRef = useRef<THREE.Group>(null);

  // Initialize spheres from agents
  useEffect(() => {
    const initialSpheres: SphereNode[] = agents.map((agent, idx) => ({
      id: agent.id,
      name: agent.name,
      position: agent.position || [Math.cos((idx / agents.length) * Math.PI * 2) * 3, 0, Math.sin((idx / agents.length) * Math.PI * 2) * 3],
      color: agent.color,
      glowColor: agent.glowColor,
      baseRadius: 0.5,
      isSpeaking: false,
      isThinking: false,
    }));
    setSpheres(initialSpheres);
  }, [agents]);

  // Update speaking state based on messages
  useEffect(() => {
    if (!messages.length) {
      setSpheres((prev) =>
        prev.map((s) => ({
          ...s,
          isSpeaking: false,
          isThinking: false,
        }))
      );
      return;
    }

    const lastMessage = messages[messages.length - 1];

    setSpheres((prev) =>
      prev.map((s) => ({
        ...s,
        isSpeaking: s.id === lastMessage.agent && isProcessing,
        isThinking: isProcessing && s.id !== lastMessage.agent,
      }))
    );

    // Create energy links between recent messages
    if (messages.length >= 2) {
      const recentMessages = messages.slice(-4);
      const newEdges: SphereEdge[] = [];

      for (let i = 1; i < recentMessages.length; i++) {
        const from = recentMessages[i - 1].agent;
        const to = recentMessages[i].agent;

        if (from !== to && from !== 'council') {
          const intensity = 0.3 + (i / recentMessages.length) * 0.7;
          newEdges.push({ from, to, intensity });
        }
      }

      setEdges(newEdges);
    }
  }, [messages, isProcessing]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 4, 8]} fov={50} />
      <OrbitControls
        enableZoom={true}
        enablePan={true}
        autoRotate={!isProcessing && messages.length === 0}
        autoRotateSpeed={2}
      />

      <Environment preset="night" />

      <ambientLight intensity={0.6} color="#8b7ae8" />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#fff" />
      <pointLight position={[-10, 5, -10]} intensity={0.3} color="#ec6a5a" />

      {/* Sphere nodes */}
      {spheres.map((sphere) => (
        <AuraSphere key={sphere.id} node={sphere} />
      ))}

      {/* Energy links */}
      {edges.map((edge, idx) => (
        <EnergyLink key={`${edge.from}-${edge.to}-${idx}`} edge={edge} spheres={spheres} intensity={edge.intensity} />
      ))}

      {/* Speaker halo when speaking */}
      {spheres
        .filter((s) => s.isSpeaking)
        .map((sphere) => (
          <SpeakerHalo key={`halo-${sphere.id}`} position={sphere.position} color={sphere.glowColor} reducedMotion={reducedMotion} />
        ))}

      {/* Thinking indicator */}
      {spheres
        .filter((s) => s.isThinking)
        .map((sphere) => (
          <mesh key={`thinking-${sphere.id}`} position={sphere.position}>
            <sphereGeometry args={[sphere.baseRadius * 0.15, 16, 16]} />
            <meshBasicMaterial color={sphere.color} wireframe opacity={0.5} transparent />
          </mesh>
        ))}
    </>
  );
}

export function SphereCouncilCanvas(props: SphereCouncilCanvasProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-surface-950 to-surface-900 relative">
      <Canvas>
        <SphereScene {...props} />
      </Canvas>

      {/* Fallback message */}
      {!props.messages.length && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <p className="text-sm text-muted/60">Ready to begin council...</p>
          </div>
        </div>
      )}
    </div>
  );
}
