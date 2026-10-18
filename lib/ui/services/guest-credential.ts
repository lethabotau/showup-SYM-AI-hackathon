// Device-scoped guest credential for a stored event. Never put this in URLs.
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

export function guestAuthHeaders(eventId: string): Record<string, string> {
  const c = loadGuestCredential(eventId);
  return c ? { Authorization: `Bearer ${c}` } : {};
}
