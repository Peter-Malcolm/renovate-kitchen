import test from 'node:test';
import assert from 'node:assert/strict';
import {appRoot} from '../scripts/app-root.mjs';
const {normalizeTime,clockMinutesForTime,lightingForTime,applyLighting}=await import(new URL('lighting.js',appRoot));
const room={bearing:0,target:[2,3,4],distance:10,presets:{
 morning:{azimuth:0,elevation:0,sun:2},
 noon:{azimuth:90,elevation:0,sun:3},
 night:{azimuth:0,elevation:0,sun:0},
}};

/** Check morning sets 07:30 while other phases and legacy day selections retain their clock times. */
test('phase compatibility and clock',()=>{
 assert.equal(normalizeTime('day'),'noon');assert.equal(normalizeTime('unknown'),'noon');
 assert.deepEqual(['morning','noon','night'].map(clockMinutesForTime),[450,795,1260]);
 assert.equal(clockMinutesForTime('day'),795);
});

/** Check room orientation rotates sunlight around the configured target without changing its height. */
test('room bearing and target',()=>{
 const original=lightingForTime('morning',room);
 assert.deepEqual(original.position,[2,3,-6]);
 const rotated=lightingForTime('morning',{...room,bearing:90});
 assert.ok(Math.abs(rotated.position[0]+8)<1e-10);
 assert.ok(Math.abs(rotated.position[2]-4)<1e-10);
 assert.equal(rotated.position[1],3);
 assert.deepEqual(room.target,[2,3,4]);
});

/** Check night disables direct sunlight and applies caller-provided appearance to scene objects. */
test('night appearance',()=>{
 const lighting=lightingForTime('night',room);
 /** Capture vector and colour assignments without a WebGL renderer. */
 const capture=()=>({set(...value){this.value=value;}});
 const sun={position:capture(),target:{position:capture()},color:capture()};
 const ambient={color:capture()},fill={},scene={background:capture()},renderer={};
 const appearance={...lighting,ambient:.2,ambientColor:'#abc',sunColor:'#def',fill:.1,background:'#123',environment:.3,exposure:1.1};
 applyLighting(appearance,{sun,ambient,fill,scene,renderer});
 assert.equal(lighting.night,true);assert.equal(sun.intensity,0);
 assert.equal(ambient.intensity,.2);assert.deepEqual(ambient.color.value,['#abc']);
 assert.equal(fill.intensity,.1);assert.deepEqual(scene.background.value,['#123']);
 assert.equal(scene.environmentIntensity,.3);assert.equal(renderer.toneMappingExposure,1.1);
 assert.deepEqual(sun.target.position.value,room.target);
});

/** Check explicit reflection materials follow phase strength without altering their finish or unregistered materials. */
test('explicit reflection phase response',()=>{
 /** Make minimal light setters for phase application. */
 const setter=()=>({set(){}});
 const objects={sun:{position:setter(),target:{position:setter()},color:setter()},ambient:{color:setter()},fill:{},scene:{background:setter()},renderer:{}};
 const steel={envMapIntensity:.9,roughness:.28,metalness:1},canopy={...steel},other={...steel};
 for(const environment of [.45,.6,.2,.6]){
  applyLighting({...lightingForTime('noon',room),environment},{...objects,reflectionMaterials:[steel,canopy]});
  assert.equal(steel.envMapIntensity,environment);assert.equal(canopy.envMapIntensity,environment);
  assert.equal(steel.roughness,.28);assert.equal(steel.metalness,1);assert.equal(other.envMapIntensity,.9);
 }
});
