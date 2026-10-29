import test from 'node:test';
import assert from 'node:assert/strict';
import {curriculum} from '../src/curriculum.mjs';
import {emptyPlan,parsePlan,mergePlans,completion,tasksForDay,nextTask} from '../src/plan-state.mjs';
import {emptyState,parseBackup,mergeStates,buildMarkdownReport,makeAttempt} from '../src/engine.mjs';
const early='2026-10-29T10:00:00.000Z',late='2026-10-30T10:00:00.000Z';
test('daily curriculum covers the full 19 weeks with unique IDs and exactly seven weekly hours',()=>{
 assert.equal(curriculum.weeks.length,19);const dates=[],ids=[];
 for(const w of curriculum.weeks){assert.equal(w.days.length,7);let minutes=0;
  for(const d of w.days){dates.push(d.date);const tasks=tasksForDay(w,d);ids.push(...tasks.map(t=>t.id));minutes+=tasks.reduce((s,t)=>s+t.minutes,0)+(d.offset===1?0:2);}
  assert.equal(minutes,420);assert.ok(w.conversation.target);assert.ok(w.anchor);
 }
 assert.equal(dates[0],curriculum.start);assert.equal(dates.at(-1),curriculum.target);assert.equal(new Set(dates).size,133);assert.equal(new Set(ids).size,589);
 assert.deepEqual(completion(curriculum.weeks,emptyPlan()),{done:0,total:589,percent:0});
 assert.ok(curriculum.milestones.every(m=>m.date>=curriculum.start&&m.date<=curriculum.target));
});
test('completion and undo merge by timestamp, independently of JP mastery and calendar passage',()=>{
 const old={...emptyPlan(),tasks:{'w01-d0-grammar':{done:true,at:early}}};
 const undone={...emptyPlan(),tasks:{'w01-d0-grammar':{done:false,at:late}}};
 assert.equal(completion(curriculum.weeks,old).done,1);
 assert.equal(completion(curriculum.weeks,mergePlans(old,undone)).done,0);
 assert.equal(mergePlans(undone,old).tasks['w01-d0-grammar'].done,false);
 assert.ok(nextTask(curriculum.weeks,emptyPlan(),'2027-03-11'));
 assert.equal(nextTask(curriculum.weeks,emptyPlan(),'2026-11-06').week,2);
});
test('legacy backups keep attempts and drafts; current backup and MD roundtrip the plan without inventing mastery',()=>{
 const state=emptyState();delete state.curriculum;state.drafts.diag01='昨日は飲まなかった';
 state.attempts.push(makeAttempt({id:'q1',itemId:'JP-001',context:'ctx'},'聞いた',{id:'attempt1',correct:true,now:new Date(early)}));
 const legacy=parseBackup(JSON.stringify(state),['JP-001']);assert.deepEqual(legacy.curriculum,emptyPlan());
 const current={...legacy,curriculum:{tasks:{'w01-d0-grammar':{done:true,at:late}},milestones:{m01:{status:'selfchecked',notes:'ניסיתי והייתי צריך רמז',at:late}}}};
 const roundtrip=parseBackup(JSON.stringify(current),['JP-001']);assert.deepEqual(roundtrip,current);
 const merged=mergeStates(legacy,current);assert.equal(merged.attempts.length,1);assert.equal(merged.drafts.diag01,state.drafts.diag01);assert.equal(merged.curriculum.tasks['w01-d0-grammar'].done,true);
 const md=buildMarkdownReport(merged,[],{day:'2026-10-29'});assert.match(md,/w01-d0-grammar/);assert.match(md,/ניסיתי והייתי צריך רמז/);assert.match(md,/דיווח עצמי/);assert.equal(merged.attempts.length,1);
});
test('invalid plan records reject the complete backup instead of discarding old progress silently',()=>{
 assert.throws(()=>parsePlan({tasks:{'w01-d0-grammar':{done:'true',at:late}}}));
 assert.throws(()=>parsePlan({milestones:{m01:{status:'mastered',notes:'',at:late}}}));
 assert.throws(()=>parsePlan({tasks:{'bad-id':{done:true,at:late}}}));
 assert.throws(()=>parsePlan({milestones:{m01:{status:'planned',notes:'x'.repeat(3001),at:late}}}));
});
