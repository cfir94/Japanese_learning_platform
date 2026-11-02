// The daily lesson (#/lesson, #/lesson/<date>): the day's five parts, one at a time, in the order of the
// day's task list — words and kanji by spaced review, grammar with an explanation and exercises,
// reading/listening, and speaking. Finishing a part checks its task. Answers are events; nothing here
// declares mastery (logic/lesson.js decides what practice shows).

import * as store from '../lib/store.js';
import { israelDay, weekday, shortDate, addDays } from '../lib/dates.js';
import { esc, rich, jp, bi, pair, marks, jaWeekday } from '../lib/ui.js';
import { speak, canSpeak } from '../lib/speak.js';
import { checkBlank, aiAvailable, aiStatus, aiStatusText, gradeItems, gradeWriting, gradeSpeech } from '../lib/check.js';
import { POINT, catalogForGrading } from '../data/grammar.js';
import { WEEKS, PLAN } from '../data/plan.js';
import { TEACH, filled } from '../data/lessons.js';
import { KANJI } from '../data/furigana.js';
import { sentencesFor } from '../data/journey.js';
import { placeOfWeek } from '../data/places.js';
import { findDay, tasksOfDay, taskState, vocabState, weekOf } from '../logic/progress.js';
import {
  dayPoints, pickExercises, pickFocus, noteDrills, srsState, srsQueue, wordDeck, kanjiDeck, listeningFor, speakingTask, writingPrompt,
  NEW_WORDS_PER_DAY, NEW_KANJI_PER_DAY,
} from '../logic/lesson.js';

export const live = false;

const ICONS = { words: '🗂️', kanji: '漢', grammar: '✍️', input: '🎧', speaking: '🗣️', meeting: '☕' };
const withBlank = (text) => jp(text).replace(/＿+/, '<span class="blank"></span>');
const patternOf = (pid) => POINT[pid]?.pattern ?? '';

export function render(root, route) {
  const requested = /^\d{4}-\d{2}-\d{2}$/.test(route.rest[0] ?? '') ? route.rest[0] : null;
  const date = requested ?? israelDay();
  const found = findDay(date);
  const week = found?.week ?? weekOf(date) ?? (date < PLAN.start ? WEEKS[0] : WEEKS.at(-1));
  const day = found?.day ?? null;
  const points = day ? dayPoints(week, day) : [];
  const events = store.all();

  // Plan days list their tasks; a meeting day adds the reviews as optional parts; outside the plan
  // only the reviews remain.
  const tasks = day ? tasksOfDay(week, day) : [];
  const steps = day && day.offset !== 1 ? tasks.map((t) => t.kind) : ['meeting', 'words', 'kanji'].filter((k) => k !== 'meeting' || day);
  const done = () => taskState(store.all());
  const taskId = (kind) => tasks.find((t) => t.kind === kind)?.id ?? null;

  const lesson = {
    date, week, day, points, steps,
    exercises: [
      ...pickExercises(points, events, date).map((x) => ({ x, tag: 'day' })),
      ...pickFocus(events, date).map(({ x, group }) => ({ x, tag: 'focus', group })),
      ...noteDrills(events, date).map((n) => ({ x: { id: n.id, type: 'note', ...n }, tag: 'note' })),
    ],
    i: 0,
    srs: {},
    step: steps.find((k) => !taskId(k) || !done()[taskId(k)]) ?? steps[0],
  };
  let cleanupRec = null;

  const finish = (kind) => {
    const id = taskId(kind);
    if (id && !done()[id]) store.add('task', { id, done: true });
  };

  const draw = () => {
    cleanupRec?.();
    cleanupRec = null;
    const state = done();
    root.innerHTML = `<div class="stack lesson-page">
      ${header(lesson)}
      <nav class="steps" aria-label="חלקי השיעור">${steps.map((kind) => {
        const t = tasks.find((x) => x.kind === kind);
        const ok = t && state[t.id];
        const label = kind === 'meeting' ? bi('taskMeeting') : bi(t?.ui ?? (kind === 'words' ? 'taskWords' : 'taskKanji'));
        return `<button type="button" class="step ${lesson.step === kind ? 'on' : ''} ${ok ? 'done' : ''}" data-step="${kind}">
          <span class="ico" aria-hidden="true">${ok ? '✓' : ICONS[kind]}</span>${label}${t ? `<small class="num">${t.minutes}′</small>` : ''}</button>`;
      }).join('')}</nav>
      <div id="part"></div>
      ${steps.every((k) => !taskId(k) || state[taskId(k)]) && tasks.length ? `<section class="card notice center"><b>${bi('lessonDone')}</b> <span lang="ja">よくできました！</span><div class="actions"><a class="btn" href="#/">${bi('navToday')}</a></div></section>` : ''}
    </div>`;
    root.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => { lesson.step = b.dataset.step; draw(); }));
    const part = root.querySelector('#part');
    const next = () => {
      const after = steps[steps.indexOf(lesson.step) + 1];
      if (after) lesson.step = after;
      draw();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const complete = (kind) => { finish(kind); next(); };
    // Grammar and the reviews check their task as soon as the last card is answered, then show a
    // closing screen (the optional writing task, the week's kanji) with the way to the next part.
    const ended = (kind) => { finish(kind); draw(); };
    if (lesson.step === 'grammar') grammarPart(part, lesson, { ended: () => ended('grammar'), next, redraw: draw });
    else if (lesson.step === 'words' || lesson.step === 'kanji') srsPart(part, lesson, lesson.step, { ended: () => ended(lesson.step), next });
    else if (lesson.step === 'input') inputPart(part, lesson, () => complete('input'));
    else if (lesson.step === 'speaking') cleanupRec = speakingPart(part, lesson, () => complete('speaking'));
    else if (lesson.step === 'meeting') meetingPart(part, lesson, () => complete('meeting'));
  };

  draw();
  return () => cleanupRec?.();
}

