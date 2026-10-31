"use client";
import { MeshReflectorMaterial, Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";
import { FONT, FONT_SEMI } from "./exterior";

export type DoorId = "teacher" | "student" | "arcade" | "doubt" | "library" | "exam" | "meeting";

export interface DoorDef {
  id: DoorId;
  label: string;
  sub: string;
  side: -1 | 1 | 0; // -1 left wall, 1 right wall, 0 end wall
  z: number;
  color: string;
  route: string;
}

export const DOORS: DoorDef[] = [
  { id: "teacher", label: "TEACHER'S LOUNGE", sub: "Staff only", side: -1, z: -5.6, color: "#c98a54", route: "/app" },
  { id: "student", label: "STUDENT CLASSROOM", sub: "Class 10A", side: 1, z: -5.6, color: "#4a66c4", route: "/app/classroom" },
  { id: "doubt", label: "DOUBT SOLVING LAB", sub: "Ask anything", side: -1, z: -11.2, color: "#4fa38a", route: "/app/doubts" },
  { id: "library", label: "LIBRARY & NOTES", sub: "Lectures · notes", side: 1, z: -11.2, color: "#b46ab8", route: "/app/library" },
  { id: "exam", label: "EXAMINATION HALL", sub: "Tests · contests", side: -1, z: -16.8, color: "#b85a5a", route: "/app/exam" },
  { id: "meeting", label: "MEETING ROOM", sub: "Live classes", side: 1, z: -16.8, color: "#c9a54a", route: "/app/meetings" },
  { id: "arcade", label: "LEARNING ARCADE", sub: "Enter the portal", side: 0, z: -21.6, color: "#7c5cff", route: "/app/arcade" },
];

export const CORRIDOR_W = 3.2; // half width

/** Where the camera stands to face a door, and the point it looks at. */
export function doorView(d: DoorDef) {
  if (d.side === 0) return { pos: new THREE.Vector3(0, 1.7, d.z + 4.2), look: new THREE.Vector3(0, 1.7, d.z) };
  return { pos: new THREE.Vector3(-d.side * 0.9, 1.7, d.z), look: new THREE.Vector3(d.side * CORRIDOR_W, 1.55, d.z) };
}

function Door({ d, open, onPick, enabled }: { d: DoorDef; open: boolean; onPick: (d: DoorDef) => void; enabled: boolean }) {
  const panel = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshStandardMaterial>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (panel.current) panel.current.rotation.y = THREE.MathUtils.lerp(panel.current.rotation.y, open ? -1.3 : hover ? -0.08 : 0, 0.08);
    if (glow.current) glow.current.emissiveIntensity = THREE.MathUtils.lerp(glow.current.emissiveIntensity, hover || open ? 2.4 : 0.9 + Math.sin(clock.elapsedTime * 2 + d.z) * 0.15, 0.1);
  });
  // left wall doors face +x, right wall doors face -x
  const rotY = d.side === -1 ? Math.PI / 2 : -Math.PI / 2;
  const x = d.side * (CORRIDOR_W - 0.02);
  const events = enabled
    ? {
        onPointerOver: (e: { stopPropagation: () => void }) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; },
        onPointerOut: () => { setHover(false); document.body.style.cursor = ""; },
        onClick: (e: { stopPropagation: () => void }) => { e.stopPropagation(); onPick(d); },
      }
    : {};
  return (
    <group position={[x, 0, d.z]} rotation={[0, rotY, 0]} {...events}>
      {/* frame */}
      <mesh position={[0, 1.3, 0.02]}><boxGeometry args={[1.5, 2.7, 0.08]} /><meshStandardMaterial color="#2a3142" roughness={0.5} /></mesh>
      {/* dark doorway behind the panel */}
      <mesh position={[0, 1.2, 0.03]}><planeGeometry args={[1.25, 2.4]} /><meshStandardMaterial color="#120f0c" emissive={d.color} emissiveIntensity={open ? 0.6 : 0.05} /></mesh>
      {/* hinged panel */}
      <group ref={panel} position={[-0.62, 0, 0.07]}>
        <mesh position={[0.62, 1.2, 0]} castShadow>
          <boxGeometry args={[1.24, 2.38, 0.06]} />
          <meshStandardMaterial color={d.color} roughness={0.45} metalness={0.1} />
        </mesh>
        <mesh position={[0.62, 1.75, 0.035]}><planeGeometry args={[0.7, 0.6]} /><meshStandardMaterial color="#cfe6ff" emissive="#9ec4ff" emissiveIntensity={0.35} transparent opacity={0.8} /></mesh>
        <mesh position={[1.08, 1.15, 0.06]}><sphereGeometry args={[0.05, 12, 10]} /><meshStandardMaterial color="#f2d27a" metalness={0.9} roughness={0.2} /></mesh>
      </group>
      {/* illuminated nameplate */}
      <mesh position={[0, 2.95, 0.06]}><boxGeometry args={[1.9, 0.42, 0.05]} /><meshStandardMaterial ref={glow} color="#11151f" emissive={d.color} emissiveIntensity={1} /></mesh>
      <Text font={FONT} fontSize={0.13} position={[0, 2.98, 0.1]} anchorX="center" anchorY="middle" maxWidth={1.8} color="#ffffff">{d.label}</Text>
      <Text font={FONT_SEMI} fontSize={0.075} position={[0, 2.83, 0.1]} anchorX="center" anchorY="middle" color="#dfe6ff">{d.sub}</Text>
      {hover && <pointLight position={[0, 1.6, 0.8]} intensity={5} distance={3} color={d.color} />}
    </group>
  );
}

