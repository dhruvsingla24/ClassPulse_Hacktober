"use client";
import { ContactShadows, Html, OrbitControls, PerformanceMonitor, Sparkles, Text } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OC } from "three-stdlib";
import { useApp } from "@/components/providers";
import { FONT } from "./exterior";

interface Obj { id: string; label: string; href: string; pos: [number, number, number] }

const STUDENT: Obj[] = [
  { id: "laptop", label: "Laptop · Dashboard", href: "/app", pos: [0, 1.05, 0.2] },
  { id: "shelf", label: "Bookshelf · Lecture notes", href: "/app/library", pos: [-3.6, 1.4, -2.6] },
  { id: "portal", label: "Challenge portal · Arcade", href: "/app/arcade", pos: [3.4, 1.6, -2.8] },
  { id: "kiosk", label: "Doubt station · Doubt Lab", href: "/app/doubts", pos: [-3.7, 1.0, 0.8] },
  { id: "exam", label: "Examination door · Tests", href: "/app/exam", pos: [4.4, 1.3, 0.6] },
  { id: "board", label: "Whiteboard · Schedule", href: "/app/meetings", pos: [0, 2.3, -3.4] },
  { id: "cabinet", label: "Achievement cabinet", href: "/app/profile", pos: [1.9, 1.1, -3.1] },
];
const TEACHER: Obj[] = [
  { id: "laptop", label: "Teacher desk · Dashboard", href: "/app", pos: [0, 1.05, 0.2] },
  { id: "board", label: "Attendance board", href: "/app/attendance", pos: [0, 2.3, -3.4] },
  { id: "shelf", label: "Assignment shelf", href: "/app/assignments", pos: [-3.6, 1.4, -2.6] },
  { id: "screen", label: "Performance screen · Students", href: "/app/students", pos: [3.4, 1.7, -2.8] },
  { id: "kiosk", label: "Doubt board", href: "/app/doubts", pos: [-3.7, 1.0, 0.8] },
  { id: "exam", label: "Exam hall · Integrity logs", href: "/app/exam", pos: [4.4, 1.3, 0.6] },
  { id: "cabinet", label: "Meeting calendar", href: "/app/meetings", pos: [1.9, 1.1, -3.1] },
];

