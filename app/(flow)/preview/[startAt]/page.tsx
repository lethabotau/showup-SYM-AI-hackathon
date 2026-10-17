import { notFound } from 'next/navigation';

const STARTS = ['create', 'respond', 'fresh', 'join', 'guest', 'participant'];

export function generateStaticParams() {
  return STARTS.map((startAt) => ({ startAt }));
}
export const dynamicParams = false;

export default function Preview({ params }: { params: { startAt: string } }) {
  if (STARTS.indexOf(params.startAt) < 0) notFound();
  return null;
}
