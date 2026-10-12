import test from 'node:test';
import assert from 'node:assert/strict';
import {apiRequest} from '../lib/browser-api.mjs';

test('opaque login redirect is actionable and never parsed as JSON', async () => {
  await assert.rejects(apiRequest('connect', {password:'synthetic'}, async (url, options) => {
    assert.equal(options.redirect, 'manual');
    assert.equal(options.credentials, 'same-origin');
    assert.equal(options.headers.Accept, 'application/json');
    return {type:'opaqueredirect',status:0,json(){assert.fail('must not parse redirect');}};
  }), e => e.code === 'auth' && e.message.includes('重新登录本站'));
});
test('HTML from a gateway gives HTTP diagnostic without exposing page content', async () => {
  await assert.rejects(apiRequest(undefined, {}, async () => new Response('<!DOCTYPE html>private-page', {status:502, headers:{'content-type':'text/html','cf-ray':'abc123-HKG'}})), e => e.code === 'unexpected_response' && e.message.includes('HTTP 502') && e.message.includes('abc123-HKG') && !e.message.includes('private-page'));
});
test('JSON auth errors and malformed bodies are handled without syntax errors', async () => {
  await assert.rejects(apiRequest(undefined, {}, async () => Response.json({error:'auth'}, {status:401})), e => e.code === 'auth');
  await assert.rejects(apiRequest(undefined, {}, async () => new Response('<!DOCTYPE html>', {headers:{'content-type':'application/json'}})), e => e.code === 'invalid_response');
});
test('API failures remain failures and valid results are preserved', async () => {
  await assert.rejects(apiRequest('connect', {}, async () => Response.json({error:'PETKIT 返回错误'}, {status:400})), /PETKIT 返回错误/);
  assert.deepEqual(await apiRequest(undefined, {}, async () => Response.json({connected:false})), {connected:false});
});
