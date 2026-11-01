import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {appRoot} from '../scripts/app-root.mjs';
const root=process.env.KITCHEN_APP_ROOT||fileURLToPath(appRoot).replace(/[\\/]$/,'');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname;const file=resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.jpg':'image/jpeg','.png':'image/png'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:960,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.route('**/app.js?*',async route=>{let body=await readFile(root+'/app.js','utf8');body=body.replace('renderer.render(scene,camera);','/* GPU drawing suppressed for geometry and DOM checks. */').replace('renderer.shadowMap.enabled=true','renderer.shadowMap.enabled=false').replace('Math.min(devicePixelRatio,2)','0.4');await route.fulfill({contentType:'text/javascript',body});});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.kitchenModel);console.log('Loaded fork model');

 /** Check the seven visible viewpoints match their numbered shortcuts and remain usable on mobile. */
 const keys=['walkthrough','countertop','sink','hob','cooking','dining','top'];
 assert.deepEqual(await page.locator('.toolbar button').allTextContents(),['Walkthrough','Worktop','Sink & shelves','Hob','Cooking wall','Dining room','Plan view']);
 for(const [i,key] of keys.entries()){
  await page.locator('#scene').focus();await page.keyboard.press(String(i+1));
  assert.equal(await page.locator(`[data-view="${key}"]`).getAttribute('aria-pressed'),'true');
  assert.match(await page.locator(`[data-view="${key}"]`).getAttribute('title'),new RegExp(' · '+(i+1)));
 }
 await page.keyboard.press('8');assert.equal(await page.locator('[data-view="top"]').getAttribute('aria-pressed'),'true');
 /** Check manual movement and pointer interaction cancel guided motion immediately. */
 for(const key of ['w','q','Escape']){await page.keyboard.press('1');assert.equal(await page.evaluate(()=>kitchenModel.walkthrough.active),true);await page.keyboard.press(key);assert.equal(await page.evaluate(()=>kitchenModel.walkthrough.active),false);}
 await page.keyboard.press('1');await page.mouse.move(450,350);await page.mouse.down();await page.mouse.up();assert.equal(await page.evaluate(()=>kitchenModel.walkthrough.active),false);
 await page.keyboard.press('1');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.equal(await page.evaluate(()=>kitchenModel.walkthrough.active),false);
 await page.emulateMedia({reducedMotion:'reduce'});await page.keyboard.press('1');assert.equal(await page.evaluate(()=>kitchenModel.walkthrough.active),false);await page.emulateMedia({reducedMotion:'no-preference'});
 /** Check actual hob, canopy and chimney bounds fit the standing Hob camera with a viewport margin. */
 for(const viewport of [{width:960,height:720},{width:390,height:844}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(100);await page.locator('[data-view="hob"]').click();
  const bounds=await page.evaluate(async()=>{
   const {Box3,Vector3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);
   return [m.hobPlate,m.hood,m.hoodChimney].map(object=>{
    const box=new Box3().setFromObject(object),points=[];
    for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new Vector3(x,y,z).project(m.camera));
    return {name:object.name,x:Math.max(...points.map(p=>Math.abs(p.x))),y:Math.max(...points.map(p=>Math.abs(p.y))),depth:points.every(p=>p.z>-1&&p.z<1)};
   });
  });
  console.log({viewport,bounds});for(const b of bounds)assert.ok(b.x<.94&&b.y<.94&&b.depth,JSON.stringify(b));
  const fit=await page.locator('.toolbar').evaluate(toolbar=>({scroll:toolbar.scrollHeight<=toolbar.clientHeight,width:document.documentElement.scrollWidth<=innerWidth,buttons:[...toolbar.querySelectorAll('button')].every(b=>b.getBoundingClientRect().right<=innerWidth)}));assert.ok(fit.scroll&&fit.width&&fit.buttons);
 }
 assert.deepEqual(errors,[]);console.log('Seven viewpoints and guided walkthrough, shortcuts, mobile toolbar and Hob/hood framing passed.');
}finally{await browser?.close();server.close();}
