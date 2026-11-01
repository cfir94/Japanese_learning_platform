import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLesson, parseLessonFile, lessonState, sameLesson, reviewReport } from '../src/logic/lesson-review.js';
import { pointStatuses } from '../src/logic/progress.js';

const record = () => ({
  format: 'kotoba-lesson-v1', id: 'lesson-example', date: '2026-11-01', title: 'דוגמה לבדיקה',
  source: { title: 'מקור בדיקה', url: 'https://example.com/lesson', notice: 'תמלול לבדיקה' }, requests: [],
  items: [{ id: 'item-1', trackId: 'JP-002', type: 'error', title: 'יכולת', original: 'original\nsecond line', correction: 'target', assistance: 'model shown', outcome: 'assisted retry', evidence: 'source excerpt', grammar: ['g13-1'] }],
});
const event = (data, at = '2026-11-01T10:00:00Z') => ({ id: at, kind: 'lesson', at, data });

test('one JSON or Markdown lesson imports all evidence and stable IDs', () => {
  const value = record();
  const expected = validateLesson(value);
  assert.deepEqual(parseLessonFile(JSON.stringify(value)), expected);
  assert.deepEqual(parseLessonFile('# סיכום\n\n```kotoba-lesson\n' + JSON.stringify(value) + '\n```'), expected);
  assert.equal(expected.items[0].trackId, 'JP-002');
  assert.equal(expected.items[0].original, 'original\nsecond line');
});

test('malformed, ambiguous and unsafe imports fail before a record can be saved', () => {
  const bad = [];
  for (const mutate of [
    (v) => { v.date = '2026-02-30'; },
    (v) => { v.source.url = 'javascript:alert(1)'; },
    (v) => { v.items.push(v.items[0]); },
    (v) => { v.items[0].trackId = 'renumbered'; },
    (v) => { v.items[0].type = 'mastered'; },
    (v) => { v.items[0].evidence = ''; },
    (v) => { v.id = '../other'; },
  ]) {
    const value = record(); mutate(value); bad.push(value);
  }
  for (const value of bad) assert.throws(() => validateLesson(value));
  assert.throws(() => parseLessonFile('x'.repeat(1_000_001)));
});

test('reimport detects duplicates; a corrected analysis keeps history and retries', () => {
  const first = validateLesson(record());
  const retry = { id: 'retry', kind: 'lesson-attempt', at: '2026-11-01T11:00:00Z', data: { lesson: first.id, item: 'item-1', answer: 'retry', usedHelp: true } };
  const events = [event(first), retry];
  assert.equal(sameLesson(parseLessonFile(JSON.stringify(record())), events), true);
  const corrected = structuredClone(first); corrected.items[0].note = 'reviewed later';
  events.push(event(corrected, '2026-11-02T10:00:00Z'));
  const state = lessonState(events);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.sessions[0].items[0].note, 'reviewed later');
  assert.equal(state.attempts.get('lesson-example/item-1').length, 1);
  assert.match(reviewReport(events), /original\\nsecond line/);
  assert.match(reviewReport(events), /model shown/);
  assert.match(reviewReport(events), /reviewed later/);
});

test('imported analysis and self-reported retries never become placement mastery', () => {
  const before = pointStatuses([]);
  const events = [event(validateLesson(record())), { id: 'retry', kind: 'lesson-attempt', data: { lesson: 'lesson-example', item: 'item-1', answer: 'target', usedHelp: false, assessment: 'pending' } }];
  assert.deepEqual(pointStatuses(events), before);
  assert.equal(lessonState(events).attempts.size, 1);
});

test('one broken stored record does not hide valid private lessons', () => {
  const state = lessonState([event(record()), event({ format: 'broken' })]);
  assert.equal(state.sessions.length, 1);
});
