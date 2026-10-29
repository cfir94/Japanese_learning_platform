// Markup for our photos (polaroids) and for journey photos (banners, postcards),
// and the credits dialog that Commons licences require.

import { esc } from './ui.js';
import { memory, memoriesOfDay, OPENING_PAIR } from '../data/memories.js';
import { PLACE_PHOTOS, entriesWithPhotos } from '../data/places.js';

export function polaroid(m, cls = '') {
  if (!m) return '';
  return `<figure class="polaroid ${cls}" style="margin:0"><img src="${m.src}" alt="${esc(m.alt)}" style="object-position:${m.position}" loading="lazy" decoding="async"></figure>`;
}

export function openingPair() {
  const [a, b] = OPENING_PAIR.map(memory);
  return `<div class="pins">${polaroid(a, 'tilt-l')}${polaroid(b, 'tilt-r')}</div>`;
}

export function memoriesStrip(day) {
  return `<div class="memories" aria-label="זיכרונות מיפן">${memoriesOfDay(day, 3).map((m) => polaroid(m)).join('')}</div>`;
}

const ICON = { places: '📍', food: '🍽️', activities: '🤿', topics: '💬' };

export function img(image, attrs = '', entry = null) {
  if (!image) return `<span class="no-photo" aria-hidden="true">${entry ? ICON[entry.cat] ?? '' : ''}</span>`;
  return `<img src="${image.src}" alt="${esc(image.alt)}" ${image.position ? `style="object-position:${image.position}"` : ''} loading="lazy" decoding="async" ${attrs}>`;
}

export function names(entry) {
  return `<b>${esc(entry.he)}</b><span lang="ja">${esc(entry.ja)}</span>${entry.reading ? `<span class="rd" lang="ja">${esc(entry.reading)}</span>` : ''}`;
}

// A photo across the top of a card, with the entry's Hebrew and Japanese name; links to its page.
export function banner(entry, tagline = '') {
  if (!entry) return '';
  return `<a class="banner" href="#/journey/${entry.id}">
    ${img(entry.image)}
    ${tagline ? `<span class="tagline">${esc(tagline)}</span>` : ''}
    <div class="label">${names(entry)}</div>
  </a>`;
}

export function pageBanner(entry, title, subtitle = '') {
  if (!entry) return '';
  return `<div class="page-banner">
    ${img(entry.image, 'loading="eager"')}
    <div class="text"><div class="title">${title}</div>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
  </div>`;
}

export function postcard(entry, extra = '') {
  return `<a class="postcard" href="#/journey/${entry.id}">
    ${img(entry.image, '', entry)}
    <span class="cap">${names(entry)}${extra}</span>
  </a>`;
}

export function postcards(filter = (e) => e.cat === 'places' || e.cat === 'food') {
  const list = entriesWithPhotos(filter).filter((e) => e.image);
  return list.length ? `<div class="postcards">${list.map((e) => postcard(e)).join('')}</div>` : '';
}

export function entryById(id) {
  return entriesWithPhotos((e) => e.id === id)[0] ?? null;
}

export function credit(image) {
  if (!image || image.own) return image?.own ? '<p class="credit">מהתמונות שלנו</p>' : '';
  return `<p class="credit">צילום: ${esc(image.author)} · <a href="${esc(image.licenseUrl || image.source)}" target="_blank" rel="noopener">${esc(image.license)}</a> · <a href="${esc(image.source)}" target="_blank" rel="noopener">ויקישיתוף</a></p>`;
}

export function openCredits() {
  const dialog = document.createElement('dialog');
  dialog.className = 'card';
  dialog.innerHTML = `<form method="dialog">
    <div class="title">קרדיטים לצילומים</div>
    <p class="lead small">צילומי המסע מוויקישיתוף, ברישיונות חופשיים. הצילומים האישיים שלנו.</p>
    <ul class="credits">${PLACE_PHOTOS.map((p) => `<li>${esc(p.alt)} — ${esc(p.author)} ·
      <a href="${esc(p.licenseUrl || p.source)}" target="_blank" rel="noopener">${esc(p.license)}</a> ·
      <a href="${esc(p.source)}" target="_blank" rel="noopener">מקור</a></li>`).join('')}</ul>
    <div class="actions"><span></span><button class="btn">סגירה</button></div>
  </form>`;
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
}
