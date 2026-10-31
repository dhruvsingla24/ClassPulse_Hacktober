import { route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { similarity } from "@/lib/similar";

export const GET = route(async (req: Request) => {
  const u = requireUser();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return { results: [] };
  const d = db();
  const lower = q.toLowerCase();
  const score = (text: string) => (text.toLowerCase().includes(lower) ? 2 : 0) + similarity(q, text);
  const results = [
    ...d.lectures.filter((l) => l.published || u.role === "teacher").map((l) => ({ type: "Lecture", title: l.title, href: `/app/library/${l.id}`, s: score(l.title + " " + l.topic + " " + l.notes) })),
    ...d.assignments.map((a) => ({ type: "Assignment", title: a.title, href: "/app/assignments", s: score(a.title + " " + a.description) })),
    ...d.faq.map((f) => ({ type: "FAQ", title: f.q, href: "/app/faq", s: score(f.q + " " + f.a) })),
    // doubts respect permissions: students only see their own
    ...d.doubts.filter((x) => u.role === "teacher" || x.studentId === u.id).map((x) => ({ type: "Doubt", title: x.title, href: `/app/doubts/${x.id}`, s: score(x.title + " " + x.body + " " + x.topic) })),
    ...d.subjects.map((s) => ({ type: "Subject", title: s.name, href: `/app/library#${s.id}`, s: score(s.name + " " + s.topics.join(" ")) })),
  ];
  return { results: results.filter((r) => r.s > 0.3).sort((a, b) => b.s - a.s).slice(0, 12).map(({ s: _s, ...r }) => r) };
});

export const dynamic = "force-dynamic";
