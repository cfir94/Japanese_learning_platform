// The bridge to ChatGPT voice practice: a short brief out, a short summary back in.
// The summary format is fixed in docs/chatgpt-project.md — keep the two in sync.

import { POINT } from '../data/grammar.js';
import { findDay, weekOf, pointStatuses } from './progress.js';
import { WEEKS } from '../data/plan.js';

export function buildBrief(today, events) {
  const found = findDay(today);
  const week = found?.week ?? weekOf(today);
  const statuses = pointStatuses(events);
  const focus = Object.entries(statuses)
    .filter(([id, s]) => (s === 'gap' || s === 'partial') && POINT[id].lesson <= 18)
    .slice(0, 6)
    .map(([id]) => `${POINT[id].pattern} (${POINT[id].title})`);
  const lines = [`תדריך ことば · ${today}${week ? ` · שבוע ${week.week} מתוך ${WEEKS.length}` : ''}`];
  if (found) {
    lines.push(found.day.offset === 1 ? 'היום: מפגש שיחה עם אדם. ChatGPT לא מחליף אותו.' : `דקדוק היום: ${found.day.topic}`);
  }
  if (week) {
    lines.push(`מיומנות השיחה של השבוע: ${week.conversation.title} — ${week.conversation.expression} (יעד: ${week.conversation.target})`);
    lines.push(`מילים: ${week.vocabulary} · קנג׳י: ${week.kanji}`);
  }
  if (focus.length) lines.push(`לחזק: ${focus.join(' · ')}`);
  lines.push('בסוף השיחה: בלוק KOTOBA לפי ההוראות.');
  return lines.join('\n');
}

// Reads the KOTOBA block ChatGPT prints at the end of a session. Tolerant: anything that is not
// recognised is kept as raw text, and only the minutes are required.
export function parseSummary(text) {
  const raw = String(text ?? '').trim();
  const body = raw.replace(/```[a-z]*\n?/gi, '');
  if (!/KOTOBA/i.test(body)) return null;
  const field = (name) => body.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, 'im'))?.[1].trim() ?? '';
  const minutes = Number.parseInt(field('minutes'), 10);
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 300) return null;
  const mistakesBlock = body.match(/^\s*mistakes\s*:\s*\n((?:\s*[-•].*\n?)*)/im)?.[1] ?? '';
  const mistakes = mistakesBlock
    .split('\n')
    .map((l) => l.replace(/^\s*[-•]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 20);
  return {
    minutes,
    topic: field('topic'),
    skill: field('skill'),
    good: field('good'),
    next: field('next'),
    mistakes,
    raw: raw.slice(0, 4000),
  };
}
