// The daily lesson, computed from the event list: which exercises today, what the spaced review asks,
// and what practice says about each grammar point. Pure functions only, tested in tests/lesson.test.mjs.
//
// Events written by the lesson:
//   answer  { context: 'lesson' | 'focus', item, answer, auto: 'correct' | 'wrong' | null }
//   grade   { answer, item, score 0–2, self? }          — Gemini or self-check, as in the placement test
//   srs     { card, grade 0–2 }                          — one spaced-review answer (again / hard / knew it)
//   task    { id, done }                                 — a finished part checks its task, as on the home page

import { DAY_POINTS, TEACH, FOCUS, EXERCISE, FOCUS_WORDS, KANJI_INFO } from '../data/lessons.js';
import { WEEKS } from '../data/plan.js';
import { ENTRIES } from '../data/journey.js';
import { addDays } from '../lib/dates.js';
import { lessonState } from './lesson-review.js';

export const NEW_WORDS_PER_DAY = 8;
export const NEW_KANJI_PER_DAY = 3;
export const EXERCISES_PER_DAY = 6;
export const FOCUS_PER_DAY = 2;

// Days until the next review, by box. Box 0 = again today.
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];

export function dayPoints(week, day) {
  return DAY_POINTS[week.id]?.[day.offset] ?? [];
}

// A stable small number for a day, so the same day picks the same items on every device.
export function seed(day) {
  return [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100_003, 7);
}

// ── Exercises and their results ──────────────────────────────────────────────

const PRACTICE = new Set(['lesson', 'focus']);

// Every practice answer with its grade and result: ok | partial | miss | pending.
export function practiceLog(events) {
  const grades = new Map();
  for (const e of events) if (e.kind === 'grade') grades.set(e.data.answer, e);
  const out = [];
  for (const e of events) {
    if (e.kind !== 'answer' || !PRACTICE.has(e.data.context)) continue;
    const x = EXERCISE[e.data.item];
    if (!x) continue;
    const grade = grades.get(e.id) ?? null;
    out.push({ answer: e, grade, x, day: e.day, result: practiceResult(e, grade) });
  }
  return out;
}

export function practiceResult(answer, grade) {
  if (grade && Number.isInteger(grade.data.score)) return ['miss', 'partial', 'ok'][grade.data.score];
  if (answer.data.auto === 'correct') return 'ok';
  if (answer.data.auto === 'wrong') return 'miss';
  return 'pending';
}

// Practice evidence per grammar point: [{ day, result }] in order.
export function practiceByPoint(events) {
  const out = new Map();
  for (const entry of practiceLog(events)) {
    for (const pid of entry.x.points) {
      const list = out.get(pid) ?? [];
      list.push({ day: entry.day, result: entry.result });
      out.set(pid, list);
    }
  }
  return out;
}

// One success is never mastery: "known" needs correct answers on two different days, the latest
// answer correct, and most answers correct.
export function practiceStatus(list) {
  const decided = list.filter((r) => r.result !== 'pending');
  if (!decided.length) return 'pending';
  const ok = decided.filter((r) => r.result === 'ok');
  const okDays = new Set(ok.map((r) => r.day)).size;
  if (okDays >= 2 && decided.at(-1).result === 'ok' && ok.length / decided.length >= 0.7) return 'known';
  if (decided.some((r) => r.result === 'ok' || r.result === 'partial')) return 'partial';
  return 'gap';
}

// Per exercise: how many times it was answered and how the latest answer went.
function exerciseHistory(events) {
  const out = new Map();
  for (const entry of practiceLog(events)) {
    const h = out.get(entry.x.id) ?? { count: 0, last: null, lastDay: '' };
    h.count += 1;
    h.last = entry.result;
    h.lastDay = entry.day;
    out.set(entry.x.id, h);
  }
  return out;
}

export function exercisesOf(pid) {
  const own = TEACH[pid]?.drills ?? [];
  const extra = Object.values(EXERCISE).filter((x) => x.source === 'placement' && x.points.includes(pid));
  return [...own, ...extra];
}

