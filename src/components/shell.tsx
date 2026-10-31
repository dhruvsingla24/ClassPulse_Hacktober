"use client";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Box, BookOpen, CalendarClock, ChevronsLeft, ClipboardCheck, Coins, Eye, Flame, Gamepad2, GraduationCap, HelpCircle,
  Home, LayoutDashboard, LogOut, MessageCircleQuestion, Package, Plus, Search, Settings, ShoppingBag, Target, User, Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import type { PublicUser, Role } from "@/lib/types";
import { ComfortPanel, EyeRest, Pomodoro } from "./comfort";
import { useApp } from "./providers";
import { Avatar } from "./ui";

type Item = { href: string; label: string; Icon: import("lucide-react").LucideIcon };

const NAV: Record<Role, Item[]> = {
  student: [
    { href: "/app", label: "Home", Icon: Home },
    { href: "/app/classroom", label: "3D Classroom", Icon: Box },
    { href: "/app/library", label: "Library", Icon: BookOpen },
    { href: "/app/arcade", label: "Learning Arcade", Icon: Gamepad2 },
    { href: "/app/doubts", label: "Doubt Lab", Icon: MessageCircleQuestion },
    { href: "/app/faq", label: "FAQ & Heatmap", Icon: HelpCircle },
    { href: "/app/assignments", label: "Assignments", Icon: ClipboardCheck },
    { href: "/app/meetings", label: "Meetings", Icon: CalendarClock },
    { href: "/app/shop", label: "Coin Shop", Icon: ShoppingBag },
    { href: "/app/open-pack", label: "Open Pack", Icon: Package },
  ],
  teacher: [
    { href: "/app", label: "Dashboard", Icon: LayoutDashboard },
    { href: "/app/classroom", label: "Teacher's Lounge 3D", Icon: Box },
    { href: "/app/students", label: "Students", Icon: Users },
    { href: "/app/attendance", label: "Attendance", Icon: Target },
    { href: "/app/assignments", label: "Assignments", Icon: ClipboardCheck },
    { href: "/app/doubts", label: "Doubt Lab", Icon: MessageCircleQuestion },
    { href: "/app/faq", label: "FAQ & Heatmap", Icon: HelpCircle },
    { href: "/app/library", label: "Lectures", Icon: BookOpen },
    { href: "/app/meetings", label: "Meetings", Icon: CalendarClock },
    { href: "/app/open-pack", label: "Open Pack", Icon: Package },
  ],
  parent: [
    { href: "/app", label: "My child", Icon: Home },
    { href: "/app/meetings", label: "Meetings", Icon: CalendarClock },
  ],
  admin: [
    { href: "/app", label: "Admin", Icon: LayoutDashboard },
    { href: "/app/students", label: "Students", Icon: Users },
    { href: "/app/open-pack", label: "Open Pack", Icon: Package },
  ],
};

const MOBILE: Record<Role, Item[]> = {
  student: [
    { href: "/app", label: "Home", Icon: Home },
    { href: "/app/library", label: "Learn", Icon: BookOpen },
    { href: "/app/arcade", label: "Arcade", Icon: Gamepad2 },
    { href: "/app/doubts", label: "Doubts", Icon: MessageCircleQuestion },
    { href: "/app/profile", label: "Profile", Icon: User },
  ],
  teacher: [
    { href: "/app", label: "Home", Icon: Home },
    { href: "/app/students", label: "Students", Icon: Users },
    { href: "/app/doubts", label: "Doubts", Icon: MessageCircleQuestion },
    { href: "/app/assignments", label: "Work", Icon: ClipboardCheck },
    { href: "/app/settings", label: "Settings", Icon: Settings },
  ],
  parent: [
    { href: "/app", label: "Home", Icon: Home },
    { href: "/app/meetings", label: "Meetings", Icon: CalendarClock },
    { href: "/app/settings", label: "Settings", Icon: Settings },
  ],
  admin: [
    { href: "/app", label: "Home", Icon: Home },
    { href: "/app/students", label: "Students", Icon: Users },
    { href: "/app/settings", label: "Settings", Icon: Settings },
  ],
};

const isActive = (path: string, href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));

