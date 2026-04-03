'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float, Text } from '@react-three/drei';
import * as THREE from 'three';

/* ------------------------------------------------------------------
   Stylized humanoid avatar — geometric but clearly human-shaped.
   Uses composed capsules + spheres for head, torso, limbs.
   NOT spheres. Actual humanoid silhouettes.
   ------------------------------------------------------------------ */

function HumanoidAvatar({
  position,
  color,
  accentColor,
  isSpeaking,
  gender,
  label,
}: {
  position: [number, number, number];
  color: string;
  accentColor: string;
  isSpeaking: boolean;
  gender: 'male' | 'female';
  label: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  // Avatar proportions
  const headRadius = 0.22;
  const torsoH = gender === 'male' ? 0.7 : 0.6;
  const torsoW = gender === 'male' ? 0.38 : 0.32;
  const shoulderW = gender === 'male' ? 0.52 : 0.42;
  const hipW = gender === 'male' ? 0.28 : 0.34;

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();

    // Gentle idle sway
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.05;

    // Speaking pulse
    if (pulseRef.current) {
      const scale = isSpeaking ? 1 + Math.sin(t * 4) * 0.15 : 1;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: 0.6,
        metalness: 0.15,
      }),
    [color]
  );

  const accentMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(accentColor),
        roughness: 0.4,
        metalness: 0.3,
        emissive: new THREE.Color(accentColor),
        emissiveIntensity: isSpeaking ? 0.4 : 0.1,
      }),
    [accentColor, isSpeaking]
  );

  return (
    <group ref={groupRef} position={position}>
      {/* Head */}
      <mesh position={[0, torsoH / 2 + headRadius + 0.08, 0]} material={material}>
        <sphereGeometry args={[headRadius, 24, 24]} />
      </mesh>

      {/* Eyes — small accent dots */}
      <mesh position={[-0.07, torsoH / 2 + headRadius + 0.12, headRadius - 0.04]} material={accentMat}>
        <sphereGeometry args={[0.03, 12, 12]} />
      </mesh>
      <mesh position={[0.07, torsoH / 2 + headRadius + 0.12, headRadius - 0.04]} material={accentMat}>
        <sphereGeometry args={[0.03, 12, 12]} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, torsoH / 2 + 0.04, 0]} material={material}>
        <cylinderGeometry args={[0.06, 0.08, 0.12, 12]} />
      </mesh>

      {/* Torso — tapered cylinder */}
      <mesh position={[0, 0, 0]} material={material}>
        <cylinderGeometry args={[hipW, shoulderW, torsoH, 8]} />
      </mesh>

      {/* Shoulders — rounded caps */}
      <mesh position={[-shoulderW - 0.04, torsoH / 2 - 0.08, 0]} material={material}>
        <sphereGeometry args={[0.09, 16, 16]} />
      </mesh>
      <mesh position={[shoulderW + 0.04, torsoH / 2 - 0.08, 0]} material={material}>
        <sphereGeometry args={[0.09, 16, 16]} />
      </mesh>

      {/* Arms */}
      <mesh position={[-shoulderW - 0.04, 0, 0]} rotation={[0, 0, 0.15]} material={material}>
        <capsuleGeometry args={[0.06, 0.5, 8, 12]} />
      </mesh>
      <mesh position={[shoulderW + 0.04, 0, 0]} rotation={[0, 0, -0.15]} material={material}>
        <capsuleGeometry args={[0.06, 0.5, 8, 12]} />
      </mesh>

      {/* Legs */}
      <mesh position={[-0.12, -torsoH / 2 - 0.35, 0]} material={material}>
        <capsuleGeometry args={[0.07, 0.5, 8, 12]} />
      </mesh>
      <mesh position={[0.12, -torsoH / 2 - 0.35, 0]} material={material}>
        <capsuleGeometry args={[0.07, 0.5, 8, 12]} />
      </mesh>

      {/* Speaking pulse ring */}
      <mesh ref={pulseRef} position={[0, torsoH / 2 + headRadius + 0.08, 0]}>
        <ringGeometry args={[0.3, 0.32, 32]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={isSpeaking ? 0.5 : 0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Name label */}
      <Text
        position={[0, -torsoH / 2 - 0.85, 0]}
        fontSize={0.12}
        color="#9b8fb8"
        anchorX="center"
        anchorY="middle"
        font="/fonts/dm-sans-v15-latin-500.woff"
      >
        {label}
      </Text>
    </group>
  );
}

/* ------------------------------------------------------------------
   Environment — the viewing room stage (dark theater, spot-lit)
   ------------------------------------------------------------------ */

function TheaterStage() {
  return (
    <group>
      {/* Floor — circular platform */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} receiveShadow>
        <circleGeometry args={[4, 48]} />
        <meshStandardMaterial color="#150f24" roughness={0.8} metalness={0.1} />
      </mesh>

      {/* Center ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.19, 0]}>
        <ringGeometry args={[1.8, 1.85, 48]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={0.3}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Ambient particles */}
      <Particles count={80} />
    </group>
  );
}

function Particles({ count }: { count: number }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 8;
      positions[i * 3 + 1] = Math.random() * 4 - 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }
    return positions;
  }, [count]);

  const ref = useRef<THREE.Points>(null);

  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.02;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#8b5cf6"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  );
}

/* ------------------------------------------------------------------
   Main ViewingRoom component — exported
   ------------------------------------------------------------------ */

export function ViewingRoom({
  speakingAgent,
}: {
  speakingAgent?: 'marco' | 'luna' | null;
}) {
  return (
    <div className="relative w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden border border-violet-900/20 bg-surface-950">
      <Canvas
        shadows
        camera={{ position: [0, 1.5, 5], fov: 45 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true }}
      >
        {/* Lighting */}
        <ambientLight intensity={0.15} />
        <directionalLight
          position={[3, 5, 3]}
          intensity={0.6}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-2, 3, 0]} color="#8b5cf6" intensity={0.4} />
        <pointLight position={[2, 3, 0]} color="#e87040" intensity={0.4} />

        {/* Stage */}
        <TheaterStage />

        {/* Marco — left side, violet tones */}
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
          <HumanoidAvatar
            position={[-1.5, 0, 0]}
            color="#2e1065"
            accentColor="#8b5cf6"
            isSpeaking={speakingAgent === 'marco'}
            gender="male"
            label="Marco"
          />
        </Float>

        {/* Luna — right side, coral tones */}
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
          <HumanoidAvatar
            position={[1.5, 0, 0]}
            color="#3b1820"
            accentColor="#e87040"
            isSpeaking={speakingAgent === 'luna'}
            gender="female"
            label="Luna"
          />
        </Float>

        <OrbitControls
          enablePan={false}
          enableZoom
          minDistance={3}
          maxDistance={8}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2.2}
        />
      </Canvas>

      {/* Overlay gradient at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-surface-950 to-transparent pointer-events-none" />
    </div>
  );
}
