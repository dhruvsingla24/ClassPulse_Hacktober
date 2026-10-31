import { z } from "zod";
import { body, rateLimit, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { tx, uid } from "@/lib/db";
import { award, notify } from "@/lib/logic";

const Schema = z.object({ text: z.string().trim().min(5, "Write your answer (5+ characters).").max(8000) });

/** Student submits (or resubmits) an answer. */
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const u = requireUser("student");
  const { text } = await body(req, Schema);
  rateLimit("submit:" + u.id, 20, 10 * 60_000);
  return tx((d) => {
    const a = d.assignments.find((x) => x.id === params.id);
    if (!a) throw new HttpError(404, "Assignment not found.");
    const existing = d.submissions.find((s) => s.assignmentId === a.id && s.studentId === u.id);
    if (existing && existing.status === "graded") throw new HttpError(409, "This was already graded. Ask your teacher to request a resubmission.");
    const now = new Date().toISOString();
    if (existing) Object.assign(existing, { text, submittedAt: now, status: "submitted" });
    else d.submissions.push({ id: uid("sub"), assignmentId: a.id, studentId: u.id, text, submittedAt: now, status: "submitted" });
    award(d, u.id, `submit:${a.id}:${u.id}`, 15, `Submitted ${a.title}`);
    d.users.filter((t) => t.role === "teacher").forEach((t) => notify(d, t.id, `${u.name} submitted ${a.title}`, "/app/assignments"));
    return { ok: true, late: new Date(now) > new Date(a.due) };
  });
});

export const dynamic = "force-dynamic";
