import {handleClearance} from './handle-clearance.mjs';
import {hobInteraction} from './hob-interaction.mjs';
import {sinkInteraction} from './sink-interaction.mjs';
import {sinkGeometry} from './sink-geometry.mjs';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {cabinetGeometry} from './cabinet-geometry.mjs';
import {furnitureGeometry} from './furniture-geometry.mjs';
import {appRoot} from '../scripts/app-root.mjs';
const root=fileURLToPath(appRoot).replace(/[\\/]$/,'');
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://local').pathname;const file=resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+'/'))throw Error();res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:960,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
 await page.route('**/app.js?*',async route=>{let body=await readFile(root+'/app.js','utf8');body=body.replace('window.kitchenModel={','window.kitchenModel={animateSinkWater,').replace('renderer.render(scene,camera);','/* GPU drawing suppressed for geometry and DOM checks. */').replace('renderer.shadowMap.enabled=true','renderer.shadowMap.enabled=false').replace('Math.min(devicePixelRatio,2)','0.4');await route.fulfill({contentType:'text/javascript',body});});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.kitchenModel);console.log('Loaded fork model');
 const clearance=await page.evaluate(handleClearance);for(const result of clearance){assert.ok(result.stopped>0&&result.stopped<.4,JSON.stringify(result));assert.equal(result.closed,0);assert.equal(result.released,1);}console.log({handleClearance:clearance});