function header({ date, week, day, points }) {
  const prev = addDays(date, -1);
  const nextDay = addDays(date, 1);
  const inPlan = (d) => d >= PLAN.start && d <= PLAN.end;
  return `<section class="card">
    <div class="row between">
      <span class="eyebrow">${rich(weekday(date))} ${jaWeekday(date)} · ${shortDate(date)}</span>
      <span class="eyebrow num">שבוע ${week.week} מתוך ${WEEKS.length} <span lang="ja">${marks(`第{だい}${week.week}週{しゅう}`)}</span></span>
    </div>
    <h1 class="title" style="margin:6px 0">${bi('lessonToday')}</h1>
    ${day ? `<div class="today-topic">${rich(day.topic)}</div>` : `<p class="lead">${date < PLAN.start ? 'התוכנית מתחילה ב־29.10.' : 'התוכנית עד מרץ הסתיימה.'} בינתיים — חזרה על מילים וקנג׳י.</p>`}
    ${points.length ? `<div class="chips">${points.map((pid) => `<span class="chip"><span class="jp" lang="ja">${jp(patternOf(pid))}</span><span class="muted">${rich(POINT[pid].title)}</span></span>`).join('')}</div>` : ''}
    <div class="row between small" style="margin-top:10px">
      ${inPlan(prev) ? `<a href="#/lesson/${prev}">→ ${esc(shortDate(prev))}</a>` : '<span></span>'}
      ${inPlan(nextDay) ? `<a href="#/lesson/${nextDay}">${esc(shortDate(nextDay))} ←</a>` : '<span></span>'}
    </div>
  </section>`;
}

// ── Grammar ──────────────────────────────────────────────────────────────────

function teachCard(pid, open) {
  const t = TEACH[pid];
  if (!t) return '';
  return `<details class="teach"${open ? ' open' : ''}><summary><span class="jp" lang="ja">${jp(patternOf(pid))}</span> · ${rich(POINT[pid].title)}</summary>
    <ul class="explain">${t.explain.map((line) => `<li>${rich(line)}</li>`).join('')}</ul>
    ${t.examples.map(([ja, he]) => `<div class="sentence"><p class="s-ja" lang="ja">${jp(ja)} <button class="say" type="button" data-say="${esc(ja)}" aria-label="השמעה">🔊</button></p><p class="s-he">${rich(he)}</p></div>`).join('')}
  </details>`;
}

function grammarPart(part, lesson, cb) {
  const list = lesson.exercises;
  const started = lesson.i > 0;
  part.innerHTML = `<div class="stack">
    ${lesson.points.length ? `<section class="card"><h2><span class="ico">📖</span> ${bi('explain')}</h2>${lesson.points.map((pid) => teachCard(pid, !started)).join('')}</section>` : ''}
    <section class="card runner" id="runner"></section>
  </div>`;
  bindSay(part);
  const runner = part.querySelector('#runner');
  if (!list.length) {
    runner.innerHTML = `<p class="lead">${bi('noExercises')}</p>${writingTask(lesson)}<div class="actions"><button class="btn primary" id="finish">${bi('finishPart')}</button></div>`;
    bindWriting(runner, lesson);
    runner.querySelector('#finish').addEventListener('click', () => { cb.ended(); cb.next(); });
    return;
  }
  if (lesson.i >= list.length) {
    runner.innerHTML = `<h2>${bi('partDone')} ✓</h2>${writingTask(lesson)}
      <div class="actions"><button class="btn quiet" id="again">${bi('restart')}</button><button class="btn primary" id="finish">${bi('finishPart')}</button></div>`;
    bindWriting(runner, lesson);
    runner.querySelector('#again').addEventListener('click', () => { lesson.i = 0; cb.redraw(); });
    runner.querySelector('#finish').addEventListener('click', cb.next);
    return;
  }
  exercise(runner, lesson, list[lesson.i], () => {
    lesson.i += 1;
    if (lesson.i >= list.length) return cb.ended();
    grammarPart(part, lesson, cb);
    part.querySelector('#runner')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  });
}

