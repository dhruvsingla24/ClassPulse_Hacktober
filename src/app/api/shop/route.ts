import { z } from "zod";
import { body, route } from "@/lib/api";
import { HttpError, requireUser } from "@/lib/auth";
import { db, tx } from "@/lib/db";
import { SHOP, coins } from "@/lib/logic";

export const GET = route(async () => {
  const u = requireUser();
  const owned = new Set(db().inventory.filter((i) => i.userId === u.id).map((i) => i.itemId));
  return { items: SHOP.map((s) => ({ ...s, owned: owned.has(s.id) })), coins: coins(u.id) };
});

export const POST = route(async (req: Request) => {
  const u = requireUser("student");
  const { itemId } = await body(req, z.object({ itemId: z.string() }));
  return tx((d) => {
    const item = SHOP.find((s) => s.id === itemId);
    if (!item) throw new HttpError(404, "Item not found.");
    if (d.inventory.some((i) => i.userId === u.id && i.itemId === itemId)) throw new HttpError(409, "You already own this.");
    if (coins(u.id, d) < item.price) throw new HttpError(400, "Not enough coins yet. Play a round in the Arcade!");
    // purchases are cosmetic only and recorded as negative ledger entries
    d.ledger.push({ key: `buy:${u.id}:${itemId}`, userId: u.id, amount: -item.price, reason: `Bought ${item.name}`, at: new Date().toISOString() });
    d.inventory.push({ userId: u.id, itemId, at: new Date().toISOString() });
    return { ok: true, coins: coins(u.id, d) };
  });
});

export const dynamic = "force-dynamic";
