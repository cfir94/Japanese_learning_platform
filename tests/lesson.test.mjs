import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAMMAR, POINT } from '../src/data/grammar.js';
import { WEEKS } from '../src/data/plan.js';
import { TEACH, FOCUS, EXERCISE, DAY_POINTS, KANJI_INFO, FOCUS_WORDS, filled } from '../src/data/lessons.js';
import { checkBlank } from '../src/lib/check.js';
import {
  practiceStatus, pickExercises, pickFocus, srsState, srsQueue, kanjiDeck, wordDeck, noteDrills, dayPoints,
} from '../src/logic/lesson.js';
import { pointStatuses } from '../src/logic/progress.js';

let n = 0;
const ev = (kind, data, day = '2026-11-02') => ({ id: `e${++n}`, kind, at: `${day}T10:00:${String(n % 60).padStart(2, '0')}.000Z`, day, data });

test('every grammar point until March has an explanation, examples and exercises', () => {
  for (const p of GRAMMAR.filter((g) => g.lesson <= 18)) {
    const t = TEACH[p.id];
    assert.ok(t, p.id);
    assert.ok(t.explain.length >= 1 && t.examples.length >= 2 && t.drills.length >= 2, p.id);
  }
  for (const pid of Object.keys(TEACH)) assert.ok(POINT[pid], pid);
});

test('exercise ids are stable, unique and well-formed, and blanks accept their own answers', () => {
  const own = [...Object.values(TEACH).flatMap((t) => t.drills), ...FOCUS.flatMap((f) => f.drills)];
  const ids = own.map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const [pid, t] of Object.entries(TEACH)) {
    for (const x of t.drills) assert.equal(x.id.slice(0, 5), `x${pid.slice(1)}`, x.id);
  }
  for (const f of FOCUS) {
    assert.match(f.id, /^f\d{2}$/);
    for (const x of f.drills) assert.match(x.id, new RegExp(`^${f.id}[a-z]$`));
    for (const pid of f.points) assert.ok(POINT[pid], `${f.id} → ${pid}`);
  }
  for (const x of own) {
    assert.ok(x.he, x.id);
    if (x.type === 'blank') {
      assert.equal((x.jp.match(/＿+/g) ?? []).length, 1, `${x.id} has exactly one blank`);
      assert.ok(x.answers.length, x.id);
      for (const a of x.answers) {
        assert.ok(checkBlank(x, a), `${x.id} accepts ${a}`);
        assert.ok(checkBlank(x, filled(x, a)), `${x.id} accepts the whole sentence with ${a}`);
      }
    } else {
      assert.equal(x.type, 'write', x.id);
      assert.ok(x.models.length, x.id);
    }
  }
  assert.ok(Object.keys(EXERCISE).length > ids.length, 'placement items are practice too');
});

test('every plan day names its points; the meeting day has none', () => {
  for (const w of WEEKS) {
    assert.equal(DAY_POINTS[w.id]?.length, 7, w.id);
    const upTo = Math.max(18, ...w.lessons);
    for (const d of w.days) {
      const points = dayPoints(w, d);
      if (d.offset === 1) assert.deepEqual(points, [], `${w.id} meeting`);
      else assert.ok(points.length, `${w.id} d${d.offset}`);
      for (const pid of points) {
        assert.ok(POINT[pid], `${w.id} d${d.offset}: ${pid}`);
        assert.ok(POINT[pid].lesson <= (w.lessons.length ? Math.max(...w.lessons) : upTo), `${w.id} d${d.offset}: ${pid} is not ahead of the week`);
      }
    }
  }
});

test('every study kanji has a meaning and an example word', () => {
  for (const w of WEEKS) for (const k of w.kanji.split(/\s+/)) assert.equal(KANJI_INFO[k]?.length, 3, `${w.id}: ${k}`);
  assert.ok(FOCUS_WORDS.every((w) => w.length === 2 && w[0] && w[1]));
});

test('one success is not mastery: two days, the latest correct', () => {
  assert.equal(practiceStatus([{ day: 'a', result: 'ok' }]), 'partial');
  assert.equal(practiceStatus([{ day: 'a', result: 'ok' }, { day: 'a', result: 'ok' }]), 'partial');
  assert.equal(practiceStatus([{ day: 'a', result: 'ok' }, { day: 'b', result: 'ok' }]), 'known');
  assert.equal(practiceStatus([{ day: 'a', result: 'ok' }, { day: 'b', result: 'ok' }, { day: 'c', result: 'miss' }]), 'partial');
  assert.equal(practiceStatus([{ day: 'a', result: 'miss' }]), 'gap');
  assert.equal(practiceStatus([{ day: 'a', result: 'pending' }]), 'pending');
});

