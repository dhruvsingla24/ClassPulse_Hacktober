"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Contrast, Eye, Monitor, Moon, Sun, Sunset, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "./providers";
import { Segmented } from "./ui";
import type { Prefs } from "@/lib/types";

const THEMES: { value: Prefs["theme"]; label: string; Icon: import("lucide-react").LucideIcon; swatch: string[] }[] = [
  { value: "auto", label: "Auto", Icon: Monitor, swatch: ["#f4f3ee", "#131720"] },
  { value: "light", label: "Light", Icon: Sun, swatch: ["#f4f3ee", "#4a66c4"] },
  { value: "dark", label: "Dark", Icon: Moon, swatch: ["#1b202c", "#849eee"] },
  { value: "warm", label: "Warm reading", Icon: Sunset, swatch: ["#f2e9d8", "#8c582c"] },
  { value: "contrast", label: "High contrast", Icon: Contrast, swatch: ["#08080a", "#ffd60a"] },
];

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2.5 cursor-pointer">
      <span>
        <span className="font-semibold block">{label}</span>
        {desc && <span className="text-sm text-muted">{desc}</span>}
      </span>
      <button role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative mt-1 h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-ink/20"}`}>
        <motion.span layout className="absolute top-1 h-5 w-5 rounded-full bg-raised shadow" style={{ left: checked ? 26 : 4 }} transition={{ type: "spring", stiffness: 600, damping: 32 }} />
        <span className="sr-only">{label}</span>
      </button>
    </label>
  );
}

