import { getDb } from '@/lib/server/db';
import { handleGetResults } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleGetResults(eventId, req, getDb);
}
