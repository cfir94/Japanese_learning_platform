// Private lesson records are imported by their owner, never shipped in the public source.
// Recording a review or retry is evidence to inspect, not a mastery/placement grade.
export const LESSON_FORMAT = 'kotoba-lesson-v1';
export const REVIEW_TYPES = ['error', 'retrieval', 'vocabulary', 'style', 'uncertain'];
const ID = /^[A-Za-z0-9][A-Za-z0-9:_-]{0,99}$/;
const MAX_FILE = 1_000_000;

function text(value, max = 6000) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > max) throw new Error('Invalid text');
  return value;
}

function id(value) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error('Invalid ID');
  return value;
}

export function validateLesson(value) {
  if (!value || value.format !== LESSON_FORMAT) throw new Error('Unknown lesson format');
  const date = text(value.date, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error('Invalid date');
  if (!Array.isArray(value.items) || value.items.length > 250) throw new Error('Invalid items');
  if (!Array.isArray(value.requests ?? []) || (value.requests?.length ?? 0) > 100) throw new Error('Invalid requests');
  const ids = new Set();
  const items = value.items.map((item) => {
    const itemId = id(item.id);
    if (ids.has(itemId) || !REVIEW_TYPES.includes(item.type)) throw new Error('Invalid or repeated item');
    ids.add(itemId);
    const trackId = text(item.trackId, 20);
    if (trackId && !/^JP-\d{3,}$/.test(trackId)) throw new Error('Invalid tracking ID');
    const out = { id: itemId, type: item.type, trackId };
    for (const key of ['title', 'original', 'correction', 'reading', 'meaning', 'note', 'assistance', 'outcome', 'evidence', 'prompt', 'confidence']) out[key] = text(item[key]);
    if (!out.title || !out.evidence) throw new Error('Item needs a title and evidence');
    out.grammar = Array.isArray(item.grammar) ? item.grammar.map((g) => text(g, 30)).filter((g) => /^g\d{2}-\d+$/.test(g)) : [];
    return out;
  });
  const requests = (value.requests ?? []).map((request) => ({ id: id(request.id), title: text(request.title), evidence: text(request.evidence), status: text(request.status) }));
  if (new Set(requests.map((r) => r.id)).size !== requests.length) throw new Error('Repeated request');
  const source = { title: text(value.source?.title), notice: text(value.source?.notice), url: '' };
  if (value.source?.url) {
    const url = new URL(text(value.source.url, 2000));
    if (url.protocol !== 'https:') throw new Error('Invalid source URL');
    source.url = url.href;
  }
  return { format: LESSON_FORMAT, id: id(value.id), date, title: text(value.title, 300), source, requests, items };
}

export function parseLessonFile(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_FILE) throw new Error('File too large');
  const body = raw.replace(/^\uFEFF/, '').trim();
  const embedded = body.match(/```kotoba-lesson\s*\n([\s\S]*?)\n```/i)?.[1];
  return validateLesson(JSON.parse(embedded ?? body));
}

export function lessonState(events) {
  const sessions = new Map();
  const attempts = new Map();
  for (const event of events) {
    if (event.kind === 'lesson') {
      try {
        const lesson = validateLesson(event.data);
        // Same source ID means one lesson, including a later, corrected analysis.
        sessions.set(lesson.id, lesson);
      } catch { /* A malformed record cannot hide the other lessons. */ }
    }
    if (event.kind === 'lesson-attempt') {
      const data = event.data;
      if (typeof data?.lesson !== 'string' || typeof data?.item !== 'string' || typeof data?.answer !== 'string') continue;
      const key = `${data.lesson}/${data.item}`;
      const list = attempts.get(key) ?? [];
      list.push(event);
      attempts.set(key, list);
    }
  }
  return { sessions: [...sessions.values()].sort((a, b) => b.date.localeCompare(a.date)), attempts };
}

export function sameLesson(lesson, events) {
  return lessonState(events).sessions.some((old) => JSON.stringify(old) === JSON.stringify(lesson));
}

export function reviewReport(events) {
  const { sessions, attempts } = lessonState(events);
  const lines = ['# חזרה מהשיחות', '', 'התיעוד כולל מקורות וניסיונות. תרגול עצמי אינו אישור לשליטה יציבה.', ''];
  for (const lesson of sessions) {
    lines.push(`## ${lesson.date} — ${lesson.title}`, '', lesson.source.notice, '');
    if (lesson.source.url) lines.push(`מקור: ${lesson.source.url}`, '');
    if (lesson.requests.length) {
      lines.push('### בקשות ותוספות', '');
      for (const request of lesson.requests) lines.push(`- ${request.title}: ${request.evidence} — ${request.status}`);
      lines.push('');
    }
    for (const item of lesson.items) {
      lines.push(`### ${item.trackId || item.id} — ${item.title}`, '', `סוג: ${item.type}`, `מקור: ${item.original}`, `יעד: ${item.correction}`, `קריאה: ${item.reading}`, `משמעות: ${item.meaning}`, `הערה: ${item.note}`, `עזרה בשיעור: ${item.assistance}`, `ניסיון נוסף בשיעור: ${item.outcome}`, `ראיה: ${item.evidence}`, `ביטחון: ${item.confidence}`, '');
      for (const event of attempts.get(`${lesson.id}/${item.id}`) ?? []) {
        lines.push(`- ${event.at} — ${JSON.stringify(event.data.answer)}; עזרה/מודל: ${event.data.usedHelp ? 'כן' : 'לא, לפי דיווח עצמי'}; ממתין לבדיקה.`);
      }
      lines.push('');
    }
  }
  // A complete, lossless record of the review events accompanies the readable report.
  lines.push('## נתוני החזרה המלאים', '', '```json', JSON.stringify(events.filter((e) => ['lesson', 'lesson-attempt'].includes(e.kind)), null, 2), '```', '');
  return lines.join('\n');
}
