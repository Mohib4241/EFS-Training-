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
 for(const name of ['viewer','maintenance3d','maintenance-text','hard-lab','scrubber'])assert.match(entry,new RegExp(`import\\("\\./chunks/${name}-[A-Za-z0-9]+\\.js"\\)`),`${name} is dynamically imported`);
 const eager=[entryUrl,...preloads].map(read).join('\n');
 assert.doesNotMatch(eager,/WebGLRenderer/,'3D engine stays out of the eager graph');
 assert.ok(chunks.some(url=>/WebGLRenderer/.test(read(url))),'3D engine exists in a lazy chunk');
 assert.ok(preloads.length>0&&preloads.every(url=>!/viewer-|hard-lab-|scrubber-|maintenance/.test(url)),'only shared eager chunks are preloaded');
});

test('first load stays inside its size budget (gzip)',()=>{
 const css=html.match(/href="(\/static\/styles-[^"]+\.css)"/)[1],files=[entryUrl,css,...preloads],gz=text=>gzipSync(text,{level:9}).length;
 const total=gz(html)+files.reduce((sum,url)=>sum+gz(read(url)),0);
 assert.ok(total<90*1024,`first load is ${(total/1024).toFixed(1)} KB gzip; budget is 90 KB`);
});

test('maintenance practice is 3D only: a lazy 3D chunk, a written fallback without three.js, and no 2D simulation',()=>{
 const named=prefix=>chunks.filter(url=>new RegExp(`^/static/chunks/${prefix}-[A-Za-z0-9]+\\.js$`).test(url)),staticImports=url=>[...read(url).matchAll(/from"(\.\/[^"]+)"/g)].map(m=>`/static/chunks/${m[1].slice(2)}`);
 assert.deepEqual(named('maintenance'),[],'the 2D simulation chunk is gone');
 assert.doesNotMatch(read(entryUrl),/maintenance-[A-Za-z0-9]+\.js|maintenance\.css/,'nothing refers to the 2D simulation');
 const [solid]=named('maintenance3d'),[text]=named('maintenance-text');
 assert.ok(solid&&text,'the 3D practice and the written steps are separate chunks');
 assert.ok(![entryUrl,...preloads].some(url=>staticImports(url).some(dep=>/maintenance/.test(dep))),'nothing eager imports either');
 assert.ok(!preloads.some(url=>/maintenance/.test(url)),'neither is preloaded');
 const graph=url=>{const seen=new Set(),walk=u=>{for(const dep of staticImports(u))if(!seen.has(dep)){seen.add(dep);walk(dep);}};walk(url);return [url,...seen];};
 assert.ok(!graph(text).some(url=>/WebGLRenderer/.test(read(url))),'the written steps (for browsers without WebGL2) never download three.js');
 assert.ok(graph(solid).some(url=>/WebGLRenderer/.test(read(url))),'the 3D practice brings three.js with it');
 assert.ok(staticImports(text).every(dep=>staticImports(solid).includes(dep)),'the written steps reuse the 3D practice\'s lesson content, not a copy');
});

