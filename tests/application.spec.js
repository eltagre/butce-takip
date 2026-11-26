const {test,expect}=require("@playwright/test");
const prefs={modules:["budget","investments","networth","compare","goals"],startView:"summary",theme:"light"};
const nav=view=>'#v5Nav [data-view="'+view+'"]';

test.beforeEach(async({page})=>{
 await page.addInitScript(value=>{
  if(!localStorage.getItem("butcem_v5_preferences"))localStorage.setItem("butcem_v5_preferences",JSON.stringify(value));
 },prefs);
});

test("receipt validates discounts and saves exactly 173.50 TL",async({page})=>{
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto("./");
 await page.locator("#receiptScanShortcut").click();
 await page.locator("#receiptTextPanel summary").click();
 const date=await page.evaluate(()=>today().split("-").reverse().join("."));
 await page.locator("#receiptText").fill("MİGROS\n"+date+"\nFinish Quantum 259,00\nFinish Quantum Kart İndirimi 149,00\nArko 104,50\nKUPON 54,50\nOzmo 13,50\nTOPLAM 173,50");
 await page.locator("#receiptParse").click();
 await page.locator("#receiptAccount").fill("Nakit");
 await expect(page.locator("#receiptCommit")).toBeDisabled();
 await page.locator("#receiptDiscounts select").selectOption("2");
 await expect(page.locator("#receiptGross")).toContainText("377,00");
 await expect(page.locator("#receiptSaved")).toContainText("203,50");
 await expect(page.locator("#receiptNet")).toContainText("173,50");
 await expect(page.locator("#receiptPercent")).toContainText("54");
 await expect(page.locator("#receiptRows .receipt-original").first()).toHaveCSS("text-decoration-line","line-through");
 await page.locator("#receiptTotal").fill("173.51");
 await expect(page.locator("#receiptCommit")).toBeDisabled();
 await page.locator("#receiptTotal").fill("173.50");
 await expect(page.locator("#receiptCommit")).toBeEnabled();
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#receiptCommit").click();
 await page.reload();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("butcem_v1")).transactions);
 expect(saved.map(tx=>tx.amount)).toEqual([110,50,13.5]);
 expect(saved[0].note).toContain("203,50");
 await page.locator(nav("transactions")).click();
 await expect(page.locator("#transactions")).toContainText("Finish Quantum");
 expect(errors).toEqual([]);
});

test("image preview rotates, rectifies and sends selected treatment to OCR",async({page})=>{
 await page.addInitScript(()=>{
  window.Tesseract={
   PSM:{SINGLE_BLOCK:"6"},
   createWorker:async()=>{
    return {
     setParameters:async params=>{window.testOcrParams=params;},
     recognize:async canvas=>{
      window.testOcrSize=[canvas.width,canvas.height];
      return {data:{text:"A101\n26.11.2026\nSÜT 20,00\nTOPLAM 20,00",confidence:62}};
     },
     terminate:async()=>{}
    };
   }
  };
 });
 await page.goto("./");
 await page.locator("#receiptScanShortcut").click();
 const png=await page.evaluate(()=>{
  const canvas=document.createElement("canvas");canvas.width=300;canvas.height=150;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,300,150);
  ctx.fillStyle="#333";ctx.font="24px sans-serif";ctx.fillText("A101 20,00",60,80);
  return canvas.toDataURL().split(",")[1];
 });
 await page.locator("#receiptFile").setInputFiles({name:"fis.png",mimeType:"image/png",buffer:Buffer.from(png,"base64")});
 const preview=page.locator("#receiptPreview");
 await expect(preview).toBeVisible();
 await page.locator("#receiptRotate").click();
 await expect(preview).toHaveJSProperty("width",150);
 await page.locator("#receiptPerspective").click();
 const box=await preview.boundingBox();
 for(const [x,y] of [[.1,.1],[.9,.12],[.85,.95],[.15,.9]])await preview.click({position:{x:box.width*x,y:box.height*y}});
 await page.locator("#receiptMode").selectOption("shadow");
 await page.locator("#receiptScan").click();
 await expect(page.locator("#receiptStore")).toHaveValue("A101");
 expect(await page.evaluate(()=>window.testOcrSize[0])).toBeLessThan(150);
 expect(await page.evaluate(()=>window.testOcrParams.tessedit_pageseg_mode)).toBe("6");
 await page.locator("#receiptAccount").fill("Nakit");
 await expect(page.locator("#receiptReviewText")).toContainText("düşük güvenle");
 await expect(page.locator("#receiptCommit")).toBeDisabled();
 await page.locator("#receiptReviewConfirm").check();
 await expect(page.locator("#receiptCommit")).toBeEnabled();
});

