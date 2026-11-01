import {Box3, Vector3} from './assets/three.module.js';

/** Build a world-oriented box from the actual handle mesh's local bounds. */
function bounds(mesh) {
 mesh.geometry.computeBoundingBox();
 const box=mesh.geometry.boundingBox, centre=box.getCenter(new Vector3()).applyMatrix4(mesh.matrixWorld);
 const size=box.getSize(new Vector3()).multiplyScalar(.5), e=mesh.matrixWorld.elements;
 const axes=[new Vector3(e[0],e[1],e[2]),new Vector3(e[4],e[5],e[6]),new Vector3(e[8],e[9],e[10])];
 const half=axes.map((axis,i)=>axis.length()*size.getComponent(i));axes.forEach(axis=>axis.normalize());
 return {centre,axes,half,aabb:box.clone().applyMatrix4(mesh.matrixWorld)};
}
/** Test separating axes, retaining the handle's orientation instead of an inflated world box. */
function touches(a,b) {
 if(!a.aabb.intersectsBox(b.aabb))return false;
 const delta=b.centre.clone().sub(a.centre),axes=[...a.axes,...b.axes];
 for(const x of a.axes)for(const y of b.axes)axes.push(x.clone().cross(y));
 return axes.every(axis=>axis.lengthSq()<1e-12||Math.abs(delta.dot(axis))<=a.axes.reduce((sum,x,i)=>sum+Math.abs(x.dot(axis))*a.half[i],0)+b.axes.reduce((sum,x,i)=>sum+Math.abs(x.dot(axis))*b.half[i],0));
}
/** Find only grip geometry carried by a given moving front; its own panels are excluded. */
function handles(door) {
 if(!door.handles){door.handles=[];door.pivot.traverse(mesh=>{if(mesh.userData.cabinetHandle)door.handles.push(mesh);});}
 return door.handles;
}
/** Stop at the first contact along the requested travel, including when closing. */
export function clearHandleTravel(door, doors, target, pose) {
 const start=door.progress||0, moving=handles(door);
 if(!moving.length||target===start)return target;
 const others=[];
 for(const other of doors.values())if(other!==door){other.pivot.updateWorldMatrix(true,true);for(const mesh of handles(other))others.push(bounds(mesh));}
 /** Recompute this front's actual transformed handles at a trial position. */
 function blocked(progress) {
  pose(door,progress);door.pivot.updateWorldMatrix(true,true);
  return moving.some(mesh=>{const box=bounds(mesh);return others.some(other=>touches(box,other));});
 }
 // At most 0.1% of travel per sample (under 2 mm for the longest hinged front).
 // This is smaller than the narrowest handle body, so a frame cannot jump through it.
 const count=Math.ceil(Math.abs(target-start)/.001);let safe=start;
 for(let step=1;step<=count;step++){
  const next=start+(target-start)*step/count;
  if(blocked(next)){
   let hit=next;
   for(let i=0;i<16;i++){const mid=(safe+hit)/2;if(blocked(mid))hit=mid;else safe=mid;}
   pose(door,safe);return safe;
  }
  safe=next;
 }
 pose(door,target);return target;
}
