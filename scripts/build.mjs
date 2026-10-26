import {readFile,writeFile,readdir,mkdir,rm,realpath} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=new URL('../',import.meta.url);
const output=fileURLToPath(new URL('dist/',root)),project=await realpath(fileURLToPath(root));
const resolved=await realpath(output).catch(()=>path.resolve(output));
if(path.relative(project,resolved)!=='dist')throw new Error('Build output must be the project dist directory.');
await rm(output,{recursive:true,force:true});
const assets={};for(const name of await readdir(new URL('public/',root))){assets['/'+name]=await readFile(new URL('public/'+name,root),'utf8');}
assets['/sw.js']=assets['/sw.js'].replace('PANDA_BUILD',createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0,12));
const modules=['public/engine.js','src/rooms.js','src/store.js','src/api.js'];
let bundle='';for(const file of modules){let code=await readFile(new URL(file,root),'utf8');code=code.replace(/^import .*?;\r?\n/gm,'').replace(/export (?=(?:async )?(?:function|class|const))/g,'');bundle+='\n'+code;}
bundle+=`\nconst ASSETS=${JSON.stringify(assets)};\n`;
bundle+=`const MIME={html:'text/html; charset=utf-8',css:'text/css',js:'text/javascript',svg:'image/svg+xml'};
export default {async fetch(request,env){const url=new URL(request.url);if(url.pathname.startsWith('/api/'))return roomApi(request,env);const key=['/','/play'].includes(url.pathname)?'/index.html':url.pathname;if(!ASSETS[key])return new Response('Not found',{status:404});return new Response(ASSETS[key],{headers:{'Content-Type':MIME[key.split('.').pop()]||'text/plain','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}});}};`;
await mkdir(new URL('dist/server/',root),{recursive:true});await mkdir(new URL('dist/.openai/',root),{recursive:true});
await writeFile(new URL('dist/server/index.js',root),bundle);
await writeFile(new URL('dist/.openai/hosting.json',root),await readFile(new URL('.openai/hosting.json',root)));
const worker=await import('data:text/javascript;base64,'+Buffer.from(bundle).toString('base64'));if(typeof worker.default.fetch!=='function')throw Error('Invalid worker');
console.log(`Built Worker: ${Object.keys(assets).length} embedded assets, shared game engine, room API.`);
