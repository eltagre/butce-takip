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
 const envelope=records=>({version:1,records:merge(records)});
 const read=value=>value?.version===1?merge(value.records):[];
 function put(kind,value,id=crypto.randomUUID(),deleted=false){
  const owner=localStorage.getItem(ownerMarker);
  if(owner&&currentUser?.id!==owner)throw Error("Yerel kayıtlar başka hesaba bağlı.");
  const prior=v83.financeV9, records=read(prior), previous=records.find(r=>r.id===id);
  const updatedAt=new Date(Math.max(Date.now(),previous?Date.parse(previous.updatedAt)+1:0)).toISOString();
  const stamp=v83.cloudUpdatedAt;
  v83.financeV9=envelope(merge(records,[{id,kind,value,updatedAt,deleted}]));
  try{v83Save();}catch(error){v83.financeV9=prior;v83.cloudUpdatedAt=stamp;throw error;}
  return id;
 }
 function list(kind){return read(v83.financeV9).filter(row=>row.kind===kind&&!row.deleted);}
 return {merge,envelope,read,put,list};
})();
if(typeof module!=="undefined")module.exports=FinanceRecords;
