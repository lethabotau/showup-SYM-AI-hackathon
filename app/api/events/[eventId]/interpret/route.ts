import { getDb } from '@/lib/server/db';
import { handleInterpret } from '@/lib/server/http';
import { defaultTransport } from '@/lib/server/openai';

export const dynamic = 'force-dynamic';
export const maxDuration = 15;

type Props = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleInterpret(eventId, req, getDb, defaultTransport);
}
