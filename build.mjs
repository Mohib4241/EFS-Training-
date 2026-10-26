import {mkdir,cp,rm} from 'node:fs/promises';
import {build} from 'esbuild';
import {fileURLToPath} from 'node:url';
const dist=new URL('./dist/',import.meta.url);
// Rebuild generated output so removed assets cannot survive in the application.
await rm(dist,{recursive:true,force:true});
await mkdir(dist,{recursive:true});
await cp(new URL('./src/assets/',import.meta.url),new URL('./dist/assets/',import.meta.url),{recursive:true});
for(const file of ['index.html','style.css'])await cp(new URL(`./src/${file}`,import.meta.url),new URL(`./dist/${file}`,import.meta.url));
await build({entryPoints:[fileURLToPath(new URL('./src/app.js',import.meta.url))],outfile:fileURLToPath(new URL('./dist/app.js',import.meta.url)),bundle:true,minify:true,format:'esm',target:'es2022',legalComments:'eof'});
console.log('Built EFS Learning Hub with local 3D assets: dist/');
