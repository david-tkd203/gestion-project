import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

function NeuralNetwork({ color = '#0d9488', count = 150 }: { color?: string; count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const { pointer } = useThree();

  const { positions, linePositions } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
    const lines: number[] = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = pos[i * 3] - pos[j * 3];
        const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
        const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < 15) {
          lines.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2],
                     pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]);
        }
      }
    }
    return { positions: pos, linePositions: lines };
  }, [count]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001;
      groupRef.current.rotation.x += 0.0003;
      groupRef.current.position.x += (pointer.x * 0.02 - groupRef.current.position.x) * 0.02;
      groupRef.current.position.y += (pointer.y * 0.02 - groupRef.current.position.y) * 0.02;
    }
  });

  const c = new THREE.Color(color);
  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial color={c} size={0.08} transparent opacity={0.3} sizeAttenuation />
      </points>
      {linePositions.length > 0 && (
        <lineSegments>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[new Float32Array(linePositions), 3]} />
          </bufferGeometry>
          <lineBasicMaterial color={c} transparent opacity={0.06} />
        </lineSegments>
      )}
    </group>
  );
}

export default function ThreeBackground({ color = '#0d9488' }: { color?: string }) {
  const reduced = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 2, 2);
  const count = reduced || dpr < 2 ? 80 : 150;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.6 }}>
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }} dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
        <NeuralNetwork color={color} count={count} />
      </Canvas>
    </div>
  );
}
