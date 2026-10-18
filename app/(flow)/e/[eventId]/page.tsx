import { cache } from 'react';
import { notFound } from 'next/navigation';
import FlowClient from '@/components/flow/FlowClient';
import { getDb } from '@/lib/server/db';
import { getPublicEvent, guestPath } from '@/lib/server/events';
import { toFlowEvent } from '@/lib/ui/utils/persisted-event';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

const load = cache((id: string) => getPublicEvent(getDb(), id));

export async function generateMetadata({ params }: Props) {
  const ev = await load((await params).eventId);
  return { title: ev ? `${ev.title} — showup.` : 'showup.' };
}

export default async function GuestEvent({ params }: Props) {
  const ev = await load((await params).eventId);
  if (!ev) notFound();
  return <FlowClient startAt="join" event={toFlowEvent(ev, { guestPath: guestPath(ev.id) })} initialState={{ screen: 'join' }} />;
}
