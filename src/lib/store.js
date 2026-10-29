// The learning record: an append-only list of events, kept in localStorage and mirrored
// to Supabase (table jp_events, see supabase/schema.sql).
//
// Nothing is ever edited or deleted. A new answer, a grade, a checked task — each is a new
// event, and all progress is derived from the list. That keeps two devices from overwriting
// each other: sync is just "union by id".

import { authed } from './auth.js';
import { israelDay } from './dates.js';

const LEGACY_KEY = 'kotoba-progress-v1';
const PAGE = 1000;

let userId = null;
let events = new Map(); // id → event
let pending = new Set(); // ids not yet in the cloud
const listeners = new Set();

export const sync = { state: 'idle', message: '' }; // idle | syncing | ok | offline | no-table | error

function localKey() {
  return `kotoba-v2:${userId}`;
}

function saveLocal() {
  try {
    localStorage.setItem(localKey(), JSON.stringify({ events: [...events.values()], pending: [...pending] }));
  } catch {
    // Storage full or blocked: the cloud copy still holds everything that synced.
  }
}

function emit() {
  for (const fn of listeners) fn();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setSync(state, message = '') {
  sync.state = state;
  sync.message = message;
  emit();
}

export function open(user) {
  userId = user.id;
  events = new Map();
  pending = new Set();
  try {
    const saved = JSON.parse(localStorage.getItem(localKey()) || 'null');
    for (const e of saved?.events ?? []) events.set(e.id, e);
    for (const id of saved?.pending ?? []) if (events.has(id)) pending.add(id);
  } catch {
    // A broken local copy is replaced by the cloud copy on the next pull.
  }
  importLegacy();
  emit();
  return pull();
}

// The previous version of the site kept attempts in one localStorage object. Keep it, once.
function importLegacy() {
  if (all('legacy').length) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw || raw.length > 1_500_000) return;
    const data = JSON.parse(raw);
    const hasContent = data?.attempts?.length || Object.keys(data?.drafts ?? {}).length || data?.speakingSessions?.length;
    if (hasContent) add('legacy', { source: LEGACY_KEY, data });
  } catch {
    // Unreadable legacy data is left in place untouched.
  }
}

export function add(kind, data = {}) {
  const at = new Date().toISOString();
  const event = { id: crypto.randomUUID(), kind, at, day: israelDay(new Date(at)), data };
  events.set(event.id, event);
  pending.add(event.id);
  saveLocal();
  emit();
  schedulePush();
  return event;
}

export function all(kind) {
  const list = [...events.values()].sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return kind ? list.filter((e) => e.kind === kind) : list;
}

let pushTimer = null;
function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 800);
}

export async function push() {
  if (!userId || !pending.size) return;
  const batch = [...pending].slice(0, 200).map((id) => {
    const e = events.get(id);
    return { id: e.id, kind: e.kind, data: e.data, at: e.at };
  });
  setSync('syncing');
  try {
    await authed('/rest/v1/jp_events?on_conflict=id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: batch,
    });
    for (const row of batch) pending.delete(row.id);
    saveLocal();
    if (pending.size) return push();
    setSync('ok');
  } catch (error) {
    reportError(error);
  }
}

export async function pull() {
  if (!userId) return;
  setSync('syncing');
  try {
    for (let from = 0; ; from += PAGE) {
      const { data } = await authed('/rest/v1/jp_events?select=id,kind,data,at&order=at.asc', {
        headers: { Range: `${from}-${from + PAGE - 1}` },
      });
      for (const row of data ?? []) {
        if (!events.has(row.id)) events.set(row.id, { ...row, day: israelDay(new Date(row.at)) });
      }
      if (!data || data.length < PAGE) break;
    }
    saveLocal();
    emit();
    if (pending.size) await push();
    else setSync('ok');
  } catch (error) {
    reportError(error);
  }
}

function reportError(error) {
  if (error.status === 404 || error.code === 'PGRST205' || error.code === '42P01') {
    setSync('no-table', 'טבלת המעקב עוד לא נוצרה ב־Supabase. הכול נשמר בינתיים בדפדפן.');
  } else if (String(error.message).toLowerCase().includes('fetch')) {
    setSync('offline', 'אין חיבור. הכול נשמר בדפדפן ויסונכרן כשהחיבור יחזור.');
  } else {
    setSync('error', error.message);
  }
}

export function pendingCount() {
  return pending.size;
}

addEventListener('online', () => push());
addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') pull();
});
