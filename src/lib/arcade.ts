import "server-only";
import { randomBytes } from "node:crypto";
import { db, today } from "./db";
import {
  makeBinary, makeList, makeSort, moveBinary, moveList, moveSort, mulberry, optimalBinarySteps, rewardFor,
  type BinaryState, type ListState, type SortMode, type SortState,
} from "./games";
import { ACHIEVEMENTS, award, grantAchievement, streak } from "./logic";
import type { Attempt, DB, GameId } from "./types";

export const DAILY_COIN_CAP = 8; // rewarded attempts per game per day; more plays still count as practice

interface DailyState { qids: string[]; answers: (number | null)[]; mistakes: number }

export function publicView(a: Attempt, d: DB = db()) {
  const p = a.puzzle as BinaryState & SortState & ListState & DailyState;
  switch (a.game) {
    case "binary-search":
      return { n: p.values.length, target: p.target, lo: p.lo, hi: p.hi, optimal: optimalBinarySteps(p.values.length), revealed: Object.fromEntries(p.probes.map((i) => [i, p.values[i]])) };
    case "sorting-race":
      return { arr: p.arr, mode: p.mode, optimal: p.optimal, swaps: p.swaps };
    case "linked-list":
      return { list: p.list, ops: p.ops, step: p.step };
    case "daily-challenge":
      return {
        questions: p.qids.map((id) => {
          const q = d.questions.find((x) => x.id === id)!;
          return { id, q: q.q, options: q.options, topic: q.topic, subject: d.subjects.find((s) => s.id === q.subjectId)?.name, hint: q.hint };
        }),
        answers: p.answers,
      };
  }
}

export function startAttempt(d: DB, userId: string, game: GameId, level: number, mode: SortMode = "bubble"): Attempt {
  const seed = randomBytes(4).readUInt32LE();
  const rand = mulberry(seed);
  let puzzle: unknown;
  if (game === "binary-search") puzzle = makeBinary(level, rand);
  else if (game === "sorting-race") puzzle = makeSort(level, mode, rand);
  else if (game === "linked-list") puzzle = makeList(level, rand);
  else {
    const pool = [...d.questions].sort(() => rand() - 0.5).slice(0, 3);
    puzzle = { qids: pool.map((q) => q.id), answers: [null, null, null], mistakes: 0 } satisfies DailyState;
  }
  const a: Attempt = { id: randomBytes(9).toString("base64url"), userId, game, level, puzzle, startedAt: new Date().toISOString() };
  d.attempts.push(a);
  if (d.attempts.length > 4000) d.attempts.splice(0, d.attempts.length - 4000);
  return a;
}

type MoveInput = { index?: number; i?: number; j?: number; position?: number; choice?: number; q?: number };

export function applyMove(d: DB, a: Attempt, m: MoveInput) {
  let res: Record<string, unknown>;
  let done = false;
  let stats = { steps: 0, optimal: 0, mistakes: 0 };
  if (a.game === "binary-search") {
    const s = a.puzzle as BinaryState;
    res = moveBinary(s, m.index ?? -1);
    done = s.found;
    stats = { steps: s.probes.length, optimal: optimalBinarySteps(s.values.length), mistakes: s.mistakes };
  } else if (a.game === "sorting-race") {
    const s = a.puzzle as SortState;
    res = moveSort(s, m.i ?? -1, m.j ?? -1);
    done = res.ok === true && res.sorted === true;
    stats = { steps: s.swaps, optimal: s.optimal, mistakes: s.mistakes };
  } else if (a.game === "linked-list") {
    const s = a.puzzle as ListState;
    res = moveList(s, m.position ?? -2);
    done = res.ok === true && res.done === true;
    stats = { steps: s.step, optimal: s.ops.length, mistakes: s.mistakes };
  } else {
    const s = a.puzzle as DailyState;
    const qi = m.q ?? -1;
    if (qi < 0 || qi > 2 || s.answers[qi] !== null) return { ok: false, reason: "That question is already answered." };
    const q = d.questions.find((x) => x.id === s.qids[qi])!;
    const correct = m.choice === q.answer;
    s.answers[qi] = m.choice ?? -1;
    if (!correct) s.mistakes++;
    res = { ok: true, correct, answer: q.answer, explanation: q.explanation };
    done = s.answers.every((x) => x !== null);
    stats = { steps: 3, optimal: 3, mistakes: s.mistakes };
  }
  if (!done) return res;
  return { ...res, finished: finish(d, a, stats) };
}

function finish(d: DB, a: Attempt, stats: { steps: number; optimal: number; mistakes: number }) {
  if (a.result) return { ...a.result, duplicate: true }; // idempotent: never award twice
  const t = today();
  let coins = 0;
  let xp = 0;
  let note = "";
  if (a.game === "daily-challenge") {
    const correct = 3 - stats.mistakes;
    coins = 10 + correct * 10;
    xp = coins * 2;
    // one rewarded daily challenge per day
    if (!award(d, a.userId, `daily:${a.userId}:${t}`, coins, `Daily challenge (${correct}/3)`)) {
      coins = 0;
      note = "Today's daily challenge reward was already collected. This run counted as practice.";
    }
  } else {
    ({ coins, xp } = rewardFor(a.game, a.level, stats));
    const rewardedToday = d.attempts.filter((x) => x.userId === a.userId && x.game === a.game && x.finishedAt?.slice(0, 10) === t && (x.result?.coins ?? 0) > 0).length;
    if (rewardedToday >= DAILY_COIN_CAP) {
      coins = 0;
      note = "You've hit today's reward limit for this game. Keep practising, coins return tomorrow.";
    } else {
      award(d, a.userId, `attempt:${a.id}`, coins, `${a.game} level ${a.level}`);
    }
  }
  a.finishedAt = new Date().toISOString();
  a.result = { ok: true, steps: stats.steps, optimal: stats.optimal, coins, xp };
  const unlocked: string[] = [];
  const grant = (k: string) => grantAchievement(d, a.userId, k) && unlocked.push(k);
  if (a.game === "binary-search" && stats.steps <= stats.optimal) grant("binary-search-champion");
  if (a.game === "sorting-race" && stats.mistakes === 0) grant("sorting-master");
  if (a.game === "linked-list" && stats.mistakes === 0) grant("linked-list-architect");
  if (streak(a.userId, d).current >= 7) grant("consistency-hero");
  if (d.attempts.filter((x) => x.userId === a.userId && x.finishedAt).length >= 100) grant("century");
  return { ...a.result, mistakes: stats.mistakes, note, streak: streak(a.userId, d), achievements: unlocked.map((k) => ACHIEVEMENTS[k].name) };
}
