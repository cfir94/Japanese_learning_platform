// Checking answers: exact local check for completion items, Gemini for everything else.

import { accessToken } from './auth.js';

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

let health = null;

export async function aiAvailable() {
  health ??= fetch(`${API}/health`, { cache: 'no-store' })
    .then((r) => r.ok)
    .catch(() => false);
  return health;
}

export function resetAiCheck() {
  health = null;
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
      unauthorized: 'החשבון הזה לא מורשה לבדיקות Gemini.',
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
