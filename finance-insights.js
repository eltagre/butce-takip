"use strict";

const FinanceInsights = (() => {
 const {el,field,tool,metrics,pct,money,chart}=FinanceUI;
 const assets=()=>{const priced=FinanceUI.currentPortfolioValue()!==null;return v8.assets.map(a=>({
  value:priced?v8AssetValueTry(a):null,type:v8TypeName(a.type),currency:a.currency||"TRY",
  liquidity:["cash","stock","fund","etf","gold","crypto","fx"].includes(a.type)?"Piyasada işlem gören / nakit":
   ["realestate","vehicle"].includes(a.type)?"Likit olmayan":"Sınıflandırılmadı"
 }));};
 const completeMonths=()=>[-3,-2,-1].map(offset=>shift(currentMonth(),offset));
 const article=(heading,body,method)=>{
  const node=el("section");node.className="v8-card fi-tool";
  node.append(el("h3",heading),body,el("p",method));return node;
 };
 const band=s=>s>=90?"Güçlü":s>=80?"Çok iyi":s>=60?"İyi":s>=40?"Orta":"Geliştirilmeli";
 function badge(score){
  const host=document.querySelector("#financeHealthBadge");host.hidden=!v86Modules().includes("health");
  host.querySelector("span").textContent=score===null?"—":String(score);
  host.querySelector("small").textContent=score===null?"Veri bekleniyor":band(score);
  host.style.setProperty("--score",score===null?"0%":score+"%");
 }
 function health(){
  const panel=document.querySelector("#v8HealthPanel");
  if(panel.childElementCount)return;
  const card=tool("Finansal sağlık",[
   field("debt","Aylık toplam borç ödemesi (TL)","",{optional:true}),field("liquid","Likit acil durum fonu (TL)","",{optional:true})
  ],v=>{
   const cents=value=>value===""?null:FinanceMath.cents(value);
   const report=FinanceAnalysis.health({periods:FinanceAnalysis.months(state.transactions,completeMonths()),
    debt:cents(v.debt),liquid:cents(v.liquid),budget:FinanceMath.cents(state.monthlyBudget),portfolio:FinanceAnalysis.distribution(assets())});
   badge(report.score);
   const save=el("button","Bu ayın puanını kaydet");
   save.className="ghost";save.type="button";save.disabled=report.score===null;
   save.onclick=()=>{
    try{FinanceRecords.put("health",{score:report.score}, "health:"+currentMonth());save.textContent="Puan kaydedildi";}
    catch(error){save.textContent=error.message;}
   };
   const history=FinanceRecords.list("health").map(r=>({month:r.id.slice(7),score:r.value.score})).sort((a,b)=>a.month.localeCompare(b.month));
   const historyView=history.length?chart(history,[{key:"score"}],p=>p.month+" · "+p.score+"/100"):el("p","Kaydedilmiş aylık puan yok.");
   const rows=report.metrics.map(([label,weight,score,reason,action])=>{
    const section=el("section");section.append(el("h4",label+" · %"+weight),
     el("p",score===null?"Yetersiz veri":pct(score)+" kriter puanı"),el("p",reason),el("p",action));return section;
   });
   return [el("h3",report.score===null?"Kesin puan için veri eksik":report.score+" / 100 · "+band(report.score)),
    el("p","Değerlendirilebilen ağırlık: %"+report.coverage),save,historyView,...rows];
  },"Boş borç alanı borçsuzluk varsayımı yapmaz. Acil durum fonuna ev ve araç ekleme. Bu gösterge resmi kredi notu veya profesyonel risk derecesi değildir.");
  panel.append(card);
 }
 function storedRisk(){
  if(!v8.assets.length||v8.assets.some(a=>!a.symbol||a.currency!=="TRY"||!(a.qty>0)))return null;
  const keys=Array.from({length:7},(_,i)=>shift(currentMonth(),i-7));
  const datePrices=v8.assets.map(a=>new Map(v8Series(a.symbol)));
  const dates=[...datePrices[0].keys()].filter(d=>datePrices.every(map=>map.has(d))).sort();
  const points=keys.map(month=>{
   const last=dates.findLast(date=>date.startsWith(month));
   return last?v8.assets.reduce((sum,a,i)=>sum+Number(a.qty)*datePrices[i].get(last),0):0;
  });
  return FinanceAnalysis.valuesRisk(points);
 }
 function datedBtc(snapshot){
  if(snapshot.btcTry>0)return snapshot.btcTry;
  const series=v8Series("BTC/TRY",new Date(Date.parse(snapshot.date)-7*86400000).toISOString().slice(0,10),snapshot.date);
  return series.at(-1)?.[1]||null;
 }
 function wealthTool(comparison){
  const card=tool("Reel servet ve ek sermaye",[
   field("inflation","Dönem toplam TÜFE değişimi (%)","",{optional:true,min:-99.99}),
   field("capital","Dönem net yeni sermaye (TL)","",{optional:true,min:-100000000000000})
  ],v=>{
   const before=Number(comparison.first.total),after=Number(comparison.last.total);
   return [metrics([
    ["Reel değişim",v.inflation===""?"Dönem TÜFE bilgisi gerekiyor":pct((after/before)/(1+FinanceMath.rate(v.inflation/100))-1)],
    ["Net yeni sermaye",v.capital===""?"Sermaye hareketi girilmedi":money(FinanceMath.cents(v.capital))],
    ["Sermaye sonrası nominal fark",v.capital===""?"Hesaplanamıyor":money(FinanceMath.cents(after-before-Number(v.capital)))]
   ])];
  },"Girilen net sermaye yatırma eksi çekmedir. Kalan nominal fark, işlem ücretleri ve değer değişimini içerebilir. Tarihli akışlar olmadan getiri oranı çıkarılmaz.");
  const lookup=el("button","TCMB TÜFE verisini getir");lookup.type="button";lookup.className="ghost";
  const status=el("p");status.setAttribute("role","status");
  lookup.onclick=async()=>{
   const owner=currentUser?.id;
   lookup.disabled=true;status.textContent="TÜFE yükleniyor…";
   try{
    const result=await v83Inflation(comparison.first.date,comparison.last.date);
    if(owner!==currentUser?.id||!card.isConnected)return;
    if(result.pct===null){status.textContent="Dönem TÜFE verisi bulunamadı. İstersen dönem oranını manuel gir.";return;}
    const form=card.querySelector("form");form.elements.inflation.value=result.pct;
    status.textContent="TCMB EVDS · "+(result.start||comparison.first.date)+" – "+(result.end||comparison.last.date);
    form.requestSubmit();
   }finally{lookup.disabled=false;}
  };
  card.querySelector("form").append(lookup,status);
  return card;
 }
 function analysis(){
  const panel=document.querySelector("#v8AnalysisPanel");
  const data=FinanceAnalysis.distribution(assets()), risk=storedRisk();
  const snapshots=FinanceAnalysis.wealth(v8.snapshots.filter(s=>Number.isFinite(Date.parse(s.date))).map(s=>({...s,btcTry:datedBtc(s)})));
  const keys=[...completeMonths(),currentMonth()];
  const day=Number(today().slice(8,10));
  const comparable=FinanceAnalysis.months(state.transactions.filter(t=>Number(String(t.date).slice(8,10))<=day),keys);
  const [current,last]=[comparable.at(-1),comparable.at(-2)];
  const trends=FinanceAnalysis.changes(current,comparable.slice(0,3));
  const full=FinanceAnalysis.months(state.transactions,keys);
  const wealthRows=snapshots?[
   ["TL",pct(snapshots.try)],["USD",snapshots.usd===null?"Kur yok":pct(snapshots.usd)],
   ["Gram altın",snapshots.gold===null?"Fiyat yok":pct(snapshots.gold)],["BTC",snapshots.btc===null?"Tarihli fiyat yok":pct(snapshots.btc)],
   ["Gözlenen en büyük düşüş",pct(snapshots.drawdown)]
  ]:[];
  const goals=el("div");
  for(const g of v7.goals.filter(g=>g.target>0)){
   const gap=Math.max(0,g.target-(g.current||0));
   const monthsLeft=g.date?Math.max(0,(Date.parse(g.date)-Date.now())/(30.4375*86400000)):0;
   const pace=FinanceAnalysis.contributionPace(FinanceRecords.list("goalContribution").map(r=>r.value).filter(r=>r.goalId===g.id),completeMonths());
   goals.append(el("p",g.name+" · "+pct((g.current||0)/g.target)+" · Kalan "+money(FinanceMath.cents(gap))+
    (monthsLeft>=1?" · Getirisiz aylık hedef katkısı "+money(FinanceMath.cents(gap/Math.floor(monthsLeft))):"")+
    (pace===null?" · Tahmin için katkı geçmişi eksik":" · Aylık hız "+money(pace)+" · Tahmini tarih "+FinanceUI.dateAfter(Math.ceil(FinanceMath.cents(gap)/pace)))));
  }
  if(!goals.childElementCount)goals.append(el("p","Hedef kaydı bulunamadı."));
  panel.replaceChildren(
   article("Portföy dağılımı",data?metrics([
    ...data.classes.map(([label,value])=>["Sınıf · "+label,pct(value)]),
    ...data.currencies.map(([label,value])=>["Para birimi · "+label,pct(value)]),
    ...data.liquidity.map(([label,value])=>[label,pct(value)]),
    ["En büyük pozisyon",pct(data.largest)],["Eşit ağırlık karşılığı",FinanceUI.number(data.effective,1)],
    ["Sabit portföy oynaklığı",risk?pct(risk.volatility):"En az 7 ay ortak TL fiyatı gerekli"],
    ["Sabit portföy düşüşü",risk?pct(risk.drawdown):"Veri eksik"]
   ]):el("p","Geçerli fiyat ve kur bilgisine sahip portföy gerekiyor."),
   "Paylar TL değeriyle ağırlıklandırılır. Çeşitlilik, pozisyon paylarının kareleri toplamının tersidir. Risk ölçümü bugünkü adetlerin yedi tam aydaki ortak ay sonu TL fiyatlarından hesaplanır, gerçek portföy performansı değildir."),
   article("Servet değişimi",snapshots?metrics(wealthRows):el("p","En az iki tarihli servet kaydı gerekiyor."),
   snapshots?snapshots.first.date+" – "+snapshots.last.date+". Tarihli fiyat varsa her uç o günün birimine çevrilir. Düşüş servet kayıtlarına aittir. Katkı ve fiyat etkisi ayrı ölçülmedikçe yatırım getirisi çıkarılmaz.":"Reel, BTC ve sermaye etkisi için tarihli fiyat, TÜFE ve sermaye hareketi gerekir."),
   ...(snapshots?[wealthTool(snapshots)]:[]),
   article("Gelir ve gider",metrics([
    ["Bu ay tasarruf oranı",current.savings===null?"Gelir bilgisi yok":pct(current.savings)],
    ["Geçen aya göre fark",current.savings===null||last.savings===null?"Karşılaştırılamıyor":FinanceUI.number(100*(current.savings-last.savings),1)+" yüzde puan"],
    ...trends.slice(0,5).map(r=>[r.name,pct(r.increase)+" artış"]),
    ["Tanımlı düzenli gider",money(v7.recurring.filter(r=>r.type==="expense").reduce((s,r)=>s+FinanceMath.cents(r.amount),0))]
   ]),"Karşılaştırma her ayın aynı gününe kadar olan işlemlerle yapılır. Kategori artışı, önceki üç dönemin ortalamasına göre hesaplanır."),
   article("Aylık eğilim",chart(full,[{key:"income"},{key:"expense"}],p=>p.key+" · Gelir "+money(p.income)+" · Gider "+money(p.expense)),
    "Transferler hariç tutulur. İçinde bulunulan ay henüz tamamlanmamış olabilir."),
   article("Hedef ilerlemesi",goals,"İlerleme, birikmiş tutar / hedef tutarıdır. Biriktirme hızı, son üç tam aydaki kayıtlı katkıların ortalamasıdır. En az iki katkılı ay gerekir ve tahmin getiri varsaymaz.")
  );
 }
 return {health,analysis,badge};
})();
