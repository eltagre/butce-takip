"use strict";

const FinancePlanningUI = (() => {
 const {el,field,tool,metrics,chart,pct,money,number}=FinanceUI;
 const {cents}=FinanceMath;
 let propertyReport=null;
 const percentField=(key,label,value=0,min=-99.99)=>field(key,label,value,{min,max:1000});
 function property(){
  const toolCard=tool("Gayrimenkul yatırım analizi",[
   field("price","Satın alma bedeli (TL)",0),field("rent","Aylık kira (TL)",0),
   percentField("rentGrowth","Yıllık kira artışı (%)"),percentField("appreciation","Yıllık değer artışı (%)"),
   field("vacancy","Yıllık boş kalma (ay)",0,{max:12}),field("maintenance","Yıllık bakım ve aidat (TL)",0),
   field("tax","Yıllık vergi (TL)",0),field("closing","Satın alma giderleri (TL)",0),
   field("credit","Kredi tutarı (TL)",0),percentField("annual","Kredi nominal yıllık faizi (%)",0,0),
   field("term","Kredi vadesi (ay)",120,{min:1,max:600,step:1}),percentField("alternative","Alternatif yatırım yıllık getirisi (%)")
  ],v=>{
   const report=FinancePlanning.property({price:cents(v.price),rent:cents(v.rent),rentGrowth:v.rentGrowth/100,
    appreciation:v.appreciation/100,vacancy:+v.vacancy,annualCost:cents(v.maintenance)+cents(v.tax),
    closing:cents(v.closing),credit:cents(v.credit),annual:v.annual/100,term:+v.term,alternative:v.alternative/100});
   propertyReport=report;
   publishComparison();
   const points=report.years;
   const rows=[5,10,20].flatMap(year=>{
    const row=points[year-1];
    return [[year+" yıl · Gayrimenkul toplam kazancı",money(row.gain)],
     [year+" yıl · Alternatif kazanç",money(row.alternative-report.initial)]];
   });
   return [metrics([["Brüt kira getirisi",pct(report.gross/cents(v.price))],
    ["Net kira getirisi",pct(report.net/(cents(v.price)+cents(v.closing)))],
    ["Basit amortisman",report.amortization===null?"Pozitif gelir yok":number(report.amortization,1)+" yıl"],
    ["İlk yıl net nakit akışı",money(points[0].flow)],...rows]),
    chart(points,[{key:"propertyValue"},{key:"alternative"}],p=>p.year+". yıl · Gayrimenkul "+money(p.propertyValue)+" · Alternatif "+money(p.alternative)+" · Yıllık akış "+money(p.flow))];
  },"Yıllık giderler sabit varsayılır. Kredi eşit taksitlidir. Vergi ve satış giderlerinden yalnızca girilen giderler hesaba katılır. Karşılaştırma grafiğinde kira nakit akışı alternatif orandan yeniden değerlenir.");
  return toolCard;
 }
 function publishComparison(){
  const area=document.querySelector("#financePropertyCompare");
  if(!propertyReport)return;
  area.hidden=false;
  area.replaceChildren(el("h3","Gayrimenkul senaryosu"),metrics([5,10,20].map(year=>{
   const row=propertyReport.years[year-1];
   return [year+" yılda alternatifle fark",money(row.propertyValue-row.alternative)];
  })),el("p","Aynı öz sermaye ve yeniden değerlenen yıllık nakit akışları kullanılır. Bu senaryo geçmiş fiyatlarla yapılan backtestten ayrı hesaplanır."));
 }
 const schedules={
  debt:{title:"Borç ve kredi", fields:[
   ["name","Borç adı","",{type:"text"}],["principal","Kalan anapara (TL)",0],["annual","Nominal yıllık faiz (%)",0,{max:1000}],
   ["payment","Aylık taksit (TL)",0],["extra","Aylık ek erken ödeme (TL)",0],["date","İlk ödeme tarihi","",{type:"date"}]
  ]},
  card:{title:"Kredi kartı", fields:[
   ["name","Kart adı","",{type:"text"}],["cut","Hesap kesim tarihi","",{type:"date"}],["due","Son ödeme tarihi","",{type:"date"}],
   ["balance","Ekstre borcu (TL)",0],["minimum","Asgari ödeme (TL)",0],
   ["installment","Sonraki aylarda taksit (TL)",0],["months","Kalan taksit ayı",0,{max:120,step:1}]
  ]},
  passive:{title:"Pasif gelir takvimi", fields:[
   ["name","Gelir adı","",{type:"text"}],["date","Ödeme tarihi","",{type:"date"}],["amount","Tutar (TL)",0],
   ["type","Gelir türü","rent",{choices:{rent:"Kira",dividend:"Temettü",bond:"Eurobond kuponu",interest:"Faiz",other:"Diğer"}}],
   ["status","Durum","estimate",{choices:{estimate:"Tahmini",received:"Gerçekleşti"}}],
   ["repeat","Tekrar","once",{choices:{once:"Tek sefer",monthly:"Aylık · 12 ay"}}]
  ]}
 };
 function shiftDate(iso,offset){
  const [y,m,d]=iso.split("-").map(Number), base=new Date(Date.UTC(y,m-1+offset,1));
  const last=new Date(Date.UTC(base.getUTCFullYear(),base.getUTCMonth()+1,0)).getUTCDate();
  base.setUTCDate(Math.min(d,last));return base.toISOString().slice(0,10);
 }
 function scheduler(kind){
  const spec=schedules[kind],container=el("section");container.className="v8-card fi-tool";
  container.append(el("h3",spec.title));
  const form=el("form"), grid=el("div"), status=el("p"), list=el("div");
  grid.className="fi-fields";grid.append(...spec.fields.map(args=>field(...args)));
  const save=el("button","Planı kaydet");save.type="submit";save.className="primary";
  const clear=el("button","Yeni plan");clear.type="button";clear.className="ghost";
  let editing=null;
  clear.onclick=()=>{editing=null;form.reset();status.textContent="";};
  form.append(grid,save,clear,status);container.append(form,list);
  const amountFields={debt:["principal","payment","extra"],card:["balance","minimum","installment"],passive:["amount"]}[kind];
  form.onsubmit=event=>{
   event.preventDefault();
   try{
    const v=Object.fromEntries(new FormData(form));v.name=v.name.trim();
    if(!v.name)throw Error("Bir ad gir.");
    if(kind==="card"&&v.cut>v.due)throw Error("Son ödeme tarihi hesap kesiminden önce olamaz.");
    for(const name of amountFields)v[name]=cents(v[name]);
    if(kind==="card"&&v.minimum>v.balance)throw Error("Asgari ödeme ekstre borcunu aşamaz.");
    FinanceRecords.put(kind,v,editing||undefined);clear.click();draw();
   }catch(error){status.textContent=error.message;}
  };
  function draw(){
   const rows=FinanceRecords.list(kind).sort((a,b)=>(a.value.due||a.value.date).localeCompare(b.value.due||b.value.date));
   list.replaceChildren();
   if(!rows.length)list.append(el("p","Henüz plan bulunmuyor."));
   for(const record of rows){
    const v=record.value, section=el("section");section.className="fi-plan-row";
    section.append(el("h4",v.name));
    if(kind==="debt"){
     const inputs={principal:v.principal,annual:v.annual/100,payment:v.payment};
     const regular=FinancePlanning.loan(inputs), early=FinancePlanning.loan({...inputs,extra:v.extra});
     section.append(metrics([["Kalan anapara",money(v.principal)],["Aylık taksit",money(v.payment)],
      ["Yıllık faiz",pct(v.annual/100)],["Toplam geri ödeme",regular.settled?money(regular.total):"Taksit yetersiz veya 600 ayı aşıyor"],
      ["Erken ödeme toplamı",early.settled?money(early.total):"Kapanış hesaplanamadı"],
      ["Erken ödeme tasarrufu",regular.settled&&early.settled?money(regular.total-early.total):"—"]]));
     const details=el("details");details.append(el("summary","Ödeme takvimi · "+early.schedule.length+" ay"));
     const dates=el("ol");for(const row of early.schedule)dates.append(el("li",shiftDate(v.date,row.month-1)+" · "+money(row.paid)+" · Kalan "+money(row.balance)));
     details.append(dates);section.append(details);
    }else if(kind==="card"){
     section.append(metrics([["Hesap kesimi",v.cut],["Son ödeme",v.due],["Ekstre borcu",money(v.balance)],["Asgari ödeme",money(v.minimum)]]));
     const details=el("details");details.append(el("summary","Gelecek taksitler"));
     const dates=el("ul");
     for(let i=1;i<=Number(v.months);i++)dates.append(el("li",shiftDate(v.due,i)+" · "+money(v.installment)));
     if(!dates.childElementCount)dates.append(el("li","Taksit girilmedi."));
     details.append(dates);section.append(details);
     const transfer=el("button","Hesaplar arası ödeme aç");transfer.type="button";transfer.className="ghost";
     transfer.onclick=()=>{document.querySelector("#financePlanDialog").close();v5Show("finance");v7OpenTab("accounts");document.querySelector("#v7TransferAmount").value=(v.balance/100).toFixed(2);document.querySelector("#v7TransferFrom").focus();};
     section.append(transfer);
    }else{
     const entries=el("ul");
     for(let i=0;i<(v.repeat==="monthly"?12:1);i++)entries.append(el("li",shiftDate(v.date,i)+" · "+money(v.amount)+" · "+(!i&&v.status==="received"?"Gerçekleşti":"Tahmini")));
     const types=schedules.passive.fields.find(f=>f[0]==="type")[3].choices;
     section.append(el("p",types[v.type]),entries);
    }
    const edit=el("button","Düzenle"),del=el("button","Plandan kaldır");
    edit.type=del.type="button";edit.className=del.className="ghost";
    edit.onclick=()=>{editing=record.id;for(const [name,value] of Object.entries(v)){
     if(form.elements[name])form.elements[name].value=amountFields.includes(name)?value/100:value;
    }form.elements.name.focus();status.textContent="Plan düzenleniyor."};
    del.onclick=()=>{try{FinanceRecords.put(kind,null,record.id,true);clear.click();draw();}catch(error){status.textContent=error.message;}};
    section.append(edit,del);list.append(section);
   }
  }
  draw();
  return container;
 }
 function open(){
  document.querySelector("#financePlanContent").replaceChildren(
   el("p","Planlar tahmini veya gerçekleşmiş olarak izlenir. Kredi kartı ödemesi için hesaplar arası transfer kullanılır. Planlar işlem defterine otomatik yazılmaz."),
   ...Object.keys(schedules).map(scheduler));
  document.querySelector("#financePlanDialog").showModal();
 }
 return {property,open};
})();
