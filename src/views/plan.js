// The plan as one timeline running down the page: every week and milestone until March, alternating
// sides, with a progress meter on top and each week marked done, now, late or still ahead.

import * as store from '../lib/store.js';
import { israelDay, shortDate } from '../lib/dates.js';
import { esc, rich, jp, bi, pair, marks, kanjiList, statusBar, legend, countStatuses } from '../lib/ui.js';
import { WEEKS, MILESTONES, AFTER_MARCH } from '../data/plan.js';
import { LESSONS, GRAMMAR } from '../data/grammar.js';
import { STATUS, pointStatuses, taskState, dayDone, pace, marchScope } from '../logic/progress.js';

export const live = true;

export function render(root) {
  const today = israelDay();
  const events = store.all();
  const tasks = taskState(events);
  const p = pace(events, today);
  const statuses = pointStatuses(events);
  const scope = marchScope();

  const items = [
    ...WEEKS.map((w) => ({ date: w.start, order: 0, html: (side) => weekNode(w, today, tasks, side) })),
    ...MILESTONES.map((m) => ({ date: m.date, order: 1, html: (side) => milestoneNode(m, today, side) })),
  ].sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order);

  const late = p.behind;
  root.innerHTML = `<div class="stack">
    <section class="card">
      <h2><span class="ico">🗺️</span> ${bi('timeline')}</h2>
      <div class="meter" role="img" aria-label="${p.doneDays} מתוך ${p.totalDays} ימים">
        <i style="width:${(p.doneDays / p.totalDays) * 100}%"></i>
        <span class="marker" style="inset-inline-start:${(p.passed / p.totalDays) * 100}%"></span>
      </div>
      <div class="row between small" style="margin-top:8px">
        <span class="num">${p.doneDays} / ${p.totalDays} ${bi('daysDone')}</span>
        <span class="tl-tag ${late ? 'late' : 'done'}">${late ? pair(`${late} ימים באיחור`, marks(`${late}日{にち}遅{おく}れ`)) : bi('onTrack')}</span>
      </div>
      <p class="small muted" style="margin:8px 0 0">הקו האנכי במד הוא היום. ימים שעברו ולא סומנו כגמורים נספרים כאיחור.</p>
      <div class="actions"><button class="btn" id="to-now">↓ ${bi('toNow')}</button></div>
    </section>

    <ol class="tl">${items.map((item, i) => item.html(i % 2 ? 'b' : 'a')).join('')}
      <li class="tl-item ${items.length % 2 ? 'b' : 'a'} after"><span class="tl-dot"></span><div class="tl-card">
        <div class="tl-date num">${shortDate(AFTER_MARCH[0].start)} →</div>
        <b>${bi('afterMarch')}</b>
        <ul class="small muted">${AFTER_MARCH.map((x) => `<li>${rich(x.title)}</li>`).join('')}</ul>
      </div></li>
    </ol>

    <section class="card">
      <details><summary><h2 style="display:inline">${bi('grammarList')}</h2></summary>
        <div style="margin-top:12px">${statusBar(countStatuses(scope, statuses), scope.length)}</div>
        ${legend()}
        <div class="lesson-list">${LESSONS.map((l) => lessonBlock(l, statuses)).join('')}</div>
      </details>
    </section>
  </div>`;

  root.querySelector('#to-now').addEventListener('click', () => {
    root.querySelector('.tl-item.now, .tl-item.late, .tl-item.next')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
}

function weekNode(week, today, tasks, side) {
  const done = week.days.filter((d) => dayDone(week, d, tasks)).length;
  const missed = week.days.filter((d) => d.date < today && !dayDone(week, d, tasks)).length;
  const state = done === week.days.length ? 'done'
    : missed ? 'late'
      : week.start <= today ? 'now'
        : 'next';
  const label = { done: 'tlDone', late: 'tlLate', now: 'tlNow', next: 'tlNext' }[state];
  const current = week.start <= today && today <= week.end;
  return `<li class="tl-item ${side} ${state}${current ? ' current' : ''}"><span class="tl-dot"></span><div class="tl-card">
    <div class="tl-date"><span dir="ltr" class="num">${shortDate(week.start)}–${shortDate(week.end)}</span>
      · ${pair(`שבוע ${week.week}`, marks(`第{だい}${week.week}週{しゅう}`))}</div>
    <b>${rich(week.title)}</b>
    <p class="expr" lang="ja">${jp(week.conversation.expression)}</p>
    <p class="small muted" style="margin:0">${rich(week.conversation.title)}</p>
    <div class="tl-progress"><i style="width:${(done / week.days.length) * 100}%"></i></div>
    <div class="row between small"><span class="tl-tag ${state}">${bi(label)}</span><span class="num muted">${done}/${week.days.length}</span></div>
    <details><summary class="small muted">ימים, מילים וקנג׳י</summary>
      <p class="small muted">${bi('words')}: ${rich(week.vocabulary)}<br>${bi('kanji')}: ${kanjiList(week.kanji)}</p>
      <ul class="daylist">
        ${week.days.map((d) => {
          const ok = dayDone(week, d, tasks);
          const mark = ok ? '<span class="ok">✓</span>' : d.date < today ? '<span class="miss">!</span>' : '';
          return `<li class="${d.date === today ? 'today' : ''}"><span class="d">${rich(d.label)} ${shortDate(d.date)} ${mark}</span><span>${rich(d.topic)}</span></li>`;
        }).join('')}
      </ul>
    </details>
  </div></li>`;
}

function milestoneNode(m, today, side) {
  return `<li class="tl-item ${side} milestone${m.date < today ? ' past' : ''}"><span class="tl-dot"></span><div class="tl-card">
    <div class="tl-date num">${shortDate(m.date)} · ${bi('milestone')}</div>
    <b>🏁 ${rich(m.title)}</b>
    <p class="small" style="margin:4px 0 0">${rich(m.language)}</p>
    <p class="small muted" style="margin:4px 0 0">${rich(m.target)}</p>
  </div></li>`;
}

function lessonBlock(lesson, statuses) {
  const points = GRAMMAR.filter((p) => p.lesson === lesson.n);
  return `<details class="lesson">
    <summary>
      <span class="n">${lesson.n}</span>
      <span class="lesson-name">${rich(lesson.title)} <span class="bi-ja" lang="ja">${jp(lesson.ja)}</span></span>
      ${statusBar(countStatuses(points, statuses), points.length)}
    </summary>
    <div class="chips">
      ${points.map((p) => `<span class="chip s-${statuses[p.id]}" title="${esc(STATUS[statuses[p.id]].label)}">
        <span class="jp" lang="ja">${jp(p.pattern)}</span><span class="muted">${rich(p.title)}</span></span>`).join('')}
    </div>
  </details>`;
}
