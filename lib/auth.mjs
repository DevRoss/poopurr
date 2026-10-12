const encode = s => new TextEncoder().encode(s);
async function signature(message,secret){const key=await crypto.subtle.importKey('raw',encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return Buffer.from(await crypto.subtle.sign('HMAC',key,encode(message))).toString('hex');}
export async function equalSecret(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',encode(a)),crypto.subtle.digest('SHA-256',encode(b))]);const u=new Uint8Array(x),v=new Uint8Array(y);let diff=0;for(let i=0;i<u.length;i++)diff|=u[i]^v[i];return diff===0;}
export async function issueCookie(env,now=Date.now()){const value=String(now+86400000);return value+'.'+await signature(value,env.PETKIT_SESSION_KEY+env.ACCESS_TOKEN);}
export async function authenticated(req,env,now=Date.now()){
 const token=req.headers.get('authorization');if(token?.startsWith('Bearer '))return equalSecret(token.slice(7),env.ACCESS_TOKEN);
 const cookie=req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('petkit_auth='))?.slice(12);
 if(!cookie)return false;const [expires,sig,...rest]=cookie.split('.');if(rest.length||!/^\d+$/.test(expires)||Number(expires)<=now||Number(expires)>now+86400000)return false;
 return equalSecret(sig,await signature(expires,env.PETKIT_SESSION_KEY+env.ACCESS_TOKEN));
}
export function validOrigin(req,env){return req.headers.get('origin')===env.PUBLIC_ORIGIN&&new URL(req.url).origin===env.PUBLIC_ORIGIN;}
export function configured(env){return typeof env.ACCESS_TOKEN==='string'&&env.ACCESS_TOKEN.length>=32&&/^[a-f0-9]{64}$/.test(env.PETKIT_SESSION_KEY??'')&&/^https:\/\//.test(env.PUBLIC_ORIGIN??'')||typeof env.ACCESS_TOKEN==='string'&&env.ACCESS_TOKEN.length>=32&&/^[a-f0-9]{64}$/.test(env.PETKIT_SESSION_KEY??'')&&env.ALLOW_LOCAL_HTTP==='true'&&/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(env.PUBLIC_ORIGIN??'');}
