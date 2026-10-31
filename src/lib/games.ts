/**
 * Server-authoritative game rules. The client only ever sees what this module reveals,
 * and every move is checked here. Pure functions so they can be unit-tested.
 */

export type Rand = () => number;

/* ---------------- Binary Search Treasure Hunt ---------------- */

export interface BinaryState {
  values: number[];
  target: number;
  lo: number;
  hi: number;
  probes: number[];
  mistakes: number;
  found: boolean;
}

export const binarySize = (level: number) => [15, 31, 63][Math.min(Math.max(level, 1), 3) - 1];
export const optimalBinarySteps = (n: number) => Math.ceil(Math.log2(n + 1));

export function makeBinary(level: number, rand: Rand): BinaryState {
  const n = binarySize(level);
  const set = new Set<number>();
  while (set.size < n) set.add(1 + Math.floor(rand() * n * 6));
  const values = [...set].sort((a, b) => a - b);
  const target = values[Math.floor(rand() * n)];
  return { values, target, lo: 0, hi: n - 1, probes: [], mistakes: 0, found: false };
}

export function moveBinary(s: BinaryState, index: number) {
  if (s.found) return { ok: false as const, reason: "Treasure already found." };
  if (!Number.isInteger(index) || index < 0 || index >= s.values.length) return { ok: false as const, reason: "That box doesn't exist." };
  if (index < s.lo || index > s.hi) {
    s.mistakes++;
    return { ok: false as const, reason: "That box is outside the range that can still hold the treasure." };
  }
  s.probes.push(index);
  const v = s.values[index];
  if (v === s.target) {
    s.found = true;
    return { ok: true as const, value: v, verdict: "found" as const, lo: s.lo, hi: s.hi };
  }
  if (v < s.target) s.lo = index + 1;
  else s.hi = index - 1;
  return { ok: true as const, value: v, verdict: v < s.target ? ("go-right" as const) : ("go-left" as const), lo: s.lo, hi: s.hi };
}

/* ---------------- Sorting Race ---------------- */

export type SortMode = "bubble" | "selection" | "insertion";
export interface SortState {
  arr: number[];
  mode: SortMode;
  swaps: number;
  mistakes: number;
  optimal: number;
}

export function inversions(a: number[]) {
  let c = 0;
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (a[i] > a[j]) c++;
  return c;
}

/** Minimum swaps of any two items = n - number of permutation cycles. */
export function minSwaps(a: number[]) {
  const sorted = [...a].sort((x, y) => x - y);
  const pos = new Map(sorted.map((v, i) => [v, i]));
  const seen = new Array(a.length).fill(false);
  let cycles = 0;
  for (let i = 0; i < a.length; i++) {
    if (seen[i]) continue;
    cycles++;
    let j = i;
    while (!seen[j]) {
      seen[j] = true;
      j = pos.get(a[j])!;
    }
  }
  return a.length - cycles;
}

export const isSorted = (a: number[]) => a.every((v, i) => i === 0 || a[i - 1] <= v);

export function makeSort(level: number, mode: SortMode, rand: Rand): SortState {
  const n = [6, 8, 10][Math.min(Math.max(level, 1), 3) - 1];
  let arr: number[];
  do {
    const set = new Set<number>();
    while (set.size < n) set.add(2 + Math.floor(rand() * 60));
    arr = [...set];
  } while (isSorted(arr));
  return { arr, mode, swaps: 0, mistakes: 0, optimal: mode === "selection" ? minSwaps(arr) : inversions(arr) };
}

export function moveSort(s: SortState, i: number, j: number) {
  const n = s.arr.length;
  if (![i, j].every((k) => Number.isInteger(k) && k >= 0 && k < n) || i === j) return { ok: false as const, reason: "Pick two different blocks." };
  if (i > j) [i, j] = [j, i];
  if ((s.mode === "bubble" || s.mode === "insertion") && j !== i + 1) {
    s.mistakes++;
    return { ok: false as const, reason: `${s.mode === "bubble" ? "Bubble" : "Insertion"} sort only swaps neighbours.` };
  }
  if (s.arr[i] <= s.arr[j]) {
    s.mistakes++;
    return { ok: false as const, reason: "Those two are already in order, so swapping them moves away from sorted." };
  }
  [s.arr[i], s.arr[j]] = [s.arr[j], s.arr[i]];
  s.swaps++;
  return { ok: true as const, arr: s.arr, sorted: isSorted(s.arr) };
}

/* ---------------- Linked List Builder ---------------- */

export type ListOp = { op: "insertHead" | "insertTail"; value: number } | { op: "delete"; value: number } | { op: "find"; value: number };
export interface ListState {
  list: number[];
  ops: ListOp[];
  step: number;
  mistakes: number;
}

export function makeList(level: number, rand: Rand): ListState {
  const pick = () => 10 + Math.floor(rand() * 89);
  const list = [pick(), pick(), pick()].filter((v, i, a) => a.indexOf(v) === i);
  const ops: ListOp[] = [];
  const sim = [...list];
  const count = 4 + Math.min(level, 3);
  for (let k = 0; k < count; k++) {
    const roll = rand();
    if (roll < 0.3) { const v = pick(); if (!sim.includes(v)) { ops.push({ op: "insertHead", value: v }); sim.unshift(v); continue; } }
    if (roll < 0.6) { const v = pick(); if (!sim.includes(v)) { ops.push({ op: "insertTail", value: v }); sim.push(v); continue; } }
    if (roll < 0.85 && sim.length > 2) { const v = sim[Math.floor(rand() * sim.length)]; ops.push({ op: "delete", value: v }); sim.splice(sim.indexOf(v), 1); continue; }
    ops.push({ op: "find", value: sim[Math.floor(rand() * sim.length)] });
  }
  return { list, ops, step: 0, mistakes: 0 };
}

/**
 * The player answers the current operation by pointing at a position:
 * insert -> the gap index (0 = before head, list.length = after tail),
 * delete / find -> the node index.
 */
export function moveList(s: ListState, position: number) {
  const op = s.ops[s.step];
  if (!op) return { ok: false as const, reason: "All operations are done." };
  let expected: number;
  if (op.op === "insertHead") expected = 0;
  else if (op.op === "insertTail") expected = s.list.length;
  else expected = s.list.indexOf(op.value);
  if (position !== expected) {
    s.mistakes++;
    const why = op.op === "insertHead" ? "A new head goes before the current first node." : op.op === "insertTail" ? "The tail is after the last node." : `Follow the next pointers from the head until you reach ${op.value}.`;
    return { ok: false as const, reason: why };
  }
  if (op.op === "insertHead") s.list.unshift(op.value);
  else if (op.op === "insertTail") s.list.push(op.value);
  else if (op.op === "delete") s.list.splice(expected, 1);
  s.step++;
  return { ok: true as const, list: s.list, step: s.step, done: s.step >= s.ops.length, visited: expected + 1 };
}

/* ---------------- Rewards ---------------- */

export function rewardFor(game: string, level: number, r: { steps: number; optimal: number; mistakes: number }) {
  const base = 15 + level * 5;
  const efficiency = r.steps <= r.optimal ? 15 : r.steps <= r.optimal + 2 ? 6 : 0;
  const accuracy = r.mistakes === 0 ? 10 : r.mistakes <= 2 ? 4 : 0;
  const coins = base + efficiency + accuracy;
  return { coins, xp: coins * 2 };
}

export function mulberry(seed: number): Rand {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
