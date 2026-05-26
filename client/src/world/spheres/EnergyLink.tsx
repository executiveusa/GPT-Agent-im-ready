'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SphereEdge, SphereNode } from './SphereCouncilCanvas';

interface EnergyLinkProps {
  edge: SphereEdge;
  spheres: SphereNode[];
  intensity: number;
}

export function EnergyLink({ edge, spheres, intensity }: EnergyLinkProps) {
  const lineRef = useRef<THREE.Line>(null);

  const fromSphere = spheres.find((s) => s.id === edge.from);
  const toSphere = spheres.find((s) => s.id === edge.to);

  if (!fromSphere || !toSphere) return null;

  useFrame((state) => {
    if (!lineRef.current) return;

    const t = state.clock.getElapsedTime();

    // Animate line opacity based on intensity
    const material = lineRef.current.material as THREE.LineBasicMaterial;
    const baseOpacity = intensity * 0.7;
    const pulse = Math.sin(t * 3) * 0.2;
    material.opacity = Math.max(0.1, baseOpacity + pulse);
  });

  // Create curved line between spheres
  const points = [
    new THREE.Vector3(...fromSphere.position),
    new THREE.Vector3(...toSphere.position),
  ];

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={fromSphere.glowColor} transparent opacity={intensity} linewidth={2} />
    </line>
  );
}