function exerciseTag(entry) {
  if (entry.tag === 'focus') return `<span class="tag s-partial">${bi('focus')}</span> <span class="small muted">${rich(entry.group.title)}</span>`;
  if (entry.tag === 'note') return `<span class="tag s-pending">${bi('fromNotes')}</span>`;
  return entry.x.points.map((pid) => `<span class="tag"><span lang="ja">${jp(patternOf(pid))}</span></span>`).join(' ');
}

function exercise(runner, lesson, entry, onNext) {
  const { x } = entry;
  const n = lesson.exercises.indexOf(entry) + 1;
  const total = lesson.exercises.length;
  const context = entry.tag === 'focus' ? 'focus' : 'lesson';
  const focusExplain = entry.tag === 'focus' ? `<details class="small"><summary>${bi('explain')}</summary><ul class="explain">${entry.group.explain.map((l) => `<li>${rich(l)}</li>`).join('')}</ul></details>` : '';
  const head = `<div class="row between"><h2 style="margin:0">${bi('exercises')} <span class="num muted">${n}/${total}</span></h2><div>${exerciseTag(entry)}</div></div>
    <div class="progress"><i style="width:${((n - 1) / total) * 100}%"></i></div>${focusExplain}`;

  if (x.type === 'note') {
    const item = x.item;
    runner.innerHTML = `${head}<div class="q-he">${rich(item.prompt || item.meaning || item.title)}</div>
      ${item.title && item.prompt ? `<p class="small muted">${rich(item.title)}</p>` : ''}
      <textarea class="answer" id="ans" lang="ja" placeholder="日本語で"></textarea>
      <div class="actions"><button class="btn primary" id="show">${bi('reveal')}</button></div><div id="fb"></div>`;
    const ans = runner.querySelector('#ans');
    ans.focus();
    runner.querySelector('#show').addEventListener('click', () => {
      runner.querySelector('#show').hidden = true;
      runner.querySelector('#fb').innerHTML = `<div class="feedback">
        <p class="jp" lang="ja"><b>${jp(item.correction)}</b> <button class="say" type="button" data-say="${esc(item.correction)}" aria-label="השמעה">🔊</button></p>
        ${item.reading ? `<p class="small muted" lang="ja">${esc(item.reading)}</p>` : ''}${item.note ? `<p class="small">${rich(item.note)}</p>` : ''}
        ${selfButtons()}</div>`;
      bindSay(runner);
      runner.querySelectorAll('[data-self]').forEach((b) => b.addEventListener('click', () => {
        const grade = Number(b.dataset.self);
        const answer = ans.value.trim();
        if (answer) store.add('lesson-attempt', { lesson: x.lesson.id, item: item.id, trackId: item.trackId, answer, usedHelp: false, assessment: 'pending', source: 'daily-lesson' });
        store.add('srs', { card: x.id, grade });
        onNext();
      }));
    });
    return;
  }

  if (x.type === 'blank') {
    runner.innerHTML = `${head}<div class="q-he">${rich(x.he)}</div>
      <p class="q-jp" lang="ja">${withBlank(x.jp)}</p>
      ${x.base ? `<p class="small muted">${bi('baseWord')}: <span lang="ja">${jp(x.base)}</span>${x.ask ? ` · ${rich(x.ask)}` : ''}</p>` : x.ask ? `<p class="small muted">${rich(x.ask)}</p>` : ''}
      <input class="answer" id="ans" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="日本語で">
      <div class="actions"><button class="btn quiet" id="skip">${bi('dontKnow')}</button><button class="btn primary" id="check">${bi('check')}</button></div><div id="fb"></div>`;
  } else {
    runner.innerHTML = `${head}<div class="q-he">${rich(x.he)}</div>
      <p class="small muted">${bi('writeInJa')}</p>
      <textarea class="answer" id="ans" lang="ja" placeholder="日本語で"></textarea>
      <div class="actions"><button class="btn quiet" id="skip">${bi('dontKnow')}</button><button class="btn primary" id="check">${bi('check')}</button></div><div id="fb"></div>`;
  }
  const ans = runner.querySelector('#ans');
  const fb = runner.querySelector('#fb');
  ans.focus();
  const nextButton = `<div class="actions"><button class="btn primary" id="next">${bi('next')} ←</button></div>`;
  const bindNext = () => {
    const button = runner.querySelector('#next');
    button?.focus();
    button?.addEventListener('click', onNext);
  };
  const lock = () => {
    ans.readOnly = true;
    runner.querySelector('#check').hidden = true;
    runner.querySelector('#skip').hidden = true;
  };
  const modelsHtml = () => (x.type === 'blank'
    ? `<p class="jp" lang="ja">${jp(filled(x))} <button class="say" type="button" data-say="${esc(filled(x))}" aria-label="השמעה">🔊</button></p>${alternatives(x).length ? `<p class="small muted">${bi('alsoOk')}: <span lang="ja">${alternatives(x).map(jp).join('・')}</span></p>` : ''}`
    : x.models.map((m) => `<p class="jp" lang="ja">${jp(m)} <button class="say" type="button" data-say="${esc(m)}" aria-label="השמעה">🔊</button></p>`).join(''));

  const showGemini = (r) => {
    const label = ['rMiss', 'rPartial', 'rOk'][r.score];
    return `<p><span class="tag s-${['gap', 'partial', 'known'][r.score]}">${bi(label)}</span> <span class="small muted">Gemini</span></p>
      ${r.corrected ? `<p class="jp" lang="ja">${rich(r.corrected)}</p>` : ''}${r.feedback ? `<p class="small">${rich(r.feedback)}</p>` : ''}${r.other ? `<p class="small muted">${rich(r.other)}</p>` : ''}`;
  };

  runner.querySelector('#skip').addEventListener('click', () => {
    lock();
    store.add('answer', { context, item: x.id, answer: '', skipped: true, auto: 'wrong' });
    fb.innerHTML = `<div class="feedback"><p class="small muted">${bi('learnIt')}</p>${modelsHtml()}</div>${nextButton}`;
    bindSay(runner);
    bindNext();
  });

  const check = async () => {
    const value = ans.value.trim();
    if (!value) return ans.focus();
    lock();
    if (x.type === 'blank') {
      const ok = checkBlank(x, value);
      const ev = store.add('answer', { context, item: x.id, answer: value, auto: ok ? 'correct' : 'wrong' });
      if (ok) {
        fb.innerHTML = `<div class="feedback ok"><p><b>${bi('correct')} ✓</b></p>${modelsHtml()}</div>${nextButton}`;
        bindSay(runner);
        return bindNext();
      }
      fb.innerHTML = `<div class="feedback miss"><p><b>${bi('answerWas')}:</b></p>${modelsHtml()}
        <div id="second"></div><div class="actions"><button class="btn quiet small" id="right">${bi('iWasRight')}</button></div></div>${nextButton}`;
      bindSay(runner);
      bindNext();
      runner.querySelector('#right').addEventListener('click', (e) => {
        store.add('grade', { answer: ev.id, item: x.id, score: 2, self: true });
        e.currentTarget.replaceWith(Object.assign(document.createElement('span'), { className: 'tag s-known', innerHTML: bi('rOk') }));
      });
      // A correct alternative must never count as a mistake: Gemini takes a second look when available.
      if (await aiAvailable()) {
        const second = runner.querySelector('#second');
        if (!second) return;
        second.innerHTML = `<p class="small muted">${bi('checking')}</p>`;
        try {
          const [r] = await gradeItems([request(x, value, ev.id)]);
          if (r?.score !== null && r?.score !== undefined) {
            store.add('grade', { answer: ev.id, item: x.id, score: r.score, corrected: r.corrected, feedback: r.feedback, other: r.other });
            if (second.isConnected) second.innerHTML = showGemini(r);
          } else if (second.isConnected) second.innerHTML = '';
        } catch (error) {
          if (second.isConnected) second.innerHTML = `<p class="small muted">${esc(error.message)}</p>`;
        }
      }
      return;
    }
    const ev = store.add('answer', { context, item: x.id, answer: value, auto: null });
    if (await aiAvailable()) {
      fb.innerHTML = `<div class="feedback"><p class="small muted">${bi('checking')}</p></div>`;
      try {
        const [r] = await gradeItems([request(x, value, ev.id)]);
        if (r?.score !== null && r?.score !== undefined) {
          store.add('grade', { answer: ev.id, item: x.id, score: r.score, corrected: r.corrected, feedback: r.feedback, other: r.other });
          fb.innerHTML = `<div class="feedback">${showGemini(r)}<details class="small"><summary>${bi('models')}</summary>${modelsHtml()}</details></div>${nextButton}`;
          bindSay(runner);
          return bindNext();
        }
      } catch {
        // Falls through to the self-check below.
      }
    }
    fb.innerHTML = `<div class="feedback"><p class="small muted">${bi('selfCheck')}</p>${modelsHtml()}${selfButtons()}</div>`;
    bindSay(runner);
    runner.querySelectorAll('[data-self]').forEach((b) => b.addEventListener('click', () => {
      store.add('grade', { answer: ev.id, item: x.id, score: Number(b.dataset.self), self: true });
      onNext();
    }));
  };
  runner.querySelector('#check').addEventListener('click', check);
  ans.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && x.type === 'blank') {
      e.preventDefault();
      if (!ans.readOnly) check();
    }
  });
}

