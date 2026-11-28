"use strict";

const FinanceInsights = (() => {
 const {el,field,tool,metrics,pct,money,chart}=FinanceUI;
 const assets=()=>v8.assets.map(a=>({
  value:FinanceUI.currentPortfolioValue()===null?null:v8AssetValueTry(a),type:a.type,currency:a.currency||"TRY",
  liquidity:["cash","stock","fund","etf","gold","crypto","fx"].includes(a.type)?"Piyasada işlem gören / nakit":
   ["realestate","vehicle"].includes(a.type)?"Likit olmayan":"Sınıflandırılmadı"
 }));
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
   const rows=report.metrics.map(([label,weight,score,reason,action])=>{
    const section=el("section");section.append(el("h4",label+" · %"+weight),
     el("p",score===null?"Yetersiz veri":pct(score)+" kriter puanı"),el("p",reason),el("p",action));return section;
   });
   return [el("h3",report.score===null?"Kesin puan için veri eksik":report.score+" / 100 · "+band(report.score)),
    el("p","Değerlendirilebilen ağırlık: %"+report.coverage),...rows];
  },"Boş borç alanı borçsuzluk varsayımı yapmaz. Acil durum fonuna ev ve araç ekleme. Bu gösterge resmi kredi notu veya profesyonel risk derecesi değildir.");
  panel.append(card);
 }
 function analysis(){
  const panel=document.querySelector("#v8AnalysisPanel");
  const data=FinanceAnalysis.distribution(assets()), snapshots=FinanceAnalysis.wealth(v8.snapshots);
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
   goals.append(el("p",g.name+" · "+pct((g.current||0)/g.target)+" · Kalan "+money(FinanceMath.cents(gap))+
    (monthsLeft>=1?" · Getirisiz aylık ek katkı "+money(FinanceMath.cents(gap/Math.floor(monthsLeft))):"")));
  }
  if(!goals.childElementCount)goals.append(el("p","Hedef kaydı bulunamadı."));
  panel.replaceChildren(
   article("Portföy dağılımı",data?metrics([
    ...data.classes.map(([label,value])=>["Sınıf · "+label,pct(value)]),
    ...data.currencies.map(([label,value])=>["Para birimi · "+label,pct(value)]),
    ...data.liquidity.map(([label,value])=>[label,pct(value)]),
    ["En büyük pozisyon",pct(data.largest)],["Eşit ağırlık karşılığı",FinanceUI.number(data.effective,1)]
   ]):el("p","Geçerli fiyat ve kur bilgisine sahip portföy gerekiyor."),
   "Paylar TL değeriyle ağırlıklandırılır. Çeşitlilik ölçüsü, pozisyon paylarının kareleri toplamının tersidir."),
   article("Servet değişimi",snapshots?metrics(wealthRows):el("p","En az iki tarihli servet kaydı gerekiyor."),
   snapshots?snapshots.first.date+" – "+snapshots.last.date+". Tarihli fiyat varsa her uç o günün birimine çevrilir. Düşüş servet kayıtlarına aittir. Katkı ve fiyat etkisi ayrı ölçülmedikçe yatırım getirisi çıkarılmaz.":"Reel, BTC ve sermaye etkisi için tarihli fiyat, TÜFE ve sermaye hareketi gerekir."),
   article("Gelir ve gider",metrics([
    ["Bu ay tasarruf oranı",current.savings===null?"Gelir bilgisi yok":pct(current.savings)],
    ["Geçen aya göre fark",current.savings===null||last.savings===null?"Karşılaştırılamıyor":FinanceUI.number(100*(current.savings-last.savings),1)+" yüzde puan"],
    ...trends.slice(0,5).map(r=>[r.name,pct(r.increase)+" artış"]),
    ["Tanımlı düzenli gider",money(v7.recurring.filter(r=>r.type==="expense").reduce((s,r)=>s+FinanceMath.cents(r.amount),0))]
   ]),"Karşılaştırma her ayın aynı gününe kadar olan işlemlerle yapılır. Kategori artışı, önceki üç dönemin ortalamasına göre hesaplanır."),
   article("Aylık eğilim",chart(full,[{key:"income"},{key:"expense"}],p=>p.key+" · Gelir "+money(p.income)+" · Gider "+money(p.expense)),
    "Transferler hariç tutulur. İçinde bulunulan ay henüz tamamlanmamış olabilir."),
   article("Hedef ilerlemesi",goals,"İlerleme, birikmiş tutar / hedef tutarıdır. Gerçek katkı geçmişi yoksa tamamlanma tarihi tahmin edilmez.")
  );
 }
 return {health,analysis,badge};
})();
