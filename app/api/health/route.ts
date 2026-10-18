import { getDb } from '@/lib/server/db';
import { checkHealth } from '@/lib/server/http';

export const dynamic = 'force-dynamic';

export function GET() {
  return checkHealth(getDb);
}
