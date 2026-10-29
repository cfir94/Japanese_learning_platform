// Placement test: overview (#/test), one part at a time (#/test/A…), writing (#/test/W),
// speaking (#/test/S) and results (#/results).
//
// No answers are revealed while a part is running — it is a test. Everything is saved as it is
// typed in, so a part can be left and resumed on any device.

import * as store from '../lib/store.js';
import { esc, rich, statusBar, legend, countStatuses, ring } from '../lib/ui.js';
import { checkBlank, aiAvailable, gradeItems, gradeWriting, gradeSpeech } from '../lib/check.js';
import { PARTS, ITEMS, WRITING, SPEAKING, itemsOfPart } from '../data/placement.js';
import { LESSONS, GRAMMAR, POINT, catalogForGrading } from '../data/grammar.js';
import { STATUS, placementState, partProgress, pointStatuses } from '../logic/progress.js';

export let live = false;

const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i]));
const RESULT_LABEL = { ok: 'נכון', partial: 'חלקי', miss: 'לא נכון', unknown: 'לא למדתי', pending: 'ממתין לבדיקה' };
const RESULT_STATUS = { ok: 'known', partial: 'partial', miss: 'gap', unknown: 'new', pending: 'pending' };

export function render(root, route) {
  const [part] = route.rest;
  if (route.name === 'results') {
    live = true;
    return renderResults(root);
  }
  if (part === 'W') {
    live = false;
    return renderWriting(root);
  }
  if (part === 'S') {
    live = false;
    return renderSpeaking(root);
  }
  if (PARTS.some((p) => p.id === part && p.lessons)) {
    live = false;
    return renderRunner(root, part);
  }
  live = true;
  return renderOverview(root);
}

// ── Overview ─────────────────────────────────────────────────────────────────

