// Client calls to stored-event APIs. Credentials stay in guest-credential.ts, never in URLs.

export async function joinStoredEvent(eventId: string, name: string): Promise<{ ok: true; participantId: string; name: string; credential: string } | { ok: false; status: number; message: string; field?: string }> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  const j = await res.json().catch(() => null);
  if (res.ok && j && j.credential) return { ok: true, participantId: j.participantId, name: j.name, credential: j.credential };
  const err = j && j.error;
  return { ok: false, status: res.status, message: (err && err.message) || "We couldn't join this event.", field: err && err.field };
}

export async function fetchOwnResponse(eventId: string, credential: string): Promise<{ ok: true; body: unknown } | { ok: false; status: number }> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/response`, {
    headers: { Authorization: `Bearer ${credential}` },
  });
  if (res.status === 401) return { ok: false, status: 401 };
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, body: await res.json() };
}

/** Live aggregates. Guests and viewers send no credential; only the organiser page sends its token, as a header. */
export async function fetchResults(eventId: string, organiserToken?: string | null): Promise<{ ok: true; body: unknown } | { ok: false; status: number }> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/results`, {
    headers: organiserToken ? { Authorization: `Bearer ${organiserToken}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true, body: await res.json() };
}

export async function saveOwnResponse(eventId: string, credential: string, body: unknown): Promise<{ ok: true; body: unknown } | { ok: false; message: string; field?: string }> {
  const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/response`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential}` },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => null);
  if (res.ok) return { ok: true, body: j };
  const err = j && j.error;
  return { ok: false, message: (err && err.message) || "We couldn't save your response.", field: err && err.field };
}
