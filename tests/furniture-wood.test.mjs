import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../site/assets/three.module.js';
import {furnitureWoodUV} from '../site/furniture-wood.js';

/** Measure UV changes between vertices sharing the other two physical coordinates. */
function slope(geometry, axis, uvAxis) {
  const p=geometry.attributes.position,u=geometry.attributes.uv;
  for(let i=0;i<p.count;i++)for(let j=i+1;j<p.count;j++){
    if([0,1,2].some(a=>a!==axis&&Math.abs(p.getComponent(i,a)-p.getComponent(j,a))>1e-6))continue;
    const distance=p.getComponent(j,axis)-p.getComponent(i,axis);
    if(Math.abs(distance)>.01)return (u.getComponent(j,uvAxis)-u.getComponent(i,uvAxis))/distance;
  }
  throw Error('No measurable vertex pair');
}

/** Check different board dimensions retain the same physical grain scale and direction. */
test('boards use metres and follow their specified construction axis',()=>{
 for(const length of [1.8,2.4]){
  const geo=new THREE.BoxGeometry(length,.055,.9);
  furnitureWoodUV(new THREE.Mesh(geo),'x');
  assert.ok(Math.abs(slope(geo,0,1)-2)<1e-5);
 }
 const shape=new THREE.Shape().moveTo(-.2,-.2).lineTo(.2,-.2).lineTo(.2,.2).lineTo(-.2,.2).closePath();
 const seat=new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false});
 furnitureWoodUV(new THREE.Mesh(seat),'y');
 assert.ok(Math.abs(slope(seat,1,1)-2)<1e-5,'Chair seat grain follows its fore/aft local Y axis');
});

/** Check round parts have grain along their length with physical circumference scale. */
test('turned and bent parts follow their actual lengths',()=>{
 for(const length of [.2,.7]){
  const geo=new THREE.CylinderGeometry(.02,.02,length,12);
  furnitureWoodUV(new THREE.Mesh(geo),'x');
  const uv=geo.attributes.uv;
  assert.ok(Math.abs(uv.getY(0)-uv.getY(13)-length/.5)<1e-6);
  assert.ok(Math.abs(uv.getX(12)-uv.getX(0)-2*Math.PI*.02/.25)<1e-6);
 }
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.2,0,0),new THREE.Vector3(0,.3,0),new THREE.Vector3(.2,0,0)]);
 const geo=new THREE.TubeGeometry(curve,16,.016,10,false);
 furnitureWoodUV(new THREE.Mesh(geo));
 assert.ok(Math.abs(geo.attributes.uv.getY(16*11)-curve.getLength()/.5)<1e-6);
 assert.ok(Math.abs(geo.attributes.uv.getX(10)-2*Math.PI*.016/.25)<1e-6);
});

/** Check furniture materials preserve the physical UV scale and allow wrapping. */
test('furniture mapping is integrated with neutral material repeats',async()=>{
 const dining=await readFile(new URL('../site/dining.js',import.meta.url),'utf8');
 const surfaces=await readFile(new URL('../site/surfaces.js',import.meta.url),'utf8');
 assert.match(dining,/tableWood.repeat.set\(1,1\)/);
 assert.match(surfaces,/oak.wrapS=oak.wrapT=THREE.RepeatWrapping/);
});
