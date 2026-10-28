import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {join,extname,relative,sep} from 'node:path';
const port=Number(process.env.PORT||5173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535');
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.wasm':'application/wasm','.task':'application/octet-stream'};
const security={'X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",'Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(self), microphone=(), geolocation=()'};
async function* walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())yield*walk(path);else yield path;}}
// The build output is the allowlist: only files found here are served, so no request path can reach anything else.
const routes=new Map();
try{
 for await(const file of walk(root)){
  const type=types[extname(file)];if(!type)continue;
  const path='/'+relative(root,file).split(sep).join('/'),identity=await readFile(file);
  const variants=[['br',await readFile(`${file}.br`).catch(()=>null)],['gzip',await readFile(`${file}.gz`).catch(()=>null)],['identity',identity]].filter(([,body])=>body);
  const etag=createHash('sha1').update(identity).digest('hex').slice(0,16);
  // /static/ names carry a content hash, so they never change; everything else revalidates.
  routes.set(path,{type,variants,etag,cache:path.startsWith('/static/')?'public, max-age=31536000, immutable':'no-cache'});
 }
}catch{}
if(!routes.has('/index.html')){console.error('dist/ is missing. Run `npm run build` first.');process.exit(1);}
routes.set('/',routes.get('/index.html'));
// Codings the client accepts, honouring q=0 as "refused".
const accepted=header=>{const set=new Set();for(const part of String(header||'').split(',')){const [name,...params]=part.trim().toLowerCase().split(';'),q=params.map(p=>p.trim()).find(p=>p.startsWith('q='));if(name&&(!q||Number(q.slice(2))>0))set.add(name);}return set;};
createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{'Allow':'GET, HEAD'});res.end();return;}
 let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end();return;}
 const route=routes.get(path);if(!route){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'});res.end('Not found');return;}
 const wanted=accepted(req.headers['accept-encoding']),[encoding,body]=route.variants.find(([name])=>name==='identity'||wanted.has(name));
 const etag=`"${route.etag}-${encoding}"`,headers={...security,'Content-Type':route.type,'Cache-Control':route.cache,'ETag':etag,'Vary':'Accept-Encoding'};
 if(encoding!=='identity')headers['Content-Encoding']=encoding;
 if(req.headers['if-none-match']?.split(',').some(tag=>tag.trim()===etag)){res.writeHead(304,headers);res.end();return;}
 headers['Content-Length']=body.length;res.writeHead(200,headers);res.end(req.method==='HEAD'?undefined:body);
}).listen(port,'127.0.0.1',()=>console.log(`EFS Learning Hub: http://127.0.0.1:${port}`));
