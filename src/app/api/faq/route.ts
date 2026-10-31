import { z } from "zod";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { doubtHeatmap } from "@/lib/logic";
import { similarity } from "@/lib/similar";

export const GET = route(async (req: Request) => {
  requireUser();
  const d = db();
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const subject = url.searchParams.get("subject") ?? "";
  let faq = d.faq.filter((f) => !subject || f.subjectId === subject).map((f) => ({ ...f, subject: d.subjects.find((s) => s.id === f.subjectId)?.name, score: q ? similarity(q, f.q + " " + f.a + " " + f.topic) : 1 }));
  if (q) faq = faq.filter((f) => f.score > 0).sort((a, b) => b.score - a.score);
  else faq.sort((a, b) => b.helpful - a.helpful);
  return {
    faq,
    heatmap: doubtHeatmap(d).map((h) => ({ ...h, subject: d.subjects.find((s) => s.id === h.subjectId)?.name })),
  };
});

export const POST = route(async (req: Request) => {
  requireUser();
  const { id } = await body(req, z.object({ id: z.string() }));
  return tx((d) => {
    const f = d.faq.find((x) => x.id === id);
    if (f) f.helpful++;
    return { helpful: f?.helpful ?? 0 };
  });
});

export const dynamic = "force-dynamic";
