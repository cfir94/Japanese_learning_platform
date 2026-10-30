// Home: what today, what this week, where in the whole plan. Nothing else.

import * as store from '../lib/store.js';
import { israelDay, weekday, shortDate } from '../lib/dates.js';
import { esc, rich, jp, bi, marks, jaWeekday, kanjiList, statusBar, legend, countStatuses } from '../lib/ui.js';
import { WEEKS, PLAN } from '../data/plan.js';
import { PARTS } from '../data/placement.js';
import { LESSONS, GRAMMAR } from '../data/grammar.js';
import { buildBrief, parseSummary } from '../logic/brief.js';
import { openingPair, memoriesStrip, banner, postcards } from '../lib/photos.js';
import { CATEGORIES, sentencesFor } from '../data/journey.js';
import { placeOfWeek } from '../data/places.js';
import {
  findDay, tasksOfDay, taskState, dayProgress, pace, pointStatuses, marchScope, expectedPoints,
  placementState, partProgress, countdown,
} from '../logic/progress.js';

export const live = true;

export function render(root) {
  const today = israelDay();
  const events = store.all();
  const tasks = taskState(events);
  const statuses = pointStatuses(events);

  root.innerHTML = `<div class="stack">
    ${syncNotice()}
    ${hero(today)}
    ${placementCard(events)}
    ${todayCard(today, tasks)}
    ${memoriesStrip(today)}
    ${weekCard(today, tasks)}
    ${voiceCard(today, events)}
    ${pictureCard(today, events, statuses)}
    ${journeyCard()}
  </div>`;

  root.querySelectorAll('[data-task]').forEach((input) => {
    input.addEventListener('change', () => store.add('task', { id: input.dataset.task, done: input.checked }));
  });
  root.querySelector('#copy-brief')?.addEventListener('click', async (e) => {
    const text = buildBrief(today, store.all());
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = 'הועתק ✓';
    } catch {
      prompt('העתק את התדריך:', text);
    }
  });
  root.querySelector('#paste-summary')?.addEventListener('click', openSummaryDialog);
}

// The reason for all of this, on top of every visit.
function hero(today) {
  const left = countdown(today);
  return `<section class="hero">
    ${openingPair()}
    <div>
      <p class="who" lang="ja">${marks('正美{まさみ}お母{かあ}さん・美礼{みのり}ちゃん')}</p>
      ${left > 0
        ? `<div class="countdown num">${left}<small>ימים</small></div>
           <p class="sub">עד שמאסאמי ומינורי נוחתות בישראל · 11.3</p>
           <p class="ato" lang="ja">${marks(`二人{ふたり}がイスラエルに着{つ}くまで、あと${left}日{にち}`)}</p>`
        : `<div class="countdown">ようこそ</div><p class="sub">הן כאן.</p>`}
    </div>
  </section>`;
}

// Where we are going — each place is also a word. The full section lives at #/journey.
function journeyCard() {
  const cards = postcards();
  if (!cards) return '';
  return `<section class="card">
    <div class="row between"><h2 style="margin:0"><span class="ico">✈️</span> ${bi('journey')} · <span dir="ltr">11–18.3</span></h2>
      <a class="btn quiet small" href="#/journey">${bi('allJourney')} ←</a></div>
    <div class="tabs" style="margin:10px 0 6px">${CATEGORIES.map((c) => `<a href="#/journey/${c.id}"><span aria-hidden="true">${c.icon}</span> ${esc(c.he)}</a>`).join('')}</div>
    ${cards}
  </section>`;
}

// One sentence from the journey that uses this week's grammar — the trip inside the lesson.
function journeyExample(week, today) {
  const points = GRAMMAR.filter((g) => week.lessons.includes(g.lesson)).map((g) => g.id);
  const pool = sentencesFor(points);
  if (!pool.length) return '';
  const n = [...today].reduce((h, c) => h + c.charCodeAt(0), 0) % pool.length;
  const s = pool[n];
  return `<a class="example" href="#/journey/${s.entry.id}">
    <span class="from">${bi('example')} · ${esc(s.entry.he)} <span lang="ja">${jp(s.entry.ja)}</span></span>
    <p class="s-ja" lang="ja">${jp(s.ja)}</p>
    <p class="s-he">${rich(s.he)}</p>
  </a>`;
}

