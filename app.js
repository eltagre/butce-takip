const KEY="butcem_v1";
const DATA_VERSION=3;
const DEFAULT_CATS=["Kahve","Yemek","Market","Benzin","Alışveriş","Eğlence","Ulaşım","Fatura","Sağlık","Diğer"];
const $=s=>document.querySelector(s);
function currentMonth(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
let selectedMonth=currentMonth();
function normalize(raw){
  const s=(raw&&typeof raw==="object")?raw:{};
  return {dataVersion:DATA_VERSION,transactions:Array.isArray(s.transactions)?s.transactions:[],monthlyBudget:Number(s.monthlyBudget)||0,categories:Array.isArray(s.categories)&&s.categories.length?s.categories:DEFAULT_CATS,lastBackupAt:s.lastBackupAt||null};
}
function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)))}catch(e){return normalize(null)}}
let state=load();
function save(){state.dataVersion=DATA_VERSION;localStorage.setItem(KEY,JSON.stringify(state));render()}
function money(n){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2}).format(n||0)}
function today(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function shift(mk,n){let [y,m]=mk.split("-").map(Number),d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function mname(mk){let [y,m]=mk.split("-").map(Number);return new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))}
function day(s){return Number(s.slice(8,10))}
function download(name,text,type){let b=new Blob([text],{type}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function openTxn(type){$("#txnType").value=type;$("#txnTitle").textContent=type==="expense"?"Harcama ekle":"Gelir ekle";$("#amount").value="";$("#description").value="";$("#date").value=today();let cats=type==="expense"?state.categories:["Aile Desteği","Maaş","Burs","Yatırım Getirisi","Satış","Diğer Gelir"];$("#category").innerHTML="";cats.forEach(c=>{let o=document.createElement("option");o.textContent=c;$("#category").appendChild(o)});$("#payment").disabled=type==="income";$("#txnDialog").showModal()}
$("#expenseBtn").onclick=()=>openTxn("expense");$("#fab").onclick=()=>openTxn("expense");$("#incomeBtn").onclick=()=>openTxn("income");$("#cancelTxn").onclick=()=>$("#txnDialog").close();
$("#txnForm").onsubmit=e=>{e.preventDefault();let amount=Number($("#amount").value);if(!(amount>0))return;state.transactions.push({id:(crypto.randomUUID?crypto.randomUUID():Date.now()+""+Math.random()),type:$("#txnType").value,amount,category:$("#category").value,payment:$("#txnType").value==="income"?"Gelir":$("#payment").value,description:$("#description").value.trim(),date:$("#date").value});save();$("#txnDialog").close()};
$("#prev").onclick=()=>{selectedMonth=shift(selectedMonth,-1);render()};$("#next").onclick=()=>{let n=shift(selectedMonth,1);if(n<=currentMonth()){selectedMonth=n;render()}};
$("#settingsBtn").onclick=()=>{$("#monthlyBudget").value=state.monthlyBudget||"";$("#categoriesText").value=state.categories.join(", ");updateBackupStatus();$("#settingsDialog").showModal()};$("#cancelSettings").onclick=()=>$("#settingsDialog").close();
$("#settingsForm").onsubmit=e=>{e.preventDefault();state.monthlyBudget=Math.max(0,Number($("#monthlyBudget").value)||0);let c=$("#categoriesText").value.split(",").map(x=>x.trim()).filter(Boolean);if(c.length)state.categories=[...new Set(c)];save();$("#settingsDialog").close()};

function backupObject(){return {app:"Butcem",format:"butcem-backup",backupVersion:1,createdAt:new Date().toISOString(),data:normalize(state)}}
$("#fullBackupBtn").onclick=()=>{let obj=backupObject();state.lastBackupAt=obj.createdAt;localStorage.setItem(KEY,JSON.stringify(state));download(`butcem-tam-yedek-${today()}.json`,JSON.stringify(obj,null,2),"application/json;charset=utf-8");updateBackupStatus()};
$("#restoreBtn").onclick=()=>$("#restoreFile").click();
$("#restoreFile").onchange=async e=>{
 const f=e.target.files[0];if(!f)return;
 try{
   const parsed=JSON.parse(await f.text());
   if(parsed.format!=="butcem-backup"||!parsed.data||!Array.isArray(parsed.data.transactions))throw new Error();
   const safety=backupObject();
   download(`butcem-geri-yukleme-oncesi-guvenlik-${today()}.json`,JSON.stringify(safety,null,2),"application/json;charset=utf-8");
   if(!confirm(`Yedekte ${parsed.data.transactions.length} işlem bulundu. Mevcut verilerin yerine bu yedek geri yüklensin mi? Önce mevcut verilerin güvenlik kopyası indirildi.`)){e.target.value="";return}
   state=normalize(parsed.data);save();updateBackupStatus();alert("Yedek başarıyla geri yüklendi.");
 }catch(err){alert("Bu dosya geçerli bir Bütçem tam yedeği değil.");}
 e.target.value="";
};

$("#csvImportBtn").onclick=()=>$("#csvImportFile").click();

function parseCSV(text){
  text=text.replace(/^\ufeff/,"");
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c==='"'){
      if(quoted && n==='"'){field+='"';i++;}
      else quoted=!quoted;
    }else if(c===',' && !quoted){row.push(field);field="";}
    else if((c==='\n'||c==='\r') && !quoted){
      if(c==='\r'&&n==='\n')i++;
      row.push(field); field="";
      if(row.some(x=>x!==""))rows.push(row);
      row=[];
    }else field+=c;
  }
  if(field!==""||row.length){row.push(field);rows.push(row)}
  return rows;
}
function normHeader(s){return String(s||"").trim().toLocaleLowerCase("tr-TR").replace(/\s+/g," ")}
function parseAmount(v){
  let s=String(v??"").trim().replace(/[₺\s]/g,"");
  if(s.includes(",") && s.includes(".")) s=s.replace(/\./g,"").replace(",",".");
  else if(s.includes(",")) s=s.replace(",",".");
  return Number(s);
}
$("#csvImportFile").onchange=async e=>{
  const f=e.target.files[0]; if(!f)return;
  try{
    const rows=parseCSV(await f.text());
    if(rows.length<2)throw new Error("CSV boş");
    const headers=rows[0].map(normHeader);
    const idx=(...names)=>{for(const n of names){let i=headers.indexOf(normHeader(n));if(i>=0)return i}return -1};
    const di=idx("Tarih","Date"), ti=idx("Tür","Tip","Type"), ci=idx("Kategori","Category"),
          ai=idx("Tutar","Amount"), pi=idx("Ödeme","Ödeme Yöntemi","Payment"),
          xi=idx("Açıklama","Description"), ni=idx("Not","Note"), cardi=idx("Kart","Kart Adı","Card Name");
    if(di<0||ai<0)throw new Error("Tarih/Tutar sütunu bulunamadı");
    const imported=[];
    for(const r of rows.slice(1)){
      const date=String(r[di]||"").trim(), amount=parseAmount(r[ai]);
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!(amount>0))continue;
      let rawType=ti>=0?normHeader(r[ti]):"expense";
      let type=(rawType.includes("gelir")||rawType==="income")?"income":"expense";
      imported.push({
        id:(crypto.randomUUID?crypto.randomUUID():Date.now()+""+Math.random()),
        type, amount,
        category:(ci>=0&&r[ci])?String(r[ci]).trim():(type==="income"?"Diğer Gelir":"Diğer"),
        payment:type==="income"?"Gelir":((pi>=0&&r[pi])?String(r[pi]).trim():"Nakit"),
        cardName:(cardi>=0&&r[cardi])?String(r[cardi]).trim():"",
        description:(xi>=0&&r[xi])?String(r[xi]).trim():"",
        note:(ni>=0&&r[ni])?String(r[ni]).trim():"",
        date
      });
    }
    if(!imported.length)throw new Error("Aktarılabilir işlem bulunamadı");
    const existingKeys=new Set(state.transactions.map(t=>[t.date,t.type,Number(t.amount),t.category,t.payment,t.description||""].join("|")));
    const fresh=imported.filter(t=>!existingKeys.has([t.date,t.type,Number(t.amount),t.category,t.payment,t.description||""].join("|")));
    if(!confirm(`CSV'de ${imported.length} geçerli işlem bulundu. ${fresh.length} tanesi mevcut kayıtlarda yok ve eklenecek. Devam edilsin mi?`)){e.target.value="";return}
    const safety=backupObject();
    download(`butcem-csv-aktarim-oncesi-${today()}.json`,JSON.stringify(safety,null,2),"application/json;charset=utf-8");
    state.transactions.push(...fresh);
    state.categories=[...new Set([...state.categories,...fresh.filter(t=>t.type==="expense").map(t=>t.category)])];
    save(); updateBackupStatus();
    alert(`${fresh.length} işlem başarıyla içe aktarıldı. Şimdi eski uygulamayla toplamları karşılaştır.`);
  }catch(err){alert("CSV içe aktarılamadı: "+err.message)}
  e.target.value="";
};

