// Self-reported completion is deliberately separate from assessed JP mastery.
const taskId=/^w(0[1-9]|1[0-9])-d[0-6]-(grammar|words|kanji|input|speaking|meeting)$/;
const milestoneId=/^m0[1-7]$/;
const timestamp=s=>typeof s==='string'&&s.length<40&&!Number.isNaN(Date.parse(s));
export const emptyPlan=()=>({tasks:{},milestones:{}});
export function parsePlan(value){
  if(value==null)return emptyPlan();
  if(typeof value!=='object'||Array.isArray(value))throw new Error('נתוני התוכנית אינם תקינים.');
  const out=emptyPlan();
  for(const [id,v] of Object.entries(value.tasks??{})){
    if(!taskId.test(id)||!v||typeof v.done!=='boolean'||!timestamp(v.at))throw new Error('רישום משימת לימוד אינו תקין.');
    out.tasks[id]={done:v.done,at:v.at};
  }
  for(const [id,v] of Object.entries(value.milestones??{})){
    if(!milestoneId.test(id)||!v||!['planned','practising','selfchecked'].includes(v.status)||typeof v.notes!=='string'||v.notes.length>3000||!timestamp(v.at))throw new Error('רישום אבן דרך אינו תקין.');
    out.milestones[id]={status:v.status,notes:v.notes,at:v.at};
  }
  return out;
}
export function mergePlans(current,incoming){
  const a=parsePlan(current),b=parsePlan(incoming),out=emptyPlan();
  for(const group of ['tasks','milestones'])for(const id of new Set([...Object.keys(a[group]),...Object.keys(b[group])])){
    const x=a[group][id],y=b[group][id];out[group][id]=!x?y:!y?x:x.at>=y.at?x:y;
  }
  return out;
}
export function tasksForDay(week,day){return day.offset===1?[{id:`${week.id}-d1-meeting`,kind:'meeting',label:'מפגש שיחה',minutes:90}]:[
  {kind:'words',label:'מילים וצירופים',minutes:10},{kind:'kanji',label:'קנג׳י בתוך מילים',minutes:5},
  {kind:'grammar',label:'דקדוק והפקה',minutes:15},{kind:'input',label:'קריאה / האזנה',minutes:8},
  {kind:'speaking',label:'שיחה בקול',minutes:15}
].map(t=>({...t,id:`${week.id}-d${day.offset}-${t.kind}`}));}
export function completion(weeks,plan){const ids=weeks.flatMap(w=>w.days.flatMap(d=>tasksForDay(w,d).map(t=>t.id)));const done=ids.filter(id=>plan?.tasks?.[id]?.done).length;return {done,total:ids.length,percent:ids.length?Math.round(done/ids.length*100):0};}
export function nextTask(weeks,plan,today){
  const pending=w=>w.days.flatMap(d=>tasksForDay(w,d).map(t=>({...t,date:d.date,week:w.week,topic:d.topic}))).find(t=>!plan?.tasks?.[t.id]?.done);
  const current=weeks.find(w=>w.start<=today&&today<=w.end);
  // Dates suggest where to look; they never complete work or conceal unfinished weeks.
  return (current&&pending(current))||weeks.map(pending).find(Boolean)||null;
}
export function planReport(plan){const p=parsePlan(plan);const statuses={planned:'מתוכנן',practising:'בתרגול',selfchecked:'ניסיתי — דיווח עצמי'};const rows=['','## תוכנית הלימודים — דיווח עצמי','', 'סימון ביצוע אינו שליטה מאומתת. רישומי שיחה אינם הערכת הגייה.'];
 for(const [id,v]of Object.entries(p.tasks).sort(([a],[b])=>a.localeCompare(b)))rows.push('- '+id+' | '+(v.done?'בוצע לפי דיווח עצמי':'טרם בוצע / הסימון בוטל')+' | '+v.at);
 for(const [id,v]of Object.entries(p.milestones).sort(([a],[b])=>a.localeCompare(b))){rows.push('','### אבן דרך '+id, statuses[v.status]+' | '+v.at);rows.push(...v.notes.split('\n').map(line=>'> '+line));}
 return rows.join('\n')+'\n';}
