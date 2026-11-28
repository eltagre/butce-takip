"use strict";

const FinancePlanning = (() => {
 const safe=value=>{
  if(!Number.isSafeInteger(value))throw RangeError("Tutar hesaplama sınırını aşıyor.");
  return value;
 };
 function loan({principal,annual,payment,extra=0,limit=600}){
  if(![principal,payment,extra].every(v=>Number.isSafeInteger(v)&&v>=0)||!Number.isFinite(annual)||annual<0||annual>10)
   throw RangeError("Kredi tutarlarını ve yıllık nominal faiz oranını kontrol et.");
  const rate=annual/12,schedule=[];
  let balance=principal,total=0,interestTotal=0;
  for(let month=1;month<=limit&&balance>0;month++){
   const interest=safe(Math.round(balance*rate)), due=safe(balance+interest), paid=Math.min(due,safe(payment+extra));
   if(paid<=interest)return {schedule,total,interest:interestTotal,balance,settled:false,negative:true};
   balance=due-paid;total=safe(total+paid);interestTotal=safe(interestTotal+interest);
   schedule.push({month,interest,paid,balance});
  }
  return {schedule,total,interest:interestTotal,balance,settled:balance===0,negative:false};
 }
 function paymentFor(principal,annual,months){
  if(!Number.isInteger(months)||months<1||months>600||!Number.isFinite(annual)||annual<0||annual>10)throw RangeError("Kredi vadesini ve yıllık faizini kontrol et.");
  const rate=annual/12;
  return safe(Math.ceil(rate?principal*rate/-Math.expm1(-months*Math.log1p(rate)):principal/months));
 }
 function property({price,rent,rentGrowth,appreciation,vacancy,annualCost,closing,credit=0,annual=0,term=120,alternative}){
  if(![price,rent,annualCost,closing,credit].every(v=>Number.isSafeInteger(v)&&v>=0)||
   !(price>0&&credit<=price)||!Number.isFinite(vacancy)||vacancy<0||vacancy>12)throw RangeError("Gayrimenkul ve kredi tutarlarını kontrol et.");
  for(const input of [rentGrowth,appreciation,alternative])if(!Number.isFinite(input)||input<=-1||input>10)throw RangeError("Varsayım oranları geçerli aralıkta olmalı.");
  const initial=safe(price+closing-credit);
  if(initial<=0)throw RangeError("Öz sermaye pozitif olmalı.");
  const debt=credit?loan({principal:credit,annual,payment:paymentFor(credit,annual,term)}):{schedule:[],settled:true};
  const gross=safe(rent*12), net=safe(Math.round(rent*(12-vacancy))-annualCost);
  let cash=0, reinvested=0;
  const years=Array.from({length:20},(_,i)=>{
   const year=i+1, paid=debt.schedule.slice(i*12,year*12).reduce((sum,row)=>sum+row.paid,0);
   const flow=safe(Math.round(rent*(12-vacancy)*(1+rentGrowth)**i)-annualCost-paid);
   cash=safe(cash+flow);reinvested=safe(Math.round(reinvested*(1+alternative)+flow));
   const remaining=debt.schedule[year*12-1]?.balance||0;
   const saleEquity=safe(Math.round(price*(1+appreciation)**year)-remaining);
   return {year,flow,cash,saleEquity,gain:safe(saleEquity+cash-initial),
    propertyValue:safe(saleEquity+reinvested),alternative:safe(Math.round(initial*(1+alternative)**year))};
  });
  return {initial,gross,net,years,amortization:net>0?(price+closing)/net:null,debt};
 }
 function plannedMonth(cards,month){
  return cards.filter(card=>String(card.due).startsWith(month)).reduce((sum,card)=>sum+card.balance,0);
 }
 return {loan,paymentFor,property,plannedMonth};
})();
if(typeof module!=="undefined")module.exports=FinancePlanning;
