"use client";
import { ContactShadows, PerformanceMonitor, Sky, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowLeft, ArrowUp, Compass, Eye, LayoutDashboard, Play, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { ComfortPanel } from "@/components/comfort";
import { useApp } from "@/components/providers";
import { Segmented } from "@/components/ui";
import { Corridor, DOORS, doorView, type DoorDef, type DoorId } from "./corridor";
import { Benches, Birds, Building, Clouds, Dust, Flag, Fountain, Ground, Trees, Walkers, sunFromClock } from "./exterior";
import { LoginPanel } from "./login-panel";

type Phase = "exterior" | "entering" | "corridor" | "door";

const EXTERIOR_POS = new THREE.Vector3(0, 5.2, 30);
const EXTERIOR_LOOK = new THREE.Vector3(0, 4.2, 0);
const ENTRY_PATH = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 5.2, 30), new THREE.Vector3(0.8, 3.6, 18), new THREE.Vector3(0, 2.2, 7), new THREE.Vector3(0, 1.75, 2), new THREE.Vector3(0, 1.7, -1.2),
]);

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function Rig({ phase, door, corridorZ, yaw, onEntered, onDoorsOpen, reduced }: {
  phase: Phase; door: DoorDef | null; corridorZ: number; yaw: number; onEntered: () => void; onDoorsOpen: (v: number) => void; reduced: boolean;
}) {
  const { camera, pointer } = useThree();
  const look = useRef(EXTERIOR_LOOK.clone());
  const t = useRef(0);
  const start = useRef<number | null>(null);
  const entered = useRef(false);
  useEffect(() => {
    if (phase === "entering") { t.current = 0; start.current = null; entered.current = false; }
  }, [phase]);
  useFrame((state, dt) => {
    const d = Math.min(dt, 0.05);
    const time = state.clock.elapsedTime;
    const targetPos = new THREE.Vector3();
    const targetLook = new THREE.Vector3();
    let k = 1 - Math.pow(0.002, d); // frame-rate independent smoothing
    if (phase === "exterior") {
      // slow cinematic drift + mouse/tilt parallax
      const drift = reduced ? 0 : 1;
      targetPos.copy(EXTERIOR_POS).add(new THREE.Vector3(Math.sin(time * 0.08) * 2.5 * drift + pointer.x * 1.6, Math.sin(time * 0.11) * 0.4 * drift + pointer.y * 0.6, 0));
      targetLook.copy(EXTERIOR_LOOK).add(new THREE.Vector3(pointer.x * 0.8, pointer.y * 0.4, 0));
      k = 1 - Math.pow(0.05, d);
    } else if (phase === "entering") {
      // driven by wall-clock time so the journey takes the same time at any frame rate
      start.current ??= time;
      t.current = Math.min(1, (time - start.current) / (reduced ? 0.6 : 3.4));
      const e = easeInOut(t.current);
      targetPos.copy(ENTRY_PATH.getPointAt(e));
      targetLook.copy(ENTRY_PATH.getPointAt(Math.min(1, e + 0.08))).add(new THREE.Vector3(0, -0.05, -2));
      onDoorsOpen(THREE.MathUtils.clamp((e - 0.45) / 0.25, 0, 1));
      k = 1;
      if (t.current >= 1 && !entered.current) { entered.current = true; onEntered(); }
    } else if (phase === "corridor") {
      targetPos.set(0, 1.7 + Math.sin(time * 1.2) * 0.01, corridorZ);
      targetLook.set(Math.sin(yaw) * 4 + pointer.x * 0.6, 1.65 + pointer.y * 0.3, corridorZ - Math.cos(yaw) * 4);
      k = 1 - Math.pow(0.02, d);
    } else if (phase === "door" && door) {
      const v = doorView(door);
      targetPos.copy(v.pos);
      targetLook.copy(v.look);
      k = 1 - Math.pow(0.03, d);
    }
    camera.position.lerp(targetPos, k);
    look.current.lerp(targetLook, k);
    camera.lookAt(look.current);
  });
  return null;
}

