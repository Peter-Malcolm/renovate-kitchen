import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../site/assets/three.module.js';
import {createBrushedStainless,cloneBrushedStainless} from '../site/stainless.js';

/** Check cloned steel keeps shared reflection resources and brushing while finish parameters remain independent. */
test('reusable stainless ownership',()=>{
 const environment=new THREE.Texture();
 const steel=createBrushedStainless({THREE,environment});
 const canopy=cloneBrushedStainless(steel);
 assert.equal(canopy.envMap,environment);
 assert.equal(canopy.onBeforeCompile,steel.onBeforeCompile);
 assert.equal(canopy.customProgramCacheKey(),steel.customProgramCacheKey());
 canopy.roughness=.4;canopy.color.set('#ffffff');
 assert.equal(steel.roughness,.22);assert.notEqual(canopy.color.getHex(),steel.color.getHex());
 assert.equal(steel.metalness,1);assert.equal(steel.emissive.getHex(),0);
 assert.equal(steel.roughnessMap,null);assert.equal(steel.bumpMap,null);
 canopy.dispose();assert.equal(steel.envMap,environment);
});
