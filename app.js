const KEY="butcem_v1";
const DEFAULT_CATS=["Kahve","Yemek","Market","Benzin","Alışveriş","Eğlence","Ulaşım","Fatura","Sağlık","Diğer"];

let state = loadState();

function loadState(){
  try{
    const raw=localStorage.getItem(KEY);
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {transactions:[], monthlyBudget:0, categories:[...DEFAULT_CATS]};
}
function saveState(){ localStorage.setItem(KEY, JSON.stringify(state)); render(); }
function money(n){ return new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY",maximumFractionDigits:2}).format(n||0); }
function today(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function monthKey(dstr){ return dstr.slice(0,7); }
function currentMonth(){ const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }
function monthName(){ return new Intl.DateTimeFormat("tr-TR",{month:"long",year:"numeric"}).format(new Date()); }

const $=s=>document.querySelector(s);
const txnDialog=$("#txnDialog"), settingsDialog=$("#settingsDialog");

function openTxn(type){
  $("#txnType").value=type;
  $("#txnTitle").textContent=type==="expense"?"Harcama ekle":"Gelir ekle";
  $("#amount").value="";
  $("#description").value="";
  $("#note").value="";
  $("#date").value=today();
  populateCategories(type);
  $("#payment").disabled = type==="income";
  $("#cardNameWrap").style.display = type==="income" ? "none" : "block";
  txnDialog.showModal();
}

function populateCategories(type){
  const sel=$("#category"); sel.innerHTML="";
  const cats= type==="income" ? ["Aile Desteği","Maaş","Burs","Yatırım Getirisi","Satış","Diğer Gelir"] : state.categories;
  cats.forEach(c=>{const o=document.createElement("option");o.textContent=c;sel.appendChild(o)});
}

$("#payment").addEventListener("change",()=>{
  $("#cardNameWrap").style.display=$("#payment").value==="Kredi Kartı"?"block":"none";
});

$("#txnForm").addEventListener("submit",(e)=>{
  e.preventDefault();
  const type=$("#txnType").value;
  const amount=Number($("#amount").value);
  if(!Number.isFinite(amount)||amount<=0) return;
  state.transactions.push({
    id:crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+Math.random(),
    type, amount,
    category:$("#category").value,
    payment:type==="income"?"Gelir":$("#payment").value,
    cardName:type==="income"?"":$("#cardName").value.trim(),
    description:$("#description").value.trim(),
    note:$("#note").value.trim(),
    date:$("#date").value
  });
  saveState(); txnDialog.close();
});

$("#settingsForm").addEventListener("submit",(e)=>{
  e.preventDefault();
  state.monthlyBudget=Math.max(0,Number($("#monthlyBudget").value)||0);
  const cats=$("#categoriesText").value.split(",").map(x=>x.trim()).filter(Boolean);
  if(cats.length) state.categories=[...new Set(cats)];
  saveState(); settingsDialog.close();
});

$("#settingsBtn").addEventListener("click",()=>{
  $("#monthlyBudget").value=state.monthlyBudget||"";
  $("#categoriesText").value=state.categories.join(", ");
  settingsDialog.showModal();
});
$("#cancelTxn").addEventListener("click",()=>txnDialog.close());
$("#cancelSettings").addEventListener("click",()=>settingsDialog.close());
$("#addExpenseBtn").addEventListener("click",()=>openTxn("expense"));
$("#fab").addEventListener("click",()=>openTxn("expense"));
$("#addIncomeBtn").addEventListener("click",()=>openTxn("income"));

$("#clearBtn").addEventListener("click",()=>{
  if(confirm("Tüm kayıtlar silinsin mi? Bu işlem geri alınamaz.")){
    state={transactions:[],monthlyBudget:state.monthlyBudget,categories:state.categories};
    saveState();
  }
});

$("#exportBtn").addEventListener("click",()=>{
  const rows=[["Tarih","Tür","Kategori","Tutar","Ödeme","Kart","Açıklama","Not"]];
  state.transactions.forEach(t=>rows.push([t.date,t.type,t.category,t.amount,t.payment,t.cardName||"",t.description||"",t.note||""]));
  const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="butce-kayitlari.csv"; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
});

function render(){
  $("#monthLabel").textContent=monthName();
  const mk=currentMonth();
  const tx=state.transactions.filter(t=>monthKey(t.date)===mk);
  const expenses=tx.filter(t=>t.type==="expense");
  const incomes=tx.filter(t=>t.type==="income");
  const exp=expenses.reduce((s,t)=>s+t.amount,0), inc=incomes.reduce((s,t)=>s+t.amount,0), net=inc-exp;
  $("#expenseTotal").textContent=money(exp);
  $("#incomeTotal").textContent=money(inc);
  $("#netTotal").textContent=money(net);
  $("#netTotal").className="value "+(net>=0?"good":"bad");
  const rem=state.monthlyBudget ? state.monthlyBudget-exp : 0;
  $("#remainingBudget").textContent=state.monthlyBudget?money(rem):"—";
  $("#remainingBudget").className="value "+(state.monthlyBudget?(rem>=0?"good":"bad"):"");
  const pct=state.monthlyBudget?Math.round((exp/state.monthlyBudget)*100):0;
  $("#budgetPct").textContent=`${pct}%`;
  $("#budgetBar").style.width=`${Math.min(100,pct)}%`;
  $("#budgetText").textContent=state.monthlyBudget?`${money(exp)} / ${money(state.monthlyBudget)}`:"Bütçe belirlenmedi";

  const sums={};
  expenses.forEach(t=>sums[t.category]=(sums[t.category]||0)+t.amount);
  const entries=Object.entries(sums).sort((a,b)=>b[1]-a[1]);
  const chart=$("#categoryChart"); chart.innerHTML="";
  if(!entries.length){ chart.innerHTML='<div class="empty">Bu ay henüz harcama yok.</div>'; }
  const max=entries[0]?.[1]||1;
  entries.forEach(([cat,val])=>{
    const row=document.createElement("div"); row.className="barrow";
    const c=document.createElement("div"); c.textContent=cat;
    const bar=document.createElement("div"); bar.className="bar"; const span=document.createElement("span"); span.style.width=`${Math.round(val/max*100)}%`; bar.appendChild(span);
    const v=document.createElement("div"); v.textContent=money(val); v.className="small";
    row.append(c,bar,v); chart.append(row);
  });

  const pays={};
  expenses.forEach(t=>{let k=t.payment; if(t.payment==="Kredi Kartı"&&t.cardName) k+=` • ${t.cardName}`; pays[k]=(pays[k]||0)+t.amount});
  const ps=$("#paymentSummary"); ps.innerHTML="";
  const pent=Object.entries(pays).sort((a,b)=>b[1]-a[1]);
  if(!pent.length) ps.innerHTML='<div class="empty">Ödeme verisi yok.</div>';
  pent.forEach(([k,v])=>{const d=document.createElement("div");d.className="item";d.innerHTML=`<div>${escapeHtml(k)}</div><div class="amount">${money(v)}</div>`;ps.appendChild(d)});

  const list=$("#transactionList"); list.innerHTML="";
  const recent=[...state.transactions].sort((a,b)=>(b.date.localeCompare(a.date))).slice(0,30);
  if(!recent.length) list.innerHTML='<div class="empty">İlk işlemini “+ Harcama” ile ekleyebilirsin.</div>';
  recent.forEach(t=>{
    const d=document.createElement("div"); d.className="item";
    const left=document.createElement("div");
    const title=document.createElement("div"); title.textContent=t.description||t.category;
    const meta=document.createElement("div"); meta.className="meta";
    meta.textContent=`${t.category} • ${t.date}${t.type==="expense" ? " • "+t.payment : ""}`;
    left.append(title,meta);
    const right=document.createElement("div"); right.className="amount "+(t.type==="income"?"good":"bad"); right.textContent=(t.type==="income"?"+":"-")+money(t.amount);
    d.append(left,right);
    d.addEventListener("click",()=>{ if(confirm("Bu işlem silinsin mi?")){ state.transactions=state.transactions.filter(x=>x.id!==t.id); saveState(); }});
    list.appendChild(d);
  });
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
render();
