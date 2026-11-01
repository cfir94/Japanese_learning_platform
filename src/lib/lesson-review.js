import { CONVERSATION_REVIEW } from '../data/conversation-review.js';
import * as store from './store.js';
import { currentUser } from './auth.js';
import { esc, rich, jp, bi } from './ui.js';
import { speak } from './speak.js';
import { REVIEW_TYPES, lessonState, parseLessonFile, sameLesson, reviewReport } from '../logic/lesson-review.js';

const TYPE_KEY = { error: 'reviewError', retrieval: 'reviewRetrieval', vocabulary: 'reviewVocab', style: 'reviewStyle', uncertain: 'reviewUncertain' };

export function reviewCard(events) {
  const { sessions, attempts } = lessonState(events, [CONVERSATION_REVIEW]);
  const group = (lesson, type) => {
    const items = lesson.items.filter((item) => item.type === type);
    if (!items.length) return '';
    return `<details class="review-group"><summary>${bi(TYPE_KEY[type])} <span class="num">(${items.length})</span></summary>
      ${items.map((item) => {
        const tries = attempts.get(`${lesson.id}/${item.id}`) ?? [];
        return `<details class="review-item"><summary><bdi class="num">${esc(item.trackId || item.id)}</bdi> · ${rich(item.title)}</summary>
          ${item.original ? `<p><b>${bi('reviewOriginal')}:</b> ${rich(item.original)}</p>` : ''}
          ${item.correction ? `<p><b>${bi('reviewTarget')}:</b> <span lang="ja">${jp(item.correction)}</span></p>` : ''}
          ${item.reading ? `<p class="small muted" lang="ja">${esc(item.reading)}</p>` : ''}
          ${item.meaning ? `<p>${rich(item.meaning)}</p>` : ''}
          ${item.note ? `<p class="small">${rich(item.note)}</p>` : ''}
          ${item.assistance ? `<p class="small muted"><b>${bi('reviewHelp')}:</b> ${rich(item.assistance)}</p>` : ''}
          ${item.outcome ? `<p class="small muted"><b>${bi('reviewOutcome')}:</b> ${rich(item.outcome)}</p>` : ''}
          <details class="small muted"><summary>${bi('reviewEvidence')}</summary><p>${rich(item.evidence)}</p>${item.confidence ? `<p>${rich(item.confidence)}</p>` : ''}</details>
          <div class="actions">${item.correction ? `<button class="btn quiet small" type="button" data-review-say="${esc(item.correction)}">🔊 ${bi('reviewListen')}</button>` : ''}
            <button class="btn small" type="button" data-review-try="${esc(lesson.id)}|${esc(item.id)}">${bi('reviewTry')}</button>
            ${tries.length ? `<span class="small muted num">${bi('reviewAttempts')}: ${tries.length}</span>` : ''}</div>
          ${tries.length ? `<details class="small"><summary>${bi('reviewHistory')}</summary>${tries.map((attempt) => `<p><bdi>${esc(attempt.at.slice(0, 10))}</bdi> · ${rich(attempt.data.answer)}<br><span class="muted">${bi(attempt.data.usedHelp ? 'reviewAssisted' : 'reviewSelfReport')} · ${bi('rPending')}</span></p>`).join('')}</details>` : ''}
        </details>`;
      }).join('')}</details>`;
  };
  return `<section class="card" id="conversation-review">
    <h2><span class="ico">📒</span> ${bi('reviewTitle')}</h2>
    <p class="small muted">${bi('reviewNotice')}</p>
    <div class="actions"><button class="btn" id="import-lesson" type="button">${bi('reviewImport')}</button>${sessions.length ? `<button class="btn quiet" id="export-review" type="button">${bi('reviewExport')}</button>` : ''}</div>
    ${sessions.length ? sessions.map((lesson, index) => `<details class="review-session"${index === 0 ? ' open' : ''}><summary><b>${rich(lesson.title)}</b> · <bdi class="num">${esc(lesson.date)}</bdi></summary>
      ${lesson.source.notice ? `<p class="small muted">${rich(lesson.source.notice)}</p>` : ''}
      ${lesson.source.url ? `<a class="small" href="${esc(lesson.source.url)}" target="_blank" rel="noopener noreferrer">${bi('reviewOpenSource')}</a>` : ''}
      ${lesson.requests.length ? `<details class="review-group"><summary>${bi('reviewRequests')} <span class="num">(${lesson.requests.length})</span></summary><ul class="small">${lesson.requests.map((request) => `<li><b>${rich(request.title)}</b><p>${rich(request.evidence)}</p><p class="muted">${rich(request.status)}</p></li>`).join('')}</ul></details>` : ''}
      ${REVIEW_TYPES.map((type) => group(lesson, type)).join('')}
    </details>`).join('') : `<p class="small muted">${bi('reviewEmpty')}</p>`}
  </section>`;
}

