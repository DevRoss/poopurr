import {bounds,dayAt} from './records.mjs';

// A successful request is evidence of a fetch, never proof of full cloud history.
export function summarizeCoverage(coverage,devices,start,end,deviceId=null,now=Date.now()) {
 const [from,to]=bounds(start,end);
 const ids=[...new Set(deviceId?[deviceId]:devices.map(d=>d.id))];
 const latest=new Map();
 for(const c of coverage){
  if(!ids.includes(c.device_id)||!Number.isFinite(c.fetched_at)||c.fetched_at>now)continue;
  const key=JSON.stringify([c.device_id,c.requested_day]),old=latest.get(key);
  if(!old||c.fetched_at>=old.fetched_at)latest.set(key,c);
 }
 const days=[];
 for(let t=from;t<to;t+=86400000){
  const day=dayAt(t),dayEnd=t+86400000;
  const perDevice=ids.map(id=>{
   const c=latest.get(JSON.stringify([id,day]));
   const state=!c?'not_fetched':c.fetch_succeeded!==true?'partial':c.fetched_at<dayEnd?'day_in_progress':'fetched';
   return {device_id:id,state,last_fetched_at:c?.fetched_at??null};
  });
  days.push({day,state:!ids.length?'unknown_devices':perDevice.every(d=>d.state==='fetched')?'fetched':perDevice.every(d=>d.state==='not_fetched')?'not_fetched':'partial',devices:perDevice});
 }
 return {days,needs_review_dates:days.filter(d=>d.state!=='fetched').map(d=>d.day),complete:false,
  note:'仅描述保留的同步证据；读取成功不保证上游完整，未读取/部分读取不代表零次。设备范围为当前设备或指定设备，不推测猫咪归属。'};
}
