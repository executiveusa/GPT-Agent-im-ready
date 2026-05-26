'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import type { SphereNode } from './SphereCouncilCanvas';

interface AuraSphereProps {
  node: SphereNode;
}

export function AuraSphere({ node }: AuraSphereProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sphereRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const t = state.clock.getElapsedTime();

    // Gentle orbital sway
    if (!node.isSpeaking) {
      groupRef.current.position.y += Math.sin(t * 0.5) * 0.001;
    }

    // Glow intensity based on speaking state
    if (glowRef.current && glowRef.current.material instanceof THREE.Material) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      const baseIntensity = node.isSpeaking ? 1.2 : 0.6;
      const pulse = node.isSpeaking ? Math.sin(t * 6) * 0.4 : 0;
      material.emissiveIntensity = baseIntensity + pulse;
    }

    // Sphere expansion when speaking
    if (sphereRef.current) {
      const targetScale = node.isSpeaking ? 1.15 : 1;
      sphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  const sphereColor = new THREE.Color(node.color);
  const glowColor = new THREE.Color(node.glowColor);

  return (
    <group ref={groupRef} position={node.position}>
      {/* Glow layer */}
      <mesh ref={glowRef} scale={node.baseRadius * 1.3}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={glowColor}
          emissive={glowColor}
          emissiveIntensity={0.6}
          metalness={0}
          roughness={1}
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Main sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[node.baseRadius, 32, 32]} />
        <meshStandardMaterial
          color={sphereColor}
          emissive={sphereColor}
          emissiveIntensity={node.isSpeaking ? 0.4 : 0.1}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {/* Label above sphere */}
      <Text
        position={[0, node.baseRadius + 0.6, 0]}
        fontSize={0.3}
        color="#ede9f5"
        anchorX="center"
        anchorY="bottom"
      >
        {node.name}
      </Text>
    </group>
  );
}
