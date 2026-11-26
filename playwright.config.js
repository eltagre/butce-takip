const {defineConfig,devices}=require("@playwright/test");
const launchOptions=process.env.BUTCEM_CHROMIUM ? {executablePath:process.env.BUTCEM_CHROMIUM} : {};
module.exports=defineConfig({
 testDir:"./tests",
 testMatch:"**/*.spec.js",
 use:{baseURL:"http://127.0.0.1:8765/butce-takip/"},
 webServer:{
  command:"node tests/serve.cjs",
  url:"http://127.0.0.1:8765/butce-takip/",
  reuseExistingServer:false
 },
 projects:[
  {name:"desktop-chromium",use:{...devices["Desktop Chrome"],launchOptions}},
  {name:"mobile-chromium",use:{...devices["Pixel 7"],launchOptions}},
  ...(process.env.BUTCEM_CHROMIUM ? [] : [{name:"mobile-webkit",use:{...devices["iPhone 13"]}}])
 ]
});
