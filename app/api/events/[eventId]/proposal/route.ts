import { getDb } from '@/lib/server/db';
import { handleCreateProposal, handleGetProposal, handleWithdrawProposal } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleGetProposal(eventId, req, getDb);
}

export async function POST(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleCreateProposal(eventId, req, getDb);
}

export async function DELETE(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleWithdrawProposal(eventId, req, getDb);
}