// Other accepted fills, without the kana spelling of a fill already shown in kanji.
function alternatives(x) {
  const kanji = /[㐀-鿿々]/;
  return x.answers.slice(1).filter((a) => kanji.test(a) || !x.answers.some((b) => kanji.test(b)));
}

function selfButtons() {
  return `<div class="actions self"><button class="btn small" data-self="0">${bi('selfNo')}</button><button class="btn small" data-self="1">${bi('selfPart')}</button><button class="btn small primary" data-self="2">${bi('selfYes')}</button></div>`;
}

function request(x, answer, id) {
  const target = x.points.length ? x.points.map((pid) => `Genki L${POINT[pid].lesson}: ${POINT[pid].pattern} (${POINT[pid].title})`).join('; ') : 'natural everyday Japanese';
  return x.type === 'blank'
    ? { id, prompt: `${x.he}\nComplete the blank in: ${x.jp}${x.base ? ` (base word: ${x.base})` : ''}${x.ask ? ` — task: ${x.ask}` : ''}. The learner may type only the missing part or the whole sentence.`, target, models: x.answers.map((a) => filled(x, a)), answer }
    : { id, prompt: x.he, target, models: x.models, answer };
}

// The production task at the end of the grammar: a few sentences of your own, checked by Gemini or
// copied to ChatGPT / Claude.

