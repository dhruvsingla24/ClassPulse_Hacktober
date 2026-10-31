import "server-only";
import { db, today, uid } from "./db";
import type { DB, User } from "./types";

export const SHOP = [
  { id: "plant", name: "Desk plant", price: 60, kind: "desk", desc: "A little monstera for your 3D desk." },
  { id: "trophy", name: "Golden trophy", price: 150, kind: "desk", desc: "Shows off on your desk shelf." },
  { id: "poster", name: "Galaxy poster", price: 90, kind: "desk", desc: "A starfield poster for your classroom wall." },
  { id: "lamp", name: "Study lamp", price: 120, kind: "desk", desc: "A warm lamp that glows on your desk." },
  { id: "globe", name: "Spinning globe", price: 200, kind: "desk", desc: "A globe that slowly turns on your desk." },
  { id: "frame-aurora", name: "Aurora avatar ring", price: 80, kind: "avatar", desc: "A soft gradient ring around your avatar." },
] as const;

export const ACHIEVEMENTS: Record<string, { name: string; desc: string }> = {
  "binary-search-champion": { name: "Binary Search Champion", desc: "Found the treasure in the optimal number of steps." },
  "sorting-master": { name: "Sorting Master", desc: "Finished a Sorting Race with zero mistakes." },
  "linked-list-architect": { name: "Linked List Architect", desc: "Built a linked list without a single wrong pointer." },
  "consistency-hero": { name: "7-Day Consistency Hero", desc: "Learned something 7 days in a row." },
  "math-explorer": { name: "Math Explorer", desc: "Earned 300 coins through practice." },
  "century": { name: "100 Challenges Completed", desc: "Finished 100 challenges." },
  "first-doubt": { name: "Curious Mind", desc: "Asked your first doubt in the Doubt Lab." },
};

export const coins = (userId: string, d: DB = db()) => d.ledger.filter((l) => l.userId === userId).reduce((a, l) => a + l.amount, 0);
export const earned = (userId: string, d: DB = db()) => d.ledger.filter((l) => l.userId === userId && l.amount > 0).reduce((a, l) => a + l.amount, 0);

export function level(xp: number) {
  const lv = Math.floor(Math.sqrt(xp / 60)) + 1;
  const cur = 60 * (lv - 1) ** 2;
  const next = 60 * lv ** 2;
  return { level: lv, progress: (xp - cur) / (next - cur), next: next - xp };
}

export function streak(userId: string, d: DB = db()) {
  const days = new Set(d.activity.filter((a) => a.userId === userId).map((a) => a.date));
  let s = 0;
  const cur = new Date();
  // today counts if active; otherwise the streak is still alive from yesterday
  if (!days.has(today(cur))) cur.setDate(cur.getDate() - 1);
  while (days.has(today(cur))) {
    s++;
    cur.setDate(cur.getDate() - 1);
  }
  return { current: s, activeToday: days.has(today()) };
}

/** Records activity and awards coins exactly once per idempotency key. Call inside tx(). */
export function award(d: DB, userId: string, key: string, amount: number, reason: string) {
  if (d.ledger.some((l) => l.key === key)) return false;
  d.ledger.push({ key, userId, amount, reason, at: new Date().toISOString() });
  const t = today();
  if (!d.activity.some((a) => a.userId === userId && a.date === t)) d.activity.push({ userId, date: t });
  return true;
}

export function grantAchievement(d: DB, userId: string, key: string) {
  if (d.achievements.some((a) => a.userId === userId && a.key === key)) return false;
  d.achievements.push({ userId, key, at: new Date().toISOString() });
  notify(d, userId, `Achievement unlocked: ${ACHIEVEMENTS[key]?.name ?? key}`, "/app/profile");
  return true;
}

export function notify(d: DB, userId: string, text: string, href: string) {
  d.notifications.push({ id: uid("n"), userId, text, href, read: false, at: new Date().toISOString() });
}

export function audit(d: DB, userId: string, action: string) {
  d.audit.push({ at: new Date().toISOString(), userId, action });
  if (d.audit.length > 500) d.audit.splice(0, d.audit.length - 500);
}

export const students = (d: DB = db()) => d.users.filter((u) => u.role === "student");

export function attendanceRate(userId: string, d: DB = db()) {
  const rec = d.sessions.map((s) => s.records[userId]).filter(Boolean);
  if (!rec.length) return 1;
  return rec.filter((r) => r !== "absent").length / rec.length;
}

