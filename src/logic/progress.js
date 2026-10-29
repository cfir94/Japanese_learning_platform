// Everything the screens show is computed here from the event list. Pure functions only,
// so the rules can be tested without a browser.

import { GRAMMAR, LESSONS } from '../data/grammar.js';
import { ITEMS, PARTS, WRITING, SPEAKING, itemsOfPart } from '../data/placement.js';
import { PLAN, WEEKS, ROUTINE, MEETING, LESSON_DUE } from '../data/plan.js';
import { addDays, daysBetween } from '../lib/dates.js';

export const STATUS = {
  known: { label: 'שולט', rank: 5 },
  partial: { label: 'חלקי', rank: 4 },
  gap: { label: 'פער', rank: 3 },
  pending: { label: 'ממתין לבדיקה', rank: 2 },
  new: { label: 'לא נלמד', rank: 1 },
  untested: { label: 'לא נבדק', rank: 0 },
};

// ── Placement ────────────────────────────────────────────────────────────────

// The latest answer to each placement item, with its grade if one arrived.
export function placementAnswers(events) {
  const answers = new Map();
  const grades = new Map();
  for (const e of events) {
    if (e.kind === 'answer' && e.data.context === 'placement') answers.set(e.data.item, e);
    if (e.kind === 'grade') grades.set(e.data.answer, e);
  }
  const out = new Map();
  for (const [itemId, answer] of answers) {
    out.set(itemId, { answer, grade: grades.get(answer.id) ?? null, result: itemResult(answer, grades.get(answer.id)) });
  }
  return out;
}

// ok | partial | miss | unknown | pending
export function itemResult(answer, grade) {
  if (answer.data.skipped) return 'unknown';
  if (answer.data.auto === 'correct') return 'ok';
  if (grade && Number.isInteger(grade.data.score)) return ['miss', 'partial', 'ok'][grade.data.score];
  if (answer.data.auto === 'wrong' && answer.data.final) return 'miss';
  return 'pending';
}

export function partProgress(partId, answers) {
  if (partId === 'W') {
    const done = WRITING.filter((w) => answers.writing?.has(w.id)).length;
    return { done, total: WRITING.length };
  }
  if (partId === 'S') {
    const done = SPEAKING.filter((s) => answers.speech?.has(s.id)).length;
    return { done, total: SPEAKING.length };
  }
  const items = itemsOfPart(partId);
  return { done: items.filter((i) => answers.items.has(i.id)).length, total: items.length };
}

// Free writing and speaking: the latest submission per task and its Gemini result.
export function productions(events, kind) {
  const subs = new Map();
  const results = new Map();
  for (const e of events) {
    if (e.kind === kind) subs.set(e.data.task, e);
    if (e.kind === `${kind}-grade`) results.set(e.data.ref, e);
  }
  const out = new Map();
  for (const [task, sub] of subs) out.set(task, { sub, result: results.get(sub.id)?.data.result ?? null });
  return out;
}

export function placementState(events) {
  return {
    items: placementAnswers(events),
    writing: productions(events, 'writing'),
    speech: productions(events, 'speech'),
  };
}

// Status of every grammar point. Test items decide first; free writing and speaking add evidence.
export function pointStatuses(events) {
  const state = placementState(events);
  const byPoint = new Map(GRAMMAR.map((p) => [p.id, []]));
  for (const item of ITEMS) {
    const entry = state.items.get(item.id);
    if (!entry) continue;
    for (const pid of item.points) byPoint.get(pid)?.push(entry.result);
  }
  const free = new Map();
  for (const source of [state.writing, state.speech]) {
    for (const { result } of source.values()) {
      for (const p of result?.points ?? []) {
        if (!byPoint.has(p.id)) continue;
        const list = free.get(p.id) ?? [];
        list.push(p.verdict);
        free.set(p.id, list);
      }
    }
  }
  // Later practice outside the test overrides nothing yet; it will add its own evidence here.
  const out = {};
  for (const [pid, results] of byPoint) out[pid] = combine(results, free.get(pid) ?? []);
  return out;
}

