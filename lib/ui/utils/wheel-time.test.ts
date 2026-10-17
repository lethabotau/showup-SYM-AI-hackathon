import { describe, expect, it } from 'vitest';
import { minuteInWindow, untilFromWheel, wheelMinute } from './wheel-time';

describe('wheel time adapters', () => {
  it('maps SHOWUP end-of-day values to picker time-of-day values', () => {
    expect(wheelMinute(1440)).toBe(0);
    expect(wheelMinute(1500)).toBe(60);
  });

  it('lifts Until values after From on SHOWUP’s linear minute axis', () => {
    expect(untilFromWheel(0, 17 * 60)).toBe(1440);
    expect(untilFromWheel(60, 17 * 60)).toBe(1500);
    expect(untilFromWheel(60, 1440)).toBe(1500);
  });

  it('lifts Respond values into a cross-midnight organiser window', () => {
    const window = { s: 17 * 60, e: 25 * 60 };
    expect(minuteInWindow(17 * 60, window)).toBe(17 * 60);
    expect(minuteInWindow(0, window)).toBe(1440);
    expect(minuteInWindow(60, window)).toBe(1500);
  });
});
