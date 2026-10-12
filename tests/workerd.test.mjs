import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const {Miniflare,createFetchMock}=await import(require.resolve('miniflare',{paths:[require.resolve('wrangler')]}));
const source=await readFile(new URL('../lib/petkit.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const root=resolve('tests/.runtime');
const bootstrap=`import {post,login} from './petkit.js';
export default {async fetch(req){try{if(new URL(req.url).pathname==='/login'){const session=await login('synthetic@example.invalid','synthetic-password','CN');return Response.json({hasSession:!!session.token});}
return Response.json({result:await post('https://api.petkit.cn/6/test')});}catch(e){return Response.json({code:e.code??e.name});}}};`;
function runtime(fetchMock,outboundService){return new Miniflare({compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],modulesRoot:root,modules:[{type:'ESModule',path:resolve(root,'worker.js'),contents:bootstrap},{type:'ESModule',path:resolve(root,'petkit.js'),contents:compiled},{type:'ESModule',path:resolve(root,'records.mjs'),contents:records}],fetchMock,outboundService});}
const records=await readFile(new URL('../lib/records.mjs',import.meta.url),'utf8');
test('real workerd runtime creates and sends PETKIT login request',async()=>{
 const mock=createFetchMock();mock.disableNetConnect();let requestBody;
 mock.get('https://api.petkit.cn').intercept({path:'/6/user/login',method:'POST'}).reply(200,opts=>{requestBody=opts.body;return JSON.stringify({result:{session:{id:'synthetic-session',expiresIn:600}}});},{headers:{'content-type':'application/json'}});
 const mf=runtime(mock);try{const result=await(await mf.dispatchFetch('http://localhost/login')).json();assert.deepEqual(result,{hasSession:true});assert.ok(!String(requestBody).includes('synthetic-password'));mock.assertNoPendingInterceptors();}finally{await mf.dispose();}
});
test('real workerd runtime blocks redirects without forwarding the request',async()=>{
 let requests=0;
 const mf=runtime(undefined,async req=>{requests++;assert.equal(new URL(req.url).hostname,'api.petkit.cn');return new Response('',{status:302,headers:{location:'https://not-petkit.invalid/collect'}});});
 try{assert.deepEqual(await(await mf.dispatchFetch('http://localhost')).json(),{code:'upstream_redirect_blocked'});assert.equal(requests,1);}finally{await mf.dispose();}
});
