import test from 'node:test';
import assert from 'node:assert/strict';
import {appRoot} from '../scripts/app-root.mjs';
const {createWaterState,stepWater,resetWater,waterDefaults} = await import(new URL('water.js', appRoot));
const {countertopView} = await import(new URL('viewpoints.js', appRoot));

/** Check the small bowl fills gradually and spills only after reaching its capacity. */
test('gradual fill and overflow boundary',()=>{
 const state=createWaterState();state.tapOn=true;state.bowls.small.plugged=true;
 stepWater(state,10);assert.ok(state.bowls.small.litres>0&&state.bowls.small.litres<6);assert.equal(state.spilled,0);
 stepWater(state,15);assert.equal(state.bowls.small.litres,6);assert.equal(state.spilled,0);
 stepWater(state,1);assert.ok(state.spilled>0);assert.equal(state.bowls.small.spilling,true);assert.equal(state.bowls.main.litres,0);
});
/** Check switching the target preserves retained water and only fills the newly targeted bowl. */
test('independent bowl routing',()=>{
 const state=createWaterState();state.tapOn=true;state.bowls.main.plugged=state.bowls.small.plugged=true;
 stepWater(state,10);const small=state.bowls.small.litres;state.target='main';stepWater(state,10);
 assert.equal(state.bowls.small.litres,small);assert.equal(state.bowls.main.litres,small);
 state.bowls.small.plugged=false;stepWater(state,1);assert.ok(state.bowls.small.litres<small);assert.ok(state.bowls.main.litres>small);
 state.tapOn=false;const main=state.bowls.main.litres;stepWater(state,10);assert.equal(state.bowls.small.litres,0);assert.equal(state.bowls.main.litres,main);
});
/** Check open drains handle the running tap for either selected bowl without a flood. */
test('open drains',()=>{
 for(const id of ['main','small']){const state=createWaterState();state.tapOn=true;state.target=id;stepWater(state,120);assert.equal(state.bowls[id].litres,0);assert.equal(state.spilled,0);}
});
/** Check incoming water remains conserved across both bowls, drains and floor at different cadences. */
test('conservation across bowls and frame cadence',()=>{
 const results=[];
 for(const dt of [1/30,1/60,1/120]){
  const state=createWaterState();state.tapOn=true;state.bowls.small.plugged=state.bowls.main.plugged=true;
  for(let i=0;i<120/dt;i++){if(i===Math.round(40/dt))state.target='main';stepWater(state,dt);}
  assert.ok(Math.abs(state.supplied-state.bowls.main.litres-state.bowls.small.litres-state.drained-state.spilled)<1e-8);results.push(state);
 }
 for(const state of results)assert.ok(Math.abs(state.spilled-results[0].spilled)<1e-8);
});
/** Check opening a flooded bowl stops overflow but retains floor water until reset. */
test('drain and reset after flood',()=>{
 const state=createWaterState();state.tapOn=true;state.bowls.small.plugged=true;stepWater(state,35);
 const spilled=state.spilled;state.bowls.small.plugged=false;stepWater(state,1);assert.equal(state.spilling,false);assert.equal(state.spilled,spilled);
 state.target='main';state.bowls.main.plugged=true;stepWater(state,5);resetWater(state);
 assert.deepEqual(state,{...createWaterState(),target:'main'});
});
/** Check invalid time, capacities and destinations cannot corrupt the water state. */
test('invalid inputs',()=>{
 for(const dt of [-1,NaN,Infinity])assert.throws(()=>stepWater(createWaterState(),dt),RangeError);
 assert.throws(()=>stepWater(createWaterState(),1,{...waterDefaults,capacities:{main:0,small:6}}),RangeError);
 assert.throws(()=>stepWater({...createWaterState(),target:'missing'},1),RangeError);
});
/** Check the fridge-side view looks down the left worktop from standing eye height. */
test('fridge countertop view',()=>{
 const [x,y,z]=countertopView.position;
 const [tx,ty,tz]=countertopView.target;
 // The aisle ends beside the fridge at z=2.46; the counter occupies x=-1.22..-.62.
 assert.ok(x>-.62&&x<.55,'Camera must stay in the aisle outside the cabinets');
 assert.ok(y>1.5&&y<1.8,'Camera must retain standing eye height');
 assert.ok(z>2.46&&z<3.1,'Camera must sit just beyond the fridge-side end of the run');
 assert.ok(tx>-1.22&&tx<-.62,'Aim across the left worktop');
 assert.ok(ty>.9&&ty<1.15&&ty<y,'Aim slightly above the worktop and below eye height');
 assert.ok(tz<0&&z-tz>2.5,'Look along the counter toward the sink end');
 assert.ok(countertopView.fov>=45&&countertopView.fov<=65,'Keep a natural interior field of view');
});
