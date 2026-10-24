import {createRuntime} from './runtime.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {build} from 'esbuild';

const bundle=await build({entryPoints:['server.ts'],bundle:true,write:false,format:'esm',platform:'node',target:'es2022',external:['cloudflare:workers']});
test('portable HTTP boundary protects assets, REST, MCP and rejects forged identity / CSRF',async()=>{
 const token='test-access-'.repeat(5),origin='https://example.invalid';
 const mf=createRuntime({script:bundle.outputFiles[0].text,modules:true,compatibilityDate:'2026-05-15',compatibilityFlags:['nodejs_compat'],d1Databases:{DB:'http-test'},bindings:{ACCESS_TOKEN:token,PETKIT_SESSION_KEY:'ab'.repeat(32),PUBLIC_ORIGIN:origin},serviceBindings:{ASSETS:()=>new Response('test-ui')}});
 const call=(path,options={})=>mf.dispatchFetch(origin+path,{redirect:'manual',...options});
 try{
  const db=await mf.getD1Database('DB');for(const sql of (await readFile('drizzle/0000_initial.sql','utf8')).split('--> statement-breakpoint'))await db.prepare(sql).run();
  assert.equal((await call('/api/petkit',{headers:{'oai-authenticated-user-id':'household'}})).status,401);
  assert.equal((await call('/')).status,303);
  assert.equal((await call('/login',{method:'POST',headers:{origin:'https://evil.invalid'},body:'token='+token})).status,403);
  const login=await call('/login',{method:'POST',headers:{origin},body:'token='+token});assert.equal(login.status,303);assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/Secure/);
  const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal(await(await call('/',{headers:{cookie}})).text(),'test-ui');
  assert.equal((await(await call('/api/petkit',{headers:{cookie}})).json()).connected,false);
  assert.equal((await call('/api/petkit',{method:'POST',headers:{cookie,origin:'https://evil.invalid'},body:'{}'})).status,403);
  assert.equal((await call('/mcp',{method:'POST',headers:{cookie,origin},body:'{}'})).status,403);
  const init=await call('/mcp',{method:'POST',headers:{authorization:'Bearer '+token},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize'})});assert.equal((await init.json()).result.serverInfo.name,'poopurr');
  assert.equal((await call('/mcp',{method:'POST',headers:{authorization:'Bearer '+token},body:'x'.repeat(33000)})).status,400);
  assert.equal((await call('/logout',{method:'POST',headers:{cookie,origin}})).status,303);
 }finally{await mf.dispose();}
});