function writingTask(lesson) {
  if (!lesson.points.length) return '';
  return `<details class="writing"><summary><b>${bi('writeTask')}</b> <span class="small muted">(${bi('optional')})</span></summary>
    <p>${rich(writingPrompt(lesson.points.map(patternOf)))}</p>
    <textarea class="answer" id="wtext" lang="ja" style="min-height:140px" placeholder="日本語で"></textarea>
    <div class="actions"><button class="btn" id="wcopy">${bi('copyForChat')}</button><button class="btn primary" id="wsend">${bi('send')}</button></div>
    <div id="wres"></div></details>`;
}

function bindWriting(root, lesson) {
  const text = root.querySelector('#wtext');
  if (!text) return;
  const task = { id: `lesson-${lesson.date}`, he: writingPrompt(lesson.points.map(patternOf)) };
  root.querySelector('#wcopy').addEventListener('click', (e) => copyTo(e.currentTarget, `אני לומד יפנית (Genki, שיעורים 8–18). זו משימת כתיבה מהשיעור היומי:
${task.he}

מה שכתבתי:
${text.value.trim()}

בדוק בבקשה: מה נכון, הטעויות האמיתיות (עם תיקון והסבר קצר בעברית), ונוסח מתוקן שנשאר קרוב לניסוח שלי. לא לפסול משלב מנומס או יומיומי, ולא השמטה טבעית של חלקיקים.`));
  root.querySelector('#wsend').addEventListener('click', async (e) => {
    const value = text.value.trim();
    const out = root.querySelector('#wres');
    if (value.length < 6) return text.focus();
    const button = e.currentTarget;
    if (!(await aiAvailable())) {
      store.add('writing', { task: task.id, text: value });
      out.innerHTML = `<p class="small">${esc(aiStatusText(await aiStatus()))} ${bi('copyForChat')} ↑</p>`;
      return;
    }
    button.disabled = true;
    button.innerHTML = bi('checking');
    const sub = store.add('writing', { task: task.id, text: value });
    try {
      const result = await gradeWriting({ id: task.id, prompt: task.he, answer: value, catalog: catalogForGrading() });
      store.add('writing-grade', { ref: sub.id, task: task.id, result });
      out.innerHTML = production(result, 'writing', value);
    } catch (error) {
      out.innerHTML = `<p class="error">${esc(error.message)}</p>`;
    }
    button.disabled = false;
    button.innerHTML = bi('send');
  });
}

function production(r, kind, text = '') {
  const points = (r.points ?? []).filter((p) => POINT[p.id]);
  return `<div class="feedback">
    ${kind === 'speech' ? `<p class="small muted" style="margin-bottom:0">${bi('heard')}</p><p class="jp" lang="ja" style="margin-top:2px">${rich(r.transcript)}</p>` : `<p class="jp" lang="ja">${rich(text)}</p>`}
    <p>${rich(r.summary)}</p>
    ${r.errors?.length ? `<ul class="small" style="padding-inline-start:18px">${r.errors.map((e) => `<li><span class="jp" lang="ja">${rich(e.original)}</span> ← <span class="jp" lang="ja" style="color:var(--known)">${rich(e.corrected)}</span> · <span class="muted">${rich(e.note)}</span></li>`).join('')}</ul>` : ''}
    ${r.corrected_text ? `<p class="small muted" style="margin-bottom:0">${bi('fixedText')}</p><p class="jp" lang="ja" style="margin-top:2px">${rich(r.corrected_text)}</p>` : ''}
    ${r.fluency_note ? `<p class="small muted">${rich(r.fluency_note)}</p>` : ''}
    ${points.length ? `<div class="chips">${points.map((p) => `<span class="chip s-${p.verdict === 'ok' ? 'known' : 'gap'}"><span class="jp" lang="ja">${jp(POINT[p.id].pattern)}</span></span>`).join('')}</div>` : ''}
  </div>`;
}

