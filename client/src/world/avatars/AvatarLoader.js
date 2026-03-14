import React from 'react';
import { useGLTF } from '@react-three/drei';

export default function AvatarLoader({ url, children }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene.clone()}>{children}</primitive>;
}
