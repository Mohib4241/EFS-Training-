import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';

const port=Number(process.env.PORT||5173);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT must be between 1 and 65535');
const file=new URL(process.argv.includes('--dev')?'./src/index.html':'./dist/index.html',import.meta.url);
createServer(async(req,res)=>{
  const path=new URL(req.url,'http://localhost').pathname;
  if(path!=='/'&&path!=='/index.html'){res.writeHead(404);res.end('Not found');return;}
  try{const html=await readFile(file);res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(html);}
  catch{res.writeHead(503);res.end('Run npm run build first');}
}).listen(port,'127.0.0.1',()=>console.log(`Blank starter: http://127.0.0.1:${port}`));
