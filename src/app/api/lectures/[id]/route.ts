import { route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { award } from "@/lib/logic";

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const u = requireUser();
  const d = db();
  const l = d.lectures.find((x) => x.id === params.id && (x.published || u.role === "teacher"));
  if (!l) throw new HttpError(404, "Lecture not found.");
  return {
    lecture: l,
    subject: d.subjects.find((s) => s.id === l.subjectId),
    done: d.progress.some((p) => p.userId === u.id && p.lectureId === l.id),
    practice: d.questions.filter((q) => q.subjectId === l.subjectId && q.topic === l.topic).map((q) => ({ id: q.id, q: q.q, options: q.options, hint: q.hint })),
    related: d.lectures.filter((x) => x.subjectId === l.subjectId && x.id !== l.id && x.published).slice(0, 3).map((x) => ({ id: x.id, title: x.title })),
  };
});

/** Mark a lecture as completed (students earn coins once). */
export const POST = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const u = requireUser();
  return tx((d) => {
    const l = d.lectures.find((x) => x.id === params.id);
    if (!l) throw new HttpError(404, "Lecture not found.");
    if (!d.progress.some((p) => p.userId === u.id && p.lectureId === l.id)) d.progress.push({ userId: u.id, lectureId: l.id, at: new Date().toISOString() });
    const coins = u.role === "student" && award(d, u.id, `lecture:${l.id}:${u.id}`, 10, `Read ${l.title}`);
    return { ok: true, coins: coins ? 10 : 0 };
  });
});

/** Check a practice answer server-side. */
export const PUT = route(async (req: Request) => {
  requireUser();
  const { qid, choice } = (await req.json()) as { qid: string; choice: number };
  const q = db().questions.find((x) => x.id === qid);
  if (!q) throw new HttpError(404, "Question not found.");
  return { correct: q.answer === choice, answer: q.answer, explanation: q.explanation };
});

export const dynamic = "force-dynamic";
