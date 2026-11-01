import assert from 'node:assert/strict';

/** Check one centre knob lights both exposed crowns and leaves the other four burners independent. */
export async function hobInteraction(page){
 await page.locator('[data-view="hob"]').click();
 /** Operate the actual projected knob through the scene pointer handler. */
 async function clickKnob(index){
  const point=await page.evaluate(async index=>{
   const {Vector3}=await import('./assets/three.module.js'),m=kitchenModel;
   m.scene.updateMatrixWorld(true);m.camera.updateMatrixWorld(true);
   const v=m.burnerKnobs[index].getWorldPosition(new Vector3());v.y+=.019;v.project(m.camera);
   const r=document.querySelector('#scene').getBoundingClientRect(),x=r.left+(v.x+1)*r.width/2,y=r.top+(1-v.y)*r.height/2;
   return {x,y,hit:m.pick(x,y)};
  },index);
  assert.equal(point.hit,'action:burner:'+index);await page.mouse.click(point.x,point.y);
 }
 await clickKnob(2);
 const crowns=await page.evaluate(()=>{
  const m=kitchenModel,group=m.burnerFlames[2];
  return group.children.map(jet=>({radius:Math.hypot(jet.position.x,jet.position.z),top:group.position.y+jet.position.y+jet.geometry.parameters.height/2,visible:group.visible&&jet.visible,emission:jet.material.emissiveIntensity}));
 });
 const inner=crowns.filter(jet=>jet.radius<.05),outer=crowns.filter(jet=>jet.radius>.05);
 assert.ok(inner.length>=12,'The centre burner must have a visible inner flame crown');
 assert.ok(outer.length>=20,'The centre burner must retain its outer flame crown');
 assert.ok(crowns.every(jet=>jet.visible&&jet.top>.961&&jet.emission>0),'Flames must rise above the burner cap and metal inner ring');
 assert.deepEqual(await page.evaluate(()=>kitchenModel.burnerFlames.map(f=>f.visible)),[false,false,true,false,false]);
 await clickKnob(0);await clickKnob(2);
 assert.deepEqual(await page.evaluate(()=>kitchenModel.burnerFlames.map(f=>f.visible)),[true,false,false,false,false]);
 assert.equal(await page.evaluate(()=>kitchenModel.burnerKnobs[2].rotation.y),0);
 await clickKnob(0);
}
