"use client";
import { motion } from "framer-motion";
import { Database, Download, FileJson, Gamepad2, HelpCircle, Loader2, Package, ShieldCheck, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { Card, CardTitle, ErrorState, Grid, PageHeader, PageSkeleton, Stat } from "@/components/ui";
import { api, useApi } from "@/lib/client";

export default function OpenPack() {
  const { me, toast } = useApp();
  const { data, error, loading, reload } = useApi<{ pack: { name: string; license: string; doubtStats: { topic: string; doubts: number; open: number; subjectId: string }[]; gameLevels: { game: string; level: number; description: string }[] }; stats: { lectures: number; questions: number; faq: number; topics: number } }>("/api/pack");
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Record<string, number> | null>(null);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  const teacher = me?.user?.role === "teacher";

  const importPack = async (json: unknown) => {
    setBusy(true); setResult(null);
    try {
      const r = await api<{ imported: Record<string, number> }>("/api/pack", { body: json });
      setResult(r.imported); toast("Pack imported."); reload();
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };
  const onFile = async (f: File) => {
    try { await importPack(JSON.parse(await f.text())); } catch { toast("That file isn't valid JSON.", "err"); }
  };
  const sample = async () => importPack(await (await fetch("/packs/optics-starter-pack.json")).json());

  return (
    <>
      <PageHeader title="Open Classroom Pack" desc="Theme 02 · Idea 3: open datasets and resources for classrooms. Everything here exports as plain JSON under CC BY 4.0, so any school can reuse it." action={<a href="/api/pack?download=1" className="btn-primary"><Download size={17} aria-hidden /> Download pack</a>} />
      <Grid className="grid-cols-2 lg:grid-cols-4 mb-5">
        <Stat label="Lectures & notes" value={data.stats.lectures} icon={FileJson} />
        <Stat label="Questions" value={data.stats.questions} icon={HelpCircle} tone="accent" />
        <Stat label="FAQ answers" value={data.stats.faq} icon={Database} tone="good" />
        <Stat label="Doubt topics" value={data.stats.topics} icon={Package} tone="warn" />
      </Grid>
      <Grid className="lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle icon={Database}>Anonymised doubt dataset</CardTitle>
          <p className="text-sm text-muted mb-4">Topic-level counts only. No names, no doubt text, no feedback. This is the open data other schools can learn from.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-muted"><th className="pb-2 font-semibold">Subject</th><th className="pb-2 font-semibold">Topic</th><th className="pb-2 font-semibold">Doubts</th><th className="pb-2 font-semibold">Still open</th></tr></thead>
              <tbody>{data.pack.doubtStats.map((d) => <tr key={d.subjectId + d.topic} className="border-t border-line/60"><td className="py-2 uppercase text-xs font-bold text-muted">{d.subjectId}</td><td>{d.topic}</td><td className="tabular-nums">{d.doubts}</td><td className="tabular-nums">{d.open}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
        <Card>
          <CardTitle icon={ShieldCheck}>What's in the pack</CardTitle>
          <ul className="text-sm space-y-2">
            <li>• Subjects and topics</li><li>• Published lecture notes</li><li>• Question bank with hints and explanations</li><li>• FAQ answers</li><li>• Arcade level definitions</li><li>• Anonymised doubt counts</li>
          </ul>
          <p className="text-xs text-muted mt-4">Format: <code>classpulse-pack</code> v1 · License: {data.pack.license}. The schema is validated on import.</p>
        </Card>
        <Card>
          <CardTitle icon={Gamepad2}>Arcade levels</CardTitle>
          <ul className="text-sm space-y-1.5">{data.pack.gameLevels.map((g) => <li key={g.game + g.level}><b className="capitalize">{g.game.replace("-", " ")} L{g.level}</b> · <span className="text-muted">{g.description}</span></li>)}</ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle icon={Upload}>Import a pack</CardTitle>
          {teacher ? (
            <>
              <p className="text-sm text-muted mb-4">Bring in lectures, questions and FAQs another school shared. Duplicates are skipped.</p>
              <div className="flex flex-wrap gap-2">
                <input ref={file} type="file" accept="application/json,.json" className="sr-only" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} aria-label="Choose pack file" />
                <button className="btn-primary" onClick={() => file.current?.click()} disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Upload size={16} aria-hidden />} Choose JSON file</button>
                <button className="btn-outline" onClick={sample} disabled={busy}><Package size={16} aria-hidden /> Try the Optics starter pack</button>
              </div>
              {result && (
                <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-xl bg-good/10 p-3 text-sm">
                  Imported {result.lectures} lectures, {result.questions} questions, {result.faq} FAQ answers and {result.subjects} new subjects.
                </motion.p>
              )}
            </>
          ) : <p className="text-sm text-muted">Teachers can import packs. Anyone can download one.</p>}
        </Card>
      </Grid>
    </>
  );
}
