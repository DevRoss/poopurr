import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeCoverage} from '../lib/coverage.mjs';
const now=Date.parse('2026-10-30T12:00:00+08:00');
const fetch=(id,day,ok=true,time=now)=>({device_id:id,requested_day:day,fetch_succeeded:ok,fetched_at:time});
const run=(rows,devices=[{id:'a'},{id:'b'}],id=null)=>summarizeCoverage(rows,devices,'2026-10-29','2026-10-31',id,now);
test('missing devices and missing evidence never become complete or zero visits',()=>{
 assert.equal(run([],[]).days[0].state,'unknown_devices');
 assert.equal(run([]).days[0].state,'not_fetched');
 assert.equal(run([]).complete,false);
 assert.deepEqual(run([]).needs_review_dates,['2026-10-29','2026-10-30']);
});
test('all devices must be fetched after the day closes; today remains partial',()=>{
 const r=run([fetch('a','2026-10-29'),fetch('b','2026-10-29'),fetch('a','2026-10-30'),fetch('b','2026-10-30')]);
 assert.equal(r.days[0].state,'fetched');assert.equal(r.days[1].state,'partial');
 assert.equal(r.days[1].devices[0].state,'day_in_progress');assert.equal(r.complete,false);
});
test('latest evidence wins regardless of order, including partial retries',()=>{
 const r=run([fetch('a','2026-10-29',false),fetch('a','2026-10-29',true,now-1000),fetch('b','2026-10-29')]);
 assert.equal(r.days[0].devices[0].state,'partial');assert.equal(r.days[0].state,'partial');
});
test('device filtering excludes unrelated evidence; malformed and future timestamps ignored',()=>{
 const rows=[fetch('a','2026-10-29'),fetch('b','2026-10-29',true,now+1)];
 assert.equal(run(rows,undefined,'a').days[0].state,'fetched');
 assert.equal(run(rows).days[0].state,'partial');
 assert.equal(run([fetch('a','2026-10-29',true,NaN)],undefined,'a').days[0].state,'not_fetched');
 assert.equal(run(rows,undefined,'missing').days[0].state,'not_fetched');
});
test('range validation and midnight boundary are preserved',()=>{
 assert.throws(()=>summarizeCoverage([],[],'2026-02-30','2026-03-02'));
 const midnight=Date.parse('2026-10-30T00:00:00+08:00');
 assert.equal(run([fetch('a','2026-10-29',true,midnight)],undefined,'a').days[0].state,'fetched');
 assert.equal(run([fetch('a','2026-10-29',true,midnight-1)],undefined,'a').days[0].state,'partial');
});
