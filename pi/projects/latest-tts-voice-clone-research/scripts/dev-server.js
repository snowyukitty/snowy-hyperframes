const http = require('http'), fs = require('fs'), path = require('path');
const port = process.env.PORT || 4173;
const root = process.cwd();
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.mp3':'audio/mpeg','.txt':'text/plain; charset=utf-8','.srt':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  const url = req.url === '/' ? '/index.html' : decodeURI(req.url.split('?')[0]);
  const file = path.resolve(root, url.replace(/^\//,''));
  if (!file.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file,(err,data)=>{ if(err){res.writeHead(404); return res.end('Not found');} res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'}); res.end(data); });
}).listen(port,()=>console.log(`Preview: http://localhost:${port}`));
