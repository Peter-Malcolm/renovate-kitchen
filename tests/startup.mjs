import {createServer} from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {extname,resolve} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import {appRoot} from '../scripts/app-root.mjs';
const results=[];
for(const [name,root] of [['kitchen',process.env.KITCHEN_APP_ROOT||fileURLToPath(appRoot).replace(/[\\/]$/,'')]]){
 const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;const file=resolve(root,'.'+(path==='/'?'/index.html':path));res.setHeader('Content-Type',extname(file)==='.js'?'text/javascript':'text/html');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:800}});
  /** Check the HTML loader remains visible and controls inert during a stalled module request. */
  let release;const gate=new Promise(resolve=>release=resolve);
  await page.route('**/app.js?*',async route=>{await gate;await route.abort();});
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
  assert.equal(await page.locator('#startup').isVisible(),true);
  assert.equal(await page.locator('header').evaluate(e=>e.inert),true);release();
  await page.waitForFunction(()=>document.body.dataset.startup==='error');
  assert.equal(await page.locator('#startup-retry').isVisible(),true);
  assert.equal(await page.locator('header').evaluate(e=>e.inert),true);
  await page.unroute('**/app.js?*');
  /** Check genuine WebGL startup failure offers a visible recovery action. */
  await page.addInitScript(()=>{HTMLCanvasElement.prototype.getContext=new Proxy(HTMLCanvasElement.prototype.getContext,{apply(target,self,args){if(String(args[0]).startsWith('webgl'))return null;return Reflect.apply(target,self,args);}});});
  await page.reload();await page.waitForFunction(()=>document.body.dataset.startup==='error');assert.equal(await page.locator('#startup-retry').isVisible(),true);
  
  await page.close();
  if(process.env.KITCHEN_GPU_RENDER==='1'){
   /** Check controls become usable only after an actual successful first frame. */
   const rendered=await browser.newPage({viewport:{width:640,height:480}});
   await rendered.route('**/app.js?*',async route=>{const source=await readFile(root+'/app.js','utf8');await route.fulfill({contentType:'text/javascript',body:source.replace('if(firstFrame){firstFrame=false;','if(firstFrame){renderer.setAnimationLoop(null);firstFrame=false;')});});
   await rendered.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});
   await rendered.waitForFunction(()=>window.kitchenModel&&!document.body.hasAttribute('data-startup'),{},{timeout:180000});
   assert.equal(await rendered.locator('#startup').isVisible(),false);
   assert.equal(await rendered.locator('header').evaluate(e=>e.inert),false);
   assert.ok(await rendered.evaluate(()=>kitchenModel.renderer.info.render.calls>0));
   console.log(await rendered.evaluate(()=>performance.getEntriesByType('mark').map(mark=>({stage:mark.name,ms:mark.startTime}))));
   await rendered.close();
  }
  results.push({name,moduleFailure:true,webglFailure:true});
 }finally{await browser.close();await new Promise(done=>server.close(done));}
}
console.log(JSON.stringify(results));
