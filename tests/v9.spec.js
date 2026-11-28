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
