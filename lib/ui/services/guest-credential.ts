// Device-scoped guest credential for a stored event. Never put this in request URLs; the private edit
// link carries it only in the fragment, which browsers don't send to the server.
const PREFIX = 'showup-guest-';

function key(eventId: string): string {
  return PREFIX + eventId;
}

export function loadGuestCredential(eventId: string): string | null {
  try {
    const v = localStorage.getItem(key(eventId));
    return v && v.length > 0 ? v : null;
  } catch {
    return null;
  }
}

export function saveGuestCredential(eventId: string, credential: string): void {
  try {
    localStorage.setItem(key(eventId), credential);
  } catch {
    /* private mode */
  }
}

export function clearGuestCredential(eventId: string): void {
  try {
    localStorage.removeItem(key(eventId));
  } catch {
    /* ignore */
  }
}

export function editLink(origin: string, eventId: string, credential: string): string {
  return `${origin}/e/${encodeURIComponent(eventId)}#k=${encodeURIComponent(credential)}`;
}

// Kept for the page load so React Strict Mode's second constructor call still sees the consumed credential.
let consumed: { path: string; credential: string } | null = null;

/** Takes `#k=` off the address (keeping path and query) and returns its credential, unverified. */
export function consumeEditFragment(): string | null {
  try {
    const k = new URLSearchParams(location.hash.slice(1)).get('k');
    if (k !== null) history.replaceState(history.state, '', location.pathname + location.search);
    if (k) consumed = { path: location.pathname, credential: k };
    return consumed && consumed.path === location.pathname ? consumed.credential : null;
  } catch {
    return null;
  }
}

export function forgetEditFragment(): void {
  consumed = null;
}

export function guestAuthHeaders(eventId: string): Record<string, string> {
  const c = loadGuestCredential(eventId);
  return c ? { Authorization: `Bearer ${c}` } : {};
}
