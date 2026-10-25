import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
function files(dir) { return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):/\.m?js$/.test(e.name)?[`${dir}/${e.name}`]:[]); }
const paths=['build.mjs',...['src','tests','tools'].flatMap(files)];
for(const path of paths) {const result=spawnSync(process.execPath,['--check',path],{encoding:'utf8'});if(result.status!==0){process.stderr.write(result.stderr);process.exit(result.status||1);}}
console.log(`Syntax checks passed: ${paths.length} JavaScript files. No TypeScript or lint configuration exists in this project.`);
