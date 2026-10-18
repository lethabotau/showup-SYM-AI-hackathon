import { getDb } from '@/lib/server/db';
import { handleCreateEvent } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export function POST(req: Request) {
  return handleCreateEvent(req, getDb);
}
