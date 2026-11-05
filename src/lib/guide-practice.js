import { esc, rich, jp, bi } from './ui.js';
import { speak } from './speak.js';
import * as store from './store.js';
import { GUIDE, GUIDE_SOURCES, PRACTICE_NOTES } from '../data/guide.js';

// Retained across live store refreshes: rating a card must not reset a round or its tabs.
const sessions = new Map();
function shuffled(words) {
  const result = [...words];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function mountGuide(host, entry, ctx = {}) {
  if (!host) return;
  const state = sessions.get(entry.id) ?? { tab: 'guide', lang: 'ja', lines: false, reverse: false, shown: false, queue: shuffled(entry.words), i: 0, repeats: {}, ratings: {} };
  sessions.set(entry.id, state);
  const lines = GUIDE[entry.id] ?? [];
  const restart = () => { state.queue = shuffled(entry.words); state.i = 0; state.shown = false; state.repeats = {}; state.ratings = {}; draw(); };
  const tabs = () => `<div class="tabs study-tabs" role="tablist" aria-label="תרגול בנושא">
    <button type="button" role="tab" id="guide-tab-${entry.id}" aria-controls="guide-panel-${entry.id}" aria-selected="${state.tab === 'guide'}" tabindex="${state.tab === 'guide' ? 0 : -1}" data-study="guide">${bi('guideParagraph')}</button>
    <button type="button" role="tab" id="cards-tab-${entry.id}" aria-controls="cards-panel-${entry.id}" aria-selected="${state.tab === 'cards'}" tabindex="${state.tab === 'cards' ? 0 : -1}" data-study="cards">${bi('topicFlashcards')}</button>
  </div>`;

  function guide() {
    const ja = lines.map(([text]) => `<span>${jp(text)}</span>`).join(state.lines ? '<br><br>' : ' ');
    const he = lines.map(([,text]) => `<span>${rich(text)}</span>`).join(state.lines ? '<br><br>' : ' ');
    return `<section role="tabpanel" id="guide-panel-${entry.id}" aria-labelledby="guide-tab-${entry.id}">
      <div class="row between guide-toolbar">
        <div class="tabs study-tabs" role="group" aria-label="שפת הפסקה">
          <button type="button" data-lang="ja" aria-pressed="${state.lang === 'ja'}">${bi('guideJapanese')}</button>
          <button type="button" data-lang="he" aria-pressed="${state.lang === 'he'}">${bi('guideHebrew')}</button>
        </div>
        <label class="small"><input type="checkbox" id="guide-lines" ${state.lines ? 'checked' : ''}> ${bi('guideBySentence')}</label>
      </div>
      <div class="guide-paragraph" lang="${state.lang}" dir="${state.lang === 'ja' ? 'ltr' : 'rtl'}">${state.lang === 'ja' ? ja : he}</div>
      <details><summary>${bi('guideListen')}</summary>
        <ol class="guide-listen">${lines.map(([text], i) => `<li><span lang="ja" dir="ltr">${jp(text)}</span> <button class="say" type="button" data-guide-say="${i}" aria-label="השמעת משפט ${i + 1}">🔊</button></li>`).join('')}</ol>
      </details>
      ${(PRACTICE_NOTES[entry.id] ?? []).length ? `<details><summary>${bi('guideNotes')}</summary><dl class="guide-notes">${PRACTICE_NOTES[entry.id].map(([ja,note]) => `<dt lang="ja" dir="ltr">${jp(ja)}</dt><dd>${rich(note)}</dd>`).join('')}</dl></details>` : ''}
      ${GUIDE_SOURCES[entry.id]?.length ? `<details><summary>${bi('guideSources')}</summary><ul>${GUIDE_SOURCES[entry.id].map(([name,url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)}</a></li>`).join('')}</ul></details>` : ''}
    </section>`;
  }

  function cards() {
    const word = state.queue[state.i];
    const reviewed = Object.keys(state.ratings).length;
    if (!word) {
      const again = Object.values(state.ratings).filter(g => g === 0).length;
      return `<section role="tabpanel" id="cards-panel-${entry.id}" aria-labelledby="cards-tab-${entry.id}" class="topic-round-end center"><h3>${bi('topicRoundDone')}</h3><p class="num">${reviewed} / ${entry.words.length}</p><p>${bi(again ? 'topicKeepPracticing' : 'topicNiceRound')}</p><button type="button" class="btn primary" id="topic-restart">${bi('topicReplay')}</button></section>`;
    }
    const face = state.reverse ? rich(word[2]) : jp(word[0]);
    const back = state.reverse ? jp(word[0]) : rich(word[2]);
    const example = entry.sentences.find(s => s[0].includes(word[0]));
    return `<section role="tabpanel" id="cards-panel-${entry.id}" aria-labelledby="cards-tab-${entry.id}">
      <div class="row between guide-toolbar"><p class="small num" aria-live="polite">${bi('topicReviewed')}: ${reviewed} / ${entry.words.length}</p>
        <button type="button" class="btn quiet" id="topic-direction">${bi(state.reverse ? 'topicHeJa' : 'topicJaHe')}</button></div>
      ${entry.image ? `<img class="topic-card-photo" src="${esc(entry.image.src)}" alt="${esc(entry.image.alt)}" loading="lazy"><p class="small muted topic-photo-note">${bi('topicPhotoHint')}</p>` : ''}
      <button type="button" class="topic-flashcard ${state.shown ? 'revealed' : ''}" id="topic-flip" aria-expanded="${state.shown}" aria-controls="topic-answer-${entry.id}">
        <span class="topic-card-front" lang="${state.reverse ? 'he' : 'ja'}" dir="${state.reverse ? 'rtl' : 'ltr'}">${face}</span>
        ${state.shown ? `<span id="topic-answer-${entry.id}" class="topic-card-back" lang="${state.reverse ? 'ja' : 'he'}" dir="${state.reverse ? 'ltr' : 'rtl'}">${back}</span>` : `<span id="topic-answer-${entry.id}" class="small muted">${bi('topicFlip')}</span>`}
      </button>
      <div class="row between"><button type="button" class="btn quiet" id="topic-say" ${state.reverse && !state.shown ? 'hidden' : ''}>🔊 ${bi('reviewListen')}</button><span class="small muted">${bi('topicSelfCheck')}</span></div>
      ${state.shown && example ? `<p class="topic-example" lang="ja" dir="ltr">${jp(example[0])}</p><p class="small">${rich(example[2])}</p>` : ''}
      ${state.shown ? `<div class="topic-ratings"><button type="button" class="btn" data-topic-grade="0">${bi('srsAgain')}</button><button type="button" class="btn" data-topic-grade="1">${bi('srsHard')}</button><button type="button" class="btn primary" data-topic-grade="2">${bi('srsGood')}</button></div>` : ''}
    </section>`;
  }

  function draw() {
    host.innerHTML = `${tabs()}${state.tab === 'guide' ? guide() : cards()}`;
    host.querySelectorAll('[data-study]').forEach(b => {
      b.addEventListener('click', () => { state.tab = b.dataset.study; draw(); host.querySelector(`[data-study="${state.tab}"]`)?.focus(); });
      b.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        state.tab = e.key === 'Home' ? 'guide' : e.key === 'End' ? 'cards' : state.tab === 'guide' ? 'cards' : 'guide';
        draw(); host.querySelector(`[data-study="${state.tab}"]`)?.focus();
      });
    });
    host.querySelectorAll('[data-lang]').forEach(b => b.addEventListener('click', () => { state.lang = b.dataset.lang; draw(); host.querySelector(`[data-lang="${state.lang}"]`)?.focus(); }));
    host.querySelector('#guide-lines')?.addEventListener('change', e => { state.lines = e.target.checked; draw(); host.querySelector('#guide-lines')?.focus(); });
    host.querySelectorAll('[data-guide-say]').forEach(b => b.addEventListener('click', () => speak(lines[Number(b.dataset.guideSay)][0])));
    host.querySelector('#topic-flip')?.addEventListener('click', () => { state.shown = !state.shown; draw(); host.querySelector('#topic-flip')?.focus(); });
    host.querySelector('#topic-direction')?.addEventListener('click', () => { state.reverse = !state.reverse; state.shown = false; draw(); host.querySelector('#topic-direction')?.focus(); });
    host.querySelector('#topic-say')?.addEventListener('click', () => speak(state.queue[state.i][0]));
    host.querySelector('#topic-restart')?.addEventListener('click', restart);
    host.querySelectorAll('[data-topic-grade]').forEach(b => b.addEventListener('click', () => {
      const word = state.queue[state.i];
      const grade = Number(b.dataset.topicGrade);
      state.ratings[word[0]] = grade;
      const times = state.repeats[word[0]] ?? 0;
      if (grade === 0 && times < 2) { state.queue.push(word); state.repeats[word[0]] = times + 1; }
      state.i++; state.shown = false;
      if (!ctx.readOnly) store.add('srs', { card: `w:${word[0]}`, grade, context: 'journey', entry: entry.id });
      draw(); host.querySelector('#topic-flip, #topic-restart')?.focus();
    }));
  }
  draw();
}
