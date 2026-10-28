import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync,spawn} from 'node:child_process';
import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {createServer as createSocket} from 'node:net';
import {gzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=join(root,'dist');
execFileSync(process.execPath,['build.mjs'],{cwd:root,stdio:'pipe'});
const html=readFileSync(join(dist,'index.html'),'utf8');
const read=url=>readFileSync(join(dist,url.slice(1)),'utf8');
const entryUrl=html.match(/<script type="module" src="(\/static\/app-[A-Za-z0-9]+\.js)"/)?.[1];
const preloads=[...html.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map(m=>m[1]);
const chunks=readdirSync(join(dist,'static','chunks')).map(name=>`/static/chunks/${name}`).filter(name=>name.endsWith('.js'));

test('index references one content-hashed stylesheet and one hashed module entry',()=>{
 assert.ok(entryUrl,'hashed entry script');
 assert.equal([...html.matchAll(/rel="stylesheet" href="(\/static\/styles-[A-Za-z0-9]+\.css)"/g)].length,1);
 assert.doesNotMatch(html,/href="\/(style|maintenance|hard-lab)\.css"|src="\/app\.js"/);
 for(const url of [...html.matchAll(/(?:href|src)="(\/static\/[^"]+)"/g)].map(m=>m[1]))assert.ok(existsSync(join(dist,url.slice(1))),`${url} exists`);
});

test('three.js and every lab are lazy chunks, not part of the first load',()=>{
 const entry=read(entryUrl);
 for(const name of ['viewer','maintenance','hard-lab','scrubber'])assert.match(entry,new RegExp(`import\\("\\./chunks/${name}-[A-Za-z0-9]+\\.js"\\)`),`${name} is dynamically imported`);
 const eager=[entryUrl,...preloads].map(read).join('\n');
 assert.doesNotMatch(eager,/WebGLRenderer/,'3D engine stays out of the eager graph');
 assert.ok(chunks.some(url=>/WebGLRenderer/.test(read(url))),'3D engine exists in a lazy chunk');
 assert.ok(preloads.length>0&&preloads.every(url=>!/viewer-|hard-lab-|scrubber-|maintenance-/.test(url)),'only shared eager chunks are preloaded');
});

test('first load stays inside its size budget (gzip)',()=>{
 const css=html.match(/href="(\/static\/styles-[^"]+\.css)"/)[1],files=[entryUrl,css,...preloads],gz=text=>gzipSync(text,{level:9}).length;
 const total=gz(html)+files.reduce((sum,url)=>sum+gz(read(url)),0);
 assert.ok(total<90*1024,`first load is ${(total/1024).toFixed(1)} KB gzip; budget is 90 KB`);
});

test('the 3D simulation is a separate lazy chunk and the 2D simulation chunk stays self-contained',()=>{
 const named=prefix=>chunks.filter(url=>url.startsWith(`/static/chunks/${prefix}-`)),staticImports=url=>[...read(url).matchAll(/from"(\.\/[^"]+)"/g)].map(m=>m[1]);
 const [flat]=named('maintenance'),[solid]=named('maintenance3d');
 assert.ok(flat&&solid,'both chunks exist');
 assert.deepEqual(staticImports(flat),[],'the 2D chunk imports nothing, so opening the checklist costs no extra request');
 assert.doesNotMatch(read(flat),/WebGLRenderer/,'no 3D code leaks into the 2D chunk');
 assert.match(read(entryUrl),/import\("\.\/chunks\/maintenance3d-[A-Za-z0-9]+\.js"\)/,'the entry loads it dynamically');
 assert.ok(![entryUrl,...preloads].some(url=>staticImports(url).some(dep=>dep.includes('maintenance3d'))),'nothing eager imports it');
 assert.ok(!preloads.some(url=>/maintenance3d/.test(url)),'it is never preloaded');
 const shared=staticImports(solid).map(dep=>`/static/chunks/${dep.slice(2)}`);assert.ok(shared.every(url=>/WebGLRenderer/.test(read(url))),'its only static dependency is the existing three.js chunk');
});

let server,base;
before(async()=>{
 const port=await new Promise(resolve=>{const probe=createSocket();probe.listen(0,'127.0.0.1',()=>{const {port}=probe.address();probe.close(()=>resolve(port));});});
 server=spawn(process.execPath,['server.mjs'],{cwd:root,env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','inherit']});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.once('exit',code=>reject(new Error(`server exited ${code}`)));server.stdout.on('data',chunk=>{if(String(chunk).includes('http://'))resolve();});});
 base=`http://127.0.0.1:${port}`;
});
after(()=>server?.kill());
const get=(path,options={})=>fetch(base+path,{redirect:'manual',...options});

test('server revalidates HTML, caches hashed assets forever and negotiates compression',async()=>{
 const page=await get('/',{headers:{'Accept-Encoding':'br'}});
 assert.equal(page.status,200);assert.equal(page.headers.get('content-encoding'),'br');assert.equal(page.headers.get('cache-control'),'no-cache');assert.match(page.headers.get('vary'),/Accept-Encoding/);
 assert.match(page.headers.get('content-security-policy'),/default-src 'self'/);assert.equal(page.headers.get('x-content-type-options'),'nosniff');
 assert.equal(await page.text(),html,'decoded body matches the build output');
 const asset=await get(entryUrl,{headers:{'Accept-Encoding':'gzip'}});assert.equal(asset.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(asset.headers.get('content-encoding'),'gzip');assert.match(asset.headers.get('content-type'),/javascript/);
 const refused=await get('/',{headers:{'Accept-Encoding':'br;q=0, gzip;q=0'}});assert.equal(refused.headers.get('content-encoding'),null,'q=0 codings are not used');
 const preferred=await get('/',{headers:{'Accept-Encoding':'br;q=0, gzip;q=0.5'}});assert.equal(preferred.headers.get('content-encoding'),'gzip');
 const plain=await get('/',{headers:{'Accept-Encoding':'identity'}});assert.equal(plain.headers.get('content-encoding'),null);assert.equal(await plain.text(),html);
 const tag=page.headers.get('etag'),again=await get('/',{headers:{'Accept-Encoding':'br','If-None-Match':tag}});assert.equal(again.status,304);
});

test('server only serves the build output',async()=>{
 for(const path of ['/../server.mjs','/%2e%2e/server.mjs','/static/../../package.json','/index.html.br','/static/chunks/','/src/app.js','/nope'])assert.ok([400,404].includes((await get(path)).status),`${path} is not served`);
 assert.equal((await get('/',{method:'POST'})).status,405);
 assert.equal((await get('/',{method:'HEAD'})).status,200);
});
