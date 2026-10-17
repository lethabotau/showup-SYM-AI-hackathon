'use client';
import dynamic from 'next/dynamic';

// Client-only, as the original was: the logic reads sessionStorage/localStorage/matchMedia in its
// constructor, so server rendering would produce different markup and hydration mismatches.
const FlowApp = dynamic(() => import('./FlowApp'), { ssr: false });

export type FlowProps = {
  /** Start screen + fixture seed: landing | create | respond | fresh | join | guest | participant (default landing). */
  startAt?: string;
  /** Real event data (e.g. loaded by a future /e/[eventId] route); replaces the seeded demo event. */
  event?: any;
  /** Any state fields to override after seeding (merged last). */
  initialState?: Record<string, any>;
};

export default function FlowClient({ startAt = 'landing', ...rest }: FlowProps) {
  return <FlowApp startAt={startAt} {...rest} />;
}
