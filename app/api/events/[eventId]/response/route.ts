import { getDb } from '@/lib/server/db';
import { handleGetOwnResponse, handleLeaveEvent, handleSaveResponse } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleGetOwnResponse(eventId, req, getDb);
}

export async function PUT(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleSaveResponse(eventId, req, getDb);
}

export async function DELETE(req: Request, ctx: Props) {
  const { eventId } = await ctx.params;
  return handleLeaveEvent(eventId, req, getDb);
}
