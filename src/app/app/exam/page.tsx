"use client";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock, Flag, Info, Loader2, Play, ShieldAlert, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "@/components/providers";
import { Card, CardTitle, Empty, ErrorState, PageHeader, PageSkeleton } from "@/components/ui";
import { api, fmtDateTime, useApi } from "@/lib/client";

interface Q { id: string; q: string; options: string[]; topic: string }
interface Review { q: string; options: string[]; answer: number; chosen: number | null; explanation: string }

export default function ExamHall() {
  const { me } = useApp();
  if (!me?.user) return <PageSkeleton />;
  return me.user.role === "teacher" ? <IntegrityReview /> : <StudentExam />;
}

function StudentExam() {
  const { toast, refreshMe, confetti } = useApp();
  const [exam, setExam] = useState<{ examId: string; endsAt: string; questions: Q[] } | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [flags, setFlags] = useState<boolean[]>([]);
  const [i, setI] = useState(0);
  const [left, setLeft] = useState(0);
  const [result, setResult] = useState<{ score: number; total: number; review?: Review[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const submitted = useRef(false);

  // recover an in-progress exam after a refresh or connection drop
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("cp_exam") || "null");
      if (saved && new Date(saved.exam.endsAt).getTime() > Date.now()) { setExam(saved.exam); setAnswers(saved.answers); setFlags(saved.flags); }
    } catch { /* ignore */ }
  }, []);
  useEffect(() => { if (exam && !result) localStorage.setItem("cp_exam", JSON.stringify({ exam, answers, flags })); }, [exam, answers, flags, result]);

  const submit = useCallback(async () => {
    if (!exam || submitted.current) return;
    submitted.current = true;
    setBusy(true);
    try {
      const r = await api<{ score: number; total: number; review?: Review[] }>("/api/exam", { body: { action: "submit", examId: exam.examId, answers } });
      setResult(r);
      localStorage.removeItem("cp_exam");
      if (r.score >= r.total / 2) confetti();
      refreshMe();
    } catch (e) { submitted.current = false; toast((e as Error).message + " Your answers are saved; try again.", "err"); } finally { setBusy(false); }
  }, [exam, answers, confetti, refreshMe, toast]);

  // timer
  useEffect(() => {
    if (!exam || result) return;
    const tick = () => {
      const s = Math.max(0, Math.round((new Date(exam.endsAt).getTime() - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) submit();
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [exam, result, submit]);

  // integrity signals, only while the exam is running
  useEffect(() => {
    if (!exam || result) return;
    const log = (kind: string) => api("/api/exam", { body: { action: "event", examId: exam.examId, kind } }).catch(() => {});
    const vis = () => document.visibilityState === "hidden" && log("visibility");
    const blur = () => log("blur");
    const copy = () => log("copy");
    const paste = () => log("paste");
    const ctx = () => log("contextmenu");
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("blur", blur);
    document.addEventListener("copy", copy);
    document.addEventListener("paste", paste);
    document.addEventListener("contextmenu", ctx);
    return () => { document.removeEventListener("visibilitychange", vis); window.removeEventListener("blur", blur); document.removeEventListener("copy", copy); document.removeEventListener("paste", paste); document.removeEventListener("contextmenu", ctx); };
  }, [exam, result]);

  const start = async () => {
    setBusy(true);
    try {
      const r = await api<{ examId: string; endsAt: string; questions: Q[] }>("/api/exam", { body: { action: "start" } });
      setExam(r); setAnswers(r.questions.map(() => null)); setFlags(r.questions.map(() => false)); setI(0); setResult(null); submitted.current = false;
    } catch (e) { toast((e as Error).message, "err"); } finally { setBusy(false); }
  };

  if (result) {
    return (
      <>
        <PageHeader title="Exam results" desc={`You scored ${result.score} out of ${result.total}.`} action={<button className="btn-primary" onClick={() => { setExam(null); setResult(null); }}>Back to the hall</button>} />
        <div className="space-y-3">
          {result.review?.map((r, k) => (
            <div key={k} className="card p-4">
              <p className="font-semibold flex items-start gap-2">{r.chosen === r.answer ? <CheckCircle2 className="text-good shrink-0" size={18} aria-label="Correct" /> : <XCircle className="text-bad shrink-0" size={18} aria-label="Incorrect" />}{k + 1}. {r.q}</p>
              <p className="text-sm mt-1">Correct answer: <b>{r.options[r.answer]}</b>{r.chosen !== null && r.chosen !== r.answer && <> · You chose: {r.options[r.chosen]}</>}{r.chosen === null && " · Not answered"}</p>
              <p className="text-sm text-muted mt-1">{r.explanation}</p>
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!exam) {
    return (
      <>
        <PageHeader title="Examination Hall" desc="A timed mock test from the question bank. Distraction-free, with autosave." />
        <div className="card p-6 md:p-8 max-w-2xl">
          <h2 className="text-xl font-bold flex items-center gap-2"><Info size={20} className="text-primary" aria-hidden /> Exam rules</h2>
          <ul className="mt-4 space-y-2 text-[0.97rem] list-disc pl-5">
            <li>6 questions, 10 minutes. The test submits itself when time runs out.</li>
            <li>Your answers save automatically, so a refresh or dropped connection won't lose them.</li>
            <li>While the exam is open, ClassPulse logs these browser signals with a timestamp: leaving the tab, the window losing focus, copy, paste and right-click.</li>
            <li>These signals are indicators for your teacher, not proof of anything. Nothing is recorded before you start or after you submit. There is no webcam or screen recording.</li>
          </ul>
          <label className="mt-5 flex items-center gap-2 font-semibold"><input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} /> I've read the rules</label>
          <button className="btn-primary mt-5" disabled={!agreed || busy} onClick={start}>{busy ? <Loader2 className="animate-spin" size={17} aria-hidden /> : <Play size={17} aria-hidden />} Start exam</button>
        </div>
      </>
    );
  }

  const q = exam.questions[i];
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-4 mb-4 flex items-center justify-between gap-3 sticky top-20 z-10">
        <span className="font-bold">Mock exam</span>
        <span className={`chip !text-base !px-4 !py-2 ${left < 60 ? "bg-bad/15 text-bad animate-pulse" : "bg-primary/10 text-primary"}`} role="timer" aria-label={`${mm} minutes ${ss} seconds left`}><Clock size={16} aria-hidden /> {mm}:{ss}</span>
        <button className="btn-primary" onClick={submit} disabled={busy}>Submit</button>
      </div>
      <div className="grid md:grid-cols-[1fr_200px] gap-4">
        <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card p-6">
          <p className="text-xs text-muted font-semibold uppercase">Question {i + 1} of {exam.questions.length} · {q.topic}</p>
          <p className="text-lg font-semibold mt-1 mb-4">{q.q}</p>
          <div className="space-y-2" role="radiogroup" aria-label="Options">
            {q.options.map((o, k) => (
              <label key={k} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${answers[i] === k ? "border-primary bg-primary/10" : "border-line hover:bg-ink/5"}`}>
                <input type="radio" name={`q${i}`} checked={answers[i] === k} onChange={() => setAnswers((a) => a.map((x, j) => (j === i ? k : x)))} />{o}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            <button className="btn-outline" disabled={i === 0} onClick={() => setI(i - 1)}>Previous</button>
            <button className={`btn-ghost ${flags[i] ? "text-warn" : ""}`} onClick={() => setFlags((f) => f.map((x, j) => (j === i ? !x : x)))} aria-pressed={flags[i]}><Flag size={16} aria-hidden /> {flags[i] ? "Flagged" : "Flag for review"}</button>
            <button className="btn-primary ml-auto" disabled={i === exam.questions.length - 1} onClick={() => setI(i + 1)}>Next</button>
          </div>
        </motion.div>
        <nav className="card p-4" aria-label="Question navigation">
          <p className="text-sm font-bold mb-3">Questions</p>
          <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
            {exam.questions.map((_, k) => (
              <button key={k} onClick={() => setI(k)} aria-current={k === i ? "step" : undefined} aria-label={`Question ${k + 1}${answers[k] !== null ? ", answered" : ""}${flags[k] ? ", flagged" : ""}`}
                className={`relative h-10 rounded-xl font-bold text-sm border-2 ${k === i ? "border-primary" : "border-transparent"} ${answers[k] !== null ? "bg-primary text-primary-ink" : "bg-ink/5"}`}>
                {k + 1}{flags[k] && <Flag size={10} className="absolute top-1 right-1 text-warn" aria-hidden />}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted mt-3">{answers.filter((a) => a !== null).length} answered · {flags.filter(Boolean).length} flagged</p>
        </nav>
      </div>
    </div>
  );
}

function IntegrityReview() {
  const { data, error, loading, reload } = useApi<{ exams: { id: string; student: string; startedAt: string; submittedAt?: string; score?: number; total: number; events: { at: string; kind: string }[] }[] }>("/api/exam", 10000);
  if (loading && !data) return <PageSkeleton />;
  if (error || !data) return <ErrorState error={error ?? ""} retry={reload} />;
  return (
    <>
      <PageHeader title="Examination Hall" desc="Mock exam results and integrity timelines." />
      <p className="card p-4 mb-5 text-sm flex items-start gap-2"><ShieldAlert size={18} className="text-warn shrink-0" aria-hidden /> Signals like leaving the tab are indicators, not proof. A notification, a slow device or a shared computer can cause them. Talk to the student before drawing conclusions.</p>
      {data.exams.length === 0 ? <div className="card"><Empty icon={Clock} title="No exams taken yet" /></div> : (
        <div className="space-y-3">
          {data.exams.map((e) => (
            <Card key={e.id}>
              <CardTitle icon={e.events.length ? AlertTriangle : CheckCircle2} action={<span className="text-sm font-bold">{e.submittedAt ? `${e.score}/${e.total}` : "In progress"}</span>}>{e.student} · {fmtDateTime(e.startedAt)}</CardTitle>
              {e.events.length === 0 ? <p className="text-sm text-muted">No signals recorded.</p> : (
                <ol className="relative border-l-2 border-line ml-2 space-y-2">
                  {e.events.map((ev, k) => (
                    <li key={k} className="ml-4 text-sm"><span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-warn" aria-hidden />
                      <b className="capitalize">{ev.kind === "visibility" ? "Left the tab" : ev.kind === "blur" ? "Window lost focus" : ev.kind === "contextmenu" ? "Right-click" : ev.kind}</b>
                      <span className="text-muted"> · +{Math.round((new Date(ev.at).getTime() - new Date(e.startedAt).getTime()) / 1000)}s</span></li>
                  ))}
                </ol>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
