import test from 'node:test';
import assert from 'node:assert/strict';
import { GRAMMAR, LESSONS, POINT } from '../src/data/grammar.js';
import { ITEMS, PARTS, WRITING, SPEAKING } from '../src/data/placement.js';
import { WEEKS, LESSON_DUE, PLAN } from '../src/data/plan.js';
import { addDays } from '../src/lib/dates.js';

test('grammar ids are unique, well-formed and belong to a known lesson', () => {
  const ids = GRAMMAR.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of GRAMMAR) {
    assert.match(p.id, /^g\d{2}-\d+$/);
    assert.equal(Number(p.id.slice(1, 3)), p.lesson, p.id);
    assert.ok(LESSONS.some((l) => l.n === p.lesson), p.id);
    assert.ok(p.title && p.pattern, p.id);
  }
});

test('placement items are valid and every grammar point is tested', () => {
  const ids = ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  const covered = new Set();
  for (const item of ITEMS) {
    assert.ok(item.points.length, item.id);
    for (const pid of item.points) {
      assert.ok(POINT[pid], `${item.id} → ${pid}`);
      assert.equal(POINT[pid].lesson, item.lesson, `${item.id} lesson matches ${pid}`);
      covered.add(pid);
    }
    assert.ok(item.he, item.id);
    if (item.type === 'blank') {
      assert.equal((item.jp.match(/＿+/g) ?? []).length, 1, `${item.id} has exactly one blank`);
      assert.ok(item.answers.length && item.ask, item.id);
    } else if (item.type === 'write') {
      assert.ok(item.models.length, item.id);
    } else if (item.type === 'choice') {
      assert.equal(item.options.length, 4, item.id);
      assert.ok(Number.isInteger(item.answer) && item.options[item.answer], item.id);
    } else {
      assert.fail(`${item.id}: unknown type ${item.type}`);
    }
  }
  const missing = GRAMMAR.filter((p) => !covered.has(p.id)).map((p) => p.id);
  assert.deepEqual(missing, []);
});

test('every grammar lesson belongs to exactly one part', () => {
  const lessons = PARTS.flatMap((p) => p.lessons ?? []);
  assert.deepEqual([...lessons].sort((a, b) => a - b), LESSONS.map((l) => l.n));
  assert.ok(WRITING.length && SPEAKING.length);
});

test('the plan is 19 continuous weeks of 7 days', () => {
  assert.equal(WEEKS.length, 19);
  let day = PLAN.start;
  for (const week of WEEKS) {
    assert.equal(week.days.length, 7, week.id);
    for (const d of week.days) {
      assert.equal(d.date, day, `${week.id} ${d.offset}`);
      day = addDays(day, 1);
    }
  }
  assert.equal(addDays(day, -1), PLAN.end);
});

test('every scheduled lesson has a due date inside the plan, in order', () => {
  const scheduled = [...new Set(WEEKS.flatMap((w) => w.lessons))];
  assert.deepEqual(scheduled, Object.keys(LESSON_DUE).map(Number));
  const dues = Object.values(LESSON_DUE);
  assert.deepEqual([...dues].sort(), dues);
  for (const lesson of scheduled) {
    const last = WEEKS.filter((w) => w.lessons.includes(lesson)).at(-1);
    assert.equal(LESSON_DUE[lesson], last.end, `lesson ${lesson} is due when its last week ends`);
  }
});