function Scene({ phase, door, corridorZ, yaw, quality, onPick, onEntered }: {
  phase: Phase; door: DoorDef | null; corridorZ: number; yaw: number; quality: "low" | "medium" | "high"; onPick: (d: DoorDef) => void; onEntered: () => void;
}) {
  const sun = useMemo(() => sunFromClock(), []);
  const [doorsOpen, setDoorsOpen] = useState(phase === "exterior" ? 0 : 1);
  const { reducedMotion } = useApp();
  const inside = phase === "corridor" || phase === "door";
  useEffect(() => { if (inside) setDoorsOpen(1); }, [inside]);
  return (
    <>
      <Rig phase={phase} door={door} corridorZ={corridorZ} yaw={yaw} onEntered={onEntered} onDoorsOpen={setDoorsOpen} reduced={reducedMotion} />
      <Sky sunPosition={sun.pos} turbidity={sun.golden ? 8 : 4} rayleigh={sun.golden ? 2.6 : 1.2} mieCoefficient={0.006} mieDirectionalG={0.85} />
      <fog attach="fog" args={[sun.golden ? "#e9c9a6" : "#cfdbe6", 40, 150]} />
      <hemisphereLight args={["#fff2dc", "#6f8a5c", sun.night ? 0.35 : 0.65]} />
      <directionalLight position={sun.pos} intensity={sun.night ? 0.9 : 2.2} color={sun.golden ? "#ffc58a" : "#fff6e8"} castShadow={quality !== "low"}
        shadow-mapSize={quality === "high" ? [2048, 2048] : [1024, 1024]} shadow-camera-left={-40} shadow-camera-right={40} shadow-camera-top={40} shadow-camera-bottom={-40} shadow-bias={-0.0004} />
      <Ground />
      <Building doorsOpen={doorsOpen} />
      <Trees />
      <Benches />
      <Fountain />
      <Flag />
      {quality !== "low" && <Clouds />}
      <Birds />
      <Walkers count={quality === "low" ? 6 : 14} />
      <Dust quality={quality} />
      {quality !== "low" && <ContactShadows position={[0, 0.02, 10]} opacity={0.35} scale={60} blur={2.4} far={8} />}
      <Corridor openDoor={door?.id ?? null} onPick={onPick} interactive={phase === "corridor" || phase === "door"} quality={quality} />
    </>
  );
}

const TIPS = [
  "Press Ctrl/Cmd + K anywhere in the app to jump to any lecture, doubt or setting.",
  "The Comfort panel (eye icon) has Warm Reading and High Contrast themes.",
  "Coins come from the server-verified ledger, so refreshing never doubles them.",
  "Use W/S or the arrow keys to walk the corridor, A/D to look around.",
  "Every resource can be exported as an Open Classroom Pack for other schools.",
];

