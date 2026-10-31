import { route } from "@/lib/api";
import { publicUser, requireUser } from "@/lib/auth";
import { db, today } from "@/lib/db";
import {
  ACHIEVEMENTS, attendanceRate, classHealth, coins, doubtHeatmap, overallAverage, recommendations,
  riskFlags, streak, students, subjectAverages,
} from "@/lib/logic";
import type { DB, User } from "@/lib/types";

function activityDays(d: DB, userId: string) {
  return d.activity.filter((a) => a.userId === userId).map((a) => a.date);
}

function studentView(d: DB, u: User) {
  const subs = d.submissions.filter((s) => s.studentId === u.id);
  const upcoming = d.meetings.filter((m) => new Date(m.at) > new Date()).sort((a, b) => a.at.localeCompare(b.at));
  const dailyDone = d.attempts.some((a) => a.userId === u.id && a.game === "daily-challenge" && a.finishedAt?.slice(0, 10) === today());
  return {
    role: "student",
    subjects: subjectAverages(u.id, d),
    attendance: Math.round(attendanceRate(u.id, d) * 100),
    average: overallAverage(u.id, d),
    assignments: d.assignments.map((a) => ({ ...a, submission: subs.find((s) => s.assignmentId === a.id) ?? null })).sort((a, b) => a.due.localeCompare(b.due)),
    meetings: upcoming.slice(0, 3),
    recommendations: recommendations(u, d),
    activity: activityDays(d, u.id),
    achievements: d.achievements.filter((a) => a.userId === u.id).map((a) => ({ ...a, ...ACHIEVEMENTS[a.key] })),
    announcements: d.announcements.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.at.localeCompare(a.at)),
    dailyDone,
    openDoubts: d.doubts.filter((x) => x.studentId === u.id && x.status !== "resolved").length,
    missions: [
      { label: "Finish today's daily challenge", done: dailyDone },
      { label: "Clear a level in the Arcade", done: d.attempts.some((a) => a.userId === u.id && a.game !== "daily-challenge" && a.result?.ok && a.finishedAt?.slice(0, 10) === today()) },
      { label: "Read one lecture", done: d.progress.some((p) => p.userId === u.id && p.at.slice(0, 10) === today()) },
    ],
    ledger: d.ledger.filter((l) => l.userId === u.id).slice(-6).reverse(),
  };
}

function teacherView(d: DB) {
  const st = students(d);
  const now = new Date();
  const pendingSubs = d.submissions.filter((s) => s.status === "submitted");
  const pendingDoubts = d.doubts.filter((x) => x.status === "pending" || x.status === "reviewing");
  const attention = st
    .map((s) => ({ id: s.id, name: s.name, roll: s.roll, flags: riskFlags(s, d), average: overallAverage(s.id, d), attendance: Math.round(attendanceRate(s.id, d) * 100) }))
    .filter((s) => s.flags.length)
    .sort((a, b) => b.flags.length - a.flags.length);
  const subjectPerf = d.subjects.map((sub) => {
    const m = d.marks.filter((x) => x.subjectId === sub.id);
    return { name: sub.name, color: sub.color, avg: Math.round((m.reduce((a, x) => a + x.score / x.max, 0) / m.length) * 100) };
  });
  const trend = Array.from({ length: 14 }, (_, i) => {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - (13 - i));
    const key = today(dt);
    return { day: key.slice(5), active: new Set(d.activity.filter((a) => a.date === key).map((a) => a.userId)).size };
  });
  const games = (["binary-search", "sorting-race", "linked-list", "daily-challenge"] as const).map((g) => {
    const at = d.attempts.filter((a) => a.game === g && a.finishedAt);
    return { game: g, attempts: at.length, cleared: at.filter((a) => a.result?.ok).length, avgMistakes: at.length ? +(at.reduce((s, a) => s + ((a.puzzle as { mistakes?: number })?.mistakes ?? 0), 0) / at.length).toFixed(1) : 0 };
  });
  const todo = [
    pendingDoubts.length && { text: `Answer ${pendingDoubts.length} pending doubts`, href: "/app/doubts", priority: pendingDoubts.some((x) => x.priority === "exam-soon") ? "high" : "medium" },
    pendingSubs.length && { text: `Grade ${pendingSubs.length} submissions`, href: "/app/assignments", priority: "medium" },
    attention.length && { text: `Check in with ${attention.length} students who need attention`, href: "/app/students", priority: "high" },
    !d.sessions.some((s) => s.date === today()) && { text: "Take today's attendance", href: "/app/attendance", priority: "medium" },
  ].filter(Boolean);
  return {
    role: "teacher",
    totals: {
      students: st.length,
      classrooms: 1,
      subjects: d.subjects.length,
      attendance: classHealth(d).attendance,
      pendingSubmissions: pendingSubs.length,
      pendingDoubts: pendingDoubts.length,
      meetings: d.meetings.filter((m) => new Date(m.at) > now).length,
    },
    health: classHealth(d),
    attention: attention.slice(0, 6),
    subjectPerf,
    trend,
    heatmap: doubtHeatmap(d).slice(0, 6).map((h) => ({ ...h, subject: d.subjects.find((s) => s.id === h.subjectId)?.name })),
    games,
    todo,
    meetings: d.meetings.filter((m) => new Date(m.at) > now).sort((a, b) => a.at.localeCompare(b.at)),
    announcements: d.announcements,
  };
}

export const GET = route(async () => {
  const u = requireUser();
  const d = db();
  if (u.role === "student") return studentView(d, u);
  if (u.role === "teacher") return teacherView(d);
  if (u.role === "parent") {
    const child = d.users.find((x) => x.id === u.childId);
    if (!child) return { role: "parent", child: null };
    const v = studentView(d, child);
    // Parents never see private doubts, ledger details or anonymous feedback.
    return {
      role: "parent",
      child: publicUser(child),
      coins: coins(child.id, d),
      streak: streak(child.id, d),
      subjects: v.subjects,
      attendance: v.attendance,
      average: v.average,
      assignments: v.assignments,
      meetings: v.meetings,
      announcements: v.announcements,
      achievements: v.achievements,
    };
  }
  const roles = ["student", "teacher", "parent", "admin"].map((r) => ({ role: r, count: d.users.filter((x) => x.role === r).length }));
  return { role: "admin", roles, audit: d.audit.slice(-40).reverse().map((a) => ({ ...a, name: d.users.find((x) => x.id === a.userId)?.name })), counts: { lectures: d.lectures.length, doubts: d.doubts.length, questions: d.questions.length, ledger: d.ledger.length } };
});

export const dynamic = "force-dynamic";
