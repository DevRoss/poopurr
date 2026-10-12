import test from 'node:test';
import assert from 'node:assert/strict';
import {trainModels,estimate,analyzeBehavior} from '../lib/behavior.mjs';
import {syncRange,cachedDay,nextDay} from '../lib/sync-plan.mjs';
const now=Date.parse('2026-10-10T12:00:00+08:00');
const row=(duration,pet='a',label=null)=>({pet_id:pet,duration_seconds:duration,user_label:label,timestamp:now,day:'2026-10-10'});
test('range boundaries use Shanghai days and reject ambiguous/future/oversized ranges',()=>{
 assert.deepEqual(syncRange({start_date:'2026-10-04',end_date:'2026-10-11'},now),{start:'2026-10-04',end:'2026-10-11',days:7});
 assert.equal(nextDay('2026-09-30'),'2026-10-01');
 for(const a of [{date:'2026-10-09',start_date:'2026-10-08'},{start_date:'2026-09-01'},{end_date:'2026-10-12'},{date:'2026-02-30'}])assert.throws(()=>syncRange(a,now));
});
test('only recently fetched full past-day requests can be reused; today and failures never skipped',()=>{
 const c={device_id:'1',requested_day:'2026-10-09',fetched_at:now,fetch_succeeded:true};
 assert.equal(cachedDay([c],[{id:'1'}],'2026-10-09',now),true);
 assert.equal(cachedDay([c],[{id:'1'},{id:'2'}],'2026-10-09',now),false);
 assert.equal(cachedDay([{...c,fetch_succeeded:false}],[{id:'1'}],'2026-10-09',now),false);
 assert.equal(cachedDay([{...c,requested_day:'2026-10-10'}],[{id:'1'}],'2026-10-10',now),false);
 assert.equal(cachedDay([c],[{id:'1'}],'2026-10-09',now+7*3600000),false);
});
test('small sample never claims duration tells elimination type',()=>{
 const rs=[row(30),row(100)],m=trainModels(rs);assert.equal(estimate(row(30),m).label,'unknown');
});
test('unlabeled clusters are low-confidence hypotheses, unknown cats stay unknown',()=>{
 const rs=[25,28,30,32,35,36,90,95,100,105,110,115].map(x=>row(x));const m=trainModels(rs);
 assert.equal(m.a.method,'duration_clusters');assert.deepEqual([estimate(row(30),m).label,estimate(row(100),m).label],['urine','stool']);assert.equal(estimate(row(100),m).confidence,'low');
 assert.equal(estimate(row(30,null),m).label,'unknown');assert.equal(estimate(row(1000),m).label,'unknown');
});
test('cats learn separately, including inverted duration ordering',()=>{
 const rs=[20,25,30,32].map(x=>row(x,'a','urine')).concat([90,95,100,105].map(x=>row(x,'a','stool')),[20,25,30,32].map(x=>row(x,'b','stool')),[90,95,100,105].map(x=>row(x,'b','urine')));const m=trainModels(rs);
 assert.equal(estimate(row(25,'a'),m).label,'urine');assert.equal(estimate(row(25,'b'),m).label,'stool');
 assert.equal(estimate(row(25,'a','stool'),m).source,'manual');assert.equal(estimate(row(25,'a','unknown'),m).label,'unknown');
});
test('overlapping labeled durations stay unknown instead of falling back to misleading clusters',()=>{
 const rs=[30,50,100].map(x=>row(x,'a','urine')).concat([30,50,100].map(x=>row(x,'a','stool')));assert.equal(trainModels(rs).a.method,'insufficient');
});
test('device positives and manual labels remain separate, missing days never zero-filled',()=>{
 const r=row(40);r.urine_detected=true;const a=analyzeBehavior([r,row(90,'b','stool'),row(25,null)],[{id:'a',name:'A'},{id:'b',name:'B'}],'2026-10-09','2026-10-11');
 assert.equal(a.cats[0].split.device_urine,1);assert.equal(a.cats[1].split.manual_stool,1);assert.equal(a.cats[0].daily[0].visits,null);assert.equal(a.unknown_cat_events,1);assert.equal(a.cats[0].hours[12],1);
});
