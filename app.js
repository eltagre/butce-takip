const KEY="butcem_v1";
const DATA_VERSION=4;
const DEFAULT_CATS=["Yemek","Kahve","Market","Benzin","Ulaşım","Alışveriş","Eğlence","Ev / Kira","Faturalar","Abonelikler","Sağlık","Eğitim","Seyahat / Tatil","Hediye","Kişisel Bakım","Araç","Evcil Hayvan","Vergi / Harç","Bağış","Diğer"];
const $=s=>document.querySelector(s);
function currentMonth(){let d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
let selectedMonth=currentMonth();
function normalize(raw){
  const s=(raw&&typeof raw==="object")?raw:{};
  const existing=Array.isArray(s.categories)?s.categories.filter(Boolean):[];const categories=existing.length?[...new Set(existing)]:[...DEFAULT_CATS];return {dataVersion:DATA_VERSION,transactions:Array.isArray(s.transactions)?s.transactions:[],monthlyBudget:Number(s.monthlyBudget)||0,categories,lastBackupAt:s.lastBackupAt||null,settingsUpdatedAt:s.settingsUpdatedAt||null,lastCloudSyncAt:s.lastCloudSyncAt||null};
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
const INCOME_CATS=["Maaş","Aile Desteği","Burs","Ek Gelir","Satış","Kira Geliri","Faiz / Getiri","Temettü","İade","Hediye","Diğer Gelir"];
const DELETE_QUEUE_KEY="butcem_v5_deleted_ids";
function deletedIds(){try{return new Set(JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY)||"[]").map(String))}catch(e){return new Set()}}
function queueDeletedId(id){const s=deletedIds();s.add(String(id));localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify([...s]))}
function unqueueDeletedIds(ids){const s=deletedIds();ids.forEach(id=>s.delete(String(id)));localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify([...s]))}
function fillCategoryOptions(type,selected=""){
 const cats=type==="expense"?state.categories:INCOME_CATS;
 $("#category").innerHTML="";
 cats.forEach(c=>{let o=document.createElement("option");o.value=c;o.textContent=c;if(c===selected)o.selected=true;$("#category").appendChild(o)});
}
function updateAccountSuggestions(){
 const vals=[...new Set([...state.transactions.flatMap(t=>[t.cardName,t.payment]),...(typeof v7!=="undefined"?v7.accounts.map(a=>a.name):[])].filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr"));
 const dl=$("#accountSuggestions");if(dl)dl.innerHTML=vals.map(v=>`<option value="${v51Esc(v)}"></option>`).join("");
}
function openTxn(type,txn=null){
 $("#txnType").value=type;
 $("#txnEditId").value=txn?.id||"";
 $("#txnTitle").textContent=txn?(type==="expense"?"Harcamayı düzenle":"Geliri düzenle"):(type==="expense"?"Harcama ekle":"Gelir ekle");
 $("#amount").value=txn?.amount??"";
 $("#description").value=txn?.description||"";
 $("#date").value=txn?.date||today();
 $("#cardName").value=txn?.cardName||"";
 $("#txnNote").value=txn?.note||"";
 fillCategoryOptions(type,txn?.category||"");
 $("#payment").disabled=false;
 if(txn?.payment && ![...$("#payment").options].some(o=>o.value===txn.payment)){let o=document.createElement("option");o.value=txn.payment;o.textContent=txn.payment;$("#payment").appendChild(o)}
 $("#payment").value=txn?.payment||"Nakit";
 $("#deleteTxnBtn").style.display=txn?"inline-block":"none";
 $("#duplicateTxnBtn").style.display=txn?"inline-block":"none";
 updateAccountSuggestions();
 $("#txnDialog").showModal();
}
function findTxn(id){return state.transactions.find(t=>String(t.id)===String(id))}
function deleteTransaction(id){
 const t=findTxn(id);if(!t)return;
 if(!confirm(`"${t.description||t.category||"Bu işlem"}" silinsin mi? Bu işlem geri alınamaz.`))return;
 queueDeletedId(id);
 state.transactions=state.transactions.filter(x=>String(x.id)!==String(id));
 state.settingsUpdatedAt=state.settingsUpdatedAt||new Date().toISOString();
 save();
 if($("#txnDialog").open)$("#txnDialog").close();
 if(typeof v5Refresh==="function")v5Refresh();
 v6Toast("İşlem silindi");
}
let quickTxnMode="expense";
function setQuickTxnMode(type){
 quickTxnMode=type;
 $("#expenseBtn").className=type==="expense"?"primary v51-mode-active":"ghost";
 $("#incomeBtn").className=type==="income"?"primary v51-mode-active":"ghost";
}
$("#expenseBtn").onclick=()=>{if(quickTxnMode==="expense")openTxn("expense");else setQuickTxnMode("expense")};
$("#incomeBtn").onclick=()=>{if(quickTxnMode==="income")openTxn("income");else setQuickTxnMode("income")};
$("#fab").onclick=()=>$("#v6QuickDialog").showModal();
setQuickTxnMode("expense");
$("#v6QuickExpense").onclick=()=>{$("#v6QuickDialog").close();setQuickTxnMode("expense");openTxn("expense")};
$("#v6QuickIncome").onclick=()=>{$("#v6QuickDialog").close();setQuickTxnMode("income");openTxn("income")};
$("#cancelTxn").onclick=()=>$("#txnDialog").close();
$("#txnForm").onsubmit=e=>{e.preventDefault();let amount=Number($("#amount").value);if(!(amount>0))return;const editId=$("#txnEditId").value,type=$("#txnType").value;const obj={id:editId||(crypto.randomUUID?crypto.randomUUID():Date.now()+""+Math.random()),type,amount,category:$("#category").value,payment:$("#payment").value,cardName:$("#cardName").value.trim(),description:$("#description").value.trim(),note:$("#txnNote").value.trim(),date:$("#date").value,updatedAt:new Date().toISOString()};if(editId){const i=state.transactions.findIndex(t=>String(t.id)===String(editId));if(i>=0)state.transactions[i]={...state.transactions[i],...obj};else state.transactions.push(obj)}else state.transactions.push(obj);save();$("#txnDialog").close();v6Toast(editId?"İşlem güncellendi":"İşlem kaydedildi");if(typeof v5Refresh==="function")v5Refresh()};
$("#deleteTxnBtn").onclick=()=>{const id=$("#txnEditId").value;if(id)deleteTransaction(id)};
$("#duplicateTxnBtn").onclick=()=>{const id=$("#txnEditId").value,t=findTxn(id);if(!t)return;$("#txnDialog").close();const copy={...t,id:"",date:today(),description:t.description||""};openTxn(t.type,copy);$("#txnEditId").value=""};
$("#prev").onclick=()=>{selectedMonth=shift(selectedMonth,-1);render();if(typeof v5Refresh==="function")v5Refresh()};$("#next").onclick=()=>{let n=shift(selectedMonth,1);if(n<=currentMonth()){selectedMonth=n;render();if(typeof v5Refresh==="function")v5Refresh()}};
$("#settingsBtn").onclick=()=>{$("#monthlyBudget").value=state.monthlyBudget||"";$("#categoriesText").value=state.categories.join(", ");let p=v5GetPrefs?.()||{};$("#v6StartView").value=p.startView||"summary";$("#v6ThemeSelect").value=p.theme||"light";updateBackupStatus();$("#settingsDialog").showModal()};$("#cancelSettings").onclick=()=>$("#settingsDialog").close();
$("#settingsForm").onsubmit=e=>{e.preventDefault();state.monthlyBudget=Math.max(0,Number($("#monthlyBudget").value)||0);let c=$("#categoriesText").value.split(",").map(x=>x.trim()).filter(Boolean);state.categories=c.length?[...new Set(c)]:["Diğer"];state.settingsUpdatedAt=new Date().toISOString();let p=v5GetPrefs?.()||{modules:["budget"]};p.startView=$("#v6StartView").value;p.theme=$("#v6ThemeSelect").value;v5SetPrefs?.(p);v5Theme?.(p.theme);save();$("#settingsDialog").close();v6Toast("Ayarlar kaydedildi")};

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
async function processPendingDeletes(){
 if(!sb||!currentUser)return;
 const ids=[...deletedIds()];if(!ids.length)return;
 for(let i=0;i<ids.length;i+=100){
   const batch=ids.slice(i,i+100);
   const {error}=await sb.from("butcem_transactions").delete().eq("user_id",currentUser.id).in("id",batch);
   if(error)throw error;
   unqueueDeletedIds(batch);
 }
}
async function pullCloud(){
 if(!sb||!currentUser)return;
 const [{data:txs,error:txErr},{data:settings,error:setErr}]=await Promise.all([
   sb.from("butcem_transactions").select("*").eq("user_id",currentUser.id),
   sb.from("butcem_settings").select("*").eq("user_id",currentUser.id).maybeSingle()
 ]);
 if(txErr)throw txErr;if(setErr)throw setErr;
 const tomb=deletedIds();const remote=(txs||[]).map(txFromCloud).filter(t=>!tomb.has(String(t.id)));
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
   // Bekleyen silmeleri önce buluta uygula; böylece silinen kayıt başka cihazdan geri dirilmez.
   await processPendingDeletes();
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
 let list=$("#transactions"),search=($("#txnSearch")?.value||"").trim().toLocaleLowerCase("tr-TR"),scope=$("#txnScope")?.value||"month",ft=$("#txnFilterType")?.value||"all",fc=$("#txnFilterCategory")?.value||"all",fp=$("#txnFilterPayment")?.value||"all",sort=$("#txnSort")?.value||"date_desc";
 let baseTx=scope==="all"?[...state.transactions]:[...tx];
 let catSelect=$("#txnFilterCategory"),paySelect=$("#txnFilterPayment");
 if(catSelect){const before=catSelect.value;const allCats=[...new Set(baseTx.map(t=>t.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr"));catSelect.innerHTML='<option value="all">Tüm kategoriler</option>'+allCats.map(c=>`<option value="${v51Esc(c)}">${v51Esc(c)}</option>`).join("");catSelect.value=allCats.includes(before)?before:"all";fc=catSelect.value}
 if(paySelect){const before=paySelect.value;const pays=[...new Set(baseTx.map(t=>t.cardName||t.payment).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"tr"));paySelect.innerHTML='<option value="all">Tüm hesaplar</option>'+pays.map(c=>`<option value="${v51Esc(c)}">${v51Esc(c)}</option>`).join("");paySelect.value=pays.includes(before)?before:"all";fp=paySelect.value}
 let filtered=baseTx.filter(t=>(ft==="all"||t.type===ft)&&(fc==="all"||t.category===fc)&&(fp==="all"||(t.cardName||t.payment)===fp)&&(!search||[t.description,t.category,t.payment,t.cardName,t.note,String(t.amount)].join(" ").toLocaleLowerCase("tr-TR").includes(search)));
 const sorters={date_desc:(a,b)=>String(b.date).localeCompare(String(a.date)),date_asc:(a,b)=>String(a.date).localeCompare(String(b.date)),amount_desc:(a,b)=>Number(b.amount)-Number(a.amount),amount_asc:(a,b)=>Number(a.amount)-Number(b.amount)};
 filtered.sort(sorters[sort]||sorters.date_desc);
 list.innerHTML="";if($("#txnCount"))$("#txnCount").textContent=`${filtered.length} işlem`;
 const fIncome=filtered.filter(t=>t.type==="income").reduce((s,t)=>s+Number(t.amount||0),0),fExpense=filtered.filter(t=>t.type==="expense").reduce((s,t)=>s+Number(t.amount||0),0);
 if($("#txnFilterSummary"))$("#txnFilterSummary").textContent=`Gelir ${money(fIncome)} · Harcama ${money(fExpense)} · Net ${money(fIncome-fExpense)}`;
 if(!filtered.length)list.innerHTML='<div class="small">Bu filtrelerde işlem bulunamadı.</div>';
 filtered.forEach(t=>{let r=document.createElement("div");r.className="item v52-item v6-tappable";r.onclick=e=>{if(!e.target.closest("button"))openTxn(t.type,t)};let l=document.createElement("div");l.className="v52-item-main";let title=document.createElement("div"),meta=document.createElement("div");title.className="v52-item-title";title.textContent=t.description||t.category;meta.className="meta";meta.textContent=`${t.category} • ${t.date} • ${t.payment}`;l.append(title,meta);if(t.cardName){let pill=document.createElement("span");pill.className="v6-account-pill";pill.textContent=t.cardName;l.appendChild(pill)}let side=document.createElement("div");side.className="v52-item-side";let a=document.createElement("div");a.className="amount "+(t.type==="income"?"good":"bad");a.textContent=(t.type==="income"?"+":"-")+money(t.amount);let acts=document.createElement("div");acts.className="v52-actions";let edit=document.createElement("button");edit.className="ghost";edit.type="button";edit.textContent="Düzenle";edit.onclick=()=>openTxn(t.type,t);let del=document.createElement("button");del.className="ghost v52-delete";del.type="button";del.textContent="Sil";del.onclick=()=>deleteTransaction(t.id);acts.append(edit,del);side.append(a,acts);r.append(l,side);list.appendChild(r)});
}
if("serviceWorker"in navigator){
  navigator.serviceWorker.register("sw.js?v=8.1").then(reg=>{
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
["txnSearch","txnScope","txnFilterType","txnFilterCategory","txnFilterPayment","txnSort"].forEach(id=>{const el=$("#"+id);if(el)el.addEventListener(id==="txnSearch"?"input":"change",()=>render())});
$("#v6ExportFiltered").onclick=()=>v6ExportCurrentFilter();






// ===== V8 Wealth & Backtest =====
const V8_KEY="butcem_v8_wealth";
const V8_PRICE_KEY="butcem_v8_prices";
function v8Defaults(){return {assets:[],rates:{usdtry:40,gramGold:4000},measure:"TRY",snapshots:[],profile:{age:null,mode:"personal",adults:1,country:"TR"},market:{lastRefresh:null},btRows:[{symbol:"QQQ",weight:60},{symbol:"BTC",weight:20},{symbol:"GLD",weight:20}],compare:[{name:"Hepsi QQQ",symbol:"QQQ"},{name:"Hepsi BTC",symbol:"BTC"},{name:"Hepsi Altın",symbol:"GLD"}]}}
function v8Load(){try{const x=JSON.parse(localStorage.getItem(V8_KEY)||"{}");return {...v8Defaults(),...x,assets:Array.isArray(x.assets)?x.assets:[],rates:{...v8Defaults().rates,...(x.rates||{})},profile:{...v8Defaults().profile,...(x.profile||{})},market:{...v8Defaults().market,...(x.market||{})},snapshots:Array.isArray(x.snapshots)?x.snapshots:[],btRows:Array.isArray(x.btRows)&&x.btRows.length?x.btRows:v8Defaults().btRows,compare:Array.isArray(x.compare)?x.compare:v8Defaults().compare}}catch(e){return v8Defaults()}}
function v8LoadPrices(){try{return JSON.parse(localStorage.getItem(V8_PRICE_KEY)||"{}")}catch(e){return {}}}
let v8=v8Load(),v8Prices=v8LoadPrices(),v8LastBacktest=null;
function v8Save(show=true){localStorage.setItem(V8_KEY,JSON.stringify(v8));v8Render();if(show)v6Toast("Kaydedildi")}
function v8TypeName(t){return ({stock:"Hisse",etf:"ETF",crypto:"Kripto",gold:"Altın",cash:"Nakit / Döviz",realestate:"Gayrimenkul",vehicle:"Araç",other:"Diğer"})[t]||t}
function v8Fx(a){return a.currency==="USD"?Number(v8.rates.usdtry||0):1}
function v8AssetValueTry(a){return Number(a.qty||0)*Number(a.price||0)*v8Fx(a)}
function v8AssetCostTry(a){return Number(a.qty||0)*Number(a.cost||0)*v8Fx(a)}
function v8TotalTry(){return v8.assets.reduce((s,a)=>s+v8AssetValueTry(a),0)}
function v8FormatTryValue(val,measure=v8.measure){
 if(measure==="USD")return "$"+new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(val/Math.max(.0001,Number(v8.rates.usdtry||1)));
 if(measure==="GOLD")return new Intl.NumberFormat("tr-TR",{maximumFractionDigits:1}).format(val/Math.max(.0001,Number(v8.rates.gramGold||1)))+" gr";
 return money(val);
}
function v8OpenTab(tab){document.querySelectorAll("[data-v8tab]").forEach(b=>b.classList.toggle("active",b.dataset.v8tab===tab));document.querySelectorAll(".v8-panel").forEach(p=>p.classList.remove("active"));$("#v8"+tab.charAt(0).toUpperCase()+tab.slice(1)+"Panel")?.classList.add("active");}
function v8OpenAsset(id=""){if($("#v81AssetSearch"))$("#v81AssetSearch").value="";if($("#v81SearchResults"))$("#v81SearchResults").style.display="none";if($("#v81AssetQuoteStatus"))$("#v81AssetQuoteStatus").textContent="";const a=v8.assets.find(x=>x.id===id);$("#v8AssetId").value=a?.id||"";$("#v8AssetTitle").textContent=a?"Varlığı düzenle":"Varlık ekle";$("#v8AssetName").value=a?.name||"";$("#v8AssetType").value=a?.type||"stock";$("#v8AssetSymbol").value=a?.symbol||"";$("#v8AssetQty").value=a?.qty??1;$("#v8AssetPrice").value=a?.price??"";$("#v8AssetCurrency").value=a?.currency||"TRY";$("#v8AssetCost").value=a?.cost??"";$("#v8AssetPrev").value=a?.prev??"";$("#v8AssetNote").value=a?.note||"";$("#v8DeleteAsset").style.display=a?"inline-block":"none";$("#v8AssetDialog").showModal()}
function v8Color(i){return `hsl(${(210+i*53)%360} 65% 55%)`}
function v8WealthEstimateUSD(usd,scope){
 // Broad, deliberately approximate anchors. Global calibrated to UBS wealth bands.
 const global=[[0,5],[10000,40.7],[100000,82],[1000000,98.4],[5000000,99.7],[10000000,99.9]];
 // Experimental Türkiye anchors: broad distribution positioning, not literal WID percentile thresholds.
 const tr=[[0,5],[5000,35],[25000,55],[75000,75],[200000,90],[750000,99],[2500000,99.8]];
 const arr=scope==="tr"?tr:global;
 if(usd<=0)return {pct:0,top:100};
 let pct=arr[0][1];
 for(let i=1;i<arr.length;i++){if(usd<=arr[i][0]){let [x0,y0]=arr[i-1],[x1,y1]=arr[i];let lx=Math.log10(Math.max(1,usd)),l0=Math.log10(Math.max(1,x0)),l1=Math.log10(Math.max(1,x1));pct=y0+(y1-y0)*Math.max(0,Math.min(1,(lx-l0)/Math.max(.0001,l1-l0)));return {pct,top:100-pct}}pct=arr[i][1]}
 return {pct:Math.min(99.99,pct),top:Math.max(.01,100-pct)};
}

const V81_QUOTE_TTL=10*60*1000, V81_SEARCH_TTL=24*60*60*1000, V81_HISTORY_TTL=24*60*60*1000;
const V81_CACHE_KEY="butcem_v81_market_cache";
function v81CacheLoad(){try{return JSON.parse(localStorage.getItem(V81_CACHE_KEY)||"{}")}catch(e){return {}}}
let v81Cache=v81CacheLoad(),v81SearchTimer=null;
function v81CacheSave(){try{localStorage.setItem(V81_CACHE_KEY,JSON.stringify(v81Cache))}catch(e){}}
async function v81Market(action,params={},ttl=0){
 const q=new URLSearchParams({action,...params}),key=action+":"+[...q.entries()].sort().map(x=>x.join("=")).join("&"),hit=v81Cache[key];
 if(hit&&Date.now()-hit.at<ttl)return hit.data;
 if(!window.supabaseClient)throw new Error("Supabase bağlantısı hazır değil");
 const {data:{session}}=await supabaseClient.auth.getSession();if(!session)throw new Error("Piyasa verisi için hesaba giriş yap");
 const base=(window.SUPABASE_CONFIG?.url||window.SUPABASE_URL||"").replace(/\/$/,"");
 if(!base)throw new Error("Supabase URL bulunamadı");
 const res=await fetch(`${base}/functions/v1/market-data?${q.toString()}`,{headers:{Authorization:`Bearer ${session.access_token}`,apikey:window.SUPABASE_CONFIG?.anonKey||window.SUPABASE_ANON_KEY||""}});
 const out=await res.json();if(!res.ok||!out.ok)throw new Error(out?.error||out?.message||"Piyasa verisi alınamadı");
 v81Cache[key]={at:Date.now(),data:out};v81CacheSave();return out;
}
function v81QuoteToAsset(a,q){const d=q?.data||{};const px=Number(d.close||d.price||0),prev=Number(d.previous_close||0);if(px>0)a.price=px;if(prev>0)a.prev=prev;a.marketUpdatedAt=q.fetchedAt||new Date().toISOString();a.marketName=d.name||a.marketName;a.exchange=d.exchange||a.exchange;a.currency=d.currency||a.currency||"USD";return a}
async function v81RefreshAsset(a,force=false){if(!a.symbol||!["stock","etf","crypto"].includes(a.type))return a;const q=await v81Market("quote",{symbol:a.symbol},force?0:V81_QUOTE_TTL);return v81QuoteToAsset(a,q)}
async function v81RefreshAll(force=false){const btn=$("#v81RefreshAll");if(btn)btn.disabled=true;let ok=0,fail=0;for(const a of v8.assets){try{await v81RefreshAsset(a,force);ok++}catch(e){fail++}}v8.market.lastRefresh=new Date().toISOString();v8Save(false);if(btn)btn.disabled=false;if(force)v6Toast(fail?`${ok} güncellendi · ${fail} alınamadı`:"Piyasa fiyatları güncellendi")}
async function v81Search(q){q=q.trim();if(q.length<2)return [];const out=await v81Market("search",{symbol:q},V81_SEARCH_TTL);return out?.data?.data||out?.data||[]}
function v81RenderSearch(items){const box=$("#v81SearchResults");if(!box)return;if(!items.length){box.style.display="none";return}box.innerHTML=items.slice(0,8).map((x,i)=>`<div class="v81-result" data-v81pick="${i}"><strong>${v51Esc(x.instrument_name||x.name||x.symbol||"")}</strong><span>${v51Esc(x.symbol||"")} · ${v51Esc(x.exchange||"")} · ${v51Esc(x.instrument_type||x.type||"")}</span></div>`).join("");box.style.display="block";box.querySelectorAll("[data-v81pick]").forEach(el=>el.onclick=async()=>{const x=items[+el.dataset.v81pick];$("#v8AssetName").value=x.instrument_name||x.name||x.symbol||"";$("#v8AssetSymbol").value=(x.symbol||"").toUpperCase();$("#v8AssetCurrency").value=(x.currency==="TRY"?"TRY":"USD");const typ=String(x.instrument_type||x.type||"").toLowerCase();$("#v8AssetType").value=typ.includes("etf")?"etf":typ.includes("crypto")?"crypto":"stock";box.style.display="none";$("#v81AssetQuoteStatus").textContent="Fiyat alınıyor…";try{const q=await v81Market("quote",{symbol:$("#v8AssetSymbol").value},0),d=q.data||{};$("#v8AssetPrice").value=Number(d.close||d.price||0)||"";$("#v8AssetPrev").value=Number(d.previous_close||0)||"";$("#v81AssetQuoteStatus").textContent=`${d.exchange||""} · ${d.currency||"USD"} · fiyat otomatik alındı`}catch(e){$("#v81AssetQuoteStatus").textContent="Otomatik fiyat alınamadı; manuel girebilirsin."}})}
async function v81EnsureHistory(symbol,start,end){
 symbol=String(symbol||"").toUpperCase();if(!symbol)throw new Error("Sembol boş");
 const existing=v8Prices[symbol]||[];if(existing.length&&(!start||existing[0][0]<=start)&&(!end||existing.at(-1)[0]>=end))return existing;
 let days=365; if(start){days=Math.ceil((new Date(end||today())-new Date(start))/86400000)+20}const outputsize=Math.max(30,Math.min(5000,days));
 const out=await v81Market("history",{symbol,interval:"1day",outputsize:String(outputsize)},V81_HISTORY_TTL),d=out.data||{},vals=d.values||[];
 const arr=vals.map(x=>[x.datetime,Number(x.close)]).filter(x=>x[0]&&x[1]>0).sort((a,b)=>a[0].localeCompare(b[0]));if(arr.length<2)throw new Error(`${symbol} geçmiş verisi alınamadı`);
 v8Prices[symbol]=arr;localStorage.setItem(V8_PRICE_KEY,JSON.stringify(v8Prices));v8PriceInfo();return arr;
}
async function v81PrepareHistories(symbols,start,end){$("#v81HistoryStatus").textContent="Geçmiş veriler hazırlanıyor…";for(const s of [...new Set(symbols.filter(Boolean).map(x=>x.toUpperCase()))])await v81EnsureHistory(s,start,end);$("#v81HistoryStatus").textContent="Geçmiş veriler hazır · cache kullanılıyor"}

function v8Render(){
 if(!$("#v8NetWorth"))return;
 if($("#v81LastRefresh"))$("#v81LastRefresh").textContent=v8.market?.lastRefresh?`Son yenileme ${new Date(v8.market.lastRefresh).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`:"";

 const total=v8TotalTry(),usd=total/Math.max(.0001,Number(v8.rates.usdtry||1)),cost=v8.assets.reduce((s,a)=>s+v8AssetCostTry(a),0),pl=total-cost;
 const prev=v8.assets.reduce((s,a)=>s+Number(a.qty||0)*Number(a.prev||a.price||0)*v8Fx(a),0),day=total-prev,dayPct=prev?day/prev*100:0;
 $("#v8NetWorth").textContent=v8FormatTryValue(total);$("#v8NetMeta").textContent=`${v8.assets.length} varlık · Maliyet bazlı ${pl>=0?"+":""}${v8FormatTryValue(pl,"TRY")}`;
 $("#v8Metrics").innerHTML=`<div class="v8-metric"><span>Bugün</span><strong class="${day>=0?"good":"bad"}">${day>=0?"+":""}${money(day)}</strong></div><div class="v8-metric"><span>Günlük %</span><strong class="${dayPct>=0?"good":"bad"}">${dayPct>=0?"+":""}${dayPct.toFixed(2)}%</strong></div><div class="v8-metric"><span>Toplam P/L</span><strong class="${pl>=0?"good":"bad"}">${pl>=0?"+":""}${money(pl)}</strong></div>`;
 document.querySelectorAll("[data-measure]").forEach(b=>b.classList.toggle("active",b.dataset.measure===v8.measure));$("#v8AssetCount").textContent=`${v8.assets.length} varlık`;
 const typeTotals={};v8.assets.forEach(a=>typeTotals[a.type]=(typeTotals[a.type]||0)+v8AssetValueTry(a));const alloc=Object.entries(typeTotals).sort((a,b)=>b[1]-a[1]);
 $("#v8Allocation").innerHTML=alloc.map(([t,val],i)=>`<span style="width:${total?val/total*100:0}%;background:${v8Color(i)}"></span>`).join("");
 $("#v8AllocationLegend").innerHTML=alloc.length?alloc.map(([t,val],i)=>`<div class="v8-legendrow"><span><i class="v8-dot" style="background:${v8Color(i)}"></i>${v8TypeName(t)}</span><strong>%${total?(val/total*100).toFixed(1):0}</strong></div>`).join(""):`<div class="v7-empty">Henüz varlık eklenmedi.</div>`;
 $("#v8Snapshots").innerHTML=v8.snapshots.length?v8.snapshots.slice(-4).reverse().map(s=>`<div class="v8-snap"><span>${v51RecentDate(s.date)}</span><strong>${v8FormatTryValue(s.total,"TRY")}</strong></div>`).join(""):`<div class="v7-empty">Henüz anlık görüntü yok.</div>`;

 $("#v8AssetsList").innerHTML=v8.assets.length?[...v8.assets].sort((a,b)=>v8AssetValueTry(b)-v8AssetValueTry(a)).map(a=>{const val=v8AssetValueTry(a),c=v8AssetCostTry(a),p=c?(val-c)/c*100:0;return `<div class="v8-asset"><div><div class="v8-assetname">${v51Esc(a.name)}</div><div class="v8-assetmeta">${v51Esc(v8TypeName(a.type))}${a.symbol?` · ${v51Esc(a.symbol.toUpperCase())}`:""}${a.exchange?` · ${v51Esc(a.exchange)}`:""} · ${a.qty} × ${a.currency} ${a.price}${a.marketUpdatedAt?` · ${new Date(a.marketUpdatedAt).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}`:""}</div></div><div class="v8-assetval"><span>Değer</span><strong>${money(val)}</strong></div><div class="v8-assetval v8-hide-mobile"><span>P/L</span><strong class="${p>=0?"good":"bad"}">${p>=0?"+":""}${p.toFixed(1)}%</strong></div><div class="v8-assetval v8-hide-mobile"><span>Ağırlık</span><strong>%${total?(val/total*100).toFixed(1):0}</strong></div><div class="v8-asset-actions"><button class="ghost" data-v8edit="${v51Esc(a.id)}">Düzenle</button></div></div>`}).join(""):`<div class="v7-empty">Altın, hisse, ETF, kripto, nakit, ev, araç veya başka bir varlık ekleyebilirsin.</div>`;
 $("#v8AssetsList").querySelectorAll("[data-v8edit]").forEach(b=>b.onclick=()=>v8OpenAsset(b.dataset.v8edit));
 $("#v8UsdTry").value=v8.rates.usdtry;$("#v8GramGold").value=v8.rates.gramGold;

 const profile=v8.profile||v8Defaults().profile,personalUsd=profile.mode==="household"?usd/Math.max(1,Number(profile.adults||1)):usd,gr=v8WealthEstimateUSD(personalUsd,"global"),tr=v8WealthEstimateUSD(personalUsd,"tr"),fmtTop=x=>x<.1?`ilk %${x.toFixed(2)}`:x<1?`ilk %${x.toFixed(1)}`:`ilk %${Math.round(x)}`;
 $("#v81Age").value=profile.age||"";$("#v81WealthMode").value=profile.mode||"personal";$("#v81Adults").value=profile.adults||1;$("#v81AdultsWrap").style.display=profile.mode==="household"?"block":"none";const age=Number(profile.age||0),ageNote=age?`Yaş ${age}: yaş grubuna özel güvenilir eşik seti henüz bağlı değil. Genel yetişkin sonucu gösteriliyor; yaş verisi ileride yaş-kohort modeli için saklanıyor.`:"Yaşını girersen ileride yaş grubuna göre deneysel karşılaştırmayı da ayrı gösterebiliriz.";$("#v81AgeRank").textContent=(profile.mode==="household"?`Hane serveti ${profile.adults||1} yetişkine bölünerek kişi başı normalize edildi. `:"")+ageNote;
 $("#v8WealthRanks").innerHTML=`<div class="v8-rank"><div class="flag">🇹🇷</div><div class="rankbig">${fmtTop(tr.top)}</div><div class="rankmeta">Türkiye’de tahmini servet konumu · deneysel interpolasyon</div></div><div class="v8-rank"><div class="flag">🌍</div><div class="rankbig">${fmtTop(gr.top)}</div><div class="rankmeta">Dünya yetişkin servet dağılımında yaklaşık konum</div></div>`;
 const ladd=[["Alt %50",50],["%50–75",75],["%75–90",90],["%90–99",99],["İlk %1",100]];
 $("#v8WealthLadder").innerHTML=ladd.map(([label,p])=>`<div class="v8-ladderrow"><span>${label}</span><div class="v8-ladderbar">${gr.pct<=p&&gr.pct>(p===50?0:(p===75?50:p===90?75:p===99?90:99))?`<i style="left:${Math.max(2,Math.min(98,(gr.pct-(p===50?0:(p===75?50:p===90?75:p===99?90:99)))/(p-(p===50?0:(p===75?50:p===90?75:p===99?90:99)))*100))}%"></i>`:""}</div><strong>${p}%</strong></div>`).join("");

 v8RenderBtRows();v8RenderCompareRows();v8PriceInfo();
}
function v8RenderBtRows(){
 $("#v8BtRows").innerHTML=v8.btRows.map((r,i)=>`<div class="v8-hyporow"><input data-btsym="${i}" value="${v51Esc(r.symbol||"")}" placeholder="Sembol"><input data-btweight="${i}" type="number" min="0" max="100" step="1" value="${Number(r.weight||0)}"><button class="ghost" data-btdel="${i}" type="button">Sil</button></div>`).join("");
 $("#v8BtRows").querySelectorAll("[data-btsym]").forEach(e=>e.onchange=()=>{v8.btRows[+e.dataset.btsym].symbol=e.value.trim().toUpperCase();v8Save(false)});
 $("#v8BtRows").querySelectorAll("[data-btweight]").forEach(e=>e.onchange=()=>{v8.btRows[+e.dataset.btweight].weight=Math.max(0,Number(e.value)||0);v8Save(false)});
 $("#v8BtRows").querySelectorAll("[data-btdel]").forEach(e=>e.onclick=()=>{v8.btRows.splice(+e.dataset.btdel,1);v8Save(false)});
}
function v8RenderCompareRows(){
 $("#v8CompareRows").innerHTML=v8.compare.map((r,i)=>`<div class="v8-benchmark"><input data-cname="${i}" value="${v51Esc(r.name||"")}" placeholder="Senaryo adı"><input data-csym="${i}" value="${v51Esc(r.symbol||"")}" placeholder="Sembol"><span class="v8-bench-cost"></span><button class="ghost" data-cdel="${i}" type="button">Sil</button></div>`).join("");
 $("#v8CompareRows").querySelectorAll("[data-cname]").forEach(e=>e.onchange=()=>{v8.compare[+e.dataset.cname].name=e.value;v8Save(false)});
 $("#v8CompareRows").querySelectorAll("[data-csym]").forEach(e=>e.onchange=()=>{v8.compare[+e.dataset.csym].symbol=e.value.trim().toUpperCase();v8Save(false)});
 $("#v8CompareRows").querySelectorAll("[data-cdel]").forEach(e=>e.onclick=()=>{v8.compare.splice(+e.dataset.cdel,1);v8Save(false)});
}
function v8ParseCsv(text){
 const lines=text.replace(/\r/g,"").split("\n").filter(Boolean),head=lines.shift().split(",").map(x=>x.trim().toLowerCase()),di=head.indexOf("date"),si=head.indexOf("symbol"),ci=head.indexOf("close");if(di<0||si<0||ci<0)throw new Error("columns");
 const out={};for(const line of lines){const p=line.split(","),d=p[di]?.trim(),s=p[si]?.trim().toUpperCase(),c=Number(p[ci]);if(!d||!s||!(c>0))continue;(out[s]??=[]).push([d,c])}Object.values(out).forEach(a=>a.sort((x,y)=>x[0].localeCompare(y[0])));return out;
}
function v8PriceInfo(){const syms=Object.keys(v8Prices),n=syms.reduce((s,k)=>s+v8Prices[k].length,0);if($("#v8PriceInfo"))$("#v8PriceInfo").textContent=syms.length?`${syms.length} sembol · ${n} fiyat noktası · ${syms.join(", ")}`:"Henüz fiyat geçmişi yok."}
function v8Series(symbol,start,end){return (v8Prices[String(symbol).toUpperCase()]||[]).filter(x=>(!start||x[0]>=start)&&(!end||x[0]<=end))}
function v8MonthlyKey(d){return d.slice(0,7)}
function v8Backtest(rows,start,end,capital,contrib,frequency,rebalance){
 rows=rows.filter(r=>r.symbol&&r.weight>0);const ws=rows.reduce((s,r)=>s+Number(r.weight),0);if(!rows.length||!ws)throw new Error("Portföy ağırlığı yok");
 const maps={},datesSet=new Set();for(const r of rows){const ser=v8Series(r.symbol,start,end);if(ser.length<2)throw new Error(`${r.symbol} için yeterli fiyat yok`);maps[r.symbol]=Object.fromEntries(ser);ser.forEach(x=>datesSet.add(x[0]))}
 const dates=[...datesSet].sort();const common=dates.filter(d=>rows.every(r=>maps[r.symbol][d]));if(common.length<2)throw new Error("Sembollerin ortak tarihleri yetersiz");
 let cash=0,shares={};rows.forEach(r=>shares[r.symbol]=capital*(r.weight/ws)/maps[r.symbol][common[0]]);
 let invested=capital,lastMonth=v8MonthlyKey(common[0]),lastYear=common[0].slice(0,4),curve=[];
 for(let i=0;i<common.length;i++){const d=common[i],month=v8MonthlyKey(d),year=d.slice(0,4);let value=Object.entries(shares).reduce((s,[sym,q])=>s+q*maps[sym][d],cash);
   if(i>0&&frequency==="monthly"&&month!==lastMonth&&contrib>0){rows.forEach(r=>shares[r.symbol]+=contrib*(r.weight/ws)/maps[r.symbol][d]);invested+=contrib;value+=contrib}
   const doRebal=i>0&&((rebalance==="monthly"&&month!==lastMonth)||(rebalance==="yearly"&&year!==lastYear));if(doRebal){value=Object.entries(shares).reduce((s,[sym,q])=>s+q*maps[sym][d],0);rows.forEach(r=>shares[r.symbol]=value*(r.weight/ws)/maps[r.symbol][d])}
   value=Object.entries(shares).reduce((s,[sym,q])=>s+q*maps[sym][d],cash);curve.push([d,value]);lastMonth=month;lastYear=year;
 }
 const final=curve.at(-1)[1],years=Math.max(1/365,(new Date(curve.at(-1)[0])-new Date(curve[0][0]))/31557600000),cagr=Math.pow(final/capital,1/years)-1;
 let peak=curve[0][1],mdd=0;const rets=[];for(let i=1;i<curve.length;i++){peak=Math.max(peak,curve[i][1]);mdd=Math.min(mdd,curve[i][1]/peak-1);rets.push(curve[i][1]/curve[i-1][1]-1)}
 const mean=rets.reduce((s,x)=>s+x,0)/Math.max(1,rets.length),sd=Math.sqrt(rets.reduce((s,x)=>s+(x-mean)**2,0)/Math.max(1,rets.length-1)),vol=sd*Math.sqrt(252),sharpe=vol?mean*252/vol:0;
 return {curve,final,invested,totalReturn:final/invested-1,cagr,mdd,vol,sharpe,start:curve[0][0],end:curve.at(-1)[0]};
}
function v8DrawChart(result){
 const box=$("#v8BtChart");if(!result){box.innerHTML='<div class="v8-chart-empty">Sonuç yok.</div>';return}
 const pts=result.curve,vals=pts.map(x=>x[1]),min=Math.min(...vals),max=Math.max(...vals),w=800,h=220,p=18,den=max-min||1,path=pts.map((x,i)=>`${i?"L":"M"} ${p+i/(pts.length-1)*(w-2*p)} ${h-p-(x[1]-min)/den*(h-2*p)}`).join(" ");
 box.innerHTML=`<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-label="Backtest eğrisi"><path d="${path}" fill="none" stroke="currentColor" stroke-width="3" vector-effect="non-scaling-stroke"/></svg>`;
}
function v8ShowBacktest(r){v8LastBacktest=r;$("#v8BtRange").textContent=`${r.start} → ${r.end}`;$("#v8BtStats").innerHTML=`<div class="v8-stat"><span>Son değer</span><strong>${money(r.final)}</strong></div><div class="v8-stat"><span>Toplam getiri</span><strong class="${r.totalReturn>=0?"good":"bad"}">${(r.totalReturn*100).toFixed(1)}%</strong></div><div class="v8-stat"><span>CAGR</span><strong>${(r.cagr*100).toFixed(1)}%</strong></div><div class="v8-stat"><span>Max drawdown</span><strong class="bad">${(r.mdd*100).toFixed(1)}%</strong></div><div class="v8-stat"><span>Volatilite</span><strong>${(r.vol*100).toFixed(1)}%</strong></div><div class="v8-stat"><span>Sharpe*</span><strong>${r.sharpe.toFixed(2)}</strong></div><div class="v8-stat"><span>Yatırılan</span><strong>${money(r.invested)}</strong></div><div class="v8-stat"><span>Net fark</span><strong>${money(r.final-r.invested)}</strong></div>`;v8DrawChart(r)}

// ===== V7 Personal Finance data =====
// V7 yapılandırma verileri ayrı tutulur; mevcut butcem_v1 işlem verisini ve Supabase şemasını bozmaz.
const V7_KEY="butcem_v7_finance";
function v7Defaults(){return {accounts:[],transfers:[],recurring:[],categoryBudgets:{},goals:[]}}
function v7Load(){try{const x=JSON.parse(localStorage.getItem(V7_KEY)||"{}");return {...v7Defaults(),...x,accounts:Array.isArray(x.accounts)?x.accounts:[],transfers:Array.isArray(x.transfers)?x.transfers:[],recurring:Array.isArray(x.recurring)?x.recurring:[],categoryBudgets:x.categoryBudgets&&typeof x.categoryBudgets==="object"?x.categoryBudgets:{},goals:Array.isArray(x.goals)?x.goals:[]}}catch(e){return v7Defaults()}}
let v7=v7Load();
function v7Save(){localStorage.setItem(V7_KEY,JSON.stringify(v7));v7Render();updateAccountSuggestions();v6Toast("Kaydedildi")}
function v7Id(){return crypto.randomUUID?crypto.randomUUID():Date.now()+""+Math.random()}
function v7AccountName(id){return v7.accounts.find(a=>a.id===id)?.name||""}
function v7AccountBalance(a){
 let b=Number(a.opening||0);
 state.transactions.forEach(t=>{if((t.cardName||"")!==a.name)return;b+=t.type==="income"?Number(t.amount||0):-Number(t.amount||0)});
 v7.transfers.forEach(t=>{if(t.from===a.id)b-=Number(t.amount||0);if(t.to===a.id)b+=Number(t.amount||0)});
 return b;
}
function v7DaysLabel(day){return `Her ayın ${day}. günü`}
function v7OpenTab(tab){
 document.querySelectorAll("[data-v7tab]").forEach(b=>b.classList.toggle("active",b.dataset.v7tab===tab));
 document.querySelectorAll(".v7-panel").forEach(p=>p.classList.remove("active"));
 $("#v7"+tab.charAt(0).toUpperCase()+tab.slice(1)+"Panel")?.classList.add("active");
}
function v7AccountOptions(selected=""){
 return '<option value="">Seç</option>'+v7.accounts.map(a=>`<option value="${v51Esc(a.id)}" ${a.id===selected?"selected":""}>${v51Esc(a.name)}</option>`).join("");
}
function v7Render(){
 if(!$("#v7AccountsList"))return;
 const balances=v7.accounts.map(a=>({a,b:v7AccountBalance(a)})),total=balances.reduce((s,x)=>s+x.b,0);
 $("#v7AccountSummary").innerHTML=`<div class="v7-summarybox"><span>Hesap sayısı</span><strong>${v7.accounts.length}</strong></div><div class="v7-summarybox"><span>Toplam bakiye*</span><strong>${money(total)}</strong></div><div class="v7-summarybox"><span>Transfer</span><strong>${v7.transfers.length}</strong></div>`;
 $("#v7AccountsList").innerHTML=balances.length?balances.map(({a,b})=>`<div class="v7-account" data-account="${v51Esc(a.id)}"><div class="name">${v51Esc(a.name)}</div><div class="kind">${v51Esc(a.type)}</div><div class="balance ${b<0?"bad":""}">${money(b)}</div><div class="flow">Başlangıç ${money(a.opening||0)}</div></div>`).join(""):`<div class="v7-empty">Henüz hesap yok. Enpara, nakit, kredi kartı gibi kullandığın hesapları ekleyebilirsin.</div>`;
 $("#v7AccountsList").querySelectorAll("[data-account]").forEach(el=>el.onclick=()=>v7OpenAccount(el.dataset.account));
 $("#v7TransferFrom").innerHTML=v7AccountOptions($("#v7TransferFrom").value);$("#v7TransferTo").innerHTML=v7AccountOptions($("#v7TransferTo").value);

 $("#v7RecurringList").innerHTML=v7.recurring.length?v7.recurring.map(r=>`<div class="v7-row"><div class="v7-rowmain"><div class="v7-rowtitle">${v51Esc(r.description)}</div><div class="v7-rowmeta">${r.type==="income"?"Gelir":"Harcama"} · ${money(r.amount)} · ${v51Esc(r.category||"Diğer")} · ${v51Esc(r.account||"Hesap yok")}</div><span class="v7-recurring-badge">${v7DaysLabel(r.day)}</span></div><div class="v7-rowactions"><button class="ghost" data-rec-edit="${v51Esc(r.id)}">Düzenle</button><button class="primary" data-rec-add="${v51Esc(r.id)}">Bu aya ekle</button></div></div>`).join(""):`<div class="v7-empty">Kira, abonelik, maaş, burs gibi her ay tekrarlanan işlemleri burada saklayabilirsin.</div>`;
 $("#v7RecurringList").querySelectorAll("[data-rec-edit]").forEach(b=>b.onclick=()=>v7OpenRecurring(b.dataset.recEdit));
 $("#v7RecurringList").querySelectorAll("[data-rec-add]").forEach(b=>b.onclick=()=>v7ApplyRecurring(b.dataset.recAdd));

 const monthTx=state.transactions.filter(t=>t.date&&t.date.startsWith(selectedMonth)&&t.type==="expense");
 $("#v7CategoryBudgets").innerHTML=state.categories.map(cat=>{const lim=Number(v7.categoryBudgets[cat]||0),spent=monthTx.filter(t=>t.category===cat).reduce((s,t)=>s+Number(t.amount||0),0),pct=lim?Math.min(100,spent/lim*100):0;return `<div class="v7-budgetrow"><div class="v7-budgettop"><div><strong>${v51Esc(cat)}</strong><div class="v7-rowmeta">${money(spent)} harcandı${lim?` · ${money(Math.max(0,lim-spent))} kaldı`:""}</div></div><input data-catbudget="${v51Esc(cat)}" type="number" min="0" step="100" value="${lim||""}" placeholder="Limit" style="width:110px;margin:0"></div>${lim?`<div class="v7-progress"><span style="width:${pct}%"></span></div>`:""}</div>`}).join("");
 $("#v7CategoryBudgets").querySelectorAll("[data-catbudget]").forEach(i=>i.onchange=()=>{const v=Math.max(0,Number(i.value)||0);if(v)v7.categoryBudgets[i.dataset.catbudget]=v;else delete v7.categoryBudgets[i.dataset.catbudget];localStorage.setItem(V7_KEY,JSON.stringify(v7));v7Render()});

 $("#v7GoalsList").innerHTML=v7.goals.length?v7.goals.map(g=>{const target=Number(g.target||0),cur=Number(g.current||0),pct=target?Math.min(100,cur/target*100):0;return `<div class="v7-goal"><strong>${v51Esc(g.name)}</strong><div class="amount">${money(cur)} <span style="font-size:11px;color:var(--muted)">/ ${money(target)}</span></div><div class="v7-progress"><span style="width:${pct}%"></span></div><div class="meta">%${Math.round(pct)}${g.date?` · ${v51Esc(g.date)}`:""}</div><div class="v7-goal-actions"><button class="primary" data-goal-add="${v51Esc(g.id)}">+ Para ekle</button><button class="ghost" data-goal-edit="${v51Esc(g.id)}">Düzenle</button></div></div>`}).join(""):`<div class="v7-empty">Tatil, acil durum fonu, araba veya başka bir hedef oluşturabilirsin.</div>`;
 $("#v7GoalsList").querySelectorAll("[data-goal-edit]").forEach(b=>b.onclick=()=>v7OpenGoal(b.dataset.goalEdit));
 $("#v7GoalsList").querySelectorAll("[data-goal-add]").forEach(b=>b.onclick=()=>{$("#v7GoalAddId").value=b.dataset.goalAdd;$("#v7GoalAddAmount").value="";$("#v7GoalAddDialog").showModal()});
}
function v7OpenAccount(id=""){
 const a=v7.accounts.find(x=>x.id===id);$("#v7AccountId").value=a?.id||"";$("#v7AccountTitle").textContent=a?"Hesabı düzenle":"Hesap ekle";$("#v7AccountName").value=a?.name||"";$("#v7AccountType").value=a?.type||"Banka Hesabı";$("#v7AccountOpening").value=a?.opening??0;$("#v7DeleteAccount").style.display=a?"inline-block":"none";$("#v7AccountDialog").showModal();
}
function v7OpenRecurring(id=""){
 const r=v7.recurring.find(x=>x.id===id);$("#v7RecurringId").value=r?.id||"";$("#v7RecurringTitle").textContent=r?"Düzenli işlemi düzenle":"Düzenli işlem ekle";$("#v7RecurringType").value=r?.type||"expense";$("#v7RecurringAmount").value=r?.amount||"";$("#v7RecurringDesc").value=r?.description||"";$("#v7RecurringCategory").value=r?.category||"";$("#v7RecurringAccount").value=r?.account||"";$("#v7RecurringDay").value=r?.day||1;$("#v7RecurringStart").value=r?.start||today();$("#v7DeleteRecurring").style.display=r?"inline-block":"none";$("#v7RecurringDialog").showModal();
}
function v7OpenGoal(id=""){
 const g=v7.goals.find(x=>x.id===id);$("#v7GoalId").value=g?.id||"";$("#v7GoalTitle").textContent=g?"Hedefi düzenle":"Hedef ekle";$("#v7GoalName").value=g?.name||"";$("#v7GoalTarget").value=g?.target||"";$("#v7GoalCurrent").value=g?.current??0;$("#v7GoalDate").value=g?.date||"";$("#v7DeleteGoal").style.display=g?"inline-block":"none";$("#v7GoalDialog").showModal();
}
function v7ApplyRecurring(id){
 const r=v7.recurring.find(x=>x.id===id);if(!r)return;
 const [y,m]=selectedMonth.split("-").map(Number),day=Math.min(Number(r.day||1),new Date(y,m,0).getDate()),date=`${selectedMonth}-${String(day).padStart(2,"0")}`;
 const marker=`recurring:${r.id}:${selectedMonth}`;if(state.transactions.some(t=>t.note===marker)){v6Toast("Bu düzenli işlem bu aya zaten eklendi");return}
 state.transactions.push({id:v7Id(),type:r.type,amount:Number(r.amount),category:r.category||(r.type==="income"?"Diğer Gelir":"Diğer"),payment:"Havale / EFT",cardName:r.account||"",description:r.description,note:marker,date,updatedAt:new Date().toISOString()});save();v7Render();v5Refresh();v6Toast(`${r.description} ${v51MonthLabel(selectedMonth)} ayına eklendi`);
}

// ===== V6 yardımcıları =====
let v6ToastTimer=null;
function v6Toast(text,actionText="",actionFn=null){
 const el=$("#v6Toast"),btn=$("#v6ToastAction");if(!el)return;
 $("#v6ToastText").textContent=text;btn.style.display=actionFn?"inline-block":"none";btn.textContent=actionText||"Geri al";btn.onclick=()=>{clearTimeout(v6ToastTimer);el.classList.remove("show");actionFn?.()};
 el.classList.add("show");clearTimeout(v6ToastTimer);v6ToastTimer=setTimeout(()=>el.classList.remove("show"),2600);
}
function v6CsvCell(v){const s=String(v??"");return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function v6CurrentFiltered(){
 const scope=$("#txnScope")?.value||"month",search=($("#txnSearch")?.value||"").trim().toLocaleLowerCase("tr-TR"),ft=$("#txnFilterType")?.value||"all",fc=$("#txnFilterCategory")?.value||"all",fp=$("#txnFilterPayment")?.value||"all",sort=$("#txnSort")?.value||"date_desc";
 let arr=(scope==="all"?state.transactions:state.transactions.filter(t=>t.date&&t.date.startsWith(selectedMonth))).filter(t=>(ft==="all"||t.type===ft)&&(fc==="all"||t.category===fc)&&(fp==="all"||(t.cardName||t.payment)===fp)&&(!search||[t.description,t.category,t.payment,t.cardName,t.note,String(t.amount)].join(" ").toLocaleLowerCase("tr-TR").includes(search)));
 const sorters={date_desc:(a,b)=>String(b.date).localeCompare(String(a.date)),date_asc:(a,b)=>String(a.date).localeCompare(String(b.date)),amount_desc:(a,b)=>Number(b.amount)-Number(a.amount),amount_asc:(a,b)=>Number(a.amount)-Number(b.amount)};
 return arr.sort(sorters[sort]||sorters.date_desc);
}
function v6ExportCurrentFilter(){
 const arr=v6CurrentFiltered();if(!arr.length){v6Toast("Dışa aktarılacak işlem yok");return}
 const rows=[["Tarih","Tür","Tutar","Kategori","Ödeme","Hesap/Kart","Açıklama","Not"],...arr.map(t=>[t.date,t.type,t.amount,t.category,t.payment,t.cardName||"",t.description||"",t.note||""])];
 download(`butcem-filtre-${today()}.csv`,"\ufeff"+rows.map(r=>r.map(v6CsvCell).join(",")).join("\n"),"text/csv;charset=utf-8");v6Toast(`${arr.length} işlem CSV olarak indirildi`);
}
function v6DaysInMonth(key){const [y,m]=key.split("-").map(Number);return new Date(y,m,0).getDate()}
function v6ElapsedDays(key){if(key!==currentMonth())return v6DaysInMonth(key);return Math.max(1,new Date().getDate())}

// ===== V5.1 kişiselleştirme / Financial Dashboard =====
const V5_PREF_KEY="butcem_v5_preferences";
function v5GetPrefs(){try{return JSON.parse(localStorage.getItem(V5_PREF_KEY))}catch(e){return null}}
function v5SetPrefs(p){localStorage.setItem(V5_PREF_KEY,JSON.stringify(p))}
function v5Theme(t){document.documentElement.dataset.theme=t;let p=v5GetPrefs()||{modules:["budget"],startView:"summary"};p.theme=t;v5SetPrefs(p);const icon=t==="dark"?"☀":"◐";if($("#v5Theme")){$("#v5Theme").textContent=icon;$("#v5Theme").title=t==="dark"?"Açık tema":"Koyu tema"}if($("#v6ThemeTop")){$("#v6ThemeTop").textContent=icon;$("#v6ThemeTop").title=t==="dark"?"Açık tema":"Koyu tema"}if($("#v6AssetsTheme")){$("#v6AssetsTheme").textContent=icon;$("#v6AssetsTheme").title=t==="dark"?"Açık tema":"Koyu tema"}if($("#v7Theme")){$("#v7Theme").textContent=icon;$("#v7Theme").title=t==="dark"?"Açık tema":"Koyu tema"}if($("#v6ThemeSelect"))$("#v6ThemeSelect").value=t}
function v51MonthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function v51MonthLabel(key){let [y,m]=key.split("-").map(Number);return new Date(y,m-1,1).toLocaleDateString("tr-TR",{month:"long",year:"numeric"})}
function v51Esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function v51RecentDate(s){if(!s)return "";let [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d).toLocaleDateString("tr-TR",{day:"numeric",month:"short"})}

function v5Refresh(){
 const key=selectedMonth, tx=state.transactions.filter(t=>t.date&&t.date.startsWith(key));
 const inc=tx.filter(t=>t.type==="income").reduce((a,t)=>a+Number(t.amount||0),0);
 const ex=tx.filter(t=>t.type==="expense").reduce((a,t)=>a+Number(t.amount||0),0);
 const net=inc-ex, budget=Number(state.monthlyBudget||0), remaining=budget?budget-ex:null;
 const q=s=>document.querySelector(s);
 q("#v5Income").textContent=money(inc);q("#v5Expense").textContent=money(ex);q("#v5Net").textContent=money(net);
 q("#v5Net").className=net>=0?"good":"bad";q("#v5Saving").textContent=inc>0?`%${Math.round(net/inc*100)}`:"—";
 document.querySelectorAll(".v51-stat-delta").forEach((el,i)=>{if(i<2)el.textContent=key===currentMonth()?"Bu ay":"Seçili ay"});
 q("#v51Month").textContent=v51MonthLabel(key);
 const isCurrent=key===currentMonth();
 q("#v53HeroKicker").textContent=isCurrent?"BU AY KALAN":"SEÇİLİ AY KALAN";
 q("#v53PeriodTag").textContent=isCurrent?"Güncel ay özeti":"Geçmiş ay özeti";
 q("#v53NextMonth").disabled=key>=currentMonth();
 q("#v6ThisMonth").style.display=isCurrent?"none":"inline-block";
 q("#v6MonthPicker").max=currentMonth();q("#v6MonthPicker").value=key;
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

 // Six-month chart — seçili ayda biter
 const [sy,sm]=key.split("-").map(Number), anchorDate=new Date(sy,sm-1,1), months=[];
 for(let i=5;i>=0;i--){
   let d=new Date(anchorDate.getFullYear(),anchorDate.getMonth()-i,1),k=v51MonthKey(d);
   let mts=state.transactions.filter(t=>t.date&&t.date.startsWith(k));
   months.push({
     k,
     label:d.toLocaleDateString("tr-TR",{month:"short"}),
     full:d.toLocaleDateString("tr-TR",{month:"long",year:"numeric"}),
     inc:mts.filter(t=>t.type==="income").reduce((a,t)=>a+Number(t.amount||0),0),
     ex:mts.filter(t=>t.type==="expense").reduce((a,t)=>a+Number(t.amount||0),0)
   });
 }
 const max=Math.max(1,...months.flatMap(x=>[x.inc,x.ex]));
 const compact=n=>new Intl.NumberFormat("tr-TR",{notation:"compact",maximumFractionDigits:1}).format(n||0);
 q("#v51Chart").innerHTML=months.map(x=>`
   <div class="v51-monthcol" data-month="${x.k}" tabindex="0">
     <div class="v53-tooltip">
       <strong>${v51Esc(x.full)}</strong>
       <div class="v53-tooltip-row"><span>Gelir</span><b class="good">${money(x.inc)}</b></div>
       <div class="v53-tooltip-row"><span>Harcama</span><b class="bad">${money(x.ex)}</b></div>
       <div class="v53-tooltip-row"><span>Net</span><b class="${x.inc-x.ex>=0?"good":"bad"}">${money(x.inc-x.ex)}</b></div>
     </div>
     <div class="v51-bars">
       <div class="v53-barwrap"><span class="v53-barvalue">${x.inc?compact(x.inc):""}</span><span class="v51-bar income" title="Gelir ${money(x.inc)}" style="height:${Math.max(x.inc?3:0,x.inc/max*100)}%"></span></div>
       <div class="v53-barwrap"><span class="v53-barvalue">${x.ex?compact(x.ex):""}</span><span class="v51-bar expense" title="Harcama ${money(x.ex)}" style="height:${Math.max(x.ex?3:0,x.ex/max*100)}%"></span></div>
     </div>
     <div class="v51-monthname">${v51Esc(x.label)}</div>
   </div>`).join("");
 q("#v51Chart").querySelectorAll(".v51-monthcol").forEach(col=>{
   const tip=col.querySelector(".v53-tooltip");
   const show=()=>{q("#v51Chart").querySelectorAll(".v51-monthcol").forEach(c=>{if(c!==col){c.classList.remove("active");c.querySelector(".v53-tooltip")?.classList.remove("show")}});col.classList.add("active");tip.classList.add("show")};
   const hide=()=>{col.classList.remove("active");tip.classList.remove("show")};
   col.addEventListener("mouseenter",show);col.addEventListener("mouseleave",hide);
   col.addEventListener("focus",show);col.addEventListener("blur",hide);
   col.addEventListener("click",e=>{e.stopPropagation();show()});
 });

 // Smart insights
 const elapsed=v6ElapsedDays(key),daysTotal=v6DaysInMonth(key),daily=ex/elapsed,projection=isCurrent?daily*daysTotal:ex;
 q("#v6DailyAvg").textContent=money(daily);q("#v6Projection").textContent=money(projection);
 q("#v6ProjectionMeta").textContent=isCurrent?"Mevcut tempoya göre":(ex?"Gerçekleşen ay toplamı":"Bu ay veri yok");
 const expTx=tx.filter(t=>t.type==="expense").sort((a,b)=>Number(b.amount)-Number(a.amount)),largest=expTx[0];
 q("#v6Largest").textContent=largest?money(largest.amount):"—";q("#v6LargestMeta").textContent=largest?(largest.description||largest.category):"Henüz harcama yok";
 const spendingDays=new Set(expTx.map(t=>t.date)).size;q("#v6NoSpend").textContent=Math.max(0,elapsed-spendingDays)+" gün";
 const alertBox=q("#v6BudgetAlert");
 if(!budget){alertBox.className="v6-alert";alertBox.textContent="Aylık bütçe belirleyerek harcama temposu ve ay sonu uyarılarını daha anlamlı hale getirebilirsin."}
 else if(ex>budget){alertBox.className="v6-alert warn";alertBox.textContent=`Bütçe ${money(ex-budget)} aşıldı. Toplam kullanım %${Math.round(ex/budget*100)}.`}
 else if(isCurrent&&projection>budget){alertBox.className="v6-alert warn";alertBox.textContent=`Bu tempoyla ay sonu harcaması yaklaşık ${money(projection)} olabilir; bütçenin ${money(projection-budget)} üzerine çıkabilir.`}
 else{alertBox.className="v6-alert";alertBox.textContent=`Bütçenin %${Math.round(ex/budget*100)}'i kullanıldı. Kalan ${money(Math.max(0,budget-ex))}.`}

 const pay={};expTx.forEach(t=>{const k=t.cardName||t.payment||"Belirtilmedi";pay[k]=(pay[k]||0)+Number(t.amount||0)});
 const payRows=Object.entries(pay).sort((a,b)=>b[1]-a[1]).slice(0,6);
 q("#v6Payments").innerHTML=payRows.length?payRows.map(([name,val])=>`<div class="v6-payment-row"><div><div class="v6-payment-name">${v51Esc(name)}</div><div class="v6-payment-meta">%${ex?Math.round(val/ex*100):0} · seçili ay</div></div><strong>${money(val)}</strong></div>`).join(""):`<div class="v51-empty">Bu ay ödeme hareketi yok.</div>`;

 // Recent transactions
 const recent=[...tx].sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,5);
 q("#v51Recent").innerHTML=recent.length?recent.map(t=>`<div class="v51-recent-row" data-id="${v51Esc(t.id)}"><div class="v51-recent-main"><div class="v51-recent-title">${v51Esc(t.description||t.category||"İşlem")}</div><div class="v51-recent-meta">${v51Esc(t.category||"")} · ${v51Esc(t.cardName||t.payment||"")} · ${v51RecentDate(t.date)}</div></div><div class="v51-recent-amt ${t.type==="income"?"good":"bad"}">${t.type==="income"?"+":"−"}${money(t.amount)}</div></div>`).join(""):`<div class="v51-empty">Henüz işlem yok. Sağ alttaki + ile ilk kaydını ekleyebilirsin.</div>`;
 q("#v51Recent").querySelectorAll("[data-id]").forEach(row=>row.onclick=()=>{const t=findTxn(row.dataset.id);if(t)openTxn(t.type,t)});
}
function v5Show(view){
 let sum=$("#v5Summary"),app=document.querySelector(".app"),assets=$("#v6Assets"),finance=$("#v7Finance");
 document.body.dataset.view=view;
 sum.classList.toggle("v5-hide",view!=="summary");
 app.classList.toggle("v5-hide",!(view==="budget"||view==="transactions"));
 assets.classList.toggle("v5-hide",view!=="assets");
 if(view==="assets"){v8Render();v81RefreshAll(false).catch(()=>{})}
 finance.classList.toggle("v5-hide",view!=="finance");
 if(view==="summary")v5Refresh();
 if(view==="finance")v7Render();
 if(view==="budget"||view==="transactions"){render();window.scrollTo({top:0,behavior:"smooth"})}
 document.querySelectorAll("#v5Nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 let p=v5GetPrefs()||{modules:["budget"]};p.lastView=view;v5SetPrefs(p);
}
function v6SummaryPulse(){const el=$("#v5Summary");el.classList.remove("v6-summary-motion");void el.offsetWidth;el.classList.add("v6-summary-motion")}
function v5Init(){
 let p=v5GetPrefs();
 if(!p){document.querySelector("#v5Onboarding").classList.remove("v5-hide")}
 else{v5Theme(p.theme||"light");v5Show(p.startView||"summary")}
 document.querySelector("#v5Done").onclick=()=>{let modules=[...document.querySelectorAll("#v5Onboarding input:checked")].map(x=>x.value),startView=document.querySelector("#v5Start").value;p={modules:modules.length?modules:["budget"],startView,theme:"light"};v5SetPrefs(p);document.querySelector("#v5Onboarding").classList.add("v5-hide");v5Show(startView)};
 document.querySelectorAll("#v5Nav button").forEach(b=>b.onclick=()=>v5Show(b.dataset.view));
 document.querySelector("#v5Theme").onclick=()=>v5Theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
 document.querySelector("#v6ThemeTop").onclick=()=>v5Theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
 document.querySelector("#v6AssetsTheme").onclick=()=>v5Theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
 document.querySelector("#v6SummaryCloud").onclick=openAuth;
 document.querySelector("#v6AssetsCloud").onclick=openAuth;
 document.querySelector("#v6SummarySettings").onclick=()=>$("#settingsBtn").click();
 document.querySelector("#v6AssetsSettings").onclick=()=>$("#settingsBtn").click();
 document.querySelectorAll("[data-v8tab]").forEach(b=>b.onclick=()=>v8OpenTab(b.dataset.v8tab));
 document.querySelectorAll("[data-measure]").forEach(b=>b.onclick=()=>{v8.measure=b.dataset.measure;v8Save(false)});
 $("#v8AddAsset").onclick=()=>v8OpenAsset();
 $("#v81RefreshAll").onclick=()=>v81RefreshAll(true);
 $("#v81AssetSearch").oninput=e=>{clearTimeout(v81SearchTimer);const q=e.target.value;v81SearchTimer=setTimeout(async()=>{try{v81RenderSearch(await v81Search(q))}catch(err){$("#v81SearchResults").style.display="none"}},450)};
 $("#v81WealthMode").onchange=e=>$("#v81AdultsWrap").style.display=e.target.value==="household"?"block":"none";
 $("#v81SaveWealthProfile").onclick=()=>{v8.profile={age:$("#v81Age").value?Number($("#v81Age").value):null,mode:$("#v81WealthMode").value,adults:Math.max(1,Number($("#v81Adults").value)||1),country:$("#v81Country").value};v8Save()};

 $("#v8AssetForm").onsubmit=e=>{e.preventDefault();const id=$("#v8AssetId").value,existing=v8.assets.find(x=>x.id===id)||{},a={...existing,id:id||v7Id(),name:$("#v8AssetName").value.trim(),type:$("#v8AssetType").value,symbol:$("#v8AssetSymbol").value.trim().toUpperCase(),qty:Number($("#v8AssetQty").value)||0,price:Number($("#v8AssetPrice").value)||0,currency:$("#v8AssetCurrency").value,cost:Number($("#v8AssetCost").value)||0,prev:Number($("#v8AssetPrev").value)||0,note:$("#v8AssetNote").value.trim()};const i=v8.assets.findIndex(x=>x.id===id);if(i>=0)v8.assets[i]=a;else v8.assets.push(a);$("#v8AssetDialog").close();v8Save()};
 $("#v8DeleteAsset").onclick=()=>{const id=$("#v8AssetId").value;if(!id||!confirm("Bu varlık silinsin mi?"))return;v8.assets=v8.assets.filter(a=>a.id!==id);$("#v8AssetDialog").close();v8Save()};
 $("#v8SaveRates").onclick=()=>{v8.rates.usdtry=Math.max(.0001,Number($("#v8UsdTry").value)||1);v8.rates.gramGold=Math.max(.0001,Number($("#v8GramGold").value)||1);v8Save()};
 $("#v8TakeSnapshot").onclick=()=>{const d=today(),total=v8TotalTry(),i=v8.snapshots.findIndex(s=>s.date===d),snap={date:d,total};if(i>=0)v8.snapshots[i]=snap;else v8.snapshots.push(snap);v8.snapshots.sort((a,b)=>a.date.localeCompare(b.date));v8Save()};
 $("#v8PriceCsv").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const parsed=v8ParseCsv(await f.text());v8Prices={...v8Prices,...parsed};localStorage.setItem(V8_PRICE_KEY,JSON.stringify(v8Prices));v8PriceInfo();v6Toast("Fiyat geçmişi yüklendi")}catch(err){alert("CSV okunamadı. date,symbol,close başlıklarını kontrol et.")}finally{e.target.value=""}};
 $("#v8ClearPrices").onclick=()=>{if(confirm("Yüklenen backtest fiyat geçmişi silinsin mi?")){v8Prices={};localStorage.removeItem(V8_PRICE_KEY);v8PriceInfo();v8DrawChart(null)}};
 $("#v8AddBtRow").onclick=()=>{v8.btRows.push({symbol:"",weight:0});v8Save(false)};
 $("#v8RunBacktest").onclick=async()=>{try{const start=$("#v8BtStart").value,end=$("#v8BtEnd").value;await v81PrepareHistories(v8.btRows.map(x=>x.symbol),start,end);const r=v8Backtest(v8.btRows,start,end,Math.max(1,Number($("#v8BtCapital").value)||100000),Math.max(0,Number($("#v8BtContribution").value)||0),$("#v8BtFrequency").value,$("#v8BtRebalance").value);v8ShowBacktest(r)}catch(err){alert(err.message||"Backtest çalıştırılamadı.")}};
 $("#v8AddCompare").onclick=()=>{v8.compare.push({name:"Yeni senaryo",symbol:""});v8Save(false)};
 $("#v8RunCompare").onclick=async()=>{const start=$("#v8BtStart").value,end=$("#v8BtEnd").value;try{await v81PrepareHistories(v8.compare.map(x=>x.symbol),start,end)}catch(e){alert(e.message);return}const capital=Math.max(1,Number($("#v8BtCapital").value)||100000),contrib=Math.max(0,Number($("#v8BtContribution").value)||0),freq=$("#v8BtFrequency").value;const rows=[];for(const c of v8.compare){try{const r=v8Backtest([{symbol:c.symbol,weight:100}],start,end,capital,contrib,freq,"none");rows.push({name:c.name,symbol:c.symbol,r})}catch(err){rows.push({name:c.name,symbol:c.symbol,error:err.message})}}$("#v8CompareTable").innerHTML=`<table class="v8-table"><thead><tr><th>Senaryo</th><th>Son değer</th><th>Getiri</th><th>CAGR</th><th>Max DD</th></tr></thead><tbody>${rows.map(x=>x.error?`<tr><td>${v51Esc(x.name)} (${v51Esc(x.symbol)})</td><td colspan="4">${v51Esc(x.error)}</td></tr>`:`<tr><td>${v51Esc(x.name)} (${v51Esc(x.symbol)})</td><td>${money(x.r.final)}</td><td>${(x.r.totalReturn*100).toFixed(1)}%</td><td>${(x.r.cagr*100).toFixed(1)}%</td><td>${(x.r.mdd*100).toFixed(1)}%</td></tr>`).join("")}</tbody></table>`};
 $("#v8Backup").onclick=()=>download(`butcem-v8-${today()}.json`,JSON.stringify({app:"Bütçem",version:8,exportedAt:new Date().toISOString(),wealth:v8,prices:v8Prices},null,2),"application/json");
 $("#v8Restore").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text()),data=x.wealth||x;if(!data||!Array.isArray(data.assets))throw new Error();if(!confirm("V8 yatırım verisi bu yedekle değiştirilsin mi?"))return;v8={...v8Defaults(),...data};v8Prices=x.prices||v8Prices;localStorage.setItem(V8_PRICE_KEY,JSON.stringify(v8Prices));v8Save()}catch(err){alert("V8 yedeği okunamadı.")}finally{e.target.value=""}};
 v8Render();
 document.querySelector("#v7Theme").onclick=()=>v5Theme(document.documentElement.dataset.theme==="dark"?"light":"dark");
 document.querySelector("#v7Cloud").onclick=openAuth;document.querySelector("#v7Settings").onclick=()=>$("#settingsBtn").click();
 document.querySelectorAll("[data-v7tab]").forEach(b=>b.onclick=()=>v7OpenTab(b.dataset.v7tab));
 $("#v7AddAccount").onclick=()=>v7OpenAccount();$("#v7AddRecurring").onclick=()=>v7OpenRecurring();$("#v7AddGoal").onclick=()=>v7OpenGoal();
 $("#v7TransferDate").value=today();
 $("#v7AccountForm").onsubmit=e=>{e.preventDefault();const id=$("#v7AccountId").value,a={id:id||v7Id(),name:$("#v7AccountName").value.trim(),type:$("#v7AccountType").value,opening:Number($("#v7AccountOpening").value)||0};if(!a.name)return;const i=v7.accounts.findIndex(x=>x.id===id);if(i>=0){const oldName=v7.accounts[i].name;v7.accounts[i]=a;if(oldName!==a.name)state.transactions.forEach(t=>{if(t.cardName===oldName)t.cardName=a.name});save()}else v7.accounts.push(a);$("#v7AccountDialog").close();v7Save()};
 $("#v7DeleteAccount").onclick=()=>{const id=$("#v7AccountId").value,a=v7.accounts.find(x=>x.id===id);if(!a||!confirm(`"${a.name}" hesabı silinsin mi? İşlem kayıtları silinmez.`))return;v7.accounts=v7.accounts.filter(x=>x.id!==id);v7.transfers=v7.transfers.filter(t=>t.from!==id&&t.to!==id);$("#v7AccountDialog").close();v7Save()};
 $("#v7DoTransfer").onclick=()=>{const from=$("#v7TransferFrom").value,to=$("#v7TransferTo").value,amount=Number($("#v7TransferAmount").value),date=$("#v7TransferDate").value||today();if(!from||!to||from===to||!(amount>0)){v6Toast("Gönderen, alan ve tutarı kontrol et");return}v7.transfers.push({id:v7Id(),from,to,amount,date,description:$("#v7TransferDesc").value.trim()});$("#v7TransferAmount").value="";$("#v7TransferDesc").value="";v7Save()};
 $("#v7RecurringForm").onsubmit=e=>{e.preventDefault();const id=$("#v7RecurringId").value,r={id:id||v7Id(),type:$("#v7RecurringType").value,amount:Number($("#v7RecurringAmount").value),description:$("#v7RecurringDesc").value.trim(),category:$("#v7RecurringCategory").value.trim(),account:$("#v7RecurringAccount").value.trim(),day:Math.min(31,Math.max(1,Number($("#v7RecurringDay").value)||1)),start:$("#v7RecurringStart").value||today()};const i=v7.recurring.findIndex(x=>x.id===id);if(i>=0)v7.recurring[i]=r;else v7.recurring.push(r);$("#v7RecurringDialog").close();v7Save()};
 $("#v7DeleteRecurring").onclick=()=>{const id=$("#v7RecurringId").value;if(!id||!confirm("Bu düzenli işlem silinsin mi? Daha önce oluşturulan işlemler kalır."))return;v7.recurring=v7.recurring.filter(x=>x.id!==id);$("#v7RecurringDialog").close();v7Save()};
 $("#v7GoalForm").onsubmit=e=>{e.preventDefault();const id=$("#v7GoalId").value,g={id:id||v7Id(),name:$("#v7GoalName").value.trim(),target:Number($("#v7GoalTarget").value),current:Number($("#v7GoalCurrent").value)||0,date:$("#v7GoalDate").value};const i=v7.goals.findIndex(x=>x.id===id);if(i>=0)v7.goals[i]=g;else v7.goals.push(g);$("#v7GoalDialog").close();v7Save()};
 $("#v7DeleteGoal").onclick=()=>{const id=$("#v7GoalId").value;if(!id||!confirm("Bu hedef silinsin mi?"))return;v7.goals=v7.goals.filter(x=>x.id!==id);$("#v7GoalDialog").close();v7Save()};
 $("#v7GoalAddForm").onsubmit=e=>{e.preventDefault();const g=v7.goals.find(x=>x.id===$("#v7GoalAddId").value),amt=Number($("#v7GoalAddAmount").value);if(g&&amt>0){g.current=Number(g.current||0)+amt;$("#v7GoalAddDialog").close();v7Save()}};
 v7Render();
 $("#v7FinanceBackup").onclick=()=>download(`butcem-finans-v7-${today()}.json`,JSON.stringify({app:"Bütçem",version:7,exportedAt:new Date().toISOString(),finance:v7},null,2),"application/json");
 $("#v7FinanceRestore").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const x=JSON.parse(await f.text()),data=x.finance||x;if(!data||!Array.isArray(data.accounts))throw new Error();if(!confirm("V7 finans verisi bu yedekle değiştirilsin mi? Ana işlemler etkilenmez."))return;v7={...v7Defaults(),...data};v7Save()}catch(err){alert("Finans yedeği okunamadı.")}finally{e.target.value=""}};
 document.querySelector("#v51AllTx").onclick=()=>v5Show("transactions");
 document.querySelector("#v53NextMonth").onclick=()=>{const n=shift(selectedMonth,1);if(n<=currentMonth()){selectedMonth=n;v5Refresh();v6SummaryPulse()}};
 document.querySelector("#v53PrevMonth").onclick=()=>{selectedMonth=shift(selectedMonth,-1);v5Refresh();v6SummaryPulse()};
 document.querySelector("#v6ThisMonth").onclick=()=>{selectedMonth=currentMonth();v5Refresh();v6SummaryPulse()};
 document.querySelector("#v51Month").onclick=()=>{const p=$("#v6MonthPicker");if(p.showPicker)p.showPicker();else p.click()};
 document.querySelector("#v6MonthPicker").onchange=e=>{if(e.target.value&&e.target.value<=currentMonth()){selectedMonth=e.target.value;v5Refresh();v6SummaryPulse()}};
 let sx=0,sy=0;const summary=$("#v5Summary");
 summary.addEventListener("touchstart",e=>{if(e.touches.length===1){sx=e.touches[0].clientX;sy=e.touches[0].clientY}},{passive:true});
 summary.addEventListener("touchend",e=>{if(!sx)return;const dx=e.changedTouches[0].clientX-sx,dy=e.changedTouches[0].clientY-sy;sx=0;if(Math.abs(dx)>65&&Math.abs(dx)>Math.abs(dy)*1.4&&!e.target.closest("button,input,select,textarea,dialog")){if(dx>0){selectedMonth=shift(selectedMonth,-1);v5Refresh();v6SummaryPulse()}else{const n=shift(selectedMonth,1);if(n<=currentMonth()){selectedMonth=n;v5Refresh();v6SummaryPulse()}}}},{passive:true});
 document.addEventListener("click",e=>{if(!e.target.closest(".v51-monthcol"))document.querySelectorAll(".v51-monthcol.active").forEach(c=>{c.classList.remove("active");c.querySelector(".v53-tooltip")?.classList.remove("show")})});
}
setTimeout(v5Init,0);
