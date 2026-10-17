import { notFound } from 'next/navigation';
import FlowClient from '@/components/flow/FlowClient';

// The seeded entry points the canvas boards provided (Create.dc.html, Respond.dc.html, …), with their titles.
const STARTS: Record<string, string> = {
  create: 'Create — showup.',
  respond: 'Respond — showup.',
  fresh: 'Your event — showup.',
  join: 'Join — showup.',
  guest: 'Event, guest view — showup.',
  participant: 'Respond, participant — showup.'
};

export const dynamicParams = false; // unknown values → 404

export function generateStaticParams() {
  return Object.keys(STARTS).map((startAt) => ({ startAt }));
}

export function generateMetadata({ params }: { params: { startAt: string } }) {
  return { title: STARTS[params.startAt] };
}

export default function Preview({ params }: { params: { startAt: string } }) {
  if (!STARTS[params.startAt]) notFound();
  return <FlowClient startAt={params.startAt} />;
}
