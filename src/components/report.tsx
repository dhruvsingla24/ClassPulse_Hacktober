"use client";
import { AlertTriangle, Award, Copy, Flame, Gamepad2, Printer, ShieldCheck, TrendingUp } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "./providers";
import { Avatar, Bar, Card, CardTitle, Empty, ErrorState, Grid, PageHeader, PageSkeleton, Ring, Stat } from "./ui";
import { Heatmap } from "./heatmap";
import { fmtDate, useApi } from "@/lib/client";

// Colour-blind-safe palette (Okabe–Ito)
const CB = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9"];

export function StudentReport({ id, self }: { id: string; self?: boolean }) {
  const { data, error, loading, reload } = useApi<any>(`/api/students/${id}`);
  const { toast } = useApp();
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const s = data.student;
  const tests = ["Unit Test 1", "Unit Test 2", "Mid-term"];
  const chart = tests.map((t) => {
    const row: any = { test: t.replace("Unit Test", "UT") };
    data.subjects.forEach((sub: any) => {
      const m = data.marks.find((x: any) => x.test === t && x.subjectId === sub.subjectId);
      if (m) row[sub.name] = Math.round((m.score / m.max) * 100);
    });
    return row;
  });
  const summary = `${s.name} (${s.roll}) · Attendance ${data.attendance}% · Average ${data.average}% · ${data.streak.current}-day learning streak. ${data.flags.length ? "Needs attention: " + data.flags.map((f: any) => f.label).join(", ") + "." : "On track in every subject."}`;
  return (
    <>
      <PageHeader title={self ? "My progress" : s.name} desc={self ? "Your report card, goals and achievements." : `${s.roll} · ${s.email}`}
        crumbs={self ? undefined : [{ label: "Students", href: "/app/students" }, { label: s.name }]}
        action={<>
          {!self && <button className="btn-outline" onClick={() => { navigator.clipboard.writeText(summary); toast("Parent summary copied."); }}><Copy size={16} aria-hidden /> Copy parent summary</button>}
          <button className="btn-outline" onClick={() => print()}><Printer size={16} aria-hidden /> Print report card</button>
        </>} />
      <div className="card p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-5">
        <Avatar name={s.name} hue={s.avatar} size={72} />
        <div className="flex-1">
          <h2 className="text-xl font-extrabold">{s.name}</h2>
          <p className="text-muted">{s.roll} · Class {s.classId}{s.goal ? ` · Goal: ${s.goal}` : ""}</p>
          <div className="mt-3 max-w-sm"><div className="flex justify-between text-sm mb-1"><span className="font-semibold">Level {data.level.level}</span><span className="text-muted">{data.level.next} XP to next</span></div><Bar value={data.level.progress * 100} /></div>
        </div>
        <Ring value={data.average} size={88} stroke={8} label={`Average ${data.average}%`} />
      </div>
      <Grid className="grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Attendance" value={data.attendance} suffix="%" icon={ShieldCheck} tone="good" />
        <Stat label="Average" value={data.average} suffix="%" icon={TrendingUp} />
        <Stat label="Streak" value={data.streak.current} icon={Flame} tone="accent" />
        <Stat label="Coins" value={data.coins} icon={Award} tone="warn" />
      </Grid>
      <Grid className="md:grid-cols-2 xl:grid-cols-3">
        <Card className="md:col-span-2">
          <CardTitle icon={TrendingUp}>Test scores over time</CardTitle>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={chart} margin={{ left: -20, right: 10, top: 8 }}>
                <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="test" tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "rgb(var(--muted))", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgb(var(--raised))", border: "1px solid rgb(var(--line))", borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {data.subjects.map((sub: any, i: number) => <Line key={sub.subjectId} type="monotone" dataKey={sub.name} stroke={CB[i % CB.length]} strokeWidth={2.5} dot={{ r: 3 }} strokeDasharray={i % 2 ? "6 3" : undefined} animationDuration={1000 + i * 150} />)}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardTitle icon={AlertTriangle}>Risk indicators</CardTitle>
          {data.flags.length === 0 ? <Empty icon={ShieldCheck} title="No flags" text="Attendance, marks and submissions are all on track." /> : (
            <ul className="space-y-3">{data.flags.map((f: any) => (
              <li key={f.label} className={`rounded-xl p-3 ${f.level === "high" ? "bg-bad/10" : "bg-warn/10"}`}>
                <p className="font-bold flex items-center gap-1.5"><AlertTriangle size={14} aria-hidden />{f.label}</p>
                <p className="text-sm text-muted">Rule: {f.rule}</p>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card>
          <CardTitle icon={TrendingUp}>Subjects</CardTitle>
          <div className="space-y-3">{data.subjects.map((x: any) => <div key={x.subjectId}><div className="flex justify-between text-sm mb-1"><span className="font-semibold">{x.name}</span><span className="tabular-nums">{x.avg}%</span></div><Bar value={x.avg} color={x.color} /></div>)}</div>
        </Card>
        <Card>
          <CardTitle icon={Gamepad2}>Arcade history</CardTitle>
          {data.games.length === 0 ? <Empty icon={Gamepad2} title="No games yet" /> : (
            <ul className="text-sm space-y-2">{data.games.slice(0, 6).map((g: any, i: number) => <li key={i} className="flex justify-between gap-2"><span className="capitalize">{g.game.replace("-", " ")} L{g.level}</span><span className="text-muted tabular-nums">{g.steps}/{g.optimal} steps · +{g.coins}</span></li>)}</ul>
          )}
        </Card>
        <Card>
          <CardTitle icon={Award}>Achievements</CardTitle>
          {data.achievements.length === 0 ? <Empty icon={Award} title="None yet" text="Clear an Arcade level to earn your first." /> : (
            <ul className="space-y-2">{data.achievements.map((a: any) => <li key={a.key} className="rounded-xl bg-warn/10 p-3"><p className="font-bold">{a.name}</p><p className="text-xs text-muted">{a.desc} · {fmtDate(a.at)}</p></li>)}</ul>
          )}
        </Card>
        <Card className="md:col-span-2 xl:col-span-3">
          <CardTitle icon={Flame}>Consistency</CardTitle>
          <Heatmap days={data.activity} />
        </Card>
      </Grid>
    </>
  );
}