// ── Words and kanji: spaced review ───────────────────────────────────────────

function srsPart(part, lesson, kind, cb) {
  const s = lesson.srs[kind] ??= (() => {
    const events = store.all();
    const state = srsState(events);
    const deck = kind === 'words'
      ? wordDeck(events, placeOfWeek(lesson.week.week)?.id ?? null, vocabState(events))
      : kanjiDeck(lesson.week.week);
    const queue = srsQueue(deck, state, lesson.date, kind === 'words' ? NEW_WORDS_PER_DAY : NEW_KANJI_PER_DAY)
      .map((card) => ({ card, isNew: !state.has(card.id) }));
    return { queue, i: 0, shown: false, again: new Map(), total: queue.length };
  })();

  const title = kind === 'words' ? bi('taskWords') : bi('taskKanji');
  if (s.i >= s.queue.length) {
    part.innerHTML = `<section class="card center"><h2>${title}</h2>
      <p class="lead">${s.total ? bi('reviewFinished') : bi('nothingDue')}</p>
      ${kind === 'kanji' ? weekKanji(lesson.week) : ''}
      <div class="actions"><button class="btn primary" id="finish">${bi('finishPart')}</button></div></section>`;
    part.querySelector('#finish').addEventListener('click', () => {
      if (!s.total) cb.ended();
      cb.next();
    });
    return;
  }
  const { card, isNew } = s.queue[s.i];
  const left = s.queue.length - s.i;
  part.innerHTML = `<section class="card">
    <div class="row between"><h2 style="margin:0">${title}</h2><span class="small muted num">${bi('remaining')}: ${left}${isNew ? ` · <span class="tag s-new">${bi('newCard')}</span>` : ''}</span></div>
    <div class="flash ${s.shown ? 'shown' : ''}">${face(card, s.shown)}</div>
    ${s.shown
      ? `<div class="actions self"><button class="btn" data-g="0">${bi('srsAgain')}</button><button class="btn" data-g="1">${bi('srsHard')}</button><button class="btn primary" data-g="2">${bi('srsGood')}</button></div>`
      : `<div class="actions"><button class="btn primary" id="show">${bi('reveal')}</button></div>`}
    <p class="small muted" style="margin:10px 0 0">${bi('srsHint')}</p>
  </section>`;
  bindSay(part);
  part.querySelector('#show')?.addEventListener('click', () => {
    s.shown = true;
    if (card.kind !== 'kanji') speak(card.ja);
    srsPart(part, lesson, kind, cb);
  });
  part.querySelector('#show')?.focus();
  part.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => {
    const grade = Number(b.dataset.g);
    store.add('srs', { card: card.id, grade });
    // "Again" brings the card back at the end of today's round (twice at most).
    const times = s.again.get(card.id) ?? 0;
    if (grade === 0 && times < 2) {
      s.queue.push({ card, isNew: false });
      s.again.set(card.id, times + 1);
    }
    s.i += 1;
    s.shown = false;
    if (s.i >= s.queue.length) return cb.ended();
    srsPart(part, lesson, kind, cb);
  }));
}

function face(card, shown) {
  if (card.kind === 'kanji') {
    const [meaning, word, wordHe] = card.info;
    return `<div class="flash-kanji" lang="ja">${esc(card.ja)}</div>
      ${shown ? `<p class="flash-read" lang="ja">${esc(KANJI[card.ja] ?? '')}</p><p class="flash-he">${rich(meaning)}</p>
        <p class="jp" lang="ja">${jp(word)} <button class="say" type="button" data-say="${esc(word)}" aria-label="השמעה">🔊</button> <span class="muted">· ${rich(wordHe)}</span></p>` : ''}`;
  }
  return `<div class="flash-ja ${shown ? '' : 'hide-rt'}" lang="ja">${jp(card.ja)}</div>
    ${shown ? `${card.kind === 'note' && card.reading ? `<p class="flash-read" lang="ja">${esc(card.reading)}</p>` : ''}
      <p class="flash-he">${rich(card.he)} <button class="say" type="button" data-say="${esc(card.ja)}" aria-label="השמעה">🔊</button></p>
      ${card.from ? `<p class="small muted"><a href="#/journey/${esc(card.from.id)}">${esc(card.from.he)}</a></p>` : card.kind === 'note' ? `<p class="small muted">${bi('fromNotes')}</p>` : ''}` : ''}`;
}

