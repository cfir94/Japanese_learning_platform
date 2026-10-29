// A learning day is a calendar day in Israel, regardless of the device clock's zone.

const ISRAEL = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function israelDay(date = new Date()) {
  return ISRAEL.format(date);
}

export function addDays(day, count) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

const WEEKDAY = new Intl.DateTimeFormat('he-IL', { weekday: 'long', timeZone: 'UTC' });
const SHORT = new Intl.DateTimeFormat('he-IL', { day: 'numeric', month: 'numeric', timeZone: 'UTC' });

export function weekday(day) {
  return WEEKDAY.format(new Date(`${day}T12:00:00Z`));
}

export function shortDate(day) {
  return SHORT.format(new Date(`${day}T12:00:00Z`));
}
