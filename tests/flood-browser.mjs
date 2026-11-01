import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {sinkInteraction} from './sink-interaction.mjs';
import {appRoot} from '../scripts/app-root.mjs';
const root=process.argv[2]||fileURLToPath(appRoot).replace(/\/$/,'');
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://local').pathname;res.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path==='/'||path.endsWith('.html')?'text/html':'application/octet-stream');res.end(await readFile(root+(path==='/'?'/index.html':path)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/app.js?*',async route=>{const body=(await readFile(root+'/app.js','utf8')).replace('renderer.render(scene,camera);','').replace('window.kitchenModel={','window.kitchenModel={animateSinkWater,');await route.fulfill({contentType:'text/javascript',body});});
await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.kitchenModel);
await sinkInteraction(page);
/** Check measured spill volume reaches the far dining floor and reset removes retained water. */
const result=await page.evaluate(async()=>{const m=kitchenModel;const {Matrix4}=await import('./assets/three.module.js');const states=[];for(const litres of [.1,2,30,100]){m.sinkWater.spilled=litres;m.syncWater();const mesh=m.puddle.children[0],matrix=new Matrix4();let maxZ=-Infinity,minZ=Infinity;for(const {z} of mesh.userData.cells.slice(0,m.puddle.userData.coverage.count)){maxZ=Math.max(z,maxZ);minZ=Math.min(z,minZ);}states.push({...m.puddle.userData.coverage,minZ,maxZ});}m.waterReset.click();return {states,reset:!m.puddle.visible,resetHidden:m.waterReset.hidden};});
console.log(JSON.stringify({root,...result,errors}));assert.deepEqual(errors,[]);assert.ok(result.states[0].maxZ<0);assert.ok(result.states[2].maxZ>5);assert.equal(result.states[3].count,result.states[3].reachableCells);assert.ok(result.reset&&result.resetHidden);
/** Check furniture changes update wet footprints while conserving retained spill volume. */
const furniture=await page.evaluate(async()=>{
 const m=kitchenModel,{Matrix4}=await import('./assets/three.module.js');
 /** Capture the rendered wet cells and their measured volume. */
 function snapshot(){
  const mesh=m.puddle.children[0],matrix=new Matrix4(),cells=[];
  for(const {x,z} of mesh.userData.cells.slice(0,m.puddle.userData.coverage.count))cells.push([x,z]);
  return {cells,litres:m.sinkWater.spilled,renderedLitres:m.puddle.userData.coverage.litres};
 }
 const results=[];
 m.choose('table','soft');m.choose('tableExtended','off');m.choose('chairs','nel');m.choose('shoeRack','current');
 for(const [kind,value] of [['table','oval'],['tableExtended','on'],['chairs','current'],['shoeRack','oak']]){
  m.sinkWater.spilled=100;m.syncWater();const before=snapshot();
  m.choose(kind,value);m.syncWater();const after=snapshot();
  m.waterReset.click();m.sinkWater.spilled=100;m.syncWater();const fresh=snapshot();
  results.push({kind,changed:JSON.stringify(before.cells)!==JSON.stringify(after.cells),matchesFresh:JSON.stringify(after.cells)===JSON.stringify(fresh.cells),litres:after.litres,renderedLitres:after.renderedLitres});
 }
 m.waterReset.click();return results;
});
for(const result of furniture){assert.ok(result.changed,result.kind+' must change wet footprints');assert.ok(result.matchesFresh,result.kind+' must match freshly flooded geometry');assert.equal(result.litres,100);assert.equal(result.renderedLitres,100);}
console.log(JSON.stringify({furniture}));
/** Check overflow highlights move down a continuous cabinet-to-plinth route. */
const runoff=await page.evaluate(()=>{const group=kitchenModel.scene.getObjectByName('Large left bowl animated cabinet and plinth runoff'),ribbon=group.children[0],position=ribbon.geometry.attributes.position;return {offset:ribbon.material.map.offset.y,ribbons:group.children.length,top:position.getY(0),bottom:position.getY(position.count-1),front:position.getZ(0),outlet:position.getZ(position.count-1)};});
await page.waitForTimeout(150);
const moved=await page.evaluate(()=>kitchenModel.scene.getObjectByName('Large left bowl animated cabinet and plinth runoff').children[0].material.map.offset.y);
assert.notEqual(moved,runoff.offset);assert.equal(runoff.ribbons,1);assert.ok(runoff.top>.9&&runoff.bottom<.01&&runoff.outlet>runoff.front);console.log(JSON.stringify({runoff,moved}));
}finally{await browser.close();server.close();}
