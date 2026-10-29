// Our own photos (published with explicit approval). Never guess who is who in a photo.
// The opening pair is fixed by request; the rest rotate once a day, so nothing jumps while working.

export const MEMORIES = [
  { id: 'memory-01', alt: 'טיול משותף מתחת לפריחת הדובדבן', position: '50% 45%' },
  { id: 'memory-02', alt: 'פריחת הדובדבן וזיכרון מהטיול', position: '50% 55%' },
  { id: 'memory-03', alt: 'רגע קטן של אוכל ולמידה', position: '50% 45%' },
  { id: 'memory-04', alt: 'סביב שולחן ביחד', position: '50% 25%' },
  { id: 'memory-05', alt: 'מקום מהטיול ביפן', position: '50% 50%' },
  { id: 'memory-06', alt: 'ארוחה משותפת ביפן', position: '50% 50%' },
  { id: 'memory-07', alt: 'צילום משותף ליד מקדש', position: '50% 62%' },
  { id: 'memory-08', alt: 'חיוך עם כלב קטן', position: '50% 43%' },
  { id: 'memory-09', alt: 'טיול משותף ליד מקדש אדום', position: '50% 68%' },
  { id: 'memory-10', alt: 'טועמות משהו בשוק', position: '50% 42%' },
  { id: 'memory-11', alt: 'רגע משותף עם מתנה', position: '50% 45%' },
  { id: 'memory-12', alt: 'מבשלים יחד', position: '50% 52%' },
  { id: 'memory-13', alt: 'צילום משותף מול השקיעה', position: '50% 48%' },
  { id: 'memory-14', alt: 'עוצרים למשהו טעים', position: '50% 44%' },
  { id: 'memory-15', alt: 'זיכרון משותף עם חברים', position: '50% 55%' },
  { id: 'memory-16', alt: 'עוד רגע משותף עם חברים', position: '50% 55%' },
  { id: 'memory-17', alt: 'שולחן לימוד עם ספרים וגלובוס', position: '50% 40%' },
].map((m) => ({ ...m, src: `./assets/memories/${m.id}.jpg` }));

export const OPENING_PAIR = ['memory-17', 'memory-02'];

const BY_ID = Object.fromEntries(MEMORIES.map((m) => [m.id, m]));

export function memory(id) {
  return BY_ID[id];
}

// A stable shuffle for the day: the same photos all day, different ones tomorrow.
export function memoriesOfDay(day, count, skip = OPENING_PAIR) {
  let seed = [...day].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
  const pool = MEMORIES.filter((m) => !skip.includes(m.id));
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}
