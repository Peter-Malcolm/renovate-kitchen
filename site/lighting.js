// Shared representative day phases; room bearings and light strengths belong to callers.
export const timeOptions = [
  {id:'morning',name:'Morning',color:'#f2dcc1'},
  {id:'noon',name:'Noon',color:'#e3e9e5'},
  {id:'night',name:'Night',color:'#343e4a'},
];

/** Resolve saved legacy day values and unknown phases to noon. */
export function normalizeTime(time){
  return timeOptions.some(option=>option.id===time)?time:'noon';
}

/** Return a phase's clock setting independently of room geometry. */
export function clockMinutesForTime(time){
  return {morning:450,noon:720,night:1260}[normalizeTime(time)];
}

/** Resolve room-specific sun geometry and appearance for a common day phase. */
export function lightingForTime(time,room){
  const phase=normalizeTime(time);
  const preset=room.presets[phase];
  const relative=(preset.azimuth-room.bearing)*Math.PI/180;
  const altitude=preset.elevation*Math.PI/180;
  const [x,y,z]=room.target;
  return {...preset,phase,night:phase==='night',target:[x,y,z],position:[
    x+Math.sin(relative)*Math.cos(altitude)*room.distance,
    y+Math.sin(altitude)*room.distance,
    z-Math.cos(relative)*Math.cos(altitude)*room.distance,
  ]};
}

/** Apply a resolved phase to a room's common Three.js lighting objects. */
export function applyLighting(lighting,{sun,ambient,fill,scene,renderer,reflectionMaterials=[]}){
  sun.position.set(...lighting.position);
  sun.target.position.set(...lighting.target);
  sun.intensity=lighting.sun;
  sun.color.set(lighting.sunColor);
  ambient.intensity=lighting.ambient;
  ambient.color.set(lighting.ambientColor);
  fill.intensity=lighting.fill;
  scene.background.set(lighting.background);
  scene.environmentIntensity=lighting.environment;
  // Explicit material maps do not inherit Three.js scene environment intensity.
  for(const material of reflectionMaterials)material.envMapIntensity=lighting.environment;
  renderer.toneMappingExposure=lighting.exposure;
}

/** Build a shared approximate room reflection field, not a measured room capture. */
export function createRoomReflectionEnvironment({THREE,texture}){
 const environment=texture((context,width,height)=>{
  const backdrop=context.createLinearGradient(0,0,0,height);
  backdrop.addColorStop(0,'#e7e5df');backdrop.addColorStop(.30,'#b0b3b0');
  backdrop.addColorStop(.49,'#252a2c');backdrop.addColorStop(.65,'#696b66');backdrop.addColorStop(1,'#80786b');
  context.fillStyle=backdrop;context.fillRect(0,0,width,height);
  // Equirectangular u=.5 faces +X; rear window (-Z) lies at u=.25.
  context.fillStyle='#f8f7ee';context.fillRect(width*.18,height*.27,width*.14,height*.38);
  context.fillStyle='#cdd7df';context.fillRect(width*.67,height*.24,width*.07,height*.38);
  // Pale opposite wall crosses the longitude seam, with a dark doorway beside it.
  const wall=context.createLinearGradient(0,0,0,height);
  wall.addColorStop(0,'#eeeeea');wall.addColorStop(.37,'#fafbf8');wall.addColorStop(.43,'#ffffff');
  wall.addColorStop(.49,'#4b5554');wall.addColorStop(.55,'#bdc4c1');wall.addColorStop(.64,'#f2f0e9');wall.addColorStop(1,'#77716a');
  context.fillStyle=wall;context.fillRect(0,height*.2,width*.10,height*.64);context.fillRect(width*.92,height*.2,width*.08,height*.64);
 },1024,512);
 environment.mapping=THREE.EquirectangularReflectionMapping;
 return environment;
}
