import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { attendanceRate, coins, overallAverage, riskFlags, streak, students } from "@/lib/logic";

export const GET = route(async () => {
  requireUser("teacher", "admin");
  const d = db();
  return {
    students: students(d).map((s) => ({
      id: s.id, name: s.name, roll: s.roll, email: s.email,
      attendance: Math.round(attendanceRate(s.id, d) * 100),
      average: overallAverage(s.id, d),
      coins: coins(s.id, d),
      streak: streak(s.id, d).current,
      flags: riskFlags(s, d),
      submissions: d.submissions.filter((x) => x.studentId === s.id).length,
    })),
  };
});

export const dynamic = "force-dynamic";
