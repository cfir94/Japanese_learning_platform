import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, checkBlank } from '../src/lib/check.js';
import { ITEMS } from '../src/data/placement.js';
import { WEEKS } from '../src/data/plan.js';
import {
  combine, itemResult, pointStatuses, expectedPoints, marchScope, tasksOfDay, taskState, pace, placementState, partProgress,
} from '../src/logic/progress.js';

const item = (id) => ITEMS.find((i) => i.id === id);
let n = 0;
const ev = (kind, data, at = '2026-10-29T10:00:00.000Z') => ({ id: `e${++n}`, kind, at, day: at.slice(0, 10), data });

test('normalize ignores width, spaces, punctuation and katakana/hiragana', () => {
  assert.equal(normalize(' 飲まなかった。'), normalize('飲まなかった'));
  assert.equal(normalize('ノマナカッタ'), normalize('のまなかった'));
  assert.equal(normalize('ｶﾀｶﾅ'), normalize('かたかな'));
});

test('a blank accepts the fill alone or the whole sentence, kana or kanji', () => {
  const p09a = item('p09a');
  assert.ok(checkBlank(p09a, '飲まなかった'));
  assert.ok(checkBlank(p09a, 'のまなかった'));
  assert.ok(checkBlank(p09a, '昨日はビールを飲まなかった。'));
  assert.ok(!checkBlank(p09a, '飲まないだ'));
  assert.ok(!checkBlank(p09a, ''));
});

test('item results: skipped, locally correct, graded, waiting', () => {
  assert.equal(itemResult({ data: { skipped: true } }), 'unknown');
  assert.equal(itemResult({ data: { auto: 'correct' } }), 'ok');
  assert.equal(itemResult({ data: { auto: 'wrong' } }), 'pending');
  assert.equal(itemResult({ data: { auto: 'wrong', final: true } }), 'miss');
  assert.equal(itemResult({ data: { auto: null } }, { data: { score: 1 } }), 'partial');
  assert.equal(itemResult({ data: { auto: 'wrong' } }, { data: { score: 2 } }), 'ok');
});

test('point status combines items and free production', () => {
  assert.equal(combine([], []), 'untested');
  assert.equal(combine(['ok', 'ok'], []), 'known');
  assert.equal(combine(['ok', 'miss'], []), 'partial');
  assert.equal(combine(['miss'], []), 'gap');
  assert.equal(combine(['unknown'], []), 'new');
  assert.equal(combine(['unknown', 'miss'], []), 'gap');
  assert.equal(combine(['pending'], []), 'pending');
  assert.equal(combine(['unknown', 'pending'], []), 'pending');
  assert.equal(combine(['unknown'], ['ok']), 'partial');
  assert.equal(combine(['ok'], ['error']), 'partial');
  assert.equal(combine([], ['ok']), 'known');
});

test('the latest answer counts, and a grade attaches to its answer', () => {
  const first = ev('answer', { context: 'placement', item: 'p09a', answer: '飲まないだ', auto: 'wrong' });
  const second = ev('answer', { context: 'placement', item: 'p09a', answer: '飲まなかった', auto: 'correct' }, '2026-10-29T10:05:00.000Z');
  const write = ev('answer', { context: 'placement', item: 'p09f', answer: '死海で撮った写真です', auto: null });
  const grade = ev('grade', { answer: write.id, item: 'p09f', score: 2 });
  const statuses = pointStatuses([first, second, write, grade]);
  assert.equal(statuses['g09-1'], 'known');
  assert.equal(statuses['g09-2'], 'known');
  assert.equal(statuses['g10-1'], 'untested');
});

test('part progress counts answered items, writing and speaking', () => {
  const events = [ev('answer', { context: 'placement', item: 'p08a', answer: '食べない', auto: 'correct' }), ev('writing', { task: 'w1', text: '…' })];
  const state = placementState(events);
  assert.equal(partProgress('A', state).done, 1);
  assert.equal(partProgress('W', state).done, 1);
  assert.equal(partProgress('S', state).done, 0);
});

test('expected points grow with the schedule and cover the March scope', () => {
  assert.equal(expectedPoints('2026-10-01'), 0);
  assert.ok(expectedPoints('2026-11-04') >= 8);
  assert.ok(expectedPoints('2026-12-01') < expectedPoints('2027-01-01'));
  assert.equal(expectedPoints('2027-03-03'), marchScope().length);
  assert.equal(expectedPoints('2027-03-10'), marchScope().length);
});

test('days: five tasks (55 min with logging aside) or the 90-minute conversation', () => {
  const w = WEEKS[0];
  assert.equal(tasksOfDay(w, w.days[0]).length, 5);
  assert.equal(tasksOfDay(w, w.days[0]).reduce((s, t) => s + t.minutes, 0), 53);
  assert.deepEqual(tasksOfDay(w, w.days[1]).map((t) => t.kind), ['meeting']);
});

test('task state keeps unchecking, and pace counts passed days only', () => {
  const w = WEEKS[0];
  const ids = tasksOfDay(w, w.days[0]).map((t) => t.id);
  const events = ids.map((id) => ev('task', { id, done: true }));
  events.push(ev('task', { id: ids[0], done: false }, '2026-10-29T11:00:00.000Z'));
  assert.equal(taskState(events)[ids[0]], false);
  events.push(ev('task', { id: ids[0], done: true }, '2026-10-29T12:00:00.000Z'));
  const p = pace(events, '2026-10-31');
  assert.equal(p.passed, 2);
  assert.equal(p.doneDays, 1);
  assert.equal(p.behind, 1);
  assert.equal(p.minutesDone, 53);
});

import { parseSummary, buildBrief } from '../src/logic/brief.js';

test('the ChatGPT summary block is read, with minutes required', () => {
  const block = '```\nKOTOBA\nminutes: 18\ntopic: עבר שלילי\nskill: שואלים שוב\ngood: סיפור ברור\nmistakes:\n- 飲まないだ → 飲まなかった\n- 便利なと思う → 便利だと思う\nnext: たい\n```';
  const parsed = parseSummary(block);
  assert.equal(parsed.minutes, 18);
  assert.equal(parsed.topic, 'עבר שלילי');
  assert.deepEqual(parsed.mistakes, ['飲まないだ → 飲まなかった', '便利なと思う → 便利だと思う']);
  assert.equal(parseSummary('minutes: 10'), null);
  assert.equal(parseSummary('KOTOBA\ntopic: x'), null);
});

test('the brief names today\'s topic and the weekly skill', () => {
  const brief = buildBrief('2026-10-31', []);
  assert.match(brief, /שבוע 1 מתוך 19/);
  assert.match(brief, /עבר קצר חיובי/);
  assert.match(brief, /もう一度言ってくれる/);
  assert.match(buildBrief('2026-10-30', []), /מפגש שיחה עם אדם/);
});
