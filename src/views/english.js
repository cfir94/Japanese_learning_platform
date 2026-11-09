import * as store from '../lib/store.js';
import { currentUser } from '../lib/auth.js';
import { esc, jp, pair, bi } from '../lib/ui.js';
import { speak } from '../lib/speak.js';
import { openingPair, img, credit, entryById } from '../lib/photos.js';
import { partnerCard, bindPartner } from '../lib/partner-view.js';
import { joinPair } from '../lib/partners.js';
import { ENGLISH_UNITS, ENGLISH_PARTS, ENGLISH_LABELS, ENGLISH_CHECKIN } from '../data/english.js';
import { ENGLISH_JOURNEY, ENGLISH_CATEGORIES } from '../data/english-journey.js';
import { ENTRIES } from '../data/journey.js';
import { englishProgress } from '../logic/english.js';

// Forms own their rendering so sync cannot replace text while Masami is typing.
export const live = false;
const label = (key) => pair(ENGLISH_LABELS[key][0], jp(ENGLISH_LABELS[key][1]));
const dual = (en, ja) => pair(en, jp(ja));
const stats = (ctx) => ctx.readOnly ? { units: {}, words: 0, attempts: 0, ...ctx.partner, knownWords: new Map() } : englishProgress(store.all());

export function render(root, route, ctx = {}) {
  if (route.name === 'join') return renderJoin(root, route.rest[0]);
  if (route.name === 'journey') return renderJourney(root, route.rest[0], ctx);
  if (route.name === 'test' || route.name === 'results') return renderCheckin(root, ctx);
  if (route.name === 'lesson') return renderUnit(root, nextUnit(stats(ctx)), ctx);
  if (route.name === 'plan') {
    const unit = ENGLISH_UNITS.find((item) => item.id === route.rest[0]);
    if (unit) return renderUnit(root, unit, ctx);
    return renderPlan(root, ctx);
  }
  const progress = stats(ctx);
  const next = nextUnit(progress);
  root.innerHTML = `<div class="stack">
    <section class="hero">${openingPair()}<div><p class="who" lang="ja">${jp('正美お母さん')}</p><h1 class="title">${label('title')}</h1><p>${label('notice')}</p></div></section>
    ${ctx.readOnly ? `<section class="card notice"><p>${label('readonly')}</p></section>` : ''}
    ${partnerCard()}
    <section class="card"><h2>${label('goal')}</h2><h3>${dual(next.title, next.ja)}</h3><p lang="ja">${jp(next.goal)}</p>
      <a class="btn primary" href="#/plan/${next.id}">${label(ctx.readOnly ? 'show' : 'practise')}</a></section>
    <section class="card"><h2>${label('plan')}</h2><div class="stats"><div class="stat"><b>${Object.values(progress.units).filter((u) => u.done).length}/${ENGLISH_UNITS.length}</b><span>${bi('pairUnits')}</span></div><div class="stat"><b>${progress.attempts}</b><span>${bi('pairAttempts')}</span></div><div class="stat"><b>${progress.words}</b><span>${bi('pairWords')}</span></div></div><a class="btn quiet" href="#/plan">${label('overview')}</a></section>
    <section class="card"><h2>${label('journey')}</h2><div class="postcards">${ENTRIES.slice(0, 4).map(journeyCard).join('')}</div><a class="btn quiet" href="#/journey">${label('journey')}</a></section>
  </div>`;
  bindPartner(root);
}

function nextUnit(progress) {
  return ENGLISH_UNITS.find((unit) => !progress.units[unit.id]?.done) ?? ENGLISH_UNITS[0];
}

function renderPlan(root, ctx) {
  const progress = stats(ctx);
  root.innerHTML = `<div class="stack"><section class="card"><h1>${label('plan')}</h1><p>${label('notice')}</p></section>
    ${ENGLISH_PARTS.map((part) => `<h2 class="part-title">${dual(part.title, part.ja)}</h2>
      ${ENGLISH_UNITS.filter((unit) => unit.part === part.id).map((unit) => `<section class="card"><div class="row between"><h2>${ENGLISH_UNITS.indexOf(unit) + 1}. ${dual(unit.title, unit.ja)}</h2>${progress.units[unit.id]?.done ? '<span class="ok">✓</span>' : ''}</div><p lang="ja">${jp(unit.goal)}</p><a class="btn" href="#/plan/${unit.id}">${label(ctx.readOnly ? 'show' : 'practise')}</a></section>`).join('')}`).join('')}</div>`;
}