function Hoverable({ o, children, onPick, active }: { o: Obj; children: React.ReactNode; onPick: (o: Obj) => void; active: string | null }) {
  const g = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  useFrame(() => {
    if (!g.current) return;
    const s = hover || active === o.id ? 1.06 : 1;
    g.current.scale.lerp(new THREE.Vector3(s, s, s), 0.15);
  });
  return (
    <group ref={g}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = ""; }}
      onClick={(e) => { e.stopPropagation(); onPick(o); }}>
      {children}
      <Html position={[o.pos[0], o.pos[1] + 0.9, o.pos[2]]} center distanceFactor={7} zIndexRange={[10, 0]}>
        <button onClick={() => onPick(o)} className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold shadow-lg transition ${hover || active === o.id ? "bg-[#4a66c4] text-white scale-110" : "bg-white/85 text-[#1e2638]"}`}>{o.label}</button>
      </Html>
      {(hover || active === o.id) && <pointLight position={[o.pos[0], o.pos[1] + 0.6, o.pos[2] + 0.6]} intensity={4} distance={3} color="#9fb4ff" />}
    </group>
  );
}

function Rig({ target }: { target: THREE.Vector3 | null }) {
  const { camera } = useThree();
  const ctl = useThree((s) => s.controls) as unknown as OC | null;
  useFrame((_, dt) => {
    if (!target) return;
    const k = 1 - Math.pow(0.02, dt);
    const dest = target.clone().add(new THREE.Vector3(0, 0.6, 2.2));
    camera.position.lerp(dest, k);
    if (ctl) { ctl.target.lerp(target, k); ctl.update(); }
  });
  return null;
}

function Room({ teacher, inventory, onPick, active, quality }: { teacher: boolean; inventory: string[]; onPick: (o: Obj) => void; active: string | null; quality: string }) {
  const objs = teacher ? TEACHER : STUDENT;
  const by = (id: string) => objs.find((o) => o.id === id)!;
  const portal = useRef<THREE.Mesh>(null);
  const globe = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (portal.current) portal.current.rotation.z += dt * 0.8;
    if (globe.current) globe.current.rotation.y += dt * 0.6;
  });
  const books = useMemo(() => Array.from({ length: 24 }, (_, i) => ({ c: ["#5B7FD6", "#D9885B", "#4FA38A", "#B46AB8", "#C9A54A"][i % 5], h: 0.42 + ((i * 7) % 5) * 0.04, row: Math.floor(i / 8), col: i % 8 })), []);
  const has = (id: string) => inventory.includes(id);
  return (
    <group>
      {/* floor & walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[12, 9]} /><meshStandardMaterial color="#c8a985" roughness={0.75} /></mesh>
      <mesh position={[0, 2, -3.8]} receiveShadow><planeGeometry args={[12, 4]} /><meshStandardMaterial color={teacher ? "#e7dccb" : "#e4e9f2"} /></mesh>
      <mesh position={[-5, 2, 0.6]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[9, 4]} /><meshStandardMaterial color={teacher ? "#ddd0bd" : "#dbe2ee"} /></mesh>
      <mesh position={[5, 2, 0.6]} rotation={[0, -Math.PI / 2, 0]}><planeGeometry args={[9, 4]} /><meshStandardMaterial color={teacher ? "#ddd0bd" : "#dbe2ee"} /></mesh>
      {/* window with sunlight */}
      <mesh position={[-4.98, 2.3, -0.8]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[2.2, 1.5]} /><meshStandardMaterial color="#cfe6ff" emissive="#fff1c9" emissiveIntensity={0.9} /></mesh>
      {quality !== "low" && <Sparkles count={50} scale={[3, 2, 3]} position={[-3.5, 2, -0.6]} size={2} speed={0.2} color="#fff3d1" />}

      {/* desk + laptop */}
      <Hoverable o={by("laptop")} onPick={onPick} active={active}>
        <mesh position={[0, 0.75, 0.2]} castShadow receiveShadow><boxGeometry args={[2.4, 0.08, 1.1]} /><meshStandardMaterial color="#8b6446" roughness={0.6} /></mesh>
        {[[-1.1, -0.45], [1.1, -0.45], [-1.1, 0.85], [1.1, 0.85]].map(([x, z], i) => <mesh key={i} position={[x, 0.37, z]} castShadow><boxGeometry args={[0.07, 0.74, 0.07]} /><meshStandardMaterial color="#3d4352" /></mesh>)}
        <mesh position={[0, 0.8, 0.35]} castShadow><boxGeometry args={[0.8, 0.03, 0.5]} /><meshStandardMaterial color="#2a2f3b" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 1.05, 0.1]} rotation={[-0.25, 0, 0]} castShadow><boxGeometry args={[0.8, 0.5, 0.03]} /><meshStandardMaterial color="#2a2f3b" /></mesh>
        <mesh position={[0, 1.05, 0.12]} rotation={[-0.25, 0, 0]}><planeGeometry args={[0.72, 0.42]} /><meshStandardMaterial color="#4a66c4" emissive="#6f8cff" emissiveIntensity={1.1} toneMapped={false} /></mesh>
      </Hoverable>
      {/* chair */}
      <mesh position={[0, 0.48, 1.25]} castShadow><boxGeometry args={[0.6, 0.06, 0.6]} /><meshStandardMaterial color="#4a66c4" /></mesh>
      <mesh position={[0, 0.85, 1.53]} castShadow><boxGeometry args={[0.6, 0.7, 0.06]} /><meshStandardMaterial color="#4a66c4" /></mesh>

      {/* desk items bought in the coin shop */}
      {has("plant") && <group position={[-0.9, 0.79, 0.05]}><mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.1, 0.08, 0.18, 14]} /><meshStandardMaterial color="#c56b4b" /></mesh>{[0, 1, 2, 3, 4].map((k) => <mesh key={k} position={[Math.cos(k * 1.3) * 0.08, 0.3, Math.sin(k * 1.3) * 0.08]} rotation={[Math.cos(k) * 0.6, k, Math.sin(k) * 0.6]}><sphereGeometry args={[0.1, 8, 6]} /><meshStandardMaterial color="#4f9a5a" flatShading /></mesh>)}</group>}
      {has("trophy") && <group position={[0.85, 0.79, 0.05]}><mesh position={[0, 0.05, 0]}><boxGeometry args={[0.16, 0.1, 0.16]} /><meshStandardMaterial color="#3b2a1d" /></mesh><mesh position={[0, 0.24, 0]}><cylinderGeometry args={[0.1, 0.04, 0.28, 16]} /><meshStandardMaterial color="#e3b84f" metalness={0.9} roughness={0.2} /></mesh></group>}
      {has("lamp") && <group position={[1.0, 0.79, 0.5]}><mesh position={[0, 0.2, 0]}><cylinderGeometry args={[0.015, 0.015, 0.4]} /><meshStandardMaterial color="#333" /></mesh><mesh position={[0, 0.42, 0]}><coneGeometry args={[0.12, 0.14, 16, 1, true]} /><meshStandardMaterial color="#f2c14e" side={THREE.DoubleSide} emissive="#ffcf6a" emissiveIntensity={0.6} /></mesh><pointLight position={[0, 0.35, 0]} intensity={2.5} distance={2} color="#ffd27a" /></group>}
      {has("globe") && <group position={[-0.95, 0.79, 0.55]}><mesh position={[0, 0.05, 0]}><cylinderGeometry args={[0.06, 0.08, 0.1]} /><meshStandardMaterial color="#5a4632" /></mesh><mesh ref={globe} position={[0, 0.25, 0]}><sphereGeometry args={[0.15, 24, 16]} /><meshStandardMaterial color="#4a90c4" roughness={0.6} /></mesh></group>}
      {has("poster") && <mesh position={[-2.3, 2.4, -3.78]}><planeGeometry args={[1.1, 1.5]} /><meshStandardMaterial color="#1b1d4a" emissive="#5a3dff" emissiveIntensity={0.25} /></mesh>}
      {has("poster") && <Text font={FONT} fontSize={0.12} position={[-2.3, 2.4, -3.76]} color="#ffe9a8">REACH FOR{"\n"}THE STARS</Text>}

      {/* bookshelf */}
      <Hoverable o={by("shelf")} onPick={onPick} active={active}>
        <mesh position={[-3.6, 1.2, -3.3]} castShadow><boxGeometry args={[2, 2.4, 0.5]} /><meshStandardMaterial color="#6d4c35" /></mesh>
        {books.map((b, i) => <mesh key={i} position={[-4.4 + b.col * 0.22, 0.55 + b.row * 0.75 + b.h / 2, -3.05]} castShadow><boxGeometry args={[0.16, b.h, 0.3]} /><meshStandardMaterial color={teacher && b.row === 2 ? "#e9e2d0" : b.c} /></mesh>)}
      </Hoverable>

      {/* whiteboard */}
      <Hoverable o={by("board")} onPick={onPick} active={active}>
        <mesh position={[0, 2.3, -3.75]}><boxGeometry args={[3.2, 1.6, 0.06]} /><meshStandardMaterial color="#f8f8f4" roughness={0.3} /></mesh>
        <Text font={FONT} fontSize={0.2} position={[0, 2.75, -3.7]} color="#1e2638">{teacher ? "ATTENDANCE · 10A" : "TODAY"}</Text>
        <Text fontSize={0.13} font={FONT} position={[0, 2.2, -3.7]} color="#4a66c4" maxWidth={2.8} textAlign="center">{teacher ? "Tap to take attendance\nP · A · L quick-mark" : "Live class: Matrices revision\nDaily challenge · Arcade streak"}</Text>
      </Hoverable>

      {/* portal / performance screen */}
      <Hoverable o={by(teacher ? "screen" : "portal")} onPick={onPick} active={active}>
        {teacher ? (
          <group position={[3.4, 1.7, -3.6]}>
            <mesh><boxGeometry args={[1.8, 1.1, 0.06]} /><meshStandardMaterial color="#1e2638" /></mesh>
            {[0.5, 0.75, 0.6, 0.9, 0.7].map((h, i) => <mesh key={i} position={[-0.6 + i * 0.3, -0.4 + h * 0.4, 0.05]}><boxGeometry args={[0.18, h * 0.8, 0.02]} /><meshStandardMaterial color={["#5B7FD6", "#D9885B", "#4FA38A", "#B46AB8", "#C9A54A"][i]} emissive={["#5B7FD6", "#D9885B", "#4FA38A", "#B46AB8", "#C9A54A"][i]} emissiveIntensity={0.6} /></mesh>)}
          </group>
        ) : (
          <group position={[3.4, 1.6, -3.3]}>
            <mesh ref={portal}><torusGeometry args={[0.85, 0.09, 16, 64]} /><meshStandardMaterial color="#b9a6ff" emissive="#7c5cff" emissiveIntensity={2.4} toneMapped={false} /></mesh>
            <mesh position={[0, 0, -0.02]}><circleGeometry args={[0.8, 40]} /><meshStandardMaterial color="#2b1f66" emissive="#5a3dff" emissiveIntensity={1.5} toneMapped={false} /></mesh>
            <pointLight intensity={8} distance={5} color="#8b6dff" position={[0, 0, 0.8]} />
          </group>
        )}
      </Hoverable>

      {/* doubt kiosk */}
      <Hoverable o={by("kiosk")} onPick={onPick} active={active}>
        <mesh position={[-3.7, 0.55, 0.8]} castShadow><boxGeometry args={[0.7, 1.1, 0.5]} /><meshStandardMaterial color="#24524a" /></mesh>
        <mesh position={[-3.7, 1.35, 0.8]} rotation={[0, Math.PI / 2.4, 0]}><boxGeometry args={[0.8, 0.55, 0.04]} /><meshStandardMaterial color="#1b2030" emissive="#4fa38a" emissiveIntensity={0.7} /></mesh>
        <Text font={FONT} fontSize={0.3} position={[-3.55, 1.37, 0.95]} rotation={[0, Math.PI / 2.4, 0]} color="#e8fff5">?</Text>
      </Hoverable>

      {/* exam door */}
      <Hoverable o={by("exam")} onPick={onPick} active={active}>
        <mesh position={[4.96, 1.15, 0.6]} rotation={[0, -Math.PI / 2, 0]}><boxGeometry args={[1.2, 2.3, 0.06]} /><meshStandardMaterial color="#b85a5a" /></mesh>
        <mesh position={[4.9, 1.1, 0.15]}><sphereGeometry args={[0.05]} /><meshStandardMaterial color="#f2d27a" metalness={0.9} /></mesh>
      </Hoverable>

      {/* achievement cabinet / calendar */}
      <Hoverable o={by("cabinet")} onPick={onPick} active={active}>
        <mesh position={[1.9, 0.75, -3.5]} castShadow><boxGeometry args={[1.1, 1.5, 0.4]} /><meshStandardMaterial color="#6d4c35" /></mesh>
        <mesh position={[1.9, 0.95, -3.29]}><planeGeometry args={[0.9, 1]} /><meshPhysicalMaterial color="#d6ecff" transparent opacity={0.3} roughness={0} /></mesh>
        {[-0.25, 0.05, 0.3].map((x, i) => <mesh key={i} position={[1.9 + x, 0.75 + (i % 2) * 0.35, -3.45]}><cylinderGeometry args={[0.06, 0.03, 0.18, 12]} /><meshStandardMaterial color={teacher ? "#4a66c4" : "#e3b84f"} metalness={0.8} roughness={0.25} /></mesh>)}
      </Hoverable>
      {quality !== "low" && <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={12} blur={2} far={3} />}
    </group>
  );
}

export default function ClassroomScene() {
  const router = useRouter();
  const { me, prefs, setPrefs } = useApp();
  const teacher = me?.user?.role === "teacher";
  const objs = teacher ? TEACHER : STUDENT;
  const [active, setActive] = useState<string | null>(null);
  const [target, setTarget] = useState<THREE.Vector3 | null>(null);
  const qualityRef = useRef(prefs.quality);
  qualityRef.current = prefs.quality;
  const pick = (o: Obj) => {
    setActive(o.id);
    setTarget(new THREE.Vector3(...o.pos));
    setTimeout(() => router.push(o.href), 1100);
  };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold">{teacher ? "Teacher's Lounge" : "Your 3D classroom"}</h1>
          <p className="text-muted mt-1">Drag to look around. Click any object to open it.{!teacher && " Items from the coin shop appear on your desk."}</p>
        </div>
        <Link href="/app" className="btn-primary"><LayoutDashboard size={17} aria-hidden /> Switch to dashboard view</Link>
      </div>
      <div className="relative card overflow-hidden !p-0 h-[62vh] min-h-[420px] bg-[#1b2030]">
        <Canvas shadows={prefs.quality !== "low"} dpr={[1, prefs.quality === "high" ? 2 : 1.5]} camera={{ position: [0, 3.2, 6.5], fov: 50 }} aria-label="3D classroom">
          <PerformanceMonitor onDecline={() => { if (qualityRef.current !== "low") { qualityRef.current = "low"; setPrefs({ quality: "low" }); } }} />
          <color attach="background" args={[teacher ? "#2a2420" : "#1d2333"]} />
          <hemisphereLight args={["#fff4e2", "#5b4a3a", 0.8]} />
          <directionalLight position={[-6, 6, 3]} intensity={1.6} color="#ffe6c4" castShadow shadow-mapSize={[1024, 1024]} />
          <ambientLight intensity={0.25} />
          <Suspense fallback={null}>
            <Room teacher={teacher} inventory={me?.inventory ?? []} onPick={pick} active={active} quality={prefs.quality} />
          </Suspense>
          <OrbitControls makeDefault enablePan={false} minDistance={3} maxDistance={8.5} minPolarAngle={0.5} maxPolarAngle={1.45} minAzimuthAngle={-1} maxAzimuthAngle={1} target={[0, 1.2, -1]} />
          <Rig target={target} />
        </Canvas>
      </div>
      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Classroom objects">
        {objs.map((o) => <button key={o.id} className="btn-outline text-sm" onClick={() => pick(o)}>{o.label}</button>)}
      </nav>
    </div>
  );
}
