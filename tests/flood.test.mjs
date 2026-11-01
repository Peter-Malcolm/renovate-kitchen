import test from 'node:test';
import assert from 'node:assert/strict';
import {createFloodMap,floodCoverage} from '../site/flood.js';
import {createWaterState,stepWater,mopSpill} from '../site/water.js';
const floors=[{minX:0,maxX:2,minZ:0,maxZ:2},{minX:0,maxX:3,minZ:2,maxZ:4}];
/** Check increasing volume reaches the connected second room and increases depth after full coverage. */
test('connected whole floor and volume',()=>{
 const map=createFloodMap(floors,[],{x:.2,z:.2},.045),small=floodCoverage(map,.1),large=floodCoverage(map,100);
 assert.ok(small.count<large.count);assert.equal(large.count,map.cells.length);assert.ok(map.cells.at(-1).z>3.5);
 assert.ok(map.cells.slice(0,small.count).every(c=>c.z<1));assert.ok(Math.abs(large.depth*map.area*1000-100)<1e-9);
 assert.equal(floodCoverage(map,200).depth,large.depth*2);
});
/** Check a full wall blocks spread while a doorway routes water around the solid footprint. */
test('walls and doorway',()=>{
 const wall={minX:0,maxX:3,minZ:1.5,maxZ:1.6};
 const closed=createFloodMap(floors,[wall],{x:.2,z:.2},.1);assert.ok(closed.cells.every(c=>c.z<1.5));
 const open=createFloodMap(floors,[{...wall,maxX:1.4}],{x:.2,z:.2},.1);assert.ok(open.cells.some(c=>c.z>3.5));
 assert.ok(open.cells.every(c=>!(c.x<1.4&&c.z>=1.5&&c.z<=1.6)));
});
/** Check draining a sink preserves floor coverage until the explicit mop action. */
test('floor retained after drain and cleared by mopping',()=>{
 const map=createFloodMap(floors,[],{x:.2,z:.2},.1),state=createWaterState();state.tapOn=true;state.bowls.small.plugged=true;stepWater(state,100);
 const before=floodCoverage(map,state.spilled);state.tapOn=false;state.bowls.small.plugged=false;stepWater(state,100);assert.deepEqual(floodCoverage(map,state.spilled),before);
 mopSpill(state);assert.equal(floodCoverage(map,state.spilled).count,0);
});
