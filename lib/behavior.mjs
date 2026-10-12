import {bounds,dayAt} from './records.mjs';
const valid = r => Number.isFinite(r.duration_seconds) && r.duration_seconds > 0;
const median = a => {if(!a.length)return null;const x=[...a].sort((a,b)=>a-b),n=x.length;return n%2?x[n>>1]:(x[n/2-1]+x[n/2])/2;};
const label = r => r.user_label ?? (r.stool_detected&&r.urine_detected?'both':r.stool_detected?'stool':r.urine_detected?'urine':null);
const log = r => Math.log(r.duration_seconds);
const nearest = (x,a,b) => Math.abs(x-a)<Math.abs(x-b)?'urine':'stool';
export function trainModels(rows){
 const grouped=new Map();
 for(const r of rows){if(!r.pet_id||!valid(r))continue;const a=grouped.get(r.pet_id)??[];a.push(r);grouped.set(r.pet_id,a);}
 const models={};
 for(const [id,rs] of grouped){
  const urine=rs.filter(r=>label(r)==='urine'),stool=rs.filter(r=>label(r)==='stool');
  const m={pet_id:id,method:'insufficient',samples:rs.length,urine_samples:urine.length,stool_samples:stool.length,accuracy:null,urine_center:null,stool_center:null,min:Math.min(...rs.map(log)),max:Math.max(...rs.map(log)),reason:'需要更多时长记录或手动标注。'};
  if(urine.length>=3&&stool.length>=3){
   const a=median(urine.map(log)),b=median(stool.map(log));
   const score=xs=>xs.filter(r=>nearest(log(r),median(urine.filter(x=>x!==r).map(log)),median(stool.filter(x=>x!==r).map(log)))===label(r)).length/xs.length;
   const acc=(score(urine)+score(stool))/2;m.accuracy=Math.round(acc*100);m.urine_center=Math.exp(a);m.stool_center=Math.exp(b);
   if(acc>=.8&&Math.abs(a-b)>=Math.log(1.3)){Object.assign(m,{method:'labeled_duration',reason:'按这只猫的已标注/设备单类阳性样本估计；仍可能混合排泄。'});}
   else m.reason='两类时长重叠明显，暂不能靠时长区分。';
  }else if(rs.length>=12){
   // Two duration clusters are an explicitly unverified hypothesis, not labels.
   const xs=rs.filter(r=>!r.user_label).map(log).sort((a,b)=>a-b);
   if(xs.length>=12){let a=xs[Math.floor(xs.length*.25)],b=xs[Math.floor(xs.length*.75)];let short=[],long=[];
    for(let i=0;i<20;i++){short=xs.filter(x=>Math.abs(x-a)<=Math.abs(x-b));long=xs.filter(x=>Math.abs(x-a)>Math.abs(x-b));if(!short.length||!long.length)break;a=median(short);b=median(long);}
    if(short.length>=3&&long.length>=3&&b-a>=Math.log(1.6))Object.assign(m,{method:'duration_clusters',urine_center:Math.exp(a),stool_center:Math.exp(b),reason:'未校准假设：短时组暂推测小便、长时组暂推测大便；也可能只是埋砂/停留差异，请手动校正。'});
    else m.reason='尚未出现两个稳定的时长组，不能自动区分大小便。';
   }
  }
  models[id]=m;
 }
 return models;
}
export function estimate(r,models){
 const known=label(r);
 if(known)return {label:known,source:r.user_label?'manual':'device',confidence:r.user_label?'user_reported':'upstream_detection',note:r.user_label?'手动标注':'设备识别；单类阳性不能排除同时发生另一类。'};
 const m=models[r.pet_id];
 const unknown=note=>({label:'unknown',source:'unknown',confidence:'none',note});
 if(!r.pet_id)return unknown('未识别猫咪，不套用其他猫的习惯。');
 if(!valid(r))return unknown('没有有效停留时长。');
 if(!m||m.method==='insufficient')return unknown(m?.reason??'样本不足。');
 const x=log(r),a=Math.log(m.urine_center),b=Math.log(m.stool_center);
 if(x<m.min-Math.log(1.5)||x>m.max+Math.log(1.5)||Math.abs(Math.abs(x-a)-Math.abs(x-b))<Math.abs(a-b)*.3)return unknown('时长在两类交界或超出参考范围。');
 return {label:nearest(x,a,b),source:m.method,confidence:m.method==='duration_clusters'?'low':'tentative',note:m.reason};
}
export function annotateEvents(rows){const models=trainModels(rows);return rows.map(r=>({...r,classification:estimate(r,models)}));}
export function analyzeBehavior(rows,pets,start,end,coverage=[]){
 const [from,to]=bounds(start,end),selected=rows.filter(r=>r.timestamp>=from&&r.timestamp<to),models=trainModels(selected);
 const days=[];for(let t=from;t<to;t+=86400000)days.push(dayAt(t));
 const ids=[...new Set([...pets.map(p=>p.id),...selected.map(r=>r.pet_id).filter(Boolean)])];
 const cats=ids.map(id=>{
  const rs=selected.filter(r=>r.pet_id===id),ds=rs.filter(valid).map(r=>r.duration_seconds),hours=Array(24).fill(0),histogram=Array(6).fill(0);
  const split={manual_urine:0,manual_stool:0,manual_both:0,device_urine:0,device_stool:0,device_both:0,estimated_urine:0,estimated_stool:0,unknown:0};
  for(const r of rs){hours[(new Date(r.timestamp+8*3600000).getUTCHours())]++;if(valid(r))histogram[[30,60,90,120,180].findIndex(x=>r.duration_seconds<x)<0?5:[30,60,90,120,180].findIndex(x=>r.duration_seconds<x)]++;
   const e=estimate(r,models);const key=e.label==='unknown'?'unknown':(e.source==='manual'||e.source==='device'?e.source:'estimated')+'_'+e.label;split[key]++;}
  const peak=hours.indexOf(Math.max(...hours));
  return {pet_id:id,name:pets.find(p=>p.id===id)?.name??rs[0]?.pet_name??'猫咪',visits:rs.length,observed_days:new Set(rs.map(r=>r.day)).size,median_duration_seconds:median(ds),valid_duration_samples:ds.length,peak_hour:rs.length?peak:null,hours,histogram,split,model:models[id]??{method:'insufficient',reason:'暂无有效时长记录。',samples:0,urine_samples:0,stool_samples:0},daily:days.map(day=>{const a=rs.filter(r=>r.day===day);return {day,visits:a.length||null,median_duration_seconds:median(a.filter(valid).map(r=>r.duration_seconds)),requested:coverage.some(c=>c.requested_day===day&&c.fetch_succeeded)};})};
 });
 return {cats,days,unknown_cat_events:selected.filter(r=>!r.pet_id).length,events:selected.map(r=>({key:r.key,pet_id:r.pet_id,timestamp:r.timestamp,day:r.day,duration_seconds:r.duration_seconds,user_label:r.user_label??null,classification:estimate(r,models)})),method_note:'停留时长包含进出、挖砂与埋砂；仅凭时长无法确定大小便。推测单独计数，不作为确认结果。模型只用当前查询范围内每只猫的数据。'};
}
