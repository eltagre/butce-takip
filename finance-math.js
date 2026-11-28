"use strict";

const FinanceMath = (() => {
 const cents = value => {
  if(!Number.isFinite(Number(value))||Math.abs(Number(value))>Number.MAX_SAFE_INTEGER/100)
   throw RangeError("Tutar geçerli aralıkta olmalı.");
  const text=String(value).trim();
  const decimal=/^([+-]?)(\d*)(?:\.(\d*))?$/.exec(text);
  if(!decimal||(!decimal[2]&&!decimal[3]))return Math.round(Number(value)*100);
  const [,sign,whole,fraction=""]=decimal;
  const amount=BigInt(whole||"0")*100n+BigInt(fraction.padEnd(2,"0").slice(0,2))+(Number(fraction[2])>=5?1n:0n);
  if(amount>BigInt(Number.MAX_SAFE_INTEGER))throw RangeError("Tutar geçerli aralıkta olmalı.");
  return (sign==="-"?-1:1)*Number(amount);
 };
 const rate = value => {
  if(!Number.isFinite(value)||value<=-1||value>10)throw RangeError("Yıllık oran −%100 ile %1000 arasında olmalı.");
  return value;
 };
 const monthly = annual => Math.expm1(Math.log1p(rate(annual))/12);
 const round = value => {
  if(!Number.isFinite(value)||Math.abs(value)>Number.MAX_SAFE_INTEGER)throw RangeError("Sonuç hesaplama sınırını aşıyor.");
  return Math.round(value);
 };
 function project({principal=0,contribution=0,annual=0,inflation=0,increase=0,months,timing="end",irregular={},stopAt=Infinity}){
  if(![principal,contribution].every(v=>Number.isSafeInteger(v)&&v>=0)||!Number.isInteger(months)||months<0||months>1200)
   throw RangeError("Tutarlar ve süre geçerli aralıkta olmalı.");
  const growth=1+monthly(annual), price=1+monthly(inflation);
  rate(increase);
  let balance=principal, invested=principal;
  const timeline=[{month:0,invested,balance,real:balance}];
  for(let month=1;month<=months&&balance<stopAt;month++){
   const payment=round(irregular[month]??(contribution*(1+increase)**Math.floor((month-1)/12)));
   if(payment<0)throw RangeError("Katkı negatif olamaz.");
   balance=timing==="start"?round((balance+payment)*growth):round(balance*growth+payment);
   invested=round(invested+payment);
   timeline.push({month,invested,balance,real:round(balance/price**month)});
  }
  const last=timeline.at(-1);
  return {...last,gain:last.balance-last.invested,timeline};
 }
 function target({principal,contribution,annual,target,months}){
  if(![principal,contribution,target].every(v=>Number.isSafeInteger(v)&&v>=0)||target===0||
     !Number.isInteger(months)||months<1||months>1200)throw RangeError("Hedef tutarını ve süreyi kontrol et.");
  const path=project({principal,contribution,annual,months:1200,stopAt:target}).timeline;
  const first=path.find(point=>point.balance>=target);
  const projected=payment=>project({principal,contribution:payment,annual,months}).balance;
  let low=0, high=target;
  if(projected(high)<target)return {required:null,reached:first?.month??null,progress:principal/target,gap:Math.max(0,target-principal)};
  while(low<high){
   const mid=Math.floor((low+high)/2);
   if(projected(mid)>=target)high=mid;else low=mid+1;
  }
  return {required:low,reached:first?.month??null,progress:principal/target,gap:Math.max(0,target-principal)};
 }
 function freedom({expenses,passive,principal,contribution,annual,withdrawal}){
  if(![expenses,passive,principal,contribution].every(v=>Number.isSafeInteger(v)&&v>=0)||
     !Number.isFinite(withdrawal)||withdrawal<=0||withdrawal>1)throw RangeError("Gider ve çekim oranını kontrol et.");
  const capital=Math.ceil(Math.max(0,expenses-passive)*12/withdrawal);
  const progress=capital?target({principal,contribution,annual,target:capital,months:1200}):{reached:0,progress:1};
  return {capital,covered:round(principal*withdrawal/12),...progress};
 }
 return {cents,monthly,rate,round,project,target,freedom,realRate:(nominal,inflation)=>(1+rate(nominal))/(1+rate(inflation))-1};
})();
if(typeof module!=="undefined")module.exports=FinanceMath;