function renderOverview(root) {
  const state = placementState(store.all());
  const anyAnswered = state.items.size || state.writing.size || state.speech.size;
  root.innerHTML = `<div class="stack">
    <section class="card">
      <h2>מבחן מיקום</h2>
      <div class="title">איפה אני באמת עומד?</div>
      <p class="lead">המבחן עובר על כל נקודות הדקדוק של Genki משיעור 8 עד 23, ומוסיף כתיבה ודיבור. התוצאה צובעת את התוכנית: מה כבר יושב, מה חלקי ומה עוד לא נלמד.</p>
      <ul class="small" style="margin:12px 0 0;padding-inline-start:18px;color:var(--muted)">
        <li>בלי מילון ובלי מתרגם — אחרת לא נדע את האמת.</li>
        <li><b>"לא למדתי"</b> היא תשובה טובה: היא חוסכת זמן ונותנת בדיוק את המידע שצריך.</li>
        <li>אפשר לעצור באמצע ולהמשיך אחר כך, גם ממכשיר אחר. הכול נשמר.</li>
        <li>התשובות לא נחשפות בזמן המבחן. בסוף כל חלק מקבלים תוצאה ומשוב.</li>
      </ul>
      <p class="small" id="ai-status" style="margin:12px 0 0"></p>
    </section>
    <section class="card">
      <h2>החלקים</h2>
      <ul class="parts">
        ${PARTS.map((p) => {
          const { done, total } = partProgress(p.id, state);
          const label = done >= total ? 'לצפות' : done ? 'להמשיך' : 'להתחיל';
          const href = done >= total ? '#/results' : `#/test/${p.id}`;
          return `<li>${ring(done, total)}
            <div class="info"><b>${rich(p.title)}</b><span class="small muted num">${total} ${p.lessons ? 'שאלות' : 'משימות'} · כ־${p.minutes} דקות</span></div>
            <a class="btn ${done >= total ? '' : 'primary'}" href="${href}">${label}</a></li>`;
        }).join('')}
      </ul>
    </section>
    ${anyAnswered ? '<div class="row"><a class="btn" href="#/results">לתוצאות עד עכשיו</a></div>' : ''}
  </div>`;

  const status = root.querySelector('#ai-status');
  aiAvailable().then((ok) => {
    status.innerHTML = ok
      ? '<span style="color:var(--known)">●</span> בדיקת Gemini פעילה.'
      : '<span style="color:var(--partial)">●</span> בדיקת Gemini עוד לא מחוברת. החלקים של הדקדוק עובדים, והתרגומים ייבדקו כשהיא תחובר. כתיבה ודיבור מחכים לה.';
    if (ok) gradePending().catch(() => {});
  });
}

// ── Grading ──────────────────────────────────────────────────────────────────

function targetOf(item) {
  return item.points.map((id) => `Genki L${POINT[id].lesson}: ${POINT[id].pattern} (${POINT[id].title})`).join('; ');
}

function gradingRequest(item, answerEvent) {
  const blank = item.type === 'blank';
  return {
    id: answerEvent.id,
    prompt: blank
      ? `${item.he}\nComplete the blank in: ${item.jp}${item.base ? ` (base word: ${item.base})` : ''} — task: ${item.ask}. The learner may type only the missing part or the whole sentence.`
      : item.he,
    target: targetOf(item),
    models: blank ? item.answers.map((a) => item.jp.replace(/＿+/, a)) : item.models,
    answer: String(answerEvent.data.answer ?? ''),
  };
}

let grading = null;

// Sends every ungraded written answer (and every locally-wrong completion) to Gemini.
export function gradePending() {
  grading ??= (async () => {
    if (!(await aiAvailable())) return 0;
    const state = placementState(store.all());
    const need = [];
    for (const [itemId, entry] of state.items) {
      const item = ITEM_BY_ID[itemId];
      if (!item || entry.grade || entry.answer.data.skipped) continue;
      if (item.type === 'write' || (item.type === 'blank' && entry.answer.data.auto === 'wrong')) {
        need.push({ item, answer: entry.answer });
      }
    }
    for (const [taskId, entry] of state.writing) {
      if (entry.result) continue;
      const task = WRITING.find((w) => w.id === taskId);
      const result = await gradeWriting({ id: taskId, prompt: task.he, answer: entry.sub.data.text, catalog: catalogForGrading() });
      store.add('writing-grade', { ref: entry.sub.id, task: taskId, result });
    }
    if (!need.length) return 0;
    const results = await gradeItems(need.map(({ item, answer }) => gradingRequest(item, answer)));
    for (const r of results) {
      const source = need.find((n) => n.answer.id === r.id);
      if (!source || r.score === null) continue;
      store.add('grade', { answer: r.id, item: source.item.id, score: r.score, corrected: r.corrected, feedback: r.feedback, other: r.other });
    }
    return results.length;
  })().finally(() => {
    grading = null;
  });
  return grading;
}

// ── Grammar part runner ──────────────────────────────────────────────────────

function renderRunner(root, partId) {
  const part = PARTS.find((p) => p.id === partId);
  const items = itemsOfPart(partId);
  const answered = () => placementState(store.all()).items;
  let index = items.findIndex((i) => !answered().has(i.id));
  if (index === -1) index = items.length;
  const introSeen = new Set();

  const show = () => {
    if (index >= items.length) return finish();
    const item = items[index];
    const firstOfLesson = items.findIndex((i) => i.lesson === item.lesson) === index;
    const lessonUntouched = !items.some((i) => i.lesson === item.lesson && answered().has(i.id));
    if (firstOfLesson && lessonUntouched && !introSeen.has(item.lesson)) return intro(item.lesson);
    question(item);
  };

  const frame = (inner) => {
    const pct = Math.round((index / items.length) * 100);
    root.innerHTML = `<section class="card runner">
      <div class="row between small muted"><a class="btn quiet" href="#/test">← יציאה</a><span class="num">${Math.min(index + 1, items.length)} / ${items.length}</span></div>
      <div class="progress" aria-hidden="true"><i style="width:${pct}%"></i></div>
      ${inner}
    </section>`;
  };

  const intro = (lessonN) => {
    const lesson = LESSONS.find((l) => l.n === lessonN);
    const count = items.filter((i) => i.lesson === lessonN).length;
    frame(`<p class="eyebrow">שיעור ${lessonN} · Genki ${lesson.book}</p>
      <div class="title">${rich(lesson.title)}</div>
      <div class="chips">${GRAMMAR.filter((g) => g.lesson === lessonN).map((g) => `<span class="chip s-untested"><span class="jp" lang="ja">${rich(g.pattern)}</span></span>`).join('')}</div>
      <p class="lead" style="margin-top:14px">${count} שאלות. אם את השיעור הזה עוד לא למדת בכלל, אפשר לדלג עליו כולו.</p>
      <div class="actions"><button class="btn quiet" id="skip-lesson">לא למדתי את השיעור הזה — דלג</button><button class="btn primary" id="go">נתחיל</button></div>`);
    root.querySelector('#go').focus();
    root.querySelector('#go').addEventListener('click', () => {
      introSeen.add(lessonN);
      show();
    });
    root.querySelector('#skip-lesson').addEventListener('click', () => {
      for (const i of items.filter((x) => x.lesson === lessonN && !answered().has(x.id))) {
        store.add('answer', { context: 'placement', part: partId, item: i.id, answer: '', skipped: true, lessonSkip: true });
      }
      index = items.findIndex((i) => !answered().has(i.id));
      if (index === -1) index = items.length;
      show();
    });
  };

  const question = (item) => {
    const previous = answered().get(item.id)?.answer.data;
    const prevText = previous && !previous.skipped ? String(previous.answer ?? '') : '';
    let body = `<p class="eyebrow">שיעור ${item.lesson}</p><div class="q-he">${rich(item.he)}</div>`;
    if (item.type === 'blank') {
      const [before, after] = item.jp.split(/＿+/);
      body += `<p class="q-jp" lang="ja">${rich(before)}<span class="blank"></span>${rich(after)}</p>
        <div class="q-ask">${item.base ? `<span class="base" lang="ja">${rich(item.base)}</span>` : ''}<span>${rich(item.ask)}</span></div>
        <input class="answer" id="ans" lang="ja" autocomplete="off" autocapitalize="off" spellcheck="false" value="${esc(prevText)}" placeholder="החלק החסר">`;
    } else if (item.type === 'write') {
      body += `<p class="small muted" style="margin:-6px 0 12px">כתוב ביפנית.</p>
        <textarea class="answer" id="ans" lang="ja" autocomplete="off" spellcheck="false" placeholder="日本語で">${esc(prevText)}</textarea>`;
    } else {
      body += `<p class="q-jp" lang="ja">${rich(item.jp)}</p>
        <div class="options">${item.options.map((o, n) => `<button class="btn" data-opt="${n}">${rich(o)}</button>`).join('')}</div>`;
    }
    body += `<div class="actions">
      <span class="row">${index > 0 ? '<button class="btn quiet" id="back">הקודם</button>' : ''}<button class="btn quiet" id="unknown">לא יודע / לא למדתי</button></span>
      ${item.type === 'choice' ? '' : '<button class="btn primary" id="next">הבא</button>'}
    </div>
    ${item.type === 'write' ? '<p class="hint">Ctrl+Enter — הבא</p>' : ''}`;
    frame(body);

    const save = (data) => {
      store.add('answer', { context: 'placement', part: partId, item: item.id, ...data });
      index += 1;
      show();
    };
    const input = root.querySelector('#ans');
    input?.focus();
    const submit = () => {
      const value = input.value.trim();
      if (!value) {
        input.focus();
        return;
      }
      save({ answer: value, auto: item.type === 'blank' ? (checkBlank(item, value) ? 'correct' : 'wrong') : null });
    };
    root.querySelector('#next')?.addEventListener('click', submit);
    input?.addEventListener('keydown', (e) => {
      if (e.isComposing || e.keyCode === 229) return; // Enter that confirms Japanese input
      if (e.key === 'Enter' && (item.type === 'blank' || e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        submit();
      }
    });
    root.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.opt);
      save({ answer: n, auto: n === item.answer ? 'correct' : 'wrong', final: true });
    }));
    root.querySelector('#unknown').addEventListener('click', () => save({ answer: '', skipped: true }));
    root.querySelector('#back')?.addEventListener('click', () => {
      index -= 1;
      introSeen.add(items[index].lesson);
      show();
    });
  };

  const finish = () => {
    frame(`<div class="title">החלק הושלם</div><p class="lead" id="grading">בודק…</p><div id="summary"></div>
      <div class="actions"><a class="btn" href="#/results">כל התוצאות</a><a class="btn primary" href="#/test">${nextPartLabel(partId)}</a></div>`);
    const note = root.querySelector('#grading');
    const summary = () => {
      const statuses = pointStatuses(store.all());
      root.querySelector('#summary').innerHTML = `<div class="lessons">${part.lessons.map((n) => {
        const pts = GRAMMAR.filter((g) => g.lesson === n);
        return `<div class="lesson-row"><span class="n">${n}</span>${statusBar(countStatuses(pts, statuses), pts.length)}</div>`;
      }).join('')}</div>${legend(['known', 'partial', 'gap', 'pending', 'new'])}`;
    };
    summary();
    gradePending()
      .then(async (n) => {
        note.textContent = (await aiAvailable())
          ? n ? 'התרגומים נבדקו. הפירוט המלא בתוצאות.' : 'הכול נבדק.'
          : 'השלמות נבדקו. התרגומים ייבדקו כשבדיקת Gemini תחובר.';
        summary();
      })
      .catch((e) => {
        note.textContent = `${e.message} התשובות שמורות, והבדיקה תרוץ שוב כשתחזרו למבחן.`;
      });
  };

  show();
}

function nextPartLabel(partId) {
  const i = PARTS.findIndex((p) => p.id === partId);
  return PARTS[i + 1] ? `לחלק הבא` : 'סיום';
}

// ── Writing ──────────────────────────────────────────────────────────────────

function renderWriting(root) {
  const draw = () => {
    const state = placementState(store.all());
    const next = WRITING.find((w) => !state.writing.has(w.id));
    root.innerHTML = `<div class="stack">
      <div class="row between"><a class="btn quiet" href="#/test">← למבחן</a><span class="small muted num">${state.writing.size} / ${WRITING.length}</span></div>
      ${WRITING.map((w, n) => {
        const entry = state.writing.get(w.id);
        if (entry) return `<section class="card"><h2>משימה ${n + 1}</h2><p>${rich(w.he)}</p>${productionResult(entry, 'writing')}</section>`;
        if (w !== next) return `<section class="card"><h2>משימה ${n + 1}</h2><p class="muted">${rich(w.he)}</p></section>`;
        return `<section class="card"><h2>משימה ${n + 1}</h2><div class="q-he">${rich(w.he)}</div>
          <textarea class="answer" id="text" lang="ja" style="min-height:200px" placeholder="日本語で"></textarea>
          <div class="actions"><span class="small muted" id="count"></span><button class="btn primary" id="send">שליחה לבדיקה</button></div>
          <p class="error" id="err" hidden></p></section>`;
      }).join('')}
      ${next ? '' : '<div class="row"><a class="btn primary" href="#/test">חזרה למבחן</a></div>'}
    </div>`;
    const text = root.querySelector('#text');
    if (!text) return;
    const key = `kotoba-draft:${next.id}`;
    text.value = localStorage.getItem(key) ?? '';
    const count = () => (root.querySelector('#count').textContent = `${text.value.trim().length} תווים`);
    count();
    text.addEventListener('input', () => {
      localStorage.setItem(key, text.value);
      count();
    });
    text.focus();
    root.querySelector('#send').addEventListener('click', async () => {
      const value = text.value.trim();
      if (value.length < 10) return text.focus();
      const button = root.querySelector('#send');
      const err = root.querySelector('#err');
      button.disabled = true;
      button.textContent = 'בודק…';
      const sub = store.add('writing', { task: next.id, text: value });
      localStorage.removeItem(key);
      try {
        if (await aiAvailable()) {
          const result = await gradeWriting({ id: next.id, prompt: next.he, answer: value, catalog: catalogForGrading() });
          store.add('writing-grade', { ref: sub.id, task: next.id, result });
        }
      } catch (e) {
        err.textContent = `${e.message} הטקסט נשמר ויבדק בהמשך.`;
        err.hidden = false;
      }
      draw();
    });
  };
  draw();
}

// ── Speaking ─────────────────────────────────────────────────────────────────

function renderSpeaking(root) {
  let recorder = null;
  let stream = null;
  let timer = null;

  const stop = () => {
    clearInterval(timer);
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
  };

  const draw = async () => {
    stop();
    const ok = await aiAvailable();
    const state = placementState(store.all());
    const next = SPEAKING.find((s) => !state.speech.has(s.id));
    root.innerHTML = `<div class="stack">
      <div class="row between"><a class="btn quiet" href="#/test">← למבחן</a><span class="small muted num">${state.speech.size} / ${SPEAKING.length}</span></div>
      ${ok ? '' : '<section class="card notice small"><b>הדיבור נבדק על ידי Gemini, והבדיקה עוד לא מחוברת.</b><p>אפשר לעשות את שאר המבחן בינתיים.</p></section>'}
      ${SPEAKING.map((s, n) => {
        const entry = state.speech.get(s.id);
        if (entry) return `<section class="card"><h2>משימה ${n + 1}</h2><p>${rich(s.he)}</p>${productionResult(entry, 'speech')}</section>`;
        if (s !== next || !ok) return `<section class="card"><h2>משימה ${n + 1}</h2><p class="muted">${rich(s.he)}</p></section>`;
        return `<section class="card"><h2>משימה ${n + 1} · עד ${s.seconds} שניות</h2><div class="q-he">${rich(s.he)}</div>
          <p class="small muted">חשוב רגע, ואז דבר ביפנית. אין צורך במשפטים מושלמים.</p>
          <div class="rec"><button class="rec-btn" id="rec">הקלטה</button><span class="timer num" id="timer">0:00</span></div>
          <audio id="playback" controls hidden></audio>
          <div class="actions" id="after" hidden><button class="btn quiet" id="again">הקלטה מחדש</button><button class="btn primary" id="send">שליחה לבדיקה</button></div>
          <p class="error" id="err" hidden></p></section>`;
      }).join('')}
      ${next ? '' : '<div class="row"><a class="btn primary" href="#/test">חזרה למבחן</a></div>'}
    </div>`;
    const rec = root.querySelector('#rec');
    if (!rec) return;
    const task = next;
    let blob = null;
    let seconds = 0;
    const err = root.querySelector('#err');
    const fail = (message) => {
      err.textContent = message;
      err.hidden = false;
    };

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
        rec.textContent = 'הקלטה';
        blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const audio = root.querySelector('#playback');
        audio.src = URL.createObjectURL(blob);
        audio.hidden = false;
        root.querySelector('#after').hidden = false;
      };
      recorder.start();
      seconds = 0;
      rec.classList.add('on');
      rec.textContent = 'עצירה';
      root.querySelector('#after').hidden = true;
      timer = setInterval(() => {
        seconds += 1;
        root.querySelector('#timer').textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
        if (seconds >= task.seconds + 30) stop();
      }, 1000);
    });

    root.querySelector('#again').addEventListener('click', () => {
      blob = null;
      root.querySelector('#playback').hidden = true;
      root.querySelector('#after').hidden = true;
      root.querySelector('#timer').textContent = '0:00';
    });

    root.querySelector('#send').addEventListener('click', async () => {
      if (!blob) return;
      const button = root.querySelector('#send');
      button.disabled = true;
      button.textContent = 'בודק… (עד חצי דקה)';
      try {
        const audio = await toBase64(blob);
        const result = await gradeSpeech({ id: task.id, prompt: task.he, catalog: catalogForGrading(), audio, mime: blob.type });
        const sub = store.add('speech', { task: task.id, seconds, mime: blob.type });
        store.add('speech-grade', { ref: sub.id, task: task.id, result });
        draw();
      } catch (e) {
        button.disabled = false;
        button.textContent = 'שליחה לבדיקה';
        fail(e.message);
      }
    });
  };

  draw();
  return stop;
}

function toBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function productionResult(entry, kind) {
  const r = entry.result;
  if (!r) return `<p class="small"><span class="tag s-pending">ממתין לבדיקה</span></p>${kind === 'writing' ? `<p class="mine jp" lang="ja">${rich(entry.sub.data.text)}</p>` : ''}`;
  const points = (r.points ?? []).filter((p) => POINT[p.id]);
  return `
    ${kind === 'speech' ? `<p class="small muted" style="margin-bottom:0">מה נשמע:</p><p class="jp" lang="ja" style="margin-top:2px">${rich(r.transcript)}</p>` : `<p class="jp" lang="ja">${rich(entry.sub.data.text)}</p>`}
    <p>${rich(r.summary)}</p>
    ${r.errors?.length ? `<ul class="small" style="padding-inline-start:18px">${r.errors.map((e) => `<li><span class="jp" lang="ja">${rich(e.original)}</span> ← <span class="jp" lang="ja" style="color:var(--known)">${rich(e.corrected)}</span> · <span class="muted">${rich(e.note)}</span></li>`).join('')}</ul>` : ''}
    ${r.corrected_text ? `<p class="small muted" style="margin-bottom:0">גרסה מתוקנת:</p><p class="jp" lang="ja" style="margin-top:2px">${rich(r.corrected_text)}</p>` : ''}
    ${r.fluency_note ? `<p class="small muted">${rich(r.fluency_note)}</p>` : ''}
    ${r.pronunciation_note ? `<p class="small muted">${rich(r.pronunciation_note)}</p>` : ''}
    ${points.length ? `<div class="chips">${points.map((p) => `<span class="chip s-${p.verdict === 'ok' ? 'known' : 'gap'}"><span class="jp" lang="ja">${rich(POINT[p.id].pattern)}</span></span>`).join('')}</div>` : ''}`;
}

// ── Results ──────────────────────────────────────────────────────────────────

function renderResults(root) {
  const events = store.all();
  const state = placementState(events);
  const statuses = pointStatuses(events);
  const pending = [...state.items.values()].filter((e) => e.result === 'pending').length;

  const lessons = LESSONS.map((l) => {
    const items = ITEMS.filter((i) => i.lesson === l.n && state.items.has(i.id));
    const pts = GRAMMAR.filter((g) => g.lesson === l.n);
    return `<div class="lesson-block">
      <div class="lesson-head"><b>שיעור ${l.n}</b><span>${rich(l.title)}</span></div>
      <div style="margin-top:8px">${statusBar(countStatuses(pts, statuses), pts.length)}</div>
      <div class="chips">${pts.map((p) => `<span class="chip s-${statuses[p.id]}" title="${esc(STATUS[statuses[p.id]].label)}"><span class="jp" lang="ja">${rich(p.pattern)}</span></span>`).join('')}</div>
      ${items.length ? `<details style="margin-top:8px"><summary class="small muted">${items.length} תשובות</summary>${items.map((i) => resultItem(i, state.items.get(i.id))).join('')}</details>` : ''}
    </div>`;
  }).join('');

  root.innerHTML = `<div class="stack">
    <div class="row between"><a class="btn quiet" href="#/test">← למבחן</a>
      ${pending ? `<button class="btn" id="regrade">לבדוק ${pending} תשובות שממתינות</button>` : ''}</div>
    <section class="card"><h2>תוצאות לפי שיעור</h2>${legend(['known', 'partial', 'gap', 'pending', 'new', 'untested'])}${lessons}</section>
    ${state.writing.size ? `<section class="card"><h2>כתיבה</h2>${WRITING.filter((w) => state.writing.has(w.id)).map((w) => `<div class="result-item"><p class="he">${rich(w.he)}</p>${productionResult(state.writing.get(w.id), 'writing')}</div>`).join('')}</section>` : ''}
    ${state.speech.size ? `<section class="card"><h2>דיבור</h2>${SPEAKING.filter((s) => state.speech.has(s.id)).map((s) => `<div class="result-item"><p class="he">${rich(s.he)}</p>${productionResult(state.speech.get(s.id), 'speech')}</div>`).join('')}</section>` : ''}
  </div>`;

  root.querySelector('#regrade')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'בודק…';
    try {
      if (!(await aiAvailable())) throw new Error('בדיקת Gemini עוד לא מחוברת.');
      await gradePending();
    } catch (err) {
      e.target.textContent = err.message;
    }
  });
}

function resultItem(item, entry) {
  const { answer, grade, result } = entry;
  let mine = answer.data.skipped ? '—' : String(answer.data.answer ?? '');
  if (item.type === 'choice' && !answer.data.skipped) mine = item.options[answer.data.answer] ?? '';
  const model = grade?.data.corrected || (item.type === 'blank' ? item.jp.replace(/＿+/, item.answers[0]) : item.type === 'choice' ? item.options[item.answer] : item.models[0]);
  return `<div class="result-item">
    <div class="row between"><span class="he">${rich(item.he)}</span><span class="tag s-${RESULT_STATUS[result]}">${RESULT_LABEL[result]}</span></div>
    ${item.type === 'blank' ? `<div class="small muted jp" lang="ja">${rich(item.jp)}${item.base ? ` · ${rich(item.base)}` : ''}</div>` : ''}
    <div class="mine" ${item.type === 'choice' ? '' : 'lang="ja"'}>${rich(mine)}</div>
    ${result === 'ok' && !grade ? '' : `<div class="model" ${item.type === 'choice' ? '' : 'lang="ja"'}>${rich(model)}</div>`}
    ${grade?.data.feedback ? `<div class="fb">${rich(grade.data.feedback)}</div>` : ''}
    ${grade?.data.other ? `<div class="fb">${rich(grade.data.other)}</div>` : ''}
  </div>`;
}
