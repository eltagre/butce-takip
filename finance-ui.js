"use strict";

const FinanceUI = (() => {
 const el=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const pct=value=>new Intl.NumberFormat("tr-TR",{style:"percent",maximumFractionDigits:1}).format(value);
 const money=value=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(value/100);
 const number=(value,digits=2)=>new Intl.NumberFormat("tr-TR",{maximumFractionDigits:digits}).format(value);
 const field=(key,label,value,options={})=>{
  const row=el("label",label);
  const input=el(options.choices?"select":"input");
  input.name=key;
  if(options.choices)for(const [value,title] of Object.entries(options.choices))input.add(new Option(title,value));
  else{
   input.type=options.type||"number";
   if(input.type==="number"){input.step=options.step||"any";input.min=options.min??0;if(options.max!==undefined)input.max=options.max;}
   input.required=!options.optional;
  }
  input.value=value??"";
  if(!options.choices)input.defaultValue=input.value;
  else if(input.selectedIndex>=0)input.options[input.selectedIndex].defaultSelected=true;
  row.append(input);
  return row;
 };
 function metrics(items){
  const list=el("dl");list.className="fi-metrics";
  for(const [label,value] of items){const cell=el("div");cell.append(el("dt",label),el("dd",value));list.append(cell);}
  return list;
 }
 function tool(title,fields,calculate,description="",actions=[]){
  const card=el("section");card.className="v8-card fi-tool";
  const form=el("form"),grid=el("div"),out=el("div"),button=el("button","Hesapla");
  grid.className="fi-fields";out.className="fi-output";out.setAttribute("aria-live","polite");
  button.type="submit";button.className="primary";grid.append(...fields);
  form.append(grid,...actions,button);
  card.append(el("h3",title));
  if(description)card.append(el("p",description));
  card.append(form,out);
  form.onsubmit=event=>{
   event.preventDefault();
   try{out.replaceChildren(...calculate(Object.fromEntries(new FormData(form))));}
   catch(error){out.replaceChildren(el("p",error.message));}
  };
  return card;
 }
 function chart(points,series,detail){
  const figure=el("figure"),ns="http://www.w3.org/2000/svg";
  const svg=document.createElementNS(ns,"svg"), caption=el("figcaption"), control=el("input");
  const w=640,h=190,pad=14;
  svg.setAttribute("viewBox","0 0 640 190");svg.setAttribute("aria-hidden","true");
  const values=points.flatMap(p=>series.map(s=>Number(p[s.key])));
  const min=Math.min(0,...values), span=Math.max(1,...values)-min;
  const x=i=>pad+i*(w-2*pad)/Math.max(1,points.length-1);
  const y=value=>h-pad-(value-min)*(h-2*pad)/span;
  const colors=["var(--chart-income)","var(--chart-expense)","var(--accent)"];
  for(const [index,s] of series.entries()){
   const path=document.createElementNS(ns,"polyline");
   path.setAttribute("points",points.map((p,i)=>x(i)+","+y(p[s.key])).join(" "));
   path.setAttribute("fill","none");path.setAttribute("stroke",colors[index]);path.setAttribute("stroke-width","2");
   if(index)path.setAttribute("stroke-dasharray","5 3");
   svg.append(path);
  }
  const marker=document.createElementNS(ns,"line");
  marker.setAttribute("y1",pad);marker.setAttribute("y2",h-pad);marker.setAttribute("stroke","currentColor");svg.append(marker);
  control.type="range";control.min=0;control.max=points.length-1;control.step=1;control.value=points.length-1;
  control.setAttribute("aria-label","Grafikte dönem seç");
  const update=index=>{control.value=index;marker.setAttribute("x1",x(index));marker.setAttribute("x2",x(index));caption.textContent=detail(points[index],index);};
  const pick=event=>{const box=svg.getBoundingClientRect();update(Math.max(0,Math.min(points.length-1,Math.round(((event.clientX-box.left)/box.width*w-pad)/(w-2*pad)*(points.length-1)))));};
  control.oninput=()=>update(Number(control.value));svg.onpointermove=pick;svg.onpointerdown=pick;
  update(points.length-1);figure.className="fi-chart";figure.append(svg,control,caption);
  return figure;
 }
 const monthsText=value=>value===null?"100 yıl içinde ulaşılamıyor":value===0?"Hedefe ulaşıldı":number(value,0)+" ay";
 function dateAfter(months){
  if(months===null)return "Hesaplanan ufukta yok";
  if(months===0)return "Bugün";
  const date=new Date(), now=date.getMonth();
  date.setDate(1);date.setMonth(now+months);
  return new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric"}).format(date);
 }
 const percentField=(key,label,value=0)=>field(key,label,value,{min:-99.99,max:1000});
 function simulation(){
  const panel=document.querySelector("#v8SimulationPanel");
  if(panel.childElementCount)return;
  const {cents,project,target,freedom}=FinanceMath;
  const investment=(initial=0)=>[field("principal","Başlangıç sermayesi",initial),field("contribution","Aylık katkı",0)];
  const rates=()=>[percentField("bear","Kötümser yıllık getiri (%)",-5),percentField("base","Baz yıllık getiri (%)",0),percentField("bull","İyimser yıllık getiri (%)",5)];
  const currency={TRY:"TL",USD:"USD",XAU:"Gram altın",BTC:"BTC"};
  const scenarios={bear:"Kötümser",base:"Baz",bull:"İyimser"};
  const usePortfolio=el("button","Portföy değerini al");usePortfolio.type="button";usePortfolio.className="ghost";
  usePortfolio.onclick=()=>{
   const input=usePortfolio.form.elements.principal, total=currentPortfolioValue();
   if(total===null){v6Toast("Portföyün güncel TL değeri doğrulanamıyor.");return;}
   input.value=total.toFixed(2);
  };
  const projection=tool("Servet projeksiyonu",[
   ...investment(),...rates(),percentField("inflation","Yıllık enflasyon (%)"),percentField("raise","Yıllık katkı artışı (%)"),
   field("years","Yıl",10,{min:1,max:100,step:1}),field("age","Başlangıç yaşı","",{optional:true,max:120}),
   field("timing","Katkı zamanı","end",{choices:{end:"Ay sonunda",start:"Ay başında"}}),
   field("unit","Görüntüleme birimi","TRY",{choices:currency}),
   field("futurePrice","Son yıl birim fiyatı varsayımı (TL)","",{optional:true}),
   field("irregular","Farklı katkılar (ay=tutar; ör. 3=1250,50;6=0)","",{type:"text",optional:true})
  ],v=>{
   const price=v.unit==="TRY"?1:Number(v.futurePrice);
   if(!(price>0))throw Error("Seçilen birim için son yıl fiyat varsayımı gerekiyor.");
   const duration=Number(v.years)*12, irregular={};
   for(const item of v.irregular.split(";").map(value=>value.trim()).filter(Boolean)){
    const match=/^(\d+)\s*=\s*(\d+(?:[,.]\d{1,2})?)$/.exec(item);
    if(!match||Number(match[1])<1||Number(match[1])>duration||Object.hasOwn(irregular,Number(match[1])))
     throw Error("Farklı katkıları benzersiz ay=tutar çiftleriyle, noktalı virgülle ayır.");
    irregular[Number(match[1])]=cents(match[2].replace(",","."));
   }
   const options={principal:cents(v.principal),contribution:cents(v.contribution),months:duration,inflation:v.inflation/100,increase:v.raise/100,timing:v.timing,irregular};
   const results=Object.entries(scenarios).map(([key,label])=>[label,project({...options,annual:v[key]/100})]);
   const base=results[1][1], points=base.timeline.filter(p=>p.month%12===0);
   const value=cents=>number(cents/100/price,v.unit==="BTC"?8:2)+" "+currency[v.unit];
   return [
    metrics(results.flatMap(([label,r])=>[[label+" nominal",value(r.balance)],[label+" reel",money(r.real)]])),
    metrics([["Yatırılan anapara",money(base.invested)],["Baz bileşik kazanç",money(base.gain)],["Kazanç / anapara",base.invested?pct(base.gain/base.invested):"—"]]),
    el("p","Grafik TL baz senaryosudur. Reel tutar bugünün TL alım gücüdür. Yabancı birimler yalnızca son yıl için girilen fiyatla çevrilir."),
    chart(points,[{key:"balance"},{key:"invested"}],p=>(p.month/12)+". yıl"+(v.age!==""?" · "+(+v.age+p.month/12)+" yaş":"")+" · Servet "+money(p.balance)+" · Anapara "+money(p.invested)+" · Reel "+money(p.real))
   ];
  },"Yıllık oranlar aylık bileşik eşdeğere çevrilir. Katkı artışı her 12 ayda bir uygulanır.",[usePortfolio]);
  const targetOptions={manual:"Manuel hedef",...Object.fromEntries(v7.goals.map(g=>["g:"+g.id,g.name]))};
  const targetTool=tool("Finansal hedef",[
   field("goal","Mevcut hedef","manual",{choices:targetOptions}),...investment(),...rates(),
   field("target","Hedef miktarı",1000000),field("unit","Hedef birimi","TRY",{choices:currency}),
   field("price","Hedef tarihindeki birim fiyatı (TL)","",{optional:true}),
   field("date","Hedef tarihi","",{type:"date"})
  ],v=>{
   const now=new Date(), due=new Date(v.date+"T00:00:00");
   if(!(due>now))throw Error("Gelecekte bir hedef tarihi seç.");
   const months=Math.max(1,(due.getFullYear()-now.getFullYear())*12+due.getMonth()-now.getMonth()-(due.getDate()<now.getDate()?1:0));
   const price=v.unit==="TRY"?1:Number(v.price);
   if(!(price>0))throw Error("Hedef birimi için fiyat varsayımı gerekli.");
   const results=Object.entries(scenarios).map(([key,label])=>[label,target({principal:cents(v.principal),contribution:cents(v.contribution),annual:v[key]/100,target:cents(v.target*price),months})]);
   const base=results[1][1];
   return [metrics([["İlerleme",pct(base.progress)],["Eksik sermaye",money(base.gap)],["Gereken aylık katkı",base.required===null?"Ulaşılamıyor":money(base.required)],["Baz tahmini tarih",dateAfter(base.reached)],...results.map(([label,r])=>[label,monthsText(r.reached)])])];
  },"Katkılar ay sonunda yapılır. Mevcut hedef seçimi, kayıt oluşturmadan tutar ve tarihi bu hesaba taşır.");
  const goalForm=targetTool.querySelector("form");
  goalForm.elements.goal.onchange=()=>{
   const selected=v7.goals.find(goal=>"g:"+goal.id===goalForm.elements.goal.value);if(!selected)return;
   goalForm.elements.target.value=selected.target;goalForm.elements.principal.value=selected.current||0;
   goalForm.elements.date.value=selected.date||"";goalForm.elements.unit.value="TRY";
  };
  const liberty=tool("Finansal özgürlük",[
   ...investment(),field("expenses","Aylık yaşam gideri",""),field("passive","Düzenli aylık pasif gelir",0),
   percentField("annual","Beklenen yıllık reel getiri (%)"),
   field("withdrawal","Çekim oranı (%)",3.5,{min:.1,max:100}),field("age","Mevcut yaş","",{optional:true,max:120})
  ],v=>{
   const opts={principal:cents(v.principal),contribution:cents(v.contribution),expenses:cents(v.expenses),passive:cents(v.passive),annual:v.annual/100};
   const r=freedom({...opts,withdrawal:v.withdrawal/100});
   return [metrics([["Gerekli sermaye",money(r.capital)],["Sermayenin aylık karşılığı",money(r.covered)],
    ["İlerleme",pct(r.progress)],["Kalan süre",monthsText(r.reached)],
    ["Tahmini yaş",v.age!==""&&r.reached!==null?number(+v.age+r.reached/12,1):"—"],
    ...[3,3.5,4].map(rate=>["%"+number(rate,1)+" çekim",money(freedom({...opts,withdrawal:rate/100}).capital)])])];
  },"Bugünün TL alım gücü ve sabit reel katkı kullanılır. Çekim oranları garantili veya risksiz değildir.");
  panel.append(projection,targetTool,liberty,FinancePlanningUI.property());
 }
 function currentPortfolioValue(){
  if(!v8.assets.length)return null;
  const requiresFx=v8.assets.some(a=>a.currency==="USD");
  if(requiresFx&&(!(v8.rates.usdtry>0)||!v8.market?.fxUpdatedAt||!(Math.abs(Date.now()-Date.parse(v8.market.fxUpdatedAt))<=7*86400000)))return null;
  if(v8.assets.some(a=>!(a.qty>0&&a.price>0)||!["USD","TRY"].includes(a.currency||"TRY")||a.marketUpdatedAt&&!(Math.abs(Date.now()-Date.parse(a.marketUpdatedAt))<=7*86400000)))return null;
  return v8TotalTry();
 }
 return {el,field,metrics,tool,chart,pct,money,number,simulation,currentPortfolioValue,dateAfter};
})();
