import { getDb } from '@/lib/server/db';
import { handleGetEvent } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params;
  return handleGetEvent(eventId, getDb);
}