export function ComfortPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setPrefs } = useApp();
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[85]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
          <motion.aside role="dialog" aria-modal="true" aria-label="Comfort panel" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="absolute right-0 top-0 h-full w-full max-w-md glass shadow-lift overflow-y-auto">
            <div className="sticky top-0 glass !border-0 !border-b border-line/60 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><Eye size={18} aria-hidden /></span>
                <div>
                  <h2 className="font-bold text-lg leading-tight">Comfort panel</h2>
                  <p className="text-xs text-muted">Saved to your account</p>
                </div>
              </div>
              <button className="btn-ghost !p-2" onClick={onClose} aria-label="Close comfort panel"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-7">
              <section>
                <h3 className="font-bold mb-3">Theme</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {THEMES.map((t) => (
                    <button key={t.value} onClick={() => setPrefs({ theme: t.value })} aria-pressed={prefs.theme === t.value}
                      className={`relative flex items-center gap-2.5 rounded-2xl border p-3 text-left transition ${prefs.theme === t.value ? "border-primary bg-primary/10 ring-2 ring-primary/30" : "border-line hover:bg-ink/5"}`}>
                      <span className="flex -space-x-1.5" aria-hidden>{t.swatch.map((s) => <span key={s} className="h-5 w-5 rounded-full border border-line" style={{ background: s }} />)}</span>
                      <span className="text-sm font-semibold flex items-center gap-1.5"><t.Icon size={14} />{t.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="font-bold mb-1">Text</h3>
                <label className="block py-2">
                  <span className="flex justify-between text-sm font-semibold mb-2">Text size <span className="text-muted tabular-nums">{prefs.fontScale}%</span></span>
                  <input type="range" min={100} max={150} step={5} value={prefs.fontScale} onChange={(e) => setPrefs({ fontScale: Number(e.target.value) })} className="w-full accent-[rgb(var(--primary))]" />
                </label>
                <label className="block py-2">
                  <span className="flex justify-between text-sm font-semibold mb-2">Line spacing <span className="text-muted tabular-nums">{prefs.lineHeight.toFixed(1)}</span></span>
                  <input type="range" min={1.5} max={1.9} step={0.1} value={prefs.lineHeight} onChange={(e) => setPrefs({ lineHeight: Number(e.target.value) })} className="w-full accent-[rgb(var(--primary))]" />
                </label>
                <Toggle checked={prefs.dyslexic} onChange={(v) => setPrefs({ dyslexic: v })} label="Dyslexia-friendly font" desc="Atkinson Hyperlegible with wider spacing." />
              </section>

              <section>
                <h3 className="font-bold mb-3">Motion</h3>
                <Segmented label="Motion" value={prefs.motion} onChange={(v) => setPrefs({ motion: v })} options={[{ value: "full", label: "Full" }, { value: "reduced", label: "Reduced" }, { value: "off", label: "Off" }]} />
                <p className="text-sm text-muted mt-2">Your system's reduce-motion setting is always respected.</p>
              </section>

              <section>
                <h3 className="font-bold mb-1">Eye care</h3>
                <Toggle checked={prefs.eveningCare} onChange={(v) => setPrefs({ eveningCare: v })} label="Evening eye-care" desc="Warms the screen after a set time." />
                {prefs.eveningCare && (
                  <label className="flex items-center justify-between py-2 text-sm">
                    <span className="font-semibold">Start at</span>
                    <select className="input !w-32 !py-1.5" value={prefs.eveningFrom} onChange={(e) => setPrefs({ eveningFrom: Number(e.target.value) })}>
                      {[17, 18, 19, 20, 21, 22, 23].map((h) => <option key={h} value={h}>{h > 12 ? h - 12 : h}:00 pm</option>)}
                    </select>
                  </label>
                )}
                <Toggle checked={prefs.eyeRest} onChange={(v) => setPrefs({ eyeRest: v })} label="20-20-20 reminders" desc="Every 20 minutes, look 20 feet away for 20 seconds." />
              </section>

              <section>
                <h3 className="font-bold mb-1">Sound</h3>
                <Toggle checked={prefs.sound} onChange={(v) => setPrefs({ sound: v })} label={prefs.sound ? "Sound effects on" : "Sound effects off"} desc="Soft game feedback tones. Off by default." />
                <div className="text-muted text-sm flex items-center gap-2">{prefs.sound ? <Volume2 size={14} /> : <VolumeX size={14} />} No background music plays automatically.</div>
              </section>

              <section>
                <h3 className="font-bold mb-3">3D quality</h3>
                <Segmented label="3D quality" value={prefs.quality} onChange={(v) => setPrefs({ quality: v })} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
                <p className="text-sm text-muted mt-2">ClassPulse also lowers quality on its own if the frame rate dips.</p>
              </section>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Gentle 20-20-20 reminder, only when enabled and the tab is visible. */
export function EyeRest() {
  const { prefs, toast } = useApp();
  useEffect(() => {
    if (!prefs.eyeRest) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") toast("Eye break: look at something 20 feet away for 20 seconds.", "info");
    }, 20 * 60_000);
    return () => clearInterval(t);
  }, [prefs.eyeRest, toast]);
  return null;
}

/** Focus mode with a Pomodoro timer. */
export function Pomodoro({ onExit }: { onExit: () => void }) {
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(true);
  const [phase, setPhase] = useState<"focus" | "break">("focus");
  const { toast } = useApp();
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => {
      if (l > 1) return l - 1;
      const next = phase === "focus" ? "break" : "focus";
      setPhase(next);
      toast(next === "break" ? "Focus block done. Take a 5 minute break." : "Break over. Back to focus.", "info");
      return next === "break" ? 5 * 60 : 25 * 60;
    }), 1000);
    return () => clearInterval(t);
  }, [running, phase, toast]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass rounded-2xl shadow-soft px-4 py-2 flex items-center gap-3">
      <span className={`chip ${phase === "focus" ? "bg-primary/15 text-primary" : "bg-good/15 text-good"}`}>{phase === "focus" ? "Focus" : "Break"}</span>
      <span className="font-display font-bold text-lg tabular-nums" aria-live="off">{mm}:{ss}</span>
      <button className="btn-ghost !px-2 !py-1 text-sm" onClick={() => setRunning((r) => !r)}>{running ? "Pause" : "Resume"}</button>
      <button className="btn-ghost !px-2 !py-1 text-sm" onClick={onExit}>Exit focus</button>
    </motion.div>
  );
}
