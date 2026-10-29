// Markup for our photos (polaroids) and for destination photos (banners, postcards),
// and the credits dialog that Commons licences require.

import { esc } from './ui.js';
import { memory, memoriesOfDay, OPENING_PAIR } from '../data/memories.js';
import { PLACE_PHOTOS, placesWithPhotos } from '../data/places.js';

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

function placeName(place) {
  return `<b>${esc(place.he)}</b><span lang="ja">${esc(place.ja)}</span>${place.reading ? `<span class="rd" lang="ja">${esc(place.reading)}</span>` : ''}`;
}

// A photo across the top of a card, with the place's Hebrew and Japanese name on it.
export function banner(place, tagline = '') {
  if (!place) return '';
  return `<div class="banner">
    <img src="${place.photo.src}" alt="${esc(place.photo.alt)}" loading="lazy" decoding="async">
    ${tagline ? `<span class="tagline">${esc(tagline)}</span>` : ''}
    <div class="label">${placeName(place)}</div>
  </div>`;
}

export function pageBanner(place, title, subtitle = '') {
  if (!place) return '';
  return `<div class="page-banner">
    <img src="${place.photo.src}" alt="${esc(place.photo.alt)}" decoding="async">
    <div class="text"><div class="title">${title}</div>${subtitle ? `<p>${subtitle}</p>` : ''}</div>
  </div>`;
}

export function postcards() {
  const places = placesWithPhotos();
  if (!places.length) return '';
  return `<div class="postcards">${places.map((p) => `<figure class="postcard" style="margin:0">
      <img src="${p.photo.src}" alt="${esc(p.photo.alt)}" loading="lazy" decoding="async">
      <figcaption class="cap"><b>${esc(p.he)}</b><span lang="ja">${esc(p.ja)}</span>${p.reading ? `<span class="rd" lang="ja">${esc(p.reading)}</span>` : ''}</figcaption>
    </figure>`).join('')}</div>`;
}

export function placeById(id) {
  return placesWithPhotos().find((p) => p.id === id) ?? null;
}

export function openCredits() {
  const dialog = document.createElement('dialog');
  dialog.className = 'card';
  dialog.innerHTML = `<form method="dialog">
    <div class="title">קרדיטים לצילומים</div>
    <p class="lead small">צילומי היעדים מוויקישיתוף, ברישיונות חופשיים. הצילומים האישיים שלנו.</p>
    <ul class="credits">${PLACE_PHOTOS.map((p) => `<li>${esc(p.alt)} — ${esc(p.author)} ·
      <a href="${esc(p.licenseUrl || p.source)}" target="_blank" rel="noopener">${esc(p.license)}</a> ·
      <a href="${esc(p.source)}" target="_blank" rel="noopener">מקור</a></li>`).join('')}</ul>
    <div class="actions"><span></span><button class="btn">סגירה</button></div>
  </form>`;
  document.body.append(dialog);
  dialog.addEventListener('close', () => dialog.remove());
  dialog.showModal();
}
