"use client";
import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import { AlertTriangle, CheckCircle2, Circle, Clock, Eye, MessageCircle, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { DoubtStatus } from "@/lib/types";

export function PageHeader({ title, desc, action, crumbs }: { title: string; desc?: string; action?: React.ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <header className="mb-6 md:mb-8">
      {crumbs && (
        <nav aria-label="Breadcrumb" className="mb-2 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => (
              <li key={i} className="flex items-center gap-1.5">
                {c.href ? <Link href={c.href} className="hover:text-ink underline-offset-4 hover:underline">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                {i < crumbs.length - 1 && <span aria-hidden>/</span>}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-3xl font-extrabold">{title}</motion.h1>
          {desc && <p className="mt-1.5 text-muted max-w-2xl">{desc}</p>}
        </div>
        {action && <div className="flex flex-wrap gap-2">{action}</div>}
      </div>
    </header>
  );
}

export const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
export const rise = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } };

export function Grid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className={`grid gap-4 md:gap-5 ${className}`}>
      {children}
    </motion.div>
  );
}

export function Card({ children, className = "", hover = false, as = "section", id }: { children: React.ReactNode; className?: string; hover?: boolean; as?: "section" | "div" | "article"; id?: string }) {
  const M = motion[as];
  return <M id={id} variants={rise} className={`card p-5 scroll-mt-24 ${hover ? "card-hover" : ""} ${className}`}>{children}</M>;
}

export function CardTitle({ icon: Icon, children, action }: { icon?: import("lucide-react").LucideIcon; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-base font-bold">
        {Icon && <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary"><Icon size={17} aria-hidden /></span>}
        {children}
      </h2>
      {action}
    </div>
  );
}

export function CountUp({ value, suffix = "", duration = 1 }: { value: number; suffix?: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (document.documentElement.dataset.motion !== "full") { setV(value); return; }
    const c = animate(0, value, { duration, ease: [0.22, 1, 0.36, 1], onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, value, duration]);
  return <span ref={ref} className="tabular-nums">{v}{suffix}</span>;
}

export function Stat({ label, value, suffix, icon: Icon, tone = "primary", href, sub }: { label: string; value: number; suffix?: string; icon: import("lucide-react").LucideIcon; tone?: "primary" | "accent" | "good" | "warn" | "bad"; href?: string; sub?: string }) {
  const tones = { primary: "bg-primary/10 text-primary", accent: "bg-accent/10 text-accent", good: "bg-good/10 text-good", warn: "bg-warn/10 text-warn", bad: "bg-bad/10 text-bad" };
  const inner = (
    <>
      <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tones[tone]}`}><Icon size={20} aria-hidden /></span>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold font-display leading-tight"><CountUp value={value} suffix={suffix} /></div>
        <div className="text-sm text-muted leading-tight">{label}</div>
        {sub && <div className="text-xs text-muted/90 mt-0.5">{sub}</div>}
      </div>
    </>
  );
  return (
    <motion.div variants={rise} className="card card-hover p-4">
      {href ? <Link href={href} className="flex items-center gap-3.5 rounded-xl">{inner}</Link> : <div className="flex items-center gap-3.5">{inner}</div>}
    </motion.div>
  );
}

export function Ring({ value, size = 64, stroke = 7, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(value)}%`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--ink) / 0.08)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--primary))" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - Math.min(100, value) / 100) }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-ink font-bold" style={{ fontSize: size * 0.24 }}>{Math.round(value)}%</text>
    </svg>
  );
}

export function Bar({ value, className = "", color }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-2 rounded-full bg-ink/10 overflow-hidden ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className="h-full rounded-full" style={{ background: color ?? "rgb(var(--primary))" }} initial={{ width: 0 }} animate={{ width: `${Math.min(100, value)}%` }} transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-64 mb-3" />
      <Skeleton className="h-5 w-96 max-w-full mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      <div className="grid lg:grid-cols-3 gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }: { icon: import("lucide-react").LucideIcon; title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-primary/15 blur-xl" aria-hidden />
        <div className="relative grid h-16 w-16 place-items-center rounded-3xl bg-primary/10 text-primary shadow-clay animate-floaty"><Icon size={28} aria-hidden /></div>
      </div>
      <h3 className="font-bold text-lg">{title}</h3>
      {text && <p className="text-muted mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, retry }: { error: string; retry?: () => void }) {
  return (
    <div role="alert" className="card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-bad/10 text-bad"><AlertTriangle aria-hidden /></span>
      <div className="flex-1">
        <h3 className="font-bold">We couldn't load this</h3>
        <p className="text-muted text-sm">{error}</p>
      </div>
      {retry && <button className="btn-outline" onClick={retry}><RotateCcw size={16} aria-hidden /> Try again</button>}
    </div>
  );
}

const STATUS: Record<DoubtStatus, { label: string; cls: string; Icon: import("lucide-react").LucideIcon }> = {
  pending: { label: "Pending", cls: "bg-warn/15 text-warn", Icon: Clock },
  reviewing: { label: "Teacher reviewing", cls: "bg-primary/15 text-primary", Icon: Eye },
  answered: { label: "Answered", cls: "bg-accent/15 text-accent", Icon: MessageCircle },
  "next-class": { label: "Discuss in next class", cls: "bg-ink/10 text-ink", Icon: Circle },
  resolved: { label: "Resolved", cls: "bg-good/15 text-good", Icon: CheckCircle2 },
};

/** Status always shows an icon and a label, never colour alone. */
export function StatusBadge({ status }: { status: DoubtStatus }) {
  const s = STATUS[status];
  return <span className={`chip ${s.cls}`}><s.Icon size={13} aria-hidden />{s.label}</span>;
}

export function Avatar({ name, hue, size = 36 }: { name: string; hue?: string; size?: number }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  const h = Number(hue ?? [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360);
  return (
    <span aria-hidden className="inline-grid place-items-center rounded-full font-bold text-white shrink-0 shadow-clay"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, hsl(${h} 45% 55%), hsl(${(h + 40) % 360} 50% 45%))` }}>
      {initials}
    </span>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", k);
    setTimeout(() => ref.current?.querySelector<HTMLElement>("input,textarea,select,button")?.focus(), 50);
    return () => { removeEventListener("keydown", k); prev?.focus(); };
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[80] grid place-items-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div ref={ref} role="dialog" aria-modal="true" aria-label={title} initial={{ y: 24, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, opacity: 0 }}
            className={`relative glass rounded-3xl shadow-lift w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] overflow-auto p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{title}</h2>
              <button className="btn-ghost !p-2" onClick={onClose} aria-label="Close"><X size={18} /></button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl bg-ink/5 p-1 gap-1">
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={`relative rounded-lg px-3 py-1.5 text-sm font-semibold transition ${value === o.value ? "text-primary-ink" : "text-muted hover:text-ink"}`}>
          {value === o.value && <motion.span layoutId={"seg-" + label} className="absolute inset-0 rounded-lg bg-primary shadow-clay" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
