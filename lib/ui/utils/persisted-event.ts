// Maps a stored event (lib/server/events.ts PublicEvent) onto the flow's event shape, and formats its details.
import { slotFromIso } from './dates';
import { fmtCompact } from './format';

interface StoredEvent {
  id: string;
  title: string;
  organiserName: string;
  durationMin: number;
  timezone: string;
  days: { date: string; start: number; end: number }[];
}

export interface EventLinks { guestPath: string; organiserPath?: string }

interface FlowSlot { id: string; iso: string; day: string; title: string; short: string; win: { s: number; e: number } }

export function toFlowEvent(ev: StoredEvent, links: EventLinks) {
  const slots: FlowSlot[] = ev.days.map((d) => ({ ...(slotFromIso(d.date) as Omit<FlowSlot, 'win'>), win: { s: d.start, e: d.end } }));
  const first = slots[0];
  return {
    id: ev.id,
    name: ev.title,
    organiser: ev.organiserName,
    duration: ev.durationMin,
    timezone: ev.timezone,
    slots,
    win: first ? first.win : { s: 1020, e: 1440 },
    responses: [],
    proposal: null,
    persisted: true,
    links,
  };
}

function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} hr` : '', m ? `${m} min` : ''].filter(Boolean).join(' ');
}

/** "Fri 23 Oct, Sat 24 Oct · 5pm – 12am · 2 hr event", listing each day's window when they differ. */
export function eventDetails(ev: { slots: FlowSlot[]; duration: number }): string {
  const windows = ev.slots.map((s) => fmtCompact(s.win.s, s.win.e));
  const same = windows.every((w) => w === windows[0]);
  const days = same
    ? `${ev.slots.map((s) => s.short).join(', ')} · ${windows[0] ?? ''}`
    : ev.slots.map((s, i) => `${s.short} ${windows[i]}`).join(', ');
  return `${days} · ${durationText(ev.duration)} event`;
}
