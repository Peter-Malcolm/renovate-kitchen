// Reusable brushed stainless. The caller supplies the shared lighting environment.
/** Create stainless with world-scale brushing, independent of component UV layout. */
export function createBrushedStainless({THREE,environment,roughness=.22}){
 const material=new THREE.MeshStandardMaterial({color:'#dce0df',roughness,metalness:1,envMap:environment,envMapIntensity:.6});
 // Fine horizontal brushing in world metres also covers un-UV-mapped canopy triangles.
 // Derivative attenuation avoids shimmer when a grain period becomes subpixel.
 material.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 steelWorldPosition;');
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nsteelWorldPosition=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 steelWorldPosition;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   float brushCoordinate=steelWorldPosition.y*12566.3706; // 0.5 mm pitch.
   float brushVisibility=1.0-smoothstep(0.6,3.0,fwidth(brushCoordinate));
   roughnessFactor+=0.025*sin(brushCoordinate)*brushVisibility;`);
 };
 material.customProgramCacheKey=()=> 'world-brushed-stainless-v1';
 return material;
}

/** Clone a stainless finish while preserving its world-scale shader and shared resources. */
export function cloneBrushedStainless(material){
 const clone=material.clone();
 clone.onBeforeCompile=material.onBeforeCompile;
 clone.customProgramCacheKey=material.customProgramCacheKey;
 return clone;
}
