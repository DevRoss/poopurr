import { createHash } from 'node:crypto';
import { dayAt, asObject, validDay } from './records.mjs';
export type Session = {token:string; base:string; expires:number; region:string; accountFingerprint:string};
const BASES = ['https://api.petkit.cn/6/','https://api.eu-pet.com/latest/','https://api.petkt.com/latest/','https://api.petktasia.com/latest/','https://api-ru.petkit.cn/latest/'];
const headers = {'Accept':'*/*','Content-Type':'application/x-www-form-urlencoded','User-Agent':'okhttp/3.14.9','X-Img-Version':'1','X-Locale':'en-US','X-Client':'android(16.1;23127PN0CG)','X-Hour':'24','X-Api-Version':'13.2.1','X-TimezoneId':'Asia/Shanghai','X-Timezone':'8.0'};
export class PetkitError extends Error { constructor(public code:string){super(code);} }
export async function post(url:string,data:Record<string,unknown>={},session?:Session):Promise<any>{
  for(let attempt=0;attempt<2;attempt++){
    let response:Response, request:Request;
    // workerd rejects redirect:'error' before any outbound request. Manual mode
    // preserves the original no-redirect policy without forwarding credentials.
    try {request=new Request(url,{method:'POST',redirect:'manual',headers:{...headers,...(session?{'X-Session':session.token,'F-Session':session.token}:{})},body:new URLSearchParams(Object.entries(data).map(([k,v])=>[k,String(v)])),signal:AbortSignal.timeout(12000)});}
    catch {throw new PetkitError('request_configuration_error');}
    try {response=await fetch(request);}
    catch (e){const name=e instanceof Error?e.name:'';const code=name==='TimeoutError'||name==='AbortError'?'network_timeout':'network_error';
      console.error(JSON.stringify({event:'petkit_transport_failure',code,endpoint:new URL(url).pathname}));
      throw new PetkitError(code);}
    if(response.status>=300&&response.status<400)throw new PetkitError('upstream_redirect_blocked');
    if(response.status===429)throw new PetkitError('rate_limited');
    if(!response.ok)throw new PetkitError('upstream_http_error');
    let body:any;try{body=await response.json();}catch{throw new PetkitError('invalid_response');}
    if(body.error){const code=Number(body.error.code);if((code===1||code===99)&&attempt===0){await new Promise(r=>setTimeout(r,500));continue;}
      throw new PetkitError(code===5?'session_expired':'petkit_error_'+code);}
    if(!Object.hasOwn(body,'result'))throw new PetkitError('invalid_response');
    return body.result;
  }
  throw new PetkitError('upstream_busy');
}
export async function login(username:string,password:string,region:string):Promise<Session>{
  let base:string, regionId:string;
  if(region==='CN'||region==='China'){base=BASES[0];regionId='cn';}
  else {const regions=await post('https://passport.petkt.com/6/account/regionservers');const match=regions.list?.find((r:any)=>r.name===region||String(r.id).toLowerCase()===region.toLowerCase());
    if(!match||!BASES.includes(match.gateway))throw new PetkitError('unsupported_region');base=match.gateway;regionId=String(match.id).toLowerCase();}
  const client={locale:'en-US',name:'23127PN0CG',osVersion:'16.1',phoneBrand:'Xiaomi',platform:'android',source:'app.petkit-android',version:'13.2.1',timezoneId:'Asia/Shanghai',timezone:'8.0'};
  const result=await post(base+'user/login',{username,password:createHash('md5').update(password).digest('hex'),encrypt:'1',region:regionId,oldVersion:'13.2.1',client:'{'+Object.entries(client).map(([k,v])=>`'${k}': '${v}'`).join(', ')+'}'});
  if(typeof result.session?.id!=='string')throw new PetkitError('invalid_login_response');
  return {base,region,accountFingerprint:createHash('sha256').update(regionId+':'+username.toLowerCase()).digest('hex'),token:result.session.id,expires:Date.now()+(Number(result.session.expiresIn)||86400)*1000};
}
export async function query(session:Session,path:string,data:Record<string,unknown>={}){
  if(!BASES.includes(session.base))throw new PetkitError('unsupported_region');
  if(Date.now()>=session.expires)throw new PetkitError('session_expired');
  return post(session.base+path,data,session);
}
export async function roster(session:Session){
  const groups=await query(session,'group/family/list');
  if(!Array.isArray(groups))throw new PetkitError('invalid_family_response');
  const devices=new Map<string,any>(),pets=new Map<string,any>();
  for(const group of groups.slice(0,20)){
    const data=await query(session,'discovery/device_roster_v2',{day:dayAt().replaceAll('-',''),groupId:group.groupId});
    for(const d of [...(group.deviceList??[]),...(data.devices??[])]){
      const type=String(d.deviceType??d.type).toLowerCase(),id=d.deviceId??d.id;
      if(!['t3','t4','t5','t6','t7'].includes(type)||id==null)continue;
      devices.set(String(id),{id:String(id),type,typeCode:d.typeCode??0,name:String(d.deviceName??d.name??('猫砂盆 '+type.toUpperCase())).slice(0,100),camera:['t5','t6','t7'].includes(type),verified_on_hardware:false});
    }
    for(const p of group.petList??[]){const id=p.petId??p.id;if(id!=null)pets.set(String(id),{id:String(id),name:String(p.petName??p.name??'猫咪').slice(0,100)});}
  }
  return {devices:[...devices.values()],pets:[...pets.values()]};
}
export function listPayload(result:any):any[]{
  if(Array.isArray(result))return result;
  if(result&&Array.isArray(result.list))return result.list;
  throw new PetkitError('unrecognized_record_format');
}
export async function records(session:Session,device:any,date:string){
  validDay(date);
  const camera=['t5','t6','t7'].includes(device.type);
  const endpoint=['t5','t6'].includes(device.type)?'getDeviceRecordRelease':'getDeviceRecord';
  if(!camera){const data=listPayload(await query(session,device.type+'/'+endpoint,{deviceId:device.id,[device.type==='t3'?'day':'date']:Number(date.replaceAll('-',''))}));return {data,graph:[],camera:false,graphFailed:false,partial:false};}
  const start=Date.parse(date+'T00:00:00+08:00')/1000,end=start+86400;
  const initial=Math.min(Math.floor(Date.now()/1000),end-1);
  async function pages(path:string,withType:boolean){
    const rows:any[]=[],seen=new Set<string>();let cursor=initial;
    for(let page=0;page<4;page++){
      const batch=listPayload(await query(session,device.type+'/'+path,{deviceId:device.id,...(withType?{type:device.typeCode}:{}),timestamp:cursor}));
      if(!batch.length)return {rows,partial:false};
      const times=batch.map(r=>Number(r.timestamp??r.time??asObject(r.content).timeOut??asObject(r.content).timeIn)).filter(t=>Number.isFinite(t)&&t>946684800);
      const signature=JSON.stringify(batch.map(r=>[r.eventId,r.timestamp,r.time,r.content]));
      if(seen.has(signature)||!times.length||Math.min(...times)>cursor)return {rows,partial:true};
      seen.add(signature);rows.push(...batch);
      const oldest=Math.min(...times);if(oldest<start)return {rows,partial:false};
      cursor=oldest-1;
    }
    return {rows,partial:true};
  }
  const data=await pages(endpoint,true);let graph={rows:[] as any[],partial:true},graphFailed=false;
  try{graph=await pages('getPetOutGraph',false);}catch{graphFailed=true;}
  return {data:data.rows,graph:graph.rows,camera,graphFailed,partial:data.partial||graph.partial};
}