// Linking-word drills: one missing word, checked here; every try is kept as an event.
const clean = (text) => String(text ?? '').toLowerCase().replace(/[’']/g, "'").replace(/[.,!?…]/g, '').replace(/\s+/g, ' ').trim();

function drillsCard(unit, ctx) {
  if (!unit.drills?.length) return '';
  return `<section class="card"><h2>${label('drills')}</h2><div class="stack">${unit.drills.map(([sentence, , ja], i) => {
    const [before, after] = sentence.split('___');
    return `<form class="drill" data-drill="${i}"><p class="expr" lang="en" dir="ltr">${esc(before)}<input class="gap" name="gap" lang="en" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="missing word" ${ctx.readOnly ? 'disabled' : ''}>${esc(after)}</p>
      <p class="small muted" lang="ja">${jp(ja)}</p>${ctx.readOnly ? '' : `<button class="btn small" type="submit">${label('check')}</button>`}<p class="small" data-result role="status"></p></form>`;
  }).join('')}</div></section>`;
}

function bindDrills(root, unit) {
  root.querySelectorAll('[data-drill]').forEach((form) => form.addEventListener('submit', (event) => {
    event.preventDefault();
    const [sentence, answers] = unit.drills[Number(form.dataset.drill)];
    const value = clean(form.elements.gap.value);
    if (!value) return form.elements.gap.focus();
    const correct = answers.some((a) => clean(a) === value);
    store.add('english-drill', { unit: unit.id, item: `${unit.id}-d${form.dataset.drill}`, answer: value, correct });
    const full = sentence.replace('___', answers[0]);
    form.querySelector('[data-result]').innerHTML = correct
      ? `<span class="ok">✓ ${label('correct')}</span>`
      : `${label('answerIs')}: <b lang="en" dir="ltr">${esc(full)}</b> <button class="say" type="button" data-en-say="${esc(full)}" aria-label="Listen">🔊</button>`;
    form.querySelector('[data-en-say]')?.addEventListener('click', (e) => speak(e.currentTarget.dataset.enSay, 'en-US'));
  }));
}

function readDraft(key) { try { return JSON.parse(localStorage.getItem(key) || 'null') || { answer: '', usedHelp: false }; } catch { return { answer: '', usedHelp: false }; } }
function saveDraft(key, draft) { try { localStorage.setItem(key, JSON.stringify(draft)); } catch { /* Draft storage unavailable. */ } }
function removeDraft(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } }
const draftKey = (unit, item) => `kotoba-english-draft:${currentUser()?.id}:${unit}:${item}`;

function renderUnit(root, unit, ctx, index = 0) {
  const [prompt, example] = unit.prompts[index];
  const progress = stats(ctx);
  const key = draftKey(unit.id, index);
  const draft = readDraft(key);
  root.innerHTML = `<div class="stack"><a class="btn quiet" href="#/plan">← ${label('overview')}</a>
    <section class="card"><h1>${dual(unit.title, unit.ja)}</h1><p lang="ja">${jp(unit.goal)}</p>
      ${ctx.readOnly ? `<p class="small">${label('readonly')}</p>` : `<label class="small"><input type="checkbox" data-unit-done ${progress.units[unit.id]?.done ? 'checked' : ''}> ${label('done')}</label>`}</section>
    <section class="card"><h2>${label('words')}</h2><div class="words">${unit.words.map(([en, ja]) => wordTile(`${unit.id}:${en}`, en, ja, progress, ctx)).join('')}</div></section>
    <section class="card"><h2>${label('examples')}</h2>${unit.examples.map(([en, ja]) => `<p class="expr" lang="en">${esc(en)} <button class="say" data-en-say="${esc(en)}" aria-label="Listen">🔊</button></p><p lang="ja">${jp(ja)}</p>`).join('')}</section>
    ${drillsCard(unit, ctx)}
    <section class="card"><h2>${label('practise')} · ${index + 1}/${unit.prompts.length}</h2><p class="q-he" lang="ja">${jp(prompt)}</p>
      <p class="small muted">${label('useLinks')}<br>${label('stayEnglish')}</p>
      ${ctx.readOnly ? `<p>${label('readonly')}</p>` : `<form data-english-form class="stack"><label>${label('answer')}<textarea class="answer" name="answer" lang="en" dir="ltr" required>${esc(draft.answer)}</textarea></label>
      <button class="btn quiet" type="button" data-model>${label('model')}</button><div data-example ${draft.usedHelp ? '' : 'hidden'}><p class="expr" lang="en">${esc(example)}</p><button class="say" type="button" data-en-say="${esc(example)}" aria-label="Listen">🔊</button></div>
      <p class="small muted">${label('notice')}</p><div class="actions"><button class="btn primary" type="submit">${label('save')}</button><button class="btn quiet" type="button" data-next>${label('next')}</button></div><p data-saved role="status"></p></form>`}</section>
    ${ENGLISH_UNITS[ENGLISH_UNITS.indexOf(unit) + 1] ? `<a class="btn quiet" href="#/plan/${ENGLISH_UNITS[ENGLISH_UNITS.indexOf(unit) + 1].id}">${label('nextUnit')} →</a>` : ''}
  </div>`;
  bindWords(root, ctx);
  bindDrills(root, unit);
  root.querySelector('[data-unit-done]')?.addEventListener('change', (event) => store.add('english-unit', { unit: unit.id, done: event.target.checked }));
  const form = root.querySelector('[data-english-form]');
  if (!form) return;
  const owner = currentUser()?.id;
  form.elements.answer.addEventListener('input', () => { draft.answer = form.elements.answer.value; saveDraft(key, draft); });
  root.querySelector('[data-model]').addEventListener('click', () => { draft.usedHelp = true; saveDraft(key, draft); root.querySelector('[data-example]').hidden = false; });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = form.elements.answer.value.trim();
    if (!answer || currentUser()?.id !== owner) return;
    store.add('english-attempt', { unit: unit.id, item: `${unit.id}-${index}`, answer, usedHelp: Boolean(draft.usedHelp), assessment: 'pending' });
    removeDraft(key); draft.answer = ''; form.elements.answer.value = '';
    form.querySelector('[data-saved]').innerHTML = label('saved');
  });
  root.querySelector('[data-next]').addEventListener('click', () => renderUnit(root, unit, ctx, (index + 1) % unit.prompts.length));
}

