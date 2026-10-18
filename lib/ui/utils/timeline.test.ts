import { describe, expect, it } from 'vitest';
import { moveEndpoint, nearestEndpoint, pointerMinute, snapMinute } from './timeline';

const evening = { s: 17 * 60, e: 24 * 60 };
const late = { s: 17 * 60, e: 25 * 60 };
const h = (x: number) => x * 60;

describe('timeline pointer mapping', () => {
  it('maps pointer x across the track to minutes in the window', () => {
    expect(pointerMinute(100, 100, 280, evening)).toBe(h(17));
    expect(pointerMinute(380, 100, 280, evening)).toBe(h(24));
    expect(pointerMinute(240, 100, 280, evening)).toBe(h(20.5));
  });

  it('clamps a pointer outside the track to the window ends', () => {
    expect(pointerMinute(-500, 100, 280, evening)).toBe(h(17));
    expect(pointerMinute(5000, 100, 280, evening)).toBe(h(24));
    expect(pointerMinute(50, 100, 0, evening)).toBe(h(17));
  });

  it('snaps to whole hours and window edges, ties going to the earlier candidate', () => {
    expect(snapMinute(h(19.4), evening)).toBe(h(19));
    expect(snapMinute(h(19.6), evening)).toBe(h(20));
    expect(snapMinute(h(19.5), evening)).toBe(h(19));
    expect(snapMinute(h(17.25), { s: h(17.25), e: h(20) })).toBe(h(17.25));
    expect(snapMinute(h(24.6), late)).toBe(h(25));
  });
});

describe('nearest endpoint', () => {
  it('inside a range picks the nearer end; the midpoint picks the end', () => {
    const rs = [{ s: h(18), e: h(22) }];
    expect(nearestEndpoint(rs, h(19))).toEqual({ idx: 0, edge: 's' });
    expect(nearestEndpoint(rs, h(21))).toEqual({ idx: 0, edge: 'e' });
    expect(nearestEndpoint(rs, h(20))).toEqual({ idx: 0, edge: 'e' });
  });

  it('outside every range picks the closest end, preferring an end on a tie', () => {
    const rs = [{ s: h(17), e: h(18) }, { s: h(21), e: h(22) }];
    expect(nearestEndpoint(rs, h(19))).toEqual({ idx: 0, edge: 'e' });
    expect(nearestEndpoint(rs, h(20))).toEqual({ idx: 1, edge: 's' });
    expect(nearestEndpoint([{ s: h(18), e: h(19) }, { s: h(21), e: h(22) }], h(20))).toEqual({ idx: 0, edge: 'e' });
    expect(nearestEndpoint(rs, h(23))).toEqual({ idx: 1, edge: 'e' });
  });
});

describe('moving an endpoint', () => {
  it('moves the chosen end without touching the original ranges', () => {
    const rs = [{ s: h(18), e: h(22) }];
    expect(moveEndpoint(rs, { idx: 0, edge: 'e' }, h(23), evening)).toEqual([{ s: h(18), e: h(23) }]);
    expect(rs).toEqual([{ s: h(18), e: h(22) }]);
  });

  it('keeps ranges at least an hour long and inside the window', () => {
    expect(moveEndpoint([{ s: h(18), e: h(22) }], { idx: 0, edge: 's' }, h(22), evening)).toEqual([{ s: h(22), e: h(23) }]);
    expect(moveEndpoint([{ s: h(18), e: h(22) }], { idx: 0, edge: 's' }, h(24), evening)).toEqual([{ s: h(23), e: h(24) }]);
    expect(moveEndpoint([{ s: h(18), e: h(22) }], { idx: 0, edge: 'e' }, h(17), evening)).toEqual([{ s: h(18), e: h(19) }]);
  });

  it('works past midnight on the linear minute axis', () => {
    expect(moveEndpoint([{ s: h(20), e: h(23) }], { idx: 0, edge: 'e' }, h(25), late)).toEqual([{ s: h(20), e: h(25) }]);
    expect(moveEndpoint([{ s: h(20), e: h(23) }], { idx: 0, edge: 's' }, h(25), late)).toEqual([{ s: h(24), e: h(25) }]);
  });

  it('dragging back over the start position restores the range', () => {
    const base = [{ s: h(19), e: h(21) }];
    const target = nearestEndpoint(base, h(21));
    const out = moveEndpoint(base, target, h(23), evening);
    expect(out).toEqual([{ s: h(19), e: h(23) }]);
    expect(moveEndpoint(base, target, h(21), evening)).toEqual(base);
  });
});
