import {writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
try{await writeFile('.dev.vars',`ACCESS_TOKEN=${randomBytes(32).toString('hex')}\nPETKIT_SESSION_KEY=${randomBytes(32).toString('hex')}\nPUBLIC_ORIGIN=http://localhost:8787\nALLOW_LOCAL_HTTP=true\n`,{flag:'wx',mode:0o600});console.log('Created .dev.vars. Retrieve ACCESS_TOKEN from that local file; never commit it.');}catch(e){if(e.code==='EEXIST')console.log('.dev.vars exists; kept unchanged.');else throw e;}
