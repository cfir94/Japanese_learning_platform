// Places and foods of the March visit — each one is also a word to know.
// Photos come from Wikimedia Commons (place-photos.js, generated with credits).

import { PLACE_PHOTOS } from './place-photos.js';

export const PLACES = [
  { id: 'jerusalem', he: 'ירושלים', ja: 'エルサレム' },
  { id: 'dead-sea', he: 'ים המלח', ja: '死海', reading: 'しかい' },
  { id: 'timna', he: 'תמנע', ja: 'ティムナ' },
  { id: 'eilat', he: 'אילת', ja: 'エイラット' },
  { id: 'ramon', he: 'מכתש רמון', ja: 'ラモン・クレーター' },
  { id: 'galilee', he: 'הכנרת', ja: 'ガリラヤ湖', reading: 'ガリラヤこ' },
  { id: 'nazareth', he: 'נצרת', ja: 'ナザレ' },
  { id: 'haifa', he: 'חיפה', ja: 'ハイファ' },
  { id: 'habonim', he: 'חוף הבונים', ja: 'ハボニム海岸', reading: 'ハボニムかいがん' },
  { id: 'anemones', he: 'כלניות', ja: 'アネモネ' },
  { id: 'jaffa', he: 'יפו', ja: 'ヤッファ' },
  { id: 'tel-aviv', he: 'תל אביב', ja: 'テルアビブ' },
  { id: 'hummus', he: 'חומוס', ja: 'フムス', food: true },
  { id: 'falafel', he: 'פלאפל', ja: 'ファラフェル', food: true },
  { id: 'knafeh', he: 'כנאפה', ja: 'クナーファ', food: true },
  { id: 'shakshuka', he: 'שקשוקה', ja: 'シャクシュカ', food: true },
  { id: 'malabi', he: 'מלבי', ja: 'マラビ', food: true },
];

const PHOTO = Object.fromEntries(PLACE_PHOTOS.map((p) => [p.id, p]));

// Only places whose photo has been fetched and checked are shown.
export function placesWithPhotos() {
  return PLACES.filter((p) => PHOTO[p.id]).map((p) => ({ ...p, photo: PHOTO[p.id] }));
}

// The week's postcard: one destination per week, in the order above.
export function placeOfWeek(weekNumber) {
  const list = placesWithPhotos().filter((p) => !p.food);
  return list.length ? list[(weekNumber - 1) % list.length] : null;
}

export { PLACE_PHOTOS };
