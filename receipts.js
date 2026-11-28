(()=>{
"use strict";
const q=id=>document.getElementById(id);
let products=[],discounts=[],warnings=[],printedDiscount=null,busy=false,owner=null,ocrConfidence=null;
let source=null,rotated=null,corners=[],turns=0,selecting=false,fileVersion=0,nextId=1;
function learnedKey(n){return n.toLocaleLowerCase('tr-TR').replace(/\s*\(indirimli\)/g,'').replace(/\s+/g,' ').trim()}
function learned(){const m=new Map();for(const t of state.transactions){if(t.type==='expense'&&String(t.note||'').startsWith('Fiş: ')&&t.description?.includes(' · '))m.set(learnedKey(t.description.split(' · ').slice(1).join(' · ')),t.category)}return m}
function category(n,known){const remembered=known.get(learnedKey(n));if(remembered&&remembered!==TRANSFER_CAT)return remembered;const s=n.toLocaleLowerCase("tr-TR");return /arko|şampuan|sabun|diş macun|deodorant/.test(s)?"Kişisel Bakım":/finish|quantum|deterjan|çamaşır|temizlik|bulaşık/.test(s)?"Temizlik":/ozmo|çikolata|cips|bisküvi/.test(s)?"Atıştırmalık":/namet|dana|piliç|baget|süt|ekmek|yumurta|peynir|yoğurt|et\b|tavuk|pirinç|makarna/.test(s)?"Gıda":"Market"}
function archiveOwner(){return currentUser?.id||"local"}
function archiveAllowed(){const b=localStorage.getItem("butcem_local_owner_v1");return !b||b===currentUser?.id}
async function archiveOp(mode,fn){const db=await new Promise((ok,no)=>{const r=indexedDB.open("butcem_receipt_archive",1);r.onupgradeneeded=()=>r.result.createObjectStore("photos",{keyPath:"id"});r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});try{return await new Promise((ok,no)=>{const t=db.transaction("photos",mode),r=fn(t.objectStore("photos"));t.oncomplete=()=>ok(r.result);t.onabort=t.onerror=()=>no(t.error)})}finally{db.close()}}
async function archiveShow(){const who=archiveOwner();if(!archiveAllowed())return;const all=await archiveOp("readonly",s=>s.getAll());if(who!==archiveOwner()||!archiveAllowed())return;const list=q("receiptArchiveList");list.replaceChildren();for(const p of all.filter(x=>x.owner===who)){const row=document.createElement("p"),view=document.createElement("button"),del=document.createElement("button");row.textContent=p.date+" · "+p.store+" ";view.textContent="Görüntüle";del.textContent="Sil";view.onclick=()=>{if(who!==archiveOwner()||!archiveAllowed())return;archiveClear();const img=q("receiptArchiveImage");img.src=URL.createObjectURL(p.blob);img.hidden=false};del.onclick=async()=>{if(who!==archiveOwner()||!archiveAllowed()||!confirm("Fotoğraf silinsin mi? Harcamalar kalacak."))return;try{await archiveOp("readwrite",s=>s.delete(p.id));archiveClear();await archiveShow()}catch(e){alert("Fotoğraf silinemedi.")}};row.append(view,del);list.append(row)}if(!list.children.length)list.textContent="Fotoğraf yok."}
function archiveClear(){const img=q("receiptArchiveImage");if(img.src.startsWith("blob:"))URL.revokeObjectURL(img.src);img.removeAttribute("src");img.hidden=true}
q("receiptArchiveOpen").onclick=async()=>{try{archiveClear();await archiveShow();if(archiveAllowed())q("receiptArchiveDialog").showModal()}catch(e){alert("Arşiv açılamadı.")}};
q("receiptArchiveClose").onclick=()=>q("receiptArchiveDialog").close();
q("receiptArchiveDialog").addEventListener("close",archiveClear);


function allowed(){return archiveAllowed()&&owner===currentUser?.id&&q("receiptDialog").open;}
function status(text){q("receiptStatus").textContent=text;}
const displayCents=cents=>money(cents/100);
const numberInput=cents=>cents===null?"":(cents/100).toFixed(2);
function control(type,label,value,change){
 const input=document.createElement("input");
 input.type=type;input.value=value;input.setAttribute("aria-label",label);
 if(type==="number"){input.min="0";input.step=label==="Miktar"?"0.001":"0.01";}
 input.oninput=()=>{change(input.value);check();};
 return input;
}
function draw(){
 const body=q("receiptRows");
 body.replaceChildren();
 for(const product of products){
  const row=document.createElement("tr");
  row.dataset.product=product.id;
  const append=(label,...children)=>{
   const cell=document.createElement("td");
   cell.dataset.label=label;cell.append(...children);row.append(cell);
  };
  const category=control("text","Kategori",product.category,v=>product.category=v);
  category.setAttribute("list","stmtCategoryChoices");
  const identity=control("text","Karşılaştırma adı",product.catalogName||"",v=>product.catalogName=v);
  identity.setAttribute("list","receiptKnownProducts");
  identity.placeholder="Karşılaştırma adı (isteğe bağlı)";
  append("Ürün",control("text","Ürün",product.name,v=>product.name=v),category,control("text","Marka",product.brand||"",v=>product.brand=v),identity);
  row.querySelector('[aria-label="Marka"]').placeholder="Marka (isteğe bağlı)";
  const quantity=control("number","Miktar",product.quantity,v=>product.quantity=Number(v));
  const unit=document.createElement("select");
  unit.setAttribute("aria-label","Birim");
  for(const value of ["adet","kg","gr","g","lt","l"])unit.add(new Option(value,value,false,product.unit===value));
  unit.onchange=()=>product.unit=unit.value;
  append("Miktar",quantity,unit,control("number","Birim fiyat",numberInput(product.unitPrice),v=>product.unitPrice=receiptCents(v)));
  const gross=control("number","Normal fiyat",numberInput(product.gross),v=>product.gross=receiptCents(v));
  const original=document.createElement("span");original.className="receipt-original";
  append("Normal fiyat",gross,original);
  const discount=control("number","Ürün indirimi",numberInput(product.discount),v=>product.discount=receiptCents(v));
  const saving=document.createElement("span");saving.className="receipt-saving";
  append("İndirim",discount,saving);
  const net=document.createElement("strong");net.className="receipt-product-net";
  append("Net fiyat",net);
  const del=document.createElement("button");
  del.type="button";del.className="ghost icon-action";del.setAttribute("aria-label","Ürünü kaldır");
  del.innerHTML='<svg aria-hidden="true"><use href="#icon-trash"/></svg>';
  del.onclick=()=>{
   products=products.filter(p=>p.id!==product.id);
   for(const adjustment of discounts){
    if(adjustment.productId===product.id)delete adjustment.productId;
    if(adjustment.target===String(product.id))delete adjustment.target;
   }
   draw();
  };
  append("",del);
  body.append(row);
 }
 const section=q("receiptDiscounts");
 section.replaceChildren();
 for(const discount of discounts){
  if(discount.productId)continue;
  const label=document.createElement("label");
  label.textContent=discount.label+" · "+displayCents(discount.cents);
  const select=document.createElement("select");
  select.add(new Option("Eşleştirme seç",""));
  select.add(new Option("Fiş geneline orantılı dağıt","receipt"));
  for(const product of products)select.add(new Option(product.name||"Adsız ürün",String(product.id)));
  select.add(new Option("Bilgi satırı olarak işaretle","ignore"));
  select.value=discount.target||"";
  select.onchange=()=>{discount.target=select.value;check();};
  label.append(select);
  section.append(label);
 }
 q("receiptDiscountReview").hidden=!section.children.length;
 check();
}
function check(){
 const total=receiptCents(q("receiptTotal").value), summary=receiptSummary(products,discounts,total);
 for(const product of summary.rows){
  const row=q("receiptRows").querySelector('[data-product="'+product.id+'"]');
  if(!row)continue;
  row.querySelector(".receipt-original").textContent=product.discount>0?displayCents(product.gross):"";
  row.querySelector(".receipt-saving").textContent=product.discount>0?"−"+displayCents(product.discount):"";
  row.querySelector(".receipt-product-net").textContent=displayCents(product.net);
 }
 q("receiptGross").textContent=displayCents(summary.gross);
 q("receiptSaved").textContent=displayCents(summary.discount);
 q("receiptNet").textContent=displayCents(summary.net);
 q("receiptPercent").textContent=new Intl.NumberFormat("tr-TR",{style:"percent",maximumFractionDigits:1}).format(summary.percent/100);
 const problems=[];
 if(!products.length)problems.push("Fiş ürünlerini ekle veya fişi yeniden oku.");
 if(products.some(p=>!p.name.trim()||!p.category.trim()||p.category.trim()===TRANSFER_CAT||
    !Number.isSafeInteger(p.gross)||p.gross<=0||!Number.isSafeInteger(p.discount)||p.discount<0||p.discount>p.gross||!(p.quantity>0))){
  problems.push("Ürün adı, tutar, miktar, indirim ve kategori alanlarını kontrol et.");
 }
 if(summary.unresolved.length)problems.push("Belirsiz indirimleri ürünlerle eşleştir veya fiş geneline dağıt.");
 if(total===null||total<=0)problems.push("Fişte yazan ödenecek toplamı gir.");
 else if(summary.net!==total)problems.push("Fiş ile ürünler arasındaki fark "+displayCents(total-summary.net)+".");
 const review=[...warnings];
 if(printedDiscount!==null&&summary.discount!==printedDiscount)review.push("Fişte belirtilen toplam indirim "+displayCents(printedDiscount)+".");
 if(products.some(p=>p.unitPrice!==null&&Math.round(p.quantity*p.unitPrice)!==p.gross)){
  review.push("Bazı ürünlerin miktarı ile birim fiyatı satır tutarını vermiyor.");
 }
 const reviewText=[...new Set(review)].join(" ");
 q("receiptReview").hidden=!reviewText;
 q("receiptReviewText").textContent=reviewText;
 if(reviewText&&!q("receiptReviewConfirm").checked)problems.push("Okuma uyarılarını fişle karşılaştır ve onayla.");
 if(!q("receiptStore").value.trim()||!q("receiptDate").value||!q("receiptAccount").value.trim())problems.push("Market, tarih ve hesap bilgilerini tamamla.");
 q("receiptCheck").textContent=summary.valid?"Toplam eşleşti":summary.unresolved.length?"İndirim onayı gerekli":"Doğrulama bekliyor";
 q("receiptCheck").dataset.valid=String(summary.valid);
 q("receiptHelp").textContent=problems.join(" ")||"Tutarlar doğrulandı. Ürünleri kontrol edip kaydedebilirsin.";
 q("receiptCommit").disabled=busy||!summary.valid||problems.length>0;
 return q("receiptCommit").disabled?null:summary;
}
function applyText(){
 const known=learned();
 const parsed=parseReceipt(q("receiptText").value,name=>category(name,known));
 products=parsed.products;discounts=parsed.discounts;warnings=parsed.issues;printedDiscount=parsed.printedDiscount;
 nextId=products.length+1;
 q("receiptTotal").value=numberInput(parsed.total);
 if(parsed.store)q("receiptStore").value=parsed.store;
 if(parsed.date)q("receiptDate").value=parsed.date;
 q("receiptReviewConfirm").checked=false;
 draw();
}
function showPreview(){
 const canvas=q("receiptPreview"),ctx=canvas.getContext("2d");
 q("receiptPhotoTools").hidden=!source;
 if(!source)return;
 rotated=rotateReceipt(source,turns);
 const ratio=Math.min(1,850/Math.max(rotated.width,rotated.height));
 canvas.width=Math.max(1,Math.round(rotated.width*ratio));canvas.height=Math.max(1,Math.round(rotated.height*ratio));
 ctx.drawImage(rotated,0,0,canvas.width,canvas.height);
 for(const [index,point] of corners.entries()){
  ctx.fillStyle="#005c4f";ctx.beginPath();ctx.arc(point.x*canvas.width,point.y*canvas.height,11,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="white";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.fillText(String(index+1),point.x*canvas.width,point.y*canvas.height);
 }
}
q("receiptPreview").onclick=event=>{
 if(!selecting||busy)return;
 const bounds=event.target.getBoundingClientRect();
 corners.push({x:(event.clientX-bounds.left)/bounds.width,y:(event.clientY-bounds.top)/bounds.height});
 if(corners.length===4){
  selecting=false;
  status("Belge köşeleri seçildi. Fotoğrafı okuyabilirsin.");
 }
 showPreview();
};
q("receiptRotate").onclick=()=>{turns++;corners=[];selecting=false;showPreview();};
q("receiptPerspective").onclick=()=>{
 corners=[];selecting=true;showPreview();
 status("Önizlemede köşeleri sol üstten başlayıp saat yönünde sırayla seç.");
};
q("receiptResetCorners").onclick=()=>{corners=[];selecting=false;showPreview();status("Köşe düzeltmesi kaldırıldı.");};
const photoAllowed=f=>f&&/^image\/(jpeg|png|webp)$/.test(f.type)&&f.size<=15*1024*1024;
q("receiptFile").onchange=async()=>{
 const version=++fileVersion,file=q("receiptFile").files[0];
 source=null;corners=[];turns=0;selecting=false;showPreview();
 if(!photoAllowed(file)){if(file)status("JPG, PNG veya WebP (en fazla 15 MB) seç.");return;}
 try{
  const image=await receiptSource(file);
  if(version!==fileVersion||!allowed())return;
  source=image;showPreview();
  status(receiptSharpness(image)<12?"Fotoğraf bulanık olabilir. Kenarları ve satırları yakından kontrol et.":"Fotoğraf hazır. Gerekirse döndür veya köşelerini düzelt.");
 }catch{status("Fotoğraf açılamadı. Başka bir görsel seç veya metni gir.");}
};
function openReceipt(){
 if(!archiveAllowed())return;
 owner=currentUser?.id;fileVersion++;ocrConfidence=null;
 const knownNames=new Set(FinanceRecords.list("receipt").flatMap(r=>r.value.lines.map(line=>line.catalogName||line.name)));
 q("receiptKnownProducts").replaceChildren(...[...knownNames].slice(-250).map(name=>new Option(name)));
 products=[];discounts=[];warnings=[];printedDiscount=null;nextId=1;source=null;corners=[];turns=0;selecting=false;
 for(const id of ["receiptFile","receiptText","receiptTotal","receiptDate","receiptStore","receiptAccount"])q(id).value="";
 q("receiptKeepPhoto").checked=false;q("receiptReviewConfirm").checked=false;
 q("receiptTextPanel").open=false;q("receiptMode").value="contrast";
 status("Fotoğraf seç veya fiş metnini yapıştır.");showPreview();draw();
 q("receiptDialog").showModal();
}
q("receiptOpen").onclick=openReceipt;
q("receiptScanShortcut").onclick=openReceipt;
q("receiptClose").onclick=()=>{if(!busy)q("receiptDialog").close();};
q("receiptDialog").addEventListener("cancel",event=>{if(busy)event.preventDefault();});
for(const id of ["receiptTotal","receiptStore","receiptAccount","receiptDate","receiptReviewConfirm"])q(id).oninput=check;
q("receiptAdd").onclick=()=>{
 products.push({id:nextId++,name:"",gross:null,discount:0,category:"Market",quantity:1,unit:"adet",unitPrice:null});
 draw();q("receiptRows").lastElementChild.querySelector("input").focus();
};
q("receiptParse").onclick=()=>{ocrConfidence=null;applyText();status("Metin ayrıştırıldı. Ürünleri ve toplamı kontrol et.");};
let tesseractScript;
function loadTesseract(){
 if(window.Tesseract)return Promise.resolve();
 return tesseractScript??=new Promise((resolve,reject)=>{
  const script=document.createElement("script");
  script.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
  script.onload=resolve;script.onerror=()=>{tesseractScript=null;reject(Error("OCR indirilemedi"));};
  document.head.append(script);
 });
}
q("receiptScan").onclick=async()=>{
 if(!allowed()||busy||!source)return;
 if(selecting){status("Dört köşeyi seç veya köşe düzeltmesini kaldır.");return;}
 busy=true;
 const controls=["receiptScan","receiptClose","receiptParse","receiptRotate","receiptPerspective","receiptResetCorners","receiptFile","receiptMode"];
 for(const id of controls)q(id).disabled=true;
 check();
 let worker;
 try{
  status("Türkçe OCR hazırlanıyor…");
  const image=enhanceReceipt(rectifyReceipt(rotated,corners),q("receiptMode").value);
  await loadTesseract();
  worker=await Tesseract.createWorker("tur+eng",1,{logger:data=>{
   if(allowed()&&data.status==="recognizing text")status("Fiş okunuyor · %"+Math.round(data.progress*100));
  }});
  await worker.setParameters({tessedit_pageseg_mode:Tesseract.PSM.SINGLE_BLOCK,preserve_interword_spaces:"1"});
  const result=await worker.recognize(image);
  if(!allowed())return;
  ocrConfidence=Number.isFinite(result.data.confidence)?result.data.confidence:null;
  q("receiptText").value=result.data.text;applyText();
  if(result.data.confidence<65){
   warnings.push("Fotoğraftaki metin düşük güvenle okundu. Fişi ve eşleşen indirimleri kontrol et.");
   check();
  }
  status(result.data.confidence<65?"Okuma güveni düşük. Orijinal veya gölge azaltma seçeneğini dene ve sonuçları karşılaştır.":"Okuma tamamlandı. Ürünleri fişle karşılaştır.");
 }catch(error){
  if(allowed())status(error.message?.startsWith("Dört")||error.message?.startsWith("İşaretlenen")?error.message:
   "Fotoğraf okunamadı. Bağlantıyı kontrol et, başka bir fotoğraf dene veya metni gir.");
 }finally{
  if(worker)await worker.terminate().catch(()=>{});
  busy=false;for(const id of controls)q(id).disabled=false;check();
 }
};
q("receiptCommit").onclick=async()=>{
 if(!allowed())return;
 const summary=check();
 if(!summary)return;
 const date=q("receiptDate").value,store=q("receiptStore").value.trim(),account=q("receiptAccount").value.trim();
 const paid=summary.rows.filter(row=>row.net>0);
 const signature=rows=>JSON.stringify(rows.map(r=>[learnedKey(r.name),r.net]).sort((a,b)=>a[0].localeCompare(b[0])||a[1]-b[1]));
 const groups=new Map();
 for(const transaction of state.transactions){
  if(transaction.date!==date||!String(transaction.note||"").startsWith("Fiş: ")||!String(transaction.description||"").startsWith(store+" · "))continue;
  const group=groups.get(transaction.note)||[];
  group.push({name:transaction.description.slice(store.length+3),net:Math.round(transaction.amount*100)});
  groups.set(transaction.note,group);
 }
 if([...groups.values()].some(g=>signature(g)===signature(paid))){
  status("Bu fiş daha önce kaydedilmiş görünüyor. Mevcut işlemleri kontrol et.");return;
 }
 if(!confirm(displayCents(summary.net)+" tutarında "+paid.length+" harcama kaydedilsin mi? Banka ekstresinde aynı harcama varsa çift kayıt oluşabilir."))return;
 const stamp=new Date().toISOString(),group=crypto.randomUUID();
 const note="Fiş: "+group+(summary.discount>0?" · Fiş tasarrufu "+displayCents(summary.discount):"");
 const file=q("receiptFile").files[0],who=archiveOwner(),keep=q("receiptKeepPhoto").checked;
 const previousTransactions=state.transactions,previousCategories=state.categories,previousStamp=state.settingsUpdatedAt;
 const transactionIds=new Map(paid.map(row=>[row.id,crypto.randomUUID()]));
 state.transactions=[...previousTransactions,...paid.map(row=>({
  id:transactionIds.get(row.id),type:"expense",amount:row.net/100,category:row.category.trim(),
  payment:"Diğer",cardName:account,description:store+" · "+row.name.trim(),note,date,updatedAt:stamp
 }))];
 state.categories=[...new Set([...previousCategories,...paid.map(row=>row.category.trim())])];
 state.settingsUpdatedAt=stamp;
 try{save(false);}catch{
  state.transactions=previousTransactions;state.categories=previousCategories;state.settingsUpdatedAt=previousStamp;
  status("Fiş kaydedilemedi. Cihaz depolamasını kontrol et ve yeniden dene.");return;
 }
 try{
  const lines=summary.rows.map(({id,name,brand,catalogName,code,quantity,unit,gross,unitPrice,discount,net})=>({
   id,name:name.trim(),brand:(brand||"").trim(),catalogName:(catalogName||"").trim(),code:code||"",quantity,unit,gross,unitPrice,discount,net,transactionId:transactionIds.get(id)||null
  }));
  FinanceRecords.put("receipt",{id:group,store,date,confidence:ocrConfidence,lines},group);
 }catch{render();v5Refresh();status("Giderler kaydedildi. Fiyat ayrıntıları cihazda saklanamadı.");return;}
 q("receiptDialog").close();render();v5Refresh();
 if(keep&&photoAllowed(file)){
  try{await archiveOp("readwrite",s=>s.put({id:who+":"+group,owner:who,date,store,blob:file}));v6Toast("Fiş ve fotoğraf kaydedildi.");}
  catch{v6Toast("Harcama kaydedildi. Fotoğraf saklanamadı.");}
 }else v6Toast(displayCents(summary.net)+" harcama kaydedildi.");
};
})();
