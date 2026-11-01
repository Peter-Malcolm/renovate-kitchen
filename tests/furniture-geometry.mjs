/** Check live table and chair UVs retain physical scale, grain direction and repeat wrapping. */
export function furnitureGeometry() {
 const m=kitchenModel,failures=[];
 /** Compare a mesh's actual local vertex displacement with its sampled material UV displacement. */
 function check(mesh,axis,label){
  const p=mesh.geometry.attributes.position,u=mesh.geometry.attributes.uv,map=mesh.material.map;
  if(map.wrapS!==1000||map.wrapT!==1000)failures.push(label+' clamps wood texture');
  for(let i=0;i<p.count;i++)for(let j=i+1;j<p.count;j++){
   if(Math.abs(p.getZ(i)-p.getZ(j))>1e-6)continue;
   const distance=p.getComponent(j,axis)-p.getComponent(i,axis);
   if(Math.abs(distance)<.01)continue;
   if(Math.abs((u.getY(j)-u.getY(i))*map.repeat.y/distance-2)>1e-4)failures.push(label+' grain scale/orientation');
   return;
  }
  failures.push(label+' has no measurable grain span');
 }
 for(const style of ['current','soft','oval','scandi'])for(const extended of [false,true]){
  m.dining.setTable(style,extended);
  const group=m.scene.getObjectByName(style==='current'?'Existing 180 cm table':'Extending oak table concept');
  const top=style==='current'?group.children[0]:group.getObjectByName('Oak tabletop');
  check(top,0,style+' tabletop '+extended);
 }
 for(const name of ['Habitat Nel natural oak chairs','Peppermill solid oak Scandi chairs']){
  const chair=m.scene.getObjectByName(name).children[0];
  check(chair.children.find(part=>part.geometry?.type==='ExtrudeGeometry'),1,name+' seat');
  check(chair.children.find(part=>part.geometry?.type==='CylinderGeometry'),1,name+' leg');
 }
 m.dining.setTable(m.state.table,m.state.tableExtended);
 return {failures};
}