test('lesson answers move the grammar status; a self-check grade counts like Gemini', () => {
  const a1 = ev('answer', { context: 'lesson', item: 'x09-1a', answer: '読んだ', auto: 'correct' }, '2026-11-01');
  assert.equal(pointStatuses([a1])['g09-1'], 'partial');
  const a2 = ev('answer', { context: 'lesson', item: 'x09-1f', answer: '昨日暑かったから海で泳いだ', auto: null }, '2026-11-02');
  assert.equal(pointStatuses([a1, a2])['g09-1'], 'partial', 'an ungraded translation decides nothing');
  const g2 = ev('grade', { answer: a2.id, item: 'x09-1f', score: 2, self: true }, '2026-11-02');
  assert.equal(pointStatuses([a1, a2, g2])['g09-1'], 'known');
  const wrong = ev('answer', { context: 'lesson', item: 'x09-1b', answer: '面白いなかった', auto: 'wrong' }, '2026-11-03');
  assert.equal(pointStatuses([a1, a2, g2, wrong])['g09-1'], 'partial');
  const fixed = ev('grade', { answer: wrong.id, item: 'x09-1b', score: 2, self: true }, '2026-11-03');
  assert.equal(pointStatuses([a1, a2, g2, wrong, fixed])['g09-1'], 'known', 'a correct alternative is not a mistake');
});

test('the day\'s exercises stay the same all day and prefer what was not practised', () => {
  const points = ['g09-1'];
  const first = pickExercises(points, [], '2026-11-02');
  assert.equal(first.length, 6);
  const today = first.map((x) => ev('answer', { context: 'lesson', item: x.id, answer: 'x', auto: 'correct' }, '2026-11-02'));
  assert.deepEqual(pickExercises(points, today, '2026-11-02').map((x) => x.id), first.map((x) => x.id));
  const tomorrow = pickExercises(points, today, '2026-11-03').map((x) => x.id);
  const unseen = tomorrow.filter((id) => !first.some((x) => x.id === id));
  assert.ok(unseen.length >= 1, 'unseen exercises come first');
  const review = pickExercises(['g09-1', 'g09-2', 'g09-3', 'g09-4'], [], '2026-11-04');
  for (const pid of ['g09-1', 'g09-2', 'g09-3', 'g09-4']) assert.ok(review.some((x) => x.points.includes(pid)), pid);
});

test('focus drills come back by spaced review', () => {
  const first = pickFocus([], '2026-11-02');
  assert.equal(first.length, 2);
  assert.notEqual(first[0].group.id, first[1].group.id);
  const answered = first.map(({ x }) => ev('answer', { context: 'focus', item: x.id, answer: 'x', auto: 'correct' }, '2026-11-02'));
  const next = pickFocus(answered, '2026-11-03').map(({ x }) => x.id);
  for (const { x } of first) assert.ok(!next.includes(x.id), `${x.id} waits after a correct answer`);
});

test('spaced review: new cards per day, again today, longer waits when known', () => {
  const deck = kanjiDeck(1);
  assert.equal(deck.length, 8);
  assert.equal(srsQueue(deck, new Map(), '2026-11-02', 3).length, 3);
  const day1 = [ev('srs', { card: deck[0].id, grade: 2 }), ev('srs', { card: deck[1].id, grade: 0 })];
  let state = srsState(day1);
  assert.equal(state.get(deck[0].id).due, '2026-11-03');
  assert.equal(state.get(deck[1].id).due, '2026-11-02');
  const queue = srsQueue(deck, state, '2026-11-02', 3).map((c) => c.id);
  assert.ok(queue.includes(deck[1].id), 'again comes back today');
  assert.equal(queue.length, 2, 'two new were started today, one more new is allowed');
  state = srsState([...day1, ev('srs', { card: deck[0].id, grade: 2 }, '2026-11-03')]);
  assert.equal(state.get(deck[0].id).due, '2026-11-05');
});

test('the word deck starts with notes from lessons and the focus words, without duplicates', () => {
  const lesson = ev('lesson', {
    format: 'kotoba-lesson-v1', id: 'lesson-2026-11-01', date: '2026-11-01', title: 'שיעור', source: { title: '', notice: '' }, requests: [],
    items: [
      { id: 'v1', type: 'vocabulary', title: 'מילה', correction: '試食', reading: 'ししょく', meaning: 'טעימה', evidence: 'מהשיעור' },
      { id: 'e1', type: 'error', title: 'טעות', original: '持ってしてあげようか', correction: '持ってあげようか', prompt: 'הצע לסחוב תיק', evidence: 'מהשיעור' },
    ],
  });
  const deck = wordDeck([lesson]);
  assert.equal(deck[0].id, 'l:lesson-2026-11-01/v1');
  assert.equal(deck.filter((c) => c.key === '試食').length, 1);
  assert.equal(new Set(deck.map((c) => c.key)).size, deck.length);
  const notes = noteDrills([lesson], '2026-11-02');
  assert.deepEqual(notes.map((n) => n.id), ['l:lesson-2026-11-01/e1']);
  const later = noteDrills([lesson, ev('srs', { card: 'l:lesson-2026-11-01/e1', grade: 2 }, '2026-11-02')], '2026-11-02');
  assert.equal(later.length, 1, 'answers from today do not change today');
  const twice = [lesson, ev('srs', { card: 'l:lesson-2026-11-01/e1', grade: 2 }, '2026-11-02'), ev('srs', { card: 'l:lesson-2026-11-01/e1', grade: 2 }, '2026-11-03')];
  assert.equal(noteDrills(twice, '2026-11-04').length, 0, 'known twice: waits two days');
  assert.equal(noteDrills(twice, '2026-11-05').length, 1);
});
