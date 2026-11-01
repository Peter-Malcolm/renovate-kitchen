import assert from 'node:assert/strict';

/** Check scene-operated plugs retain running water and both bowls overflow through the animation clock. */
export async function sinkInteraction(page){
 await page.locator('[data-view="sink"]').click();
 /** Click the visible control through its projected scene position and normal pointer handler. */
 async function clickPart(part){
  const point=await page.evaluate(async part=>{
   const {Vector3}=await import('./assets/three.module.js'),m=kitchenModel;
   m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);
   const v=part==='body'?m.tapAssembly.localToWorld(new Vector3(0,.085,.02)):part==='lever'?m.leverTarget.getWorldPosition(new Vector3()):m.bowlVisuals[part].plug.localToWorld(new Vector3(0,.01,0));
   v.project(m.camera);const r=document.querySelector('#scene').getBoundingClientRect(),x=r.left+(v.x+1)*r.width/2,y=r.top+(1-v.y)*r.height/2;
   return {x,y,hit:m.pick(x,y)};
  },part);
  assert.equal(point.hit,part==='body'?'action:swivel':part==='lever'?'action:tap':'action:plug:'+part);
  await page.mouse.click(point.x,point.y);
 }
 /** Advance the real animation function using a controlled clock without editing water state. */
 async function advance(seconds,frameMilliseconds=50){
  return page.evaluate(({seconds,frameMilliseconds})=>{
   const original=performance.now.bind(performance);let time=original();
   performance.now=()=>time;kitchenModel.animateSinkWater();
   for(let i=0;i<seconds*1000/frameMilliseconds;i++){time+=frameMilliseconds;kitchenModel.animateSinkWater();}
   performance.now=original;
   const m=kitchenModel;return {water:structuredClone(m.sinkWater),surface:m.bowlVisuals[m.sinkWater.target].surface.position.y,visible:m.bowlVisuals[m.sinkWater.target].surface.visible,puddle:m.puddle.visible,reset:!m.waterReset.hidden,coverage:m.puddle.userData.coverage};
  },{seconds,frameMilliseconds});
 }
 await clickPart('lever');
 assert.equal((await advance(5)).water.bowls.small.litres,0);
 await clickPart('small');
 const small=await advance(10);assert.ok(small.water.bowls.small.litres>3.2&&small.water.bowls.small.litres<3.5);assert.ok(small.visible);assert.equal(small.water.spilled,0);
 const smallFull=await advance(9);assert.equal(smallFull.water.bowls.small.litres,6);assert.ok(smallFull.water.spilled>0&&smallFull.puddle&&smallFull.reset);assert.ok(smallFull.coverage.count>0);
 await clickPart('body');await clickPart('main');
 const main=await advance(10,500);assert.ok(main.water.bowls.main.litres>2.3&&main.visible);assert.equal(main.water.bowls.small.litres,6);
 const full=await advance(51);assert.equal(full.water.bowls.main.litres,20);assert.ok(full.water.bowls.main.spilling);assert.ok(full.water.spilled>smallFull.water.spilled);assert.ok(full.surface>-.01);
 await clickPart('lever');const off=await advance(0),stopped=await advance(5);assert.equal(stopped.water.spilled,off.water.spilled);
 await page.locator('#water-reset').click();assert.equal(await page.locator('#water-reset').isVisible(),false);
 assert.deepEqual(await page.evaluate(()=>structuredClone(kitchenModel.sinkWater.bowls)),stopped.water.bowls);assert.equal(await page.evaluate(()=>kitchenModel.sinkWater.tapOn),false);
 // Leave subsequent interaction checks with empty, unplugged bowls using real controls.
 await clickPart('main');await clickPart('small');const drained=await advance(60);assert.ok(Object.values(drained.water.bowls).every(b=>!b.plugged&&b.litres===0));
 await clickPart('body');
 console.log(JSON.stringify({sinkInteraction:{smallFillSeconds:19,mainFillSeconds:61,spilled:full.water.spilled,coverage:full.coverage.count}}));
}
