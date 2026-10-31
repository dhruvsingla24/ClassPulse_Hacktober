"use client";
import { Sparkles, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";

export const FONT = "/fonts/jakarta-800.woff";
export const FONT_SEMI = "/fonts/jakarta-600.woff";

/** Sun direction from the visitor's local time (golden hour if outside 6–19h is too dark to enjoy). */
export function sunFromClock(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const night = h < 6 || h > 19.5;
  // map 6..19.5 -> 0..PI across the sky, clamp night to a low dusk sun so the scene stays readable
  const t = night ? 0.12 : (h - 6) / 13.5;
  const ang = t * Math.PI;
  const elev = Math.max(0.12, Math.sin(ang)) * 0.9;
  return { pos: new THREE.Vector3(Math.cos(ang) * 60, elev * 60 + 4, -30 + Math.sin(ang) * 10), night, golden: t < 0.22 || t > 0.78 || night };
}

/* ---------------- Building ---------------- */

export function Building({ doorsOpen }: { doorsOpen: number }) {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  useFrame(() => {
    // glass doors slide apart as doorsOpen goes 0 -> 1
    if (left.current) left.current.position.x = THREE.MathUtils.lerp(left.current.position.x, -0.7 - doorsOpen * 1.35, 0.12);
    if (right.current) right.current.position.x = THREE.MathUtils.lerp(right.current.position.x, 0.7 + doorsOpen * 1.35, 0.12);
  });
  const windows = useMemo(() => {
    const w: [number, number, boolean][] = [];
    for (const y of [4.6, 7.0]) for (let x = -12; x <= 12; x += 2.4) if (Math.abs(x) > 2.2 || y > 5) w.push([x, y, (x * 7 + y * 3) % 5 > 2]);
    return w;
  }, []);
  const wall = "#e9e4da";
  return (
    <group>
      {/* facade pieces leave a gap for the entrance */}
      <mesh position={[-7.85, 4.5, -0.25]} castShadow receiveShadow><boxGeometry args={[12.3, 9, 0.5]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      <mesh position={[7.85, 4.5, -0.25]} castShadow receiveShadow><boxGeometry args={[12.3, 9, 0.5]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      <mesh position={[0, 6.6, -0.25]} castShadow><boxGeometry args={[3.4, 4.8, 0.5]} /><meshStandardMaterial color={wall} roughness={0.85} /></mesh>
      {/* sides, back, roof */}
      <mesh position={[-14, 4.5, -12]} castShadow receiveShadow><boxGeometry args={[0.5, 9, 24]} /><meshStandardMaterial color={wall} /></mesh>
      <mesh position={[14, 4.5, -12]} castShadow receiveShadow><boxGeometry args={[0.5, 9, 24]} /><meshStandardMaterial color={wall} /></mesh>
      <mesh position={[0, 4.5, -24]}><boxGeometry args={[28.5, 9, 0.5]} /><meshStandardMaterial color={wall} /></mesh>
      <mesh position={[0, 9.15, -12]} castShadow><boxGeometry args={[29, 0.3, 24.6]} /><meshStandardMaterial color="#5a6478" roughness={0.6} /></mesh>
      {/* blue accent band and canopy */}
      <mesh position={[0, 9.45, -0.1]}><boxGeometry args={[29, 0.35, 0.8]} /><meshStandardMaterial color="#4a66c4" roughness={0.4} /></mesh>
      <mesh position={[0, 3.55, 1.2]} castShadow><boxGeometry args={[6.4, 0.18, 2.6]} /><meshStandardMaterial color="#3b4a6b" metalness={0.3} roughness={0.4} /></mesh>
      {[-2.9, 2.9].map((x) => (
        <mesh key={x} position={[x, 1.75, 2.3]} castShadow><cylinderGeometry args={[0.1, 0.1, 3.5, 12]} /><meshStandardMaterial color="#3b4a6b" metalness={0.5} /></mesh>
      ))}
      {/* windows */}
      {windows.map(([x, y, lit], i) => (
        <mesh key={i} position={[x, y, 0.02]}>
          <planeGeometry args={[1.5, 1.4]} />
          <meshStandardMaterial color={lit ? "#ffe2a8" : "#8fb0d8"} emissive={lit ? "#ffcf7a" : "#24344f"} emissiveIntensity={lit ? 0.9 : 0.25} metalness={0.2} roughness={0.15} />
        </mesh>
      ))}
      {/* sliding glass doors */}
      <mesh ref={left} position={[-0.7, 1.5, 0.05]}>
        <boxGeometry args={[1.38, 3, 0.06]} />
        <meshPhysicalMaterial color="#bfe0ff" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh ref={right} position={[0.7, 1.5, 0.05]}>
        <boxGeometry args={[1.38, 3, 0.06]} />
        <meshPhysicalMaterial color="#bfe0ff" transparent opacity={0.35} roughness={0.05} metalness={0.1} />
      </mesh>
      {/* warm light spilling from the entrance */}
      <pointLight position={[0, 2.4, -1.5]} color="#ffd9a0" intensity={doorsOpen * 25 + 6} distance={14} />
      {/* lit sign */}
      <group position={[0, 5.4, 0.05]}>
        <mesh><boxGeometry args={[9.4, 1.25, 0.12]} /><meshStandardMaterial color="#1e2638" roughness={0.4} /></mesh>
        <Text font={FONT} fontSize={0.62} position={[0, 0.02, 0.08]} anchorX="center" anchorY="middle" letterSpacing={0.06}>
          CLASSPULSE ACADEMY
          <meshStandardMaterial color="#fff6e0" emissive="#ffd27a" emissiveIntensity={1.6} toneMapped={false} />
        </Text>
      </group>
      {/* steps */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.07 + i * 0.0, 1.0 + (2 - i) * 0.55]} receiveShadow><boxGeometry args={[7 - i * 0.6, 0.14 + i * 0.0, 0.55]} /><meshStandardMaterial color="#cfc8bb" /></mesh>
      ))}
    </group>
  );
}