function weekKanji(week) {
  return `<div class="kanji-week">${week.kanji.split(/\s+/).map((k) => `<span lang="ja"><ruby>${esc(k)}<rt>${esc(KANJI[k] ?? '')}</rt></ruby></span>`).join('')}</div>`;
}

// ── Reading and listening ────────────────────────────────────────────────────

function inputPart(part, lesson, onDone) {
  const list = listeningFor(lesson.points, lesson.date, sentencesFor);
  const voice = canSpeak();
  part.innerHTML = `<section class="card">
    <h2><span class="ico">🎧</span> ${bi('taskInput')}</h2>
    <p class="small muted">${voice ? 'מקשיבים קודם, בלי טקסט. מנסים להבין, ורק אז פותחים את הטקסט ואת התרגום.' : 'קוראים בקול, מנסים להבין, ורק אז פותחים את התרגום.'}</p>
    <div class="sentences">${list.map((s, i) => `<div class="sentence listen" data-i="${i}">
      <div class="row">${voice ? `<button class="btn small" type="button" data-say="${esc(s.ja)}">🔊 ${bi('listen')}</button>` : ''}
        ${voice ? `<button class="btn quiet small" type="button" data-text="${i}">${bi('showText')}</button>` : ''}
        <button class="btn quiet small" type="button" data-meaning="${i}">${bi('showMeaning')}</button></div>
      <p class="s-ja" lang="ja" ${voice ? 'hidden' : ''}>${jp(s.ja)}</p>
      <p class="s-he" hidden>${rich(s.he)}${s.entry ? ` · <a class="small" href="#/journey/${esc(s.entry.id)}">${esc(s.entry.he)}</a>` : ''}</p>
    </div>`).join('')}</div>
    <p class="small muted">${bi('conversation')}: ${rich(lesson.week.conversation.title)}</p>
    <p class="expr" lang="ja">${jp(lesson.week.conversation.expression)} <button class="say" type="button" data-say="${esc(lesson.week.conversation.expression)}" aria-label="השמעה">🔊</button></p>
    <div class="actions"><button class="btn primary" id="finish">${bi('finishPart')}</button></div>
  </section>`;
  bindSay(part);
  part.querySelectorAll('[data-text]').forEach((b) => b.addEventListener('click', () => {
    part.querySelector(`[data-i="${b.dataset.text}"] .s-ja`).hidden = false;
    b.hidden = true;
  }));
  part.querySelectorAll('[data-meaning]').forEach((b) => b.addEventListener('click', () => {
    const box = part.querySelector(`[data-i="${b.dataset.meaning}"]`);
    box.querySelector('.s-ja').hidden = false;
    box.querySelector('.s-he').hidden = false;
    box.querySelector('[data-text]')?.setAttribute('hidden', '');
    b.hidden = true;
  }));
  part.querySelector('#finish').addEventListener('click', onDone);
}

// ── Speaking ─────────────────────────────────────────────────────────────────

