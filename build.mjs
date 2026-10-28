import {mkdir,rm,readFile,writeFile,readdir} from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
import {brotliCompressSync,gzipSync,constants} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {join,extname,relative,sep} from 'node:path';
const root=fileURLToPath(new URL('./',import.meta.url)),src=join(root,'src'),dist=join(root,'dist'),out=join(dist,'static');
const hash=buffer=>createHash('sha256').update(buffer).digest('hex').slice(0,10);
const url=file=>'/'+relative(dist,file).split(sep).join('/');
// Rebuild generated output so removed assets cannot survive in the application.
await rm(dist,{recursive:true,force:true});
await mkdir(out,{recursive:true});

// Everything under /static/ has a content hash in its name, so it can be cached forever.
// Code splitting keeps three.js and each lab out of the first load; they download when their page opens.
const result=await build({entryPoints:{app:join(src,'app.js'),styles:join(src,'styles.css')},outdir:out,entryNames:'[name]-[hash]',chunkNames:'chunks/[name]-[hash]',bundle:true,splitting:true,minify:true,format:'esm',target:'es2022',legalComments:'eof',metafile:true,absWorkingDir:root,loader:{'.hud':'text'},logLevel:'warning'});
const outputs=Object.entries(result.metafile.outputs).map(([file,meta])=>({file:join(root,file),meta}));
const entry=name=>outputs.find(o=>o.meta.entryPoint?.endsWith(`src/${name}`));
const app=entry('app.js'),styles=entry('styles.css');
if(!app||!styles)throw new Error('esbuild did not emit the app and stylesheet entry points');

const assets={};
for(const file of ['efs-logo.svg','favicon.svg']){const body=await readFile(join(src,'assets',file)),name=`${file.replace(/\.svg$/,'')}-${hash(body)}.svg`;await writeFile(join(out,name),body);assets[`/assets/${file}`]=`/static/${name}`;}

// Static imports of the entry are fetched in parallel with it; dynamic imports (3D, labs) stay lazy.
const preload=app.meta.imports.filter(i=>i.kind==='import-statement').map(i=>url(join(root,i.path)));
let html=await readFile(join(src,'index.html'),'utf8');
function swap(from,to){if(html.split(from).length!==2)throw new Error(`index.html must reference ${from} exactly once`);html=html.replace(from,to);}
swap('/styles.css',url(styles.file));
swap('<script type="module" src="/app.js"></script>',`${preload.map(href=>`<link rel="modulepreload" href="${href}">`).join('')}<script type="module" src="${url(app.file)}"></script>`);
for(const [from,to] of Object.entries(assets))html=html.split(from).join(to);
await writeFile(join(dist,'index.html'),html);

// Precompress once at build time so the server never compresses per request.
async function* walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())yield*walk(path);else yield path;}}
const report=[],files=[];
for await(const file of walk(dist))files.push(file);
for(const file of files){
 if(!['.html','.js','.css','.svg'].includes(extname(file)))continue;
 const body=await readFile(file),br=brotliCompressSync(body,{params:{[constants.BROTLI_PARAM_QUALITY]:11,[constants.BROTLI_PARAM_SIZE_HINT]:body.length}}),gz=gzipSync(body,{level:9});
 await writeFile(`${file}.br`,br);await writeFile(`${file}.gz`,gz);report.push([url(file),body.length,gz.length,br.length]);
}
const kb=n=>(n/1024).toFixed(1).padStart(7);
console.log('file'.padEnd(46),'raw KB  gzip KB  brotli KB');
for(const [file,raw,gz,br] of report.sort((a,b)=>a[0].localeCompare(b[0])))console.log(file.padEnd(46),kb(raw),kb(gz),kb(br));
const first=report.filter(([file])=>file==='/index.html'||file===url(styles.file)||file===url(app.file)||preload.includes(file));
console.log(`First load (html + css + entry + ${preload.length} preloaded chunk${preload.length===1?'':'s'}): ${kb(first.reduce((n,r)=>n+r[1],0))} KB raw, ${kb(first.reduce((n,r)=>n+r[2],0))} KB gzip, ${kb(first.reduce((n,r)=>n+r[3],0))} KB brotli`);
console.log('Built EFS Learning Hub with local 3D assets: dist/');