/* ---------------- Nature ---------------- */

const TREE_SPOTS: [number, number, number][] = [
  [-18, 6, 1.2], [-21, -4, 1.4], [-17, 16, 1], [-24, 10, 1.3], [18, 6, 1.1], [22, -3, 1.4], [17, 17, 1.2], [25, 11, 1.3],
  [-9, 22, 0.9], [9, 23, 1], [-30, 0, 1.6], [30, 2, 1.5], [-28, 20, 1.2], [28, 22, 1.1], [-12, -30, 1.8], [12, -30, 1.8], [0, -32, 2],
];

export function Trees() {
  const group = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    // gentle wind sway, each tree slightly out of phase
    group.current?.children.forEach((t, i) => {
      t.rotation.z = Math.sin(clock.elapsedTime * 0.8 + i) * 0.025;
      t.rotation.x = Math.cos(clock.elapsedTime * 0.6 + i * 1.3) * 0.015;
    });
  });
  return (
    <group ref={group}>
      {TREE_SPOTS.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh position={[0, 1.2, 0]} castShadow><cylinderGeometry args={[0.18, 0.28, 2.4, 8]} /><meshStandardMaterial color="#6b4f3a" roughness={0.9} /></mesh>
          <mesh position={[0, 3.1, 0]} castShadow><icosahedronGeometry args={[1.5, 1]} /><meshStandardMaterial color={i % 3 ? "#5c8f55" : "#6f9e5b"} roughness={0.8} flatShading /></mesh>
          <mesh position={[0.5, 3.9, 0.2]} castShadow><icosahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#79a861" roughness={0.8} flatShading /></mesh>
        </group>
      ))}
    </group>
  );
}

