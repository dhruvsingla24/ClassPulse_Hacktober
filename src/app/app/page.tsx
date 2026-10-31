"use client";
import { motion } from "framer-motion";
import {
  AlertTriangle, Award, BookOpen, CalendarClock, CheckCircle2, ClipboardCheck, Coins, Flame, Gamepad2, HeartPulse, Lightbulb,
  ListChecks, Megaphone, MessageCircleQuestion, Pin, RotateCcw, School, Sparkles, Target, TrendingUp, Users, Video,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Bar as RBar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DailyChallenge } from "@/components/daily";
import { Heatmap } from "@/components/heatmap";
import { useApp } from "@/components/providers";
import { Bar, Card, CardTitle, Empty, ErrorState, Grid, PageHeader, PageSkeleton, Ring, Stat } from "@/components/ui";
import { api, dueIn, fmtDateTime, useApi } from "@/lib/client";

type Any = any;

export default function Dashboard() {
  const { data, error, loading, reload } = useApi<Any>("/api/dashboard");
  const { me } = useApp();
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? "No data"} retry={reload} />;
  if (data.role === "student") return <StudentHome d={data} name={me?.user?.name ?? ""} reload={reload} />;
  if (data.role === "teacher") return <TeacherHome d={data} name={me?.user?.name ?? ""} reload={reload} />;
  if (data.role === "parent") return <ParentHome d={data} />;
  return <AdminHome d={data} />;
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function StudentHome({ d, name, reload }: { d: Any; name: string; reload: () => void }) {
  const { me } = useApp();
  const next = d.meetings[0];
  const pending = d.assignments.filter((a: Any) => !a.submission || a.submission.status === "resubmit");
  return (
    <>
      <PageHeader title={`${greeting()}, ${name.split(" ")[0]}`} desc="Here's your day. One thing at a time." action={<Link href="/app/classroom" className="btn-soft"><School size={17} aria-hidden /> Enter 3D classroom</Link>} />
      <Grid className="grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Coins" value={me?.coins ?? 0} icon={Coins} tone="warn" href="/app/shop" />
        <Stat label="Day streak" value={me?.streak?.current ?? 0} icon={Flame} tone="accent" href="/app/profile" sub={me?.streak?.activeToday ? "Done for today" : "Keep it alive today"} />
        <Stat label="Attendance" value={d.attendance} suffix="%" icon={CheckCircle2} tone="good" />
        <Stat label="Average score" value={d.average} suffix="%" icon={TrendingUp} />
      </Grid>
      <Grid className="md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" aria-hidden />
          <CardTitle icon={Lightbulb}>What should I do next?</CardTitle>
          {d.recommendations.length === 0 ? <Empty icon={Sparkles} title="You're on top of everything" text="Nothing urgent. Explore the Arcade for fun practice." /> : (
            <ul className="space-y-2.5">
              {d.recommendations.map((r: Any, i: number) => (
                <motion.li key={r.title} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.07 }}>
                  <Link href={r.href} className="group flex items-start gap-3 rounded-2xl border border-line/70 bg-raised p-3.5 hover:border-primary/40 hover:shadow-soft transition">
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-ink text-sm font-bold">{i + 1}</span>
                    <span className="flex-1"><span className="font-semibold group-hover:text-primary transition-colors">{r.title}</span><span className="block text-sm text-muted">Why: {r.why}</span></span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardTitle icon={Video}>Next live class</CardTitle>
          {next ? (
            <div>
              <p className="font-bold text-lg">{next.title}</p>
              <p className="text-muted text-sm">{fmtDateTime(next.at)} · {next.minutes} min</p>
              <Countdown at={next.at} />
              <a href={`https://meet.jit.si/${next.room}`} target="_blank" rel="noreferrer" className="btn-primary w-full mt-4"><Video size={17} aria-hidden /> Join on Jitsi</a>
            </div>
          ) : <Empty icon={CalendarClock} title="No classes scheduled" />}
        </Card>

        <Card id="daily" className="md:col-span-2"><DailyChallenge done={d.dailyDone} onDone={reload} /></Card>
        <Card>
          <CardTitle icon={ListChecks}>Today's missions</CardTitle>
          <ul className="space-y-3">
            {d.missions.map((m: Any) => (
              <li key={m.label} className="flex items-center gap-3">
                <span className={`grid h-7 w-7 place-items-center rounded-full ${m.done ? "bg-good text-white" : "border-2 border-line"}`}>{m.done && <CheckCircle2 size={16} aria-hidden />}</span>
                <span className={m.done ? "line-through text-muted" : "font-medium"}>{m.label}</span>
                <span className="sr-only">{m.done ? "done" : "not done"}</span>
              </li>
            ))}
          </ul>
          <Link href="/app/arcade" className="btn-soft w-full mt-5"><Gamepad2 size={17} aria-hidden /> Open the Arcade</Link>
        </Card>

        <Card className="md:col-span-2">
          <CardTitle icon={BookOpen}>Subject progress</CardTitle>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
            {d.subjects.map((s: Any) => (
              <div key={s.subjectId}>
                <div className="flex justify-between text-sm mb-1.5"><span className="font-semibold">{s.name}</span><span className="tabular-nums text-muted">{s.avg}% {s.trend !== 0 && <span className={s.trend > 0 ? "text-good" : "text-bad"}>{s.trend > 0 ? "▲" : "▼"} {Math.abs(s.trend)}</span>}</span></div>
                <Bar value={s.avg} color={s.color} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle icon={ClipboardCheck} action={<Link href="/app/assignments" className="text-sm text-primary font-semibold">All</Link>}>Assignments</CardTitle>
          {pending.length === 0 ? <Empty icon={CheckCircle2} title="All submitted" /> : (
            <ul className="space-y-2.5">
              {pending.slice(0, 4).map((a: Any) => (
                <li key={a.id}><Link href="/app/assignments" className="block rounded-xl p-2.5 hover:bg-ink/5">
                  <span className="font-semibold block">{a.title}</span>
                  <span className={`text-sm ${new Date(a.due) < new Date() ? "text-bad" : "text-muted"}`}>{a.submission?.status === "resubmit" ? "Resubmission requested · " : ""}{dueIn(a.due)}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="md:col-span-2">
          <CardTitle icon={Flame}>Consistency calendar</CardTitle>
          <Heatmap days={d.activity} />
        </Card>
        <Card>
          <CardTitle icon={Megaphone}>Announcements</CardTitle>
          <ul className="space-y-3">
            {d.announcements.slice(0, 3).map((a: Any) => (
              <li key={a.id} className="text-sm flex gap-2">{a.pinned && <Pin size={14} className="text-accent shrink-0 mt-1" aria-label="Pinned" />}<span>{a.text}</span></li>
            ))}
          </ul>
          {d.achievements.length > 0 && (
            <div className="mt-5 pt-4 border-t border-line/60">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-1.5"><Award size={15} aria-hidden /> Achievements</h3>
              <div className="flex flex-wrap gap-1.5">{d.achievements.map((a: Any) => <span key={a.key} className="chip bg-warn/15 text-warn" title={a.desc}>{a.name}</span>)}</div>
            </div>
          )}
        </Card>
      </Grid>
    </>
  );
}

function Countdown({ at }: { at: string }) {
  const ms = new Date(at).getTime() - Date.now();
  const h = Math.floor(ms / 36e5);
  const m = Math.floor((ms % 36e5) / 6e4);
  return <p className="mt-3 font-display text-3xl font-extrabold tabular-nums">{h > 48 ? `${Math.round(h / 24)} days` : `${h}h ${m}m`}<span className="text-sm font-semibold text-muted ml-2">to go</span></p>;
}

const tipStyle = { background: "rgb(var(--raised))", border: "1px solid rgb(var(--line))", borderRadius: 12, color: "rgb(var(--ink))" };

function TeacherHome({ d, name, reload }: { d: Any; name: string; reload: () => void }) {
  const { toast } = useApp();
  const [text, setText] = useState("");
  const post = async () => {
    if (text.trim().length < 3) return;
    await api("/api/announcements", { body: { text, pinned: false } });
    setText("");
    toast("Announcement posted to the class.");
    reload();
  };
  return (
    <>
      <PageHeader title={`${greeting()}, ${name.split(" ")[0]}`} desc="Class 10A at a glance, from live data." action={<><Link href="/app/assignments" className="btn-primary"><ClipboardCheck size={17} aria-hidden /> New assignment</Link><Link href="/app/attendance" className="btn-outline"><Target size={17} aria-hidden /> Take attendance</Link></>} />
      <Grid className="grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Students" value={d.totals.students} icon={Users} href="/app/students" sub={`${d.totals.classrooms} classroom · ${d.totals.subjects} subjects`} />
        <Stat label="Avg attendance" value={d.totals.attendance} suffix="%" icon={CheckCircle2} tone="good" href="/app/attendance" />
        <Stat label="To grade" value={d.totals.pendingSubmissions} icon={ClipboardCheck} tone="accent" href="/app/assignments" />
        <Stat label="Pending doubts" value={d.totals.pendingDoubts} icon={MessageCircleQuestion} tone="warn" href="/app/doubts" />
      </Grid>
      <Grid className="md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle icon={ListChecks}>Today at a glance</CardTitle>
          {d.todo.length === 0 ? <Empty icon={CheckCircle2} title="Inbox zero" text="Nothing needs you right now." /> : (
            <ol className="space-y-2">
              {d.todo.map((t: Any) => (
                <li key={t.text}><Link href={t.href} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-ink/5">
                  <span className={`chip ${t.priority === "high" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"}`}>{t.priority === "high" ? <AlertTriangle size={12} aria-hidden /> : null}{t.priority}</span>
                  <span className="font-medium">{t.text}</span>
                </Link></li>
              ))}
            </ol>
          )}
        </Card>
        <Card>
          <CardTitle icon={HeartPulse}>Class health score</CardTitle>
          <div className="flex items-center gap-5">
            <Ring value={d.health.score} size={96} stroke={9} label={`Class health ${d.health.score} out of 100`} />
            <div className="text-sm space-y-1">
              <p>Attendance <b>{d.health.attendance}%</b></p>
              <p>Average marks <b>{d.health.average}%</b></p>
              <p>Active this week <b>{d.health.engagement}%</b></p>
            </div>
          </div>
          <p className="text-xs text-muted mt-4"><b>How it's calculated:</b> {d.health.explain}</p>
        </Card>
        <Card>
          <CardTitle icon={AlertTriangle} action={<Link href="/app/students" className="text-sm text-primary font-semibold">All</Link>}>Needs attention</CardTitle>
          {d.attention.length === 0 ? <Empty icon={CheckCircle2} title="Everyone's on track" /> : (
            <ul className="space-y-2.5">
              {d.attention.slice(0, 4).map((s: Any) => (
                <li key={s.id}><Link href={`/app/students/${s.id}`} className="block rounded-xl p-2.5 hover:bg-ink/5">
                  <span className="font-semibold">{s.name}</span> <span className="text-xs text-muted">{s.roll}</span>
                  <span className="block text-xs text-muted mt-0.5" title={s.flags.map((f: Any) => f.rule).join("\n")}>{s.flags.map((f: Any) => f.label).join(" · ")}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="md:col-span-2">
          <CardTitle icon={TrendingUp}>Engagement, last 14 days</CardTitle>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={d.trend} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle} />
                <Line type="monotone" dataKey="active" name="Active students" stroke="rgb(var(--primary))" strokeWidth={3} dot={false} animationDuration={1200} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle icon={BookOpen}>Subject performance</CardTitle>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={d.subjectPerf} layout="vertical" margin={{ left: 10, right: 16 }}>
                <XAxis type="number" domain={[0, 100]} hide />
                <YAxis type="category" dataKey="name" width={96} tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tipStyle} formatter={(v) => [`${v}%`, "Average"]} />
                <RBar dataKey="avg" radius={[0, 8, 8, 0]} animationDuration={1100} label={{ position: "right", fill: "rgb(var(--ink))", fontSize: 12, formatter: (v: number) => `${v}%` }}>
                  {d.subjectPerf.map((s: Any) => <Cell key={s.name} fill={s.color} />)}
                </RBar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle icon={MessageCircleQuestion} action={<Link href="/app/faq" className="text-sm text-primary font-semibold">Heatmap</Link>}>Most confusing topics</CardTitle>
          <ul className="space-y-3">
            {d.heatmap.map((h: Any) => (
              <li key={h.subjectId + h.topic}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{h.topic}</span><span className="text-muted">{h.count} doubts · {h.open} open</span></div>
                <Bar value={(h.count / d.heatmap[0].count) * 100} className="mt-1" color="rgb(var(--accent))" />
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardTitle icon={Gamepad2}>Arcade analytics</CardTitle>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted"><th className="font-semibold pb-2">Game</th><th className="font-semibold pb-2">Plays</th><th className="font-semibold pb-2">Cleared</th><th className="font-semibold pb-2">Avg mistakes</th></tr></thead>
            <tbody>
              {d.games.map((g: Any) => <tr key={g.game} className="border-t border-line/60"><td className="py-2 capitalize">{g.game.replace("-", " ")}</td><td className="tabular-nums">{g.attempts}</td><td className="tabular-nums">{g.cleared}</td><td className="tabular-nums">{g.avgMistakes}</td></tr>)}
            </tbody>
          </table>
        </Card>
        <Card>
          <CardTitle icon={Megaphone}>Announce to class</CardTitle>
          <textarea className="input min-h-[84px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Bring your geometry box tomorrow." aria-label="Announcement text" />
          <button className="btn-primary w-full mt-3" onClick={post} disabled={text.trim().length < 3}><Megaphone size={16} aria-hidden /> Post announcement</button>
          <ul className="mt-4 space-y-2 text-sm text-muted">{d.announcements.slice(0, 2).map((a: Any) => <li key={a.id}>• {a.text}</li>)}</ul>
        </Card>
      </Grid>
    </>
  );
}

function ParentHome({ d }: { d: Any }) {
  if (!d.child) return <Empty icon={Users} title="No child linked yet" text="Ask the school admin to link your account." />;
  return (
    <>
      <PageHeader title={`${d.child.name}'s progress`} desc="Read-only view for parents. Private doubts and anonymous feedback are never shown here." />
      <Grid className="grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Attendance" value={d.attendance} suffix="%" icon={CheckCircle2} tone="good" />
        <Stat label="Average score" value={d.average} suffix="%" icon={TrendingUp} />
        <Stat label="Day streak" value={d.streak.current} icon={Flame} tone="accent" />
        <Stat label="Coins earned" value={d.coins} icon={Coins} tone="warn" />
      </Grid>
      <Grid className="lg:grid-cols-2">
        <Card>
          <CardTitle icon={BookOpen}>Subjects</CardTitle>
          <div className="space-y-3">{d.subjects.map((s: Any) => <div key={s.subjectId}><div className="flex justify-between text-sm mb-1"><span className="font-semibold">{s.name}</span><span>{s.avg}%</span></div><Bar value={s.avg} color={s.color} /></div>)}</div>
        </Card>
        <Card>
          <CardTitle icon={ClipboardCheck}>Assignments</CardTitle>
          <ul className="space-y-2 text-sm">{d.assignments.map((a: Any) => <li key={a.id} className="flex justify-between gap-3"><span>{a.title}</span><span className="text-muted shrink-0">{a.submission ? (a.submission.status === "graded" ? `${a.submission.marks}/${a.maxMarks}` : a.submission.status) : dueIn(a.due)}</span></li>)}</ul>
        </Card>
        <Card>
          <CardTitle icon={CalendarClock}>Upcoming meetings</CardTitle>
          <ul className="space-y-2 text-sm">{d.meetings.map((m: Any) => <li key={m.id}><b>{m.title}</b><span className="block text-muted">{fmtDateTime(m.at)}</span></li>)}</ul>
        </Card>
        <Card>
          <CardTitle icon={Megaphone}>Announcements</CardTitle>
          <ul className="space-y-2 text-sm">{d.announcements.map((a: Any) => <li key={a.id}>• {a.text}</li>)}</ul>
        </Card>
      </Grid>
    </>
  );
}

function AdminHome({ d }: { d: Any }) {
  const { toast } = useApp();
  const [busy, setBusy] = useState(false);
  const reset = async () => {
    if (!confirm("Reset all demo data? Every change made in the demo will be replaced with the original seed.")) return;
    setBusy(true);
    await api("/api/admin/reset", { method: "POST" });
    toast("Demo data reset.");
    location.reload();
  };
  return (
    <>
      <PageHeader title="Admin" desc="Users, data and the audit log." action={<button className="btn-outline" onClick={reset} disabled={busy}><RotateCcw size={16} aria-hidden /> Reset demo data</button>} />
      <Grid className="grid-cols-2 lg:grid-cols-4 mb-5">
        {d.roles.map((r: Any) => <Stat key={r.role} label={r.role + "s"} value={r.count} icon={Users} />)}
      </Grid>
      <Grid className="md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardTitle icon={BookOpen}>Content</CardTitle>
          <ul className="text-sm space-y-1.5"><li>Lectures: <b>{d.counts.lectures}</b></li><li>Doubts: <b>{d.counts.doubts}</b></li><li>Questions: <b>{d.counts.questions}</b></li><li>Ledger entries: <b>{d.counts.ledger}</b></li></ul>
          <a className="btn-soft w-full mt-4" href="/api/pack?download=1">Export open pack</a>
        </Card>
        <Card className="md:col-span-2">
          <CardTitle icon={ListChecks}>Audit log</CardTitle>
          {d.audit.length === 0 ? <Empty icon={ListChecks} title="No activity yet" /> : (
            <ul className="text-sm divide-y divide-line/60 max-h-80 overflow-auto">
              {d.audit.map((a: Any, i: number) => <li key={i} className="py-2 flex justify-between gap-4"><span><b>{a.name}</b> {a.action}</span><span className="text-muted shrink-0">{fmtDateTime(a.at)}</span></li>)}
            </ul>
          )}
        </Card>
      </Grid>
    </>
  );
}
