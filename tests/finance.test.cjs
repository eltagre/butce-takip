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
