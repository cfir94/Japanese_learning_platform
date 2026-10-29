// The whole plan: grammar points per lesson with their status, then week by week.

import * as store from '../lib/store.js';
import { israelDay, shortDate } from '../lib/dates.js';
import { esc, rich, statusBar, legend, countStatuses } from '../lib/ui.js';
import { WEEKS, MILESTONES, AFTER_MARCH } from '../data/plan.js';
import { LESSONS, GRAMMAR } from '../data/grammar.js';
import { pageBanner, entryById } from '../lib/photos.js';
import { STATUS, pointStatuses, taskState, dayDone, marchScope } from '../logic/progress.js';

export const live = true;

export function render(root) {
  const today = israelDay();
  const events = store.all();
  const statuses = pointStatuses(events);
  const tasks = taskState(events);
  const scope = marchScope();

  const top = entryById('galilee') ?? entryById('jerusalem');
  root.innerHTML = `<div class="stack">
    ${pageBanner(top, 'התוכנית', rich('Genki 8–18 עד מרץ · 19–23 אחרי'))}
    <section class="card">
      <h2><span class="ico">🗺️</span> התוכנית · גרסה 3</h2>
      ${top ? '' : `<div class="title">${rich('Genki 8–18 עד מרץ, 19–23 אחרי')}</div>`}
      <p class="lead">כל נקודת דקדוק צבועה לפי מה שידוע עליה. אחרי מבחן המיקום הלוח יכויל: מה שכבר יושב יהפוך לחזרה, והזמן יעבור לפערים.</p>
      <div style="margin-top:14px">${statusBar(countStatuses(scope, statuses), scope.length)}</div>
      ${legend()}
    </section>

    <section class="card">
      <h2>נקודות הדקדוק לפי שיעור</h2>
      <div class="lesson-list">
      ${LESSONS.map((l) => lessonBlock(l, statuses, today)).join('')}</div>
    </section>

    <section class="card">
      <h2>שבוע אחרי שבוע</h2>
      ${WEEKS.map((w) => weekBlock(w, today, tasks)).join('')}
    </section>

    <section class="card">
      <h2>אבני דרך</h2>
      <ul class="timeline">
        ${MILESTONES.map((m) => `<li><span class="d num">${shortDate(m.date)}</span>
          <span><b>${rich(m.title)}</b> · ${rich(m.language)}<br><span class="muted small">${rich(m.target)}</span></span></li>`).join('')}
      </ul>
    </section>

    <section class="card">
      <details><summary><h2 style="display:inline">אחרי מרץ · ${AFTER_MARCH.length} תקופות</h2></summary>
      <ul class="timeline" style="margin-top:8px">
        ${AFTER_MARCH.map((x) => `<li><span class="d num">${shortDate(x.start)}</span>
          <span><b>${rich(x.title)}</b><br><span class="muted small">${rich(x.focus)}</span></span></li>`).join('')}
      </ul></details>
    </section>
  </div>`;
}

function lessonBlock(lesson, statuses, today) {
  const points = GRAMMAR.filter((p) => p.lesson === lesson.n);
  const weeks = WEEKS.filter((w) => w.lessons.includes(lesson.n));
  const when = weeks.length
    ? `${weeks.length > 1 ? 'שבועות' : 'שבוע'} ${range(weeks[0].week, weeks.at(-1).week)}`
    : 'אחרי מרץ';
  const now = weeks.some((w) => w.start <= today && today <= w.end);
  return `<details class="lesson" ${now ? 'open' : ''}>
    <summary>
      <span class="n">${lesson.n}</span>
      <span class="lesson-name">${rich(lesson.title)}<span class="small muted"> · ${when}</span></span>
      ${statusBar(countStatuses(points, statuses), points.length)}
    </summary>
    <div class="chips">
      ${points.map((p) => `<span class="chip s-${statuses[p.id]}" title="${esc(STATUS[statuses[p.id]].label)}">
        <span class="jp" lang="ja">${rich(p.pattern)}</span><span class="muted">${rich(p.title)}</span></span>`).join('')}
    </div>
  </details>`;
}

// Number and date ranges must stay left-to-right, or "1–2" shows as "2–1".
function range(a, b) {
  return a === b ? `${a}` : `<span dir="ltr" class="num">${a}–${b}</span>`;
}

function weekBlock(week, today, tasks) {
  const current = week.start <= today && today <= week.end;
  const done = week.days.filter((d) => dayDone(week, d, tasks)).length;
  return `<details class="week" ${current ? 'open' : ''}>
    <summary>
      <span class="week-title">${week.week}. ${rich(week.title)}</span>
      <span class="small muted num">${done}/${week.days.length}</span>
      <span class="week-meta">${range(shortDate(week.start), shortDate(week.end))} · ${rich(week.anchor)} · ${rich(week.conversation.title)}</span>
    </summary>
    <div class="week-body">
      <p class="expr" lang="ja">${rich(week.conversation.expression)}</p>
      <p class="small muted" style="margin:0">מילים: ${rich(week.vocabulary)} · קנג׳י: <span lang="ja">${rich(week.kanji)}</span></p>
      <ul class="daylist">
        ${week.days.map((d) => `<li class="${d.date === today ? 'today' : ''}">
          <span class="d">${rich(d.label)} ${shortDate(d.date)} ${dayDone(week, d, tasks) ? '<span class="ok">✓</span>' : ''}</span>
          <span>${rich(d.topic)}</span></li>`).join('')}
      </ul>
    </div>
  </details>`;
}
