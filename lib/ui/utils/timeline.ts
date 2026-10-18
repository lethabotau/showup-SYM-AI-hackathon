// Pure timeline logic shared by tapping and dragging on the Respond availability bar.
// Minutes are linear: values above 1440 are after midnight.

export type Range = { s: number; e: number };
export type Endpoint = { idx: number; edge: 's' | 'e' };

export const MIN_RANGE = 60;
/** Pointer travel that turns a press into a drag (or a scroll) instead of a tap. */
export const DRAG_PX = 6;

/** Pointer x to minutes in the window; outside the track clamps to the window's ends. */
export function pointerMinute(clientX: number, left: number, width: number, win: Range): number {
  const ratio = width > 0 ? Math.max(0, Math.min(1, (clientX - left) / width)) : 0;
  return win.s + ratio * (win.e - win.s);
}

/** Snap to the nearest whole hour or window edge; ties keep the earlier candidate. */
export function snapMinute(m: number, win: Range): number {
  const cands = [win.s, win.e];
  for (let h = Math.ceil(win.s / 60) * 60; h <= win.e; h += 60) cands.push(h);
  let hit = cands[0]!;
  for (const c of cands) if (Math.abs(c - m) < Math.abs(hit - m)) hit = c;
  return hit;
}

/** The endpoint a snapped minute moves: the nearer end of the range it falls in, else the closest end outside. */
export function nearestEndpoint(rs: readonly Range[], hit: number): Endpoint {
  const inside = rs.findIndex((r) => hit >= r.s && hit <= r.e);
  if (inside >= 0) {
    const r = rs[inside]!;
    return { idx: inside, edge: hit - r.s < r.e - hit ? 's' : 'e' };
  }
  let best = -1;
  let bestD = Infinity;
  let bestEnd = false;
  rs.forEach((r, i) => {
    const d = hit < r.s ? r.s - hit : hit - r.e;
    const isEnd = hit > r.e;
    if (d < bestD || (d === bestD && isEnd)) { best = i; bestD = d; bestEnd = isEnd; }
  });
  return { idx: best, edge: bestEnd ? 'e' : 's' };
}

/** Move one endpoint to `hit`, then keep every range at least an hour long and inside the window. */
export function moveEndpoint(rs: readonly Range[], target: Endpoint, hit: number, win: Range): Range[] {
  const out = rs.map((r) => ({ s: r.s, e: r.e }));
  const r = out[target.idx];
  if (r) r[target.edge] = hit;
  for (const x of out) {
    if (x.e - x.s < MIN_RANGE) {
      if (x.s + MIN_RANGE <= win.e) x.e = x.s + MIN_RANGE;
      else { x.e = win.e; x.s = win.e - MIN_RANGE; }
    }
    x.s = Math.max(win.s, x.s);
    x.e = Math.min(win.e, x.e);
  }
  return out;
}