$("#csvBtn").onclick=()=>{let rows=[["Tarih","Tür","Kategori","Tutar","Ödeme","Açıklama"]];state.transactions.forEach(t=>rows.push([t.date,t.type,t.category,t.amount,t.payment,t.description||""]));let csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");download(`butcem-${today()}.csv`,"\ufeff"+csv,"text/csv;charset=utf-8")};
function updateBackupStatus(){let el=$("#backupStatus");if(!el)return;if(state.lastBackupAt){let d=new Date(state.lastBackupAt);el.textContent=`Son manuel tam yedek: ${d.toLocaleString("tr-TR")}. Yerel kayıtlar ayrıca cihazda tutuluyor.`}else el.textContent="Henüz tam yedek alınmadı. Kayıtların şu anda bu cihazda saklanıyor."}

function render(){
 $("#monthLabel").textContent=mname(selectedMonth);$("#next").disabled=selectedMonth>=currentMonth();
 let tx=state.transactions.filter(t=>t.date&&t.date.startsWith(selectedMonth)),ex=tx.filter(t=>t.type==="expense"),inc=tx.filter(t=>t.type==="income");
 let et=ex.reduce((s,t)=>s+Number(t.amount||0),0),it=inc.reduce((s,t)=>s+Number(t.amount||0),0),net=it-et;
 $("#expenseTotal").textContent=money(et);$("#incomeTotal").textContent=money(it);$("#netTotal").textContent=money(net);$("#netTotal").className="value "+(net>=0?"good":"bad");
 let rem=state.monthlyBudget?state.monthlyBudget-et:null;$("#remaining").textContent=rem===null?"—":money(rem);$("#remaining").className="value "+(rem===null?"":rem>=0?"good":"bad");
 let pct=state.monthlyBudget?Math.round(et/state.monthlyBudget*100):0;$("#budgetPct").textContent=pct+"%";$("#budgetBar").style.width=Math.min(100,pct)+"%";$("#budgetText").textContent=state.monthlyBudget?`${money(et)} / ${money(state.monthlyBudget)}`:"Belirlenmedi";

 let prev=shift(selectedMonth,-1),pex=state.transactions.filter(t=>t.type==="expense"&&t.date&&t.date.startsWith(prev)),pt=pex.reduce((s,t)=>s+Number(t.amount||0),0),diff=et-pt;
 $("#compare").textContent=pex.length?(diff===0?`Önceki ayla aynı: ${money(et)}`:`Önceki aya göre ${money(Math.abs(diff))} ${diff>0?"daha fazla":"daha az"} harcadın.`):"Önceki ay için yeterli veri yok.";
 let ins=$("#insights");ins.innerHTML="";
 let cmpDay=selectedMonth===currentMonth()?new Date().getDate():31,curSame=ex.filter(t=>day(t.date)<=cmpDay).reduce((s,t)=>s+t.amount,0),preSame=pex.filter(t=>day(t.date)<=cmpDay).reduce((s,t)=>s+t.amount,0);
 if(pex.length){let d=curSame-preSame,box=document.createElement("div");box.className="item";box.textContent=`Ayın ${cmpDay}. gününe kadar geçen aya göre ${money(Math.abs(d))} ${d>=0?"daha fazla":"daha az"} harcama.`;ins.appendChild(box);
   if(pt>0){let sum=0,reached=null;[...ex].sort((a,b)=>a.date.localeCompare(b.date)).forEach(t=>{if(reached===null){sum+=t.amount;if(sum>=pt)reached=day(t.date)}});if(reached!==null){let b=document.createElement("div");b.className="item";b.textContent=`Geçen ayın toplamı olan ${money(pt)} seviyesine bu ay ${reached}. günde ulaştın.`;ins.appendChild(b)}}
 }
 if(!ins.children.length){let b=document.createElement("div");b.className="item";b.textContent="Yeni aylar biriktikçe burada otomatik karşılaştırmalar oluşacak.";ins.appendChild(b)}

 let sums={};ex.forEach(t=>sums[t.category]=(sums[t.category]||0)+t.amount);let arr=Object.entries(sums).sort((a,b)=>b[1]-a[1]),cat=$("#categories");cat.innerHTML="";if(!arr.length)cat.innerHTML='<div class="small">Bu ay harcama yok.</div>';let max=arr[0]?.[1]||1;arr.forEach(([k,v])=>{let r=document.createElement("div");r.className="barrow";r.innerHTML=`<div>${k}</div><div class="bar"><span style="width:${v/max*100}%"></span></div><div class="small">${money(v)}</div>`;cat.appendChild(r)});
 let list=$("#transactions");list.innerHTML="";let recent=[...tx].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,30);if(!recent.length)list.innerHTML='<div class="small">Bu ay işlem yok.</div>';recent.forEach(t=>{let r=document.createElement("div");r.className="item";let l=document.createElement("div"),title=document.createElement("div"),meta=document.createElement("div");title.textContent=t.description||t.category;meta.className="meta";meta.textContent=`${t.category} • ${t.date} • ${t.payment}`;l.append(title,meta);let a=document.createElement("div");a.className="amount "+(t.type==="income"?"good":"bad");a.textContent=(t.type==="income"?"+":"-")+money(t.amount);r.append(l,a);list.appendChild(r)});
}
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
save();