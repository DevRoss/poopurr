import { summarizeCoverage } from './coverage.mjs';
import { env } from 'cloudflare:workers';
import { and, eq, gte, lt, desc, isNull, sql } from 'drizzle-orm';
import { getDb } from '../db';
import { accounts, events } from '../db/schema';
import { login, roster, records, PetkitError, type Session } from './petkit';
import { syncRange, nextDay, cachedDay } from './sync-plan.mjs';
import { analyzeBehavior, annotateEvents } from './behavior.mjs';
import { normalize, mergeEvents, summarize, bounds, dayAt, validDay } from './records.mjs';

export function safeError(e:unknown){
  if(e instanceof PetkitError){if(e.code==='session_expired')return 'PETKIT 会话已过期，请在网页重新连接。';
    if(e.code==='request_configuration_error')return '服务端请求配置异常，尚未向 PETKIT 发送请求。请联系维护者修复。';
    if(e.code==='network_timeout')return 'PETKIT 云端响应超时，请稍后重试。已有记录保留。';
    if(e.code==='upstream_redirect_blocked')return 'PETKIT 接口返回了未预期的重定向，插件已停止请求以保护账号信息。';
    if(e.code==='network_error')return '暂时无法连接 PETKIT 云端；已有记录保留，本次没有完成同步。';
    return 'PETKIT 返回错误：'+e.code+'。请检查账号地区、密码或稍后重试。';}
  return '请求未完成。请检查输入或稍后重试；本次不能据此判断猫咪没有如厕。';
}
async function key(){
  const value=(env as unknown as Record<string,string>).PETKIT_SESSION_KEY;
  if(!value || !/^[a-f0-9]{64}$/.test(value))throw new Error('Session key unavailable');
  return crypto.subtle.importKey('raw',Uint8Array.from(value.match(/../g)!.map(x=>parseInt(x,16))),{name:'AES-GCM'},false,['encrypt','decrypt']);
}
async function seal(value:Session,user:string){const iv=crypto.getRandomValues(new Uint8Array(12));const encoded=new TextEncoder();
  const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoded.encode(user)},await key(),encoded.encode(JSON.stringify(value)));
  return Buffer.from(iv).toString('base64')+'.'+Buffer.from(data).toString('base64');}
async function unseal(value:string,user:string):Promise<Session>{const [iv,data]=value.split('.');
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(iv,'base64'),additionalData:new TextEncoder().encode(user)},await key(),Buffer.from(data,'base64'));
  return JSON.parse(new TextDecoder().decode(plain));}
