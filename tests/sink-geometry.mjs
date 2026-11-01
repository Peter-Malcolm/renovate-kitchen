/** Check measured sink/tap dimensions survive room scaling and both jets land inside their bowls. */
export async function sinkGeometry(){
 const {Vector3,Box3}=await import('./assets/three.module.js');
 const m=window.kitchenModel,failures=[],{sink,tapAssembly,bowls}=m;
 /** Record a dimensional mismatch with a millimetre-scale tolerance. */
 function near(name,actual,expected,tolerance=.001){if(Math.abs(actual-expected)>tolerance)failures.push({name,actual,expected});}
 m.scene.updateMatrixWorld(true);
 const origin=sink.getWorldPosition(new Vector3()),mount=tapAssembly.getWorldPosition(new Vector3());
 near('Tap hole from left edge',mount.x-origin.x+.5,.471);
 near('Tap hole from rear edge',mount.z-origin.z+.25,.077);
 const rim=sink.children.find(part=>part.geometry?.type==='ExtrudeGeometry'),rimBounds=new Box3().setFromObject(rim),rimSize=rimBounds.getSize(new Vector3());
 near('Sink overall width',rimSize.x,1);near('Sink overall depth',rimSize.z,.5);
 near('Main bowl depth',new Box3().setFromObject(sink.getObjectByName('Large left bowl')).getSize(new Vector3()).y,.222);
 const collar=tapAssembly.getObjectByName('Tap mounting collar'),collarSize=new Box3().setFromObject(collar).getSize(new Vector3());
 near('Tap overall height',new Box3().setFromObject(tapAssembly).max.y-mount.y,.360,.002);
 near('Tap base width',collarSize.x,.051);near('Tap base depth',collarSize.z,.051);
 for(const bowl of bowls){
  const visual=m.bowlVisuals[bowl.id],size=new Box3().setFromObject(visual.waste).getSize(new Vector3());
  near(bowl.id+' circular waste flange',size.x,size.z,.0001);near(bowl.id+' nominal waste width',size.x,.090,.0001);
  const wasteCentre=visual.waste.getWorldPosition(new Vector3());near(bowl.id+' waste depth axis',wasteCentre.z-origin.z,0,.0001);
  if(bowl.id==='main')near('Main waste from left edge',wasteCentre.x-origin.x+.5,.275,.0001);
  const plugBefore=visual.plug.position.clone(),other=bowls.find(item=>item.id!==bowl.id).id,otherState=m.sinkWater.bowls[other].plugged;
  m.togglePlug(bowl.id);near(bowl.id+' seated plug',visual.plug.position.distanceTo(plugBefore),0,.000001);
  if(m.sinkWater.bowls[other].plugged!==otherState)failures.push({name:'Independent plug states'});
  m.togglePlug(bowl.id);
 }
 const previous=m.sinkWater.target;
 for(const bowl of bowls){
  m.sinkWater.target=bowl.id;m.syncWater();m.scene.updateMatrixWorld(true);
  const outlet=m.spout.localToWorld(new Vector3(0,.214,.215));
  near(bowl.id+' spout reach',Math.hypot(outlet.x-mount.x,outlet.z-mount.z),.215,.0001);
  near(bowl.id+' outlet height',outlet.y-mount.y,.214,.0001);
  const local=sink.worldToLocal(outlet.clone());
  if(Math.abs(local.x-bowl.x)>(bowl.w-.084)/2 || Math.abs(local.z-bowl.z)>(bowl.d-.084)/2)failures.push({name:bowl.id+' jet misses bowl floor',local:local.toArray()});
 }
 m.sinkWater.target=previous;m.syncWater();
 return {failures};
}
