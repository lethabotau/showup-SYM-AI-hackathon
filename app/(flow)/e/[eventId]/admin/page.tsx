import { notFound } from 'next/navigation';
import FlowClient from '@/components/flow/FlowClient';
import { getDb } from '@/lib/server/db';
import { authoriseOrganiser, guestPath, organiserPath } from '@/lib/server/events';
import { toFlowEvent } from '@/lib/ui/utils/persisted-event';

// Referrer-Policy: no-referrer is also sent as a response header (next.config.mjs).
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Your event — showup.', referrer: 'no-referrer' as const };

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OrganiserEvent({ params, searchParams }: Props) {
  const { eventId } = await params;
  const { k } = await searchParams;
  const token = typeof k === 'string' ? k : null;
  const access = await authoriseOrganiser(getDb(), eventId, token);
  // Missing, wrong and unknown are indistinguishable to the client.
  if (access.status !== 'ok' || !token) notFound();
  const ev = access.event;
  return (
    <FlowClient
      startAt="fresh"
      event={toFlowEvent(ev, { guestPath: guestPath(ev.id), organiserPath: organiserPath(ev.id, token) })}
      initialState={{ screen: 'event', mode: 'organiser', myName: ev.organiserName, name: ev.title }}
    />
  );
}
