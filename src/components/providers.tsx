"use client";
import { MotionConfig, AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/client";
import type { Prefs, PublicUser } from "@/lib/types";
import { DEFAULT_PREFS } from "@/lib/types";

export interface Me {
  user: PublicUser | null;
  coins?: number;
  xp?: number;
  level?: { level: number; progress: number; next: number };
  streak?: { current: number; activeToday: boolean };
  prefs?: Prefs;
  unread?: number;
  inventory?: string[];
}

interface Ctx {
  me: Me | null;
  refreshMe: () => Promise<void>;
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  toast: (text: string, kind?: "ok" | "err" | "info") => void;
  sfx: (k: "good" | "bad" | "coin" | "click") => void;
  confetti: () => void;
  reducedMotion: boolean;
}

const C = createContext<Ctx | null>(null);
export const useApp = () => {
  const c = useContext(C);
  if (!c) throw new Error("useApp outside Providers");
  return c;
};

function readLocal(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("cp_prefs") || "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

function applyPrefs(p: Prefs) {
  const h = document.documentElement;
  let t = p.theme;
  if (t === "auto") t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  h.dataset.theme = t;
  h.style.setProperty("--font-scale", String(p.fontScale / 100));
  h.style.setProperty("--line-height", String(p.lineHeight));
  h.dataset.dyslexic = String(p.dyslexic);
  const sysReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  h.dataset.motion = p.motion === "full" && sysReduced ? "reduced" : p.motion;
}

let audioCtx: AudioContext | null = null;
function tone(freqs: number[], dur = 0.09, type: OscillatorType = "sine", vol = 0.06) {
  try {
    audioCtx ??= new AudioContext();
    const ctx = audioCtx;
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.value = f;
      const t0 = ctx.currentTime + i * dur;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + dur * 1.8);
    });
  } catch {
    /* audio is optional */
  }
}

function fireConfetti() {
  const cv = document.createElement("canvas");
  cv.setAttribute("aria-hidden", "true");
  Object.assign(cv.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "100" });
  cv.width = innerWidth;
  cv.height = innerHeight;
  document.body.appendChild(cv);
  const ctx = cv.getContext("2d")!;
  const cols = ["#4a66c4", "#e0a060", "#4fa38a", "#b46ab8", "#c9a54a"];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3, s: 5 + Math.random() * 6, c: cols[Math.floor(Math.random() * cols.length)],
  }));
  let f = 0;
  const step = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - f / 140);
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    }
    if (++f < 140) requestAnimationFrame(step);
    else cv.remove();
  };
  step();
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [prefs, setPrefsState] = useState<Prefs>(DEFAULT_PREFS);
  const [toasts, setToasts] = useState<{ id: number; text: string; kind: "ok" | "err" | "info" }[]>([]);

  const refreshMe = useCallback(async () => {
    try {
      const m = await api<Me>("/api/me");
      setMe(m);
      if (m.prefs) {
        setPrefsState(m.prefs);
        localStorage.setItem("cp_prefs", JSON.stringify(m.prefs));
      }
    } catch {
      setMe({ user: null });
    }
  }, []);

  useEffect(() => {
    setPrefsState(readLocal());
    refreshMe();
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [refreshMe]);

  useEffect(() => {
    applyPrefs(prefs);
    if (prefs.theme !== "auto") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const on = () => applyPrefs(prefs);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [prefs]);

  // batch rapid changes (slider drags, auto quality) into one save
  const pending = useRef<Partial<Prefs>>({});
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefsState((old) => {
      const next = { ...old, ...patch };
      localStorage.setItem("cp_prefs", JSON.stringify(next));
      return next;
    });
    pending.current = { ...pending.current, ...patch };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const body = pending.current;
      pending.current = {};
      api("/api/prefs", { method: "PUT", body }).catch(() => {}); // saved per user when signed in
    }, 400);
  }, []);

  const toast = useCallback((text: string, kind: "ok" | "err" | "info" = "ok") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const reducedMotion = prefs.motion !== "full" || (typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

  const sfx = useCallback((k: "good" | "bad" | "coin" | "click") => {
    if (!prefs.sound) return;
    if (k === "good") tone([523, 659, 784], 0.08, "triangle");
    if (k === "bad") tone([220, 180], 0.1, "sawtooth", 0.03);
    if (k === "coin") tone([988, 1319], 0.07, "square", 0.03);
    if (k === "click") tone([660], 0.03, "sine", 0.03);
  }, [prefs.sound]);

  const confetti = useCallback(() => { if (!reducedMotion) fireConfetti(); }, [reducedMotion]);

  // Evening eye-care: warm overlay after the chosen hour.
  const [evening, setEvening] = useState(false);
  useEffect(() => {
    const check = () => setEvening(prefs.eveningCare && new Date().getHours() >= prefs.eveningFrom);
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [prefs.eveningCare, prefs.eveningFrom]);

  const value = useMemo(() => ({ me, refreshMe, prefs, setPrefs, toast, sfx, confetti, reducedMotion }), [me, refreshMe, prefs, setPrefs, toast, sfx, confetti, reducedMotion]);

  return (
    <C.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotion ? "always" : "never"} transition={{ duration: prefs.motion === "off" ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}>
        {children}
        {evening && <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] mix-blend-multiply" style={{ background: "rgba(255,170,90,0.14)" }} />}
        <div aria-live="polite" className="fixed bottom-24 md:bottom-6 right-4 z-[95] flex flex-col gap-2 w-[min(92vw,360px)]">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div key={t.id} initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
                className="glass rounded-2xl shadow-lift px-4 py-3 flex items-start gap-3 text-sm" role="status">
                {t.kind === "ok" ? <CheckCircle2 className="text-good shrink-0" size={18} aria-hidden /> : t.kind === "err" ? <XCircle className="text-bad shrink-0" size={18} aria-hidden /> : <Info className="text-primary shrink-0" size={18} aria-hidden />}
                <span>{t.text}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </MotionConfig>
    </C.Provider>
  );
}
