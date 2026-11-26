const test = require("node:test");
const assert = require("node:assert/strict");
const {parseReceipt} = require("../receipt-parser.js");

test("ŞOK with Turkish OCR spacing and negative discount", ()=>{
 const parsed=parseReceipt("ŞOK MARKET\nTARİH: 21.11.2026\nSÜT %1 *32, 50\nİNDİRİM 2,50-\nTOPKDV *0,30\nTOPLAM *30,00\nKREDİ KARTI 30,00");
 assert.deepEqual(parsed,{store:"ŞOK",date:"2026-11-21",total:30,rows:[{name:"SÜT (indirimli)",amount:30,category:"Market"}]});
});
test("Migros separates subtotal and payment, including a wrapped item", ()=>{
 const parsed=parseReceipt("MİGROS\n9/3/2026 11:00\nADAÇAYI\n*14,90\nVERGİLİ PEYNİR 80,10\nARA TOPLAM 95,00\nÖDENECEK TUTAR 95,00\nNAKİT 100,00\nPARA ÜSTÜ 5,00");
 assert.equal(parsed.store,"Migros");
 assert.equal(parsed.date,"2026-03-09");
 assert.equal(parsed.total,95);
 assert.deepEqual(parsed.rows.map(row=>row.amount),[14.9,80.1]);
});
test("BİM weighted items, positive discount label and thousands", ()=>{
 const parsed=parseReceipt("BİM\nFINDIK\n0,500 kg X 400,00\nFINDIK *200,00\nKAMPANYA 20,00\nZEYTİNYAĞI *1.020,00\nTOP *1.200,00");
 assert.equal(parsed.store,"BİM");
 assert.equal(parsed.total,1200);
 assert.deepEqual(parsed.rows.map(row=>row.amount),[180,1020]);
});
test("conflicting totals and invalid dates require review", ()=>{
 const parsed=parseReceipt("A 101\nTARİH: 31.02.2026\nEKMEK 10,00\nTOPLAM 10,00\nTOPLAM 11,00");
 assert.equal(parsed.store,"A101");
 assert.equal(parsed.total,null);
 assert.equal(parsed.date,"");
});
test("unallocated discounts stay visible for manual reconciliation", ()=>{
 const parsed=parseReceipt("CARREFOURSA\nİNDİRİM 15,00\nELMA 40,00\nTOPLAM 25,00");
 assert.deepEqual(parsed.rows.map(row=>row.amount),[-15,40]);
});
