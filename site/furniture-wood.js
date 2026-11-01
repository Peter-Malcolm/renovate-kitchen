// Oak image fibres run along V. One tile represents 25 cm across / 50 cm along grain.
/** Map furniture grain in physical metres along each board, turned part or bent rail. */
export function furnitureWoodUV(mesh, grain = 'x') {
  const geometry = mesh.geometry, position = geometry.attributes.position, normal = geometry.attributes.normal, uv = geometry.attributes.uv;
  const p = geometry.parameters;
  // Custom chair back rails store successive cross-sections at a common U value.
  const railLengths = [];
  if (geometry.type === 'BufferGeometry') {
    let stride = 1;
    while (stride < uv.count && uv.getX(stride) === uv.getX(0)) stride++;
    let distance = 0, previous;
    for (let start = 0; start < uv.count; start += stride) {
      const center = [0, 0, 0];
      for (let j = start; j < start + stride; j++) for (let axis = 0; axis < 3; axis++) center[axis] += position.getComponent(j, axis) / stride;
      if (previous) distance += Math.hypot(...center.map((value, axis) => value - previous[axis]));
      for (let j = start; j < start + stride; j++) railLengths[j] = [position.getY(j) - center[1], distance];
      previous = center;
    }
  }
  for (let i = 0; i < uv.count; i++) {
    let across, along;
    if (railLengths.length) {
      [across, along] = railLengths[i];
    } else if (geometry.type === 'CylinderGeometry') {
      // Longitudinal grain follows the turned component, including tilted chair spindles.
      across = uv.getX(i) * Math.PI * (p.radiusTop + p.radiusBottom);
      along = position.getY(i);
      if (Math.abs(normal.getY(i)) > .99) { across = position.getX(i); along = position.getZ(i); }
    } else if (geometry.type === 'TubeGeometry') {
      // Bentwood grain follows the curve; it does not wrap around the tube.
      across = uv.getY(i) * Math.PI * 2 * p.radius;
      along = uv.getX(i) * p.path.getLength();
    } else {
      const axis = grain === 'x' ? 0 : grain === 'y' ? 1 : 2;
      const coords = [position.getX(i), position.getY(i), position.getZ(i)];
      const normals = [normal.getX(i), normal.getY(i), normal.getZ(i)];
      const others = [0, 1, 2].filter(value => value !== axis);
      along = coords[axis];
      across = coords[Math.abs(normals[others[0]]) > Math.abs(normals[others[1]]) ? others[1] : others[0]];
    }
    uv.setXY(i, across / .25, along / .5);
  }
  uv.needsUpdate = true;
  mesh.userData.woodGrain = grain;
  return mesh;
}
