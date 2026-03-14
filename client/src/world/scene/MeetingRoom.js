import React from 'react';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import TalkingAvatar from '../avatars/TalkingAvatar';
import { seats } from '../meeting_room/seats';

export default function MeetingRoomScene({ agents, speakingTurn }) {
  const speakerSeat = agents.find((a) => a.id === speakingTurn?.speaker)?.seat ?? 0;
  const camTarget = seats[speakerSeat] || [0, 0, 0];

  return (
    <>
      <color attach="background" args={['#0f172a']} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 6, 2]} intensity={1.2} />
      <PerspectiveCamera makeDefault position={[camTarget[0] + 3.5, 3, camTarget[2] + 3.5]} fov={50} />
      <OrbitControls target={[0, 0.4, 0]} maxDistance={12} minDistance={4} />

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>

      <mesh position={[0, 0.35, 0]}>
        <cylinderGeometry args={[2.6, 2.6, 0.2, 48]} />
        <meshStandardMaterial color="#475569" />
      </mesh>

      {agents.map((agent) => (
        <TalkingAvatar
          key={agent.id}
          agent={agent}
          speakingTurn={speakingTurn}
          position={seats[agent.seat] || [0, 0, 0]}
          lookAt={camTarget}
        />
      ))}
    </>
  );
}
