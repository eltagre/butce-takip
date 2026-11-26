const {test,expect}=require("@playwright/test");
const prefs={modules:["budget","investments","networth","compare","goals"],startView:"summary",theme:"light"};

test.beforeEach(async({page})=>{
 await page.addInitScript(value=>{
  if(!localStorage.getItem("butcem_v5_preferences"))localStorage.setItem("butcem_v5_preferences",JSON.stringify(value));
 },prefs);
});

test("budget navigation, receipt validation and local persistence",async({page})=>{
 const errors=[];
 page.on("pageerror",error=>errors.push(error.message));
 await page.goto("./");
 await expect(page.locator("#v5Summary")).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(()=>innerWidth));
 await page.locator("#v6SummarySettings").click();
 await expect(page.locator("#receiptOpen")).toBeVisible();
 await page.locator("#receiptOpen").click();
 await page.locator("#receiptDialog details summary").click();
 const date=await page.evaluate(()=>today().split("-").reverse().join("."));
 await page.locator("#receiptText").fill("BİM\n"+date+"\nSÜT 30,00\nİNDİRİM 5,00\nEKMEK 12,50\nTOPLAM 38,00");
 await page.locator("#receiptParse").click();
 await page.locator("#receiptAccount").fill("Nakit");
 await expect(page.locator("#receiptCommit")).toBeDisabled();
 await page.locator("#receiptTotal").fill("37.50");
 await expect(page.locator("#receiptCommit")).toBeEnabled();
 page.once("dialog",dialog=>dialog.accept());
 await page.locator("#receiptCommit").click();
 await page.reload();
 await expect(page.locator("#v5Summary")).toBeVisible();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem("butcem_v1")).transactions);
 expect(saved.map(tx=>tx.amount)).toEqual([25,12.5]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(
  await page.evaluate(()=>Math.ceil(visualViewport.width)));
 await page.locator('#v5Nav [data-view="transactions"]').click();
 await expect(page.locator("#transactions")).toContainText("SÜT");
 expect(errors).toEqual([]);
});

test("legacy data stays with its owner through sign-in, account switch and logout",async({page})=>{
 await page.addInitScript(value=>{
  const A="alice",B="bob";
  if(!sessionStorage.getItem("fixture-set")){
   localStorage.setItem("butcem_local_owner_v1",A);
   localStorage.setItem("butcem_v1",JSON.stringify({transactions:[],monthlyBudget:2345}));
   for(const owner of [A,B])localStorage.setItem("butcem_account:"+owner+":butcem_v5_preferences",JSON.stringify(value));
   sessionStorage.setItem("fake-auth",A);
   sessionStorage.setItem("fixture-set","1");
  }
  const session=()=>sessionStorage.getItem("fake-auth") ?
   {user:{id:sessionStorage.getItem("fake-auth"),email:sessionStorage.getItem("fake-auth")+"@example.test"}} : null;
  let listener;
  const mockedSupabase={createClient:()=>({
   auth:{
    onAuthStateChange:fn=>{listener=fn},
    getSession:async()=>({data:{session:session()}}),
    signInWithPassword:async({email})=>{
     sessionStorage.setItem("fake-auth",email.split("@")[0]);
     listener("SIGNED_IN",session());
     return {data:{user:session().user}};
    },
    signOut:async()=>{
     sessionStorage.removeItem("fake-auth");
     listener("SIGNED_OUT",null);
     return {};
    }
   },
   from:()=>{
    const query={select:()=>query,eq:()=>query,order:()=>query,
     limit:async()=>({error:{code:"PGRST205"}}),maybeSingle:async()=>({data:null})};
    return query;
   }
  })};
  Object.defineProperty(window,"supabase",{get:()=>mockedSupabase,set(){}});
 },prefs);
 await page.goto("./");
 await expect.poll(()=>page.evaluate(()=>state.monthlyBudget)).toBe(2345);
 await page.locator("#v6SummaryCloud").click();
 await page.locator("#signOutBtn").click();
 await expect.poll(()=>page.evaluate(()=>typeof bootOwner==="undefined"?null:bootOwner)).toBe("");
 await page.evaluate(()=>openAuth());
 await page.locator("#authEmail").fill("bob@example.test");
 await page.locator("#authPassword").fill("test-only-password");
 await page.locator("#signInBtn").click();
 await expect.poll(()=>page.evaluate(()=>typeof bootOwner==="undefined"?null:[bootOwner,state.monthlyBudget])).toEqual(["bob",0]);
 expect(await page.evaluate(()=>localStorage.getItem("butcem_account:alice:butcem_v1"))).toContain("2345");
});

test("installed PWA reloads the versioned application shell offline",async({page,context})=>{
 await page.goto("./");
 await page.evaluate(()=>navigator.serviceWorker.ready);
 await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await context.setOffline(true);
 await page.reload();
 await expect(page.locator("#v5Summary")).toBeVisible();
 expect(await page.evaluate(()=>typeof parseReceipt)).toBe("function");
 expect(await page.evaluate(()=>typeof mergeCloudPayload)).toBe("function");
});
