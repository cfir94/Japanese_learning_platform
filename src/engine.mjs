import {emptyPlan,parsePlan,mergePlans,planReport} from './plan-state.mjs?v=20261029.9';
export const APP_ID = 'kotoba-learning';
export const SCHEMA = 1;
export const STORAGE_KEY = 'kotoba-progress-v1';
export function todayISO(now = new Date()) { return new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(now); }
export function addDays(day, count) { const d=new Date(day+'T12:00:00Z'); d.setUTCDate(d.getUTCDate()+count); return d.toISOString().slice(0,10); }
export function daysBetween(from,to) {return Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000);}
export function normalizeAnswer(text) {return String(text).normalize('NFKC').replace(/[\s\u3000。．.!！?？、,，]/gu,'').trim();}
export function checkAnswer(answer, accepted) {const value=normalizeAnswer(answer);return value.length>0&&accepted.some(x=>normalizeAnswer(x)===value);}
export function emptyState() {return {app:APP_ID,schema:SCHEMA,attempts:[],drafts:{},speakingSessions:[],curriculum:emptyPlan()};}
function stableEvidence(attempts) {
  const good=attempts.filter(a=>a.correct&&a.firstTry&&!a.hinted&&!a.revealed&&a.type==='production');
  const dates=new Set(good.map(a=>a.day)); const contexts=new Set(good.map(a=>a.context));
  return good.length>=3&&dates.size>=2&&contexts.size>=2&&daysBetween(good[0]?.day??'2000-01-01',good.at(-1)?.day??'2000-01-01')>=7;
}
export function progressFor(itemId,attempts,today=todayISO()) {
  const all=attempts.filter(a=>a.itemId===itemId).toSorted((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
  let lastFailure=-1; for(let i=0;i<all.length;i++)if(!all[i].correct)lastFailure=i;
  const recent=all.slice(lastFailure+1);
  const independent=recent.filter(a=>a.correct&&a.firstTry&&!a.hinted&&!a.revealed&&a.type==='production');
  const stable=stableEvidence(recent);
  const reopened=lastFailure>=0&&stableEvidence(all.slice(0,lastFailure));
  const last=all.at(-1);
  const interval=stable?14:(last?.correct&&last.firstTry&&!last.hinted&&!last.revealed&&last.type==='production'?[1,3,7][Math.min(Math.max(independent.length-1,0),2)]:1);
  const nextReview=last?addDays(last.day,interval):today;
  const status=stable?'stable':reopened?'reopened':all.length?'practising':'open';
  return {status,stable,reopened,independent:independent.length,total:all.length,correct:all.filter(a=>a.correct).length,nextReview,due:nextReview<=today,last,history:all};
}
export function reviewQueue(items,questions,attempts,today=todayISO()) {
  const sorted=items.map(item=>({...item,progress:progressFor(item.id,attempts,today)})).toSorted((a,b)=>Number(b.progress.due)-Number(a.progress.due)||a.progress.nextReview.localeCompare(b.progress.nextReview)||a.priority-b.priority);
  return sorted.flatMap(item=>{const matching=questions.filter(q=>q.itemId===item.id); const unseen=matching.find(q=>!attempts.some(a=>a.questionId===q.id&&a.day===today));return unseen?[unseen]:matching.length?[matching[item.progress.total%matching.length]]:[];});
}
export function makeAttempt(question,answer,options={}) {
  const now=options.now??new Date();
  return {id:options.id??globalThis.crypto?.randomUUID?.()??`${now.getTime()}-${Math.random().toString(36).slice(2)}`,itemId:question.itemId,questionId:question.id,context:question.context??question.id,at:now.toISOString(),day:todayISO(now),answer:String(answer).slice(0,2000),correct:Boolean(options.correct),hinted:Boolean(options.hinted),revealed:Boolean(options.revealed),firstTry:options.firstTry!==false,type:options.type??'production'};
}
export function sessionStats(attempts,today=todayISO()) {const todays=attempts.filter(a=>a.day===today);return {total:todays.length,correct:todays.filter(a=>a.correct).length,independent:todays.filter(a=>a.correct&&a.firstTry&&!a.hinted&&!a.revealed&&a.type==='production').length};}
function validDate(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day+'T12:00:00Z'))&&new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;}
export function parseBackup(raw,allowedIds) {
  if(typeof raw!=='string'||raw.length>2_000_000)throw new Error('קובץ הגיבוי גדול מדי או אינו קובץ טקסט.');
  let data;try{data=JSON.parse(raw);}catch{throw new Error('לא ניתן לקרוא את הקובץ כ־JSON.');}
  if(data?.app!==APP_ID||data?.schema!==SCHEMA||!Array.isArray(data.attempts)||data.attempts.length>10000)throw new Error('הקובץ אינו גיבוי נתמך של מרחב הלמידה.');
  const ids=new Set(allowedIds);const attempts=[];
  for(const a of data.attempts){
    if(!a||typeof a.id!=='string'||a.id.length>150||!ids.has(a.itemId)||typeof a.questionId!=='string'||a.questionId.length>100||typeof a.context!=='string'||a.context.length>100||typeof a.answer!=='string'||a.answer.length>2000||!validDate(a.day)||typeof a.at!=='string'||Number.isNaN(Date.parse(a.at))||todayISO(new Date(a.at))!==a.day||!['production','recognition','assembly'].includes(a.type)||!['correct','hinted','revealed','firstTry'].every(k=>typeof a[k]==='boolean'))throw new Error('קובץ הגיבוי מכיל ניסיון תרגול לא תקין. לא שונו נתונים.');
    attempts.push(Object.fromEntries(['id','itemId','questionId','context','at','day','answer','correct','hinted','revealed','firstTry','type'].map(k=>[k,a[k]])));
  }
  const drafts={};
  if(data.drafts&&typeof data.drafts==='object'&&!Array.isArray(data.drafts))for(const [key,value] of Object.entries(data.drafts)){if(!/^[a-z0-9-]{1,60}$/.test(key)||typeof value!=='string'||value.length>10000)throw new Error('הגיבוי מכיל טיוטה לא תקינה.');drafts[key]=value;}
  const speakingSessions=Array.isArray(data.speakingSessions)?data.speakingSessions:[];
  if(speakingSessions.length>10000||!speakingSessions.every(s=>s&&typeof s.id==='string'&&s.id.length<=150&&validDate(s.day)&&typeof s.promptId==='string'&&s.promptId.length<100&&Number.isInteger(s.seconds)&&s.seconds>=0&&s.seconds<=3600))throw new Error('הגיבוי מכיל רישום דיבור לא תקין.');
  return {app:APP_ID,schema:SCHEMA,attempts,drafts,speakingSessions:speakingSessions.map(s=>({id:s.id,day:s.day,promptId:s.promptId,seconds:s.seconds})),curriculum:parsePlan(data.curriculum)};
}
export function mergeStates(current,incoming) {
  const attempts=[...new Map([...current.attempts,...incoming.attempts].map(a=>[a.id,a])).values()].toSorted((a,b)=>a.at.localeCompare(b.at));
  const speakingSessions=[...new Map([...current.speakingSessions,...incoming.speakingSessions].map(a=>[a.id,a])).values()];
  return {...emptyState(),attempts,drafts:{...incoming.drafts,...current.drafts},speakingSessions,curriculum:mergePlans(current.curriculum,incoming.curriculum)};
}
export function buildReport(state,items,day=todayISO()) {
  const current=state.attempts.filter(a=>a.day===day); const stats=sessionStats(state.attempts,day);
  const lines=[`דוח תרגול יפנית — ${day}`,`ניסיונות היום: ${stats.total}; תשובות נכונות: ${stats.correct}; הפקות עצמאיות בלי רמז: ${stats.independent}.`,''];
  for(const a of current)lines.push(`${a.itemId} | ${a.questionId} | ${a.answer} | ${a.correct?'נכון':'טעון תיקון'} | ${a.type} | ${a.hinted||a.revealed||!a.firstTry?'אחרי עזרה/משוב':'ללא עזרה'}`);
  for(const [key,value]of Object.entries(state.drafts))if(value.trim())lines.push('',`טיוטה: ${key}`,value);
  for(const item of items){const p=progressFor(item.id,state.attempts,day);if(p.total)lines.push(`${item.id}: ${p.total} ניסיונות, ${p.independent} הצלחות עצמאיות מאז הטעות האחרונה, מצב ${p.status}.`);}
  lines.push('','נא לעדכן את מחברת הלמידה, לבדוק את ההפקה החופשית ולהתאים את התרגול הבא. טיוטות אינן נחשבות תשובות שנבדקו.');
  return lines.join('\n');
}

