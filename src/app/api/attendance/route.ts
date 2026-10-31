import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, today, tx, uid } from "@/lib/db";
import { attendanceRate, audit, students } from "@/lib/logic";

export const GET = route(async () => {
  requireUser("teacher");
  const d = db();
  return {
    students: students(d).map((s) => ({ id: s.id, name: s.name, roll: s.roll, rate: Math.round(attendanceRate(s.id, d) * 100) })),
    sessions: d.sessions.slice().sort((a, b) => b.date.localeCompare(a.date)).map((s) => ({
      ...s,
      subject: d.subjects.find((x) => x.id === s.subjectId)?.name,
      present: Object.values(s.records).filter((r) => r !== "absent").length,
      total: Object.keys(s.records).length,
    })),
    subjects: d.subjects.map((s) => ({ id: s.id, name: s.name })),
    today: today(),
  };
});

const Schema = z.object({
  subjectId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z.record(z.enum(["present", "absent", "late"])),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("teacher");
  const input = await body(req, Schema);
  return tx((d) => {
    const valid = new Set(students(d).map((s) => s.id));
    const records = Object.fromEntries(Object.entries(input.records).filter(([k]) => valid.has(k)));
    const existing = d.sessions.find((s) => s.date === input.date && s.subjectId === input.subjectId);
    if (existing) existing.records = records;
    else d.sessions.push({ id: uid("s"), subjectId: input.subjectId, date: input.date, records });
    audit(d, u.id, `saved attendance ${input.date} ${input.subjectId}`);
    return { ok: true, updated: Boolean(existing) };
  });
});

export const dynamic = "force-dynamic";