export function combine(results, freeVerdicts) {
  let status = 'untested';
  if (results.length) {
    const ok = results.filter((r) => r === 'ok').length;
    const decided = results.filter((r) => r !== 'pending');
    if (!decided.length) status = 'pending';
    else if (ok === results.length) status = 'known';
    else if (ok > 0 || results.includes('partial')) status = 'partial';
    else if (decided.every((r) => r === 'unknown')) status = results.includes('pending') ? 'pending' : 'new';
    else status = 'gap';
  }
  const freeOk = freeVerdicts.includes('ok');
  const freeErr = freeVerdicts.includes('error');
  if (status === 'untested' && freeVerdicts.length) return freeErr ? 'partial' : 'known';
  if ((status === 'new' || status === 'gap') && freeOk) return 'partial';
  if (status === 'known' && freeErr && !freeOk) return 'partial';
  return status;
}

export function lessonSummary(statuses) {
  return LESSONS.map((lesson) => {
    const points = GRAMMAR.filter((p) => p.lesson === lesson.n);
    const counts = {};
    for (const p of points) counts[statuses[p.id]] = (counts[statuses[p.id]] ?? 0) + 1;
    return { ...lesson, points, counts };
  });
}

export function placementDone(events) {
  const state = placementState(events);
  return PARTS.every((part) => {
    const { done, total } = partProgress(part.id, state);
    return done >= total;
  });
}

// ── Plan, today and pace ─────────────────────────────────────────────────────

export function tasksOfDay(week, day) {
  const list = day.offset === 1 ? [MEETING] : ROUTINE;
  return list.map((t) => ({ ...t, id: `${week.id}-d${day.offset}-${t.kind}` }));
}

// Checked state of every task: the latest 'task' event wins, so unchecking is kept too.
export function taskState(events) {
  const state = {};
  for (const e of events) if (e.kind === 'task') state[e.data.id] = Boolean(e.data.done);
  return state;
}

export function findDay(day) {
  for (const week of WEEKS) {
    const found = week.days.find((d) => d.date === day);
    if (found) return { week, day: found };
  }
  return null;
}

export function dayDone(week, day, tasks) {
  return tasksOfDay(week, day).every((t) => tasks[t.id]);
}

export function dayProgress(week, day, tasks) {
  const list = tasksOfDay(week, day);
  const minutes = list.reduce((sum, t) => sum + t.minutes, 0);
  const done = list.filter((t) => tasks[t.id]);
  return { total: list.length, done: done.length, minutes, doneMinutes: done.reduce((s, t) => s + t.minutes, 0) };
}

// Pace = finished plan days against plan days that have already passed (today not counted yet).
export function pace(events, today) {
  const tasks = taskState(events);
  const days = WEEKS.flatMap((w) => w.days.map((d) => ({ week: w, day: d })));
  const passed = days.filter(({ day }) => day.date < today);
  const doneAll = days.filter(({ week, day }) => dayDone(week, day, tasks));
  const donePassed = passed.filter(({ week, day }) => dayDone(week, day, tasks));
  const minutesPlanned = days.reduce((s, { week, day }) => s + dayProgress(week, day, tasks).minutes, 0);
  const minutesDone = days.reduce((s, { week, day }) => s + dayProgress(week, day, tasks).doneMinutes, 0);
  return {
    totalDays: days.length,
    passed: passed.length,
    doneDays: doneAll.length,
    behind: passed.length - donePassed.length,
    minutesPlanned,
    minutesDone,
  };
}

// How many grammar points of the March scope (lessons 8–18) the schedule expects by `day`.
export function expectedPoints(day) {
  let expected = 0;
  let start = PLAN.start;
  for (const [lesson, due] of Object.entries(LESSON_DUE)) {
    const count = GRAMMAR.filter((p) => p.lesson === Number(lesson)).length;
    const span = daysBetween(start, due) + 1;
    const elapsed = Math.min(Math.max(daysBetween(start, day) + 1, 0), span);
    expected += (count * elapsed) / span;
    start = addDays(due, 1);
  }
  return Math.round(expected);
}

export function marchScope() {
  return GRAMMAR.filter((p) => p.lesson <= 18);
}

export function weekOf(day) {
  return WEEKS.find((w) => w.start <= day && day <= w.end) ?? null;
}

export function countdown(day) {
  return daysBetween(day, PLAN.arrival);
}

// ── Journey vocabulary ───────────────────────────────────────────────────────

// Words marked as known: the latest 'vocab' event per word wins, so unmarking is kept too.
export function vocabState(events) {
  const state = {};
  for (const e of events) if (e.kind === 'vocab') state[e.data.id] = Boolean(e.data.known);
  return state;
}