export function Shell({ user, children }: { user: PublicUser; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { me, refreshMe } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [comfort, setComfort] = useState(false);
  const [palette, setPalette] = useState(false);
  const [focus, setFocus] = useState(false);
  const nav = NAV[user.role];

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("cp_sidebar") === "1"); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
    };
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, []);
  useEffect(() => { refreshMe(); }, [path, refreshMe]);

  const toggleCollapse = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("cp_sidebar", c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });
  };

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    await refreshMe();
    router.push("/");
  };

  return (
    <div className="min-h-dvh bg-mesh">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] btn-primary">Skip to content</a>
      <EyeRest />

      {/* Sidebar (desktop & tablet) */}
      {!focus && (
        <aside className={`hidden md:flex fixed inset-y-0 left-0 z-40 flex-col border-r border-line/60 glass transition-[width] duration-300 ${collapsed ? "w-[76px]" : "w-[76px] lg:w-64"}`} aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2.5 px-4 h-16 shrink-0" aria-label="ClassPulse campus">
            <motion.span whileHover={{ rotate: -8, scale: 1.05 }} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-ink shadow-clay">
              <GraduationCap size={20} aria-hidden />
            </motion.span>
            <span className={`font-display font-extrabold text-lg ${collapsed ? "hidden" : "hidden lg:block"}`}>ClassPulse</span>
          </Link>
          <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
            {nav.map((n) => {
              const active = isActive(path, n.href);
              return (
                <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} title={n.label}
                  className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.95rem] font-semibold transition-colors ${active ? "text-primary" : "text-muted hover:text-ink hover:bg-ink/5"}`}>
                  {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-primary/10" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                  <n.Icon size={19} className="relative shrink-0" aria-hidden />
                  <span className={`relative truncate ${collapsed ? "sr-only" : "sr-only lg:not-sr-only"}`}>{n.label}</span>
                </Link>
              );
            })}
          </nav>
          <button onClick={toggleCollapse} className="hidden lg:flex items-center gap-3 mx-3 mb-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-ink/5" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            <ChevronsLeft size={18} className={`transition-transform ${collapsed ? "rotate-180" : ""}`} aria-hidden />
            {!collapsed && "Collapse"}
          </button>
        </aside>
      )}

      <div className={`${focus ? "" : collapsed ? "md:pl-[76px]" : "md:pl-[76px] lg:pl-64"} transition-[padding] duration-300`}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 glass !border-x-0 !border-t-0">
          <div className="flex h-16 items-center gap-2 px-4 md:px-6">
            {focus ? (
              <div className="flex-1 flex justify-center"><Pomodoro onExit={() => setFocus(false)} /></div>
            ) : (
              <>
                <button onClick={() => setPalette(true)} className="flex flex-1 min-w-0 max-w-md items-center gap-2.5 rounded-xl border border-line bg-raised/70 px-3.5 py-2 text-left text-muted hover:border-primary/40 transition">
                  <Search size={17} aria-hidden />
                  <span className="flex-1 truncate text-sm">Search or jump to…</span>
                  <kbd className="hidden sm:inline rounded-md border border-line px-1.5 text-xs">⌘K</kbd>
                </button>
                <div className="ml-auto flex items-center gap-0.5 sm:gap-1.5 shrink-0">
                  {user.role === "student" && me?.coins !== undefined && (
                    <div className="hidden sm:flex items-center gap-1.5">
                      <Link href="/app/shop" className="chip bg-warn/15 text-warn !py-1.5" title="Coins"><Coins size={14} aria-hidden /><span className="tabular-nums">{me.coins}</span><span className="sr-only">coins</span></Link>
                      <Link href="/app/profile" className="chip bg-accent/15 text-accent !py-1.5" title="Day streak"><Flame size={14} aria-hidden /><span className="tabular-nums">{me.streak?.current ?? 0}</span><span className="sr-only">day streak</span></Link>
                    </div>
                  )}
                  <button className="btn-ghost !p-2.5 hidden sm:inline-flex" onClick={() => setFocus(true)} aria-label="Start focus mode" title="Focus mode"><Target size={19} /></button>
                  <button className="btn-ghost !p-2.5" onClick={() => setComfort(true)} aria-label="Open comfort panel" title="Comfort panel"><Eye size={19} /></button>
                  <Notifications unread={me?.unread ?? 0} onRead={refreshMe} />
                  <ProfileMenu user={user} onLogout={logout} />
                </div>
              </>
            )}
          </div>
        </header>

        <main id="main" className={`mx-auto w-full max-w-[1400px] px-4 md:px-6 lg:px-8 py-6 md:py-8 ${focus ? "" : "pb-28 md:pb-10"}`}>
          <motion.div key={path} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}>
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile bottom tabs + quick action */}
      {!focus && (
        <>
          <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass !border-x-0 !border-b-0 pb-[env(safe-area-inset-bottom)]" aria-label="Main">
            <ul className="flex justify-around">
              {MOBILE[user.role].map((n) => {
                const active = isActive(path, n.href);
                return (
                  <li key={n.href}>
                    <Link href={n.href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center gap-0.5 px-3 py-2.5 text-[0.7rem] font-semibold ${active ? "text-primary" : "text-muted"}`}>
                      <n.Icon size={21} aria-hidden />{n.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {user.role === "student" && (
            <Link href="/app/doubts/new" aria-label="Ask a doubt" className="md:hidden fixed right-4 bottom-[84px] z-40 grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-ink shadow-lift active:scale-95 transition">
              <Plus size={24} />
            </Link>
          )}
        </>
      )}

      <ComfortPanel open={comfort} onClose={() => setComfort(false)} />
      <CommandPalette open={palette} onClose={() => setPalette(false)} items={[...nav, { href: "/app/profile", label: "Profile", Icon: User }, { href: "/app/settings", label: "Settings & privacy", Icon: Settings }, { href: "/", label: "3D Campus", Icon: GraduationCap }]} />
    </div>
  );
}