// Today's exercises for the day's points: never-seen first, then last missed, then the longest unseen.
// Only answers from before `day` decide the order, so the list stays the same all day.
export function pickExercises(points, events, day, count = EXERCISES_PER_DAY) {
  if (!points.length) return [];
  const history = exerciseHistory(events.filter((e) => e.day < day));
  const rank = (x) => {
    const h = history.get(x.id);
    if (!h) return [0, ''];
    if (h.last === 'miss' || h.last === 'partial') return [1, h.lastDay];
    return [2, h.lastDay];
  };
  const s = seed(day);
  const perPoint = points.map((pid) => exercisesOf(pid)
    .map((x, i) => ({ x, r: rank(x), tie: (i * 7 + s) % 11 }))
    .sort((a, b) => a.r[0] - b.r[0] || a.r[1].localeCompare(b.r[1]) || a.tie - b.tie)
    .map((o) => o.x));
  // Round-robin across the day's points, so a review day touches each of them.
  const out = [];
  for (let round = 0; out.length < count && perPoint.some((list) => list.length > round); round += 1) {
    for (const list of perPoint) if (list[round] && out.length < count && !out.includes(list[round])) out.push(list[round]);
  }
  return out;
}

// Focus drills return by spaced review of their own: a drill answered correctly waits longer each time.
export function pickFocus(events, day, count = FOCUS_PER_DAY) {
  const history = exerciseHistory(events.filter((e) => e.day < day));
  const all = FOCUS.flatMap((f) => f.drills.map((x) => ({ x, group: f })));
  const due = (x) => {
    const h = history.get(x.id);
    if (!h) return '';
    const wait = h.last === 'ok' ? Math.min(2 ** h.count, 30) : 1;
    return addDays(h.lastDay, wait);
  };
  const s = seed(day);
  return all
    .map((o, i) => ({ ...o, due: due(o.x), tie: (i * 5 + s) % 13 }))
    .filter((o) => o.due <= day)
    .sort((a, b) => a.due.localeCompare(b.due) || a.tie - b.tie)
    // One drill per group, so two different patterns come up.
    .filter((o, i, list) => list.findIndex((p) => p.group.id === o.group.id) === i)
    .slice(0, count);
}

// ── Spaced review (words, kanji, notes from imported lessons) ────────────────

export function srsState(events) {
  const state = new Map();
  for (const e of events) {
    if (e.kind !== 'srs' || typeof e.data.card !== 'string') continue;
    const s = state.get(e.data.card) ?? { box: 0, due: e.day, first: e.day, reps: 0 };
    const g = e.data.grade;
    if (g === 2) s.box = Math.min(s.box + 1, INTERVALS.length - 1);
    else if (g === 1) s.box = Math.max(1, s.box - 1);
    else s.box = 0;
    s.due = addDays(e.day, INTERVALS[s.box]);
    s.reps += 1;
    s.last = e.day;
    state.set(e.data.card, s);
  }
  return state;
}

// Due cards first (oldest due first), then new cards up to the day's limit of new ones.
export function srsQueue(deck, state, day, newLimit) {
  const due = deck.filter((c) => state.has(c.id) && state.get(c.id).due <= day)
    .sort((a, b) => state.get(a.id).due.localeCompare(state.get(b.id).due));
  const startedToday = deck.filter((c) => state.get(c.id)?.first === day).length;
  const fresh = deck.filter((c) => !state.has(c.id)).slice(0, Math.max(0, newLimit - startedToday));
  return [...due, ...fresh];
}

