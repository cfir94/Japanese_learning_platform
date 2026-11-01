import test from 'node:test';
import assert from 'node:assert/strict';
import { CONVERSATION_REVIEW } from '../src/data/conversation-review.js';
import { validateLesson, lessonState, reviewReport } from '../src/logic/lesson-review.js';
import { pointStatuses } from '../src/logic/progress.js';

test('the shared practice curriculum contains models without personal lesson records', () => {
  const lesson = validateLesson(CONVERSATION_REVIEW);
  assert.equal(lesson.items.length, 33);
  assert.ok(lesson.items.every(item => !item.original && !item.trackId && item.correction && item.prompt));
  assert.ok(lesson.items.every(item => !/NotebookLM|L20261101|מאסאמי/.test(JSON.stringify(item))));
});

test('built-in practice retries retain their prompts and do not become mastery', () => {
  const retry = { id: 'practice', kind: 'lesson-attempt', at: '2026-11-01T15:00:00Z',
    data: { lesson: CONVERSATION_REVIEW.id, item: 'conversation-01', answer: 'test response', usedHelp: true, assessment: 'pending' } };
  const state = lessonState([retry], [CONVERSATION_REVIEW]);
  assert.equal(state.sessions.length, 1);
  assert.equal(state.attempts.get(CONVERSATION_REVIEW.id + '/conversation-01').length, 1);
  assert.match(reviewReport([retry], [CONVERSATION_REVIEW]), /test response/);
  assert.deepEqual(pointStatuses([retry]), pointStatuses([]));
});
