import { z } from "zod";
import { body, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { tx } from "@/lib/db";
import { audit, notify } from "@/lib/logic";

const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("grade"), marks: z.number().min(0), feedback: z.string().trim().max(2000).default("") }),
  z.object({ action: z.literal("resubmit"), feedback: z.string().trim().min(3, "Say what to fix.").max(2000) }),
]);

export const PATCH = route(async (req: Request, { params }: { params: { id: string } }) => {
  const u = requireUser("teacher");
  const p = await body(req, Schema);
  return tx((d) => {
    const s = d.submissions.find((x) => x.id === params.id);
    if (!s) throw new HttpError(404, "Submission not found.");
    const a = d.assignments.find((x) => x.id === s.assignmentId)!;
    if (p.action === "grade") {
      if (p.marks > a.maxMarks) throw new HttpError(400, `Marks can't exceed ${a.maxMarks}.`);
      Object.assign(s, { status: "graded", marks: p.marks, feedback: p.feedback });
      notify(d, s.studentId, `${a.title} graded: ${p.marks}/${a.maxMarks}`, "/app/assignments");
      // graded work also feeds the performance dashboard
      d.marks.push({ studentId: s.studentId, subjectId: a.subjectId, test: a.title, score: p.marks, max: a.maxMarks, date: new Date().toISOString().slice(0, 10) });
    } else {
      Object.assign(s, { status: "resubmit", feedback: p.feedback });
      notify(d, s.studentId, `Resubmission requested: ${a.title}`, "/app/assignments");
    }
    audit(d, u.id, `${p.action} submission ${s.id}`);
    return { ok: true };
  });
});

export const dynamic = "force-dynamic";
