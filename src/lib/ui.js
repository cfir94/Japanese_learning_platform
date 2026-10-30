// Small rendering helpers shared by the views.

import { STATUS } from '../logic/progress.js';
import { FURIGANA, KANJI } from '../data/furigana.js';
import { UI } from '../data/ui-ja.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Escapes Hebrew text that may contain Japanese and marks each Japanese run, so the browser
// lays it out left-to-right inside the right-to-left line.
const JAPANESE_RUN = /[　-ヿ㐀-鿿！-｠]+(?:\s+[　-ヿ㐀-鿿！-｠]+)*/gu;

// Number and date ranges stay left-to-right ("8–12", "11–18.3"); otherwise RTL shows "12–8".
const RANGE = /\d+(?:\.\d+)*\s?[–-]\s?\d+(?:\.\d+)*/g;

export function rich(value) {
  return esc(value)
    .replace(JAPANESE_RUN, (run) => `<span lang="ja">${jp(run)}</span>`)
    .replace(RANGE, (run) => `<span dir="ltr">${run}</span>`);
}

// Japanese with furigana over every kanji (readings from furigana.js, generated and checked).
export function jp(text) {
  const segs = FURIGANA[text];
  if (!segs) return esc(text);
  return segs.map(([base, reading]) => (reading ? `<ruby>${esc(base)}<rt>${esc(reading)}</rt></ruby>` : esc(base))).join('');
}

// Japanese written with inline readings — "第{だい}3週{しゅう}" — for labels built at runtime.
export function marks(annotated) {
  return esc(annotated).replace(/([\u3400-\u9fff々]+)\{([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
}

const WEEKDAYS = ['日{にち}曜日{ようび}', '月{げつ}曜日{ようび}', '火{か}曜日{ようび}', '水{すい}曜日{ようび}', '木{もく}曜日{ようび}', '金{きん}曜日{ようび}', '土{ど}曜日{ようび}'];
const WEEKDAY_SHORT = ['日{にち}', '月{げつ}', '火{か}', '水{すい}', '木{もく}', '金{きん}', '土{ど}'];

export function jaWeekday(day, short = false) {
  const n = new Date(`${day}T12:00:00Z`).getUTCDay();
  return `<span lang="ja">${marks((short ? WEEKDAY_SHORT : WEEKDAYS)[n])}</span>`;
}

// The week's kanji, each with its main on・kun readings.
export function kanjiList(text) {
  const one = (k) => (KANJI[k] ? `<ruby>${esc(k)}<rt>${esc(KANJI[k])}</rt></ruby>` : jp(k));
  return `<span lang="ja" class="kanji-list">${String(text).split(/\s+/).map(one).join(' ')}</span>`;
}

// A label in Hebrew with its Japanese beside it: bi('navToday') → "היום 今日".
export function bi(key, { stack = false } = {}) {
  const [he, ja] = UI[key];
  return `<span class="bi${stack ? ' stack' : ''}"><span class="bi-he">${esc(he)}</span> <span class="bi-ja" lang="ja">${jp(ja)}</span></span>`;
}

// Hebrew and Japanese that are built at runtime: pair('משימה 2', marks('課題{かだい}2')).
export function pair(he, jaHtml, { stack = false } = {}) {
  return `<span class="bi${stack ? ' stack' : ''}"><span class="bi-he">${rich(he)}</span> <span class="bi-ja" lang="ja">${jaHtml}</span></span>`;
}

const ORDER = ['known', 'partial', 'gap', 'pending', 'new', 'untested'];

// A horizontal bar split by status counts. `marker` (0–1) draws the expected-by-today line.
export function statusBar(counts, total, marker = null) {
  const parts = ORDER.filter((s) => s !== 'untested' && counts[s])
    .map((s) => `<i class="s-${s}" style="width:${(counts[s] / total) * 100}%"></i>`)
    .join('');
  const line = marker === null ? '' : `<span class="marker" style="inset-inline-start:${Math.min(marker, 1) * 100}%"></span>`;
  const label = ORDER.filter((s) => counts[s]).map((s) => `${STATUS[s].label}: ${counts[s]}`).join(', ');
  return `<div class="bar" role="img" aria-label="${esc(label)}">${parts}${line}</div>`;
}

const STATUS_KEY = { known: 'stKnown', partial: 'stPartial', gap: 'stGap', pending: 'stPending', new: 'stNew', untested: 'stUntested' };

export function statusLabel(status) {
  return bi(STATUS_KEY[status]);
}

export function legend(statuses = ORDER) {
  return `<div class="legend">${statuses.map((s) => `<span class="s-${s}">${statusLabel(s)}</span>`).join('')}</div>`;
}

export function countStatuses(points, statuses) {
  const counts = {};
  for (const p of points) counts[statuses[p.id]] = (counts[statuses[p.id]] ?? 0) + 1;
  return counts;
}

export function ring(done, total) {
  const p = total ? Math.round((done / total) * 100) : 0;
  return `<div class="ring" style="--p:${p}"><span>${p}%</span></div>`;
}