export function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[220, 220]} /><meshStandardMaterial color="#86ad6f" roughness={1} /></mesh>
      {/* plaza and paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 12]} receiveShadow><circleGeometry args={[7, 48]} /><meshStandardMaterial color="#d8d0c2" roughness={0.9} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 22]} receiveShadow><planeGeometry args={[3.4, 26]} /><meshStandardMaterial color="#d2c9ba" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.012, 12]} receiveShadow><planeGeometry args={[2.6, 50]} /><meshStandardMaterial color="#d2c9ba" /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.011, 3.5]} receiveShadow><planeGeometry args={[7, 4]} /><meshStandardMaterial color="#d2c9ba" /></mesh>
    </group>
  );
}

export function Benches() {
  const spots: [number, number, number][] = [[-5.5, 15.5, 0.6], [5.5, 15.5, -0.6], [-9, 9, 1.2], [9, 9, -1.2]];
  return (
    <group>
      {spots.map(([x, z, r], i) => (
        <group key={i} position={[x, 0, z]} rotation={[0, r, 0]}>
          <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[1.8, 0.08, 0.5]} /><meshStandardMaterial color="#9a6b45" /></mesh>
          <mesh position={[0, 0.75, -0.22]} castShadow><boxGeometry args={[1.8, 0.45, 0.06]} /><meshStandardMaterial color="#9a6b45" /></mesh>
          {[-0.75, 0.75].map((lx) => <mesh key={lx} position={[lx, 0.22, 0]}><boxGeometry args={[0.08, 0.45, 0.45]} /><meshStandardMaterial color="#3d4352" /></mesh>)}
        </group>
      ))}
    </group>
  );
}

export function Fountain() {
  const drops = useRef<THREE.Points>(null);
  const N = 260;
  const { positions, velocities } = useMemo(() => {
    const p = new Float32Array(N * 3);
    const v = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      p[i * 3 + 1] = Math.random() * 2;
      const a = Math.random() * Math.PI * 2;
      v[i * 3] = Math.cos(a) * 0.6; v[i * 3 + 1] = 2.6 + Math.random(); v[i * 3 + 2] = Math.sin(a) * 0.6;
    }
    return { positions: p, velocities: v };
  }, []);
  const life = useMemo(() => Float32Array.from({ length: N }, () => Math.random()), []);
  useFrame((_, dt) => {
    const p = drops.current?.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!p) return;
    const d = Math.min(dt, 0.05);
    for (let i = 0; i < N; i++) {
      life[i] += d * 0.9;
      const t = life[i] % 1.2;
      p.array[i * 3] = velocities[i * 3] * t;
      p.array[i * 3 + 1] = 1.25 + velocities[i * 3 + 1] * t - 4.9 * t * t;
      p.array[i * 3 + 2] = velocities[i * 3 + 2] * t;
      if ((p.array[i * 3 + 1] as number) < 0.55) p.array[i * 3 + 1] = 0.55;
    }
    p.needsUpdate = true;
  });
  return (
    <group position={[0, 0, 12]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow><cylinderGeometry args={[2.4, 2.6, 0.6, 40]} /><meshStandardMaterial color="#cfc6b6" /></mesh>
      <mesh position={[0, 0.58, 0]}><cylinderGeometry args={[2.15, 2.15, 0.06, 40]} /><meshStandardMaterial color="#6fb3d6" metalness={0.3} roughness={0.08} transparent opacity={0.85} /></mesh>
      <mesh position={[0, 0.9, 0]} castShadow><cylinderGeometry args={[0.18, 0.3, 0.9, 16]} /><meshStandardMaterial color="#cfc6b6" /></mesh>
      <points ref={drops}>
        <bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry>
        <pointsMaterial color="#cfeeff" size={0.07} transparent opacity={0.85} depthWrite={false} />
      </points>
    </group>
  );
}

export function Flag() {
  const mesh = useRef<THREE.Mesh>(null);
  const base = useRef<Float32Array | null>(null);
  useLayoutEffect(() => {
    const g = mesh.current!.geometry as THREE.PlaneGeometry;
    base.current = Float32Array.from(g.attributes.position.array as Float32Array);
  }, []);
  useFrame(({ clock }) => {
    const g = mesh.current?.geometry as THREE.PlaneGeometry | undefined;
    if (!g || !base.current) return;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = base.current[i * 3];
      const w = (x + 0.9) / 1.8; // 0 at pole, 1 at tip
      p.setZ(i, Math.sin(x * 3.2 - clock.elapsedTime * 4) * 0.16 * w);
    }
    p.needsUpdate = true;
    g.computeVertexNormals();
  });
  return (
    <group position={[-8.5, 0, 7]}>
      <mesh position={[0, 3.5, 0]} castShadow><cylinderGeometry args={[0.06, 0.08, 7, 10]} /><meshStandardMaterial color="#d9dce3" metalness={0.7} roughness={0.3} /></mesh>
      <mesh ref={mesh} position={[0.95, 6.3, 0]} castShadow>
        <planeGeometry args={[1.8, 1.1, 18, 6]} />
        <meshStandardMaterial color="#4a66c4" side={THREE.DoubleSide} roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Clouds() {
  const g = useRef<THREE.Group>(null);
  const clouds = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: -70 + i * 17, y: 24 + (i % 3) * 4, z: -40 - (i % 4) * 12, s: 2 + (i % 3) })), []);
  useFrame((_, dt) => {
    g.current?.children.forEach((c) => {
      c.position.x += dt * 0.8;
      if (c.position.x > 80) c.position.x = -80;
    });
  });
  return (
    <group ref={g}>
      {clouds.map((c, i) => (
        <group key={i} position={[c.x, c.y, c.z]} scale={c.s}>
          {[[0, 0, 0, 1.6], [1.5, -0.2, 0.3, 1.2], [-1.5, -0.3, 0, 1.1], [0.6, 0.6, -0.4, 1.1]].map(([x, y, z, r], k) => (
            <mesh key={k} position={[x, y, z]}><sphereGeometry args={[r, 12, 10]} /><meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.92} /></mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

export function Birds() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    g.current?.children.forEach((b, i) => {
      const a = t * 0.18 + i * 0.7;
      b.position.set(Math.cos(a) * (24 + i * 2), 18 + Math.sin(t + i) * 1.2 + i * 0.4, -10 + Math.sin(a) * (16 + i));
      b.rotation.y = -a;
      const flap = Math.sin(t * 9 + i) * 0.5;
      (b.children[0] as THREE.Mesh).rotation.z = flap;
      (b.children[1] as THREE.Mesh).rotation.z = -flap;
    });
  });
  return (
    <group ref={g}>
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i}>
          <mesh position={[-0.25, 0, 0]}><boxGeometry args={[0.5, 0.03, 0.14]} /><meshStandardMaterial color="#2c3140" /></mesh>
          <mesh position={[0.25, 0, 0]}><boxGeometry args={[0.5, 0.03, 0.14]} /><meshStandardMaterial color="#2c3140" /></mesh>
        </group>
      ))}
    </group>
  );
}

/** Small low-poly students strolling the paths (instanced for performance). */
export function Walkers({ count = 14 }: { count?: number }) {
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => Array.from({ length: count }, (_, i) => ({
    lane: i % 2 ? "z" : "x", offset: (i * 7.3) % 40, speed: 0.6 + ((i * 13) % 7) / 10, side: (i % 3) - 1,
    color: new THREE.Color().setHSL(((i * 47) % 360) / 360, 0.45, 0.55),
  })), [count]);
  const m = useMemo(() => new THREE.Object3D(), []);
  useLayoutEffect(() => {
    data.forEach((d, i) => { body.current?.setColorAt(i, d.color); });
    if (body.current?.instanceColor) body.current.instanceColor.needsUpdate = true;
  }, [data]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    data.forEach((d, i) => {
      const s = ((t * d.speed + d.offset) % 40) - 20;
      const x = d.lane === "x" ? s : d.side * 0.7;
      const z = d.lane === "x" ? 12 + d.side * 0.7 : 12 + s * 0.8 + 6;
      const bob = Math.abs(Math.sin(t * d.speed * 6 + i)) * 0.06;
      m.position.set(x, 0.55 + bob, Math.min(z, 25));
      m.rotation.set(0, d.lane === "x" ? Math.PI / 2 : 0, 0);
      m.updateMatrix();
      body.current?.setMatrixAt(i, m.matrix);
      m.position.y = 1.2 + bob;
      m.updateMatrix();
      head.current?.setMatrixAt(i, m.matrix);
    });
    if (body.current) body.current.instanceMatrix.needsUpdate = true;
    if (head.current) head.current.instanceMatrix.needsUpdate = true;
  });
  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, count]} castShadow><capsuleGeometry args={[0.22, 0.6, 4, 8]} /><meshStandardMaterial /></instancedMesh>
      <instancedMesh ref={head} args={[undefined, undefined, count]} castShadow><sphereGeometry args={[0.2, 12, 10]} /><meshStandardMaterial color="#e2b48f" /></instancedMesh>
    </group>
  );
}

export function Dust({ quality }: { quality: "low" | "medium" | "high" }) {
  if (quality === "low") return null;
  return <Sparkles count={quality === "high" ? 140 : 70} scale={[30, 8, 30]} position={[0, 4, 10]} size={2.2} speed={0.25} opacity={0.5} color="#fff3d1" />;
}