test("navigation, accessible charts, themes and module preferences",async({page})=>{
 await page.goto("./");
 await expect(page.locator(nav("summary"))).toHaveAttribute("aria-current","page");
 const month=page.locator("#v51Chart .v51-monthcol").first();
 await month.focus();
 await expect(month).toHaveAttribute("aria-pressed","true");
 await month.press("Escape");
 await expect(month).toHaveAttribute("aria-pressed","false");
 await page.locator("#v5Theme").click();
 await expect(page.locator("html")).toHaveAttribute("data-theme","dark");
 const wide=await page.evaluate(()=>innerWidth>=980);
 await expect(page.locator("#v5Nav")).toHaveCSS(wide?"top":"bottom","0px");
 await page.locator(nav("budget")).click();
 await expect(page.locator(nav("budget"))).toHaveAttribute("aria-current","page");
 await page.locator(nav("finance")).click();
 await expect(page.locator("#v7Finance")).toBeVisible();
 await page.locator(nav("assets")).click();
 await expect(page.locator("#v6Assets")).toBeVisible();
 await page.locator('[data-v8tab="portfolio"]').click();
 await expect(page.locator("#v8PortfolioPanel")).toBeVisible();
 await (wide?page.locator("#desktopModules"):page.locator("#v86Open")).click();
 const menu=page.locator("#v86Menu");
 for(const value of ["investments","networth","compare"])await menu.locator('input[data-module="'+value+'"]').uncheck();
 await page.locator("#v86Close").click();
 await expect(page.locator(nav("assets"))).toBeHidden();
 await page.reload();
 await expect(page.locator(nav("assets"))).toBeHidden();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(
  await page.evaluate(()=>Math.ceil(visualViewport.width)));
});

test("offline cache includes receipts, image processing and the versioned design",async({page,context})=>{
 await page.goto("./");
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator("#v5Summary")).toBeVisible();
 await page.locator("#receiptScanShortcut").click();
 await expect(page.locator("#receiptDialog")).toBeVisible();
 expect(await page.evaluate(()=>[typeof parseReceipt,typeof enhanceReceipt])).toEqual(["function","function"]);
});

test("existing budget and portfolio calculations retain their results",async({page})=>{
 await page.addInitScript(()=>{
  const month=new Date().toISOString().slice(0,7);
  localStorage.setItem("butcem_v1",JSON.stringify({
   monthlyBudget:1500,
   transactions:[
    {id:"i",date:month+"-01",type:"income",amount:2500,category:"Maaş"},
    {id:"e",date:month+"-02",type:"expense",amount:450.5,category:"Market"}
   ]
  }));
  localStorage.setItem("butcem_v8_prices",JSON.stringify({
   ABC:[["2025-01-02",100],["2025-02-03",120]],
   DEF:[["2025-01-02",50],["2025-02-03",60]]
  }));
 });
 await page.goto("./");
 await expect(page.locator("#v5Income")).toContainText("2.500,00");
 await expect(page.locator("#v5Expense")).toContainText("450,50");
 await expect(page.locator("#v5MainValue")).toContainText("1.049,50");
 const result=await page.evaluate(()=>v8Backtest([{symbol:"ABC",weight:60},{symbol:"DEF",weight:40}],
  "2025-01-01","2025-02-03",1000,100,"monthly","monthly"));
 expect(result.invested).toBe(1100);
 expect(result.final).toBeCloseTo(1300);
});

test("summary privacy and guide work with disabled modules and dark theme",async({page})=>{
 await page.goto("./");
 const guide=page.locator("#summaryGuide"),cloud=page.locator("#summaryCloud");
 await expect(guide).toBeVisible();
 expect((await guide.boundingBox()).x).toBeLessThan((await cloud.boundingBox()).x);
 await page.locator("#v5Theme").click();
 await cloud.click();
 const auth=page.locator("#authDialog"), details=page.locator("#authPrivacyDetails");
 await expect(auth.getByText("Verilerim güvende mi?")).toBeVisible();
 await expect(details).toHaveJSProperty("open",false);
 await details.locator("summary").click();
 await expect(details.getByText(/fiş fotoğrafı buluta yüklenmez/)).toBeVisible();
 await expect(details.getByText(/şifreleme koruması sağlamaz/)).toBeVisible();
 await page.locator("#authCancel").click();
 await guide.click();
 const topics=page.locator("#v86GuideTopics");
 await expect(topics.locator("section")).toHaveCount(12);
 await topics.getByRole("button",{name:"Ekstreyi içe aktar"}).click();
 await expect(page.locator("#stmtDialog")).toBeVisible();
 await page.locator("#stmtClose").click();
 await guide.click();
 await topics.getByRole("button",{name:"Hedefleri aç"}).click();
 await expect(page.locator("#v7GoalsPanel")).toBeVisible();
 await page.evaluate(()=>{const prefs=v5GetPrefs();prefs.modules=["budget"];v5SetPrefs(prefs);v86Apply();});
 await page.locator('#v5Nav [data-view="summary"]').click();
 await guide.click();
 const portfolio=topics.locator("section").filter({hasText:"Yatırım ve portföy"});
 await expect(portfolio).toContainText("Bu modül şu anda kapalı.");
 await portfolio.getByRole("button",{name:"Modül ayarlarını aç"}).click();
 await expect(page.locator("#v86Menu")).toBeVisible();
 await expect(page.locator('#v86Menu input[data-module="investments"]')).not.toBeChecked();
});

test("account-bound local records stay locked without matching session",async({page})=>{
 await page.addInitScript(()=>{
  localStorage.setItem("butcem_local_owner_v1","test-owner");
  localStorage.setItem("butcem_v1",JSON.stringify({monthlyBudget:1234,transactions:[]}));
 });
 await page.goto("./");
 await expect(page.locator("body")).toHaveClass(/v865-account-locked/);
 await expect(page.locator("#authDialog")).toBeVisible();
 await expect(page.locator("#v5Summary")).toBeHidden();
 await page.locator("#authPrivacyDetails summary").click();
 await expect(page.locator("#authPrivacyDetails")).toHaveJSProperty("open",true);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem("butcem_account:test-owner:butcem_v1")).monthlyBudget)).toBe(1234);
});
