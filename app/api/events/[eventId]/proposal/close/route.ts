import { getDb } from '@/lib/server/db';
import { handleCloseProposal } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, ctx: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await ctx.params;
  return handleCloseProposal(eventId, req, getDb);
}
