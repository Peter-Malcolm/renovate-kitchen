/** Check actual cabinet and drawer grips stop before a parked neighboring grip and can reverse. */
export async function handleClearance() {
 const {clearHandleTravel}=await import('/handle-clearance.js');
 const m=window.kitchenModel,results=[];
 for(const id of ['cupboard-1','drawer-3']){
  const source=m.kitchenDoors.get(id),pivot=source.pivot.clone(true),parent=source.pivot.parent;
  parent.add(pivot);
  const moving={...source,pivot,progress:0,handles:null};
  /** Apply the real cabinet's hinged or drawer motion to isolated test fronts. */
  function pose(door,progress){
   if(door.type==='pullout')door.pivot.position.z=door.baseZ+progress*door.travel;
   else door.pivot.rotation.y=progress*Math.PI*.52*(door.side||1);
  }
  // Park an identical real grip at 40% of the moving grip's sweep.
  // The kitchen's present installed spacing has no handle contacts, so this fixture
  // deliberately exercises a neighboring obstruction without changing the room layout.
  pose(moving,.4);const parked={pivot:pivot.clone(true),progress:.4};parent.add(parked.pivot);pose(moving,0);
  const doors=new Map([['moving',moving],['parked',parked]]);
  const stopped=clearHandleTravel(moving,doors,1,pose);moving.progress=stopped;
  const closed=clearHandleTravel(moving,doors,0,pose);moving.progress=closed;
  parked.pivot.position.y+=3;
  const released=clearHandleTravel(moving,doors,1,pose);
  results.push({id,stopped,closed,released});parent.remove(pivot,parked.pivot);
 }
 return results;
}
