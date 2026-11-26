"use strict";

function receiptCanvas(width,height){
 const canvas=document.createElement("canvas");
 canvas.width=width;canvas.height=height;
 return canvas;
}

async function receiptSource(file){
 const image=await createImageBitmap(file);
 try{
  const ratio=Math.min(1,2100/Math.max(image.width,image.height));
  const canvas=receiptCanvas(Math.max(1,Math.round(image.width*ratio)),Math.max(1,Math.round(image.height*ratio)));
  canvas.getContext("2d").drawImage(image,0,0,canvas.width,canvas.height);
  return canvas;
 }finally{image.close();}
}

function rotateReceipt(source,turns){
 const angle=((turns%4)+4)%4;
 const canvas=receiptCanvas(angle%2?source.height:source.width,angle%2?source.width:source.height);
 const ctx=canvas.getContext("2d");
 ctx.translate(canvas.width/2,canvas.height/2);
 ctx.rotate(angle*Math.PI/2);
 ctx.drawImage(source,-source.width/2,-source.height/2);
 return canvas;
}

function rectifyReceipt(source,corners){
 if(corners.length!==4)return source;
 const [a,b,c,d]=corners.map(p=>({x:p.x*source.width,y:p.y*source.height}));
 const points=[a,b,c,d];
 const cross=(p,q,r)=>(q.x-p.x)*(r.y-q.y)-(q.y-p.y)*(r.x-q.x);
 if(points.some((p,i)=>cross(p,points[(i+1)%4],points[(i+2)%4])<=0))throw Error("Dört köşeyi sol üstten başlayarak saat yönünde işaretle.");
 const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
 const width=Math.round(Math.max(distance(a,b),distance(c,d)));
 const height=Math.round(Math.max(distance(a,d),distance(b,c)));
 if(width<30||height<30)throw Error("İşaretlenen belge alanı çok küçük.");
 const dx1=b.x-c.x,dx2=d.x-c.x,sx=a.x-b.x+c.x-d.x;
 const dy1=b.y-c.y,dy2=d.y-c.y,sy=a.y-b.y+c.y-d.y;
 const divisor=dx1*dy2-dx2*dy1;
 const g=(sx*dy2-dx2*sy)/divisor,h=(dx1*sy-sx*dy1)/divisor;
 const sourcePixels=source.getContext("2d").getImageData(0,0,source.width,source.height).data;
 const canvas=receiptCanvas(width,height),ctx=canvas.getContext("2d"),output=ctx.createImageData(width,height);
 for(let y=0;y<height;y++){
  const v=y/(height-1);
  for(let x=0;x<width;x++){
   const u=x/(width-1),w=1+g*u+h*v;
   const px=Math.round((a.x+(b.x-a.x+g*b.x)*u+(d.x-a.x+h*d.x)*v)/w);
   const py=Math.round((a.y+(b.y-a.y+g*b.y)*u+(d.y-a.y+h*d.y)*v)/w);
   const from=(Math.min(source.height-1,Math.max(0,py))*source.width+Math.min(source.width-1,Math.max(0,px)))*4;
   const to=(y*width+x)*4;
   output.data[to]=sourcePixels[from];output.data[to+1]=sourcePixels[from+1];output.data[to+2]=sourcePixels[from+2];output.data[to+3]=255;
  }
 }
 ctx.putImageData(output,0,0);
 return canvas;
}

function enhanceReceipt(source,mode){
 if(mode==="original")return source;
 const {width:w,height:h}=source,canvas=receiptCanvas(w,h),ctx=canvas.getContext("2d");
 ctx.drawImage(source,0,0);
 const pixels=ctx.getImageData(0,0,w,h),rgba=pixels.data,gray=new Uint8Array(w*h);
 for(let i=0;i<gray.length;i++)gray[i]=Math.round(.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2]);
 const shadows=mode==="shadow",stride=w+1,integral=shadows?new Uint32Array(stride*(h+1)):null;
 if(integral){
  for(let y=0;y<h;y++){
   let sum=0;
   for(let x=0;x<w;x++){
    sum+=gray[y*w+x];integral[(y+1)*stride+x+1]=sum+integral[y*stride+x+1];
   }
  }
 }
 const windowSize=Math.max(12,Math.round(w/15));
 for(let y=0;y<h;y++){
  for(let x=0;x<w;x++){
   const i=y*w+x;
   let value=(gray[i]-128)*1.32+128;
   if(integral){
    const left=Math.max(0,x-windowSize),right=Math.min(w,x+windowSize+1);
    const top=Math.max(0,y-windowSize),bottom=Math.min(h,y+windowSize+1);
    const mean=(integral[bottom*stride+right]-integral[bottom*stride+left]-integral[top*stride+right]+integral[top*stride+left])/((right-left)*(bottom-top));
    value=245+(gray[i]-mean)*1.85;
   }
   rgba[i*4]=rgba[i*4+1]=rgba[i*4+2]=value;
  }
 }
 ctx.putImageData(pixels,0,0);
 return canvas;
}

function receiptSharpness(source){
 const ratio=Math.min(1,600/Math.max(source.width,source.height));
 const small=receiptCanvas(Math.max(3,Math.round(source.width*ratio)),Math.max(3,Math.round(source.height*ratio)));
 const ctx=small.getContext("2d"),{width:w,height:h}=small;
 ctx.drawImage(source,0,0,w,h);
 const rgba=ctx.getImageData(0,0,w,h).data;
 const pixel=i=>.299*rgba[i*4]+.587*rgba[i*4+1]+.114*rgba[i*4+2];
 let sum=0,count=0;
 for(let y=1;y<h-1;y++){
  for(let x=1;x<w-1;x++){
   const i=y*w+x, lap=4*pixel(i)-pixel(i-1)-pixel(i+1)-pixel(i-w)-pixel(i+w);
   sum+=lap*lap;count++;
  }
 }
 return count?sum/count:0;
}
