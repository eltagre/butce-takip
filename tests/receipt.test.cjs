const test=require("node:test");
const assert=require("node:assert/strict");
const {parseReceipt,receiptCents,receiptSummary}=require("../receipt-parser");
const read=text=>{
 const parsed=parseReceipt(text);
 return [parsed,receiptSummary(parsed.products,parsed.discounts,parsed.total)];
};
test("named cart and product discounts produce only net spending",()=>{
 const [p,v]=read("MİGROS\n26.11.2026\nFinish Quantum 259,00\nFinish Quantum Kart İndirimi 149,00\nArko 104,50\nArko İndirim 54,50-\nOzmo 13,50\nTOPKDV 7,00\nTOPLAM 173,50\nKREDİ KARTI 173,50\nTOPLAM İNDİRİM 203,50");
 assert.equal(p.store,"Migros");
 assert.equal(p.printedDiscount,20350);
 assert.deepEqual(v.rows.map(x=>x.net),[11000,5000,1350]);
 assert.deepEqual([v.gross,v.discount,v.net,v.valid],[37700,20350,17350,true]);
 assert.equal(v.percent.toFixed(1),"54.0");
});
test("weighted and repeated items preserve quantities across layout variations",()=>{
 const [p,v]=read("BİM\nTARİH 26.11.2026\nBİSKÜVİ 2 x 13,50\nZEYTİN\n0,450 kg x 100,00 = 45,00\n2 x 12,50\nSÜT %1 *25,00 A\nTOP *97,00");
 assert.equal(p.store,"BİM");
 assert.deepEqual(v.rows.map(x=>[x.name,x.quantity,x.unit,x.unitPrice,x.net]),[
  ["BİSKÜVİ",2,"adet",1350,2700],["ZEYTİN",.45,"kg",10000,4500],["SÜT",2,"adet",1250,2500]
 ]);
 assert.equal(v.valid,true);
});
test("ambiguous unnamed campaign requires assignment even when adjacent",()=>{
 const [p,v]=read("ŞOK MARKET\nKAŞAR 100,00\n2 AL 1 ÖDE 20,00-\nELMA 20,00\nTOPLAM 100,00");
 assert.equal(v.valid,false);
 assert.equal(v.unresolved.length,1);
 assert.equal(p.products[0].discount,0);
 p.discounts[0].target="1";
 assert.equal(receiptSummary(p.products,p.discounts,p.total).valid,true);
});
test("whole-basket coupon is allocated in cents and does not add a financial row",()=>{
 const [p,v]=read("A 101\nEKMEK 0,01\nMUZ 0,01\nPEYNİR 0,01\nKUPON 0,02\nÖDENECEK 0,01\nNAKİT 1,00\nPARA ÜSTÜ 0,99");
 assert.equal(p.store,"A101");
 assert.equal(v.unresolved.length,1);
 p.discounts[0].target="receipt";
 const summary=receiptSummary(p.products,p.discounts,p.total);
 assert.deepEqual(summary.rows.map(x=>x.net),[1,0,0]);
 assert.equal(summary.discount,2);
 assert.equal(summary.valid,true);
});
test("barcode match can identify a nonadjacent product but repeated SKUs stay unresolved",()=>{
 const [p,v]=read("CARREFOURSA\n8690000001111 ÇAM FISTIĞI 55,00\nELMA 25,00\n8690000001111 CLUB İNDİRİMİ 8,00\nARA TOPLAM 80,00\nNET TOPLAM 72,00\nKARTLA ÖDEME 72,00");
 assert.equal(p.store,"CarrefourSA");
 assert.equal(v.rows[0].net,4700);
 assert.equal(v.valid,true);
 const [duplicate]=read("FİLE\n8690000001111 ELMA 5,00\n8690000001111 ELMA 5,00\n8690000001111 KUPON 1,00\nTOPLAM 9,00");
 assert.equal(duplicate.discounts[0].productId,undefined);
});
test("tabular normal, discount and net rates are reconciled with Turkish separators",()=>{
 const [p,v]=read("TARIM KREDİ\nÜrün | Normal fiyat | İndirim | Net fiyat\nYağ | 1.234, 50 | 34,50 | 1.200,00\nUn | 15,50 | 0,50 | 15,00\nGENEL TOPLAM 1.215,00");
 assert.equal(p.store,"Tarım Kredi");
 assert.deepEqual([v.gross,v.discount,v.net,v.valid],[125000,3500,121500,true]);
 assert.equal(receiptCents("1 234, 50-"),-123450);
});
test("conflicting totals, invalid dates and one-cent discrepancies never verify",()=>{
 const [p,v]=read("HAKMAR\n31.02.2026\nSÜT 20,10\nTOPLAM 20,10\nTOPLAM 20,11");
 assert.equal(p.date,"");
 assert.equal(p.total,null);
 assert.equal(v.valid,false);
 assert.equal(receiptSummary(p.products,[],2011).valid,false);
});
test("discount exceeding selected product net or discounts with unknown amounts cannot silently pass",()=>{
 const [p]=read("ŞOK\nSÜT 10,00\nEKMEK 55,00\nKART İNDİRİMİ 15,00\nTOPLAM 50,00");
 p.discounts[0].target="1";
 assert.equal(receiptSummary(p.products,p.discounts,p.total).valid,false);
 p.discounts[0].target="ignore";
 assert.equal(receiptSummary(p.products,p.discounts,p.total).valid,false);
});
test("quantity detail after the item is associated only when its amount is unique",()=>{
 const [,v]=read("MİGROS\nAYRAN 22,00\n2 ADET x 11,00\nSÜT 25 TL\nTOPLAM 47 TL");
 assert.deepEqual(v.rows.map(x=>[x.name,x.quantity,x.unitPrice]),[["AYRAN",2,1100],["SÜT",1,2500]]);
 assert.equal(v.valid,true);
 const [ambiguous]=read("MİGROS\nAYRAN 22,00\n2 x 11,00\nSÜT 22,00\nTOPLAM 44,00");
 assert.equal(ambiguous.issues.length,1);
 assert.deepEqual(ambiguous.products.map(p=>p.quantity),[1,1]);
});