function Loader({ onSkip }: { onSkip: () => void }) {
  const { progress, active, loaded, total } = useProgress();
  const [tip, setTip] = useState(0);
  const [done, setDone] = useState(false);
  const [settled, setSettled] = useState(false);
  useEffect(() => { const t = setInterval(() => setTip((i) => (i + 1) % TIPS.length), 2600); return () => clearInterval(t); }, []);
  // fonts are the only network assets; once nothing is loading for a moment, the scene is ready
  useEffect(() => {
    if (active) { setSettled(false); return; }
    const t = setTimeout(() => setSettled(true), 700);
    return () => clearTimeout(t);
  }, [active, loaded]);
  useEffect(() => { if (settled && (total === 0 || progress >= 100)) { const t = setTimeout(() => setDone(true), 300); return () => clearTimeout(t); } }, [settled, total, progress]);
  const shown = done || (settled && total === 0) ? 100 : progress;
  return (
    <AnimatePresence>
      {!done && (
        <motion.div exit={{ opacity: 0 }} transition={{ duration: 0.6 }} className="absolute inset-0 z-30 grid place-items-center bg-[#131720] text-white">
          <div className="w-[min(88vw,420px)] text-center">
            <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-[#4a66c4] shadow-lg">
              <Sparkles aria-hidden />
            </motion.div>
            <h2 className="font-display text-2xl font-extrabold">Building ClassPulse Academy</h2>
            <div className="mt-5 h-2 rounded-full bg-white/10 overflow-hidden" role="progressbar" aria-valuenow={Math.round(shown)} aria-valuemin={0} aria-valuemax={100} aria-label="Loading campus">
              <motion.div className="h-full bg-gradient-to-r from-[#849eee] to-[#ecaa76]" animate={{ width: `${Math.max(8, shown)}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/60 tabular-nums">{Math.round(shown)}%</p>
            <AnimatePresence mode="wait">
              <motion.p key={tip} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="mt-6 text-white/80 min-h-[3em]">Tip: {TIPS[tip]}</motion.p>
            </AnimatePresence>
            <button onClick={() => { setDone(true); onSkip(); }} className="mt-4 text-sm underline underline-offset-4 text-white/70 hover:text-white">Skip to the 2D dashboard</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Campus() {
  const router = useRouter();
  const { me, prefs, setPrefs, refreshMe, toast } = useApp();
  // intro plays once per session; afterwards start inside the corridor (this component only renders client-side)
  const [phase, setPhase] = useState<Phase>(() => { try { return sessionStorage.getItem("cp_intro") === "1" ? "corridor" : "exterior"; } catch { return "exterior"; } });
  const [door, setDoor] = useState<DoorDef | null>(null);
  const [corridorZ, setCorridorZ] = useState(-1.2);
  const [yaw, setYaw] = useState(0);
  const [login, setLogin] = useState<DoorDef | null>(null);
  const [frameloop, setFrameloop] = useState<"always" | "never">("always");
  const [dpr, setDpr] = useState(1.5);
  const [comfort, setComfort] = useState(false);
  const quality = prefs.quality;
  // the monitor keeps its first callback, so read quality through a ref to downgrade only once
  const qualityRef = useRef(quality);
  qualityRef.current = quality;
  const tourTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // pause rendering when the tab is hidden
  useEffect(() => {
    const on = () => setFrameloop(document.visibilityState === "visible" ? "always" : "never");
    document.addEventListener("visibilitychange", on);
    return () => { document.removeEventListener("visibilitychange", on); document.body.style.cursor = ""; };
  }, []);
  useEffect(() => setDpr(quality === "high" ? 2 : quality === "medium" ? 1.5 : 1), [quality]);

  const enter = () => setPhase("entering");
  const skip = () => { try { sessionStorage.setItem("cp_intro", "1"); } catch { /* ignore */ } setPhase("corridor"); };
  const onEntered = useCallback(() => { try { sessionStorage.setItem("cp_intro", "1"); } catch { /* ignore */ } setPhase("corridor"); }, []);
  const replay = () => { try { sessionStorage.removeItem("cp_intro"); } catch { /* ignore */ } setDoor(null); setLogin(null); setCorridorZ(-1.2); setYaw(0); setPhase("exterior"); };

  const stopTour = () => { if (tourTimer.current) clearInterval(tourTimer.current); tourTimer.current = null; };
  const tour = () => {
    stopTour();
    setDoor(null); setPhase("corridor"); setYaw(0);
    const stops = [-2.5, -5.6, -8.4, -11.2, -14, -16.8, -18.5];
    const yaws = [0, -0.9, 0.9, -0.9, 0.9, -0.9, 0];
    let i = 0;
    tourTimer.current = setInterval(() => {
      if (i >= stops.length) { stopTour(); toast("Tour done. Click any door to enter.", "info"); return; }
      setCorridorZ(stops[i]); setYaw(yaws[i]); i++;
    }, 1700);
  };
  useEffect(() => stopTour, []);

  const goTo = useCallback((d: DoorDef, role: string) => {
    let route = d.route;
    if (d.id === "teacher" || d.id === "student") route = role === "teacher" ? "/app" : role === "student" ? "/app/classroom" : "/app";
    setTimeout(() => router.push(route), 900); // let the door swing open first
  }, [router]);

  const pick = useCallback((d: DoorDef) => {
    stopTour();
    setDoor(d);
    setPhase("door");
    const role = me?.user?.role;
    if (!role) { setTimeout(() => setLogin(d), 700); return; }
    if ((d.id === "teacher" && role !== "teacher") || (d.id === "student" && role === "teacher")) {
      toast(`That's not your room. Taking you to your own ${role === "teacher" ? "Teacher's Lounge" : "space"}.`, "info");
    }
    goTo(d, role);
  }, [me, goTo, toast]);

  // keyboard: walk with W/S or arrows, look with A/D
  useEffect(() => {
    if (phase !== "corridor") return;
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      const key = e.key.toLowerCase();
      if (key === "w" || key === "arrowup") setCorridorZ((z) => Math.max(-18.5, z - 1));
      if (key === "s" || key === "arrowdown") setCorridorZ((z) => Math.min(-1.2, z + 1));
      if (key === "a" || key === "arrowleft") setYaw((y) => Math.max(-1.1, y - 0.25));
      if (key === "d" || key === "arrowright") setYaw((y) => Math.min(1.1, y + 0.25));
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [phase]);

  // scroll / touch-drag to walk
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onWheel = (e: React.WheelEvent) => { if (phase === "corridor") setCorridorZ((z) => THREE.MathUtils.clamp(z - e.deltaY * 0.01, -18.5, -1.2)); };

  const backToCorridor = () => { setLogin(null); setDoor(null); setPhase("corridor"); };
  const onSignedIn = async (role: string, note: string | null) => {
    await refreshMe();
    if (note) toast(note, "info");
    setLogin(null);
    if (door) goTo(door, role);
  };

  return (
    <div className="fixed inset-0 bg-[#131720] overflow-hidden select-none" onWheel={onWheel}
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchMove={(e) => {
        if (!touch.current || phase !== "corridor") return;
        const dx = e.touches[0].clientX - touch.current.x;
        const dy = e.touches[0].clientY - touch.current.y;
        setYaw((y) => THREE.MathUtils.clamp(y + dx * 0.004, -1.1, 1.1));
        setCorridorZ((z) => THREE.MathUtils.clamp(z + dy * 0.02, -18.5, -1.2));
        touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}>
      <Canvas shadows={quality !== "low"} dpr={[1, dpr]} frameloop={frameloop} camera={{ position: phase === "exterior" ? EXTERIOR_POS.toArray() : [0, 1.7, -1.2], fov: 50, near: 0.1, far: 400 }}
        gl={{ antialias: quality !== "low", powerPreference: "high-performance" }} aria-label="Interactive 3D campus of ClassPulse Academy">
        <PerformanceMonitor onDecline={() => { if (qualityRef.current !== "low") { qualityRef.current = "low"; setPrefs({ quality: "low" }); toast("Switched 3D to Low quality to keep things smooth.", "info"); } }} />
        <Suspense fallback={null}>
          <Scene phase={phase} door={door} corridorZ={corridorZ} yaw={yaw} quality={quality} onPick={pick} onEntered={onEntered} />
        </Suspense>
      </Canvas>
      <Loader onSkip={() => router.push(me?.user ? "/app" : "/login")} />

      {/* Exterior hero */}
      <AnimatePresence>
        {phase === "exterior" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.6 }}
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-end pb-[9vh] text-center px-6">
            <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#0b0f1a]/80 via-[#0b0f1a]/45 to-transparent" aria-hidden />
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="relative chip bg-white/20 text-white backdrop-blur mb-4">Theme 02 · Open Source for Education</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8, duration: 0.7 }}
              className="relative font-display text-[2.1rem] leading-[1.1] sm:text-5xl md:text-6xl font-extrabold text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.45)] max-w-4xl">
              Welcome to ClassPulse: <span className="bg-gradient-to-r from-[#ffd9a8] to-[#c8d4ff] bg-clip-text text-transparent">Your Classroom, Reimagined.</span>
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="relative mt-4 text-lg md:text-xl text-white/90 drop-shadow">Enter the future of learning.</motion.p>
            <motion.button initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.4, type: "spring" }} onClick={enter}
              className="pointer-events-auto relative mt-8 inline-flex items-center gap-3 rounded-2xl bg-[#4a66c4] px-8 py-4 text-lg font-extrabold tracking-wide text-white shadow-[0_10px_40px_-8px_rgba(74,102,196,0.9)] animate-glow hover:brightness-110 active:scale-95 transition">
              <Play size={20} fill="currentColor" aria-hidden /> ENTER CAMPUS
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corridor HUD */}
      <AnimatePresence>
        {(phase === "corridor" || phase === "door") && !login && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute inset-x-0 bottom-0 p-4 md:p-6 flex flex-col items-center gap-3">
            <p className="glass text-ink rounded-2xl px-4 py-2 text-sm font-semibold shadow-soft text-center" aria-live="polite">
              {phase === "door" && door ? `Opening ${door.label.toLowerCase()}…` : "Click a door to enter. Walk with W/S or scroll, look with A/D."}
            </p>
            <div className="glass rounded-2xl p-1.5 flex flex-wrap justify-center gap-1 shadow-lift">
              {phase === "door" ? (
                <button className="btn-ghost text-sm" onClick={backToCorridor}><ArrowLeft size={16} aria-hidden /> Back to corridor</button>
              ) : (
                <>
                  <button className="btn-ghost text-sm" onClick={() => setCorridorZ((z) => Math.min(-1.2, z + 3))} aria-label="Step back"><ArrowDown size={16} /></button>
                  <button className="btn-ghost text-sm" onClick={() => setCorridorZ((z) => Math.max(-18.5, z - 3))} aria-label="Walk forward"><ArrowUp size={16} /></button>
                  <button className="btn-ghost text-sm" onClick={tour}><Compass size={16} aria-hidden /> Guided tour</button>
                </>
              )}
              <div className="w-px bg-line mx-1" aria-hidden />
              {/* every door is also reachable without 3D interaction */}
              <label className="sr-only" htmlFor="door-select">Go to a room</label>
              <select id="door-select" className="bg-transparent text-sm font-semibold px-2 rounded-xl text-ink" value="" onChange={(e) => { const d = DOORS.find((x) => x.id === (e.target.value as DoorId)); if (d) pick(d); }}>
                <option value="" disabled>Rooms…</option>
                {DOORS.map((d) => <option key={d.id} value={d.id}>{d.label.charAt(0) + d.label.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent top controls */}
      <div className="absolute top-0 inset-x-0 p-3 md:p-4 flex items-center justify-between gap-2">
        <div className="glass rounded-2xl px-3 py-2 flex items-center gap-2 shadow-soft">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-ink font-extrabold">C</span>
          <span className="font-display font-extrabold text-ink hidden sm:inline">ClassPulse Academy</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {phase === "exterior" || phase === "entering" ? (
            <button className="btn glass text-ink text-sm shadow-soft" onClick={skip}><SkipForward size={16} aria-hidden /> Skip intro</button>
          ) : (
            <button className="btn glass text-ink text-sm shadow-soft" onClick={replay}><RotateCcw size={16} aria-hidden /> <span className="hidden sm:inline">Replay intro</span></button>
          )}
          <div className="hidden md:block glass rounded-xl p-0.5 shadow-soft"><Segmented label="3D quality" value={quality} onChange={(v) => setPrefs({ quality: v })} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Med" }, { value: "high", label: "High" }]} /></div>
          <button className="btn glass text-ink !p-2.5 shadow-soft" onClick={() => setComfort(true)} aria-label="Comfort panel"><Eye size={17} /></button>
          <button className="btn-primary text-sm" onClick={() => router.push(me?.user ? "/app" : "/login")}><LayoutDashboard size={16} aria-hidden /> {me?.user ? "Dashboard" : "2D sign in"}</button>
        </div>
      </div>

      <AnimatePresence>{login && <LoginPanel door={login} onClose={backToCorridor} onSignedIn={onSignedIn} />}</AnimatePresence>
      <ComfortPanel open={comfort} onClose={() => setComfort(false)} />
    </div>
  );
}
