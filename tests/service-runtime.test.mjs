import {createRuntime} from './runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {dayAt} from '../lib/records.mjs';
import {nextDay} from '../lib/sync-plan.mjs';
const require=createRequire(import.meta.url);
const paths=[require.resolve('wrangler')];

const {build}=await import(require.resolve('esbuild',{paths}));
const output=await build({stdin:{contents:`import {connect,runTool,labelEvent} from './lib/service';export default {async fetch(r){const {user='u',action,args={}}=await r.json();try{return Response.json(action==='connect'?await connect(user,{username:'synthetic',password:'test',region:'CN'}):action==='label'?await labelEvent(user,args.key,args.label):await runTool(user,action,args));}catch(e){return Response.json({error:e.message},{status:400});}}};`,resolveDir:resolve('.')},bundle:true,write:false,format:'esm',platform:'node',external:['cloudflare:workers'],target:'es2022'});
test('D1 history backfill, continuation, deduplication, labeling and owner isolation',async()=>{
 let dates=[];const mf=createRuntime({script:output.outputFiles[0].text,modules:true,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'test'},bindings:{PETKIT_SESSION_KEY:'ab'.repeat(32)},outboundService:async req=>{
  const path=new URL(req.url).pathname,p=new URLSearchParams(await req.text());let result;
  if(path.endsWith('user/login'))result={session:{id:'test-token',expiresIn:86400}};
  else if(path.endsWith('group/family/list'))result=[{groupId:'g',deviceList:[{deviceId:'1',deviceType:'t4'}],petList:[{petId:1,petName:'A'},{petId:2,petName:'B'}]}];
  else if(path.endsWith('discovery/device_roster_v2'))result={devices:[]};
  else if(path.endsWith('getDeviceRecord')){const date=p.get('date');dates.push(date);const day=date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6),t=Date.parse(day+'T12:00:00+08:00')/1000;result=[{eventId:date,petId:1,timestamp:t,content:{timeIn:t-40,timeOut:t}}];}
  else throw new Error('unexpected endpoint '+path);
  return Response.json({result});
 }});
 const call=async(action,args={},user='u')=>{const r=await mf.dispatchFetch('http://localhost',{method:'POST',body:JSON.stringify({action,args,user})});const body=await r.json();if(!r.ok)throw new Error(body.error);return body;};
 try{
  const db=await mf.getD1Database('DB');const sql=await readFile('drizzle/0000_initial.sql','utf8');for(const s of sql.split('--> statement-breakpoint'))await db.prepare(s).run();
  await call('connect');const yesterday=dayAt(Date.now()-86400000),today=nextDay(yesterday),end=nextDay(today);
  const first=await call('sync_litter_records',{start_date:yesterday,end_date:end});assert.equal(first.new_events,1);assert.equal(first.next_start_date,today);
  const second=await call('sync_litter_records',{start_date:first.next_start_date,end_date:end});assert.equal(second.new_events,1);assert.equal(second.next_start_date,null);assert.equal(second.retry_after_seconds,undefined);
  let result=await call('get_toilet_events',{start_date:yesterday,end_date:end});assert.equal(result.events.length,2);assert.notEqual(dates[0],dates[1]);
  assert.equal(result.coverage_summary.days.length,2);assert.equal(result.coverage_summary.complete,false);assert.equal(result.coverage_summary.days[0].state,'fetched');assert.ok(result.coverage_summary.needs_review_dates.includes(today));
  const isolated=await call('get_toilet_events',{start_date:yesterday,end_date:end},'other');assert.equal(isolated.coverage_summary.days[0].state,'unknown_devices');
  const filtered=await call('get_toilet_events',{start_date:yesterday,end_date:end,device_id:'absent'});assert.equal(filtered.coverage_summary.days[0].state,'not_fetched');
  const key=result.events[0].key;await assert.rejects(call('label',{key,label:'stool'},'other'),/Event not found/);await call('label',{key,label:'stool'});
  assert.equal((await call('sync_litter_records',{date:today})).new_events,0);
  result=await call('get_toilet_events',{start_date:yesterday,end_date:end});assert.equal(result.events.find(e=>e.key===key).user_label,'stool');assert.equal(result.events.find(e=>e.key===key).classification.source,'manual');
  const before=dates.length;assert.equal((await call('sync_litter_records',{date:yesterday})).cached,true);assert.equal(dates.length,before);
  const analysis=await call('get_behavior_analysis',{start_date:yesterday,end_date:end});assert.equal(analysis.cats.length,2);assert.equal(analysis.cats[0].visits,2);
  assert.equal((await call('get_toilet_events',{start_date:yesterday,end_date:end},'other')).events.length,0);
  await call('label',{key,label:'clear'});assert.equal((await call('get_toilet_events',{start_date:yesterday,end_date:end})).events.find(e=>e.key===key).user_label,null);
 }finally{await mf.dispose();}
});