function Portal({ d, onPick, enabled, active }: { d: DoorDef; onPick: (d: DoorDef) => void; enabled: boolean; active: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.MeshStandardMaterial>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }, dt) => {
    if (ring.current) ring.current.rotation.z += dt * (hover || active ? 1.6 : 0.5);
    if (inner.current) inner.current.emissiveIntensity = 1.4 + Math.sin(clock.elapsedTime * 3) * 0.4 + (hover ? 1 : 0) + (active ? 2 : 0);
  });
  return (
    <group position={[0, 1.75, d.z + 0.15]}
      onPointerOver={enabled ? (e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; } : undefined}
      onPointerOut={enabled ? () => { setHover(false); document.body.style.cursor = ""; } : undefined}
      onClick={enabled ? (e) => { e.stopPropagation(); onPick(d); } : undefined}>
      <mesh ref={ring}><torusGeometry args={[1.15, 0.12, 16, 64]} /><meshStandardMaterial color="#b9a6ff" emissive="#7c5cff" emissiveIntensity={2.2} toneMapped={false} /></mesh>
      <mesh position={[0, 0, -0.02]}><circleGeometry args={[1.08, 48]} /><meshStandardMaterial ref={inner} color="#2b1f66" emissive="#5a3dff" emissiveIntensity={1.6} transparent opacity={0.92} toneMapped={false} /></mesh>
      <pointLight intensity={14} distance={9} color="#8b6dff" position={[0, 0, 1]} />
      <Text font={FONT} fontSize={0.2} position={[0, 1.55, 0]} anchorX="center" color="#efeaff">LEARNING ARCADE</Text>
    </group>
  );
}

function TrophyCase({ z, side }: { z: number; side: -1 | 1 }) {
  return (
    <group position={[side * (CORRIDOR_W - 0.3), 0, z]}>
      <mesh position={[0, 0.9, 0]}><boxGeometry args={[0.5, 1.8, 1.4]} /><meshStandardMaterial color="#6d4c35" /></mesh>
      <mesh position={[-side * 0.26, 1.2, 0]}><boxGeometry args={[0.02, 1.1, 1.3]} /><meshPhysicalMaterial color="#d6ecff" transparent opacity={0.25} roughness={0} /></mesh>
      {[-0.4, 0, 0.4].map((dz, i) => (
        <group key={i} position={[0, 1.0 + (i % 2) * 0.4, dz]}>
          <mesh position={[0, 0.12, 0]}><cylinderGeometry args={[0.09, 0.05, 0.22, 12]} /><meshStandardMaterial color="#e3b84f" metalness={0.9} roughness={0.25} /></mesh>
          <mesh><cylinderGeometry args={[0.07, 0.07, 0.04, 12]} /><meshStandardMaterial color="#3b2a1d" /></mesh>
        </group>
      ))}
    </group>
  );
}