async function account(user:string){return (await getDb().select().from(accounts).where(eq(accounts.userId,user)).limit(1))[0];}
export async function connect(user:string,input:any){
  const {username,password,region='CN'}=input;
  if(typeof username!=='string'||!username.trim()||username.length>200||typeof password!=='string'||!password||password.length>128||typeof region!=='string'||region.length>60)throw new Error('Invalid credentials');
  const session=await login(username.trim(),password,region), data=await roster(session);
  const db=getDb(), previous=await account(user);
  if(previous?.session){const old=await unseal(previous.session,user);if(old.accountFingerprint!==session.accountFingerprint)throw new PetkitError('different_account_not_supported');}
  const encrypted=await seal(session,user);
  await db.insert(accounts).values({userId:user,session:encrypted,status:'connected',connectedAt:Date.now(),devices:JSON.stringify(data.devices),pets:JSON.stringify(data.pets)}).onConflictDoUpdate({target:accounts.userId,set:{session:encrypted,status:'connected',devices:JSON.stringify(data.devices),pets:JSON.stringify(data.pets)}});
  return status(user);
}
export async function disconnect(user:string){
  // Locally disables future sync; encrypted account identity retained with history.
  const a=await account(user);if(a?.session){const session=await unseal(a.session,user);session.token='';session.expires=0;await getDb().update(accounts).set({status:'disconnected',session:await seal(session,user)}).where(eq(accounts.userId,user));}
  return {disconnected:true,records_retained:true};
}
export async function status(user:string){
  const a=await account(user);if(!a)return {connected:false,status:'not_connected',devices:[],pets:[],last_successful_sync:null,stale:true,coverage:[],timezone:'Asia/Shanghai'};
  let expired=false;if(a.session&&a.status!=='disconnected'){try{expired=(await unseal(a.session,user)).expires<=Date.now();}catch{expired=true;}}
  return {connected:!!a.session&&!expired&&a.status!=='disconnected',status:expired?'session_expired':a.status,devices:JSON.parse(a.devices),pets:JSON.parse(a.pets),last_successful_sync:a.lastSync,stale:!a.lastSync||Date.now()-a.lastSync>15*60000||a.status!=='synced',coverage:JSON.parse(a.coverage),timezone:'Asia/Shanghai',sync_mode:'on_demand',hardware_verified:false};
}
export async function sync(user:string,args:any={}){
  const range=syncRange(typeof args==='string'?{date:args}:args);
  let date=range.start;
  const a=await account(user);if(!a?.session||a.status==='disconnected')throw new PetkitError('session_expired');
  const db=getDb(), now=Date.now();
  if(a.status==='syncing'&&a.lastAttempt&&now-a.lastAttempt<300000)return {...await status(user),retry_after_seconds:3,next_start_date:date,end_date_exclusive:range.end};
  const previousCoverage=JSON.parse(a.coverage),previousDevices=JSON.parse(a.devices);
  while(date<range.end&&cachedDay(previousCoverage,previousDevices,date))date=nextDay(date);
  if(date>=range.end)return {...await status(user),new_events:0,failures:[],next_start_date:null,end_date_exclusive:range.end,cached:true};
  // Atomic lease across Worker isolates; different historical days do not hit a per-day cooldown.
  const claim=await db.update(accounts).set({lastAttempt:now,status:'syncing'}).where(and(eq(accounts.userId,user),eq(accounts.status,a.status),a.lastAttempt===null?isNull(accounts.lastAttempt):eq(accounts.lastAttempt,a.lastAttempt))).returning();
  if(!claim.length)return {...await status(user),retry_after_seconds:3,next_start_date:date,end_date_exclusive:range.end};
  let success=0, inserted=0;const failures:any[]=[],coverage:any[]=[];
  try {
    const session=await unseal(a.session,user), data=previousDevices.length?{devices:previousDevices,pets:JSON.parse(a.pets)}:await roster(session);
    for(const device of data.devices.slice(0,10)){
      try{
        const response=await records(session,device,date), normalized=new Map<string,any>();
        const rawByEvent=new Map(response.data.filter((r:any)=>r.eventId).map((r:any)=>[String(r.eventId),r]));
        for(const r of response.data){if(r.relatedEvent&&rawByEvent.has(String(r.relatedEvent))){const parent:any=rawByEvent.get(String(r.relatedEvent));parent.subContent=[...(parent.subContent??[]),...(r.subContent??[])];}}
        for(const [source,rows] of [['record',response.data],['graph',response.graph]] as const){
          for(const raw of rows){const n=normalize(raw,device,source);if(!n||n.day!==date)continue;
            normalized.set(n.key,mergeEvents(normalized.get(n.key),n));}
        }
        // Safety limit is surfaced as partial coverage, never interpreted as a full day.
        const safe=[...normalized.values()].slice(0,500);
        for(const n of safe){
          const old=(await db.select().from(events).where(and(eq(events.userId,user),eq(events.key,n.key))).limit(1))[0];
          const merged=mergeEvents(old?JSON.parse(old.payload):null,n);
          await db.insert(events).values({userId:user,key:n.key,deviceId:n.device_id,occurredAt:n.timestamp,petId:merged.pet_id,payload:JSON.stringify(merged)}).onConflictDoUpdate({target:[events.userId,events.key],set:{petId:merged.pet_id,occurredAt:merged.timestamp,payload:sql`json_patch(${JSON.stringify(merged)}, json_object('user_label', json_extract(${events.payload}, '$.user_label'), 'label_updated_at', json_extract(${events.payload}, '$.label_updated_at')))`}});
          if(!old)inserted++;
        }
        if(response.partial||response.graphFailed||normalized.size>500)failures.push({device_id:device.id,error:'该日仅取回部分记录，已保存成功部分。'});
        success++;coverage.push({device_id:device.id,requested_day:date,fetched_at:now,mode:response.camera?'timestamp_day':'requested_day',fetch_succeeded:!response.graphFailed&&!response.partial&&normalized.size<=500,complete:false,observed_events:safe.length,graph_failed:response.graphFailed,note:response.camera?'按目标日时间戳读取；分页与保留范围仍受上游限制。':'已按日期读取；设备漏报和云端保留范围无法保证。'});
      }catch(e){if(e instanceof PetkitError&&['session_expired','network_error','network_timeout','rate_limited'].includes(e.code))throw e;failures.push({device_id:device.id,error:safeError(e)});}
    }
    if(data.devices.length>10)failures.push({error:'仅同步前 10 台设备。'});
    const updatedCoverage=[...JSON.parse(a.coverage),...coverage].slice(-400);
    await db.update(accounts).set({status:failures.length?'partial':data.devices.length?'synced':'no_devices',lastSync:success?now:a.lastSync,devices:JSON.stringify(data.devices),pets:JSON.stringify(data.pets),coverage:JSON.stringify(updatedCoverage)}).where(eq(accounts.userId,user));
  } catch(e){await db.update(accounts).set({status:e instanceof PetkitError&&e.code==='session_expired'?'session_expired':'sync_failed'}).where(eq(accounts.userId,user));throw e;}
  return {...await status(user),new_events:inserted,failures,processed_day:date,next_start_date:nextDay(date)<range.end?nextDay(date):null,end_date_exclusive:range.end};
}
export async function eventRows(user:string,start:string,end:string,petId?:string,deviceId?:string){
  const [a,b]=bounds(start,end),clauses=[eq(events.userId,user),gte(events.occurredAt,a),lt(events.occurredAt,b)];
  if(petId&&petId!=='unknown')clauses.push(eq(events.petId,petId));if(deviceId)clauses.push(eq(events.deviceId,deviceId));
  const rows=await getDb().select().from(events).where(and(...clauses)).orderBy(desc(events.occurredAt)).limit(5001);
  return {rows:rows.slice(0,5000).map(r=>JSON.parse(r.payload)).filter(r=>petId!=='unknown'||r.pet_id===null),truncated:rows.length>5000};
}
export async function runTool(user:string,name:string,args:any={}){
  if(name==='get_connection_status')return status(user);
  if(name==='list_litter_boxes')return {devices:(await status(user)).devices};
  if(name==='list_cats')return {cats:(await status(user)).pets,unknown_records_are_not_assigned:true};
  if(name==='sync_litter_records')return sync(user,args);
  const start=args.start_date??dayAt(Date.now()-6*86400000),end=args.end_date??dayAt(Date.now()+86400000);
  const {rows:rawRows,truncated}=await eventRows(user,start,end,args.pet_id,args.device_id);
  const info=await status(user);
  const rows=annotateEvents(rawRows);
  const meta={start_date:start,end_date_exclusive:end,timezone:'Asia/Shanghai',last_successful_sync:info.last_successful_sync,stale:info.stale,coverage:info.coverage,coverage_summary:summarizeCoverage(info.coverage,info.devices,start,end,args.device_id??null),truncated,limitations:['如厕不等于排便；classification 为单独的设备/人工/时长推测结果，不能混为确认次数。','没有记录不代表 0 次；未覆盖日期不补零。','宠物归属沿用上游识别，不按体重猜测。','体重只保留原始值，单位未实机核实。','按需同步，未启用后台轮询或推送。']};
  if(name==='get_behavior_analysis')return {...meta,...analyzeBehavior(rawRows,info.pets,start,end,info.coverage)};
  if(name==='get_toilet_events'){
    const offset=Number(args.offset??0),limit=Number(args.limit??50);
    if(!Number.isInteger(offset)||offset<0||offset>5000||!Number.isInteger(limit)||limit<1||limit>200)throw new Error('Invalid pagination');
    return {...meta,events:rows.slice(offset,offset+limit),next_offset:offset+limit<rows.length?offset+limit:null};
  }
  if(name==='get_daily_summary'||name==='get_toilet_trends'){
    const now=Date.now();return {...meta,...(name==='get_toilet_trends'?{behavior:analyzeBehavior(rawRows,info.pets,start,end,info.coverage)}:{}),daily:summarize(rows,start,end,args.pet_id??null),last_observed_event:rows[0]??null,hours_since_last_observed_event:rows[0]?Math.round((now-rows[0].timestamp)/3600000*10)/10:null};
  }
  throw new Error('Unknown tool');
}

export async function labelEvent(user:string,key:string,label:string){
 if(typeof key!=='string'||key.length>300||!['urine','stool','both','unknown','clear'].includes(label))throw new Error('Invalid label');
 const db=getDb(),where=and(eq(events.userId,user),eq(events.key,key));
 const old=(await db.select().from(events).where(where).limit(1))[0];if(!old)throw new Error('Event not found');
 await db.update(events).set({payload:sql`json_set(${events.payload}, '$.user_label', ${label==='clear'?null:label}, '$.label_updated_at', ${Date.now()})`}).where(where);
 return {saved:true};
}
