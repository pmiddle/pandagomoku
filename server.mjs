import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {roomApi} from './src/api.js';
import {localDatabase} from './src/local-db.js';
const root=path.resolve('public'),DB=localDatabase('.local/rooms.sqlite');
const mime={html:'text/html; charset=utf-8',js:'text/javascript',css:'text/css',svg:'image/svg+xml',json:'application/json'};
const port=Number(process.env.PORT||5173);
http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://'+req.headers.host);
    if(url.pathname.startsWith('/api/')){
      let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>2048){res.writeHead(413,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Request too large.'}));return;}}
      const headers=new Headers();for(const [name,value]of Object.entries(req.headers))if(value)headers.set(name,Array.isArray(value)?value.join(','):value);headers.set('X-Local-IP',req.socket.remoteAddress);
      const response=await roomApi(new Request(url,{method:req.method,headers,body:['GET','HEAD'].includes(req.method)?undefined:raw}),{DB});res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
    }
    const pathname=['/','/play'].includes(url.pathname)?'/index.html':decodeURIComponent(url.pathname);
    const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep))throw Error();
    const data=await readFile(file);res.setHeader('Content-Type',mime[file.split('.').pop()]||'application/octet-stream');res.setHeader('Cache-Control','no-cache');res.setHeader('X-Content-Type-Options','nosniff');res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}`));