test('hand tracking runs in a worker that is its own hashed file, loaded only by the 3D practice',()=>{
 const workers=readdirSync(join(dist,'static')).filter(name=>/^hand-worker-[A-Za-z0-9]+\.js$/.test(name));
 assert.equal(workers.length,1,'one content-hashed worker script');
 const url=`/static/${workers[0]}`,code=read(url);
 assert.ok(code.startsWith('(()=>{')&&!/^import |from"\.\//m.test(code),'a classic worker: one self-contained script with no module imports of its own');
 assert.match(code,/createFromOptions/,'it runs the MediaPipe hand landmarker');
 assert.match(code,/flush\((\w+),(\w+)\)\{this\.i=\[\],\1\?\.\(\);return;/,'MediaPipe\'s usage-logging upload is switched off in the worker too');
 const refs=[entryUrl,...preloads,...chunks].filter(chunk=>read(chunk).includes(workers[0]));
 assert.deepEqual(refs.map(ref=>ref.replace(/-[A-Za-z0-9]+\.js$/,'')),['/static/chunks/maintenance3d'],'only the 3D practice knows where the worker is');
 assert.doesNotMatch(html,/hand-worker/,'no page load fetches it');
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

test('hand tracking is opt-in: model and WebAssembly are same-origin files that no page load fetches',()=>{
 const staticFiles=[],walk=dir=>{for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())walk(path);else staticFiles.push(path.slice(dist.length));}};walk(join(dist,'static'));
 const model=staticFiles.filter(name=>/^\/static\/hand_landmarker-[A-Za-z0-9]+\.task$/.test(name)),wasm=staticFiles.filter(name=>/^\/static\/mediapipe-[\d.]+\/vision_wasm_internal\.wasm$/.test(name));
 assert.equal(model.length,1,'one content-hashed model');assert.equal(wasm.length,1,'one WebAssembly binary in a versioned folder');
 for(const url of [entryUrl,...preloads])assert.doesNotMatch(read(url),/hand_landmarker|vision_wasm|HandLandmarker/,`${url} knows nothing about hand tracking`);
 assert.doesNotMatch(html,/hand_landmarker|\.wasm|mediapipe/,'the page never preloads the model');
 const vision=chunks.find(url=>url.includes('/vision_bundle-'));assert.ok(vision&&/createFromOptions/.test(read(vision)),'the MediaPipe code is its own chunk');
 const solid=chunks.find(url=>url.includes('/maintenance3d-'));assert.match(read(solid),/import\("\.\/vision_bundle-[A-Za-z0-9]+\.js"\)/,'it is loaded by a dynamic import, only after the learner allows the camera');
 assert.match(read(solid),/hand_landmarker-[A-Za-z0-9]+\.task/,'the 3D chunk points at the hashed model');
 assert.match(read(vision),/flush\((\w+),(\w+)\)\{this\.i=\[\],\1\?\.\(\);return;/,'MediaPipe\'s usage-logging upload is switched off, so no video-derived data can leave the page');
});

test('camera and WebAssembly are allowed for this site only, on the dev server and in the production headers alike',async()=>{
 const page=await get('/');
 const csp=page.headers.get('content-security-policy'),script=/script-src ([^;]+)/.exec(csp)?.[1];
 assert.equal(script,"'self' 'wasm-unsafe-eval'",'WebAssembly compilation is allowed, scripts are not widened');assert.doesNotMatch(csp,/unsafe-eval(?!')|'unsafe-inline'[^;]*script|https?:\/\/|\*/,'no remote origins or wildcards');
 assert.equal(page.headers.get('permissions-policy'),'camera=(self), microphone=(), geolocation=()');
 const wasm=(await readdirSync(join(dist,'static'),{recursive:true})).find(name=>/vision_wasm_internal\.wasm$/.test(name)),model=readdirSync(join(dist,'static')).find(name=>/^hand_landmarker-.*\.task$/.test(name));
 const w=await get(`/static/${wasm}`,{headers:{'Accept-Encoding':'br'}});assert.equal(w.status,200);assert.equal(w.headers.get('content-type'),'application/wasm');assert.equal(w.headers.get('cache-control'),'public, max-age=31536000, immutable');assert.equal(w.headers.get('content-encoding'),'br','the 14 MB binary travels compressed');
 const m=await get(`/static/${model}`,{headers:{'Accept-Encoding':'br'}});assert.equal(m.status,200);assert.equal(m.headers.get('content-encoding'),'br','the 7.8 MB model travels compressed');assert.equal(m.headers.get('content-type'),'application/octet-stream');assert.equal(m.headers.get('cache-control'),'public, max-age=31536000, immutable');
 // the production host (render.yaml) must send exactly what the preview server sends
 const yaml=readFileSync(join(root,'render.yaml'),'utf8'),value=name=>new RegExp(`name: ${name}\\s+value: "?([^\\n"]+)"?`).exec(yaml)?.[1];
 assert.equal(value('Content-Security-Policy'),csp);assert.equal(value('Permissions-Policy'),page.headers.get('permissions-policy'));
});
