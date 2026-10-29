// Photos for the journey entries: Commons photos (place-photos.js, generated with credits)
// or one of our own memories.

import { PLACE_PHOTOS } from './place-photos.js';
import { memory } from './memories.js';
import { ENTRIES } from './journey.js';

const PHOTO = Object.fromEntries(PLACE_PHOTOS.map((p) => [p.id, p]));

export function photoOf(entry) {
  if (entry.memory) {
    const m = memory(entry.memory);
    return m ? { src: m.src, alt: m.alt, position: m.position, own: true } : null;
  }
  return PHOTO[entry.photo] ?? null;
}

// Journey entries with their photo (image is null while a photo is missing; the views draw a placeholder).
export function entriesWithPhotos(filter = () => true) {
  return ENTRIES.filter(filter).map((e) => ({ ...e, image: photoOf(e) }));
}

// The week's destination: one place per week, in the order of the journey.
export function placeOfWeek(weekNumber) {
  const list = entriesWithPhotos((e) => e.cat === 'places' && photoOf(e));
  return list.length ? list[(weekNumber - 1) % list.length] : null;
}

export { PLACE_PHOTOS };
