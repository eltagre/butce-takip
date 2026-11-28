"use strict";

const FinanceRecords = (() => {
 function merge(...lists){
  const records=new Map();
  for(const list of lists){
   for(const row of Array.isArray(list)?list:[]){
    if(!row||typeof row.id!=="string"||typeof row.kind!=="string"||!Number.isFinite(Date.parse(row.updatedAt)))continue;
    const prior=records.get(row.id);
    const order=prior?Date.parse(row.updatedAt)-Date.parse(prior.updatedAt):1;
    if(order>0||(order===0&&(row.deleted&&!prior.deleted||row.deleted===prior.deleted&&JSON.stringify(row)>JSON.stringify(prior))))records.set(row.id,row);
   }
  }
  return [...records.values()];
 }
 const envelope=records=>({version:1,records:merge(records).sort((a,b)=>a.id.localeCompare(b.id,"en"))});
 const read=value=>value?.version===1?merge(value.records):[];
 function put(kind,value,id=crypto.randomUUID(),deleted=false){
  const owner=localStorage.getItem(ownerMarker);
  if(owner&&currentUser?.id!==owner)throw Error("Yerel kayıtlar başka hesaba bağlı.");
  const prior=v83.financeV9;
  if(prior&&prior.version!==1)throw Error("Bu kayıt biçimi daha yeni bir Bütçem sürümü gerektiriyor.");
  const records=read(prior), previous=records.find(r=>r.id===id);
  const updatedAt=new Date(Math.max(Date.now(),previous?Date.parse(previous.updatedAt)+1:0)).toISOString();
  const stamp=v83.cloudUpdatedAt;
  v83.financeV9=envelope(merge(records,[{id,kind,value,updatedAt,deleted}]));
  try{v83Save();}catch(error){v83.financeV9=prior;v83.cloudUpdatedAt=stamp;throw error;}
  return id;
 }
 function validValue(kind,v){
  if(!v||typeof v!=="object")return false;
  const isDate=value=>typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value));
  const unsigned=(...values)=>values.every(n=>Number.isSafeInteger(n)&&n>=0);
  if(kind==="receipt")return typeof v.id==="string"&&typeof v.store==="string"&&Array.isArray(v.lines)&&
   v.lines.every(line=>line&&typeof line.name==="string"&&unsigned(line.net)&&
    (line.transactionId===null||typeof line.transactionId==="string"));
  if(kind==="health")return unsigned(v.score)&&v.score<=100;
  if(kind==="goalContribution")return typeof v.goalId==="string"&&isDate(v.date)&&unsigned(v.amount);
  if(typeof v.name!=="string")return false;
  if(kind==="debt")return isDate(v.date)&&unsigned(v.principal,v.payment,v.extra)&&Number(v.annual)>=0&&Number(v.annual)<=1000;
  if(kind==="card")return isDate(v.cut)&&isDate(v.due)&&unsigned(v.balance,v.minimum,v.installment,Number(v.months))&&Number(v.months)<=120;
  if(kind==="passive")return isDate(v.date)&&unsigned(v.amount);
  return false;
 }
 function list(kind){return read(v83.financeV9).filter(row=>row.kind===kind&&!row.deleted&&validValue(kind,row.value));}
 return {merge,envelope,read,put,list};
})();
if(typeof module!=="undefined")module.exports=FinanceRecords;
