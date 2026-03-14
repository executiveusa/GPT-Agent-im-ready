import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { io } from 'socket.io-client';
import MeetingRoomScene from '../world/scene/MeetingRoom';

const socket = io('http://localhost:8788');

export default function World() {
  const [agents, setAgents] = useState([]);
  const [speakingTurn, setSpeakingTurn] = useState(null);

  useEffect(() => {
    fetch('http://localhost:8788/agent_registry').then((r) => r.json()).then((registry) => {
      const list = Object.entries(registry).map(([id, cfg]) => ({ id, ...cfg }));
      setAgents(list);
    });

    socket.on('conversation_turn', (turn) => setSpeakingTurn(turn));
    return () => socket.off('conversation_turn');
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas>
        <MeetingRoomScene agents={agents} speakingTurn={speakingTurn} />
      </Canvas>
      <div style={{ position: 'absolute', top: 16, left: 16, color: '#fff', background: '#020617cc', padding: 12, borderRadius: 8 }}>
        <strong>Live Meeting World</strong>
        <div>{speakingTurn ? `${speakingTurn.speaker}: ${speakingTurn.text}` : 'Waiting for first turn...'}</div>
      </div>
    </div>
  );
}
