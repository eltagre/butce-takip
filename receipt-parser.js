"use strict";

const receiptFold = value => String(value).toLocaleUpperCase("tr-TR").normalize("NFD")
 .replace(/\p{Diacritic}/gu,"").replace(/ı/g,"I").replace(/[^\p{L}\p{N}]+/gu," ").trim();
const receiptMoney = /(?<![\d.,])[-+−]?\s*(?:\d{1,3}(?:[. ]\d{3})+|\d{1,8})[,.]\s*\d{2}(?!\d)\s*-?/g;

function receiptCents(value) {
 const text=String(value).trim().replace(/[−–]/g,"-").replace(/\s/g,"");
 const sign=text.startsWith("-")||text.endsWith("-")?-1:1;
 const clean=text.replace(/^[+-]|-$/g,"");
 const parts=/^(\d{1,8}|\d{1,3}(?:\.\d{3})+)(?:[,.](\d{1,2}))?$/.exec(clean);
 if(!parts)return null;
 const cents=Number(parts[1].replaceAll(".",""))*100+Number((parts[2]||"").padEnd(2,"0"));
 return Number.isSafeInteger(cents)?sign*cents:null;
}

const receiptStores=[
 [/^(?:\d+\s+)?(?:MMM? )?MIGROS(?: JET)?\b/,"Migros"],[/^B I M\b|^BIM\b/,"BİM"],
 [/^A\s*101\b/,"A101"],[/^SOK\b/,"ŞOK"],[/^CARREFOUR\s*SA\b/,"CarrefourSA"],
 [/^FILE\b/,"FİLE"],[/^TARIM KREDI\b/,"Tarım Kredi"],[/^HAKMAR\b/,"Hakmar"],
 [/^METRO\b/,"Metro"],[/^ONUR\b/,"Onur"]
];
const receiptDiscount=/\b(?:INDIRIM\w*|ISKONTO\w*|KUPON\w*|KAMPANYA\w*|MONEY|BONUS|CLUB|SADAKAT|PROMOSYON\w*|COKLU|BEDAVA|AL \d+ ODE|TASARRUF\w*)\b/;
const receiptMeta=/^(?:TOP\s*KDV|KDV|ARA\s+TOP(?:LAM)?|NAKIT|KREDI|BANKA|BANKKART|KART(?:LA)?(?: ODEME)?|PARA USTU|POS|VISA|MASTERCARD|TEMASSIZ|ODEME|TARIH|SAAT|FIS|FATURA|BELGE|MERSIS|VKN|VERGI DAIRESI|TEL|ADRES|Z NO|EKU|TESEKKUR|SUBE|BARKOD)\b/;
const receiptSavings=/^(?:(?:GENEL|TOP|TOPLAM|KAMPANYA) )?(?:INDIRIM|ISKONTO|TASARRUF)(?:LER|INIZ|INIZI)?(?: TOPLAMI| TOPLAM| TUTARI)?$/;