function wordTile(id, en, ja, progress, ctx) {
  const known = progress.knownWords.get(id);
  return `<div class="word ${known ? 'known' : ''}"><span class="w-ja" lang="en">${esc(en)}</span><span class="w-he" lang="ja">${jp(ja)}</span><span class="w-actions"><button class="say" data-en-say="${esc(en)}" aria-label="Listen">🔊</button>${ctx.readOnly ? '' : `<button class="mark" data-en-word="${esc(id)}" data-en-known="${known ? 1 : 0}">${known ? '✓ ' : ''}${label('familiar')}</button>`}</span></div>`;
}

function bindWords(root, ctx) {
  root.querySelectorAll('[data-en-say]').forEach((button) => button.addEventListener('click', () => speak(button.dataset.enSay, 'en-US')));
  if (ctx.readOnly) return;
  root.querySelectorAll('[data-en-word]').forEach((button) => button.addEventListener('click', () => {
    const known = button.dataset.enKnown !== '1';
    store.add('english-vocab', { word: button.dataset.enWord, known });
    button.dataset.enKnown = known ? '1' : '0';
    button.innerHTML = `${known ? '✓ ' : ''}${label('familiar')}`;
    button.closest('.word').classList.toggle('known', known);
  }));
}

function journeyCard(raw) {
  const entry = entryById(raw.id) ?? raw;
  const name = ENGLISH_JOURNEY[raw.id][0];
  const image = entry.image ? { ...entry.image, alt: name } : null;
  return `<a class="postcard" href="#/journey/${raw.id}">${img(image, '', entry)}<span class="cap"><b>${esc(name)}</b><span lang="ja">${jp(raw.ja)}</span></span></a>`;
}

