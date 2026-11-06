import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
// Exercise the same runtime Wrangler ships, using its supported v4-options adapter.
const {Miniflare,convertV4MiniflareOptions}=await import(
  require.resolve('miniflare',{paths:[require.resolve('wrangler')]})
);
export function createRuntime(options){
  return new Miniflare(convertV4MiniflareOptions(options));
}
