// Small rendering helpers shared by the views.

import { STATUS } from '../logic/progress.js';

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Escapes Hebrew text that may contain Japanese and marks each Japanese run, so the browser
// lays it out left-to-right inside the right-to-left line.
const JAPANESE_RUN = /[　-ヿ㐀-鿿！-｠〜～][　-ヿ㐀-鿿！-｠〜～\s]*[　-ヿ㐀-鿿！-｠〜～]|[　-ヿ㐀-鿿！-｠〜～]/gu;

export function rich(value) {
  return esc(value).replace(JAPANESE_RUN, (run) => `<span lang="ja">${run}</span>`);
}

const ORDER =['known', 'partial', 'gap', 'pending', 'new', 'untested'];

// A horizontal bar split by status counts. `marker` (0–1) draws the expected-by-today line.
export function statusBar(counts, total, marker = null) {
  const parts = ORDER.filter((s) => s !== 'untested' && counts[s])
    .map((s) => `<i class="s-${s}" style="width:${(counts[s] / total) * 100}%"></i>`)
    .join('');
  const line = marker === null ? '' : `<span class="marker" style="inset-inline-start:${Math.min(marker, 1) * 100}%"></span>`;
  const label = ORDER.filter((s) => counts[s]).map((s) => `${STATUS[s].label}: ${counts[s]}`).join(', ');
  return `<div class="bar" role="img" aria-label="${esc(label)}">${parts}${line}</div>`;
}

export function legend(statuses = ORDER) {
  return `<div class="legend">${statuses.map((s) => `<span class="s-${s}">${STATUS[s].label}</span>`).join('')}</div>`;
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
