"use strict";

function openFinanceReport(){
 const {el,field,metrics,money,pct}=FinanceUI;
 const host=document.querySelector("#financeReportContent");
 const form=el("form"), month=field("month","Rapor ayı",selectedMonth,{type:"month"});
 const output=el("article"), print=el("button","Yazdır / PDF olarak kaydet");
 output.id="financeReportPrint";print.type="button";print.className="primary";print.onclick=()=>window.print();
 const choices={budget:"Gelir, gider ve tasarruf",categories:"Kategori dağılımı",wealth:"Servet değişimi",
  portfolio:"Portföy dağılımı",health:"Finansal sağlık",goals:"Hedef ilerlemesi"};
 form.append(month);
 const options=el("fieldset");options.className="fi-report-options";options.append(el("legend","Rapor bölümleri"));
 for(const [key,text] of Object.entries(choices)){
  const label=el("label"), input=el("input");input.type="checkbox";input.name=key;input.checked=true;
  label.append(input,document.createTextNode(" "+text));options.append(label);
 }
 form.append(options);
 function renderReport(){
  const values=Object.fromEntries(new FormData(form)),month=values.month;
  if(!/^\d{4}-\d{2}$/.test(month)){output.replaceChildren(el("p","Rapor ayını seç."));print.disabled=true;return;}
  print.disabled=false;
  const [period]=FinanceAnalysis.months(state.transactions,[month]);
  const snapshots=v8.snapshots.filter(s=>s.date.startsWith(month)).sort((a,b)=>a.date.localeCompare(b.date));
  const wealth=FinanceAnalysis.wealth(snapshots);
  const snapshot=snapshots.at(-1);
  const allocation=FinanceAnalysis.distribution((snapshot?.breakdown||[]).map(a=>({type:v8TypeName(a.type),value:a.valueTry})));
  const health=FinanceRecords.list("health").find(row=>row.id==="health:"+month)?.value;
  const add=(key,rows,empty)=>{
   if(!values[key])return;
   const section=el("section");section.append(el("h3",choices[key]),rows.length?metrics(rows):el("p",empty));
   output.append(section);
  };
  output.replaceChildren(el("h2","Bütçem · Aylık finans raporu"),el("p",mname(month)));
  if(month===currentMonth())output.append(el("p","Bu ay henüz tamamlanmadı."));
  add("budget",[["Gelir",money(period.income)],["Gider",money(period.expense)],
   ["Net",money(period.income-period.expense)],["Tasarruf oranı",period.savings===null?"Yetersiz gelir bilgisi":pct(period.savings)]]);
  add("categories",[...period.categories].sort((a,b)=>b[1]-a[1]).map(([name,value])=>[name,money(value)]),"Bu ay kategori harcaması yok.");
  add("wealth",wealth?[["İlk ve son kayıt",wealth.first.date+" – "+wealth.last.date],["TL değişim",pct(wealth.try)],
   ["USD değişim",wealth.usd===null?"Tarihli kur yok":pct(wealth.usd)],["Altın değişim",wealth.gold===null?"Tarihli fiyat yok":pct(wealth.gold)]]:[],"Ay içinde iki servet kaydı gerekiyor.");
  add("portfolio",allocation?allocation.classes.map(([name,p])=>[name,pct(p)]):[],"Ayın son servet kaydında portföy dağılımı yok.");
  add("health",health?[["Kaydedilen puan",health.score+" / 100"]]:[],"Bu ay için kaydedilmiş puan yok.");
  if(values.goals)output.append(el("p","Hedefler aşağıda bugünkü durumlarıyla gösterilir."));
  add("goals",v7.goals.filter(g=>g.target>0).map(g=>[g.name,pct((g.current||0)/g.target)]),"Kayıtlı hedef yok.");
 }
 form.oninput=renderReport;host.replaceChildren(form,print,output);renderReport();
 document.querySelector("#financeReportDialog").showModal();
}
