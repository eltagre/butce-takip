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