// Words: notes from imported lessons first, then the focus words, then the journey (this week's place
// first). Words marked "known" on the journey pages are not introduced as new.
export function wordDeck(events, placeId = null, vocabKnown = {}) {
  const cards = [];
  const seen = new Set();
  const push = (card) => {
    if (seen.has(card.key)) return;
    seen.add(card.key);
    cards.push(card);
  };
  for (const lesson of lessonState(events).sessions) {
    for (const item of lesson.items) {
      if (item.type !== 'vocabulary' || !item.correction) continue;
      push({ id: `l:${lesson.id}/${item.id}`, key: item.correction, kind: 'note', ja: item.correction, reading: item.reading, he: item.meaning || item.title });
    }
  }
  for (const [ja, he] of FOCUS_WORDS) push({ id: `w:${ja}`, key: ja, kind: 'word', ja, he });
  const entries = [...ENTRIES].sort((a, b) => (b.id === placeId) - (a.id === placeId));
  for (const entry of entries) {
    for (const w of entry.words) {
      if (vocabKnown[`${entry.id}:${w[0]}`]) continue;
      push({ id: `w:${w[0]}`, key: w[0], kind: 'word', ja: w[0], he: w[2], from: entry });
    }
  }
  return cards;
}

// Kanji: the study kanji of every week up to the given one, in plan order.
export function kanjiDeck(weekNumber) {
  return WEEKS.filter((w) => w.week <= weekNumber)
    .flatMap((w) => w.kanji.split(/\s+/))
    .filter((k, i, all) => k && all.indexOf(k) === i && KANJI_INFO[k])
    .map((k) => ({ id: `k:${k}`, key: k, kind: 'kanji', ja: k, info: KANJI_INFO[k] }));
}

// Mistakes and style notes from imported lessons that ask for a new attempt, by spaced review.
export function noteDrills(events, day, count = 2) {
  const state = srsState(events.filter((e) => e.day < day));
  const out = [];
  for (const lesson of lessonState(events).sessions) {
    for (const item of lesson.items) {
      if (!['error', 'style', 'retrieval'].includes(item.type) || !item.correction) continue;
      const id = `l:${lesson.id}/${item.id}`;
      const s = state.get(id);
      if (s && s.due > day) continue;
      out.push({ id, lesson, item, due: s?.due ?? '' });
    }
  }
  return out.sort((a, b) => a.due.localeCompare(b.due)).slice(0, count);
}

// ── Reading / listening and speaking ─────────────────────────────────────────

// Sentences for listening: journey sentences that use the day's grammar, then the points' examples.
export function listeningFor(points, day, sentencesFor, count = 4) {
  const s = seed(day);
  const journey = sentencesFor(points);
  const rotated = journey.map((x, i) => ({ x, k: (i * 13 + s) % 97 })).sort((a, b) => a.k - b.k).map((o) => o.x);
  const examples = points.flatMap((pid) => (TEACH[pid]?.examples ?? []).map(([ja, he]) => ({ ja, he })));
  const out = [];
  for (const item of [...rotated, ...examples]) {
    if (out.length >= count) break;
    if (!out.some((o) => o.ja === item.ja)) out.push(item);
  }
  return out;
}

export const CONTEXTS = [
  'השגרה שלך ביום רגיל',
  'העבודה וקורס מורי הדרך',
  'מוזיקה: מה אתה מנגן ושומע',
  'משפחה וחברים',
  'רגשות: משהו ששימח או הטריד אותך השבוע',
  'הביקור במרץ: מה תעשו יחד',
  'הדרכה: להסביר מקום בישראל למאסאמי ומינורי',
];

export function writingPrompt(patterns) {
  return `כתוב 3–4 משפטים משלך ביפנית על נושא מחייך${patterns.length ? `, עם ${patterns.join(', ')}` : ''}.`;
}

export function speakingTask(week, day, points, patterns) {
  const context = CONTEXTS[seed(day.date) % CONTEXTS.length];
  const use = patterns.length ? ` נסה להשתמש ב־${patterns.join(', ')}.` : '';
  return {
    id: `lesson-${day.date}`,
    context,
    he: `דבר בקול דקה–שתיים ביפנית על: ${context}.${use} אחר כך שאל שאלה אחת, כמו בשיחה אמיתית.`,
    seconds: 120,
  };
}