await sinkInteraction(page);
 // Check the finished quartz surrounds meet both sides of the resized sink after room widening.
 const surround=await page.evaluate(async()=>{const {Box3}=await import('./assets/three.module.js');const m=kitchenModel,s=m.scene.getObjectByName('Ceramic one-and-a-half bowl sink with right drainer');m.scene.updateMatrixWorld(true);const left=new Box3().setFromObject(m.scene.getObjectByName('Left sink worktop surround')),right=new Box3().setFromObject(m.scene.getObjectByName('Right sink worktop surround'));return {left:left.max.x,right:right.min.x,centre:s.getWorldPosition(s.position.clone()).x};});assert.ok(Math.abs(surround.left-(surround.centre-.485))<.001);assert.ok(Math.abs(surround.right-(surround.centre+.485))<.001);

 assert.deepEqual((await page.evaluate(furnitureGeometry)).failures,[]);
  const geometry = await page.evaluate(cabinetGeometry);
 assert.ok(geometry.fronts > 10);assert.equal(geometry.corners,2);assert.deepEqual(geometry.failures,[]);console.log({cabinetGeometry:geometry});
 /** Check the cabinet regression rejects the original 165 mm crown overlap and a 10 mm gap. */
 for (const offset of [-.165,.01]) {
  await page.evaluate(offset=>{
   const enclosure=kitchenModel.scene.getObjectByName('Profiled cornice and concealed duct enclosure');
   const crown=enclosure.children.find(group=>group.children.some(part=>part.name==='Recessed cornice cavity floor'&&part.geometry.parameters.width>.5));
   crown.position.y=offset;
  },offset);
  const invalid=await page.evaluate(cabinetGeometry);
  assert.ok(invalid.failures.some(failure=>failure.name==='Tall crown / fridge top'));
 }
 await page.evaluate(()=>{for(const crown of kitchenModel.scene.getObjectByName('Profiled cornice and concealed duct enclosure').children)crown.position.y=0;});



 // Check both interior doorway returns remain plaster under either exterior finish.
 const returns=await page.evaluate(async()=>{const {Box3,Vector3,Raycaster}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const upright=m.scene.getObjectByName('Kitchen upright');const bounds=new Box3().setFromObject(upright);const hits=[];for(const finish of ['brick','plain']){m.choose('exterior',finish);m.scene.updateMatrixWorld(true);for(const side of [-1,1])for(const fraction of [.08,.25,.75,.92])for(const y of [.3,1.15,2.2]){const x=bounds.min.x+(bounds.max.x-bounds.min.x)*fraction,z=side<0?bounds.min.z-.1:bounds.max.z+.1;const hit=new Raycaster(new Vector3(x,y,z),new Vector3(0,0,-side)).intersectObject(upright,true)[0];hits.push({finish,side,x,y,plaster:hit?.object===upright,exterior:hit?.object.userData.choice==='exterior'});}}return {samples:hits.length,plaster:hits.filter(h=>h.plaster).length,exterior:hits.filter(h=>h.exterior).length,misses:hits.filter(h=>!h.plaster&&!h.exterior).length};});console.log({interiorReturnRays:returns});assert.equal(returns.misses,0);assert.equal(returns.plaster,returns.samples);assert.equal(returns.exterior,0);
 // Check closed front reveals hit nearby opaque construction rather than distant cabinet interiors.
 const coverage=await page.evaluate(async()=>{const {Vector3,Raycaster,Box3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const fronts=[];m.scene.traverse(o=>{if(o.name==='Cabinet front')fronts.push(o);});const failures=[];let samples=0;
 for(const [index,front] of fronts.entries()){const bounds=new Box3();for(const o of front.children.filter(o=>o.isMesh&&o.geometry.type==='BoxGeometry'&&o.position.z>=0)){o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(o.matrix));}if(bounds.isEmpty())continue;const points=[[bounds.min.x-.00075,0],[bounds.max.x+.00075,0],[0,bounds.min.y-.00075],[0,bounds.max.y+.00075]];
 for(const [x,y] of points){const origin=front.localToWorld(new Vector3(x,y,.1)),direction=new Vector3(0,0,-1).transformDirection(front.matrixWorld);const ray=new Raycaster(origin,direction,0,.3);const hit=ray.intersectObjects(m.scene.children,true).find(h=>{for(let a=h.object;a;a=a.parent)if(!a.visible)return false;const mat=h.object.material;return mat&&!Array.isArray(mat)&&!mat.transparent;});samples++;if(!hit||hit.distance>.15)failures.push({index,point:[x,y],distance:hit?.distance,hit:hit?.object.name});}}
 return {fronts:fronts.length,samples,failures};});console.log({closedFrontCoverage:coverage});assert.deepEqual(coverage.failures,[]);


 // Check navigation buttons and scene shortcuts turn smoothly without moving the camera.
 await page.evaluate(()=>kitchenModel.view('whole'));
 const whole=await page.evaluate(()=>({position:kitchenModel.camera.position.toArray(),direction:kitchenModel.camera.getWorldDirection(kitchenModel.camera.position.clone()).toArray()}));assert.ok(whole.position[2]>4&&whole.position[1]<2&&whole.direction[2]<-.95);
 const furnitureClearance=await page.evaluate(async()=>{const {Box3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);return ['Grey and oak dresser','Existing 180 cm table','Current chairs'].map(name=>{const box=new Box3().setFromObject(m.scene.getObjectByName(name));return {name,min:box.min.toArray(),max:box.max.toArray(),distance:box.distanceToPoint(m.camera.position)};});});console.log({furnitureClearance});assert.ok(furnitureClearance.every(b=>b.distance>.15));

 // Check pointer and Q/E holds turn progressively in place and stop on release.
 const turnButton=page.locator('[data-turn="left"]');await turnButton.hover();await page.mouse.down();await page.waitForTimeout(250);const partial=await page.evaluate(()=>kitchenModel.camera.quaternion.toArray());await page.waitForTimeout(250);await page.mouse.up();
 const left=await page.evaluate(()=>({position:kitchenModel.camera.position.toArray(),quaternion:kitchenModel.camera.quaternion.toArray()}));assert.ok(left.position.every((v,i)=>Math.abs(v-whole.position[i])<1e-10));assert.ok(left.quaternion.some((v,i)=>Math.abs(v-partial[i])>.01));await page.waitForTimeout(150);assert.ok((await page.evaluate(()=>kitchenModel.camera.quaternion.toArray())).every((v,i)=>Math.abs(v-left.quaternion[i])<1e-10));
 await page.evaluate(()=>kitchenModel.view('whole'));await page.locator('#scene').focus();await page.keyboard.down('q');await page.waitForTimeout(400);await page.keyboard.up('q');const keyed=await page.evaluate(()=>kitchenModel.camera.quaternion.toArray());await page.waitForTimeout(150);assert.ok((await page.evaluate(()=>kitchenModel.camera.quaternion.toArray())).every((v,i)=>Math.abs(v-keyed[i])<1e-10));
 await page.keyboard.down('e');await page.waitForTimeout(400);await page.keyboard.up('e');assert.ok(await page.evaluate(()=>kitchenModel.camera.getWorldDirection(kitchenModel.camera.position.clone()).z)<-.95);
 await page.locator('[data-turn="left"]').focus();assert.ok((await page.locator('#shortcut-tip').textContent()).includes('Q'));const focused=await page.evaluate(()=>kitchenModel.camera.quaternion.toArray());await page.keyboard.press('q');assert.ok((await page.evaluate(()=>kitchenModel.camera.quaternion.toArray())).every((v,i)=>Math.abs(v-focused[i])<1e-10));
 await page.locator('#scene').focus();await page.keyboard.press('r');assert.ok((await page.evaluate(()=>kitchenModel.camera.position.toArray())).every((value,index)=>Math.abs(value-[0,1.65,1.15][index])<1e-10));assert.equal(await page.locator('.toolbar [aria-pressed="true"]').count(),0);await page.keyboard.press('ArrowUp');assert.ok(await page.evaluate(()=>kitchenModel.camera.position.z)<1.15);
 // Check the water Easter egg is undisclosed until direct scene interaction.
 assert.equal(await page.locator('#water-open').count(),0);assert.equal(await page.locator('#water-panel').isVisible(),false);assert.equal(await page.locator('#water-reset').isVisible(),false);
 // Check deliberate keyboard inspection opens usable sink controls and Escape leaves them dismissed.
 await page.locator('#scene').focus();await page.keyboard.press('i');assert.equal(await page.locator('#water-panel').isVisible(),true);assert.equal(await page.locator('#water-tap').evaluate(e=>e===document.activeElement),true);await page.keyboard.press('Escape');await page.waitForTimeout(100);assert.equal(await page.locator('#water-panel').isVisible(),false);assert.equal(await page.locator('#scene').evaluate(e=>e===document.activeElement),true);
 // Check dresser inter-front gaps stop at the fixed face frame, not the cabinet interior.
 const dresserCoverage=await page.evaluate(async()=>{const {Vector3,Raycaster}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const dresser=m.scene.getObjectByName('Grey and oak dresser'),failures=[];for(const x of [-.275,.275])for(const y of [.42,.775,1.49]){const origin=dresser.localToWorld(new Vector3(x,y,.33)),direction=new Vector3(0,0,-1).transformDirection(dresser.matrixWorld),hit=new Raycaster(origin,direction,0,.3).intersectObjects(dresser.children,true).find(h=>!h.object.material.transparent);if(!hit||hit.distance>.15||hit.object.parent.name!=='Dresser stationary face frame')failures.push({x,y,distance:hit?.distance});}return {samples:6,failures};});assert.deepEqual(dresserCoverage.failures,[]);console.log({dresserCoverage});

 // Check upstand corner and window-sill junctions using the current transformed meshes.
 const joins=await page.evaluate(async()=>{const {Box3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const bounds=name=>new Box3().setFromObject(m.scene.getObjectByName(name));const sill=bounds('Sink window quartz sill');const result={};for(const side of ['Left','Right']){const edge=bounds(side+' upstand to rear corner'),rear=bounds(side+' window upstand return');result[side+'CornerGap']=edge.distanceToPoint(rear.clampPoint(edge.getCenter(edge.min.clone()),edge.min.clone()));result[side+'SillContact']=rear.intersectsBox(sill);}return result;});assert.ok(joins.LeftCornerGap<.001&&joins.RightCornerGap<.001&&joins.LeftSillContact&&joins.RightSillContact);console.log({upstandJoins:joins});
 // Check each moving assembly opens and returns while all stationary face frames remain fixed.
 const openings=await page.evaluate(()=>{const m=kitchenModel,parts=[...m.kitchenDoors.values(),...m.dining.dresserParts.values()];m.scene.updateMatrixWorld(true);const fixed=[];m.scene.traverse(o=>{if(/Stationary|stationary/.test(o.name))fixed.push([o,o.matrixWorld.clone()]);});const before=parts.map(p=>p.pivot.matrix.clone());parts.forEach(p=>p.open=true);for(let i=0;i<100;i++){m.animateCabinets();m.dining.animateDresser();}m.scene.updateMatrixWorld(true);const opened=parts.map((p,i)=>!p.pivot.matrix.equals(before[i]));parts.forEach(p=>p.open=false);for(let i=0;i<100;i++){m.animateCabinets();m.dining.animateDresser();}m.scene.updateMatrixWorld(true);return {assemblies:parts.length,allOpened:opened.every(Boolean),allReturned:parts.every((p,i)=>p.pivot.matrix.elements.every((v,j)=>Math.abs(v-before[i].elements[j])<1e-8)),fixedFrames:fixed.length,framesStationary:fixed.every(([o,matrix])=>o.matrixWorld.equals(matrix))};});assert.ok(openings.allOpened&&openings.allReturned&&openings.framesStationary);console.log({openings});
 // Check actual sink door faces remain behind the worktop lip, allowing a modest overhang.
 const overhang=await page.evaluate(async()=>{const {Box3}=await import('./assets/three.module.js');const m=kitchenModel,sink=m.scene.getObjectByName('Sink cupboard, two doors');const fronts=[];sink.traverse(o=>{if(o.name==='Cabinet front')for(const child of o.children)if(child.isMesh&&child.geometry.type==='BoxGeometry'&&child.position.z>=0)fronts.push(child);});const frontZ=Math.max(...fronts.map(f=>new Box3().setFromObject(f).max.z));const lip=sink.parent.children.find(o=>o.isMesh&&o.geometry.parameters.width===1.28&&o.geometry.parameters.height===.045&&o.geometry.parameters.depth===.065);return new Box3().setFromObject(lip).max.z-frontZ;});assert.ok(overhang>.01&&overhang<.03);console.log({sinkCounterOverhangMetres:overhang});
 /** Check bowl targets are tap states and never additional camera presets. */
 assert.equal(await page.locator('[data-view="smallSink"],[data-view="mainSink"]').count(),0);
 const standingHeights=await page.evaluate(()=>Object.entries(kitchenModel.views).filter(([name])=>name!=='top').map(([,v])=>v.position[1]));assert.ok(standingHeights.every(y=>y===1.65));
 /** Check the selected sink envelope and tap outlet fit the ceramic deck and bowls. */
 assert.deepEqual((await page.evaluate(sinkGeometry)).failures,[]);
 await page.locator('[data-view="sink"]').click();
 // Actual scene raycasts are performed before dispatching real pointer input.
 const hits=await page.evaluate(async()=>{const {Vector3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);const rect=document.querySelector('#scene').getBoundingClientRect();const points={body:new Vector3(0,.085,.02).applyMatrix4(m.tapAssembly.matrixWorld),lever:m.leverTarget.getWorldPosition(new Vector3())};const result={};for(const [name,v]of Object.entries(points)){v.project(m.camera);const x=rect.left+(v.x+1)*rect.width/2,y=rect.top+(1-v.y)*rect.height/2;result[name]={x,y,hit:m.pick(x,y)};}return result;});console.log({hits});
 assert.equal(hits.body.hit,'action:swivel');assert.equal(hits.lever.hit,'action:tap');
 await page.mouse.click(hits.body.x,hits.body.y);assert.equal(await page.evaluate(()=>kitchenModel.sinkWater.target),'main');assert.equal(await page.evaluate(()=>kitchenModel.sinkWater.tapOn),false);
 assert.equal(await page.locator('#water-panel').isVisible(),false);
 await page.mouse.click(hits.lever.x,hits.lever.y);assert.equal(await page.locator('#water-panel').isVisible(),false);assert.equal(await page.evaluate(()=>kitchenModel.sinkWater.tapOn),true);assert.equal(await page.evaluate(()=>kitchenModel.sinkWater.target),'main');
 const flow=await page.evaluate(async()=>{const {Vector3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const p=m.waterStream.getWorldPosition(new Vector3());return {x:p.x,z:p.z,rotation:m.spout.rotation.y};});assert.ok(flow.x<-.06&&flow.x>-.57&&flow.z>-1.7625&&flow.z<-1.3375);assert.equal(flow.rotation,-Math.PI/3);
 /** Check closed-plug flow reaches the bowl water surface and visibly travels downwards. */
 const contact=await page.evaluate(async()=>{const {Vector3}=await import('./assets/three.module.js');const m=kitchenModel;m.sinkWater.bowls.main.plugged=true;m.sinkWater.bowls.main.litres=0;m.syncWater();m.scene.updateMatrixWorld(true);const bottom=m.waterStream.localToWorld(new Vector3(0,-.19,0));const bowl=m.scene.getObjectByName('Ceramic one-and-a-half bowl sink with right drainer');const floor=bowl.localToWorld(new Vector3(0,-.222+.002,0));const drops=m.scene.getObjectByName('Falling water highlights');m.sinkWater.bowls.main.plugged=false;m.syncWater();return {gap:bottom.y-floor.y,highlight: drops.children[0].position.y};});assert.ok(Math.abs(contact.gap)<.001);
 await page.waitForTimeout(100);const flowingHighlight=await page.evaluate(()=>kitchenModel.scene.getObjectByName('Falling water highlights').children[0].position.y);assert.notEqual(flowingHighlight,contact.highlight);
 // Check keyboard users retain compact, operable controls after direct scene interaction.
 await page.locator('#scene').focus();await page.keyboard.press('i');
 await page.locator('#water-plug-main').click();await page.waitForTimeout(600);assert.ok(await page.evaluate(()=>kitchenModel.sinkWater.bowls.main.litres)>0);
 await page.locator('#water-swivel').click();await page.locator('#water-plug-small').click();const before=await page.evaluate(()=>kitchenModel.sinkWater.bowls.main.litres);await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>kitchenModel.sinkWater.bowls.main.litres),before);assert.ok(await page.evaluate(()=>kitchenModel.sinkWater.bowls.small.litres)>0);
 assert.equal(await page.locator('#water-reset').isVisible(),false);await page.evaluate(async()=>{const {stepWater}=await import('./water.js');stepWater(kitchenModel.sinkWater,30);kitchenModel.syncWater();});assert.equal(await page.locator('#water-reset').isVisible(),true);
 await page.locator('#water-plug-small').click();const full=await page.evaluate(()=>kitchenModel.sinkWater.bowls.small.litres);await page.waitForTimeout(600);assert.ok(await page.evaluate(()=>kitchenModel.sinkWater.bowls.small.litres)<full);
 /** Check the mop button clears only floor spill without changing the running tap or bowl state. */
 const mopped=await page.evaluate(()=>{const m=kitchenModel,before=structuredClone(m.sinkWater);document.querySelector('#water-reset').click();return {before,after:structuredClone(m.sinkWater),hidden:m.waterReset.hidden};});assert.ok(mopped.hidden);assert.equal(mopped.after.spilled,0);assert.equal(mopped.after.tapOn,mopped.before.tapOn);assert.deepEqual(mopped.after.bowls,mopped.before.bowls);assert.equal(mopped.after.target,mopped.before.target);
 await page.locator('#water-tap').click();
 await page.locator('#water-close').click();await page.evaluate(()=>kitchenModel.openEditor('paint'));assert.equal(await page.locator('#item-title').textContent(),'Paint colour');assert.equal(await page.locator('#item-choices [data-kind="exterior"]').count(),0);assert.ok(await page.locator('#item-choices [data-kind="paint"]').count()>0);
 await page.evaluate(()=>kitchenModel.openEditor('wallView'));assert.ok(await page.locator('#item-choices [data-kind="wallView"]').count()===3);const paint=await page.evaluate(()=>kitchenModel.state.paint);await page.locator('[data-kind="wallView"][data-value="hide"]').click();assert.equal(await page.evaluate(()=>kitchenModel.state.paint),paint);assert.ok(await page.evaluate(()=>{kitchenModel.updateWallVisibility();return kitchenModel.structuralWalls.every(w=>!w.visible);}));
 await page.evaluate(()=>{kitchenModel.choose('wallView','auto');kitchenModel.choose('table','oval');kitchenModel.choose('tableExtended','on');kitchenModel.choose('upstand','none');});assert.equal(await page.evaluate(()=>kitchenModel.state.tableExtended),true);assert.equal(await page.evaluate(()=>kitchenModel.state.tiles),'two');
 await page.evaluate(()=>kitchenModel.openEditor('tiles'));assert.deepEqual(await page.locator('#item-choices section h3').allTextContents(),['Upstand','Metro tiles','Grout colour']);assert.equal(await page.locator('[data-kind="grout"]').count(),3);await page.locator('[data-kind="grout"][data-value="silver"]').click();assert.equal(await page.evaluate(()=>kitchenModel.state.grout),'silver');await page.locator('#close-item').click();
 // Check references expose the two approved photos, the pseudonymised plan and all evidence categories.
 await page.locator('#public-reference-open').click();
 assert.deepEqual(await page.locator('#public-reference section h3').allTextContents(),['Photos','Measurements','Videos','Floorplan','Receipts','Meaningful items']);
 assert.equal(await page.locator('#public-reference img').count(),3);
 for(const image of await page.locator('#public-reference img').all()){
  await image.scrollIntoViewIfNeeded();
  await image.evaluate(image=>image.decode());
  assert.ok(await image.evaluate(image=>image.naturalWidth>0));
 }
 await page.locator('#public-reference-close').click();
 assert.equal(await page.locator('#public-reference').isVisible(),false);


 await hobInteraction(page);
 await page.locator('[data-view="hob"]').click();
 // Check actual modeled knob hit zones independently switch their own flame and rotate.
 const knobHits=await page.evaluate(async()=>{const {Vector3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);const rect=document.querySelector('#scene').getBoundingClientRect();return m.burnerKnobs.map(knob=>{const v=knob.getWorldPosition(new Vector3());v.y+=.019;v.project(m.camera);const x=rect.left+(v.x+1)*rect.width/2,y=rect.top+(1-v.y)*rect.height/2;return {x,y,hit:m.pick(x,y)};});});
 for(let i=0;i<5;i++){assert.equal(knobHits[i].hit,'action:burner:'+i);await page.mouse.click(knobHits[i].x,knobHits[i].y);assert.deepEqual(await page.evaluate(()=>kitchenModel.burnerFlames.map(f=>f.visible)),Array.from({length:5},(_,j)=>j<=i));assert.equal(await page.evaluate(i=>kitchenModel.burnerKnobs[i].rotation.y,i),-Math.PI/2);}
 for(let i=0;i<5;i++){await page.mouse.click(knobHits[i].x,knobHits[i].y);assert.deepEqual(await page.evaluate(()=>kitchenModel.burnerFlames.map(f=>f.visible)),Array.from({length:5},(_,j)=>j>i));}
 const alignment=await page.evaluate(async()=>{const {Vector3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const z=m.hobPlate.getWorldPosition(new Vector3()).z;const drawers=m.hobBaseRun.children.filter(c=>String(c.userData.cabinet||'').startsWith('drawer-'));return {z,drawerZ:drawers.map(d=>d.getWorldPosition(new Vector3()).z),hoodZ:m.hood.getObjectByName('Extractor underside').getWorldPosition(new Vector3()).z,runWidth:m.hobBaseRun.userData.segments.reduce((sum,s)=>sum+s.width,0)};});assert.equal(alignment.drawerZ.length,3);assert.ok(alignment.drawerZ.every(z=>Math.abs(z-alignment.z)<1e-8));assert.ok(Math.abs(alignment.hoodZ-alignment.z)<=.011);assert.ok(Math.abs(alignment.runWidth-2.11)<1e-8);console.log({independentKnobClicks:true,alignment});
 // Check intentional wall/cabinet adjacency using transformed scene bounds, not source constants.
 const seam=await page.evaluate(async()=>{const {Box3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const cabinet=m.scene.getObjectByName('Wall cupboard beside extractor, two doors'),wall=m.scene.getObjectByName('Continuous rear wall around sink window');return new Box3().setFromObject(cabinet).min.z-new Box3().setFromObject(wall).max.z;});assert.ok(Math.abs(seam)<.002);console.log({upperCabinetWallSeamMetres:seam});

 // Check supported chimney contact and narrow appliance reveals while doors are shut.
 const contacts=await page.evaluate(async()=>{const {Box3}=await import('./assets/three.module.js');const m=kitchenModel;m.scene.updateMatrixWorld(true);const hood=new Box3().setFromObject(m.hood),chimney=new Box3().setFromObject(m.hoodChimney),door=new Box3().setFromObject(m.microwaveLeaf),upper=new Box3().setFromObject(m.scene.getObjectByName('Microwave upper fascia')),lower=new Box3().setFromObject(m.scene.getObjectByName('Microwave lower fascia'));return {chimneyCanopyGap:chimney.min.y-hood.max.y,upperDoorReveal:upper.min.y-door.max.y,lowerDoorReveal:door.min.y-lower.max.y};});assert.ok(Math.abs(contacts.chimneyCanopyGap)<.001);assert.ok(contacts.upperDoorReveal>0&&contacts.upperDoorReveal<.004);assert.ok(contacts.lowerDoorReveal>0&&contacts.lowerDoorReveal<.004);console.log({contacts});
 assert.equal(await page.locator('[data-view="dining"]').count(),1);assert.equal(await page.locator('[data-view="back"]').count(),0);
 await page.evaluate(()=>kitchenModel.openEditor('art'));assert.equal(await page.locator('#item-title').textContent(),'Wall prints');assert.ok((await page.locator('[data-kind="art"]').allTextContents()).every(t=>/2 prints|3 prints/.test(t)));await page.locator('#close-item').click();
 await page.locator('[data-view="countertop"]').click();await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({realRaycastBodyAndLever:true,streamInsideMainBowl:flow,independentBowls:true,draining:true,floodReset:true,separateWallMenus:true,existingControls:true,errors,rendering:'suppressed; not visual GPU acceptance'}));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
