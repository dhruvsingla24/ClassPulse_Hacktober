import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// isolate the database for tests
process.env.CLASSPULSE_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "cp-test-"));

let mod: {
  db: typeof import("@/lib/db");
  arcade: typeof import("@/lib/arcade");
  logic: typeof import("@/lib/logic");
};

beforeAll(async () => {
  mod = { db: await import("@/lib/db"), arcade: await import("@/lib/arcade"), logic: await import("@/lib/logic") };
});

function playBinaryToEnd(userId: string) {
  const { tx } = mod.db;
  const { startAttempt, applyMove } = mod.arcade;
  return tx((d) => {
    const a = startAttempt(d, userId, "binary-search", 1);
    let res: Record<string, unknown> = {};
    for (let i = 0; i < 10 && !a.result; i++) {
      const p = a.puzzle as { lo: number; hi: number };
      res = applyMove(d, a, { index: Math.floor((p.lo + p.hi) / 2) }) as Record<string, unknown>;
    }
    return { a, res };
  });
}

describe("coin ledger", () => {
  it("awards a finished round exactly once, even if the final move is replayed", () => {
    const { db, tx } = mod.db;
    const { applyMove } = mod.arcade;
    const userId = db().users.find((u) => u.role === "student")!.id;
    const before = mod.logic.coins(userId);
    const { a, res } = playBinaryToEnd(userId);
    const finished = res.finished as { coins: number };
    expect(finished.coins).toBeGreaterThan(0);
    const after = mod.logic.coins(userId);
    expect(after - before).toBe(finished.coins);
    // replaying the last move (refresh, double click, scripted replay) returns the stored result and adds nothing
    const replay = tx((d) => applyMove(d, d.attempts.find((x) => x.id === a.id)!, { index: 0 })) as Record<string, unknown>;
    expect(mod.logic.coins(userId)).toBe(after);
    expect(replay.ok).toBe(false);
    expect(db().ledger.filter((l) => l.key === `attempt:${a.id}`)).toHaveLength(1);
  });

  it("the award helper is idempotent per key", () => {
    const { tx, db } = mod.db;
    const userId = db().users.find((u) => u.role === "student")!.id;
    const first = tx((d) => mod.logic.award(d, userId, "test:key", 10, "test"));
    const second = tx((d) => mod.logic.award(d, userId, "test:key", 10, "test"));
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("caps rewarded rounds per game per day", () => {
    const { db } = mod.db;
    const userId = db().users.filter((u) => u.role === "student")[1].id;
    const coins = Array.from({ length: mod.arcade.DAILY_COIN_CAP + 2 }, () => (playBinaryToEnd(userId).res.finished as { coins: number }).coins);
    expect(coins.filter((c) => c > 0)).toHaveLength(mod.arcade.DAILY_COIN_CAP);
  });
});
