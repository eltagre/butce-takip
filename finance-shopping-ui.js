"use strict";

function openShoppingAnalysis(){
 const {el,field,tool,metrics,money,pct,chart,number}=FinanceUI;
 const panel=document.querySelector("#financeShoppingContent");
 const receipts=FinanceRecords.list("receipt").map(r=>r.value);
 const lines=FinanceShopping.activeLines(receipts,state.transactions);
 const options={all:"Ürün seç"};
 const products=new Map();
 for(const row of lines){
  const item=FinanceShopping.comparable(row);
  if(!item)continue;
  if(!products.has(item.key))options[item.key]=row.name+(row.brand?" · "+row.brand:"");
  const group=products.get(item.key)||[];group.push({...item,...row});products.set(item.key,group);
 }
 const calc=tool("Alışveriş analizi",[
  field("month","Ay",selectedMonth,{type:"month"}),field("product","Karşılaştırılabilir ürün","all",{choices:options})
 ],v=>{
  const rows=lines.filter(r=>r.date.startsWith(v.month));
  if(!rows.length)return [el("p","Bu ay için yapılandırılmış fiş bulunamadı. Fiş tarayıcıdan onaylanan yeni fişler burada görünür.")];
  const sum=(items,key)=>items.reduce((total,item)=>total+(item[key]||0),0);
  const group=(items,key,value)=>{
   const map=new Map();for(const item of items)map.set(item[key],(map.get(item[key])||0)+(item[value]||0));
   return [...map].sort((a,b)=>b[1]-a[1]);
  };
  const count=new Set(rows.map(r=>r.receiptId)).size, total=sum(rows,"net");
  const basket=FinanceShopping.basket(lines.filter(r=>r.date.startsWith(shift(v.month,-1))),rows);
  const result=[
   metrics([["Fişli market harcaması",money(total)],["Doğrulanmış indirim",money(sum(rows,"discount"))],
    ["Ortalama fiş",money(total/count)],["Fiş sayısı",String(count)],
    ["Kişisel sepet enflasyonu",basket?pct(basket.change)+" · "+basket.count+" ürün":"En az 3 ortak ürün gerekiyor"]]),
   el("p","Sepet, önceki ayın karşılaştırılabilir ürün miktarlarını sabit tutar. Bilinmeyen indirimler toplama dahil edilmez."),
   el("h4","Market dağılımı"),metrics(group(rows,"store","net").map(([k,c])=>[k,money(c)])),
   el("h4","En sık görülen ürünler"),metrics(group(rows.map(r=>({...r,line:1})),"name","line").slice(0,8).map(([k,n])=>[k,n+" satır"]))
  ];
  const history=products.get(v.product);
  if(history?.length){
   const latest=new Map();
   for(const row of history.filter(r=>r.date.startsWith(v.month)))latest.set(row.store,row);
   const values=[...latest.values()];
   result.push(el("h4",options[v.product]),chart(history,[{key:"price"}],p=>p.date+" · "+p.store+" · "+money(p.price)+"/"+p.unit),
    el("p","Yalnızca aynı doğrulanmış ad, marka ve ölçü ailesi eşleştirilir. Farklı yazımlar için fiş önizlemesinde ad ve markayı eşitle."),
    metrics(values.map(r=>[r.store+" · "+r.date,money(r.price)+"/"+r.unit])));
   if(values.length>1)result.push(el("p","Marketler arası birim fiyat farkı: "+money(Math.max(...values.map(r=>r.price))-Math.min(...values.map(r=>r.price)))+"/"+values[0].unit));
  }
  return result;
 },"Geçmiş bütçe kayıtları korunur. Yapılandırılmış fiyat geçmişi yeni fiş kaydıyla başlar.");
 panel.replaceChildren(calc);calc.querySelector("form").requestSubmit();
 document.querySelector("#financeShoppingDialog").showModal();
}
