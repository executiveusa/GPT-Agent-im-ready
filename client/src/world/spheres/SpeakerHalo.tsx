'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpeakerHaloProps {
  position: [number, number, number];
  color: string;
  reducedMotion?: boolean;
}

export function SpeakerHalo({ position, color, reducedMotion }: SpeakerHaloProps) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ringRef.current) return;

    const t = state.clock.getElapsedTime();

    // Expanding rings
    if (!reducedMotion) {
      const scale = 1 + (Math.sin(t * 4) * 0.5 + 0.5) * 0.3;
      ringRef.current.scale.set(scale, scale, scale);

      const opacity = Math.max(0, 0.8 - (t % 0.5) * 1.6);
      (ringRef.current.material as THREE.MeshBasicMaterial).opacity = opacity;
    }
  });

  return (
    <mesh ref={ringRef} position={position}>
      <torusGeometry args={[0.8, 0.05, 8, 32]} />
      <meshBasicMaterial color={color} transparent opacity={0.6} />
    </mesh>
  );
}
