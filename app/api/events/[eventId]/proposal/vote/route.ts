import { getDb } from '@/lib/server/db';
import { handleVote } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params;
  return handleVote(eventId, req, getDb);
}
