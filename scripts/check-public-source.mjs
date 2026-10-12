import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
const files=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const forbidden=[/appgprj_[a-z0-9]+/i,/plugin_asdk_app_sites_[a-z0-9]+/i,/[a-z0-9-]+\.chatgpt\.site/,/github_pat_[A-Za-z0-9_]+/,/ghp_[A-Za-z0-9]{20,}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
let failed=false;for(const file of files){if(/(^|\/)(\.dev\.vars|\.env)(\.|$)|\.sqlite(?:-|$)|\.db$/.test(file)){console.error('Forbidden runtime file:',file);failed=true;continue;}if(file==='scripts/check-public-source.mjs')continue;let text=readFileSync(file,'utf8');
// Only the intentionally public, synthetic demo URL is permitted in documentation.
if(['README.md','README.en.md','docs/DEMO.md'].includes(file))text=text.replaceAll('https://poopurr-demo.bushy-slug-1458.chatgpt.site','PUBLIC_DEMO_URL');if(forbidden.some(r=>r.test(text))){console.error('Potential private data:',file);failed=true;}}
if(failed)process.exit(1);console.log(`Checked ${files.length} tracked files. Pattern checks supplement manual review, not a full secret scanner.`);
