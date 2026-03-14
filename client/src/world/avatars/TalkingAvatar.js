import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import AvatarLoader from './AvatarLoader';

const mouthMap = {
  mouthOpen: 1,
  mouthWide: 0.6,
  mouthRound: 0.8,
};

export default function TalkingAvatar({ agent, speakingTurn, position, lookAt }) {
  const group = useRef();
  const [mouth, setMouth] = useState(0);

  useEffect(() => {
    if (!speakingTurn || speakingTurn.speaker !== agent.id) return;
    const audio = new Audio(`http://localhost:8788${speakingTurn.audio}`);
    const run = async () => {
      const res = await fetch(`http://localhost:8788${speakingTurn.lipsync}`);
      const timeline = await res.json();
      timeline.forEach((frame) => {
        setTimeout(() => setMouth(mouthMap[frame.mouth] || 0.2), frame.time * 1000);
      });
      audio.onended = () => setMouth(0);
      audio.play();
    };
    run();
  }, [speakingTurn, agent.id]);

  useEffect(() => {
    if (group.current && lookAt) {
      group.current.lookAt(new THREE.Vector3(...lookAt));
    }
  }, [lookAt]);

  const isSpeaking = speakingTurn?.speaker === agent.id;
  const color = isSpeaking ? '#fbbf24' : '#93c5fd';

  return (
    <group ref={group} position={position}>
      {agent.avatar ? (
        <group scale={[0.9, 0.9 + mouth * 0.15, 0.9]}>
          <AvatarLoader url={`http://localhost:8788${agent.avatar}`} />
        </group>
      ) : (
        <mesh>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
      <mesh position={[0, -1.25, 0]}>
        <cylinderGeometry args={[0.28, 0.35, 1.2, 24]} />
        <meshStandardMaterial color={color} emissive={isSpeaking ? '#78350f' : '#000000'} />
      </mesh>
    </group>
  );
}
