const {createServer}=require("node:http");
const {createReadStream}=require("node:fs");
const {basename,extname,join}=require("node:path");
const root=join(__dirname,"..");
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".svg":"image/svg+xml",".json":"application/json"};
createServer((req,res)=>{
 const {pathname}=new URL(req.url,"http://localhost");
 const file=pathname.slice("/butce-takip/".length)||"index.html";
 if(!pathname.startsWith("/butce-takip/")||(file!==basename(file)&&file!=="vendor/supabase-2.119.2.js")||!types[extname(file)]){
  res.writeHead(404).end();
  return;
 }
 const stream=createReadStream(join(root,file));
 stream.on("error",()=>res.writeHead(404).end());
 stream.on("open",()=>{
  res.setHeader("Content-Type",types[extname(file)]+"; charset=utf-8");
  stream.pipe(res);
 });
}).listen(8765,"127.0.0.1");
