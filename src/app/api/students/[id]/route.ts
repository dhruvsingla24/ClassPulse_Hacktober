import { route } from "@/lib/api";
import { HttpError, publicUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ACHIEVEMENTS, attendanceRate, coins, earned, level, overallAverage, riskFlags, streak, subjectAverages } from "@/lib/logic";

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const u = requireUser("teacher", "admin", "student", "parent");
  // students may only read their own report; parents only their linked child
  if (u.role === "student" && u.id !== params.id) throw new HttpError(403, "You can only view your own report.");
  if (u.role === "parent" && u.childId !== params.id) throw new HttpError(403, "You can only view your own child's report.");
  const d = db();
  const s = d.users.find((x) => x.id === params.id && x.role === "student");
  if (!s) throw new HttpError(404, "Student not found.");
  const marks = d.marks.filter((m) => m.studentId === s.id).map((m) => ({ ...m, subject: d.subjects.find((x) => x.id === m.subjectId)?.name }));
  const games = d.attempts.filter((a) => a.userId === s.id && a.finishedAt).map((a) => ({ game: a.game, level: a.level, at: a.finishedAt, coins: a.result?.coins, steps: a.result?.steps, optimal: a.result?.optimal }));
  return {
    student: publicUser(s),
    attendance: Math.round(attendanceRate(s.id, d) * 100),
    average: overallAverage(s.id, d),
    subjects: subjectAverages(s.id, d),
    marks,
    flags: riskFlags(s, d),
    coins: coins(s.id, d),
    level: level(earned(s.id, d) * 2),
    streak: streak(s.id, d),
    games: games.slice(-20).reverse(),
    achievements: d.achievements.filter((a) => a.userId === s.id).map((a) => ({ ...a, ...ACHIEVEMENTS[a.key] })),
    submissions: d.submissions.filter((x) => x.studentId === s.id).map((x) => ({ ...x, title: d.assignments.find((a) => a.id === x.assignmentId)?.title })),
    activity: d.activity.filter((a) => a.userId === s.id).map((a) => a.date),
  };
});

export const dynamic = "force-dynamic";