function parseReceipt(text, category=()=>"Market") {
 const products=[], discounts=[], totals=[], savings=[], issues=[];
 let store="", date="", pendingName="", quantityLine=null, finished=false, columnHeader=false;
 const product=(name,gross,quantity=1,unit="adet",unitPrice=null,discount=0,code="")=>{
  const cleaned=name.replace(/^\s*(\d{6,14})\s+/,"").trim();
  products.push({id:products.length+1,name:cleaned,category:category(cleaned),quantity,unit,unitPrice,
   gross,discount,code:code||(/^\s*(\d{6,14})\s+/.exec(name)?.[1]||"")});
 };
 function applyQuantity(nextGross){
  if(!quantityLine)return null;
  const detail=quantityLine;
  quantityLine=null;
  const previous=products.at(-1);
  const previousMatches=previous&&previous.quantity===1&&previous.gross===detail.gross;
  const nextMatches=nextGross===detail.gross;
  if(previousMatches&&!nextMatches){
   const {quantity,unit,unitPrice}=detail;
   Object.assign(previous,{quantity,unit,unitPrice});
   return null;
  }
  if(nextMatches&&!previousMatches)return detail;
  issues.push("Bir miktar satırının hangi ürüne ait olduğunu kontrol et.");
  return null;
 }
 const quantityPattern=/^(\d+(?:[,.]\d{1,3})?)\s*(kg|gr|g|lt|l|ad(?:et)?)?\s*[x×*]\s*(\d+(?:[,.]\s*\d{2}))/i;
 for(const [index, raw] of text.split(/\r?\n/).entries()){
  const line=raw.trim().replace(/[−–]/g,"-"), label=receiptFold(line);
  if(!line)continue;
  const foundStore=receiptStores.find(([pattern])=>pattern.test(label));
  if(!store&&foundStore&&index<12){store=foundStore[1];continue;}
  const dm=/^(?:TAR[İI]H\s*[:.]?\s*)?(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?=\s|$)/i.exec(line);
  if(dm){
   const iso=[dm[3],dm[2].padStart(2,"0"),dm[1].padStart(2,"0")].join("-");
   const stamp=Date.parse(iso);
   if(Number.isFinite(stamp)&&new Date(stamp).toISOString().slice(0,10)===iso)date||=iso;
   pendingName="";continue;
  }
  if(/NORMAL FIYAT.*INDIRIM.*NET FIYAT/.test(label)){columnHeader=true;continue;}
  if(columnHeader){
   const columns=line.replace(/^\|\s*|\s*\|$/g,"").split(/\s*\|\s*|\t+/);
   if(columns.length===4&&/\p{L}/u.test(columns[0])){
    const [name,...amounts]=columns;
    const [gross,discount,net]=amounts.map(value=>receiptCents(value.replace(/\s*(?:TL|TRY|₺)\s*$/i,"")));
    if([gross,discount,net].every(Number.isSafeInteger)&&gross>=0&&discount>=0&&net>=0&&gross-discount===net){
     if(/^(?:GENEL )?TOPLAM$/.test(receiptFold(name))){totals.push({rank:2,cents:net});savings.push(discount);finished=true;}
     else if(!finished&&gross>0)product(name,gross,1,"adet",gross,discount);
    }else issues.push("Normal fiyat, indirim ve net fiyat sütunları uyuşmuyor.");
    pendingName="";continue;
   }
  }
  const values=[...line.matchAll(receiptMoney)];
  if(!values.length){
   const whole=/(?<=\s|\*)\d{1,8}(?=\s*(?:TL|TRY|₺)$)/i.exec(line);
   if(whole)values.push(whole);
  }
  const last=values.at(-1);
  const suffix=last?line.slice(last.index+last[0].length).trim():"";
  const hasAmount=!!last&&/^(?:TL|TRY|₺|[ABCD]|[%]\d{1,2})?$/i.test(suffix);
  const cents=hasAmount?receiptCents(last[0]):null;
  const prefix=hasAmount?line.slice(0,last.index).replace(/[\s:₺*|]+$/,"").replace(/\s*%\s*\d{1,2}\s*$/,"").trim():line;
  const head=receiptFold(prefix);
  const rank=/^(?:ODENECEK(?: TUTAR)?|GENEL TOPLAM|TOPLAM TUTAR|NET TOPLAM)$/.test(head)?2:/^(?:TOPLAM|TOP|TUTAR)$/.test(head)?1:0;
  if(rank){
   applyQuantity();
   if(cents!==null&&cents>=0){totals.push({rank,cents});finished=true;}
   pendingName="";continue;
  }
  const isSavings=receiptSavings.test(head)&&(finished||/^(?:TOPLAM|GENEL|TOP)\b|\bTOPLAMI\b|\bTASARRUF/.test(head));
  if(isSavings&&cents!==null){savings.push(Math.abs(cents));continue;}
  if((receiptMeta.test(head)&&!(receiptDiscount.test(head)&&/^(?:KART|KREDI KARTI|BANKA KARTI)\s/.test(head)))||/^(?:TOPLAM|TOP) KDV\b/.test(head)){
   pendingName="";continue;
  }
  if(cents!==null&&(cents<0||receiptDiscount.test(head))&&(!finished||receiptDiscount.test(head))){
   if(quantityLine&&products.at(-1)?.gross===quantityLine.gross)applyQuantity();
   if(cents!==0)discounts.push({id:"d"+index,label:prefix||"Fişteki eksi satır",cents:Math.abs(cents),position:products.length});
   pendingName="";continue;
  }
  if(finished)continue;
  const quantity=quantityPattern.exec(line)||quantityPattern.exec(prefix);
  if(quantity){
   const count=Number(quantity[1].replace(",","."));
   const unit=(quantity[2]||"adet").toLowerCase().replace(/^ad$/,"adet");
   const price=receiptCents(quantity[3]);
   const quantityInfo={quantity:count,unit,unitPrice:price,gross:Math.round(count*price)};
   const remainder=line.slice(quantity[0].length).trim();
   const name=remainder.replace(/^(?:[=|*]\s*)/,"").replace(receiptMoney,"").replace(/(?:TL|₺)\s*$/i,"").trim();
   const extended=values.length>=2&&hasAmount?cents:null;
   if(pendingName||/\p{L}/u.test(name)){
    product(pendingName||name,extended??quantityInfo.gross,count,unit,price);
    if(extended!==null&&extended!==quantityInfo.gross)issues.push("Miktar × birim fiyat, satır tutarından farklı.");
    pendingName="";
   }else{applyQuantity();quantityLine=quantityInfo;}
   continue;
  }
  const namedQuantity=/^(.+?)\s+(\d+(?:[,.]\d{1,3})?)\s*(kg|gr|g|lt|l|ad(?:et)?)?\s*[x×]\s*([0-9., ]+?)(?:\s+[=*]\s*([0-9., ]+))?\s*(?:TL|₺)?$/i.exec(line);
  if(namedQuantity&&receiptCents(namedQuantity[4])!==null){
   const [,name,count,unit="adet",price,amount]=namedQuantity, parsedCount=Number(count.replace(",","."));
   const unitPrice=receiptCents(price), computed=Math.round(parsedCount*unitPrice), extended=amount?receiptCents(amount):computed;
   product(name,extended,parsedCount,unit.toLowerCase(),unitPrice);
   if(extended!==computed)issues.push("Miktar × birim fiyat, satır tutarından farklı.");
   pendingName="";continue;
  }
  if(columnHeader&&values.length===3&&hasAmount){
   const [gross,discount,net]=values.map(v=>Math.abs(receiptCents(v[0])));
   const name=line.slice(0,values[0].index).replace(/[\s|]+$/,"");
   if(name&&gross-discount===net){product(name,gross,1,"adet",gross,discount);pendingName="";continue;}
   issues.push("Normal fiyat, indirim ve net fiyat sütunları uyuşmuyor.");
  }
  if(cents!==null&&cents>0&&(prefix||pendingName)){
   const name=prefix||pendingName;
   if(/\p{L}/u.test(name)){
    const detail=applyQuantity(cents);
    product(name,cents,detail?.quantity,detail?.unit,detail?.unitPrice??(detail?null:cents));
    pendingName="";continue;
   }
  }
  if(cents===null&&!receiptDiscount.test(head)&&/\p{L}/u.test(line)&&line.length<75)pendingName=line;
 }
 for(const discount of discounts){
  const label=receiptFold(discount.label);
  const explicit=products.filter(p=>receiptFold(p.name).length>=4&&(" "+label+" ").includes(" "+receiptFold(p.name)+" ")
   || p.code&&label.split(" ").includes(p.code));
  if(explicit.length===1&&explicit[0].id<=discount.position&&explicit[0].gross-explicit[0].discount>=discount.cents){
   explicit[0].discount+=discount.cents;discount.productId=explicit[0].id;
  }
 }
 const highest=totals.reduce((rank,total)=>Math.max(rank,total.rank),0);
 const payable=[...new Set(totals.filter(t=>t.rank===highest).map(t=>t.cents))];
 if(payable.length>1)issues.push("Fişte farklı ödenecek tutarlar okundu.");
 applyQuantity();
 return {store,date,products,discounts,total:payable.length===1?payable[0]:null,
  printedDiscount:savings.length&&new Set(savings).size===1?savings[0]:null,issues:[...new Set(issues)]};
}

