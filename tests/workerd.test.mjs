import {createRuntime} from './runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import ts from 'typescript';

const source=await readFile(new URL('../lib/petkit.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
const root=resolve('tests/.runtime');
const bootstrap=`import {post,login} from './petkit.js';
export default {async fetch(req){try{if(new URL(req.url).pathname==='/login'){const session=await login('synthetic@example.invalid','synthetic-password','CN');return Response.json({hasSession:!!session.token});}
return Response.json({result:await post('https://api.petkit.cn/6/test')});}catch(e){return Response.json({code:e.code??e.name});}}};`;
function runtime(outboundService){return createRuntime({compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],modulesRoot:root,modules:[{type:'ESModule',path:resolve(root,'worker.js'),contents:bootstrap},{type:'ESModule',path:resolve(root,'petkit.js'),contents:compiled},{type:'ESModule',path:resolve(root,'records.mjs'),contents:records}],outboundService});}
const records=await readFile(new URL('../lib/records.mjs',import.meta.url),'utf8');
test('real workerd runtime creates and sends PETKIT login request',async()=>{
 let requestBody,requests=0;
 const mf=runtime(async req=>{
  requests++;
  assert.equal(req.url,'https://api.petkit.cn/6/user/login');
  assert.equal(req.method,'POST');
  requestBody=await req.text();
  return Response.json({result:{session:{id:'synthetic-session',expiresIn:600}}});
 });
 try{
  const result=await(await mf.dispatchFetch('http://localhost/login')).json();
  assert.deepEqual(result,{hasSession:true});
  assert.equal(requests,1);
  assert.ok(!String(requestBody).includes('synthetic-password'));
 }finally{await mf.dispose();}
});
test('real workerd runtime blocks redirects without forwarding the request',async()=>{
 let requests=0;
 const mf=runtime(async req=>{requests++;assert.equal(new URL(req.url).hostname,'api.petkit.cn');return new Response('',{status:302,headers:{location:'https://not-petkit.invalid/collect'}});});
 try{assert.deepEqual(await(await mf.dispatchFetch('http://localhost')).json(),{code:'upstream_redirect_blocked'});assert.equal(requests,1);}finally{await mf.dispose();}
});
