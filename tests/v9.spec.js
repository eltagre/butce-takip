const {test,expect}=require("@playwright/test");
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>localStorage.setItem("butcem_v5_preferences",JSON.stringify({modules:["budget","simulation"],startView:"summary",theme:"light"})));
});
test("simulation-only configuration displays a keyboard-accessible projection",async({page})=>{
 await page.goto("./");
 await page.locator('#v5Nav [data-view="assets"]').click();
 const panel=page.locator("#v8SimulationPanel");
 await expect(panel).toBeVisible();
 const form=panel.locator("form").first();
 await form.locator('[name="contribution"]').fill("100");
 await form.locator('[name="years"]').fill("1");
 await form.getByRole("button",{name:"Hesapla"}).click();
 await expect(panel.locator("figcaption")).toContainText("1.200");
 const range=panel.getByRole("slider");
 await range.focus();await range.press("Home");
 await expect(panel.locator("figcaption")).toContainText("0. yıl");
});
test("health and analysis display missing inputs without inventing results",async({page})=>{
 await page.goto("./");
 await page.evaluate(()=>{const prefs=v5GetPrefs();prefs.modules.push("health","analysis");v5SetPrefs(prefs);v86Apply();});
 await page.locator("#financeHealthBadge").click();
 await page.locator("#v8HealthPanel").getByRole("button",{name:"Hesapla"}).click();
 await expect(page.locator("#v8HealthPanel")).toContainText("Kesin puan için veri eksik");
 await page.locator('[data-v8tab="analysis"]').click();
 await expect(page.locator("#v8AnalysisPanel")).toContainText("En az iki tarihli servet kaydı gerekiyor.");
});
test("shopping uses confirmed receipt lines and removes deleted transactions",async({page})=>{
 await page.goto("./");
 await page.locator("#receiptScanShortcut").click();
 await page.locator("#receiptTextPanel summary").click();
 const date=await page.evaluate(()=>today().split("-").reverse().join("."));
 await page.locator("#receiptText").fill("BİM\n"+date+"\nSÜT 500 ML 40,00\nTOPLAM 40,00");
 await page.locator("#receiptParse").click();
 await page.locator("#receiptAccount").fill("Nakit");
 await page.locator('[aria-label="Marka"]').fill("Örnek");
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#receiptCommit").click();
 await page.locator('#v5Nav [data-view="budget"]').click();
 await page.locator("#financeShoppingOpen").click();
 await expect(page.locator("#financeShoppingDialog")).toContainText("40,00");
 expect(await page.evaluate(()=>backupObject().financeV9.records[0].value.lines[0].brand)).toBe("Örnek");
 await page.locator("#financeShoppingDialog").getByRole("button",{name:"Kapat"}).click();
 await page.evaluate(()=>{state.transactions=[];save();});
 await page.locator("#financeShoppingOpen").click();
 await expect(page.locator("#financeShoppingDialog")).toContainText("yapılandırılmış fiş bulunamadı");
});
test("property, planning records and report work without ledger side effects",async({page})=>{
 await page.goto("./");
 await page.locator('#v5Nav [data-view="assets"]').click();
 const property=page.locator("#v8SimulationPanel section").filter({has:page.getByRole("heading",{name:"Gayrimenkul yatırım analizi"})});
 await property.locator('[name="price"]').fill("100000");
 await property.locator('[name="rent"]').fill("1000");
 await property.getByRole("button",{name:"Hesapla"}).click();
 await expect(property).toContainText("12.000");
 await page.locator('#v5Nav [data-view="finance"]').click();
 await page.locator("#financePlanOpen").click();
 const passive=page.locator("#financePlanDialog section").filter({has:page.getByRole("heading",{name:"Pasif gelir takvimi"})});
 await passive.locator('[name="name"]').fill("Kira");
 await passive.locator('[name="date"]').fill("2027-01-03");
 await passive.locator('[name="amount"]').fill("350");
 await passive.getByRole("button",{name:"Planı kaydet"}).click();
 await expect(passive).toContainText("Tahmini");
 expect(await page.evaluate(()=>[FinanceRecords.list("passive").length,state.transactions.length])).toEqual([1,0]);
 await page.locator("#financePlanDialog").getByRole("button",{name:"Kapat"}).click();
 await page.locator('#v5Nav [data-view="budget"]').click();
 await page.locator("#financeReportOpen").click();
 await expect(page.locator("#financeReportPrint")).toContainText("Aylık finans raporu");
 await page.locator('#financeReportDialog [name="categories"]').uncheck();
 await expect(page.locator("#financeReportPrint")).not.toContainText("Kategori dağılımı");
});

test("backup restore keeps a deleted plan deleted and carries a different plan",async({page})=>{
 await page.goto("./");
 await page.evaluate(()=>FinanceRecords.put("debt",{name:"Silinen",date:"2027-01-01",principal:1000,payment:1000,extra:0,annual:0},"debt-1"));
 const oldBackup=await page.evaluate(()=>backupObject());
 await page.evaluate(()=>FinanceRecords.put("debt",null,"debt-1",true));
 oldBackup.financeV9.records.push({
  id:"passive-1",kind:"passive",updatedAt:"2026-01-01T00:00:00.000Z",deleted:false,
  value:{name:"Kira",date:"2027-01-01",amount:450,type:"rent",status:"estimate",repeat:"once"}
 });
 page.on("dialog",dialog=>dialog.accept());
 await page.locator("#restoreFile").setInputFiles({name:"butcem-test.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(oldBackup))});
 await expect.poll(()=>page.evaluate(()=>FinanceRecords.list("passive").length)).toBe(1);
 expect(await page.evaluate(()=>FinanceRecords.list("debt"))).toEqual([]);
 await page.reload();
 expect(await page.evaluate(()=>FinanceRecords.list("passive")[0].value.name)).toBe("Kira");
});

test("monthly report renders a PDF in Chromium",async({page,browserName})=>{
 test.skip(browserName!=="chromium","Playwright PDF generation only supports Chromium.");
 await page.goto("./");
 await page.locator('#v5Nav [data-view="budget"]').click();
 await page.locator("#financeReportOpen").click();
 await page.emulateMedia({media:"print"});
 await expect(page.locator("#financeReportPrint")).toBeVisible();
 await expect(page.locator("#v5Nav")).toBeHidden();
 const pdf=await page.pdf({format:"A4"});
 expect(pdf.subarray(0,5).toString()).toBe("%PDF-");
 expect(pdf.length).toBeGreaterThan(5000);
});
