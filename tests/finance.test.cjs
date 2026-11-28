const test=require("node:test");
const assert=require("node:assert/strict");
const {project,target,freedom,realRate,monthly}=require("../finance-math");
test("zero return, irregular contributions and high inflation",()=>{
 const r=project({principal:0,contribution:1000,annual:0,months:12,inflation:1,irregular:{3:2000,6:0}});
 assert.equal(r.balance,12000);
 assert.equal(r.gain,0);
 assert.equal(r.real,6000);
});
test("annual compound equivalence and negative returns",()=>{
 assert.ok(Math.abs((1+monthly(.21))**12-1.21)<1e-12);
 assert.ok(Math.abs(project({principal:100000,annual:-.2,months:12}).balance-80000)<5);
 assert.equal(realRate(.2,.5),(1.2/1.5)-1);
});
test("month start and end payments differ by growth",()=>{
 const annual=1.01**12-1;
 assert.equal(project({contribution:1000,annual,months:1,timing:"start"}).balance,1010);
 assert.equal(project({contribution:1000,annual,months:1}).balance,1000);
});
test("goal and freedom distinguish unattained from zero months",()=>{
 assert.deepEqual(target({principal:0,contribution:0,annual:0,target:1200,months:12}),{required:100,reached:null,progress:0,gap:1200});
 assert.equal(freedom({expenses:10000,passive:10000,principal:0,contribution:0,annual:0,withdrawal:.04}).reached,0);
});
const {months,distribution,health,wealth}=require("../finance-analysis");
test("health does not treat unknown debt or short history as a score",()=>{
 const periods=[{income:10000,expense:7000},{income:10000,expense:7000},{income:10000,expense:7000}];
 const portfolio=distribution([{value:50,type:"gold"},{value:50,type:"stock"}]);
 assert.equal(health({periods,debt:null,liquid:0,budget:7000,portfolio}).score,null);
 assert.equal(health({periods:periods.slice(0,2),debt:0,liquid:0,budget:7000,portfolio}).score,null);
 assert.ok(health({periods,debt:0,liquid:42000,budget:7000,portfolio}).score>80);
});
test("transfer amounts are excluded and wealth FX gaps stay unknown",()=>{
 assert.equal(months([{date:"2026-10-01",type:"expense",amount:20,category:"Hesaplar Arası Transfer"}],["2026-10"])[0].expense,0);
 const r=wealth([{date:"2025-01-01",total:100,usdtry:20},{date:"2025-02-01",total:120,usdtry:30}]);
 assert.ok(r.try>0&&r.usd<0);
 assert.equal(r.btc,null);
});
const Shopping=require("../finance-shopping");
const Records=require("../finance-records");
test("same brand normalizes package price, while free lines vanish after deleting the last expense",()=>{
 const line={id:1,name:"Süt 500 ml",brand:"Örnek",quantity:2,unit:"adet",net:5000,gross:6000,discount:1000,transactionId:"txn"};
 assert.equal(Shopping.comparable(line).price,5000);
 assert.equal(Shopping.comparable(line).key,Shopping.comparable({...line,name:"Süt 1 L",quantity:1}).key);
 const receipt={id:"receipt",store:"Market",lines:[line,{id:2,name:"Hediye",net:0}]};
 assert.equal(Shopping.activeLines([receipt,receipt],[{id:"txn",type:"expense",amount:50,description:"Market · Süt 500 ml",date:"2026-11-01"}]).length,2);
 assert.deepEqual(Shopping.activeLines([receipt],[]),[]);
 const edited=Shopping.activeLines([receipt],[{id:"txn",type:"expense",amount:45,description:"Market · Süt 500 ml",date:"2026-11-02"}])[0];
 assert.deepEqual([edited.net,edited.discount],[4500,null]);
});
test("fixed basket suppresses small samples and uses previous quantities",()=>{
 const make=(name,quantity,net)=>({name,quantity,net,unit:"adet",brand:"A"});
 const prior=[make("Süt",2,200),make("Ekmek",1,100),make("Pirinç",1,100)];
 const after=[make("Süt",1,200),make("Ekmek",1,100),make("Pirinç",1,100)];
 assert.equal(Shopping.basket(prior,after).change,.5);
 assert.equal(Shopping.basket(prior.slice(1),after),null);
});
test("revision merge is deterministic and old backup cannot revive a record",()=>{
 const first={id:"a",kind:"receipt",updatedAt:"2026-11-02T00:00:00Z",value:1};
 const deleted={...first,deleted:true};
 assert.deepEqual(Records.read(Records.envelope(Records.merge([deleted],[first]))),[deleted]);
 assert.deepEqual(Records.read({version:2,records:[first]}),[]);
});
const Planning=require("../finance-planning");
test("loan schedules round interest, detect negative amortization and support early payments",()=>{
 const inputs={principal:100000,annual:.12,payment:10000};
 const regular=Planning.loan(inputs),early=Planning.loan({...inputs,extra:5000});
 assert.equal(regular.schedule[0].interest,1000);
 assert.ok(early.settled&&early.total<regular.total);
 assert.equal(Planning.loan({...inputs,payment:1000}).negative,true);
 assert.equal(Planning.paymentFor(10000,0,12),834);
});
test("property uses equity, annual vacancy and financing cash flows",()=>{
 const inputs={price:1000000,rent:10000,rentGrowth:0,appreciation:0,vacancy:2,annualCost:20000,closing:0,alternative:0};
 const empty=Planning.property({...inputs,vacancy:12});
 assert.equal(empty.years[0].flow,-20000);
 assert.equal(empty.amortization,null);
 const r=Planning.property(inputs);
 assert.equal(r.net,80000);
 assert.equal(r.years[4].gain,400000);
 assert.equal(r.years[4].alternative,1000000);
 const leveraged=Planning.property({...inputs,credit:400000,annual:0,term:12});
 assert.equal(leveraged.initial,600000);
 assert.equal(leveraged.years[0].flow,-320000);
});
