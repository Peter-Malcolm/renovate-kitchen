/** Check closed cabinet trim, kickboards and blind corners have no overlapping solid faces. */
export async function cabinetGeometry() {
  const {Box3} = await import('/assets/three.module.js');
  const m = window.kitchenModel;
  m.scene.updateMatrixWorld(true);
  const failures = [];
  let fronts = 0;
  /** Measure positive overlap along each world or local axis. */
  function overlap(a, b) {
    return ['x', 'y', 'z'].map(axis => Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]));
  }
  m.scene.traverse(object => {
    if (object.name !== 'Cabinet front') return;
    fronts++;
    const trim = object.children.filter(child => child.isMesh && child.geometry.type === 'BoxGeometry' && child.position.z > .001 && child.geometry.parameters.depth === .025);
    if (trim.length !== 4) failures.push({front: fronts, trimCount: trim.length});
    for (let i = 0; i < trim.length; i++) for (let j = i + 1; j < trim.length; j++) {
      trim[i].geometry.computeBoundingBox();
      trim[j].geometry.computeBoundingBox();
      const a = trim[i].geometry.boundingBox.clone().applyMatrix4(trim[i].matrix);
      const b = trim[j].geometry.boundingBox.clone().applyMatrix4(trim[j].matrix);
      if (overlap(a, b).every(size => size > 1e-7)) failures.push({front: fronts, trim: [i, j], overlap: overlap(a, b)});
    }
  });
  /** Return a required object's transformed bounds, failing if it disappeared. */
  function bounds(name) {
    const object = m.scene.getObjectByName(name);
    if (!object) throw Error('Missing scene object: ' + name);
    return new Box3().setFromObject(object);
  }
  // Full-height side panels must meet, but never intersect, the inset top/bottom panels.
  for (const name of ['Oven and microwave', 'Larder', 'Integrated fridge']) {
    const unit = m.scene.getObjectByName(name);
    const sides = unit.children.filter(child => child.name === 'Tall cabinet side');
    const panels = unit.children.filter(child => child.name === 'Tall cabinet horizontal panel');
    if (sides.length !== 2 || panels.length !== 2) failures.push({name, sides: sides.length, panels: panels.length});
    for (const side of sides) for (const panel of panels) {
      const sizes = overlap(new Box3().setFromObject(side), new Box3().setFromObject(panel));
      // These cabinets rotate 90 degrees: local width is world Z.
      if (Math.abs(sizes[2]) > 1e-7 || sizes[0] < .62 || sizes[1] < .017) failures.push({name, joint: sizes});
    }
  }
  // Check rotated wall carcasses meet their bottom boards without gaps or coplanar overlap.
  for (const name of ['Left wall cupboard, two doors', 'Wall cupboard beside extractor, two doors', 'Wall cupboard beside tower, one door']) {
    const unit = m.scene.getObjectByName(name);
    const bottom = unit.children.find(child => child.name === 'Cabinet bottom panel');
    if (!bottom) throw Error('Missing wall cabinet bottom: ' + name);
    const bottomBounds = new Box3().setFromObject(bottom);
    const sides = unit.children.filter(child => child.isMesh && child.geometry.parameters.width === .018);
    if (sides.length !== 2) failures.push({name, sideCount: sides.length});
    for (const side of sides) {
      const joint = overlap(bottomBounds, new Box3().setFromObject(side));
      if (Math.abs(joint[2]) > 1e-7 || joint[0] < .339 || joint[1] < .017) failures.push({name, undersideJoint: joint});
    }
    const stops = unit.getObjectByName('Stationary cabinet face stops');
    for (const stop of stops.children) {
      const joint = overlap(bottomBounds, new Box3().setFromObject(stop));
      if (Math.abs(joint[0]) > 1e-7) failures.push({name, stopGapOrOverlap: joint});
    }
    const rear = unit.children.find(child => child.isMesh && child.geometry.parameters.depth === .018);
    const rearJoint = overlap(bottomBounds, new Box3().setFromObject(rear));
    if (Math.abs(rearJoint[1]) > 1e-7) failures.push({name, rearGapOrOverlap: rearJoint});
  }
  const fridge = m.scene.getObjectByName('Integrated fridge');
  const fridgeTop = Math.max(...fridge.children.filter(child => child.name === 'Tall cabinet side').map(child => new Box3().setFromObject(child).max.y));
  const crown = m.scene.getObjectByName('Profiled cornice and concealed duct enclosure').children.find(group => group.children.some(child => child.name === 'Recessed cornice cavity floor' && child.geometry.parameters.width > .5));
  for (const part of crown.children) {
    const bottom = new Box3().setFromObject(part).min.y;
    if (Math.abs(bottom-fridgeTop)>1e-6) failures.push({name:'Tall crown / fridge top',gap:bottom-fridgeTop});
  }
  const rear = bounds('Rear continuous kickboard');
  for (const name of ['Left continuous kickboard', 'Right continuous kickboard including tall units']) {
    const side = bounds(name);
    const sizes = overlap(rear, side);
    if (sizes.every(size => size > 1e-7)) failures.push({name, overlap: sizes});
    const gap = name.startsWith('Left') ? rear.min.x - side.max.x : side.min.x - rear.max.x;
    if (gap > .001) failures.push({name, gap});
  }
  const corners = [];
  m.scene.traverse(object => { if (object.name === 'Closed blind corner cabinet') corners.push(object); });
  const right = corners.find(object => object.getWorldPosition(m.camera.position.clone()).x > 0);
  if (!right) throw Error('Missing right blind corner');
  const corner = new Box3().setFromObject(right);
  const run = new Box3().setFromObject(m.hobBaseRun);
  if (overlap(corner, run).every(size => size > 1e-7)) failures.push({name: 'Right blind corner / hob run', overlap: overlap(corner, run)});
  return {fronts, corners: corners.length, failures};
}