// ChatGPT voice practice: brief out, summary in (format in docs/chatgpt-project.md).
function voiceCard(today, events) {
  const week = WEEKS.find((w) => w.start <= today && today <= w.end);
  const sessions = store.all('voice').filter((e) => week && e.day >= week.start && e.day <= week.end);
  const minutes = sessions.reduce((s, e) => s + (e.data.minutes || 0), 0);
  const last = sessions.at(-1)?.data;
  return `<section class="card">
    <h2><span class="ico">🎙️</span> ${bi('voice')}</h2>
    <div class="row between wrap">
      <p class="lead num" style="margin:0">${sessions.length ? `השבוע: ${sessions.length} שיחות · ${minutes} דקות` : 'השבוע עוד לא היו שיחות.'}</p>
      <div class="row"><button class="btn" id="copy-brief">${bi('copyBrief')}</button><button class="btn" id="paste-summary">${bi('pasteSummary')}</button></div>
    </div>
    ${last?.mistakes?.length ? `<p class="small muted" style="margin:10px 0 0">מהשיחה האחרונה: ${last.mistakes.slice(0, 3).map(rich).join(' · ')}</p>` : ''}
  </section>`;
}

function openSummaryDialog() {
  const dialog = document.createElement('dialog');
  dialog.className = 'card';
  dialog.innerHTML = `<form method="dialog" class="stack" style="min-width:min(560px,86vw)">
    <div class="title">סיכום מ־ChatGPT</div>
    <p class="lead small">בסוף השיחה ChatGPT כותב בלוק שמתחיל ב־KOTOBA. מעתיקים אותו כמו שהוא ומדביקים כאן.</p>
    <textarea class="answer" name="text" lang="ja" style="min-height:180px" placeholder="KOTOBA&#10;minutes: 20&#10;…"></textarea>
    <p class="error" hidden></p>
    <div class="actions"><button class="btn quiet" value="cancel">ביטול</button><button class="btn primary" value="save">שמירה</button></div>
  </form>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  form.addEventListener('submit', (event) => {
    if (event.submitter?.value !== 'save') return;
    const parsed = parseSummary(form.text.value);
    if (!parsed) {
      event.preventDefault();
      const error = form.querySelector('.error');
      error.textContent = 'לא מצאתי בלוק KOTOBA עם שורת minutes. כדאי להעתיק את כל הבלוק.';
      error.hidden = false;
      return;
    }
    store.add('voice', parsed);
  });
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
  form.text.focus();
}

function syncNotice() {
  if (store.sync.state !== 'no-table') return '';
  return `<section class="card notice small"><b>המעקב נשמר כרגע רק בדפדפן הזה.</b>
    <p>כדי שיישמר בענן צריך להריץ פעם אחת את <code>supabase/schema.sql</code> ב־Supabase. ההוראות ב־README.</p></section>`;
}

function placementCard(events) {
  const state = placementState(events);
  const progress = PARTS.map((p) => partProgress(p.id, state));
  const doneParts = progress.filter((p) => p.done >= p.total).length;
  if (doneParts === PARTS.length) return '';
  const started = progress.some((p) => p.done > 0);
  return `<section class="card notice">
    <h2><span class="ico">📍</span> ${bi('firstStep')}</h2>
    <div class="row between wrap">
      <div>
        <div class="title">${bi('placement', { stack: true })}</div>
        <p class="lead">דקדוק משיעור 8 עד 23, כתיבה ודיבור. לפיו נדע מה כבר יושב ומה לא, ונכייל את התוכנית.</p>
      </div>
      <a class="btn accent" href="#/test">${bi(started ? 'resume' : 'start')}</a>
    </div>
    <p class="small muted num" style="margin:10px 0 0">${doneParts} מתוך ${PARTS.length} חלקים הושלמו</p>
  </section>`;
}

const ICONS = { words: '🗂️', kanji: '漢', grammar: '✍️', input: '🎧', speaking: '🗣️', meeting: '☕' };

function todayCard(today, tasks) {
  const found = findDay(today);
  if (!found) {
    const before = today < PLAN.start;
    return `<section class="card"><h2>היום</h2><div class="title">${before ? 'התוכנית מתחילה ב־29.10' : 'התוכנית עד מרץ הסתיימה'}</div></section>`;
  }
  const { week, day } = found;
  const list = tasksOfDay(week, day);
  const prog = dayProgress(week, day, tasks);
  return `<section class="card">
    <div class="row between">
      <span class="eyebrow">${rich(weekday(today))} ${jaWeekday(today)} · ${shortDate(today)}</span>
      <span class="eyebrow num">שבוע ${week.week} מתוך ${WEEKS.length} <span lang="ja">${marks(`第{だい}${week.week}週{しゅう}`)}</span></span>
    </div>
    <div class="today-topic">${rich(day.topic)}</div>
    ${journeyExample(week, today)}
    <ul class="tasks">
      ${list.map((t) => `<li><label class="task ${tasks[t.id] ? 'done' : ''}">
        <input type="checkbox" data-task="${t.id}" ${tasks[t.id] ? 'checked' : ''}>
        <span class="ico" aria-hidden="true">${ICONS[t.kind] ?? ''}</span>
        <span class="label">${bi(t.ui)}</span><span class="min num">${t.minutes} דק׳ <span lang="ja">${marks('分{ふん}')}</span></span>
      </label></li>`).join('')}
    </ul>
    <div class="dayline" aria-hidden="true"><i style="width:${prog.minutes ? (prog.doneMinutes / prog.minutes) * 100 : 0}%"></i></div>
    <p class="small muted num" style="margin:8px 0 0">${prog.doneMinutes === prog.minutes ? 'היום הושלם. <span lang="ja">よくできました！</span>' : `${prog.doneMinutes} מתוך ${prog.minutes} דקות`}</p>
  </section>`;
}

function weekCard(today, tasks) {
  const week = WEEKS.find((w) => w.start <= today && today <= w.end);
  if (!week) return '';
  const cells = week.days.map((d) => {
    const p = dayProgress(week, d, tasks);
    const cls = [
      d.date === today ? 'today' : '',
      p.done === p.total ? 'done' : p.done ? 'partial' : '',
      d.offset === 1 ? 'meet' : '',
    ].join(' ');
    const letter = 'אבגדהוש'[new Date(`${d.date}T12:00:00Z`).getUTCDay()];
    return `<div class="daycell ${cls}" title="${esc(d.topic)}">${letter}׳ ${jaWeekday(d.date, true)}<b class="num">${shortDate(d.date).split('.')[0]}</b></div>`;
  }).join('');
  return `<section class="card">
    ${banner(placeOfWeek(week.week), bi('weekPlace'))}
    <h2>${bi('thisWeek')} · ${rich(week.anchor)}</h2>
    <div class="title">${rich(week.title)}</div>
    <p class="lead">${bi('conversation')}: ${rich(week.conversation.title)}</p>
    <p class="expr" lang="ja">${jp(week.conversation.expression)}</p>
    <p class="small muted" style="margin:0">${rich(week.conversation.target)}</p>
    <div class="days">${cells}</div>
    <p class="small muted" style="margin:10px 0 0">${bi('words')}: ${rich(week.vocabulary)} · ${bi('kanji')}: ${kanjiList(week.kanji)}</p>
  </section>`;
}

function pictureCard(today, events, statuses) {
  const scope = marchScope();
  const counts = countStatuses(scope, statuses);
  const known = counts.known ?? 0;
  const expected = expectedPoints(today);
  const p = pace(events, today);
  const hours = (m) => String(Math.round(m / 6) / 10);
  const paceLine = p.behind > 0
    ? `${p.behind} ימי תוכנית עברו בלי שסומנו. לא משלימים — ממשיכים מהיום.`
    : 'בקצב התוכנית.';

  const lessonRows = LESSONS.filter((l) => l.n <= 18).map((l) => {
    const points = GRAMMAR.filter((g) => g.lesson === l.n);
    return `<a class="lesson-row" href="#/plan" title="שיעור ${l.n} — ${esc(l.title)}">
      <span class="n">${l.n}</span>${statusBar(countStatuses(points, statuses), points.length)}
    </a>`;
  }).join('');

  return `<section class="card">
    <h2><span class="ico">🧭</span> ${bi('bigPicture')}</h2>
    <div class="title">${bi('whereInPlan', { stack: true })}</div>
    <div class="stats">
      <div class="stat"><b>${known}<small class="muted" style="font-size:14px">/${scope.length}</small></b><span>${bi('pointsKnown', { stack: true })}</span></div>
      <div class="stat"><b>${p.doneDays}<small class="muted" style="font-size:14px">/${p.totalDays}</small></b><span>${bi('daysDone', { stack: true })}</span></div>
      <div class="stat"><b>${hours(p.minutesDone)}<small class="muted" style="font-size:14px">/${Math.round(p.minutesPlanned / 60)}</small></b><span>${bi('studyHours', { stack: true })}</span></div>
    </div>
    ${statusBar(counts, scope.length, expected / scope.length)}
    <p class="small muted" style="margin:8px 0 0">הקו: כמה נקודות הלוח מצפה שיישבו עד היום (${expected}). ${paceLine}</p>
    <div class="lessons">${lessonRows}</div>
    ${legend(['known', 'partial', 'gap', 'pending', 'new', 'untested'])}
  </section>`;
}
