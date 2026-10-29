// Shared login with the moreh-derech site and the "אבן דרך" game.
//
// Same Supabase project, same password derivation and the same localStorage session key.
// All three sites live on cfir94.github.io, so a login in one is a login in all.
// Ported from moreh-derech/src/lib/cloudAuth.ts — keep the salt and the key identical,
// or existing accounts are locked out.

export const SUPABASE_URL = 'https://dendxtbaxiszohjjsdtd.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbmR4dGJheGlzem9oampzZHRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2OTMzMTcsImV4cCI6MjEwMjI2OTMxN30.rDYzH-3Pz2-XOYoUgrJW7GfTvdrZ7usqbSdtTZ4my6g';

const SESSION_KEY = 'israel-geo-game-session';
const PASSWORD_SALT = 'mapat-haaretz/v1';

export class CloudError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export function readSession() {
  try {
    const value = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    if (!value?.access_token || !value?.refresh_token || !value?.user_id || !value?.email) return null;
    return value;
  } catch {
    return null;
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else localStorage.removeItem(SESSION_KEY);
}

export function currentUser() {
  const session = readSession();
  if (!session) return null;
  return {
    id: session.user_id,
    email: session.email,
    name: session.display_name || session.email.split('@')[0],
  };
}

export async function supabase(path, { method = 'GET', body, auth = true, headers = {} } = {}) {
  const session = readSession();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
      ...(auth && session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 204) return { data: null, response };
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || `שגיאת שרת ${response.status}`;
    const error = new CloudError(String(message), response.status);
    error.code = data?.code;
    throw error;
  }
  return { data, response };
}

let refreshing = null;

async function refresh() {
  refreshing ??= (async () => {
    const current = readSession();
    if (!current) throw new CloudError('אין התחברות פעילה', 401);
    try {
      const { data } = await supabase('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        auth: false,
        body: { refresh_token: current.refresh_token },
      });
      saveSession({ ...current, access_token: data.access_token, refresh_token: data.refresh_token });
    } catch (error) {
      if (error.status === 400) saveSession(null);
      throw error;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

// A request as the logged-in user; refreshes an expired token once.
export async function authed(path, options = {}) {
  try {
    return await supabase(path, options);
  } catch (error) {
    if (error.status !== 401 || !readSession()) throw error;
    await refresh();
    return supabase(path, options);
  }
}

export async function accessToken() {
  const session = readSession();
  if (!session) return null;
  // Supabase tokens last an hour; refresh a little early so long recordings don't fail.
  const payload = JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (payload.exp * 1000 - Date.now() < 120_000) await refresh();
  return readSession()?.access_token ?? null;
}

async function derivedPassword(email) {
  const data = new TextEncoder().encode(`${email.trim().toLowerCase()}|${PASSWORD_SALT}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const binary = String.fromCharCode(...new Uint8Array(digest));
  return `Gg1!${btoa(binary).replace(/[^A-Za-z0-9]/g, '').slice(0, 28)}`;
}

function unpack(data, fallbackName = '') {
  const meta = data?.user?.user_metadata ?? {};
  if (!data?.access_token || !data?.refresh_token || !data?.user?.id || !data?.user?.email) {
    throw new CloudError('השרת לא החזיר התחברות תקינה');
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    user_id: data.user.id,
    email: data.user.email,
    display_name: String(meta.display_name ?? fallbackName),
    class_code: String(meta.class_code ?? ''),
    is_teacher: false,
  };
}

// Name + email, no password — the same flow as the other two sites.
export async function quickAuth(rawEmail, displayName) {
  const email = rawEmail.trim().toLowerCase();
  const password = await derivedPassword(email);
  try {
    const { data } = await supabase('/auth/v1/signup', {
      method: 'POST',
      auth: false,
      body: { email, password, data: { display_name: displayName, class_code: '' } },
    });
    if (!data?.access_token) throw new CloudError('נדרש אישור מייל בהגדרות Supabase.');
    saveSession(unpack(data, displayName));
    await authed('/rest/v1/profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: [{ id: readSession().user_id, display_name: displayName }],
    }).catch(() => {});
  } catch (error) {
    if (String(error.message).includes('אישור מייל')) throw error;
    const { data } = await supabase('/auth/v1/token?grant_type=password', {
      method: 'POST',
      auth: false,
      body: { email, password },
    });
    saveSession(unpack(data, displayName));
  }
  return currentUser();
}

export function signOut() {
  saveSession(null);
}

export function friendlyError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  if (message.includes('invalid login')) return 'המייל הזה רשום עם סיסמה אחרת. נסו להיכנס מאתר מורי הדרך.';
  if (message.includes('failed to fetch') || message.includes('network')) return 'אין חיבור לשרת. בדקו את האינטרנט ונסו שוב.';
  return error?.message || 'משהו השתבש. נסו שוב.';
}