function receiptSummary(products, discounts, total) {
 const rows=products.map(p=>({...p,net:p.gross-p.discount}));
 const unresolved=[];
 for(const discount of discounts){
  if(discount.productId||discount.target==="ignore")continue;
  const selected=rows.find(p=>String(p.id)===discount.target);
  if(selected&&selected.net>=discount.cents){selected.discount+=discount.cents;selected.net-=discount.cents;continue;}
  if(discount.target==="receipt"){
   const available=rows.reduce((sum,p)=>sum+Math.max(0,p.net),0);
   if(available>=discount.cents&&available>0){
    // Cumulative rounding keeps the final cent and preserves each product's available basis.
    let base=0, allocated=0;
    for(const row of rows){
     base+=Math.max(0,row.net);
     const share=Number(BigInt(base)*BigInt(discount.cents)/BigInt(available))-allocated;
     row.net-=share;row.discount+=share;allocated+=share;
    }
    continue;
   }
  }
  unresolved.push(discount);
 }
 const gross=rows.reduce((sum,p)=>sum+p.gross,0),net=rows.reduce((sum,p)=>sum+p.net,0);
 const valid=rows.length>0&&rows.every(p=>p.name.trim()&&Number.isSafeInteger(p.gross)&&Number.isSafeInteger(p.discount)&&
  p.gross>0&&p.discount>=0&&p.net>=0&&Number.isFinite(p.quantity)&&p.quantity>0)&&!unresolved.length&&
  Number.isSafeInteger(total)&&total>0&&net===total;
 return {rows,gross,net,discount:gross-net,percent:gross?100*(gross-net)/gross:0,unresolved,valid};
}

if(typeof module!=="undefined")module.exports={receiptCents,parseReceipt,receiptSummary};
