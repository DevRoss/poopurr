const date={type:'string',pattern:'^\\d{4}-\\d{2}-\\d{2}$',description:'Asia/Shanghai 日期，YYYY-MM-DD'};
const filters={start_date:date,end_date:{...date,description:'不包含此日期，最多查询 32 天'},pet_id:{type:'string',description:'来自 list_cats；unknown 查询未识别记录'},device_id:{type:'string'}};
const tool=(name,description,properties={},read=true)=>({name,description,inputSchema:{type:'object',properties,additionalProperties:false},annotations:{readOnlyHint:read,destructiveHint:false,idempotentHint:read,openWorldHint:name==='sync_litter_records'}});
export const tools=[
 tool('get_connection_status','检查 PETKIT 连接、采集新鲜度与覆盖范围。未连接时请用户在插件网站连接，绝不在聊天里索取账号密码。'),
 tool('list_litter_boxes','列出已连接账号中的猫砂盆，型号支持尚需实机验证。'),
 tool('list_cats','列出 PETKIT 猫咪档案；记录没有 pet_id 时必须保留为未识别猫。'),
 tool('sync_litter_records','同步近31天内的单日或日期范围（结束日不包含）。每次处理一天；若 next_start_date 非空，使用它作 start_date 并保留 end_date 继续调用，直到为空。retry_after_seconds 表示稍后重试。历史成功日期会复用缓存；失败必须报告。只读设备，不会启动清理。',{date,start_date:date,end_date:{...date,description:'不包含此日期；最多31天，不能和date同时使用'}},false),
 tool('get_toilet_events','查询已采集的如厕明细。stool_detected/urine_detected 为 null 代表未知，绝不能把所有如厕说成拉屎。',{...filters,offset:{type:'integer',minimum:0,maximum:5000},limit:{type:'integer',minimum:1,maximum:200}}),
 tool('get_daily_summary','按猫和日期汇总已观察到的次数、明确排便/排尿检测、时长和距最近记录时间。必须说明 stale、coverage 与缺失。',filters),
 tool('get_behavior_analysis','按猫展示时段、每日次数、时长分布与独立的大小便推测。duration_clusters 是短时小便/长时大便的未校准假设，不是确定结果；设备识别、手动标注、推测必须分开。',filters),
 tool('get_toilet_trends','返回按日趋势，可查询7或30天。缺失日期不补0，结果是观察记录，不是医学诊断。',filters),
];
export async function rpc(body,user,invoke){
 if(!body||Array.isArray(body)||body.jsonrpc!=='2.0'||typeof body.method!=='string')return {status:400,body:{jsonrpc:'2.0',id:null,error:{code:-32600,message:'Invalid Request'}}};
 const id=body.id??null,result=x=>({status:200,body:{jsonrpc:'2.0',id,result:x}});
 if(body.method.startsWith('notifications/'))return {status:202,body:null};
 if(body.method==='initialize')return result({protocolVersion:['2025-11-25','2025-06-18','2025-03-26','2024-11-05'].includes(body.params?.protocolVersion)?body.params.protocolVersion:'2025-03-26',capabilities:{tools:{listChanged:false}},serverInfo:{name:'poopurr',version:'0.2.0'},instructions:'只读猫砂盆监控。先检查连接与新鲜度。如厕记录不等于排便；null是未知。数据不足不得诊断。通过插件网站连接账号，不在聊天里收集凭据。'});
 if(body.method==='ping')return result({});
 if(body.method==='tools/list')return result({tools});
 if(body.method==='tools/call'){
  if(!user)return {status:401,body:{jsonrpc:'2.0',id,error:{code:-32001,message:'Authentication required'}}};
  const t=tools.find(t=>t.name===body.params?.name);if(!t)return {status:200,body:{jsonrpc:'2.0',id,error:{code:-32602,message:'Unknown tool'}}};
  const args=body.params.arguments??{};
  if(typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(k=>!Object.hasOwn(t.inputSchema.properties,k)))return {status:200,body:{jsonrpc:'2.0',id,error:{code:-32602,message:'Invalid arguments'}}};
  for(const [k,v] of Object.entries(args)){
   const schema=t.inputSchema.properties[k];
   if((schema.type==='string' && (typeof v!=='string'||v.length>100))||(schema.type==='integer' && (!Number.isInteger(v)||v<schema.minimum||v>schema.maximum)))return {status:200,body:{jsonrpc:'2.0',id,error:{code:-32602,message:'Invalid argument type'}}};
  }
  try{const data=await invoke(user,t.name,args);return result({content:[{type:'text',text:JSON.stringify(data)}],structuredContent:data});}
  catch{return result({isError:true,content:[{type:'text',text:'请求未完成。请查看连接状态、检查日期，或在插件页面重新连接。不能将失败解释为没有如厕。'}]});}
 }
 return {status:200,body:{jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}}};
}