/** Complete portable Markdown handoff; no state mutation or automatic grading of drafts. */
export function buildMarkdownReport(state,items,options={}) {
  const day=options.day??todayISO();
  const exportedAt=options.exportedAt??new Date().toISOString();
  const prompts=[...(options.diagnosticPrompts??[]),...(options.speakingPrompts??[]).map(p=>({...p,id:'speaking-'+p.id}))];
  const names=new Map(prompts.map(p=>[p.id,p]));
  const block=text=>{const value=String(text??'');const runs=value.match(/`+/g)??[];const fence='`'.repeat(Math.max(3,...runs.map(x=>x.length+1)));return fence+'text\n'+value+'\n'+fence;};
  const stats=sessionStats(state.attempts,day);
  const lines=['# דוח מפגש — לימודי יפנית','', 'יום לימוד (שעון ישראל): '+day,'נוצר: '+exportedAt,'',options.qaMode?'**דוח בדיקה — אינו ביצוע של כפיר.**':'דוח אישי מהדפדפן; אין סנכרון אוטומטי לשיחה.','',
    '## תמונת מצב','', 'ניסיונות היום: '+stats.total+'; נכונים: '+stats.correct+'; הפקות עצמאיות ללא רמז: '+stats.independent+'.',
    'הקובץ כולל את כל התשובות השמורות, את כל ניסיונות התרגול ואת רישומי הדיבור. טיוטות אינן נחשבות תשובות שנבדקו.','',
    '## תשובות וטיוטות לבדיקה',''];
  const entries=Object.entries(state.drafts).filter(([,v])=>v.trim());
  if(!entries.length)lines.push('אין טיוטות שמורות.');
  for(const [id,value]of entries){
    const p=names.get(id);
    lines.push('### '+(p?.title??id),'', 'מזהה משימה: '+id, 'מצב: טיוטה — ממתינה למשוב אנושי.',
      ...(p?.prompt?['','המשימה: '+p.prompt]:[]),'',block(value),'');
  }
  lines.push('## כל ניסיונות התרגול','');
  if(!state.attempts.length)lines.push('אין ניסיונות שמורים.');
  for(const a of [...state.attempts].sort((a,b)=>a.at.localeCompare(b.at))){
    const independent=a.correct&&a.firstTry&&!a.hinted&&!a.revealed&&a.type==='production';
    lines.push('### '+a.itemId+' · '+a.questionId,'',
      'מזהה ניסיון: '+a.id,'מועד: '+a.at+'; יום בישראל: '+a.day,
      'הקשר: '+a.context+'; סוג: '+a.type,
      'תוצאה: '+(a.correct?'נכון':'טעון תיקון')+'; רמז: '+a.hinted+'; הוצג פתרון: '+a.revealed+'; ניסיון ראשון: '+a.firstTry,
      'הפקה עצמאית נכונה: '+independent,'',block(a.answer),'');
  }
  lines.push('## מצב נקודות המעקב','');
  for(const item of items){const p=progressFor(item.id,state.attempts,day);if(p.total)lines.push('- '+item.id+' — '+item.title+': '+p.total+' ניסיונות; '+p.independent+' הצלחות עצמאיות מאז הטעות האחרונה; מצב '+p.status+'; חזרה '+p.nextReview+'.');}
  lines.push('','## רישומי דיבור','', 'רישום זמן אינו מעיד על איכות דיבור או הגייה.');
  for(const s of state.speakingSessions??[])lines.push('- '+s.day+' | '+s.promptId+' | '+s.seconds+' שניות | מזהה '+s.id);
  lines.push('','## בקשה למשוב','', 'נא לבדוק את ההפקה החופשית, לתת משוב ולעדכן את מחברת הלמידה בלי לספור שוב מזהי ניסיונות שכבר נקלטו. אין להסיק שליטה מהצגת פתרון או מטיוטה שטרם נבדקה.');
  return lines.join('\n')+'\n'+planReport(state.curriculum);
}
