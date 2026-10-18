import { getDb } from '@/lib/server/db';
import { handleJoinEvent } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

export async function POST(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleJoinEvent(eventId, req, getDb);
}