export function bindReview(root) {
  root.querySelector('#import-lesson')?.addEventListener('click', importDialog);
  root.querySelector('#export-review')?.addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([reviewReport(store.all(), [CONVERSATION_REVIEW])], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'kotoba-conversation-review.md';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  root.querySelectorAll('[data-review-say]').forEach((button) => button.addEventListener('click', () => speak(button.dataset.reviewSay)));
  root.querySelectorAll('[data-review-try]').forEach((button) => button.addEventListener('click', () => {
    const [lessonId, itemId] = button.dataset.reviewTry.split('|');
    const lesson = lessonState(store.all(), [CONVERSATION_REVIEW]).sessions.find((entry) => entry.id === lessonId);
    const item = lesson?.items.find((entry) => entry.id === itemId);
    if (item) retryDialog(lesson, item);
  }));
}

function dialog(html) {
  const element = document.createElement('dialog');
  element.className = 'card review-dialog';
  element.innerHTML = html;
  // Outside the live home view: cloud sync must never erase a retry in progress.
  document.body.append(element);
  element.addEventListener('close', () => element.remove(), { once: true });
  element.showModal();
  return element;
}

function importDialog() {
  const element = dialog(`<form method="dialog" class="stack">
    <h2>${bi('reviewImport')}</h2><p class="small">${bi('reviewImportNote')}</p>
    <label>${bi('reviewFile')}<input type="file" accept=".json,.md,application/json,text/markdown" name="lesson" required></label>
    <p role="status" class="small" data-message></p>
    <div class="actions"><button class="btn quiet" value="cancel" formnovalidate>${bi('reviewClose')}</button><button class="btn primary" value="save">${bi('reviewSave')}</button></div>
  </form>`);
  const form = element.querySelector('form');
  form.addEventListener('submit', async (event) => {
    if (event.submitter?.value !== 'save') return;
    event.preventDefault();
    const button = event.submitter;
    const message = element.querySelector('[data-message]');
    const file = form.elements.lesson.files[0];
    if (!file || file.size > 1_000_000) { message.innerHTML = bi('reviewImportFailed'); return; }
    button.disabled = true;
    const owner = currentUser()?.id;
    try {
      const lesson = parseLessonFile(await file.text());
      if (!owner || currentUser()?.id !== owner) throw new Error('Account changed');
      if (sameLesson(lesson, store.all())) message.innerHTML = bi('reviewDuplicate');
      else { store.add('lesson', lesson); message.innerHTML = bi('reviewImported'); }
      form.querySelector('[value="cancel"]').focus();
    } catch {
      message.innerHTML = bi('reviewImportFailed');
    } finally { button.disabled = false; }
  });
}

function retryDialog(lesson, item) {
  const owner = currentUser()?.id;
  const key = `kotoba-review-draft:${owner}:${lesson.id}:${item.id}`;
  let draft = '';
  try { draft = localStorage.getItem(key) || ''; } catch { /* The retry still works. */ }
  const element = dialog(`<form method="dialog" class="stack">
    <h2>${bi('reviewTry')} · <bdi>${esc(item.trackId || item.id)}</bdi></h2>
    <p>${rich(item.prompt || item.meaning || item.title)}</p>
    <label>${bi('writeInJa')}<textarea class="answer" name="answer" lang="ja" required>${esc(draft)}</textarea></label>
    <label class="small"><input type="checkbox" name="usedHelp" checked> ${bi('reviewUsedHelp')}</label>
    <p class="small muted">${bi('reviewPendingNote')}</p>
    <div class="actions"><button class="btn quiet" value="cancel" formnovalidate>${bi('reviewClose')}</button><button class="btn primary" value="save">${bi('reviewSave')}</button></div>
  </form>`);
  const form = element.querySelector('form');
  form.elements.answer.addEventListener('input', () => {
    try { localStorage.setItem(key, form.elements.answer.value); } catch { /* Ignore blocked storage. */ }
  });
  form.addEventListener('submit', (event) => {
    if (event.submitter?.value !== 'save') return;
    const answer = form.elements.answer.value.trim();
    if (!answer || !owner || currentUser()?.id !== owner) { event.preventDefault(); return; }
    store.add('lesson-attempt', { lesson: lesson.id, item: item.id, trackId: item.trackId, answer, usedHelp: form.elements.usedHelp.checked, assessment: 'pending', source: 'self_report' });
    try { localStorage.removeItem(key); } catch { /* Ignore blocked storage. */ }
  });
  form.elements.answer.focus();
}
