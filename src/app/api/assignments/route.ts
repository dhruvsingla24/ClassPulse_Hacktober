import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { audit, notify, students } from "@/lib/logic";

export const GET = route(async () => {
  const u = requireUser("student", "teacher");
  const d = db();
  const name = (id: string) => d.users.find((x) => x.id === id);
  return {
    assignments: d.assignments
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => ({
        ...a,
        subject: d.subjects.find((s) => s.id === a.subjectId)?.name,
        submissions: u.role === "teacher"
          ? d.submissions.filter((s) => s.assignmentId === a.id).map((s) => ({ ...s, student: name(s.studentId)?.name, roll: name(s.studentId)?.roll }))
          : d.submissions.filter((s) => s.assignmentId === a.id && s.studentId === u.id),
        totalStudents: students(d).length,
      })),
  };
});

const Schema = z.object({
  subjectId: z.string().min(1),
  title: z.string().trim().min(4, "Title needs at least 4 characters.").max(140),
  description: z.string().trim().min(10, "Add instructions (10+ characters).").max(4000),
  due: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "Pick a valid due date."),
  maxMarks: z.number().int().min(1).max(100),
});

export const POST = route(async (req: Request) => {
  const u = requireUser("teacher");
  const input = await body(req, Schema);
  return tx((d) => {
    const a = { id: uid("a"), ...input, due: new Date(input.due).toISOString(), createdBy: u.id, createdAt: new Date().toISOString() };
    d.assignments.push(a);
    students(d).forEach((s) => notify(d, s.id, `New assignment: ${a.title}`, "/app/assignments"));
    audit(d, u.id, `published assignment ${a.title}`);
    return { id: a.id };
  });
});

export const dynamic = "force-dynamic";
