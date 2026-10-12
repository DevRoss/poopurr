import test from 'node:test';
import assert from 'node:assert/strict';
import {authenticated,configured,issueCookie,validOrigin} from '../lib/auth.mjs';
const env={ACCESS_TOKEN:'x'.repeat(64),PETKIT_SESSION_KEY:'ab'.repeat(32),PUBLIC_ORIGIN:'https://example.invalid'};
test('rejects missing, forged and expired auth; accepts signed cookie and bearer',async()=>{
 const req=h=>new Request(env.PUBLIC_ORIGIN,{headers:h});assert.equal(await authenticated(req({'oai-authenticated-user-id':'owner'}),env),false);
 assert.equal(await authenticated(req({authorization:'Bearer '+env.ACCESS_TOKEN}),env),true);
 const cookie=await issueCookie(env,1000);assert.equal(await authenticated(req({cookie:'petkit_auth='+cookie}),env,2000),true);
 assert.equal(await authenticated(req({cookie:'petkit_auth='+cookie+'0'}),env,2000),false);
 assert.equal(await authenticated(req({cookie:'petkit_auth='+cookie}),env,90000000),false);
 assert.equal(await authenticated(req({cookie:'petkit_auth='+cookie}),{...env,ACCESS_TOKEN:'y'.repeat(64)},2000),false);
});
test('requires exact Origin and denies insecure non-loopback deployment',()=>{
 assert.equal(validOrigin(new Request(env.PUBLIC_ORIGIN,{headers:{origin:env.PUBLIC_ORIGIN}}),env),true);
 assert.equal(validOrigin(new Request(env.PUBLIC_ORIGIN,{headers:{origin:'https://evil.invalid'}}),env),false);
 assert.equal(configured({...env,PUBLIC_ORIGIN:'http://public.invalid',ALLOW_LOCAL_HTTP:'true'}),false);
 assert.equal(configured({...env,ACCESS_TOKEN:'short'}),false);
});
