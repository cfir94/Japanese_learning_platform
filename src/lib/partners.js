import { accessToken, currentUser } from './auth.js';
import { API } from './check.js';
import * as store from './store.js';
import { israelDay } from './dates.js';
import { pace, pointStatuses, taskState } from '../logic/progress.js';
import { englishProgress } from '../logic/english.js';

export let pairState = { code: '', role: '', connected: false, snapshots: {}, state: 'idle' };
const listeners = new Set();
let timer;
let polling;
let syncing = null;
const key = () => `kotoba-pair:${currentUser()?.id || 'guest'}`;
const emit = () => { for (const listener of listeners) listener(); };
export const subscribePair = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

async function call(body) {
  const token = await accessToken();
  if (!token) throw new Error('signed_out');
  const response = await fetch(`${API}/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'pair_error');
  return data;
}

function save() { try { localStorage.setItem(key(), JSON.stringify({ code: pairState.code, role: pairState.role })); } catch { /* No storage: this visit still works. */ } }
function apply(data, code = pairState.code) { pairState = { ...pairState, ...data, code, state: 'ok' }; save(); emit(); }

export async function openPair() {
  clearInterval(polling);
  clearTimeout(timer);
  pairState = { code: '', role: '', connected: false, snapshots: {}, state: 'idle' };
  try {
    const saved = JSON.parse(localStorage.getItem(key()) || 'null');
    if (/^[a-f0-9]{32}$/.test(saved?.code || '')) pairState = { ...pairState, code: saved.code, role: saved.role };
  } catch { /* Broken pairing metadata cannot affect the learning record. */ }
  emit();
  if (!pairState.code) return;
  await syncPair();
  polling = setInterval(() => syncPair(), 60_000);
}

export async function createPair() {
  const data = await call({ action: 'create' });
  apply(data, data.code);
  await syncPair();
  clearInterval(polling);
  polling = setInterval(() => syncPair(), 60_000);
}

export async function joinPair(code) {
  if (!/^[a-f0-9]{32}$/.test(code)) throw new Error('bad_invite');
  const data = await call({ action: 'join', code });
  apply(data, code);
  await syncPair();
  clearInterval(polling);
  polling = setInterval(() => syncPair(), 60_000);
}

export function ownSnapshot() {
  const events = store.all();
  if (pairState.role === 'masami') {
    const { units, words, attempts } = englishProgress(events);
    return { units, words, attempts };
  }
  return { grammar: pointStatuses(events), tasks: taskState(events), pace: pace(events, israelDay()) };
}

export function syncPair() {
  if (!pairState.code || !currentUser()) return Promise.resolve();
  if (syncing) return syncing;
  const code = pairState.code;
  const owner = currentUser().id;
  syncing = (async () => {
    try {
      const data = await call({ action: 'update', code, snapshot: ownSnapshot() });
      if (currentUser()?.id === owner && pairState.code === code) apply(data, code);
    } catch (error) {
      if (currentUser()?.id !== owner || pairState.code !== code) return;
      pairState = { ...pairState, state: error.message === 'room_closed' ? 'closed' : 'offline' };
      emit();
    }
  })().finally(() => { syncing = null; });
  return syncing;
}

export async function leavePair() {
  if (pairState.code) await call({ action: 'leave', code: pairState.code });
  clearInterval(polling);
  try { localStorage.removeItem(key()); } catch { /* ignore */ }
  pairState = { code: '', role: '', connected: false, snapshots: {}, state: 'idle' };
  emit();
}

export function inviteLink() {
  return `${location.origin}${location.pathname}#/join/${pairState.code}`;
}

store.subscribe(() => {
  clearTimeout(timer);
  if (pairState.code) timer = setTimeout(() => syncPair(), 1200);
});
