import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { publicUser, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** "Download my data": everything stored about the signed-in user. */
export const GET = route(async () => {
  const u = requireUser();
  const d = db();
  const mine = {
    exportedAt: new Date().toISOString(),
    profile: publicUser(u),
    prefs: d.prefs[u.id],
    ledger: d.ledger.filter((l) => l.userId === u.id),
    activity: d.activity.filter((a) => a.userId === u.id),
    achievements: d.achievements.filter((a) => a.userId === u.id),
    doubts: d.doubts.filter((x) => x.studentId === u.id),
    submissions: d.submissions.filter((s) => s.studentId === u.id),
    marks: d.marks.filter((m) => m.studentId === u.id),
    games: d.attempts.filter((a) => a.userId === u.id).map(({ puzzle: _p, ...a }) => a),
    notifications: d.notifications.filter((n) => n.userId === u.id),
  };
  return new NextResponse(JSON.stringify(mine, null, 2), {
    headers: { "content-type": "application/json", "content-disposition": `attachment; filename="classpulse-my-data.json"` },
  });
});

export const dynamic = "force-dynamic";
