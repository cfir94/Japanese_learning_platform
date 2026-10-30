// Checking answers: exact local check for completion items, Gemini for everything else.

import { accessToken, currentUser } from './auth.js';

export const API = 'https://kotoba-api.cfir94.workers.dev';

const PUNCTUATION = /[\s　。．.!！?？、,，「」『』（）()〜~…・"'״׳]/gu;

// Width, spacing, punctuation and katakana/hiragana differences never decide an answer.
export function normalize(text) {
  return String(text ?? '')
    .normalize('NFKC')
    .replace(PUNCTUATION, '')
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .trim();
}

// A blank item is correct when the answer is one of the accepted fills — or the whole
// sentence typed out with one of them in the blank.
export function checkBlank(item, answer) {
  const value = normalize(answer);
  if (!value) return false;
  return item.answers.some((fill) => {
    if (normalize(fill) === value) return true;
    const sentence = item.jp.replace(/＿+/, fill);
    return normalize(sentence) === value;
  });
}

let status = null;

// Can this account use the Gemini checks right now?
// 'ok' | 'not_allowed' (signed in, but not the account on the Worker's list) | 'signed_out' | 'offline'
export function aiStatus() {
  status ??= (async () => {
    const token = await accessToken().catch(() => null);
    if (!token) return 'signed_out';
    const response = await fetch(`${API}/me`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) return 'signed_out';
    if (!response.ok) return 'offline';
    return (await response.json()).allowed ? 'ok' : 'not_allowed';
  })().catch(() => 'offline');
  return status;
}

export async function aiAvailable() {
  return (await aiStatus()) === 'ok';
}

export function resetAiCheck() {
  status = null;
}

// One Hebrew line that says why the Gemini checks are not available.
export function aiStatusText(value) {
  const email = currentUser()?.email ?? '';
  return {
    ok: 'בדיקת Gemini פעילה.',
    not_allowed: `החשבון \u2066${email}\u2069 לא ברשימת החשבונות של Gemini, ולכן התרגומים, הכתיבה והדיבור לא נבדקים אוטומטית.`,
    signed_out: 'צריך להתחבר כדי שהתשובות ייבדקו ב־Gemini.',
    offline: 'בדיקת Gemini לא זמינה כרגע.',
  }[value];
}

async function call(path, body) {
  const token = await accessToken();
  if (!token) throw new Error('צריך להתחבר כדי לבדוק עם Gemini');
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      unauthorized: 'צריך להתחבר מחדש כדי לבדוק עם Gemini.',
      not_allowed: `החשבון \u2066${currentUser()?.email ?? ''}\u2069 לא מורשה לבדיקות Gemini.`,
      rate_limited: 'Gemini עמוס כרגע. ננסה שוב בעוד דקה.',
      audio_too_long: 'ההקלטה ארוכה מדי.',
    };
    throw new Error(messages[data.error] || 'הבדיקה נכשלה. ננסה שוב מאוחר יותר.');
  }
  return data;
}

// items: [{ id, prompt, target, models, answer }] → [{ id, score, corrected, feedback, other }]
export async function gradeItems(items) {
  const out = [];
  for (let i = 0; i < items.length; i += 10) {
    const { results } = await call('/grade', { items: items.slice(i, i + 10) });
    out.push(...results);
  }
  return out;
}

export async function gradeWriting(task) {
  return (await call('/write', task)).result;
}

export async function gradeSpeech(task) {
  return (await call('/speech', task)).result;
}
