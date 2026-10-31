"use client";
import { motion } from "framer-motion";
import { GraduationCap, KeyRound, Loader2, LogIn, Presentation, Shield, Users, X } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/client";
import type { DoorDef } from "./corridor";

const DEMOS = [
  { label: "Student · Aarav", email: "aarav@classpulse.dev", Icon: GraduationCap },
  { label: "Teacher · Ms. Rao", email: "teacher@classpulse.dev", Icon: Presentation },
  { label: "Parent · Neha", email: "parent@classpulse.dev", Icon: Users },
  { label: "Admin", email: "admin@classpulse.dev", Icon: Shield },
];

export function LoginForm({ door, onSignedIn }: { door?: DoorDef | null; onSignedIn: (role: string, note: string | null) => void }) {
  const [email, setEmail] = useState(door?.id === "teacher" ? "teacher@classpulse.dev" : "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reset, setReset] = useState(false);
  const [shake, setShake] = useState(0);

  const submit = async (e?: React.FormEvent, override?: { email: string; password: string }) => {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const doorKind = door?.id === "teacher" ? "teacher" : door?.id === "student" ? "student" : undefined;
      const r = await api<{ user: { role: string }; note: string | null }>("/api/auth/login", { body: { ...(override ?? { email, password }), door: doorKind } });
      onSignedIn(r.user.role, r.note);
    } catch (err) {
      setError((err as Error).message);
      setShake((s) => s + 1);
    } finally {
      setBusy(false);
    }
  };

  return (
    <motion.div key={shake} animate={shake ? { x: [0, -8, 8, -5, 5, 0] } : undefined} transition={{ duration: 0.35 }}>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
        </label>
        <label className="block">
          <span className="label">Password</span>
          <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </label>
        {error && <p role="alert" className="text-sm text-bad font-semibold">{error}</p>}
        <button className="btn-primary w-full !py-3" disabled={busy}>
          {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <LogIn size={18} aria-hidden />} Sign in
        </button>
        <button type="button" className="text-sm text-primary font-semibold flex items-center gap-1.5 mx-auto" onClick={() => setReset((r) => !r)}>
          <KeyRound size={14} aria-hidden /> Forgot password?
        </button>
        {reset && (
          <p className="text-sm text-muted bg-ink/5 rounded-xl p-3">
            Password reset emails need an email provider, which this demo build doesn't have configured. Every demo account uses the password <strong className="text-ink">demo1234</strong>.
          </p>
        )}
      </form>
      <div className="mt-5">
        <div className="flex items-center gap-3 text-xs text-muted uppercase tracking-wider font-semibold mb-3"><span className="h-px flex-1 bg-line" />Demo accounts<span className="h-px flex-1 bg-line" /></div>
        <div className="grid grid-cols-2 gap-2">
          {DEMOS.map((d) => (
            <button key={d.email} type="button" disabled={busy} onClick={() => { setEmail(d.email); setPassword("demo1234"); submit(undefined, { email: d.email, password: "demo1234" }); }}
              className="btn-outline !justify-start text-sm !px-3"><d.Icon size={16} aria-hidden className="text-primary" />{d.label}</button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function LoginPanel({ door, onClose, onSignedIn }: { door: DoorDef; onClose: () => void; onSignedIn: (role: string, note: string | null) => void }) {
  return (
    <motion.div className="absolute inset-0 z-20 grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/25" onClick={onClose} aria-hidden />
      <motion.div role="dialog" aria-modal="true" aria-label={`Sign in to ${door.label}`} initial={{ y: 30, scale: 0.94, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="relative w-full max-w-md glass rounded-[28px] shadow-lift p-6 md:p-7 text-ink max-h-[92vh] overflow-y-auto">
        <button className="absolute right-4 top-4 btn-ghost !p-2" onClick={onClose} aria-label="Back to corridor"><X size={18} /></button>
        <span className="chip mb-3" style={{ background: door.color + "22", color: door.color }}>{door.sub}</span>
        <h2 className="text-2xl font-extrabold">{door.id === "teacher" ? "Teacher's Lounge" : door.id === "student" ? "Student Classroom" : `Sign in to enter the ${door.label.toLowerCase()}`}</h2>
        <p className="text-muted mt-1 mb-5 text-sm">The door you pick is just the scenery. You'll always land in the space that matches your account.</p>
        <LoginForm door={door} onSignedIn={onSignedIn} />
      </motion.div>
    </motion.div>
  );
}