function speakingPart(part, lesson, onDone) {
  const patterns = lesson.points.map(patternOf);
  const task = speakingTask(lesson.week, lesson.day, lesson.points, patterns);
  let recorder = null;
  let stream = null;
  let timer = null;
  let blob = null;
  let seconds = 0;
  const stop = () => {
    clearInterval(timer);
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
  };

  part.innerHTML = `<section class="card">
    <h2><span class="ico">🗣️</span> ${bi('taskSpeaking')}</h2>
    <div class="q-he">${rich(task.he)}</div>
    <p class="small muted">${bi('conversation')}: ${rich(lesson.week.conversation.title)} — <span lang="ja">${jp(lesson.week.conversation.expression)}</span></p>
    <div id="ai"></div>
    <div class="rec"><button class="rec-btn" id="rec">${bi('record')}</button><span class="timer num" id="timer">0:00</span></div>
    <audio id="playback" controls hidden></audio>
    <div class="actions" id="after" hidden><button class="btn quiet" id="again">${bi('again')}</button><button class="btn primary" id="send">${bi('send')}</button></div>
    <p class="error" id="err" hidden></p>
    <div id="result"></div>
    <div class="actions"><button class="btn" id="copy">${bi('copyForChat')}</button><button class="btn" id="chat">${bi('doneInChat')}</button><button class="btn primary" id="finish">${bi('finishPart')}</button></div>
  </section>`;
  const err = part.querySelector('#err');
  const fail = (message) => { err.textContent = message; err.hidden = false; };
  aiAvailable().then(async (ok) => {
    if (!ok && part.isConnected) part.querySelector('#ai').innerHTML = `<p class="small notice">${esc(aiStatusText(await aiStatus()))} אפשר להקליט ולהקשיב לעצמך, או לתרגל בשיחה קולית עם ChatGPT.</p>`;
  });
  part.querySelector('#copy').addEventListener('click', (e) => copyTo(e.currentTarget, `תרגול דיבור ביפנית (Genki 8–18, משלב יומיומי). ${task.he}
תן לי לדבר בלי להפריע. אחר כך: מה עבד, הטעות החשובה ביותר עם תיקון קצר, ושאלת המשך אחת. בלי ציון להגייה.`));
  part.querySelector('#chat').addEventListener('click', () => {
    store.add('speech', { task: task.id, via: 'chat' });
    stop();
    onDone();
  });
  part.querySelector('#finish').addEventListener('click', () => { stop(); onDone(); });

  const rec = part.querySelector('#rec');
  rec.addEventListener('click', async () => {
    if (recorder?.state === 'recording') return stop();
    err.hidden = true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return fail('אין גישה למיקרופון. צריך לאשר אותה בדפדפן.');
    }
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      rec.classList.remove('on');
      rec.innerHTML = bi('record');
      blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const audio = part.querySelector('#playback');
      audio.src = URL.createObjectURL(blob);
      audio.hidden = false;
      part.querySelector('#after').hidden = false;
    };
    recorder.start();
    seconds = 0;
    rec.classList.add('on');
    rec.innerHTML = bi('stop');
    part.querySelector('#after').hidden = true;
    timer = setInterval(() => {
      seconds += 1;
      part.querySelector('#timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
      if (seconds >= task.seconds + 60) stop();
    }, 1000);
  });
  part.querySelector('#again').addEventListener('click', () => {
    blob = null;
    part.querySelector('#playback').hidden = true;
    part.querySelector('#after').hidden = true;
    part.querySelector('#timer').textContent = '0:00';
  });
  part.querySelector('#send').addEventListener('click', async (e) => {
    if (!blob) return;
    const button = e.currentTarget;
    if (!(await aiAvailable())) return fail(aiStatusText(await aiStatus()));
    button.disabled = true;
    button.innerHTML = bi('checking');
    try {
      const audio = await toBase64(blob);
      const result = await gradeSpeech({ id: task.id, prompt: task.he, catalog: catalogForGrading(), audio, mime: blob.type });
      const sub = store.add('speech', { task: task.id, seconds, mime: blob.type });
      store.add('speech-grade', { ref: sub.id, task: task.id, result });
      part.querySelector('#result').innerHTML = production(result, 'speech');
      part.querySelector('#after').hidden = true;
    } catch (error) {
      fail(error.message);
    }
    button.disabled = false;
    button.innerHTML = bi('send');
  });
  return stop;
}

function toBase64(value) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(value);
  });
}

// ── The weekly conversation with a person ────────────────────────────────────

function meetingPart(part, lesson, onDone) {
  const previous = WEEKS.find((w) => w.week === lesson.week.week - 1);
  const review = [...new Set([...(previous ? previousPoints(previous) : []), ...dayPoints(lesson.week, lesson.week.days[0])])];
  part.innerHTML = `<section class="card">
    <h2><span class="ico">☕</span> ${bi('meetingToday')}</h2>
    <p class="lead">${rich(lesson.day.topic)}</p>
    <p class="small muted">${bi('conversation')}: ${rich(lesson.week.conversation.title)} — ${rich(lesson.week.conversation.target)}</p>
    <p class="expr" lang="ja">${jp(lesson.week.conversation.expression)}</p>
    ${review.length ? `<p class="small">${bi('toRetrieve')}:</p><div class="chips">${review.map((pid) => `<span class="chip"><span class="jp" lang="ja">${jp(patternOf(pid))}</span><span class="muted">${rich(POINT[pid].title)}</span></span>`).join('')}</div>` : ''}
    <p class="small muted">אחרי המפגש: דוח השיעור נכנס ב"חזרה מהשיחות" במסך היום, והטעויות והמילים ממנו חוזרות בשיעורים היומיים.</p>
    <div class="actions"><a class="btn" href="#/">${bi('reviewTitle')}</a><button class="btn primary" id="finish">${bi('meetingDone')}</button></div>
  </section>`;
  part.querySelector('#finish').addEventListener('click', onDone);
}

function previousPoints(week) {
  return week.days.flatMap((d) => dayPoints(week, d)).filter((pid, i, all) => all.indexOf(pid) === i);
}

// ── Small helpers ────────────────────────────────────────────────────────────

function bindSay(root) {
  root.querySelectorAll('[data-say]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = '1';
    b.addEventListener('click', () => speak(b.dataset.say));
  });
}

async function copyTo(button, text) {
  try {
    await navigator.clipboard.writeText(text);
    button.innerHTML = bi('copied');
  } catch {
    prompt('העתק:', text);
  }
}
