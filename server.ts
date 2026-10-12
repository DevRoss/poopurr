import {env} from 'cloudflare:workers';
import {connect,disconnect,labelEvent,runTool,safeError,status} from './lib/service';
import {rpc,tools} from './lib/mcp.mjs';
import {authenticated,configured,equalSecret,issueCookie,validOrigin} from './lib/auth.mjs';
const user='household'; // Single-household deployment; never trust caller-supplied identity headers.
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
async function body(req:Request){const reader=req.body?.getReader();let size=0,parts:Uint8Array[]=[];if(reader)for(;;){const r=await reader.read();if(r.done)break;size+=r.value.length;if(size>32768){await reader.cancel();throw new Error('oversized');}parts.push(r.value);}const all=new Uint8Array(size);let p=0;for(const x of parts){all.set(x,p);p+=x.length;}return new TextDecoder().decode(all);}
const loginHTML=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>登录猫咪如厕手账</title><style>body{font:16px system-ui;background:#f7f6f2;color:#263d36;max-width:440px;margin:12vh auto;padding:24px}input,button{box-sizing:border-box;width:100%;padding:14px;margin:12px 0;border-radius:8px;border:1px solid #ccd7c8}button{background:#496e51;color:white}p{line-height:1.8}</style><h1>猫咪如厕手账</h1><p>输入此部署的访问密钥。登录后，再连接 PETKIT 账号。此处不是小佩密码。</p><form method="post" action="/login"><label>访问密钥<input name="token" type="password" autocomplete="current-password" required></label><button>登录</button></form></html>`;
export default {async fetch(req:Request){
 const url=new URL(req.url),path=url.pathname;
 if(path==='/healthz')return json({ok:configured(env)},configured(env)?200:503);
 if(!configured(env))return json({error:'服务配置未完成，请检查密钥和 PUBLIC_ORIGIN。'},503);
 if(url.origin!==env.PUBLIC_ORIGIN)return json({error:'Host not allowed'},403);
 if(path==='/signin-with-chatgpt')return Response.redirect(url.origin+'/login',303);
 if(path==='/login'){
  if(req.method==='GET')return new Response(loginHTML,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'}});
  if(req.method!=='POST'||!validOrigin(req,env))return json({error:'Origin rejected'},403);
  try{const token=new URLSearchParams(await body(req)).get('token');if(!await equalSecret(token,env.ACCESS_TOKEN))return json({error:'访问密钥无效。'},401);
   const cookie=await issueCookie(env);return new Response(null,{status:303,headers:{Location:'/', 'Set-Cookie':`petkit_auth=${cookie}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400${url.protocol==='https:'?'; Secure':''}`,'Cache-Control':'no-store'}});
  }catch{return json({error:'Invalid request'},400);}
 }
 if(!await authenticated(req,env))return path.startsWith('/api/')||path==='/mcp'?json({code:'auth',error:'请先登录本站。'},401):Response.redirect(url.origin+'/login',303);
 if(path==='/logout'&&req.method==='POST'){if(!validOrigin(req,env))return json({error:'Origin rejected'},403);return new Response(null,{status:303,headers:{Location:'/login','Set-Cookie':'petkit_auth=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'}});}
 if(path==='/mcp'){
  if(req.method!=='POST')return new Response(null,{status:405,headers:{Allow:'POST'}});
  // MCP is bearer-only; browser sessions may not silently invoke tools cross-site.
  if(!req.headers.get('authorization')?.startsWith('Bearer ')||(req.headers.has('origin')&&!validOrigin(req,env)))return json({error:'Bearer authorization required'},403);
  try{const result=await rpc(JSON.parse(await body(req)),user,runTool);return result.body===null?new Response(null,{status:result.status}):json(result.body,result.status);}catch{return json({error:'Invalid request'},400);}
 }
 if(path==='/api/petkit'){
  if(req.method==='GET')return json(await status(user));
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!validOrigin(req,env))return json({error:'Origin rejected'},403);
  try{const input=JSON.parse(await body(req));let result;
   if(input.action==='connect')result=await connect(user,input);
   else if(input.action==='disconnect')result=await disconnect(user);
   else if(input.action==='label_event')result=await labelEvent(user,input.args?.key,input.args?.label);
   else if(tools.some(t=>t.name===input.action))result=await runTool(user,input.action,input.args??{});
   else return json({error:'Unknown action'},400);
   return json(result);
  }catch(e){return json({error:safeError(e)},400);}
 }
 if(req.method!=='GET'&&req.method!=='HEAD')return json({error:'Method not allowed'},405);
 const response=await env.ASSETS.fetch(req);const result=new Response(response.body,response);result.headers.set('Cache-Control','no-store');result.headers.set('X-Content-Type-Options','nosniff');result.headers.set('X-Frame-Options','DENY');result.headers.set('Referrer-Policy','no-referrer');return result;
}};
