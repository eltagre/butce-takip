"use strict";

const FinanceAnalysis = (() => {
 const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
 const ratio=(a,b)=>b>0?a/b:null;
 const sum=values=>values.reduce((a,b)=>a+b,0);
 function months(transactions,keys){
  const buckets=new Map(keys.map(key=>[key,{key,income:0,expense:0,categories:new Map()}]));
  for(const t of transactions){
   const slice=buckets.get(String(t.date||"").slice(0,7));
   if(!slice||!(t.amount>0)||t.category==="Hesaplar Arası Transfer"||!["income","expense"].includes(t.type))continue;
   const cents=Math.round(t.amount*100);
   if(!Number.isSafeInteger(cents))continue;
   slice[t.type]+=cents;
   if(t.type==="expense")slice.categories.set(t.category,(slice.categories.get(t.category)||0)+cents);
  }
  return [...buckets.values()].map(row=>({...row,savings:ratio(row.income-row.expense,row.income)}));
 }
 function distribution(assets){
  const valid=assets.filter(a=>Number.isFinite(a.value)&&a.value>0);
  if(!valid.length||valid.length!==assets.length)return null;
  const total=sum(valid.map(a=>a.value));
  const shares=key=>{
   const map=new Map();
   for(const asset of valid){const label=asset[key]||"Belirtilmemiş";map.set(label,(map.get(label)||0)+asset.value/total);}
   return [...map].sort((a,b)=>b[1]-a[1]);
  };
  const weights=valid.map(a=>a.value/total);
  return {classes:shares("type"),currencies:shares("currency"),largest:Math.max(...weights),
   effective:1/sum(weights.map(w=>w*w)),liquidity:shares("liquidity")};
 }
 function health({periods,debt,liquid,budget,portfolio}){
  const complete=periods.length>=3&&periods.every(p=>p.income>0&&p.expense>0);
  const income=complete?sum(periods.map(p=>p.income))/periods.length:null;
  const expense=complete?sum(periods.map(p=>p.expense))/periods.length:null;
  const metrics=[
   ["Tasarruf oranı",25,complete?clamp((income-expense)/income/.20):null,"Üç tam ayın net tasarrufu / geliri. %20 ve üzeri tam puan.","Düzenli katkı hedefi belirle."],
   ["Borç yönetimi",20,complete&&debt!==null?clamp(1-debt/income/.40):null,"Aylık borç ödemesi / ortalama gelir. %40 ve üzeri sıfır puan.","Taksit toplamını ve pahalı borçları gözden geçir."],
   ["Acil durum fonu",20,complete&&liquid!==null?clamp(liquid/expense/6):null,"Likidite / ortalama aylık gider. Altı aylık gider tam puan.","Erişilebilir nakit rezervi oluştur."],
   ["Harcama disiplini",20,complete&&budget>0?sum(periods.map(p=>clamp(2-p.expense/budget)))/periods.length:null,"Son üç tam ayın harcaması, girilen aylık bütçeyle karşılaştırılır.","Sürekli aşılan kategorilerde limit belirle."],
   ["Portföy çeşitliliği",15,portfolio?(.5*clamp((portfolio.classes.length-1)/3)+.5*clamp((1-portfolio.largest)/.75)):null,
    "Varlık sınıfı sayısı ve en büyük pozisyonun payı eşit ağırlıklıdır.","Sınıf ve tek varlık yoğunlaşmasını izle."]
  ];
  const coverage=sum(metrics.filter(m=>m[2]!==null).map(m=>m[1]));
  const score=coverage===100?Math.round(sum(metrics.map(m=>m[1]*m[2]))):null;
  return {metrics,score,coverage};
 }
 function changes(current, history){
  if(!current||current.expense<=0||history.length!==3||history.some(p=>p.expense<=0))return [];
  return [...current.categories].flatMap(([name,cents])=>{
   const baseline=sum(history.map(p=>p.categories.get(name)||0))/history.length;
   return baseline>0&&cents>baseline?[{name,cents,baseline,increase:cents/baseline-1}]:[];
  }).sort((a,b)=>(b.cents-b.baseline)-(a.cents-a.baseline));
 }
 function wealth(snapshots){
  const usable=snapshots.filter(p=>p.total>0&&Number.isFinite(+p.total)).sort((a,b)=>a.date.localeCompare(b.date));
  if(usable.length<2)return null;
  const [first,last]=[usable[0],usable.at(-1)];
  const converted=key=>first[key]>0&&last[key]>0?(last.total/last[key])/(first.total/first[key])-1:null;
  let peak=0,drawdown=0;
  for(const point of usable){peak=Math.max(peak,+point.total);drawdown=Math.min(drawdown,point.total/peak-1);}
  return {first,last,try:last.total/first.total-1,usd:converted("usdtry"),gold:converted("gramGold"),btc:converted("btcTry"),drawdown};
 }
 function valuesRisk(points){
  if(points.length<7||points.some(value=>!(value>0)))return null;
  const returns=points.slice(1).map((value,i)=>value/points[i]-1);
  const average=sum(returns)/returns.length;
  const volatility=Math.sqrt(sum(returns.map(r=>(r-average)**2))/(returns.length-1))*Math.sqrt(12);
  let peak=0,drawdown=0;
  for(const value of points){peak=Math.max(peak,value);drawdown=Math.min(drawdown,value/peak-1);}
  return {volatility,drawdown};
 }
 function contributionPace(contributions,periodKeys){
  const valid=contributions.filter(c=>periodKeys.includes(c.date.slice(0,7))&&Number.isSafeInteger(c.amount)&&c.amount>0);
  if(new Set(valid.map(c=>c.date.slice(0,7))).size<2)return null;
  return sum(valid.map(c=>c.amount))/periodKeys.length;
 }
 return {months,ratio,distribution,health,changes,wealth,valuesRisk,contributionPace};
})();
if(typeof module!=="undefined")module.exports=FinanceAnalysis;
