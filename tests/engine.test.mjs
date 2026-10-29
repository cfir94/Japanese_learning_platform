import test from 'node:test';
import assert from 'node:assert/strict';
import {todayISO,addDays,daysBetween,checkAnswer,emptyState,makeAttempt,progressFor,reviewQueue,parseBackup,mergeStates,buildReport} from '../src/engine.mjs';
import {mistakes,questions} from '../src/data.mjs';

const itemId='JP-001';
function attempt(day,context='hear-event',overrides={}){return {...makeAttempt({id:context,itemId,context},'聞いた',{now:new Date(`${day}T12:00:00Z`),correct:true,id:`${day}-${context}`}),...overrides};}

test('learning dates use Israel time and calendar days across the March boundary',()=>{
  assert.equal(todayISO(new Date('2026-10-29T22:30:00Z')),'2026-10-30');
  assert.equal(addDays('2027-02-28',1),'2027-03-01');
  assert.equal(daysBetween('2026-10-29','2027-03-11'),133);
});
test('Japanese answers tolerate spacing, punctuation, widths and explicit kana alternatives without accepting other tenses',()=>{
  assert.ok(checkAnswer(' 聞いた。 ',['聞いた','きいた']));
  assert.ok(checkAnswer('きいた',['聞いた','きいた']));
  assert.ok(checkAnswer('５年間',['5年間']));
  assert.ok(!checkAnswer('聞いていた',['聞いた']));
  assert.ok(!checkAnswer('',['聞いた']));
});
test('one successful answer and repeated same-day answers do not close a learning point',()=>{
  assert.equal(progressFor(itemId,[attempt('2026-10-29')],'2026-10-29').stable,false);
  const repeated=[attempt('2026-10-29','a'),attempt('2026-10-29','b'),attempt('2026-10-29','c')];
  assert.equal(progressFor(itemId,repeated,'2026-10-29').stable,false);
});
test('hints, shown answers, retries and sentence assembly remain distinct from independent production',()=>{
  const attempts=[attempt('2026-10-29','a',{hinted:true}),attempt('2026-11-01','b',{revealed:true}),attempt('2026-11-06','c',{firstTry:false}),attempt('2026-11-07','d',{type:'assembly'})];
  const p=progressFor(itemId,attempts,'2026-11-08');assert.equal(p.independent,0);assert.equal(p.stable,false);
});
test('mastery needs delayed independent successes in different contexts; a subsequent error reopens the point',()=>{
  const successes=[attempt('2026-10-29','hear'),attempt('2026-11-01','go'),attempt('2026-11-06','read')];
  assert.equal(progressFor(itemId,successes,'2026-11-06').status,'stable');
  const failed=attempt('2026-11-07','hear-new',{correct:false});
  const p=progressFor(itemId,[...successes,failed],'2026-11-07');assert.equal(p.status,'reopened');assert.equal(p.independent,0);assert.equal(p.total,4);
});
test('correct answers on one repeated context do not establish transferable use',()=>{
  const repeated=[attempt('2026-10-29'),attempt('2026-11-01'),attempt('2026-11-06')];assert.equal(progressFor(itemId,repeated,'2026-11-06').stable,false);
});
test('review scheduling carries the point to a later day and prioritizes untouched points first',()=>{
  const a=attempt('2026-10-29');assert.equal(progressFor(itemId,[a],'2026-10-29').nextReview,'2026-10-30');
  assert.equal(progressFor(itemId,[a],'2026-10-29').due,false);
  assert.equal(progressFor(itemId,[a],'2026-10-30').due,true);
  const queue=reviewQueue(mistakes,questions,[a],'2026-10-29');assert.equal(queue[0].itemId,'JP-002');
});
test('backup import merges once, preserves local drafts, and retains evidence of assistance',()=>{
  const current=emptyState();current.attempts=[attempt('2026-10-29')];current.drafts['diagnostic-3']='תשובה מקומית';
  const imported={...emptyState(),attempts:[...current.attempts,attempt('2026-10-30','new',{hinted:true})],drafts:{'diagnostic-3':'טיוטה ישנה','speaking-food':'פלאפל'}};
  const parsed=parseBackup(JSON.stringify(imported),mistakes.map(m=>m.id));
  const merged=mergeStates(current,parsed);assert.equal(merged.attempts.length,2);assert.equal(mergeStates(merged,parsed).attempts.length,2);
  assert.equal(merged.drafts['diagnostic-3'],'תשובה מקומית');assert.equal(merged.attempts[1].hinted,true);
});
test('invalid backups do not masquerade as trusted learning records',()=>{
  const ids=mistakes.map(m=>m.id);assert.throws(()=>parseBackup('{oops',ids));
  assert.throws(()=>parseBackup(JSON.stringify({...emptyState(),attempts:[attempt('2026-10-29','a',{itemId:'unknown'})]}),ids));
  assert.throws(()=>parseBackup(JSON.stringify({...emptyState(),attempts:[attempt('2026-10-29','a',{day:'2026-02-31'})]}),ids));
  assert.throws(()=>parseBackup(JSON.stringify({...emptyState(),attempts:[attempt('2026-10-29','a',{correct:'true'})]}),ids));
  assert.throws(()=>parseBackup(JSON.stringify({...emptyState(),drafts:JSON.parse('{"__proto__":"bad"}')}),ids));
});
test('a session report retains incorrect answers and distinguishes draft text from checked production',()=>{
  const state={...emptyState(),attempts:[attempt('2026-10-29','hear',{correct:false,answer:'聞くた'})],drafts:{'diagnostic-3':'きのう…'}};
  const report=buildReport(state,mistakes,'2026-10-29');assert.match(report,/聞くた/);assert.match(report,/טעון תיקון/);assert.match(report,/טיוטות אינן נחשבות תשובות שנבדקו/);
});