function NoticeBoard({ z, side }: { z: number; side: -1 | 1 }) {
  const notes = ["#ffe58f", "#b7eb8f", "#91d5ff", "#ffadd2", "#ffd591"];
  return (
    <group position={[side * (CORRIDOR_W - 0.03), 1.7, z]} rotation={[0, side === -1 ? Math.PI / 2 : -Math.PI / 2, 0]}>
      <mesh><boxGeometry args={[1.5, 1, 0.04]} /><meshStandardMaterial color="#b98a5e" roughness={0.95} /></mesh>
      {notes.map((c, i) => (
        <mesh key={i} position={[-0.5 + (i % 3) * 0.5, 0.2 - Math.floor(i / 3) * 0.42, 0.03]} rotation={[0, 0, (i - 2) * 0.06]}>
          <planeGeometry args={[0.36, 0.32]} /><meshStandardMaterial color={c} />
        </mesh>
      ))}
    </group>
  );
}

export function Corridor({ openDoor, onPick, interactive, quality }: { openDoor: DoorId | null; onPick: (d: DoorDef) => void; interactive: boolean; quality: "low" | "medium" | "high" }) {
  const len = 22.4;
  return (
    <group>
      {/* polished floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -len / 2]} receiveShadow>
        <planeGeometry args={[CORRIDOR_W * 2, len]} />
        {quality === "high" ? (
          <MeshReflectorMaterial mirror={0.4} blur={[300, 80]} resolution={512} mixBlur={1} mixStrength={18} roughness={0.85} depthScale={1} color="#b9b2a6" metalness={0.3} />
        ) : (
          <meshStandardMaterial color="#c4bcae" roughness={0.25} metalness={0.15} />
        )}
      </mesh>
      {/* walls & ceiling */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * CORRIDOR_W, 2, -len / 2]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[len, 4]} /><meshStandardMaterial color="#efe9df" roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={"wain" + s} position={[s * (CORRIDOR_W - 0.01), 0.5, -len / 2]} rotation={[0, -s * Math.PI / 2, 0]}>
          <planeGeometry args={[len, 1]} /><meshStandardMaterial color="#c9bba6" roughness={0.8} />
        </mesh>
      ))}
      <mesh position={[0, 2, -len]}><planeGeometry args={[CORRIDOR_W * 2, 4]} /><meshStandardMaterial color="#2a2346" roughness={0.9} /></mesh>
      <mesh position={[0, 4, -len / 2]} rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[CORRIDOR_W * 2, len]} /><meshStandardMaterial color="#f4f1ea" /></mesh>
      {/* ceiling light rhythm */}
      {Array.from({ length: 7 }, (_, i) => -1.8 - i * 3).map((z) => (
        <group key={z} position={[0, 3.97, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><planeGeometry args={[1.6, 0.5]} /><meshStandardMaterial color="#fff" emissive="#fff4dd" emissiveIntensity={1.4} toneMapped={false} /></mesh>
          {quality !== "low" && <pointLight position={[0, -0.4, 0]} intensity={5} distance={6} color="#fff1d6" decay={2} />}
        </group>
      ))}
      <ambientLight intensity={0.25} />
      {DOORS.filter((d) => d.side !== 0).map((d) => <Door key={d.id} d={d} open={openDoor === d.id} onPick={onPick} enabled={interactive} />)}
      <Portal d={DOORS.find((d) => d.side === 0)!} onPick={onPick} enabled={interactive} active={openDoor === "arcade"} />
      <TrophyCase z={-8.4} side={-1} />
      <TrophyCase z={-14} side={1} />
      <NoticeBoard z={-8.4} side={1} />
      <NoticeBoard z={-14} side={-1} />
      <NoticeBoard z={-19.2} side={1} />
    </group>
  );
}
