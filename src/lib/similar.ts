const STOP = new Set("a an the is are was were be of to in on for and or why how what when do does did i my me it this that with can we you".split(" "));
export const tokens = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

/** Jaccard-style overlap, used for duplicate-doubt detection and search ranking. */
export function similarity(a: string, b: string) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  A.forEach((w) => { if (B.has(w)) inter++; });
  return inter / Math.min(A.size, B.size);
}