function renderJourney(root, param, ctx) {
  const raw = ENTRIES.find((entry) => entry.id === param);
  if (!raw) {
    const category = Object.hasOwn(ENGLISH_CATEGORIES, param) ? param : '';
    root.innerHTML = `<div class="stack"><section class="card"><h1>${label('journey')}</h1><nav class="tabs"><a href="#/journey">${dual('All', 'すべて')}</a>${Object.entries(ENGLISH_CATEGORIES).map(([id, [en, ja]]) => `<a href="#/journey/${id}">${dual(en, ja)}</a>`).join('')}</nav></section><div class="journey-grid">${ENTRIES.filter((entry) => !category || entry.cat === category).map(journeyCard).join('')}</div></div>`;
    return;
  }
  const entry = entryById(raw.id) ?? raw;
  const [name, words, question] = ENGLISH_JOURNEY[raw.id];
  const progress = stats(ctx);
  root.innerHTML = `<div class="stack"><a class="btn quiet" href="#/journey">← ${label('journey')}</a><article class="entry"><div class="entry-hero">${img(entry.image ? { ...entry.image, alt: name } : null, '', entry)}<div class="label"><b>${esc(name)}</b><span lang="ja">${jp(raw.ja)}</span></div></div>${credit(entry.image)}
    ${raw.english ? `<p class="entry-intro" lang="en">${esc(raw.english.intro)}</p>
    <section class="card"><h2>${label('examples')}</h2><ul class="sentences">${raw.sentences.map((s, i) => `<li class="sentence"><p class="expr" lang="en">${esc(raw.english.sentences[i])} <button class="say" data-en-say="${esc(raw.english.sentences[i])}" aria-label="Listen">🔊</button></p><p lang="ja" dir="ltr">${jp(s[0])}</p></li>`).join('')}</ul>
    <details><summary>${dual('Sources', '参考資料')}</summary><ul>${raw.sources.map(([name, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(name)}</a></li>`).join('')}</ul></details></section>` : ''}
    <section class="card"><h2>${label('words')}</h2><div class="words">${raw.words.map((word, index) => wordTile(`journey:${raw.id}:${words[index]}`, words[index], word[0], progress, ctx)).join('')}</div></section>
    <section class="card"><h2>${label('questions')}</h2><p class="expr" lang="en">${esc(question)} <button class="say" data-en-say="${esc(question)}" aria-label="Listen">🔊</button></p><p lang="ja">${jp('英語で質問してみよう。')}</p></section></article></div>`;
  bindWords(root, ctx);
}

function renderCheckin(root, ctx, index = 0) {
  const [item, prompt] = ENGLISH_CHECKIN[index];
  const key = draftKey('checkin', item);
  const draft = readDraft(key);
  root.innerHTML = `<div class="stack"><section class="card"><h1>${label('test')}</h1><p>${label('testNotice')}</p></section><section class="card"><h2>${index + 1}/${ENGLISH_CHECKIN.length}</h2><p class="q-he" lang="ja">${jp(prompt)}</p>${ctx.readOnly ? `<p>${label('readonly')}</p>` : `<form class="stack"><label>${label('answer')}<textarea class="answer" name="answer" lang="en" dir="ltr" required>${esc(draft.answer)}</textarea></label><div class="actions"><button class="btn primary" type="submit">${label('save')}</button><button class="btn quiet" type="button" data-next>${label('next')}</button></div><p role="status" data-saved></p></form>`}</section></div>`;
  const form = root.querySelector('form');
  if (!form) return;
  const owner = currentUser()?.id;
  form.elements.answer.addEventListener('input', () => saveDraft(key, { answer: form.elements.answer.value, usedHelp: false }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = form.elements.answer.value.trim();
    if (!answer || currentUser()?.id !== owner) return;
    store.add('english-attempt', { unit: 'checkin', item, answer, usedHelp: false, assessment: 'pending' });
    removeDraft(key); form.elements.answer.value = ''; form.querySelector('[data-saved]').innerHTML = label('saved');
  });
  root.querySelector('[data-next]').addEventListener('click', () => renderCheckin(root, ctx, (index + 1) % ENGLISH_CHECKIN.length));
}

function renderJoin(root, code) {
  root.innerHTML = `<section class="card stack"><h1>${bi('pairJoin')}</h1><p>${bi('pairJoinNotice')}</p><button class="btn primary" data-join>${bi('pairJoin')}</button><p data-message role="status"></p></section>`;
  root.querySelector('[data-join]').addEventListener('click', async (event) => {
    const button = event.currentTarget; button.disabled = true;
    try { await joinPair(code); root.querySelector('[data-message]').innerHTML = bi('pairJoinDone'); location.hash = '#/'; }
    catch { root.querySelector('[data-message]').innerHTML = bi('pairFailed'); button.disabled = false; }
  });
}
