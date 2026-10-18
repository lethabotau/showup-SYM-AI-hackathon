// Route handler logic, kept free of Next.js so it can be tested against an isolated database.
import { isUnavailable, logDbError, type Db } from './db';
import { createEvent, getPublicEvent, guestPath, organiserPath } from './events';
import { authenticateGuest, joinEvent, loadOwnResponse, saveResponse } from './responses';
import { validateCreateEvent } from './validate';

export const MAX_BODY_BYTES = 16_384;
const NO_STORE = { 'Cache-Control': 'no-store' };

function json(status: number, body: unknown): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function error(status: number, code: string, message: string, field?: string): Response {
  return json(status, { error: field ? { code, message, field } : { code, message } });
}

function failure(context: string, err: unknown): Response {
  logDbError(context, err);
  return isUnavailable(err)
    ? error(503, 'unavailable', "We couldn't reach the database. Try again in a moment.")
    : error(500, 'server_error', 'Something went wrong on our side. Try again in a moment.');
}

export async function checkHealth(getDb: () => Db): Promise<Response> {
  try {
    const rows = await getDb().query<{ ok: number }>('SELECT 1 AS ok');
    if (Number(rows[0]?.ok) === 1) return json(200, { ok: true });
    return json(503, { ok: false });
  } catch (err) {
    logDbError('health', err);
    return json(503, { ok: false });
  }
}

export async function handleCreateEvent(req: Request, getDb: () => Db, now: Date = new Date()): Promise<Response> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return error(415, 'unsupported_media_type', 'Send the event as JSON.');
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return error(413, 'too_large', 'That request is too large.');
  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return error(413, 'too_large', 'That request is too large.');
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return error(400, 'invalid_json', 'Send the event as valid JSON.');
  }
  const v = validateCreateEvent(body, now);
  if ('error' in v) return error(400, 'invalid_input', v.error.message, v.error.field);
  try {
    const { id, token } = await createEvent(getDb(), v.value);
    return json(201, { id, guestPath: guestPath(id), organiserPath: organiserPath(id, token) });
  } catch (err) {
    return failure('create-event', err);
  }
}

export async function handleGetEvent(id: string, getDb: () => Db): Promise<Response> {
  try {
    const event = await getPublicEvent(getDb(), id);
    return event ? json(200, event) : error(404, 'not_found', "We couldn't find that event.");
  } catch (err) {
    return failure('get-event', err);
  }
}

function guestCredential(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    const c = auth.slice(7).trim();
    return c || null;
  }
  return null;
}

async function readJson(req: Request): Promise<{ ok: true; body: unknown } | { ok: false; res: Response }> {
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return { ok: false, res: error(415, 'unsupported_media_type', 'Send JSON.') };
  }
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BODY_BYTES) return { ok: false, res: error(413, 'too_large', 'That request is too large.') };
  const raw = await req.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return { ok: false, res: error(413, 'too_large', 'That request is too large.') };
  try {
    return { ok: true, body: JSON.parse(raw) };
  } catch {
    return { ok: false, res: error(400, 'invalid_json', 'Send valid JSON.') };
  }
}

export async function handleJoinEvent(eventId: string, req: Request, getDb: () => Db): Promise<Response> {
  const parsed = await readJson(req);
  if ('res' in parsed) return parsed.res;
  const body = parsed.body as { name?: unknown };
  try {
    const result = await joinEvent(getDb(), eventId, body.name);
    switch (result.status) {
      case 'ok':
        return json(201, { participantId: result.participant.id, name: result.participant.name, credential: result.credential });
      case 'invalid':
        return error(400, 'invalid_input', result.error.message, result.error.field);
      case 'name_taken':
        return error(409, 'name_taken', "That name's taken. Try adding an initial.");
      case 'full':
        return error(503, 'full', 'This event has reached its participant limit.');
      case 'not_found':
        return error(404, 'not_found', "We couldn't find that event.");
    }
  } catch (err) {
    return failure('join-event', err);
  }
}

export async function handleGetOwnResponse(eventId: string, req: Request, getDb: () => Db): Promise<Response> {
  const cred = guestCredential(req);
  if (!cred) return error(401, 'unauthorised', 'Sign in with your guest link first.');
  try {
    const auth = await authenticateGuest(getDb(), eventId, cred);
    if (auth.status !== 'ok') return error(401, 'unauthorised', 'Your guest access is not valid.');
    const response = await loadOwnResponse(getDb(), eventId, auth.participant);
    return json(200, response);
  } catch (err) {
    return failure('get-response', err);
  }
}

export async function handleSaveResponse(eventId: string, req: Request, getDb: () => Db): Promise<Response> {
  const cred = guestCredential(req);
  if (!cred) return error(401, 'unauthorised', 'Sign in with your guest link first.');
  const parsed = await readJson(req);
  if ('res' in parsed) return parsed.res;
  try {
    const auth = await authenticateGuest(getDb(), eventId, cred);
    if (auth.status !== 'ok') return error(401, 'unauthorised', 'Your guest access is not valid.');
    const result = await saveResponse(getDb(), eventId, auth.participant, parsed.body);
    if (result.status === 'invalid') return error(400, 'invalid_input', result.error.message, result.error.field);
    return json(200, result.response);
  } catch (err) {
    return failure('save-response', err);
  }
}
