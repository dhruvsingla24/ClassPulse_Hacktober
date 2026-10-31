import { describe, expect, it } from "vitest";
import { inversions, isSorted, makeBinary, makeList, makeSort, minSwaps, moveBinary, moveList, moveSort, mulberry, optimalBinarySteps } from "@/lib/games";

describe("binary search treasure hunt", () => {
  it("accepts an optimal search and finds the treasure", () => {
    const s = makeBinary(1, mulberry(7));
    while (!s.found) {
      const r = moveBinary(s, Math.floor((s.lo + s.hi) / 2));
      expect(r.ok).toBe(true);
    }
    expect(s.probes.length).toBeLessThanOrEqual(optimalBinarySteps(s.values.length));
  });
  it("rejects boxes outside the remaining range and counts a mistake", () => {
    const s = makeBinary(1, mulberry(3));
    const mid = Math.floor((s.lo + s.hi) / 2);
    const r = moveBinary(s, mid);
    if (s.found) return;
    const outside = s.lo > mid ? 0 : s.values.length - 1;
    const bad = moveBinary(s, outside);
    expect(bad.ok).toBe(false);
    expect(s.mistakes).toBe(1);
    expect(r.ok).toBe(true);
  });
});

describe("sorting race", () => {
  it("bubble mode only allows swapping out-of-order neighbours", () => {
    const s = makeSort(1, "bubble", mulberry(11));
    expect(moveSort(s, 0, 3).ok).toBe(false);
    let guard = 0;
    while (!isSorted(s.arr) && guard++ < 100) {
      const i = s.arr.findIndex((v, k) => k < s.arr.length - 1 && v > s.arr[k + 1]);
      expect(moveSort(s, i, i + 1).ok).toBe(true);
    }
    expect(isSorted(s.arr)).toBe(true);
    expect(s.swaps).toBe(s.optimal); // every valid bubble swap removes exactly one inversion
  });
  it("computes optimal counts", () => {
    expect(inversions([3, 1, 2])).toBe(2);
    expect(minSwaps([4, 3, 2, 1])).toBe(2);
  });
});

describe("linked list builder", () => {
  it("validates every pointer operation", () => {
    const s = makeList(2, mulberry(5));
    for (const op of [...s.ops]) {
      const pos = op.op === "insertHead" ? 0 : op.op === "insertTail" ? s.list.length : s.list.indexOf(op.value);
      expect(moveList(s, pos).ok).toBe(true);
    }
    expect(s.step).toBe(s.ops.length);
    expect(s.mistakes).toBe(0);
  });
});
