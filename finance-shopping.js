"use strict";

const FinanceShopping = (() => {
 function canonical(text){
  return String(text||"").toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{Diacritic}/gu,"").replace(/ı/g,"i")
   .replace(/\b(?:litre|ltr|lt)\b/g,"l").replace(/\b(?:gram|gr)\b/g,"g").replace(/\bmililitre\b/g,"ml")
   .replace(/\bkilogram\b/g,"kg").replace(/\s+/g," ").trim();
 }
 function comparable(row){
  const raw=canonical(row.name), identity=canonical(row.catalogName), brand=canonical(row.brand);
  const packageSize=/(\d+(?:[,.]\d+)?)\s*(kg|g|ml|cl|l)\b/.exec(raw);
  const conversions={kg:[1,"kg"],g:[.001,"kg"],l:[1,"l"],ml:[.001,"l"],cl:[.01,"l"],adet:[1,"adet"]};
  const unit=canonical(row.unit), quantity=Number(row.quantity);
  let effective=quantity, converted=conversions[unit], name=raw;
  if(packageSize&&unit==="adet"){
   converted=conversions[packageSize[2]];
   effective*=Number(packageSize[1].replace(",","."));name=name.replace(packageSize[0]," ").trim();
  }
  if(!converted||!(effective>0)||!name||(!identity&&!brand&&!row.code))return null;
  const size=effective*converted[0];
  return {key:JSON.stringify([identity||(!brand&&row.code?"#"+row.code:name),brand,converted[1]]),size,unit:converted[1],price:row.net/size};
 }
 function activeLines(receipts,transactions){
  const transactionsById=new Map(transactions.filter(t=>t.type==="expense").map(t=>[t.id,t]));
  const unique=new Map();
  for(const receipt of receipts){
   const available=receipt.lines.filter(line=>line.transactionId&&transactionsById.has(line.transactionId));
   if(!available.length)continue;
   for(const line of receipt.lines){
    const t=line.transactionId?transactionsById.get(line.transactionId):transactionsById.get(available[0].transactionId);
    if(!t||line.transactionId&&unique.has(line.transactionId))continue;
    const net=line.transactionId?Math.round(t.amount*100):0;
    const prefix=receipt.store+" · ";
    const description=t.description||"";
    const edited=!!line.transactionId&&description!==prefix+line.name;
    const updated={...line,date:t.date,store:receipt.store,receiptId:receipt.id,confidence:receipt.confidence,net,
     gross:net!==line.net?null:line.gross,discount:net!==line.net?null:line.discount,
     name:edited?(description.startsWith(prefix)?description.slice(prefix.length):description||line.name):line.name,
     brand:edited?"":line.brand,quantity:edited?null:line.quantity,catalogName:edited?"":line.catalogName};
    unique.set(line.transactionId||receipt.id+":"+line.id,updated);
   }
  }
  return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
 }
 function basket(previous,current){
  const aggregate=rows=>{
   const groups=new Map();
   for(const row of rows){
    const entry=comparable(row);
    if(!entry||row.net<=0)continue;
    const group=groups.get(entry.key)||{quantity:0,cost:0};
    group.quantity+=entry.size;group.cost+=row.net;groups.set(entry.key,group);
   }
   return groups;
  };
  const base=aggregate(previous), latest=aggregate(current);
  const matched=[...base].filter(([key])=>latest.has(key));
  if(matched.length<3)return null;
  let oldCost=0,newCost=0;
  for(const [key,old] of matched){
   const now=latest.get(key);oldCost+=old.cost;newCost+=old.quantity*now.cost/now.quantity;
  }
  return {count:matched.length,change:newCost/oldCost-1};
 }
 return {canonical,comparable,activeLines,basket};
})();
if(typeof module!=="undefined")module.exports=FinanceShopping;
