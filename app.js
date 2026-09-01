const KEY="butcem_v1";
const DATA_VERSION=4;
const DEFAULT_CATS=["Kahve","Yemek","Market","Benzin","Alışveriş","Eğlence","Ulaşım","Fatura","Sağlık","Diğer"];
const $=s=>document.querySelector(s);
function currentMonth(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
let selectedMonth=currentMonth();
function normalize(raw){
  const s=(raw&&typeof raw==="object")?raw:{};
  return {dataVersion:DATA_VERSION,transactions:Array.isArray(s.transactions)?s.transactions:[],monthlyBudget:Number(s.monthlyBudget)||0,categories:Array.isArray(s.categories)&&s.categories.length?s.categories:DEFAULT_CATS,lastBackupAt:s.lastBackupAt||null,settingsUpdatedAt:s.settingsUpdatedAt||null,lastCloudSyncAt:s.lastCloudSyncAt||null};
}
function load(){try{return normalize(JSON.parse(localStorage.getItem(KEY)))}catch(e){return normalize(null)}}
let state=load();
function save(renderNow=true,queueSync=true){state.dataVersion=DATA_VERSION;localStorage.setItem(KEY,JSON.stringify(state));if(renderNow)render();if(queueSync)queueCloudSync()}
function money(n){return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2}).format(n||0)}
function today(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function shift(mk,n){let [y,m]=mk.split("-").map(Number),d=new Date(y,m-1+n,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function mname(mk){let [y,m]=mk.split("-").map(Number);return new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric"}).format(new Date(y,m-1,1))}
function day(s){return Number(s.slice(8,10))}
function download(name,text,type){let b=new Blob([text],{type}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function openTxn(type){$("#txnType").value=type;$("#txnTitle").textContent=type==="expense"?"Harcama ekle":"Gelir ekle";$("#amount").value="";$("#description").value="";$("#date").value=today();let cats=type==="expense"?state.categories:["Aile Desteği","Maaş","Burs","Yatırım Getirisi","Satış","Diğer Gelir"];$("#category").innerHTML="";cats.forEach(c=>{let o=document.createElement("option");o.textContent=c;$("#category").appendChild(o)});$("#payment").disabled=false;$("#txnDialog").showModal()}
let quickTxnMode="expense";
function setQuickTxnMode(type){
 quickTxnMode=type;
 $("#expenseBtn").className=type==="expense"?"primary v51-mode-active":"ghost";
 $("#incomeBtn").className=type==="income"?"primary v51-mode-active":"ghost";
}
$("#expenseBtn").onclick=()=>{if(quickTxnMode==="expense")openTxn("expense");else setQuickTxnMode("expense")};
$("#incomeBtn").onclick=()=>{if(quickTxnMode==="income")openTxn("income");else setQuickTxnMode("income")};
$("#fab").onclick=()=>openTxn(quickTxnMode);
setQuickTxnMode("expense");
$("#cancelTxn").onclick=()=>$("#txnDialog").close();
$("#txnForm").onsubmit=e=>{e.preventDefault();let amount=Number($("#amount").value);if(!(amount>0))return;state.transactions.push({id:(crypto.randomUUID?crypto.randomUUID():Date.now()+""+Math.random()),type:$("#txnType").value,amount,category:$("#category").value,payment:$("#payment").value,description:$("#description").value.trim(),date:$("#date").value});save();$("#txnDialog").close()};
$("#prev").onclick=()=>{selectedMonth=shift(selectedMonth,-1);render()};$("#next").onclick=()=>{let n=shift(selectedMonth,1);if(n<=currentMonth()){selectedMonth=n;render()}};
$("#settingsBtn").onclick=()=>{$("#monthlyBudget").value=state.monthlyBudget||"";$("#categoriesText").value=state.categories.join(", ");updateBackupStatus();$("#settingsDialog").showModal()};$("#cancelSettings").onclick=()=>$("#settingsDialog").close();
$("#settingsForm").onsubmit=e=>{e.preventDefault();state.monthlyBudget=Math.max(0,Number($("#monthlyBudget").value)||0);let c=$("#categoriesText").value.split(",").map(x=>x.trim()).filter(Boolean);if(c.length)state.categories=[...new Set(c)];state.settingsUpdatedAt=new Date().toISOString();save();$("#settingsDialog").close()};

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


// ---------- V4 Hesap & Bulut ----------
let sb=null, currentUser=null, cloudTimer=null, cloudBusy=false, cloudReady=false;

function cloudConfigured(){
  const c=window.BUTCEM_SUPABASE||{};
  return !!(c.url&&c.key&&!c.url.includes("BURAYA_")&&!c.key.includes("BURAYA_"));
}
function initCloudClient(){
  if(!cloudConfigured() || !window.supabase?.createClient) return false;
  try{
    sb=window.supabase.createClient(window.BUTCEM_SUPABASE.url,window.BUTCEM_SUPABASE.key,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
    });
    cloudReady=true; return true;
  }catch(e){console.warn("Supabase başlatılamadı",e);return false}
}
function setCloudUI(main,detail){
  if($("#cloudStatus"))$("#cloudStatus").textContent=main;
  if($("#cloudDetail"))$("#cloudDetail").textContent=detail||"";
  if($("#accountSyncInfo"))$("#accountSyncInfo").textContent=detail||main;
}
function updateAuthDialog(){
  const logged=!!currentUser;
  $("#authLoggedOut").style.display=logged?"none":"block";
  $("#authLoggedIn").style.display=logged?"block":"none";
  if(logged)$("#accountEmail").textContent=currentUser.email||"Hesabım";
}
function openAuth(){updateAuthDialog();$("#authDialog").showModal()}
$("#cloudBtn").onclick=openAuth;$("#cloudCardBtn").onclick=openAuth;
$("#authCancel").onclick=()=>$("#authDialog").close();$("#authCancel2").onclick=()=>$("#authDialog").close();

function txToCloud(t,userId){return {
 user_id:userId,id:String(t.id),type:t.type,amount:Number(t.amount||0),category:t.category||null,
 payment:t.payment||null,card_name:t.cardName||null,description:t.description||null,note:t.note||null,
 txn_date:t.date,updated_at:t.updatedAt||new Date().toISOString()
}}
function txFromCloud(t){return {
 id:String(t.id),type:t.type,amount:Number(t.amount||0),category:t.category||"",
 payment:t.payment||"",cardName:t.card_name||"",description:t.description||"",note:t.note||"",
 date:t.txn_date,updatedAt:t.updated_at||null
}}
function txKey(t){
 return String(t.id||[t.date,t.type,Number(t.amount),t.category,t.payment,t.description||""].join("|"));
}
function mergeTransactions(local,remote){
 const m=new Map();
 for(const t of remote)m.set(txKey(t),t);
 for(const t of local){
   const k=txKey(t), old=m.get(k);
   if(!old || String(t.updatedAt||"")>=String(old.updatedAt||""))m.set(k,t);
 }
 return [...m.values()];
}
async function pullCloud(){
 if(!sb||!currentUser)return;
 const [{data:txs,error:txErr},{data:settings,error:setErr}]=await Promise.all([
   sb.from("butcem_transactions").select("*").eq("user_id",currentUser.id),
   sb.from("butcem_settings").select("*").eq("user_id",currentUser.id).maybeSingle()
 ]);
 if(txErr)throw txErr;if(setErr)throw setErr;
 const remote=(txs||[]).map(txFromCloud);
 state.transactions=mergeTransactions(state.transactions,remote);
 if(settings){
   const remoteStamp=settings.settings_updated_at||settings.updated_at||"";
   const localStamp=state.settingsUpdatedAt||"";
   if(!localStamp || remoteStamp>localStamp){
     state.monthlyBudget=Number(settings.monthly_budget)||0;
     if(Array.isArray(settings.categories)&&settings.categories.length)state.categories=settings.categories;
     state.settingsUpdatedAt=remoteStamp;
   }
 }
 save(false,false);
}
async function pushCloud(){
 if(!sb||!currentUser)return;
 if(state.transactions.length){
   const rows=state.transactions.map(t=>txToCloud(t,currentUser.id));
   // Küçük kişisel bütçe uygulaması için tüm yerel kayıtları idempotent upsert ediyoruz.
   for(let i=0;i<rows.length;i+=500){
     const {error}=await sb.from("butcem_transactions").upsert(rows.slice(i,i+500),{onConflict:"user_id,id"});
     if(error)throw error;
   }
 }
 const {error:sErr}=await sb.from("butcem_settings").upsert({
   user_id:currentUser.id,monthly_budget:Number(state.monthlyBudget)||0,categories:state.categories,
   settings_updated_at:state.settingsUpdatedAt||new Date().toISOString(),updated_at:new Date().toISOString()
 },{onConflict:"user_id"});
 if(sErr)throw sErr;
}
async function syncCloud(manual=false){
 if(!sb||!currentUser||cloudBusy)return;
 cloudBusy=true;
 if(manual) setCloudUI("☁️ Senkronize ediliyor…","Cihaz ve hesabındaki veriler karşılaştırılıyor.");
 try{
   // Önce buluttakini çek, birleştir; sonra birleşmiş sonucu geri gönder.
   await pullCloud();
   await pushCloud();
   await pullCloud();
   state.lastCloudSyncAt=new Date().toISOString();
   localStorage.setItem(KEY,JSON.stringify(state));
   const when=new Date(state.lastCloudSyncAt).toLocaleString("tr-TR");
   setCloudUI("☁️ Senkronize edildi",`Son senkronizasyon: ${when}`);
   render();
   if(manual)alert("Bulut senkronizasyonu tamamlandı.");
 }catch(e){
   console.error(e);
   setCloudUI("📱 Cihazda kaydedildi","Buluta bağlanılamadı. Verilerin cihazda duruyor; bağlantı gelince tekrar deneyebilirsin.");
   if(manual)alert("Bulut senkronizasyonu yapılamadı: "+(e.message||"Bağlantı hatası"));
 }finally{cloudBusy=false}
}
function queueCloudSync(){
 if(!currentUser||!sb)return;
 clearTimeout(cloudTimer);cloudTimer=setTimeout(()=>syncCloud(false),2500);
}
async function refreshSession(){
 if(!sb)return;
 const {data}=await sb.auth.getSession();
 currentUser=data.session?.user||null;
 updateAuthDialog();
 if(currentUser){
   setCloudUI("☁️ Hesap bağlı",currentUser.email||"Giriş yapıldı");
   await syncCloud(false);
 }else setCloudUI("📱 Bu cihazda kayıtlı","Bulut hesabı bağlı değil.");
}
$("#signInBtn").onclick=async()=>{
 if(!sb){alert("Bulut bağlantısı henüz yapılandırılmadı.");return}
 const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error){alert(error.message);return}
 currentUser=data.user;updateAuthDialog();await syncCloud(true);
};
$("#signUpBtn").onclick=async()=>{
 if(!sb){alert("Bulut bağlantısı henüz yapılandırılmadı.");return}
 const email=$("#authEmail").value.trim(),password=$("#authPassword").value;
 const {data,error}=await sb.auth.signUp({email,password});
 if(error){alert(error.message);return}
 if(data.session){currentUser=data.user;updateAuthDialog();await syncCloud(true);alert("Hesabın oluşturuldu ve bu cihazdaki veriler hesabına aktarılıyor.");}
 else alert("Hesap oluşturuldu. Supabase e-posta doğrulaması açıksa gelen kutundaki bağlantıya basıp sonra giriş yap.");
};
$("#signOutBtn").onclick=async()=>{if(sb)await sb.auth.signOut();currentUser=null;updateAuthDialog();setCloudUI("📱 Bu cihazda kayıtlı","Hesaptan çıkıldı. Yerel verilerin cihazda kalır.");};
$("#syncNowBtn").onclick=()=>syncCloud(true);

if(initCloudClient()){
 sb.auth.onAuthStateChange((_event,session)=>{currentUser=session?.user||null;updateAuthDialog();if(currentUser)setTimeout(()=>syncCloud(false),400);});
 refreshSession();
}else{
 setCloudUI("📱 Bu cihazda kayıtlı","V4 hazır; Supabase bağlantısı yapıldığında hesap ve bulut aktif olacak.");
}

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
if("serviceWorker"in navigator){
  navigator.serviceWorker.register("sw.js?v=5.0").then(reg=>{
    reg.update().catch(()=>{});
    if(reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    reg.addEventListener("updatefound",()=>{
      const nw=reg.installing;
      if(!nw)return;
      nw.addEventListener("statechange",()=>{
        if(nw.state==="installed"&&navigator.serviceWorker.controller){
          nw.postMessage("SKIP_WAITING");
        }
      });
    });
  }).catch(()=>{});
  let reloaded=false;
  navigator.serviceWorker.addEventListener("controllerchange",()=>{
    if(reloaded)return;
    reloaded=true;
    location.reload();
  });
}
state.dataVersion=DATA_VERSION;localStorage.setItem(KEY,JSON.stringify(state));render();


// ===== V5.1 kişiselleştirme / Financial Dashboard =====
const V5_PREF_KEY="butcem_v5_preferences";
function v5GetPrefs(){try{return JSON.parse(localStorage.getItem(V5_PREF_KEY))}catch(e){return null}}
function v5SetPrefs(p){localStorage.setItem(V5_PREF_KEY,JSON.stringify(p))}
function v5Theme(t){document.documentElement.dataset.theme=t;let p=v5GetPrefs()||{modules:["budget"],startView:"summary"};p.theme=t;v5SetPrefs(p)}
function v51MonthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function v51MonthLabel(key){let [y,m]=key.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString("tr-TR",{month:"long",year:"numeric"})}
function v51Esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function v51RecentDate(s){if(!s)return "";let [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("tr-TR",{day:"numeric",month:"short"})}

function v5Refresh(){
 const key=currentMonth(), tx=state.transactions.filter(t=>t.date&&t.date.startsWith(key));
 const inc=tx.filter(t=>t.type==="income").reduce((a,t)=>a+Number(t.amount||0),0);
 const ex=tx.filter(t=>t.type==="expense").reduce((a,t)=>a+Number(t.amount||0),0);
 const net=inc-ex, budget=Number(state.monthlyBudget||0), remaining=budget?budget-ex:null;
 const q=s=>document.querySelector(s);
 q("#v5Income").textContent=money(inc);q("#v5Expense").textContent=money(ex);q("#v5Net").textContent=money(net);
 q("#v5Net").className=net>=0?"good":"bad";q("#v5Saving").textContent=inc>0?`%${Math.round(net/inc*100)}`:"—";
 q("#v51Month").textContent=v51MonthLabel(key);
 if(budget){
   q("#v5MainValue").textContent=money(remaining);
   q("#v5MainValue").className="v5-hero-value "+(remaining<0?"bad":"");
   q("#v5MainSub").textContent=remaining>=0?`${money(budget)} bütçenin ${Math.min(100,Math.round(ex/budget*100))}%'i kullanıldı`:`Bütçe ${money(Math.abs(remaining))} aşıldı`;
   q("#v51BudgetBar").style.width=Math.min(100,ex/budget*100)+"%";
 }else{
   q("#v5MainValue").textContent=money(net);
   q("#v5MainValue").className="v5-hero-value "+(net<0?"bad":"");
   q("#v5MainSub").textContent="Aylık bütçe belirlenmedi · Net durum gösteriliyor";
   q("#v51BudgetBar").style.width="0%";
 }

 // Donut
 const cats={};tx.filter(t=>t.type==="expense").forEach(t=>cats[t.category||"Diğer"]=(cats[t.category||"Diğer"]||0)+Number(t.amount||0));
 const rows=Object.entries(cats).sort((a,b)=>b[1]-a[1]).slice(0,6);
 const palette=["#2563eb","#059669","#d97706","#7c3aed","#db2777","#64748b"];
 let acc=0, stops=[];
 rows.forEach(([_,v],i)=>{let a=ex?v/ex*100:0;stops.push(`${palette[i]} ${acc}% ${acc+a}%`);acc+=a});
 q("#v51Donut").style.background=stops.length?`conic-gradient(${stops.join(",")})`:"var(--surface2)";
 q("#v51DonutTotal").textContent=money(ex);
 q("#v51Legend").innerHTML=rows.length?rows.map(([name,v],i)=>`<div class="v51-legend-row"><span class="v51-dot" style="background:${palette[i]}"></span><span class="v51-legend-name">${v51Esc(name)}</span><strong>${Math.round(v/ex*100)}%</strong></div>`).join(""):`<div class="v51-empty">Henüz harcama yok.</div>`;

 // Six-month chart
 const now=new Date(), months=[];
 for(let i=5;i>=0;i--){let d=new Date(now.getFullYear(),now.getMonth()-i,1),k=v51MonthKey(d);let mts=state.transactions.filter(t=>t.date&&t.date.startsWith(k));months.push({k,label:d.toLocaleDateString("tr-TR",{month:"short"}),inc:mts.filter(t=>t.type==="income").reduce((a,t)=>a+Number(t.amount||0),0),ex:mts.filter(t=>t.type==="expense").reduce((a,t)=>a+Number(t.amount||0),0)})}
 const max=Math.max(1,...months.flatMap(x=>[x.inc,x.ex]));
 q("#v51Chart").innerHTML=months.map(x=>`<div class="v51-monthcol"><div class="v51-bars"><span class="v51-bar income" title="Gelir ${money(x.inc)}" style="height:${Math.max(x.inc?3:0,x.inc/max*100)}%"></span><span class="v51-bar expense" title="Harcama ${money(x.ex)}" style="height:${Math.max(x.ex?3:0,x.ex/max*100)}%"></span></div><div class="v51-monthname">${v51Esc(x.label)}</div></div>`).join("");

 // Recent transactions
 const recent=[...state.transactions].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 q("#v51Recent").innerHTML=recent.length?recent.map(t=>`<div class="v51-recent-row"><div class="v51-recent-main"><div class="v51-recent-title">${v51Esc(t.description||t.category||"İşlem")}</div><div class="v51-recent-meta">${v51Esc(t.category||"")} · ${v51Esc(t.payment||"")} · ${v51RecentDate(t.date)}</div></div><div class="v51-recent-amt ${t.type==="income"?"good":"bad"}">${t.type==="income"?"+":"−"}${money(t.amount)}</div></div>`).join(""):`<div class="v51-empty">Henüz işlem yok. Sağ alttaki + ile ilk kaydını ekleyebilirsin.</div>`;
}
function v5Show(view){
 let sum=document.querySelector("#v5Summary"),app=document.querySelector(".app");
 if(view==="summary"){sum.classList.remove("v5-hide");app.classList.add("v5-hide");v5Refresh()}
 else{sum.classList.add("v5-hide");app.classList.remove("v5-hide");if(view==="assets")alert("Varlıklar modülünün yeri hazır. Net Servet/Yatırım motorunu sonraki aşamada ekleyeceğiz.")}
 document.querySelectorAll("#v5Nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
}
function v5Init(){
 let p=v5GetPrefs();
 if(!p){document.querySelector("#v5Onboarding").classList.remove("v5-hide")}
 else{v5Theme(p.theme||"light");v5Show(p.startView||"summary")}
 document.querySelector("#v5Done").onclick=()=>{let modules=[...document.querySelectorAll("#v5Onboarding input:checked")].map(x=>x.value),startView=document.querySelector("#v5Start").value;p={modules:modules.length?modules:["budget"],startView,theme:"light"};v5SetPrefs(p);document.querySelector("#v5Onboarding").classList.add("v5-hide");v5Show(startView)};
 document.querySelectorAll("#v5Nav button").forEach(b=>b.onclick=()=>v5Show(b.dataset.view));
 document.querySelector("#v5Theme").onclick=()=>v5Theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
 document.querySelector("#v51AllTx").onclick=()=>v5Show("transactions");
}
setTimeout(v5Init,0);