export function subjectAverages(userId: string, d: DB = db()) {
  return d.subjects.map((s) => {
    const m = d.marks.filter((x) => x.studentId === userId && x.subjectId === s.id);
    const avg = m.length ? m.reduce((a, x) => a + x.score / x.max, 0) / m.length : 0;
    const trend = m.length >= 2 ? m[m.length - 1].score / m[m.length - 1].max - m[0].score / m[0].max : 0;
    return { subjectId: s.id, name: s.name, color: s.color, avg: Math.round(avg * 100), trend: Math.round(trend * 100) };
  });
}

export function overallAverage(userId: string, d: DB = db()) {
  const s = subjectAverages(userId, d);
  return Math.round(s.reduce((a, x) => a + x.avg, 0) / s.length);
}

/** Transparent, rule-based risk flags. Each flag carries the rule that triggered it. */
export function riskFlags(u: User, d: DB = db()) {
  const flags: { label: string; rule: string; level: "high" | "medium" }[] = [];
  const att = attendanceRate(u.id, d);
  if (att < 0.75) flags.push({ label: "Low attendance", rule: `Attendance is ${Math.round(att * 100)}%, below the 75% threshold.`, level: "high" });
  for (const s of subjectAverages(u.id, d)) {
    if (s.trend <= -10) flags.push({ label: `Declining in ${s.name}`, rule: `Score fell ${-s.trend} points from the first to the latest test.`, level: "medium" });
  }
  const avg = overallAverage(u.id, d);
  if (avg < 50) flags.push({ label: "Low average", rule: `Overall average is ${avg}%, below 50%.`, level: "high" });
  const missed = d.assignments.filter((a) => new Date(a.due) < new Date() && !d.submissions.some((s) => s.assignmentId === a.id && s.studentId === u.id));
  if (missed.length) flags.push({ label: "Missed submission", rule: `${missed.length} past-due assignment(s) with no submission.`, level: "medium" });
  return flags;
}

export function doubtHeatmap(d: DB = db()) {
  const map = new Map<string, { subjectId: string; topic: string; count: number; open: number }>();
  for (const x of d.doubts) {
    const k = x.subjectId + "|" + x.topic;
    const e = map.get(k) ?? { subjectId: x.subjectId, topic: x.topic, count: 0, open: 0 };
    e.count++;
    if (x.status !== "resolved") e.open++;
    map.set(k, e);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function classHealth(d: DB = db()) {
  const st = students(d);
  const att = st.reduce((a, s) => a + attendanceRate(s.id, d), 0) / st.length;
  const avg = st.reduce((a, s) => a + overallAverage(s.id, d), 0) / st.length / 100;
  const week = new Date();
  week.setDate(week.getDate() - 7);
  const active = new Set(d.activity.filter((a) => new Date(a.date) >= week).map((a) => a.userId));
  const engagement = st.filter((s) => active.has(s.id)).length / st.length;
  const openDoubts = d.doubts.filter((x) => x.status !== "resolved").length;
  const doubtPenalty = Math.min(0.15, openDoubts * 0.01);
  const score = Math.round((att * 0.35 + avg * 0.35 + engagement * 0.3 - doubtPenalty) * 100);
  return {
    score,
    explain: `35% attendance (${Math.round(att * 100)}%) + 35% average marks (${Math.round(avg * 100)}%) + 30% students active this week (${Math.round(engagement * 100)}%) − ${Math.round(doubtPenalty * 100)} points for ${openDoubts} open doubts.`,
    attendance: Math.round(att * 100),
    average: Math.round(avg * 100),
    engagement: Math.round(engagement * 100),
  };
}

/** Recommendations that only point to lectures and games that actually exist. */
export function recommendations(u: User, d: DB = db()) {
  const subs = subjectAverages(u.id, d).sort((a, b) => a.avg - b.avg);
  const out: { title: string; why: string; href: string }[] = [];
  for (const s of subs.slice(0, 2)) {
    const lec = d.lectures.find((l) => l.subjectId === s.subjectId && l.published && !d.progress.some((p) => p.userId === u.id && p.lectureId === l.id));
    if (lec) out.push({ title: `Revise: ${lec.title}`, why: `${s.name} is your lowest subject at ${s.avg}%.`, href: `/app/library/${lec.id}` });
  }
  const played = new Set(d.attempts.filter((a) => a.userId === u.id && a.result?.ok).map((a) => a.game));
  if (!played.has("binary-search")) out.push({ title: "Play Binary Search Treasure Hunt", why: "You haven't cleared it yet, and it backs up the Computer Science unit.", href: "/app/arcade/binary-search" });
  else if (!played.has("sorting-race")) out.push({ title: "Try the Sorting Race", why: "Next step after binary search in the Algorithm Arena.", href: "/app/arcade/sorting-race" });
  if (!streak(u.id, d).activeToday) out.push({ title: "Do today's daily challenge", why: "Keeps your streak alive and earns coins.", href: "/app#daily" });
  return out.slice(0, 4);
}
