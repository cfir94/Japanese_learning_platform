// "המסע": categories of the visit (#/journey, #/journey/<category>) and a page per place, food,
// activity or topic (#/journey/<id>) with words, useful sentences and a question to ask them.

import * as store from '../lib/store.js';
import { esc, rich, jp, bi } from '../lib/ui.js';
import { speak } from '../lib/speak.js';
import { pageBanner, postcard, names, img, credit, entryById, openCredits } from '../lib/photos.js';
import { CATEGORIES, ENTRY, wordId } from '../data/journey.js';
import { entriesWithPhotos } from '../data/places.js';
import { POINT } from '../data/grammar.js';
import { vocabState } from '../logic/progress.js';

export const live = true;

const KANA_KEY = 'kotoba-furigana';

function showKana() {
  try {
    return localStorage.getItem(KANA_KEY) !== '0';
  } catch {
    return true;
  }
}

export function render(root, route) {
  const [param] = route.rest;
  if (param && ENTRY[param]) return renderEntry(root, ENTRY[param]);
  return renderIndex(root, CATEGORIES.some((c) => c.id === param) ? param : 'all');
}

// ── Index ────────────────────────────────────────────────────────────────────

function renderIndex(root, cat) {
  const known = vocabState(store.all());
  const all = entriesWithPhotos();
  const list = cat === 'all' ? all : all.filter((e) => e.cat === cat);
  const totalWords = all.reduce((s, e) => s + e.words.length, 0);
  const knownWords = all.reduce((s, e) => s + e.words.filter((w) => known[wordId(e, w)]).length, 0);
  const cover = entryById('jaffa') ?? all[0];

  root.innerHTML = `<div class="stack">
    ${pageBanner(cover, 'המסע', `<span dir="ltr">11–18.3</span> · מקומות, אוכל, פעילויות ושיחות — ביפנית`)}
    <nav class="tabs" aria-label="קטגוריות">
      <a href="#/journey" class="${cat === 'all' ? 'on' : ''}">${bi('all')}</a>
      ${CATEGORIES.map((c) => `<a href="#/journey/${c.id}" class="${cat === c.id ? 'on' : ''}"><span aria-hidden="true">${c.icon}</span> ${esc(c.he)} <span class="jp-mini" lang="ja">${jp(c.ja)}</span></a>`).join('')}
    </nav>
    <p class="small muted num" style="margin:0">סימנת ${knownWords} מתוך ${totalWords} מילים כמוכרות · <span lang="ja">${jp('覚えた単語')} ${knownWords}／${totalWords}</span></p>
    <div class="journey-grid">
      ${list.map((e) => {
        const k = e.words.filter((w) => known[wordId(e, w)]).length;
        return postcard(e, `<span class="meta num">${e.words.length} מילים · ${e.sentences.length + 1} משפטים</span>
          <span class="mini-bar"><i style="width:${(k / e.words.length) * 100}%"></i></span>`);
      }).join('')}
    </div>
    <button class="credits-link" id="credits" type="button">${bi('credits')}</button>
  </div>`;
  root.querySelector('#credits').addEventListener('click', openCredits);
}

// ── One place / food / activity / topic ──────────────────────────────────────

function renderEntry(root, raw) {
  const entry = entryById(raw.id) ?? raw;
  const known = vocabState(store.all());
  const cat = CATEGORIES.find((c) => c.id === entry.cat);
  const siblings = entriesWithPhotos((e) => e.cat === entry.cat);
  const i = siblings.findIndex((e) => e.id === entry.id);
  const prev = siblings[i - 1];
  const next = siblings[i + 1];
  const kana = showKana();

  const sentence = ([ja, reading, he, g = []], extra = '') => `<li class="sentence ${extra}">
    <div class="row between" style="align-items:flex-start">
      <p class="s-ja" lang="ja">${jp(ja)}</p>
      <button class="say" type="button" data-say="${esc(ja)}" aria-label="השמעה">🔊</button>
    </div>
    <p class="s-he">${rich(he)}</p>
    ${g.length ? `<div class="chips">${g.filter((id) => POINT[id]).map((id) => `<span class="chip g" title="${esc(POINT[id].title)} · שיעור ${POINT[id].lesson}"><span lang="ja">${jp(POINT[id].pattern)}</span><span class="muted">שיעור ${POINT[id].lesson}</span></span>`).join('')}</div>` : ''}
  </li>`;

  root.innerHTML = `<div class="stack">
    <div class="row between"><a class="btn quiet" href="#/journey/${entry.cat}">→ ${esc(cat.he)}</a><span class="small muted">${cat.icon} <span lang="ja">${jp(cat.ja)}</span></span></div>
    <article class="entry">
      <div class="entry-hero">
        ${img(entry.image, 'loading="eager"', entry)}
        <div class="label">${names(entry)}</div>
      </div>
      ${credit(entry.image)}
      <p class="entry-intro">${rich(entry.intro)}</p>

      <section class="card">
        <h2><span class="ico">🗂️</span> ${bi('words')}</h2>
        <div class="words">
          ${entry.words.map((w) => {
            const id = wordId(entry, w);
            return `<div class="word ${known[id] ? 'known' : ''}">
              <span class="w-ja" lang="ja">${jp(w[0])}</span>
              <span class="w-he">${rich(w[2])}</span>
              <span class="w-actions">
                <button class="mark" type="button" data-word="${esc(id)}" data-known="${known[id] ? 1 : 0}">${known[id] ? '✓ מכיר · 知ってる' : 'מכיר? · 知ってる？'}</button>
                <button class="say" type="button" data-say="${esc(w[0])}" aria-label="השמעה">🔊</button>
              </span>
            </div>`;
          }).join('')}
        </div>
      </section>

      <section class="card">
        <div class="row between"><h2 style="margin:0"><span class="ico">💬</span> ${bi('usefulSentences')}</h2>
          <label class="switch small"><input type="checkbox" id="kana" ${kana ? 'checked' : ''}> ${bi('furigana')}</label></div>
        <ul class="sentences">${entry.sentences.map((s) => sentence(s)).join('')}</ul>
      </section>

      <section class="card ask">
        <h2><span class="ico">🌸</span> ${bi('askThem')}</h2>
        <ul class="sentences">${sentence(entry.ask, 'big')}</ul>
      </section>
    </article>
    <nav class="row between pager">
      ${prev ? `<a class="btn" href="#/journey/${prev.id}">→ ${esc(prev.he)}</a>` : '<span></span>'}
      ${next ? `<a class="btn" href="#/journey/${next.id}">${esc(next.he)} ←</a>` : '<span></span>'}
    </nav>
  </div>`;

  root.querySelectorAll('[data-say]').forEach((b) => b.addEventListener('click', () => speak(b.dataset.say)));
  root.querySelectorAll('[data-word]').forEach((b) => b.addEventListener('click', () => {
    store.add('vocab', { id: b.dataset.word, known: b.dataset.known !== '1' });
  }));
  root.querySelector('#kana').addEventListener('change', (e) => {
    try {
      localStorage.setItem(KANA_KEY, e.target.checked ? '1' : '0');
    } catch {
      // Without storage the toggle still works for this visit.
    }
    document.documentElement.classList.toggle('no-furi', !e.target.checked);
  });
}
