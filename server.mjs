import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const port=Number(process.env.PORT||5173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535');
const root=new URL(process.argv.includes('--dev')?'./src/':'./dist/',import.meta.url);
const files=new Map([['/','index.html'],['/index.html','index.html'],['/app.js','app.js'],['/style.css','style.css'],['/maintenance.css','maintenance.css'],['/hard-lab.css','hard-lab.css'],['/assets/efs-logo.svg','assets/efs-logo.svg']]);
const types={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css; charset=utf-8',svg:'image/svg+xml'};
createServer(async(req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
 const file=files.get(path);if(!file){res.writeHead(404);res.end('Not found');return;}
 try{const body=await readFile(new URL(file,root));res.writeHead(200,{'Content-Type':types[file.split('.').pop()],'Content-Length':body.length,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'strict-origin-when-cross-origin'});res.end(req.method==='HEAD'?undefined:body);}
 catch{res.writeHead(503);res.end('Run npm run build first');}
}).listen(port,'127.0.0.1',()=>console.log(`EFS Learning Hub: http://127.0.0.1:${port}`));