function Notifications({ unread, onRead }: { unread: number; onRead: () => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<{ id: string; text: string; href: string; read: boolean; at: string }[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    api<{ notifications: typeof list }>("/api/notifications").then((r) => setList(r.notifications));
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); removeEventListener("keydown", esc); };
  }, [open]);
  const markAll = async () => {
    await api("/api/notifications", { method: "POST" });
    setList((l) => l?.map((n) => ({ ...n, read: true })) ?? null);
    onRead();
  };
  return (
    <div className="relative" ref={ref}>
      <button className="btn-ghost !p-2.5 relative" onClick={() => setOpen((o) => !o)} aria-label={`Notifications, ${unread} unread`} aria-expanded={open}>
        <Bell size={19} />
        {unread > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] rounded-full bg-bad text-[10px] font-bold text-white grid place-items-center px-1">{unread > 9 ? "9+" : unread}</motion.span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-[min(92vw,380px)] glass rounded-2xl shadow-lift overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/60">
              <h2 className="font-bold">Notifications</h2>
              <button className="text-sm text-primary font-semibold" onClick={markAll}>Mark all read</button>
            </div>
            <ul className="max-h-96 overflow-y-auto">
              {!list && <li className="p-4"><div className="skeleton h-10" /></li>}
              {list?.length === 0 && <li className="p-6 text-center text-muted text-sm">You're all caught up.</li>}
              {list?.map((n) => (
                <li key={n.id}>
                  <Link href={n.href} onClick={() => setOpen(false)} className="flex gap-3 px-4 py-3 hover:bg-ink/5">
                    <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.read ? "bg-transparent" : "bg-primary"}`} aria-hidden />
                    <span className="text-sm flex-1">{n.text}<span className="block text-xs text-muted">{timeAgo(n.at)}{!n.read && " · new"}</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu({ user, onLogout }: { user: PublicUser; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-xl p-1 hover:bg-ink/5" aria-label="Account menu" aria-expanded={open}>
        <Avatar name={user.name} hue={user.avatar} size={34} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute right-0 mt-2 w-60 glass rounded-2xl shadow-lift p-2">
            <div className="px-3 py-2">
              <div className="font-bold truncate">{user.name}</div>
              <div className="text-xs text-muted capitalize">{user.role}{user.roll ? ` · ${user.roll}` : ""}</div>
            </div>
            {[
              { href: "/app/profile", label: "Profile & progress", Icon: User },
              { href: "/app/settings", label: "Settings & privacy", Icon: Settings },
              { href: "/", label: "Back to 3D campus", Icon: GraduationCap },
            ].map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm hover:bg-ink/5"><i.Icon size={16} aria-hidden />{i.label}</Link>
            ))}
            <button onClick={onLogout} className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-bad hover:bg-bad/10"><LogOut size={16} aria-hidden />Sign out</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CommandPalette({ open, onClose, items }: { open: boolean; onClose: () => void; items: Item[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ type: string; title: string; href: string }[]>([]);
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(() => api<{ results: typeof results }>(`/api/search?q=${encodeURIComponent(q)}`).then((r) => setResults(r.results)).catch(() => {}), 160);
    return () => clearTimeout(t);
  }, [q]);
  const all = useMemo(() => {
    const pages = items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase())).map((i) => ({ type: "Go to", title: i.label, href: i.href }));
    return [...pages, ...results];
  }, [items, q, results]);
  const go = useCallback((href: string) => { onClose(); router.push(href); }, [onClose, router]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[88] flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
          <motion.div role="dialog" aria-modal="true" aria-label="Command palette" initial={{ y: -12, scale: 0.98 }} animate={{ y: 0, scale: 1 }} className="relative w-full max-w-xl glass rounded-3xl shadow-lift overflow-hidden">
            <div className="flex items-center gap-3 px-5 border-b border-line/60">
              <Search size={18} className="text-muted" aria-hidden />
              <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setIdx(0); }} placeholder="Search lectures, doubts, assignments, FAQs…"
                className="flex-1 bg-transparent py-4 outline-none" aria-label="Search" role="combobox" aria-expanded aria-controls="cp-results"
                onKeyDown={(e) => {
                  if (e.key === "Escape") onClose();
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(all.length - 1, i + 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
                  if (e.key === "Enter" && all[idx]) go(all[idx].href);
                }} />
              <kbd className="rounded-md border border-line px-1.5 text-xs text-muted">Esc</kbd>
            </div>
            <ul id="cp-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
              {all.length === 0 && <li className="px-4 py-8 text-center text-muted text-sm">No matches. Try a topic like "matrices" or "binary search".</li>}
              {all.map((r, i) => (
                <li key={r.type + r.href + r.title} role="option" aria-selected={i === idx}>
                  <button onMouseEnter={() => setIdx(i)} onClick={() => go(r.href)} className={`w-full flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left ${i === idx ? "bg-primary/10 text-primary" : ""}`}>
                    <span className="truncate font-medium">{r.title}</span>
                    <span className="chip bg-ink/5 text-muted shrink-0">{r.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
