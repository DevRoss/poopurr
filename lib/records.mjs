// Protocol fields cross-checked against Jezza34000/py-petkit-api (MIT).
export const ZONE = 'Asia/Shanghai';
export function dayAt(timestamp=Date.now()) {
  return new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(timestamp));
}
export function validDay(day) {
  if(typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('日期须为 YYYY-MM-DD');
  const d = new Date(day+'T00:00:00+08:00');
  if(!Number.isFinite(+d) || dayAt(+d)!==day) throw new Error('日期无效');
  return day;
}
export function bounds(start,end) {
  validDay(start); validDay(end);
  const a=Date.parse(start+'T00:00:00+08:00'), b=Date.parse(end+'T00:00:00+08:00');
  if(b<=a || b-a>32*86400000) throw new Error('查询区间须为 1–32 天，结束日期不包含当天');
  return [a,b];
}
export function asObject(value) {
  if(typeof value==='string') {try{return JSON.parse(value)||{};}catch{return {};}}
  return value && typeof value==='object' && !Array.isArray(value)?value:{};
}
const finite = v => typeof v==='number' && Number.isFinite(v);
const epoch = v => finite(v) && v>946684800 && v<4102444800 ? v*1000 : null;
export function normalize(raw, device, source='record') {
  const c=asObject(raw.content), start=epoch(c.timeIn), end=epoch(c.timeOut);
  const timestamp=end ?? epoch(raw.timestamp) ?? epoch(raw.time) ?? start;
  const kind=String(raw.enumEventType??'').toLowerCase();
  if(source==='record' && /clean|waste_check|maintenance|dump|odor/.test(kind)) return null;
  const visit=source==='graph' || (start!==null && end!==null && end>=start) || kind==='toileting';
  if(!visit || timestamp===null) return null;
  const sub=Array.isArray(raw.subContent)?raw.subContent:[];
  const signals=sub.map(x=>asObject(x.content));
  const stool=signals.some(x=>x.hardStools===1 || x.softStools===1)?true:null;
  const urine=signals.some(x=>x.urineBolus===1)?true:null;
  const id=raw.eventId!=null && String(raw.eventId)?String(raw.eventId):null;
  const key=String(device.id)+':'+(id?'event:'+id:'time:'+timestamp+':'+(start??''));
  return {key,event_id:id,device_id:String(device.id),device_name:device.name,device_type:device.type,
    pet_id:raw.petId!=null && Number(raw.petId)>0?String(raw.petId):null,
    pet_name:typeof raw.petName==='string'?raw.petName.slice(0,100):null,
    timestamp,start_at:start,end_at:end,day:dayAt(timestamp),
    duration_seconds:start!==null && end!==null && end>=start ? (end-start)/1000 : (source==='graph' && finite(raw.toiletTime) && raw.toiletTime>=0?raw.toiletTime:null),
    weight_raw:finite(c.petWeight)&&c.petWeight>0?c.petWeight:null,weight_unit:'upstream_unverified',
    stool_detected:stool,urine_detected:urine,soft_stool_detected:signals.some(x=>x.softStools===1)?true:null,
    classification_basis:signals.flatMap(x=>['hardStools','softStools','urineBolus'].filter(k=>x[k]===1)),
    source:[source],classification_note:'仅展示上游明确阳性；缺失不代表没有排便或排尿。'};
}
export function mergeEvents(previous,next) {
  if(!previous) return next;
  return {...previous,...next,pet_name:next.pet_name??previous.pet_name,
    duration_seconds:next.duration_seconds??previous.duration_seconds,
    weight_raw:next.weight_raw??previous.weight_raw,
    stool_detected:previous.stool_detected===true||next.stool_detected===true?true:null,
    urine_detected:previous.urine_detected===true||next.urine_detected===true?true:null,
    soft_stool_detected:previous.soft_stool_detected===true||next.soft_stool_detected===true?true:null,
    classification_basis:[...new Set([...previous.classification_basis,...next.classification_basis])],
    source:[...new Set([...previous.source,...next.source])]};
}
export function summarize(rows,start,end,petId=null) {
  const [a,b]=bounds(start,end); const filtered=rows.filter(x=>x.timestamp>=a&&x.timestamp<b&&(!petId||(petId==='unknown'?x.pet_id===null:x.pet_id===petId)));
  const result=new Map();
  for(const x of filtered){const key=x.day+':'+(x.pet_id??'unknown');let r=result.get(key);
    if(!r){r={day:x.day,pet_id:x.pet_id,pet_name:x.pet_name??'未识别猫咪',observed_visits:0,detected_stool:0,detected_urine:0,unclassified:0,durations:[],last_event_at:0};result.set(key,r);}
    r.observed_visits++; if(x.stool_detected)r.detected_stool++;if(x.urine_detected)r.detected_urine++;
    if(!x.stool_detected&&!x.urine_detected)r.unclassified++;if(x.duration_seconds!==null)r.durations.push(x.duration_seconds);
    r.last_event_at=Math.max(r.last_event_at,x.timestamp);
  }
  return [...result.values()].map(({durations,...r})=>({...r,mean_duration_seconds:durations.length?Math.round(durations.reduce((a,b)=>a+b,0)/durations.length):null,valid_duration_samples:durations.length})).sort((x,y)=>y.day.localeCompare(x.day));
}
