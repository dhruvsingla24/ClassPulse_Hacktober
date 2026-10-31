import { NextResponse } from "next/server";
import { body, route } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { db, tx, uid } from "@/lib/db";
import { audit, doubtHeatmap } from "@/lib/logic";
import { PackSchema, type Pack } from "@/lib/pack";

function buildPack(): Pack {
  const d = db();
  return {
    format: "classpulse-pack",
    version: 1,
    name: "ClassPulse 10A open classroom pack",
    license: "CC-BY-4.0",
    author: "ClassPulse community",
    subjects: d.subjects.map((s) => ({ id: s.id, name: s.name, topics: s.topics })),
    lectures: d.lectures.filter((l) => l.published).map(({ subjectId, topic, title, kind, url, notes, minutes }) => ({ subjectId, topic, title, kind, url, notes, minutes })),
    questions: d.questions.map(({ subjectId, topic, difficulty, q, options, answer, hint, explanation }) => ({ subjectId, topic, difficulty, q, options, answer, hint, explanation })),
    faq: d.faq.map(({ subjectId, topic, q, a }) => ({ subjectId, topic, q, a })),
    gameLevels: [
      { game: "binary-search", level: 1, description: "15 sorted treasure boxes, optimal 4 steps" },
      { game: "binary-search", level: 2, description: "31 boxes, optimal 5 steps" },
      { game: "binary-search", level: 3, description: "63 boxes, optimal 6 steps" },
      { game: "sorting-race", level: 1, description: "6 blocks; bubble, selection or insertion" },
      { game: "linked-list", level: 1, description: "5 pointer operations on a 3-node list" },
    ],
    // anonymised: topic-level counts only, never names or doubt text
    doubtStats: doubtHeatmap(d).map((h) => ({ subjectId: h.subjectId, topic: h.topic, doubts: h.count, open: h.open })),
  };
}

export const GET = route(async (req: Request) => {
  requireUser();
  const pack = buildPack();
  const download = new URL(req.url).searchParams.get("download");
  if (!download) return { pack, stats: { lectures: pack.lectures.length, questions: pack.questions.length, faq: pack.faq.length, topics: pack.doubtStats.length } };
  return new NextResponse(JSON.stringify(pack, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="classpulse-open-pack.json"` },
  });
});

export const POST = route(async (req: Request) => {
  const u = requireUser("teacher");
  const pack = await body(req, PackSchema);
  return tx((d) => {
    let subjects = 0, lectures = 0, questions = 0, faq = 0;
    const palette = ["#5B7FD6", "#D9885B", "#4FA38A", "#B46AB8", "#C9A54A", "#5AA0B8"];
    for (const s of pack.subjects) {
      const ex = d.subjects.find((x) => x.id === s.id || x.name.toLowerCase() === s.name.toLowerCase());
      if (ex) s.topics.forEach((t) => { if (!ex.topics.includes(t)) ex.topics.push(t); });
      else { d.subjects.push({ id: s.id, name: s.name, topics: s.topics, color: palette[d.subjects.length % palette.length], icon: "BookOpen" }); subjects++; }
    }
    const subjectIds = new Set(d.subjects.map((s) => s.id));
    for (const l of pack.lectures) {
      if (!subjectIds.has(l.subjectId) || d.lectures.some((x) => x.title === l.title && x.subjectId === l.subjectId)) continue;
      d.lectures.push({ ...l, id: uid("l"), published: true, createdAt: new Date().toISOString() });
      lectures++;
    }
    for (const q of pack.questions) {
      if (!subjectIds.has(q.subjectId) || d.questions.some((x) => x.q === q.q)) continue;
      d.questions.push({ ...q, id: uid("q") });
      questions++;
    }
    for (const f of pack.faq) {
      if (!subjectIds.has(f.subjectId) || d.faq.some((x) => x.q === f.q)) continue;
      d.faq.push({ ...f, id: uid("f"), helpful: 0 });
      faq++;
    }
    audit(d, u.id, `imported pack "${pack.name}"`);
    return { imported: { subjects, lectures, questions, faq } };
  });
});

export const dynamic = "force-dynamic";
