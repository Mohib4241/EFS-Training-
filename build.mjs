import {mkdir,copyFile} from 'node:fs/promises';

await mkdir(new URL('./dist/',import.meta.url),{recursive:true});
await copyFile(new URL('./src/index.html',import.meta.url),new URL('./dist/index.html',import.meta.url));
console.log('Built blank starter: dist/index.html');
