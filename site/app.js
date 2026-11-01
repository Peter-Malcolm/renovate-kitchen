import {clearHandleTravel} from './handle-clearance.js?v=20261101-release42';
import {createTurnMotion,bindTurnControls} from './turning.js?v=20261101-release42';
import {createFloodVisual} from './flood-visual.js?v=20261101-release42';
import {createFloodMap, floodCoverage} from './flood.js?v=20261101-release42';
import {timeOptions,clockMinutesForTime,lightingForTime,applyLighting,createRoomReflectionEnvironment} from './lighting.js?v=20261101-release42';
import * as THREE from 'three';
import {OrbitControls} from './assets/OrbitControls.js';
import {addDining} from './dining.js?v=20261101-release42';
import {dimensions} from './dimensions.js?v=20261101-release42';
import {createSurfaces} from './surfaces.js?v=20261101-release42';
import {createBrushedStainless,cloneBrushedStainless} from './stainless.js?v=20261101-release42';
import {createWaterState, stepWater, mopSpill, waterDefaults} from './water.js?v=20261101-release42';
import {countertopView,createWalkthrough} from './viewpoints.js?v=20261101-release42';


await window.kitchenStartup?.stage('Building the room…');

// Estimated orientation and representative seasonal lighting remain room-specific.
const roomLighting={bearing:105,target:[0,1,1.4],distance:10,presets:{
 morning:{azimuth:115,elevation:20,ambient:.75,ambientColor:'#f4dfc5',sun:2.4,sunColor:'#ffe0b1',fill:.28,background:'#e8dccb',environment:.45,exposure:1.08},
 noon:{azimuth:180,elevation:36.6,ambient:1.05,ambientColor:'#e9f1ff',sun:2.9,sunColor:'#fff7e8',fill:.42,background:'#e3e8eb',environment:.6,exposure:1.08},
 night:{azimuth:180,elevation:36.6,ambient:.27,ambientColor:'#e9f1ff',sun:0,sunColor:'#fff7e8',fill:.12,background:'#202b38',environment:.2,exposure:1.04},
}};

const options = {
  wallView:[{id:'auto',name:'Automatic cutaway',color:'#9fae9d'},{id:'show',name:'Show walls',color:'#c9bfae'},{id:'hide',name:'Hide walls',color:'#e8e5d9'}],
  exterior:[{id:'brick',name:'Muted red brick',color:'#a36954'},{id:'plain',name:'Plain exterior',color:'#c9bfae'}],
  table:[{id:'current',name:'Current table',color:'#b68c53'},{id:'soft',name:'Soft rectangular oak',color:'#c4a572'},{id:'oval',name:'Oval oak',color:'#c4a572'},{id:'scandi',name:'Rounded Scandi oak',color:'#c4a572'}],
  grout: [{id:'current',name:'Current mid grey',color:'#858581'},{id:'white',name:'White',color:'#eeede7'},{id:'silver',name:'Warm light grey',color:'#c3c1b9'}],
  paint: [{id:'stone',name:'Soft warm stone',color:'#d2cbbb'},{id:'chalk',name:'Chalky off-white',color:'#e9e6dc'},{id:'sage',name:'Existing pale sage',color:'#b8c0ad'}],
  upstand: [{id:'white',name:'Worktop white',color:'#eeeee7'},{id:'none',name:'No upstand',color:'#f8f7ef'}],
  tiles: ['zero','one','two','three','four'].map((id,n)=>({id,name:n===0?'No tiles':n+' full courses',color:'#f4f3ee'})),
  time: timeOptions,
  chairs: [{id:'peppermill',name:'Scandi oak concept',color:'#b7936c'},{id:'leather',name:'Leather chair concept · Maple leather',color:'#895330'},{id:'swyft-shadow',name:'Leather chair concept · Shadow fabric',color:'#555754'},{id:'nel',name:'Habitat Nel · oak',color:'#c8a574'},{id:'current',name:'Existing chairs',color:'#797a73'}],
  socket: [{id:'steel',name:'Brushed stainless',color:'#aeb3b5'},{id:'chrome',name:'Polished chrome',color:'#d3d9dc'},{id:'white',name:'Existing white',color:'#f1f0eb'}],
  clock: [{id:'current',name:'Existing black rim',color:'#252b29'},{id:'steel',name:'Brushed stainless rim',color:'#b8bdbf'}],
  art: [{id:'current',name:'2 prints',color:'#536d64'},{id:'three',name:'3 prints',color:'#3c645c'}],
  radiator: [{id:'panel',name:'Existing panel',color:'#eeeae1'},{id:'tubular',name:'White tubular',color:'#f4f1e8'}],
  shoeRack: [{id:'current',name:'Current metal rack',color:'#eeeae1'},{id:'oak',name:'Oak slatted rack',color:'#ba925d'},{id:'painted',name:'Painted rack · oak top',color:'#82847c'}],
  rugSize: [{id:'s',name:'S · 50 × 120 cm',width:.5,length:1.2},{id:'m',name:'M · 60 × 160 cm',width:.6,length:1.6},{id:'l',name:'L · 70 × 200 cm',width:.7,length:2}],
  rug: [{id:'none',name:'No runner',class:'none'},{id:'sage',name:'Faded sage Persian',class:'sage'},{id:'stone',name:'Stone Persian',class:'stone'},{id:'taupe',name:'Muted taupe Persian',class:'taupe'},{id:'blue',name:'Dusty blue floral',class:'blue'},{id:'karajeh',name:'Faded red medallions',class:'karajeh'},{id:'olive',name:'Olive garden lattice',class:'olive'},{id:'sand',name:'Sand & ink Persian',class:'sand'}]
};
const existingChoices={paint:'sage',chairs:'current',socket:'white',grout:'current',upstand:'white',radiator:'panel',rug:'none'};
for(const [kind,id] of Object.entries(existingChoices))options[kind].sort((a,b)=>Number(b.id===id)-Number(a.id===id));
const defaults = {wallView:'auto',exterior:'brick',table:'soft',tableExtended:false,grout:'current',paint:'stone',upstand:'white',rug:'none',socket:'steel',chairs:'nel',radiator:'panel',art:'current',tiles:'zero',shoeRack:'current',rugSize:'m',clock:'current',clockMinutes:795,time:'noon',rugLength:1.6,rugWidth:.6,lighting:true,cabinetLight:true,hoodLight:true,ceilingLight:true};
let state = {...defaults};
const rugSources={};
const descriptions = {
 none:'Bare pine keeps the aisle visually open. ',
 sage:'Faded sage and ivory, with a quiet Persian medallion. A size and colour concept, not an exact retail product.',
 stone:'Soft stone and oatmeal with a subtle Persian border. A size and colour concept, not an exact retail product.',
 taupe:'Muted taupe and parchment in a faded Persian pattern. A size and colour concept, not an exact retail product.',
 blue:'Dusty blue floral vines with an ivory border. Inspired by vintage Persian runners; an illustrative design, not an exact retail product.',
 karajeh:'Faded red with stepped geometric medallions and small tribal motifs. A Karajeh-inspired design concept.',
 olive:'Soft olive with a repeating floral lattice and a parchment border. An illustrative Persian garden design.',
 sand:'Warm sand with fine charcoal vines and a single elongated medallion. An illustrative Persian design.'
};
const canvas=document.querySelector('#scene');
let renderer;
try {renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});} catch {document.querySelector('#error').style.display='block';throw new Error('WebGL unavailable');}
// Treat shader failures as startup errors instead of revealing an unusable canvas.
renderer.debug.onShaderError=()=>{renderer.setAnimationLoop(null);throw new Error('The room shaders could not compile');};
canvas.addEventListener('webglcontextlost',()=>window.kitchenStartup?.fail());
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene();scene.background=new THREE.Color('#e7e7df');
const camera=new THREE.PerspectiveCamera(58,1,.025,40);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.dampingFactor=.1;controls.minDistance=.25;controls.maxDistance=14;controls.maxPolarAngle=Math.PI*.49;controls.target.set(0,1.05,-.65);
const ambient=new THREE.HemisphereLight('#fffdf1','#777c68',1.35);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff9ed',3.2);sun.position.set(-1,5,-3);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-4;sun.shadow.camera.right=4;sun.shadow.camera.top=4;sun.shadow.camera.bottom=-4;sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;sun.shadow.radius=3;sun.shadow.camera.far=18;sun.target.position.set(0,0,1.4);scene.add(sun.target);scene.add(sun);
const fill=new THREE.DirectionalLight('#e7efff',.65);fill.position.set(0,3,5);scene.add(fill);
const room=new THREE.Group();scene.add(room);
const material=(color,roughness=.7,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const paint=material('#d2cbbb'),sage=material('#7e8f82'),sageInset=material('#77887b'),white=material('#f2f1e9',.28),silver=material('#a5acaf',.25,.8),dark=material('#252b29',.55),oak=material('#b78d54'),grout=material('#858581'),upstandMat=material('#eeeee7',.3);
function box(w,h,d,x,y,z,mat,parent=room){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function cylinder(r,h,x,y,z,mat,parent=room){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,24),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function texture(draw,w=512,h=1024){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
const surfaces=createSurfaces({texture,seeded});
const cabinetWood=new THREE.MeshStandardMaterial({name:'Pale wood cupboard lining',color:'#e4cda5',roughness:.65,map:surfaces.grain,bumpMap:surfaces.relief(surfaces.grain),bumpScale:.00045});
const ceilingMat=new THREE.MeshStandardMaterial({color:'#f4f2eb',roughness:.96,bumpMap:surfaces.relief(surfaces.plaster),bumpScale:.00025});
const kitchenCeiling=box(3.18,.04,3.95,0,2.62,-.125,ceilingMat);kitchenCeiling.name='Offshot plaster ceiling';kitchenCeiling.castShadow=true;
const diningCeiling=box(dimensions.diningWidth+.44,.04,dimensions.diningLength+.12,-.41,2.62,dimensions.kitchenLength/2+dimensions.diningLength/2,ceilingMat,scene);diningCeiling.name='Dining plaster ceiling';diningCeiling.castShadow=true;
const wood=surfaces.pine;wood.repeat.set(2.82/(dimensions.boardWidth*10),1);wood.offset.x=-1.41/(dimensions.boardWidth*10);
scene.environment=surfaces.environment;scene.environmentIntensity=.65;
for(const mat of [sage,sageInset]){mat.map=surfaces.grain;mat.bumpMap=surfaces.relief(surfaces.grain);mat.bumpScale=.00065;mat.roughness=.57;}
paint.bumpMap=surfaces.relief(surfaces.plaster);paint.bumpScale=.0006;paint.roughness=.93;
oak.map=surfaces.oak;oak.color.set('#ffffff');oak.bumpMap=surfaces.relief(surfaces.oak);oak.bumpScale=.0012;oak.roughness=.48;
// Static procedural softboxes add reflection contrast without room captures or image assets.
const metalEnvironment=texture((context,width,height)=>{
 const backdrop=context.createLinearGradient(0,0,0,height);backdrop.addColorStop(0,'#848d96');backdrop.addColorStop(.48,'#333a43');backdrop.addColorStop(1,'#77736d');context.fillStyle=backdrop;context.fillRect(0,0,width,height);
 context.fillStyle='#fffaf0';context.fillRect(width*.12,height*.16,width*.16,height*.49);
 context.fillStyle='#e4efff';context.fillRect(width*.65,height*.12,width*.07,height*.63);
 context.fillStyle='#e7e5df';context.fillRect(0,height*.08,width,height*.045);
},512,256);metalEnvironment.mapping=THREE.EquirectangularReflectionMapping;
silver.color.set('#c3c8ca');silver.roughnessMap=surfaces.relief(surfaces.metal);silver.roughness=.34;silver.metalness=.9;silver.envMapIntensity=.9;silver.envMap=metalEnvironment;silver.bumpMap=surfaces.relief(surfaces.metal);silver.bumpScale=.00012;
const socketMat=silver.clone();
grout.bumpMap=surfaces.relief(surfaces.plaster);grout.bumpScale=.0007;
white.roughness=.22;
const tileGlaze=new THREE.MeshPhysicalMaterial({color:'#faf9f6',roughness:.23,metalness:0,clearcoat:.4,clearcoatRoughness:.18,envMapIntensity:.45});
upstandMat.map=surfaces.stone;upstandMat.roughness=.27;upstandMat.envMapIntensity=.65;
const floor=box(2.82,.075,3.85,0,-.04,0,new THREE.MeshPhysicalMaterial({map:wood,bumpMap:surfaces.relief(wood),bumpScale:.00035,roughness:.48,clearcoat:.32,clearcoatRoughness:.3,envMapIntensity:.65}));
const rearWall=new THREE.Group();rearWall.name='Continuous rear wall around sink window';room.add(rearWall);
for(const [w,h,x,y] of [[3.18,.965,0,.4825],[3.18,.345,0,2.4275],[.92,1.29,-1.13,1.61],[.78,1.29,1.20,1.61]])box(w,h,.22,x,y,-1.97,paint,rearWall);
box(.08,.97,3.8,-1.24,.485,0,paint);box(.08,.5,3.8,-1.24,2.35,0,paint);box(.08,1.14,2.25,-1.24,1.54,.775,paint);box(.08,1.14,.58,-1.24,1.54,-1.59,paint);
const rightWall=box(.08,2.6,3.8,1.24,1.3,0,paint);
const glass=new THREE.MeshPhysicalMaterial({color:'#eef5f3',roughness:.06,metalness:0,transmission:.85,thickness:.008,ior:1.45,transparent:true,opacity:.4,side:THREE.DoubleSide});
const blinds=new Map();
const blindFabric=new THREE.MeshStandardMaterial({color:'#e5ddcd',roughness:.96,bumpMap:surfaces.relief(surfaces.weave),bumpScale:.00025});
function rollerBlind(parent,id,w,drop,x,y,z){
 const g=new THREE.Group();g.name=id+' roller blind';g.userData.blind=id;g.position.set(x,y,z);parent.add(g);
 const roll=cylinder(.025,w,0,.025,0,blindFabric,g);roll.rotation.z=Math.PI/2;
 for(const side of [-1,1])box(.023,.072,.065,side*(w/2+.012),.02,-.015,white,g);
 const cloth=box(w,1,.006,0,-.1,.003,blindFabric,g);
 const hem=box(w,.011,.015,0,-.2,.004,blindFabric,g);
 const points=[];for(let i=0;i<=48;i++){const a=i*Math.PI/24;points.push(new THREE.Vector3(w/2+.03+.014*Math.sin(a),-.245+.24*Math.cos(a),.025));}
 const chain=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.0012,5,false),white);g.add(chain);
 for(let i=0;i<48;i++){const a=i*Math.PI/24,bead=new THREE.Mesh(new THREE.SphereGeometry(.002,6,4),white);bead.position.set(w/2+.03+.014*Math.sin(a),-.245+.24*Math.cos(a),.025);g.add(bead);}
 const blind={cloth,hem,roll,drop,current:.20,closed:false};blinds.set(id,blind);cloth.scale.y=.20;cloth.position.y=-.10;return g;
}
function toggleBlind(id){const blind=blinds.get(id);if(blind)blind.closed=!blind.closed;}
function animateBlinds(){for(const b of blinds.values()){const target=b.closed?b.drop:.12;b.current=THREE.MathUtils.lerp(b.current,target,.12);if(Math.abs(b.current-target)<.001)b.current=target;b.cloth.scale.y=b.current;b.cloth.position.y=-b.current/2;b.hem.position.y=-b.current;b.roll.scale.set(1+(1-b.current/b.drop)*.35,1,1+(1-b.current/b.drop)*.35);}}
function windowFrame(w,h,x,y,z,rot=0){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;g.name=rot?'Left window with sill':'Sink window with sill';g.position.add(new THREE.Vector3(0,0,-.1).applyAxisAngle(new THREE.Vector3(0,1,0),rot));room.add(g);
 box(w,h,.015,0,0,0,glass,g);
 for(const xx of [-w/2,w/2])box(.06,h+.1,.14,xx,0,.04,white,g);
 for(const yy of [-h/2,h/2])box(w+.1,.06,.14,0,yy,.04,white,g);
 function sash(left,right,bottom,top){for(const xx of [left+.019,right-.019])box(.025,top-bottom,.035,xx,(top+bottom)/2,.112,white,g);for(const yy of [bottom+.019,top-.019])box(right-left,.025,.035,(left+right)/2,yy,.112,white,g);}
 if(!rot){
  const split=-w*.055,transom=h*.24;
  box(.06,h,.11,split,0,.066,white,g);box(w/2+split,.06,.11,-w/4+split/2,transom,.066,white,g);
  sash(-w/2,split,-h/2,transom);sash(-w/2,split,transom,h/2);
  box(.018,.13,.035,split-.046,-.18,.15,white,g);box(.12,.018,.035,-w*.27,transom+.05,.15,white,g);
 }else{
  const transom=h*.025;box(w,.07,.11,0,transom,.067,white,g);sash(-w/2,w/2,-h/2,transom);box(.12,.018,.035,0,-h/2+.055,.15,white,g);
 }
 for(const xx of [-w/2-.058,w/2+.058])box(.047,h+.16,.22,xx,0,.005,paint,g);
 if(rot)box(w+.2,.035,.32,0,-h/2-.03,.085,white,g);else{box(w+.2,.035,.30,0,-h/2-.03,-.04,upstandMat,g).name='Sink window quartz sill';}
 rollerBlind(g,rot?'side-window':'sink-window',w+.12,h+.04,0,h/2+.055,.185);
}
windowFrame(1.42,1.23,.07,1.61,-1.84);windowFrame(.9,1.08,-1.18,1.55,-.83,Math.PI/2);
function pull(x,y,z,parent,length=.13){
 const path=new THREE.CatmullRomCurve3([new THREE.Vector3(x,y-length/2,z),new THREE.Vector3(x,y-length/2+.015,z+.025),new THREE.Vector3(x,y+length/2-.015,z+.025),new THREE.Vector3(x,y+length/2,z)]);
 const handle=new THREE.Mesh(new THREE.TubeGeometry(path,16,.006,8,false),silver);handle.castShadow=true;handle.userData.cabinetHandle=true;parent.add(handle);
 for(const yy of [y-length/2,y+length/2])box(.018,.022,.009,x,yy,z,silver,parent);
}
function cup(x,y,z,parent){
 const handle=new THREE.Mesh(new THREE.SphereGeometry(.038,24,12,0,Math.PI,0,Math.PI/2),silver);handle.scale.set(1,.62,.7);handle.position.set(x,y,z);handle.castShadow=true;handle.userData.cabinetHandle=true;parent.add(handle);
 box(.078,.011,.005,x,y,z,silver,parent);
 for(const xx of [x-.03,x+.03]){const screw=new THREE.Mesh(new THREE.SphereGeometry(.0025,6,6),dark);screw.position.set(xx,y+.004,z+.008);parent.add(screw);}
}
const kitchenDoors=new Map();let cupboardIndex=0;
function front(w,h,x,y,z,parent,handle='bar',side=1,handleEdge='top'){
 const door=new THREE.Group();door.position.set(x,y,z);parent.add(door);door.name='Cabinet front';
 box(w-.014,h-.018,.018,0,0,0,sageInset,door);
 for(const xx of [-w/2+.027,w/2-.027])box(.051,h-.003,.025,xx,0,.008,sage,door);
 // Fit rails between stiles: overlapping front faces shimmer as the camera moves.
 for(const yy of [-h/2+.027,h/2-.027])box(w-.105,.051,.025,0,yy,.008,sage,door);
 if(handle==='bar'){const gripLength=.13,edgeInset=.07;pull(side*(w/2-.07),handleEdge==='bottom'?-h/2+edgeInset+gripLength/2:Math.min(h*.3,.25),.023,door,gripLength);}
 if(handle==='cup')cup(0,h/2-.055,.023,door);
 return door;
}
/** Add stationary stops behind closed reveals; retain the open cavity and door travel. */
function cabinetStops(parent,w,h,d,mid=0,y=0,top=true){
 const frame=new THREE.Group();frame.name='Stationary cabinet face stops';parent.add(frame);const z=d/2+.005;
 for(const side of [-1,1])box(.025,h,.01,mid+side*(w/2-.0125),y,z,sage,frame);
 box(w-.05,.025,.01,mid,y-h/2+.0125,z,sage,frame);
 if(top)box(w-.05,.025,.01,mid,y+h/2-.0125,z,sage,frame);
 return frame;
}
// Retained carcass brand and internal panel dimensions are unverified; 18 mm shell is a modelling assumption.
function cabinetShell(parent,w,h,d,mid=0,top=true,lining=cabinetWood){
 cabinetStops(parent,w,h,d,mid);
 for(const side of [-1,1]){box(.018,h,d,mid+side*(w/2-.009),0,0,sage,parent);box(.003,h-.036,d-.025,mid+side*(w/2-.0195),0,.004,lining,parent);}
 // Horizontal panels meet the sides; shared underside faces must never overlap.
 box(w-.036,h-.036,.018,mid,0,-d/2+.009,lining,parent);box(w-.036,.018,d,mid,-h/2+.009,0,lining,parent).name='Cabinet bottom panel';if(top){box(w-.036,.018,d,mid,h/2-.009,0,sage,parent);box(w-.036,.003,d-.025,mid,h/2-.0195,.004,lining,parent);}
}
function drawerFront(parent,leaf,id,w,h,travel=.42){
 const carriage=new THREE.Group();carriage.position.copy(leaf.position);carriage.userData.cabinet=id;parent.add(carriage);leaf.position.set(0,0,0);carriage.add(leaf);
 box(w-.055,.014,.48,0,-h/2+.025,-.265,cabinetWood,carriage);for(const x of [-w/2+.035,w/2-.035])box(.014,h-.05,.48,x,0,-.265,cabinetWood,carriage);box(w-.055,h-.05,.014,0,0,-.498,cabinetWood,carriage);
 kitchenDoors.set(id,{pivot:carriage,type:'pullout',baseZ:carriage.position.z,travel,open:false,progress:0});
}
function cabinet(w,h,d,x,y,z,rot=0,doors=1,sinkUnit=false,handleEdge='top'){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rot;room.add(g);cabinetShell(g,w,h,d,0,!sinkUnit);
 if(!sinkUnit)box(w-.04,.014,d-.045,0,0,-.005,cabinetWood,g);
 const widths=Array.isArray(doors)?doors.map(part=>part*w):Array(doors).fill(w/doors);let edge=-w/2;
 for(let i=0;i<widths.length;i++){const side=i===0?1:-1,leaf=front(widths[i],h,edge+widths[i]/2,0,d/2+.02,g,'bar',side,handleEdge);hingedFront(g,leaf,'cupboard-'+(++cupboardIndex),widths[i],-side);edge+=widths[i];if(i<widths.length-1)box(.025,h,.025,edge,0,d/2+.0025,sage,g).name='Stationary inter-door stile';}
 return g;
}
function baseRun(x,z,rot,segments,name){
 const g=new THREE.Group();g.position.set(x,.49,z);g.rotation.y=rot;g.name=name;g.userData.segments=segments;room.add(g);const width=segments.reduce((sum,s)=>sum+s.width,0);let edge=-width/2;
 for(const seg of segments){
  const mid=edge+seg.width/2;cabinetShell(g,seg.width,.76,.58,mid,true,seg.appliance==='dishwasher'?silver:seg.appliance==='freezer'?white:cabinetWood);
  if(seg.drawers){let top=.38;for(const h of [.17,.25,.34]){const leaf=front(seg.width,h,mid,top-h/2,.31,g,'cup');drawerFront(g,leaf,'drawer-'+(++cupboardIndex),seg.width,h);top-=h;if(top>-.37)box(seg.width,.025,.025,mid,top,.2925,sage,g).name='Stationary drawer reveal rail';}}
  else{
   const side=seg.side||1,leaf=front(seg.width,.76,mid,0,.31,g,seg.appliance?'cup':'bar',side),id=seg.appliance||'cupboard-'+(++cupboardIndex);
   if(seg.appliance==='bin'){
    leaf.name='Pull-out waste bin front';const carriage=new THREE.Group();carriage.position.set(mid,0,.31);carriage.userData.cabinet=id;g.add(carriage);leaf.position.set(0,0,0);carriage.add(leaf);
    box(seg.width-.065,.025,.51,0,-.32,-.265,silver,carriage);
    for(const x of [-.132,.132]){const binMat=material('#525e59',.8);box(.24,.018,.38,x,-.29,-.26,binMat,carriage);for(const side of [-1,1]){box(.012,.49,.38,x+side*.12,-.04,-.26,binMat,carriage);box(.24,.49,.012,x,-.04,-.26+side*.19,binMat,carriage);}box(.21,.006,.34,x,-.276,-.26,dark,carriage);}
    kitchenDoors.set(id,{pivot:carriage,type:'pullout',baseZ:.31,travel:.48,open:false,progress:0});
   }else if(seg.appliance==='dishwasher'){
    leaf.name='Integrated dishwasher front';const pivot=new THREE.Group();pivot.position.set(mid,-.37,.31);g.add(pivot);leaf.position.set(0,.37,0);pivot.add(leaf);leaf.userData.cabinet=id;
    box(seg.width-.06,.69,.012,0,0,-.022,silver,leaf);box(.11,.07,.016,0,.18,-.038,dark,leaf);box(seg.width-.08,.035,.025,0,.345,-.03,dark,leaf);for(let i=0;i<4;i++)box(.018,.008,.002,-.17+i*.045,.345,-.044,silver,leaf);box(.048,.015,.002,.16,.345,-.044,material('#6ca489'),leaf);
    kitchenDoors.set(id,{pivot,type:'drop',open:false,progress:0});
    for(const y of [-.13,.17]){for(let i=0;i<10;i++)box(.003,.004,.46,mid-seg.width*.38+i*seg.width*.76/9,y,-.01,silver,g);for(const zz of [-.24,.22])box(seg.width-.07,.04,.005,mid,y+.016,zz,silver,g);}
   }else{
    if(seg.appliance==='freezer'){leaf.name='Integrated undercounter freezer front';box(seg.width-.06,.70,.022,0,0,-.023,white,leaf);for(const yy of [-.25,-.015,.22]){box(seg.width-.075,.014,.49,mid,yy-.085,-.015,white,g);box(seg.width-.075,.17,.012,mid,yy,.235,glass,g);box(seg.width-.13,.018,.02,mid,yy+.062,.247,white,g);for(const xx of [-.13,.1])box(.13,.065,.22,mid+xx,yy-.04,.04,material(yy<0?'#d9dfcc':'#e0dbb8'),g);}}
    else box(seg.width-.04,.014,.52,mid,0,-.01,cabinetWood,g);
    hingedFront(g,leaf,id,seg.width,-side);
   }
  }
  edge+=seg.width;
 }
 return g;
}
const sinkCabinet=cabinet(1.48,.76,.535,0,.49,-1.5625,0,2,true);sinkCabinet.name='Sink cupboard, two doors';
const leftBaseRun=baseRun(-.92,.28,Math.PI/2,[{width:.6,appliance:'bin'},{width:.8,drawers:true},{width:.44,side:-1},{width:.6,appliance:'freezer'},{width:.6,appliance:'dishwasher'}],'Left base run');
// Entry photo: a plain finished end reaches the floor and supports the quartz underside.
const leftRunWidth=leftBaseRun.userData.segments.reduce((sum,segment)=>sum+segment.width,0);
const counterUnderside=.895-.045/2,endPanelThickness=.018;
box(endPanelThickness,counterUnderside,.62,-leftRunWidth/2-endPanelThickness/2,counterUnderside/2-leftBaseRun.position.y,.02,sage,leftBaseRun).name='Floor-standing left worktop end panel';
const hobBaseRun=baseRun(.92,-.195,-Math.PI/2,[{width:.54},{width:.6,drawers:true},{width:.97,side:-1}],'Hob base, two doors and three drawers');
// Blind corner carcasses and scribed fillers close the U-shaped run against the walls.
for(const x of [-.94,.94]){box(.6,.76,x>0?.59:.6,x,.49,x>0?-1.545:-1.54,sage).name='Closed blind corner cabinet';box(.6,.76,.035,x,.49,-1.847,sage).name='Cabinet rear wall filler';}
box(1.48,.76,.035,0,.49,-1.847,sage).name='Sink cabinet rear wall filler';
for(const x of [-.6,.6])box(.035,.76,.06,x,.49,-1.215,sage).name='Scribed corner filler';
const tallUnits=[];

function hingedFront(parent,leaf,id,width,side=1){const pivot=new THREE.Group(),offset=side*(width/2-.007);pivot.position.set(leaf.position.x+offset,leaf.position.y,leaf.position.z);parent.add(pivot);leaf.position.set(-offset,0,0);pivot.add(leaf);leaf.userData.cabinet=id;if(leaf.name==='Cabinet front')box(width-.055,Math.max(.1,leaf.children[0]?.geometry?.parameters?.height||.5),.006,0,0,-.012,cabinetWood,leaf);kitchenDoors.set(id,{pivot,side,open:false});}
function toggleCabinet(id){const door=kitchenDoors.get(id);if(door){door.open=!door.open;if(id==='dishwasher'||id==='freezer'||id==='bin')notify((id==='dishwasher'?'Dishwasher':id==='bin'?'Pull-out bin':'Undercounter freezer')+(door.open?' opened':' closed'));}}
/** Apply a trial or accepted cabinet position without changing its animation state. */
function poseCabinet(d,progress){
 if(d.type==='pullout')d.pivot.position.z=d.baseZ+progress*(d.travel||.53);
 else if(d.type==='drop')d.pivot.rotation.x=progress*Math.PI/2;
 else if(d.type==='slide-hide'){d.pivot.rotation.x=Math.min(1,progress/.45)*Math.PI/2;d.pivot.position.z=d.baseZ-Math.max(0,(progress-.45)/.55)*.61;}
 else d.pivot.rotation.y=progress*Math.PI*.52*(d.side||1);
}
function animateCabinets(){for(const d of kitchenDoors.values()){
 const target=d.open?1:0;let next=THREE.MathUtils.lerp(d.progress||0,target,.12);if(Math.abs(next-target)<.001)next=target;
 d.progress=clearHandleTravel(d,kitchenDoors,next,poseCabinet);poseCabinet(d,d.progress);
}}
let tallEdge=.86;
for(const spec of [{name:'Oven and microwave',width:.6,type:'oven'},{name:'Larder',width:.4,type:'larder'},{name:'Integrated fridge',width:.6,type:'fridge'}]){
 const g=new THREE.Group();g.name=spec.name;g.position.set(.9,0,tallEdge+spec.width/2);g.rotation.y=-Math.PI/2;room.add(g);tallUnits.push(g);cabinetStops(g,spec.width,2.26,.63,0,1.25,true);
 for(const y of spec.type==='oven'?[.57,2.06]:spec.type==='fridge'?[.15]:[])box(spec.width,.025,.025,0,y,.3175,sage,g).name='Stationary appliance transition rail';
 {
  const lining=spec.type==='fridge'?white:cabinetWood;
  for(const side of [-1,1]){box(.018,2.26,.63,side*(spec.width/2-.009),1.25,0,sage,g).name='Tall cabinet side';box(.003,2.224,.605,side*(spec.width/2-.0195),1.25,.004,lining,g);}
  for(const side of [-1,1]){box(spec.width-.036,.018,.63,0,1.25+side*1.121,0,sage,g).name='Tall cabinet horizontal panel';box(spec.width-.036,.003,.605,0,1.25+side*1.1105,.004,lining,g);}
  box(spec.width-.036,2.224,.018,0,1.25,-.305,lining,g);
  for(const y of spec.type==='fridge'?[.75,1.08,1.4,1.73,2.05,2.27]:[])box(spec.width-.04,.018,.56,0,y,0,lining,g);
  if(spec.type==='fridge')for(const y of [.34,.63]){box(.51,.022,.52,0,y-.12,0,white,g);box(.51,.20,.012,0,y,.255,glass,g);}
 }
 if(spec.type==='oven'){const lower=front(spec.width,.45,0,.345,.338,g,'cup');drawerFront(g,lower,'oven-base-drawer',spec.width,.45,.4);const upper=front(spec.width,.31,0,2.215,.338,g,'none');hingedFront(g,upper,'oven-top-cupboard',spec.width,-1);box(spec.width-.04,.016,.57,0,2.058,-.005,cabinetWood,g);}
 if(spec.type==='larder'){
  g.userData.cabinet='larder';const carriage=new THREE.Group();carriage.position.set(0,1.25,.338);carriage.name='Pull-out larder with attached baskets';carriage.userData.cabinet='larder';g.add(carriage);
  const leaf=front(spec.width,2.24,0,0,0,carriage,'none');cup(0,.05,.027,leaf);box(spec.width-.07,2.15,.008,0,0,-.014,cabinetWood,leaf);
  for(const yy of [-.93,-.54,-.15,.24,.63,1.0]){box(.32,.014,.50,0,yy,-.282,white,carriage);for(const side of [-1,1])box(.009,.085,.5,side*.16,yy+.045,-.282,silver,carriage);box(.32,.07,.008,0,yy+.04,-.528,silver,carriage);}
  for(const x of [-.14,.14])box(.014,2.03,.014,x,.035,-.515,silver,carriage);
  kitchenDoors.set('larder',{pivot:carriage,type:'pullout',baseZ:.338,open:false,progress:0});
 }
 if(spec.type==='fridge'){
  g.userData.cabinet='fridge';const leaf=new THREE.Group();leaf.name='Full-height fridge door';leaf.position.set(0,1.25,.338);g.add(leaf);
  const upper=front(spec.width,1.39,0,.425,0,leaf,'none');front(spec.width,.82,0,-.69,0,leaf,'none');pull(-spec.width/2+.08,-.365,.027,upper,.15);
  box(spec.width-.065,2.15,.025,0,0,-.024,white,leaf);
  for(const yy of [-.84,-.43,.02,.46,.86]){box(spec.width-.10,.015,.075,0,yy,-.071,white,leaf);box(spec.width-.10,.055,.012,0,yy+.026,-.108,glass,leaf);}
  hingedFront(g,leaf,'fridge',spec.width);
 }
 tallEdge+=spec.width;
}
// Continuous, recessed sage plinths, meeting at the rear corners and reaching the floor.
// Side boards move outward by .16 m below; keep the rear board meeting their final inner edges.
box(1.58,.13,.06,0,.065,-1.22,sage).name='Rear continuous kickboard';
box(.06,.13,3.05,-.66,.065,.275,sage).name='Left continuous kickboard';
box(.06,.13,3.73,.66,.065,.615,sage).name='Right continuous kickboard including tall units';
box(.46,.13,.045,1,.065,2.455,sage).name='Tall unit plinth return';
const quartzRoughness=texture((context,width,height)=>{const random=seeded(81);context.fillStyle='#cccccc';context.fillRect(0,0,width,height);for(let i=0;i<1600;i++){context.fillStyle=random()>.5?'#767676':'#eeeeee';context.fillRect(random()*width,random()*height,1,1);}},256,256);quartzRoughness.colorSpace=THREE.NoColorSpace;
const work=new THREE.MeshPhysicalMaterial({color:'#ffffff',map:surfaces.stone,roughness:.27,roughnessMap:quartzRoughness,clearcoat:.28,clearcoatRoughness:.18,envMapIntensity:.65});
const leftWorktop=new THREE.Mesh(new THREE.ExtrudeGeometry(flatShape(roundPoints(.64,3.12,.018)),{depth:.045,bevelEnabled:false}),work);leftWorktop.rotation.x=-Math.PI/2;leftWorktop.position.set(-.91,.895-.045/2,.29);leftWorktop.name='Left continuous worktop';leftWorktop.castShadow=true;leftWorktop.receiveShadow=true;room.add(leftWorktop);box(.64,.045,2.14,.91,.895,-.22,work);
// Allow for the later 160 mm outward room adjustment: finished inner edges meet the 1 m sink.
box(.875,.045,.65,-.7625,.895,-1.56,work).name='Left sink worktop surround';box(.875,.045,.65,.7625,.895,-1.56,work).name='Right sink worktop surround';box(1,.045,.085,0,.895,-1.8425,work);box(1.28,.045,.065,0,.895,-1.2675,work);
const ceramic=new THREE.MeshPhysicalMaterial({color:'#f5f4ed',roughness:.19,clearcoat:.48,clearcoatRoughness:.15,side:THREE.DoubleSide});
const sink=new THREE.Group();sink.name='Ceramic one-and-a-half bowl sink with right drainer';sink.position.set(0,.932,-1.55);room.add(sink);
function roundPoints(w,d,r,x=0,z=0){const points=[];for(let corner=0;corner<4;corner++){const a=corner*Math.PI/2,cx=x+(corner===0||corner===3?1:-1)*(w/2-r),cz=z+(corner<2?1:-1)*(d/2-r);for(let i=0;i<9;i++){const angle=a+i*Math.PI/16;points.push(new THREE.Vector2(cx+Math.cos(angle)*r,cz+Math.sin(angle)*r));}}return points;}
function flatShape(points){const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p.x,-p.y):shape.moveTo(p.x,-p.y));shape.closePath();return shape;}
// CD150LJDM: 1000 × 500, 222 deep main bowl; aperture sizes and small depth are drawing estimates.
const bowls=[{id:'main',name:'Large left bowl',x:-.287,z:0,w:.335,d:.410,depth:.222,wasteX:-.225,wasteZ:0},{id:'small',name:'Small middle bowl',x:-.020,z:0,w:.174,d:.260,depth:.145,wasteX:-.020,wasteZ:0}];
const rimShape=flatShape(roundPoints(.994,.494,.028));for(const bowl of bowls)rimShape.holes.push(new THREE.Path(flatShape(roundPoints(bowl.w,bowl.d,.045,bowl.x,bowl.z)).getPoints()));
const rimMesh=new THREE.Mesh(new THREE.ExtrudeGeometry(rimShape,{depth:.012,bevelEnabled:true,bevelSize:.003,bevelThickness:.003,bevelSegments:2}),ceramic);rimMesh.rotation.x=-Math.PI/2;rimMesh.position.y=-.012;rimMesh.castShadow=true;rimMesh.receiveShadow=true;sink.add(rimMesh);
for(const bowl of bowls){
 const levels=[{y:0,inset:0},{y:-.02,inset:.005},{y:-bowl.depth+.022,inset:.027},{y:-bowl.depth,inset:.042}],vertices=[],indices=[];
 for(const level of levels)for(const point of roundPoints(bowl.w-level.inset*2,bowl.d-level.inset*2,.043,bowl.x,bowl.z))vertices.push(point.x,level.y,point.y);
 const n=36;for(let level=0;level<3;level++)for(let i=0;i<n;i++){const a=level*n+i,b=level*n+(i+1)%n,c=b+n,d=a+n;indices.push(a,b,d,b,c,d);}
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();const shell=new THREE.Mesh(geometry,ceramic);shell.name=bowl.name;shell.receiveShadow=true;sink.add(shell);
 const bottom=new THREE.Mesh(new THREE.ShapeGeometry(flatShape(roundPoints(bowl.w-.084,bowl.d-.084,.043,bowl.x,bowl.z))),ceramic);bottom.rotation.x=-Math.PI/2;bottom.position.y=-bowl.depth;bottom.receiveShadow=true;bottom.userData.action='plug:'+bowl.id;sink.add(bottom);
}
const drainer=box(.370,.009,.390,.260,.002,0,ceramic,sink);drainer.name='Right-hand ribbed drainer';
for(let i=0;i<7;i++){const rib=new THREE.Mesh(new THREE.CapsuleGeometry(.004,.340,4,8),ceramic);rib.rotation.z=Math.PI/2;rib.position.set(.260,.009,-.174+i*.058);rib.castShadow=true;sink.add(rib);}
const overflow=new THREE.Mesh(new THREE.CircleGeometry(.012,20),silver);overflow.rotation.y=Math.PI/2;overflow.position.set(-.440,-.078,0);sink.add(overflow);
const tapAssembly=new THREE.Group();tapAssembly.name='Chrome mixer tap with cylindrical base and side lever';tapAssembly.position.set(-.029,.932,-1.723);room.add(tapAssembly);
const tapChrome=new THREE.MeshPhysicalMaterial({color:'#e2e7e7',metalness:1,roughness:.11,envMapIntensity:1,envMap:metalEnvironment});
cylinder(.0255,.009,0,.0045,0,tapChrome,tapAssembly).name='Tap mounting collar';
cylinder(.021,.118,0,.064,0,tapChrome,tapAssembly).name='Cylindrical mixer body';
cylinder(.022,.008,0,.126,0,tapChrome,tapAssembly);
const spout=new THREE.Group();spout.name='Swivelling spout';tapAssembly.add(spout);
const tapCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.128,0),new THREE.Vector3(0,.2405,0),new THREE.Vector3(0,.320,.032),new THREE.Vector3(0,.348,.1075),new THREE.Vector3(0,.320,.183),new THREE.Vector3(0,.2405,.215),new THREE.Vector3(0,.222,.215)]);const tap=new THREE.Mesh(new THREE.TubeGeometry(tapCurve,56,.012,16,false),tapChrome);tap.castShadow=true;spout.add(tap);
const mixer=cylinder(.019,.042,.031,.086,0,tapChrome,tapAssembly);mixer.rotation.z=Math.PI/2;mixer.name='Side mixer cartridge';
const tapLever=new THREE.Group();tapLever.position.set(.053,.095,0);tapAssembly.add(tapLever);cylinder(.005,.072,0,.036,0,tapChrome,tapLever).name='Working side lever';
cylinder(.0125,.016,0,.222,.215,tapChrome,spout).name='Tap aerator';
tapAssembly.userData.action='swivel';tapLever.userData.action='tap';
const leverTarget=cylinder(.018,.095,0,.036,0,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),tapLever);leverTarget.userData.action='tap';
const waterMat=new THREE.MeshPhysicalMaterial({color:'#c7edf4',transparent:true,opacity:.48,roughness:.12,metalness:0,clearcoat:1});
const waterStream=cylinder(.0035,.38,0,.05,.215,waterMat,spout);waterStream.name='Running tap water';waterStream.visible=false;waterStream.userData.pickThrough=true;
// Moving highlights travel down the transparent jet, making flow visible without blue solid water.
const streamHighlights=new THREE.Group();streamHighlights.name='Falling water highlights';streamHighlights.userData.pickThrough=true;spout.add(streamHighlights);
const streamHighlightMaterial=new THREE.MeshBasicMaterial({color:'#eefbff',transparent:true,opacity:.48,depthWrite:false});
for(let i=0;i<11;i++){const drop=new THREE.Mesh(new THREE.SphereGeometry(.0024,6,4),streamHighlightMaterial);drop.scale.set(1,2.6,1);drop.userData.pickThrough=true;streamHighlights.add(drop);}
const sinkWater = createWaterState();
const runoffTexture=texture((context,width,height)=>{
 context.clearRect(0,0,width,height);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const edge=Math.sin(Math.PI*x/(width-1)),ripple=.72+.18*Math.sin(y*.12+x*.18)+.1*Math.sin(y*.047-x*.3);
  context.fillStyle=`rgba(226,246,249,${edge*edge*ripple*.5})`;context.fillRect(x,y,1,1);
 }
},64,256);runoffTexture.wrapS=THREE.ClampToEdgeWrapping;runoffTexture.wrapT=THREE.RepeatWrapping;
const runoffMaterial=new THREE.MeshPhysicalMaterial({color:'#c4e7ec',map:runoffTexture,transparent:true,opacity:.55,roughness:.12,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
/** Follow the worktop edge and cabinet front with one thin, continuous overflow film. */
function createRunoff(x,name){
 const group=new THREE.Group();group.name=name+' animated cabinet and plinth runoff';group.userData.pickThrough=true;room.add(group);
 const positions=[],uvs=[],indices=[];
 const route=[[.936,-1.30],[.921,-1.231],[.87,-1.231],[.855,-1.251],[.16,-1.251],[.13,-1.184],[.006,-1.184]];
 for(let j=0;j<route.length;j++){
  const [y,z]=route[j],width=.085+(1-y/.936)*.025;
  positions.push(x-width/2,y,z,x+width/2,y,z);uvs.push(0,y*3,1,y*3);
  if(j<route.length-1){const n=j*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();const film=new THREE.Mesh(geometry,runoffMaterial);film.userData.pickThrough=true;group.add(film);
 return group;
}
const bowlVisuals={};
for(const bowl of bowls){
 const surface=new THREE.Mesh(new THREE.ShapeGeometry(flatShape(roundPoints(bowl.w-.008,bowl.d-.008,.039))),waterMat);
 surface.rotation.x=-Math.PI/2;surface.position.set(bowl.x,-bowl.depth+.006,bowl.z);surface.visible=false;surface.userData.action='plug:'+bowl.id;sink.add(surface);
 const waste=cylinder(.045,.004,bowl.wasteX,-bowl.depth+.003,bowl.wasteZ,silver,sink);waste.name=bowl.name+' stainless waste flange';
 const drain=cylinder(.035,.002,0,.0025,0,dark,waste);drain.name='Recessed waste opening';
 const plug=cylinder(.031,.003,bowl.wasteX,-bowl.depth+.009,bowl.wasteZ,silver,sink);plug.name=bowl.name+' metal basket strainer plug';plug.userData.action='plug:'+bowl.id;
 for(let index=0;index<12;index++){const angle=index*Math.PI/6;const slot=box(.003,.001,.012,Math.sin(angle)*.021,.002,Math.cos(angle)*.021,dark,plug);slot.rotation.y=angle;}
 cylinder(.006,.009,0,.005,0,silver,plug);
 const target=cylinder(.045,.012,0,0,0,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false}),plug);target.userData.action='plug:'+bowl.id;
 const trail=box(.16,.004,.27,bowl.x,.006,.19,waterMat,sink);trail.name=bowl.name+' overflow onto rim';trail.userData.pickThrough=true;
 const curtain=createRunoff(bowl.x,bowl.name);
 bowlVisuals[bowl.id]={surface,plug,target,trail,curtain,waste};
}
const puddle=new THREE.Group();puddle.name='Water spilled onto floor';puddle.userData.pickThrough=true;scene.add(puddle);
let floorFlood=null,floodMesh=null,lastFloodLitres=-1,floodFurnitureKey;
/** Discard cached footprints while retaining the measured spill volume. */
function invalidateFloorFlood(){
 if(floodMesh){puddle.remove(floodMesh);floodMesh.geometry.dispose();floodMesh.userData.dispose();}
 floorFlood=floodMesh=null;lastFloodLitres=-1;
}
/** Build the connected floor from final geometry, retaining hidden structural walls as barriers. */
function buildFloorFlood(){
 scene.updateMatrixWorld(true);const floors=[],obstacles=[];
 scene.traverse(object=>{
  if(!object.isMesh||object===waterStream||object.material===waterMat||object.material===runoffMaterial)return;
  const bounds=new THREE.Box3().setFromObject(object),p=object.geometry.parameters;
  const rect={minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z};
  if(p?.height===.075&&bounds.min.y<0&&bounds.max.y<.001){floors.push(rect);return;}
  // Tall solids reaching the floor include plinths, wall thresholds and furniture feet.
  // View-hidden walls remain physical; inactive alternative furniture is excluded.
  let active=true;for(let parent=object;parent;parent=parent.parent)if(!parent.visible&&!structuralWalls.includes(parent))active=false;
  if(active&&bounds.min.y<=.035&&bounds.max.y>=.03)obstacles.push(rect);
 });
 floorFlood=createFloodMap(floors,obstacles,{x:-.1,z:-1.12});
 floodMesh=createFloodVisual(THREE,floorFlood,waterMat);puddle.add(floodMesh);
}
/** Spread retained overflow across connected cells without draining it into the raised sink. */
function syncFloorFlood(){
 const litres=sinkWater.spilled;puddle.visible=litres>0;waterReset.hidden=!puddle.visible;
 if(litres===lastFloodLitres)return;lastFloodLitres=litres;
 if(!litres){delete puddle.userData.coverage;if(floodMesh){puddle.remove(floodMesh);floodMesh.geometry.dispose();floodMesh.userData.dispose();}floorFlood=floodMesh=null;return;}
 if(!floorFlood)buildFloorFlood();
 const coverage=floodCoverage(floorFlood,litres);floodMesh.userData.update(coverage.count);
 floodMesh.position.y=.004+coverage.depth;puddle.userData.coverage={...coverage,area:floorFlood.area,reachableCells:floorFlood.cells.length};
}
const waterPanel=document.querySelector('#water-panel'),waterStatus=document.querySelector('#water-status'),waterReset=document.querySelector('#water-reset');
/** Synchronise independent bowl surfaces, the swivelling spout and accessible controls. */
function syncWater(){
 for(const bowl of bowls){
  const water=sinkWater.bowls[bowl.id],visual=bowlVisuals[bowl.id],fraction=water.litres/waterDefaults.capacities[bowl.id];
  visual.surface.visible=water.litres>.0001;visual.surface.position.y=-bowl.depth+.006+fraction*(bowl.depth-.008);
  visual.surface.scale.set((bowl.w-.084+fraction*.076)/(bowl.w-.008),(bowl.d-.084+fraction*.076)/(bowl.d-.008),1);
  // The photo shows a slotted basket; its captive actuation is unverified, so do not invent lift travel.
  visual.plug.position.set(bowl.wasteX,-bowl.depth+.009,bowl.wasteZ);
  visual.trail.visible=visual.curtain.visible=water.spilling;
  const button=document.querySelector('#water-plug-'+bowl.id);button.textContent=(water.plugged?'Open ':'Close ')+(bowl.id==='main'?'main':'small')+' plug';button.setAttribute('aria-pressed',String(water.plugged));
 }
 spout.rotation.y=sinkWater.target==='main'?-Math.PI/3:0;
 const target=bowls.find(bowl=>bowl.id===sinkWater.target),surface=bowlVisuals[target.id].surface;
 waterStream.visible=sinkWater.tapOn;
 // Transform the actual bowl contact height into the spout frame; a trace of water cannot shorten the jet above its contact.
 sink.updateWorldMatrix(true,false);spout.updateWorldMatrix(true,false);
 const contact=sink.localToWorld(new THREE.Vector3(target.x,Math.max(-target.depth+.002,surface.visible?surface.position.y:-target.depth+.002),target.z));
 const bottom=spout.worldToLocal(contact).y,length=.214-bottom;waterStream.scale.y=length/.38;waterStream.position.y=(.214+bottom)/2;
 streamHighlights.visible=sinkWater.tapOn;
 const phase=performance.now()*.001;
 streamHighlights.children.forEach((drop,i)=>{const progress=(phase*2.2+i/streamHighlights.children.length)%1;drop.position.set(Math.sin(i*2.4+phase*11)*.001,.214-progress*length,.215+Math.cos(i*1.7+phase*9)*.001);});
 syncFloorFlood();
 const tapButton=document.querySelector('#water-tap');tapButton.textContent=sinkWater.tapOn?'Turn flow off':'Turn flow on';tapButton.setAttribute('aria-pressed',String(sinkWater.tapOn));
 const swivelButton=document.querySelector('#water-swivel');swivelButton.textContent='Aim at '+(sinkWater.target==='small'?'main':'small')+' bowl';
 const status=sinkWater.spilling?'Overflowing — water on the floor':sinkWater.spilled>0?'Spilled water remains on the floor':'Tap aimed at '+sinkWater.target+' bowl';
 const label=status+' · Main '+Math.round(sinkWater.bowls.main.litres/waterDefaults.capacities.main*100)+'% · Small '+Math.round(sinkWater.bowls.small.litres/waterDefaults.capacities.small*100)+'%';if(waterStatus.textContent!==label)waterStatus.textContent=label;
}
/** The separate lever changes flow without moving the spout or either plug. */
function toggleTap(){sinkWater.tapOn=!sinkWater.tapOn;syncWater();}
/** Tapping the body rotates the spout between bowls without changing flow. */
function swivelTap(){sinkWater.target=sinkWater.target==='small'?'main':'small';syncWater();}
/** Toggle only the requested bowl's plug while retaining both water volumes. */
function togglePlug(id){sinkWater.bowls[id].plugged=!sinkWater.bowls[id].plugged;syncWater();}
document.querySelector('#water-tap').onclick=toggleTap;document.querySelector('#water-swivel').onclick=swivelTap;
for(const id of ['main','small'])document.querySelector('#water-plug-'+id).onclick=()=>togglePlug(id);
waterReset.onclick=()=>{mopSpill(sinkWater);syncWater();};
/** Keep direct scene interaction unobstructed; keyboard inspection exposes compact controls. */
function revealWater(keyboard=false){waterPanel.hidden=!keyboard;}
document.querySelector('#water-close').onclick=()=>{waterPanel.hidden=true;canvas.focus({preventScroll:true});};
waterPanel.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('#water-close').click();});
let waterTime=performance.now();
/** Discard hidden-tab time while retaining real elapsed time on slow visible frames. */
document.addEventListener('visibilitychange',()=>{waterTime=performance.now();});
/** Advance visible time at the same flow rate regardless of rendering speed. */
function animateSinkWater(){const now=performance.now(),seconds=document.hidden?0:Math.max(0,(now-waterTime)/1000);waterTime=now;stepWater(sinkWater,seconds);runoffTexture.offset.y=now*.00072;syncWater();}
syncWater();
cabinet(1.8,.77,.34,-1.04,1.83,.53,Math.PI/2,2,false,'bottom').name="Left wall cupboard, two doors";cabinet(.87,.77,.34,1.04,1.83,-1.425,-Math.PI/2,[.64,.36],false,'bottom').name="Wall cupboard beside extractor, two doors";cabinet(.45,.77,.34,1.04,1.83,.53,-Math.PI/2,1,false,'bottom').name="Wall cupboard beside tower, one door";
box(.34,.77,.11,1.04,1.83,.81,sage).name='Wall cupboard to tall-unit filler';
const cornice=new THREE.Group();cornice.name='Profiled cornice and concealed duct enclosure';room.add(cornice);
function crown(x,z,length,depth=.34){
 const g=new THREE.Group();g.name='Continuous four-sided hollow cornice';g.position.set(x+Math.sign(x)*.16,0,z);cornice.add(g);
 const bottom=depth>.5?2.388:2.224,inside=sage.clone();inside.color.multiplyScalar(.78);
 if(x===1.04){
  // Leave a real opening for the chimney instead of driving it through the shelf.
  box(.055,.016,length-.038,-.1235,bottom,0,inside,g).name='Recessed cornice cavity floor';
  for(const [z0,z1] of [[-length/2+.019,.08-.155/(dimensions.kitchenLength/3.85)],[.08+.155/(dimensions.kitchenLength/3.85),length/2-.019]])box(.247,.016,z1-z0,.0275,bottom,(z0+z1)/2,inside,g).name='Recessed cornice cavity floor';
 }else box(depth-.038,.016,length-.038,0,bottom,0,inside,g).name='Recessed cornice cavity floor';
 const levels=[...(depth>.5?[{y:2.38,o:0},{y:2.4,o:.002}]:[{y:2.215,o:0},{y:2.345,o:0},{y:2.365,o:.002}]),{y:2.413,o:.031},{y:2.417,o:.04},{y:dimensions.corniceTop,o:.04}];
 const vertices=[],indices=[];
 for(const {y,o} of levels)for(const inset of [0,.018])for(const [xx,zz] of [[-1,-1],[1,-1],[1,1],[-1,1]])vertices.push(xx*(depth/2+o-inset),y,zz*(length/2+o-inset));
 for(let i=0;i<levels.length-1;i++)for(let j=0;j<4;j++){
  const k=(j+1)%4,a=i*8+j,b=i*8+k,c=a+8,d=b+8;indices.push(a,c,b,b,c,d);
  const e=a+4,f=b+4,h=c+4,q=d+4;indices.push(e,f,h,f,q,h);
 }
 for(const ring of [0,(levels.length-1)*8])for(let j=0;j<4;j++){const a=ring+j,b=ring+(j+1)%4;indices.push(a,b,a+4,b,b+4,a+4);}
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();const rimMaterial=sage.clone();rimMaterial.side=THREE.DoubleSide;const rim=new THREE.Mesh(geo,rimMaterial);rim.name='Profile wrapping cabinet front, back and both ends';rim.castShadow=true;rim.receiveShadow=true;g.add(rim);
}
crown(-1.04,.53,1.8);crown(1.04,-.50,2.72);crown(.9,1.66,1.6,.63);
const oven=new THREE.Group();oven.position.set(0,0,.327);tallUnits[0].add(oven);oven.name='Existing oven with microwave above';
const applianceGlass=new THREE.MeshPhysicalMaterial({color:'#171c1c',roughness:.17,metalness:.3,clearcoat:.6});

for(const x of [-.28,.28])box(.024,.87,.021,x,1.075,0,silver,oven);for(const [y,h] of [[.656,.032],[1.421,.178]])box(.56,h,.021,0,y,0,silver,oven);
const ovenLiner=material('#353b39',.52);box(.53,.65,.018,0,1.025,-.53,ovenLiner,oven);for(const x of [-.265,.265])box(.015,.65,.54,x,1.025,-.26,ovenLiner,oven);for(const y of [.711,1.342])box(.53,.014,.54,0,y,-.26,ovenLiner,oven);
for(const y of [.91,1.12]){for(let i=0;i<10;i++){const rack=cylinder(.002,.45,-.225+i*.05,y,-.26,silver,oven);rack.rotation.x=Math.PI/2;}box(.47,.004,.005,0,y,-.05,silver,oven);box(.47,.004,.005,0,y,-.485,silver,oven);}
const ovenPivot=new THREE.Group();ovenPivot.position.set(0,.68,.015);oven.add(ovenPivot);const ovenLeaf=new THREE.Group();ovenLeaf.userData.cabinet='oven';ovenLeaf.name='Sliding oven door';ovenPivot.add(ovenLeaf);box(.535,.65,.018,0,.325,0,applianceGlass,ovenLeaf);box(.47,.52,.006,0,.32,-.014,applianceGlass,ovenLeaf);
kitchenDoors.set('oven',{pivot:ovenPivot,type:'slide-hide',baseZ:.015,open:false,progress:0});
box(.54,.12,.009,0,1.435,.015,applianceGlass,oven);box(.095,.026,.003,0,1.44,.021,material('#243d31'),oven);
for(const x of [-.19,.19]){const control=cylinder(.021,.019,x,1.441,.034,silver,oven);control.rotation.x=Math.PI/2;}
for(const x of [-.21,.21])box(.018,.025,.033,x,.625,.023,silver,ovenLeaf);box(.45,.027,.029,0,.625,.042,silver,ovenLeaf);
for(const part of oven.children)part.userData.cabinet='oven';
const microwave=new THREE.Group();microwave.name='Opening microwave';microwave.userData.cabinet='microwave';oven.add(microwave);
for(const x of [-.282,.282])box(.02,.46,.024,x,1.83,0,silver,microwave);for(const y of [1.61,2.05])box(.564,.02,.024,0,y,0,silver,microwave);
box(.43,.34,.018,-.052,1.813,-.4,white,microwave);for(const x of [-.27,.165])box(.012,.34,.4,x,1.813,-.2,white,microwave);for(const y of [1.65,1.975])box(.435,.012,.4,-.052,y,-.2,white,microwave);
cylinder(.145,.009,-.052,1.663,-.21,glass,microwave).name='Microwave turntable';
const microwavePivot=new THREE.Group();microwavePivot.position.set(-.273,1.813,.019);microwave.add(microwavePivot);const microwaveLeaf=new THREE.Group();microwaveLeaf.position.x=.22;microwaveLeaf.userData.cabinet='microwave';microwavePivot.add(microwaveLeaf);
box(.44,.36,.019,0,0,0,silver,microwaveLeaf);box(.39,.305,.007,0,0,.013,applianceGlass,microwaveLeaf);box(.37,.28,.007,0,0,-.014,applianceGlass,microwaveLeaf);
box(.024,.20,.021,.186,0,.031,silver,microwaveLeaf);kitchenDoors.set('microwave',{pivot:microwavePivot,side:-1,open:false,progress:0});
box(.106,.415,.025,.229,1.83,0,silver,microwave);box(.08,.05,.006,.229,1.975,.018,applianceGlass,microwave);
for(let i=0;i<4;i++)for(const x of [.213,.245]){const button=cylinder(.007,.006,x,1.91-i*.035,.022,silver,microwave);button.rotation.x=Math.PI/2;}
// Recessed stationary fascia closes the appliance surround while retaining 3 mm door reveals.
const microwaveFascia=new THREE.Group();microwaveFascia.name='Microwave fixed surround';microwave.add(microwaveFascia);
box(.54,.041,.018,0,2.0165,-.006,silver,microwaveFascia).name='Microwave upper fascia';
box(.54,.007,.018,0,1.6265,-.006,silver,microwaveFascia).name='Microwave lower fascia';
box(.003,.36,.018,.1715,1.813,-.006,silver,microwaveFascia).name='Microwave control-side fascia';
const microwaveKnob=cylinder(.02,.016,.229,1.699,.027,silver,microwave);microwaveKnob.rotation.x=Math.PI/2;
for(const [y,h] of [[.605,.07],[1.555,.09]])box(.59,h,.025,0,y,0,sage,oven);
const hob=new THREE.Group();hob.name='Five-burner gas hob';room.add(hob);
const hobPlate=box(.50,.012,.78,.88,.925,-.41,silver,hob);
const castIron=material('#242825',.92),burnerMetal=material('#989e9a',.5,.75);
for(const x of [.638,1.122])box(.009,.008,.778,x,.934,-.41,silver,hob);for(const z of [-.795,-.025])box(.49,.008,.009,.88,.934,z,silver,hob);
const burners=[{x:.77,z:-.67,r:.039},{x:1.02,z:-.67,r:.042},{x:.895,z:-.41,r:.057},{x:.77,z:-.15,r:.033},{x:1.02,z:-.15,r:.042}];
const burnerFlames=[];
const flameMat=new THREE.MeshStandardMaterial({color:'#77bfff',emissive:'#2389ff',emissiveIntensity:2,transparent:true,opacity:.8,depthWrite:false});
for(const [index,{x,z,r}] of burners.entries()){
 cylinder(r+.01,.009,x,.941,z,burnerMetal,hob);const burner=cylinder(r,.012,x,.952,z,castIron,hob);burner.name='Gas burner';burner.userData.action='burner:'+index;
 const flames=new THREE.Group();flames.position.set(x,.955,z);flames.userData.action='burner:'+index;flames.name='Burner '+(index+1)+' flame';flames.visible=false;hob.add(flames);burnerFlames.push(flames);
 for(let i=0;i<20;i++){const a=i*Math.PI/10,jet=new THREE.Mesh(new THREE.ConeGeometry(.0035,.024,5),flameMat);jet.position.set(Math.cos(a)*(r+.003),.01,Math.sin(a)*(r+.003));jet.rotation.z=-Math.cos(a)*.3;jet.rotation.x=Math.sin(a)*.3;flames.add(jet);}
 // The centre dual crown shares one control; both flame rings belong to its toggled group.
 if(r>.05)for(let i=0;i<16;i++){const a=i*Math.PI/8,jet=new THREE.Mesh(new THREE.ConeGeometry(.0025,.018,5),flameMat);jet.position.set(Math.cos(a)*(r-.022),.013,Math.sin(a)*(r-.022));flames.add(jet);}
 for(let i=0;i<24;i++){const a=i*Math.PI/12;box(.003,.004,.003,x+Math.cos(a)*(r+.005),.946,z+Math.sin(a)*(r+.005),dark,hob);}
 if(r>.05){const ring=new THREE.Mesh(new THREE.TorusGeometry(r-.018,.003,8,36),burnerMetal);ring.rotation.x=Math.PI/2;ring.position.set(x,.958,z);hob.add(ring);}
 cylinder(.003,.018,x+r+.015,.948,z,ceramic,hob);
 }
for(const [section,centre] of [-.67,-.41,-.15].entries()){
 const support=new THREE.Group();support.name='Cast-iron pan support '+(section+1);hob.add(support);
 const x0=.704,x1=1.117,z0=centre-.122,z1=centre+.122;
 for(const x of [x0,x1])box(.011,.016,z1-z0,x,.955,centre,castIron,support);
 for(const z of [z0,z1])box(x1-x0,.016,.011,(x0+x1)/2,.955,z,castIron,support);
 const sectionBurners=burners.filter(b=>Math.abs(b.z-centre)<.01);
 for(const {x,z,r} of sectionBurners){
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const outer=dx?(dx>0?x1-x:x-x0):.122,inner=r+.012;
   if(outer<=inner)continue;
   const shape=new THREE.Shape();shape.moveTo(inner,.982);shape.lineTo(outer-.012,.982);shape.lineTo(outer-.012,.947);shape.lineTo(outer+.006,.947);shape.lineTo(outer+.006,.999);shape.lineTo(inner,.993);shape.closePath();
   const finger=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,steps:1}),castIron);
   finger.userData.action='burner:'+burners.findIndex(b=>b.x===x&&b.z===z);finger.name='Raised angular pan-support finger';finger.position.set(x,.0,z);finger.rotation.y=dx>0?0:dx<0?Math.PI:dz>0?-Math.PI/2:Math.PI/2;finger.translateZ(-.006);support.add(finger);
  }
 }
}
const burnerKnobs=[];
for(let i=0;i<5;i++){const z=-.65+i*.12;cylinder(.022,.006,.662,.936,z,dark,hob);const knob=new THREE.Group();knob.position.set(.662,.95,z);knob.userData.action='burner:'+i;knob.name='Control for burner '+(i+1);hob.add(knob);cylinder(.018,.024,0,0,0,silver,knob);box(.028,.013,.009,0,.019,0,silver,knob);burnerKnobs.push(knob);box(.004,.001,.005,.641,.940,z,dark,hob);}
function toggleBurner(index){if(!Number.isInteger(index)||!burnerFlames[index])return;const flames=burnerFlames[index];flames.visible=!flames.visible;burnerKnobs[index].rotation.y=flames.visible?-Math.PI/2:0;}
function animateWaterAndFlames(){const t=performance.now()*.006;tapLever.rotation.z=THREE.MathUtils.lerp(tapLever.rotation.z,waterStream.visible?-.5:0,.15);waterStream.scale.x=waterStream.scale.z=1+.08*Math.sin(t*2);burnerFlames.forEach((flames,i)=>{if(flames.visible)flames.scale.y=.94+.08*Math.sin(t+i*2);});}
hob.position.x=.16;
// AEG DKB5960HM manufacturer drawing PSGBCH160D363033; installed PNC unverified.
const hoodSteel=createBrushedStainless({THREE,environment:createRoomReflectionEnvironment({THREE,texture})});
hoodSteel.name='Extractor brushed stainless steel';
const hood=new THREE.Group();hood.name='Existing AEG extractor';hood.position.set(.16,.04,0);room.add(hood);
hood.userData.specification={model:'DKB5960HM',width:.898,depth:.5,canopyHeight:.14,chimneyWidth:.31,chimneyDepth:.29,certainty:'Requested model; photo consistent; installed PNC unverified'};
// A 40 mm fascia surrounds the underside; the canopy rises another 100 mm to the chimney.
for(const x of [.743,1.227])box(.016,.034,.898,x,1.6405,-.42,hoodSteel,hood).name='Extractor edge rail';
for(const z of [-.861,.021])box(.468,.034,.016,.985,1.6405,z,hoodSteel,hood).name='Extractor side rail';
box(.5,.006,.898,.985,1.6205,-.42,hoodSteel,hood).name='Extractor underside';
const canopyVertices=[.735,1.6575,-.869,1.235,1.6575,-.869,1.235,1.6575,.029,.735,1.6575,.029,.945,1.7575,-.575,1.235,1.7575,-.575,1.235,1.7575,-.265,.945,1.7575,-.265];
const canopyGeometry=new THREE.BufferGeometry();canopyGeometry.setAttribute('position',new THREE.Float32BufferAttribute(canopyVertices,3));canopyGeometry.setIndex([0,4,1,1,4,5,1,5,2,2,5,6,2,6,3,3,6,7,3,7,0,0,7,4]);canopyGeometry.computeVertexNormals();
const canopyMaterial=cloneBrushedStainless(hoodSteel);canopyMaterial.side=THREE.DoubleSide;const canopy=new THREE.Mesh(canopyGeometry,canopyMaterial);canopy.name='Extractor sloping canopy';canopy.castShadow=true;canopy.receiveShadow=true;hood.add(canopy);
// Two stainless design filters; frame sizes are inferred from the undimensioned plan view.
for(const z of [-.572,-.268])box(.34,.002,.30,1.015,1.6165,z,material('#777b77',.95),hood).name='Extractor grease filter';
const hoodChimney=box(.29,.8025,.31,1.09,2.19875,-.42,hoodSteel);hoodChimney.name='Extractor chimney connected to canopy';
box(.006,.024,.26,.732,1.641,-.42,dark,hood).name='Extractor controls';

const shelves=new THREE.Group();shelves.userData.choice='lighting';room.add(shelves);for(const y of [1.42,1.88]){box(.19,.035,.42,-1.08,y,-1.58,oak,shelves);}
const shelfLights=[];const shelfEmitters=[];
for(const y of [1.4,1.86]){
 const l=new THREE.SpotLight('#ffe6be',.10,1.1,Math.PI*.38,.85,2);l.position.set(-1.07,y-.035,-1.58);l.target.position.set(-1.10,.98,-1.58);scene.add(l,l.target);shelfLights.push(l);
 const strip=box(.012,.003,.32,-1.08,y-.004,-1.58,new THREE.MeshStandardMaterial({color:'#fff4dc',emissive:'#ffe0a4',emissiveIntensity:.4}),shelves);shelfEmitters.push(strip);
}
const fixtures=new THREE.Group();room.add(fixtures);const taskLights=[];
function taskLight(x,y,z,w,d,kind,power){
 const lamp=new THREE.Group();lamp.userData.choice=kind;lamp.name=kind;fixtures.add(lamp);
 const lens=new THREE.MeshStandardMaterial({color:'#fff5df',emissive:'#ffe6ba',emissiveIntensity:.35});
 const face=box(w,.004,d,x,y,z,lens,lamp);
 const light=new THREE.SpotLight('#ffe9cc',power,4,Math.PI*.36,.8,2);light.position.set(x,y-.016,z);light.target.position.set(x,.85,z);lamp.add(light,light.target);
 taskLights.push({light,lens,kind,power});return face;
}
for(const z of [-.62,-.22])taskLight(.94,1.6555,z,.04,.04,'hoodLight',.17).name='Extractor lamp lens';
for(const [x,z,length] of [[-1.20,.04,.58],[-1.20,.97,.58],[1.20,-1.425,.73],[1.20,.53,.31]])taskLight(x,1.437,z,.017,length,'cabinetLight',.12);
const ceilingFixtures=new THREE.Group();ceilingFixtures.name='Three recessed offshot spotlights';room.add(ceilingFixtures);
for(const z of [-1.05,.15,1.35]){
 const lamp=new THREE.Group();lamp.userData.choice='ceilingLight';ceilingFixtures.add(lamp);
 cylinder(.047,.009,0,2.591,z,white,lamp);cylinder(.037,.01,0,2.586,z,silver,lamp);
 const lens=new THREE.MeshStandardMaterial({color:'#faf8ed',emissive:'#ffe9ce',emissiveIntensity:.4});cylinder(.03,.005,0,2.579,z,lens,lamp);
 const light=new THREE.SpotLight('#ffe9d2',1.45,6,Math.PI*.34,.75,2);light.position.set(0,2.565,z);light.target.position.set(0,0,z);lamp.add(light,light.target);taskLights.push({light,lens,kind:'ceilingLight',power:1.45});
}

const cornerBox=box(.11,1.65,.11,-1.17,1.77,-1.79,paint);cornerBox.name='Boxed corner beside shelves';
const vent=new THREE.Group();vent.position.set(-.73,2.13,-1.846);vent.name='Vent above clock';room.add(vent);box(.27,.16,.018,0,0,0,white,vent);for(let i=0;i<10;i++)box(.235,.004,.009,0,-.061+i*.013,.014,material('#92948b'),vent);
const airbrick=new THREE.Group();airbrick.name='Exterior airbrick behind clock-wall ventilation grille';airbrick.position.set(-.73,2.13,-2.084);room.add(airbrick);
const ventClay=material('#986c54',.95);box(.24,.15,.024,0,0,0,ventClay,airbrick);for(let row=0;row<4;row++)for(let col=0;col<7;col++)box(.019,.021,.003,-.096+col*.032,-.048+row*.032,-.013,dark,airbrick);
const ductVent=new THREE.Group();ductVent.name='Exterior extractor duct airbrick';ductVent.position.set(1.02,2.36,-2.088);room.add(ductVent);
box(.25,.16,.026,0,0,0,ventClay,ductVent);for(let row=0;row<4;row++)for(let col=0;col<7;col++)box(.019,.023,.003,-.096+col*.032,-.05+row*.033,-.014,dark,ductVent);
const clockCanvas=texture((c,w,h)=>{c.fillStyle='#f5f2e7';c.fillRect(0,0,w,h);c.fillStyle='#252b29';c.font='40px sans-serif';c.textAlign='center';c.textBaseline='middle';for(let i=1;i<=12;i++){const a=i*Math.PI/6;c.fillText(i,w/2+Math.sin(a)*w*.38,h/2-Math.cos(a)*h*.38);}},256,256);
const clock=new THREE.Mesh(new THREE.CircleGeometry(.115,40),new THREE.MeshStandardMaterial({map:clockCanvas}));clock.position.set(-.73,1.73,-1.833);clock.name='Clock below vent beside sink window';room.add(clock);const rim=new THREE.Mesh(new THREE.TorusGeometry(.116,.008,8,48),dark);rim.position.copy(clock.position);rim.position.z+=.005;room.add(rim);
clock.userData.choice='clock';rim.userData.choice='clock';
const clockHands=new THREE.Group();clockHands.position.copy(clock.position);clockHands.position.z+=.010;clockHands.userData.choice='clock';room.add(clockHands);
const hourHand=new THREE.Group(),minuteHand=new THREE.Group();clockHands.add(hourHand,minuteHand);box(.006,.06,.002,0,.023,0,dark,hourHand);box(.004,.086,.002,0,.036,.002,dark,minuteHand);const clockPin=new THREE.Mesh(new THREE.CircleGeometry(.005,12),dark);clockPin.position.z=.005;clockHands.add(clockPin);

const tileGroups=new THREE.Group();tileGroups.userData.choice='tiles';room.add(tileGroups);const upstands=new THREE.Group();upstands.userData.choice='upstand';room.add(upstands);
function clearGroup(g){for(const child of [...g.children]){child.traverse(m=>m.geometry?.dispose());g.remove(child);}}
function tileCourses(){return Math.max(0,['zero','one','two','three','four'].indexOf(state.tiles));}
function tileRun(length,x,z,rotation,base,rows=2){
 if(rows===0)return;
 const g=new THREE.Group();g.position.set(x,base,z);g.rotation.y=rotation;tileGroups.add(g);g.name=`${rows} rows of bevelled white metro tiles`;
 box(length,rows*.103,.006,0,rows*.0515,0,grout,g);
 const runScale=Math.hypot(Math.cos(rotation)*room.scale.x,Math.sin(rotation)*room.scale.z),tileWidth=.2/runScale,pitch=.203/runScale;
 for(let row=0;row<rows;row++){
  const offset=(row%2)*pitch/2;
  for(let left=-length/2-pitch+offset;left<length/2;left+=pitch){
   const a=Math.max(left,-length/2),b=Math.min(left+tileWidth,length/2),w=b-a;if(w<=.005)continue;
   const bevel=Math.min(.006,w*runScale/4),shape=new THREE.Shape(),hw=w*runScale/2-bevel,hh=.05-bevel;
   shape.moveTo(-hw,-hh);shape.lineTo(hw,-hh);shape.lineTo(hw,hh);shape.lineTo(-hw,hh);shape.closePath();
   const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.003,steps:1,bevelEnabled:true,bevelSegments:1,bevelSize:bevel,bevelThickness:.004,curveSegments:1}),tileGlaze);
   mesh.scale.x=1/runScale;mesh.position.set((a+b)/2,row*.103+.0515,.008);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
  }
 }
}
function makeTiles(){
 clearGroup(tileGroups);clearGroup(upstands);
 const h=state.upstand==='none'?0:.095,base=.92+h,rows=tileCourses(),top=rows*.103;
 upstandMat.color.set('#ffffff');
 if(h){box(.02,h,3.7,-1.35,.92+h/2,0,upstandMat,upstands).name='Left upstand to rear corner';box(.02,h,2.70,1.35,.92+h/2,-.50,upstandMat,upstands).name='Right upstand to rear corner';const rear=new THREE.Group();rear.name='Rear upstand returning into sink sill';upstands.add(rear);box(.62,h,.02,-1.03,.92+h/2,-1.85,upstandMat,rear).name='Left window upstand return';box(.48,h,.02,1.10,.92+h/2,-1.85,upstandMat,rear).name='Right window upstand return';box(1.62,.030,.020,.07,.9325,-1.84,upstandMat,rear).name='Continuous upstand flush beneath sink sill';}
 for(const [length,x,z,r] of [[2.21,-1.34,.745,Math.PI/2],[.55,-1.34,-1.575,Math.PI/2],[.71,-.995,-1.835,0],[.57,1.065,-1.835,0],[2.685,1.34,-.4925,-Math.PI/2]])tileRun(length,x,z,r,base,rows);
 if(rows)tileRun(.82,1.32,-.42,-Math.PI/2,base+top,Math.max(1,Math.round((1.6-base-top)/.103)));
}
function socket(x,y,z,rot){const g=new THREE.Group();g.userData.choice='socket';g.position.set(x,y,z);g.rotation.y=rot;room.add(g);box(.147,.086,.007,0,0,0,socketMat,g);for(const dx of [-.035,.035]){for(const [xx,yy] of [[0,.011],[-.013,-.014],[.013,-.014]])box(.005,.013,.001,dx+xx,yy,.004,dark,g);box(.013,.017,.003,dx+.017,.024,.005,white,g);}box(.016,.005,.001,0,.026,.004,dark,g);}
socket(-1.162,1.095,1.22,Math.PI/2);socket(-1.162,1.095,-1.585,Math.PI/2);socket(1.155,1.095,-1.28,-Math.PI/2);
const knifeParts=[];const knifeBar=box(.025,.048,.32,1.15,1.3,-.94,oak);
for(const spec of [{name:'Paring knife',z:-1.055,length:.09,width:.019},{name: "Chef's knife",z:-.95,length:.20,width:.043},{name:'Serrated bread knife',z:-.84,length:.215,width:.025}]){
 const knife=new THREE.Group();knife.name=spec.name;knife.position.set(1.127,1.3,spec.z);knife.rotation.y=-Math.PI/2;room.add(knife);knifeParts.push(knife);
 const handleLength=spec.name==='Paring knife'?.085:.105;box(.021,handleLength,.015,0,-handleLength/2-.013,.006,dark,knife);box(.025,.01,.018,0,-.01,.006,silver,knife);
 for(const y of [-.031,-handleLength+.007]){const rivet=new THREE.Mesh(new THREE.CircleGeometry(.002,10),silver);rivet.position.set(0,y,.014);knife.add(rivet);}
 const blade=new THREE.Shape(),w=spec.width,h=spec.length;blade.moveTo(-w/2,0);blade.lineTo(-w/2,h-.017);
 if(spec.name==='Serrated bread knife'){blade.quadraticCurveTo(-w/2,h,w/2,h);for(let y=h;y>.009;y-=.008){blade.lineTo(w/2,y-.003);blade.lineTo(w/2-.0027,y-.006);blade.lineTo(w/2,y-.008);}blade.lineTo(w/2,0);}
 else{blade.quadraticCurveTo(-w/2,h,-w/2+.006,h);blade.quadraticCurveTo(w/2,h*.65,w/2,h*.24);blade.lineTo(w/2,0);}
 blade.closePath();const steel=new THREE.Mesh(new THREE.ExtrudeGeometry(blade,{depth:.002,bevelEnabled:true,bevelThickness:.0004,bevelSize:.0004,bevelSegments:1,steps:1,curveSegments:12}),silver);steel.position.z=.007;steel.castShadow=true;steel.receiveShadow=true;knife.add(steel);
}
for(const object of room.children){
 if(object===tileGroups||object===upstands||object===hob)continue;
 if(object===oven){object.position.x+=.16;continue;}
 if(Math.abs(object.position.x)>.55)object.position.x+=Math.sign(object.position.x)*.16;
}
shelves.position.x=-.16;
for(const wall of room.children){
 if(wall.isMesh&&wall.material===paint){const size=wall.geometry.parameters;
  if(size.width===.08){wall.geometry.dispose();wall.geometry=new THREE.BoxGeometry(dimensions.wallThickness,size.height,size.depth);wall.position.x+=Math.sign(wall.position.x)*(dimensions.wallThickness-.08)/2;}
  else if(size.depth===.08){wall.geometry.dispose();wall.geometry=new THREE.BoxGeometry(size.width,size.height,dimensions.wallThickness);wall.position.z-=(dimensions.wallThickness-.08)/2;}
 }
}
room.name='Kitchen';
room.scale.z=dimensions.kitchenLength/3.85;
room.scale.x=(dimensions.aisleWidth+1.28)/2.78;
// Keep measured products rigid when the estimated room shell is resized.
for(const product of [sink,tapAssembly])product.scale.set(1/room.scale.x,1,1/room.scale.z);
tapAssembly.position.x=sink.position.x-.029/room.scale.x;tapAssembly.position.z=sink.position.z-.173/room.scale.z;
// Preserve the hood's measured width around its hob centre after room-length scaling.
hood.scale.z=1/room.scale.z;hood.position.z=-.42*(1-1/room.scale.z);hoodChimney.scale.z=1/room.scale.z;
for(const lamp of fixtures.children)if(lamp.userData.choice==='hoodLight'){lamp.scale.z=1/room.scale.z;lamp.position.z=-.42*(1-1/room.scale.z);}
for(const light of shelfLights){light.position.x-=.16;light.position.z*=room.scale.z;light.target.position.x-=.16;light.target.position.z*=room.scale.z;}
const dining=addDining({scene,box,cylinder,material,paint,white,silver,dark,oak,wood,surfaces,glass,rollerBlind});
const brickMap=texture((c,w,h)=>{
 const rand=seeded(894),bw=w/4,bh=h/4,joint=w/90;c.fillStyle='#ada394';c.fillRect(0,0,w,h);
 for(let row=0;row<4;row++)for(let col=-1;col<5;col++){const x=col*bw+(row%2)*bw/2,y=row*bh,tone=Math.floor(rand()*18)-9;c.fillStyle=`rgb(${157+tone},${96+tone},${77+tone})`;c.fillRect(x+joint/2,y+joint/2,bw-joint,bh-joint);c.save();c.beginPath();c.rect(x+joint/2,y+joint/2,bw-joint,bh-joint);c.clip();for(let i=0;i<650;i++){c.fillStyle=rand()>.5?'rgba(219,173,137,.09)':'rgba(65,40,34,.08)';c.fillRect(x+rand()*bw,y+rand()*bh,1+rand()*4,1+rand()*2);}c.restore();}
},1024,342);brickMap.wrapS=brickMap.wrapT=THREE.RepeatWrapping;
const brickBump=texture((c,w,h)=>{const bw=w/4,bh=h/4,joint=w/90;c.fillStyle='#555';c.fillRect(0,0,w,h);c.fillStyle='#ccc';for(let row=0;row<4;row++)for(let col=-1;col<5;col++)c.fillRect(col*bw+(row%2)*bw/2+joint/2,row*bh+joint/2,bw-joint,bh-joint);},1024,342);brickBump.wrapS=brickBump.wrapT=THREE.RepeatWrapping;brickBump.colorSpace=THREE.NoColorSpace;
const brickMat=new THREE.MeshStandardMaterial({name:'Muted red exterior brick',map:brickMap,bumpMap:brickBump,bumpScale:.0018,roughness:.96}),plainExterior=material('#c9bfae',.95),exteriorFaces=[];
function exteriorShell(parent,w,h,d,x,y,z){
 const shell=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),brickMat);shell.name='Exterior brick wrap';shell.position.set(x,y,z);shell.userData.choice='exterior';shell.receiveShadow=true;parent.add(shell);shell.updateWorldMatrix(true,false);
 const pos=shell.geometry.attributes.position,norm=shell.geometry.attributes.normal,uv=shell.geometry.attributes.uv;
 for(let i=0;i<pos.count;i++){const p=shell.localToWorld(new THREE.Vector3().fromBufferAttribute(pos,i)),n=new THREE.Vector3().fromBufferAttribute(norm,i).transformDirection(shell.matrixWorld);uv.setXY(i,(Math.abs(n.x)>.5?p.z:p.x)/.9,(Math.abs(n.y)>.5?p.z:p.y)/.3);}
 exteriorFaces.push(shell);return shell;
}
for(const wall of rearWall.children.filter(o=>o.isMesh)){const {width:w,height:h}=wall.geometry.parameters;exteriorShell(wall,w+.002,h+.002,.066,0,0,-.078);for(const side of [-1,1])if(Math.abs(wall.position.x+side*w/2)>1.58)exteriorShell(wall,.066,h+.002,.222,side*(w/2-.032),0,0);}
for(const wall of room.children.filter(o=>o.isMesh&&o.material===paint&&o.geometry.parameters.width===dimensions.wallThickness)){const {width:w,height:h,depth:d}=wall.geometry.parameters,side=Math.sign(wall.position.x);exteriorShell(wall,.066,h+.002,d+.002,side*(w/2-.032),0,0);}
for(const wall of dining.wallGroups){const {width:w,height:h,depth:d}=wall.geometry.parameters;
 if(wall.name==='Garden lintel')exteriorShell(wall,w+.002,h+.002,.066,0,0,-d/2+.032);
 // The kitchen doorway upright and its returns are interior plaster, not exterior brick.
 if(wall.name==='Dining left'||wall.name==='Dining right')exteriorShell(wall,.066,h+.002,d+.002,(wall.name==='Dining left'?-1:1)*(w/2-.032),0,0);
}
const planter=new THREE.Group();planter.name='Window box outside left window';planter.position.set(-1.72,.98,-.78);scene.add(planter);
const planterMat=material('#6e7565');box(.3,.18,.82,0,0,0,planterMat,planter);box(.26,.012,.77,0,.087,0,material('#4d4637'),planter);
for(let i=0;i<9;i++){const stem=cylinder(.003,.12,0,.15,-.32+i*.08,material('#708255'),planter);for(const side of [-1,1]){const leaf=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),material(i%2?'#687e52':'#83935f'));leaf.scale.set(.045,.065,.013);leaf.position.set(side*.036,.16,-.32+i*.08);leaf.rotation.z=side*.6;planter.add(leaf);}}

scene.traverse(o=>{if(o.isMesh&&o.material===glass)o.castShadow=false;});
const rug=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshStandardMaterial({roughness:1,bumpMap:surfaces.relief(surfaces.weave),bumpScale:.0013}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.003,.06);rug.receiveShadow=true;scene.add(rug);
floor.userData.choice='rug';rug.userData.choice='rug';
const rugPalettes={sage:['#b7beab','#e1dfcf','#899681'],stone:['#c5bfaf','#e4dfd1','#a49d8d'],taupe:['#b7ab9a','#ded5c5','#938874'],blue:['#8f9fa3','#dbd8c8','#616e76'],karajeh:['#b28376','#dfc9ad','#777363'],olive:['#a0a58b','#dad5bc','#747e69'],sand:['#c7b89d','#e2dac6','#7f817a']};
const rugTextures={};
function rugTexture(type){if(rugTextures[type])return rugTextures[type];return rugTextures[type]=texture((c,w,h)=>{
 const rand=seeded(22),col=rugPalettes[type];c.fillStyle=col[0];c.fillRect(0,0,w,h);
 c.strokeStyle=col[1];c.lineWidth=25;c.strokeRect(24,24,w-48,h-48);c.strokeStyle=col[2];c.lineWidth=3;c.strokeRect(43,43,w-86,h-86);c.strokeRect(8,8,w-16,h-16);
 function petal(x,y,r){c.save();c.translate(x,y);c.fillStyle=col[1];for(let i=0;i<8;i++){c.rotate(Math.PI/4);c.beginPath();c.ellipse(0,r*.55,r*.24,r*.55,0,0,Math.PI*2);c.fill();}c.fillStyle=col[2];c.beginPath();c.arc(0,0,r*.2,0,Math.PI*2);c.fill();c.restore();}
 function diamond(x,y,r){c.beginPath();c.moveTo(x,y-r);c.lineTo(x+r*.7,y);c.lineTo(x,y+r);c.lineTo(x-r*.7,y);c.closePath();}
 for(let y=72;y<h-60;y+=72){petal(25,y,12);petal(w-25,y,12);}
 if(type==='blue'){
  c.strokeStyle=col[2];c.lineWidth=2;for(let y=86;y<h-60;y+=104)for(const x of [96,224]){c.beginPath();c.moveTo(x,y-38);c.bezierCurveTo(x-58,y-8,x+54,y+12,x,y+60);c.stroke();petal(x,y,23);petal(x+(x<160?35:-35),y+43,12);}
  for(let y=135;y<h-60;y+=104)petal(160,y,15);
 }else if(type==='karajeh'){
  for(let i=0;i<4;i++){const y=145+i*200;c.save();c.translate(160,y);c.fillStyle=col[2];c.beginPath();c.moveTo(-22,-72);c.lineTo(22,-72);c.lineTo(22,-50);c.lineTo(53,-50);c.lineTo(53,-23);c.lineTo(72,-23);c.lineTo(72,23);c.lineTo(53,23);c.lineTo(53,50);c.lineTo(22,50);c.lineTo(22,72);c.lineTo(-22,72);c.lineTo(-22,50);c.lineTo(-53,50);c.lineTo(-53,23);c.lineTo(-72,23);c.lineTo(-72,-23);c.lineTo(-53,-23);c.lineTo(-53,-50);c.lineTo(-22,-50);c.closePath();c.fill();c.strokeStyle=col[1];c.lineWidth=3;c.stroke();c.fillStyle=col[1];diamond(0,0,49);c.fill();c.fillStyle=col[0];diamond(0,0,25);c.fill();c.restore();}
  for(let y=83;y<h-55;y+=100)for(const x of [66,254]){c.fillStyle=col[2];diamond(x,y,10);c.fill();}
 }else if(type==='olive'){
  c.strokeStyle=col[2];c.lineWidth=2;for(let y=95;y<h-50;y+=115)for(let j=0;j<2;j++){const x=106+j*108;c.beginPath();c.moveTo(x,y-51);c.quadraticCurveTo(x+67,y,x,y+51);c.quadraticCurveTo(x-67,y,x,y-51);c.stroke();petal(x,y,23);}for(let y=152;y<h-60;y+=115)petal(160,y,13);
 }else if(type==='sand'){
  c.strokeStyle=col[2];c.lineWidth=2;for(let y=85;y<h-65;y+=90)for(const x of [73,247]){c.beginPath();c.moveTo(x,y-30);c.bezierCurveTo(x-25,y,x+25,y+10,x,y+60);c.stroke();petal(x,y,13);}
  c.save();c.translate(160,450);c.scale(1,2.8);c.fillStyle=col[2];diamond(0,0,93);c.fill();c.fillStyle=col[1];diamond(0,0,84);c.fill();c.fillStyle=col[0];diamond(0,0,65);c.fill();petal(0,0,36);c.restore();for(const y of [138,762])petal(160,y,35);
 }else{
  for(const y of [h*.25,h*.5,h*.75]){c.save();c.translate(w/2,y);c.scale(1,1.45);c.fillStyle=col[2];diamond(0,0,65);c.fill();petal(0,0,39);c.restore();}
  for(let y=95;y<h-60;y+=110){petal(77,y,16);petal(w-77,y,16);}
 }
 for(let i=0;i<20000;i++){c.fillStyle=`rgba(241,237,225,${.04+rand()*.16})`;c.fillRect(rand()*w,rand()*h,1+rand()*4,2+rand()*4);}
 },320,900);}
function update(){
 for(const face of exteriorFaces)face.material=state.exterior==='plain'?plainExterior:brickMat;
 state.clockMinutes=Math.max(0,Math.min(1439,Number(state.clockMinutes)||0));hourHand.rotation.z=-state.clockMinutes/720*Math.PI*2;minuteHand.rotation.z=-(state.clockMinutes%60)/60*Math.PI*2;rim.material=state.clock==='steel'?silver:dark;
 dining.setTable(state.table||'current',state.tableExtended);dining.setShoeRack(state.shoeRack);dining.setChairs(state.chairs);dining.setRadiator(state.radiator);dining.setArt(state.art);
 const furnitureKey=JSON.stringify([state.table,state.tableExtended,state.shoeRack,state.chairs,state.radiator]);
 if(furnitureKey!==floodFurnitureKey){floodFurnitureKey=furnitureKey;invalidateFloorFlood();syncFloorFlood();}
 if(state.upstand==='stone')state.upstand='white';
 const finish={steel:{color:'#b8bdbf',roughness:.64,metalness:.65,envMapIntensity:.4},chrome:{color:'#d9dfe1',roughness:.14,metalness:1,envMapIntensity:.85},white:{color:'#f2f1ed',roughness:.4,metalness:0,envMapIntensity:.2}}[state.socket]||{color:'#b8bdbf',roughness:.64,metalness:.65,envMapIntensity:.4};
 socketMat.color.set(finish.color);socketMat.roughness=finish.roughness;socketMat.metalness=finish.metalness;socketMat.envMapIntensity=finish.envMapIntensity;socketMat.roughnessMap=state.socket==='steel'?silver.roughnessMap:null;socketMat.bumpMap=state.socket==='steel'?silver.bumpMap:null;socketMat.needsUpdate=true;
 paint.color.set(options.paint.find(v=>v.id===state.paint)?.color||options.paint[0].color);
 grout.color.set(options.grout.find(v=>v.id===state.grout)?.color||options.grout[0].color);makeTiles();
 const barY=.92+(state.upstand==='none'?0:.095)+Math.max(.17,tileCourses()*.103-.055);knifeBar.position.y=barY;knifeParts.forEach(p=>p.position.y=barY);
 state.rugWidth=Math.max(.5,Math.min(.7,Math.round(state.rugWidth*10)/10));state.rugLength=Math.max(1.2,Math.min(2,Math.round(state.rugLength*5)/5));
 rug.visible=state.rug!=='none';if(rug.visible){rug.material.map=rugTexture(state.rug);rug.material.needsUpdate=true;rug.scale.set(state.rugWidth,state.rugLength,1);}
 const lighting=lightingForTime(state.time,roomLighting);
 state.time=lighting.phase;
 const night=lighting.night;
 applyLighting(lighting,{sun,ambient,fill,scene,renderer,reflectionMaterials:[hoodSteel,canopyMaterial]});
 taskLights.forEach(({light,lens,kind,power})=>{light.intensity=state[kind]?power*(night?1:.55):0;lens.emissiveIntensity=state[kind]?(night?1:.4):0;});dining.setTime(night);

 shelfEmitters.forEach(m=>{m.visible=state.lighting;m.material.emissiveIntensity=night?.6:.2;});
 shelfLights.forEach(l=>{l.visible=state.lighting;l.intensity=night?.13:.075;});
 refreshEditor();
 for(const kind of Object.keys(options)){document.querySelectorAll(`#${kind} button`).forEach(b=>{const sel=b.dataset.value===state[kind];b.classList.toggle('selected',sel);b.setAttribute('aria-pressed',sel);});}
}

function preview(kind,item){
 const tile=(rows=2)=>Array.from({length:rows},(_,r)=>Array.from({length:4},(_,i)=>`<rect x="${i*22-10+(r%2)*11}" y="${26+r*10}" width="21" height="9" rx=".8" fill="#faf9f5" stroke="${kind==='grout'?item.color:'#aaa89e'}" stroke-width="1.2"/><path d="M${i*22-8+(r%2)*11},${28+r*10}h17" stroke="white"/>`).join('')).join('');
 let drawing='';
 if(kind==='rug'){
  if(item.id!=='none')return `<svg class="option-preview" viewBox="0 0 80 60" aria-hidden="true"><rect width="80" height="60" fill="#ddc6a2"/><image href="${rugTexture(item.id).image.toDataURL()}" x="25" y="3" width="30" height="54" preserveAspectRatio="none"/></svg>`;
  drawing='<rect width="80" height="60" fill="#ddc6a2"/><path d="M12 0v60m18-60v60m18-60v60m18-60v60" stroke="#bdaa8c"/><path d="M19 0q8 26 0 60m36-60q-7 20 0 60" stroke="#c8b18e" fill="none"/>';

 }
 else if(kind==='tiles'||kind==='grout'||kind==='upstand')drawing=`<rect width="80" height="60" fill="#d2cbbb"/>${kind==='upstand'?'':tile(item.id==='three'?3:2)}<path d="M0 57H80" stroke="#efefeb" stroke-width="6"/>${kind==='upstand'&&item.id==='white'?'<rect y="43" width="80" height="11" fill="#eaeae6" stroke="#c5c6bd"/>':''}`;
 else if(kind==='table')drawing=`<rect width="80" height="60" fill="#e6dfd1"/><path d="M17 34l-3 20m49-20l3 20M25 30v18m31-18v18" stroke="${item.id==='current'?'#343a35':'#a98956'}" stroke-width="4"/><rect x="7" y="17" width="66" height="22" rx="${item.id==='oval'?14:item.id==='scandi'?8:3}" fill="${item.color}" stroke="#9e8054"/><path d="M40 18v20M13 25q26-5 54 0m-49 6q20-4 43 0" fill="none" stroke="#a98a5c" stroke-width=".8"/>`;
 else if(kind==='exterior')drawing=`<rect width="80" height="60" fill="${item.id==='brick'?'#aaa092':item.color}"/>${item.id==='brick'?Array.from({length:5},(_,r)=>Array.from({length:5},(_,i)=>`<rect x="${i*23-(r%2)*11.5}" y="${r*13}" width="21" height="11" fill="${['#9e6653','#a06b58','#a6735c'][(i+r)%3]}"/>`).join('')).join(''):''}`;
 else if(kind==='socket')drawing=`<rect x="7" y="11" width="66" height="38" rx="3" fill="${item.color}" stroke="#858d8b"/>${[26,54].map(x=>`<path d="M${x} 24v5m-7 4v5m14-5v5" stroke="#303735" stroke-width="3"/><rect x="${x-3}" y="15" width="6" height="5" rx="1" fill="#eceeeb"/>`).join('')}<rect x="36" y="18" width="8" height="3" rx="1.5" fill="#303735"/>`;



 else if(kind==='chairs')drawing=`<path d="M23 53l5-24m30 24l-7-24M28 39l-4-28q15-13 31 0l-4 28" fill="none" stroke="${item.id==='current'?'#88897f':'#b99562'}" stroke-width="4"/>${item.id==='nel'?'<path d="M31 12v20m8-23v23m8-20v20" stroke="#b99562" stroke-width="2"/>':'<path d="M27 13q13-9 26 0v11H27z" fill="'+(item.id==='current'?'#797a73':'#c6a477')+'"/>'}<path d="M25 32h29l4 8H22z" fill="${item.color}" stroke="#715c45"/>`;
 else if(kind==='art')drawing=`<rect width="80" height="60" fill="#d2cbbb"/>${Array.from({length:item.id==='three'?3:2},(_,i)=>`<rect x="${7+i*(item.id==='three'?24:34)}" y="17" width="${item.id==='three'?20:28}" height="27" fill="#f2eee4" stroke="#303936" stroke-width="2"/><path d="M${12+i*(item.id==='three'?24:34)} 32q4-12 9 0q-4 8-9 0" fill="${i===1?'#a05242':'#486b60'}"/>`).join('')}`;
 else if(kind==='clock')drawing=`<rect width="80" height="60" fill="#d2cbbb"/><circle cx="40" cy="30" r="24" fill="#f5f4ef" stroke="${item.color}" stroke-width="4"/><path d="M40 10v4m20 16h-4M40 50v-4M20 30h4M40 16v14l-9 6" fill="none" stroke="#29322d" stroke-width="2"/>`;
 else if(kind==='rugSize'){const width=item.width*45,height=item.length*23;drawing=`<rect width="80" height="60" fill="#d5bd99"/><rect x="${40-width/2}" y="${30-height/2}" width="${width}" height="${height}" fill="#abb09e" stroke="#777e68" stroke-width="2"/><text x="40" y="34" text-anchor="middle" fill="#404b3d" font-size="12">${item.id.toUpperCase()}</text>`;}
 else if(kind==='shoeRack')drawing=`<rect width="80" height="60" fill="#ded6c7"/><path d="M10 53V10h60v43" fill="none" stroke="${item.color}" stroke-width="5"/>${item.id==='current'?'':'<rect x="6" y="8" width="68" height="5" fill="#b99562"/>'}${[22,32,42,52].map(y=>`<path d="M11 ${y}h58" stroke="${item.id==='current'?'#a4abaa':item.color}" stroke-width="3"/><path d="M19 ${y-3}q0-9 6-5l8 3v2zm28 0q0-9 6-5l8 3v2z" fill="#4c5958"/>`).join('')}`;
 else if(kind==='radiator')drawing=`<rect width="80" height="60" fill="#d2cbbb"/><path d="M0 54H80" stroke="#e8e5d9" stroke-width="5"/>${item.id==='panel'?'<rect x="9" y="17" width="62" height="30" rx="2" fill="#eeeae1" stroke="#c3c2b6"/>'+Array.from({length:13},(_,i)=>`<path d="M${14+i*4.3} 20v24" stroke="#cccbbf"/>`).join(''):Array.from({length:12},(_,i)=>`<rect x="${10+i*5}" y="16" width="3.7" height="31" rx="1.8" fill="#f7f4eb" stroke="#b9b9ad" stroke-width=".7"/>`).join('')}<path d="M12 47v7m54-7v7" stroke="#bfc5c2" stroke-width="2"/>`;
 else if(kind==='time')drawing=item.id!=='night'?'<rect width="80" height="60" fill="#dbe9ec"/><circle cx="57" cy="17" r="9" fill="#fff4c4"/><path d="M13 9v42h51M13 31h50M36 9v42" stroke="white" stroke-width="4"/>':'<rect width="80" height="60" fill="#293441"/><path d="M61 8a11 11 0 1 0 8 17A13 13 0 0 1 61 8" fill="#e0e4d8"/><path d="M35 0v17m-12 9h24l-6-9H29z" fill="#c9a475" stroke="#b4996c"/><path d="M28 28L8 58h64L42 28" fill="#e7c381" opacity=".28"/>';
 else drawing=`<rect width="80" height="60" fill="${item.color}"/><path d="M0 52H80" stroke="#eae8dc" stroke-width="5"/><rect x="48" y="18" width="25" height="32" fill="#7e8f82"/><rect x="51" y="21" width="19" height="25" fill="none" stroke="#a1af9d"/><path d="M64 33v6" stroke="#d8dcdb" stroke-width="2"/>`;
 return `<svg class="option-preview" viewBox="0 0 80 60" aria-hidden="true">${drawing}</svg>`;
}
const editor=document.querySelector('#item-editor');
const editorChoices=document.querySelector('#item-choices');
const choiceLabels={wallView:'Wall visibility',exterior:'Exterior finish',table:'Dining table',tiles:'Metro tiles',grout:'Grout colour',upstand:'Upstand',paint:'Paint colour',chairs:'Dining chairs',socket:'Socket finish',radiator:'Radiator',art:'Wall prints',rug:'Runner',rugSize:'Runner size',clock:'Clock',shoeRack:'Shoe rack',lighting:'Shelf lighting',cabinetLight:'Under-cupboard lighting',hoodLight:'Extractor lights',ceilingLight:'Offshot spotlights',time:'Morning, noon or night'};
const lightKinds=new Set(['lighting','cabinetLight','hoodLight','ceilingLight']);
const lightOptions=[{id:'on',name:'Lights on',color:'#eddfbd'},{id:'off',name:'Lights off',color:'#939b91'}];
function choose(kind,id){if(kind==='tableExtended'&&state.table==='current')id='off';if(kind==='table'&&id==='current')state.tableExtended=false;if(kind==='upstand')state.tiles=id==='none'?'two':'zero';if(kind==='time')state.clockMinutes=clockMinutesForTime(id);if(kind==='rugSize'){const size=options.rugSize.find(s=>s.id===id);if(size){state.rugWidth=size.width;state.rugLength=size.length;}}state[kind]=lightKinds.has(kind)||kind==='tableExtended'?id==='on':id;update();}
function refreshEditor(){
 const fixed=state.table==='current',extension=document.querySelector('#table-extended');if(extension){extension.checked=!!state.tableExtended;extension.disabled=fixed;}const extensionRow=document.querySelector('#table-extension-row');if(extensionRow)extensionRow.hidden=fixed;const tableName=document.querySelector('#table-selection');if(tableName)tableName.textContent=options.table.find(t=>t.id===state.table)?.name||'Current table';const tableSize=document.querySelector('#table-size');if(tableSize)tableSize.textContent=fixed?'180 × 88 cm · fixed size':(state.tableExtended?'240':'180')+' × 90 cm';const tableStatus=document.querySelector('#table-status');if(tableStatus)tableStatus.textContent=fixed?'The fixed table does not extend.':'Oak table concept · 180–240 cm';
 const clockTime=document.querySelector('#clock-time');if(clockTime)clockTime.value=String(Math.floor(state.clockMinutes/60)).padStart(2,'0')+':'+String(state.clockMinutes%60).padStart(2,'0');
 const slider=document.querySelector('#tile-courses');if(slider){slider.value=String(tileCourses());document.querySelector('#course-value').textContent=tileCourses()===0?'No tiles':slider.value+' full courses';}
 const detail=document.querySelector('#rug-detail');if(detail)detail.textContent=descriptions[state.rug];const link=document.querySelector('#rug-source'),source=rugSources[state.rug];if(link){link.hidden=!source;if(source){link.href=source.url;link.textContent='Related retail design: '+source.name;}}
 document.querySelectorAll('#item-choices button').forEach(b=>{const active=lightKinds.has(b.dataset.kind)?(state[b.dataset.kind]?'on':'off'):state[b.dataset.kind];const selected=active===b.dataset.value;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',selected);});
}
function openEditor(kind,point=null){
 if(kind==='upstand')kind='tiles';
 const kinds=kind==='tiles'?['upstand','tiles','grout']:kind==='rug'?['rugSize','rug']:kind==='exterior'?['exterior','wallView']:[kind];
 document.querySelector('#item-title').textContent=kind==='tiles'?'Upstand, tiles & grout':choiceLabels[kind];editorChoices.replaceChildren();
 editor.dataset.kind=kind;
 if(kind==='table'){
  const summary=document.createElement('div');summary.className='table-summary';const name=document.createElement('strong');name.id='table-selection';const size=document.createElement('div');size.id='table-size';const status=document.createElement('p');status.id='table-status';summary.append(name,size,status);editorChoices.append(summary);
  const label=document.createElement('label');label.className='extension-row';label.id='table-extension-row';const text=document.createElement('span');text.textContent='Extend table';const input=document.createElement('input');input.id='table-extended';input.type='checkbox';input.setAttribute('role','switch');input.setAttribute('aria-label','Extend table to 240 centimetres');input.onchange=e=>choose('tableExtended',e.target.checked?'on':'off');label.append(text,input);editorChoices.append(label);
 }

 for(const key of kinds){
  const section=document.createElement('section'),label=document.createElement('h3'),choices=document.createElement('div');label.textContent=choiceLabels[key];choices.className='choices';section.append(label,choices);
  if(key==='table'){
   label.textContent='Choose a table';choices.className='choices table-choices';for(const item of options.table){const b=document.createElement('button');b.type='button';b.className='choice table-choice';b.dataset.kind='table';b.dataset.value=item.id;b.innerHTML=`${preview('table',item)}<span class="option-copy"><strong>${item.name}</strong><small>${item.id==='current'?'Fixed · 180 cm':'Extending · 180–240 cm'}</small></span>`;b.onclick=()=>choose('table',item.id);choices.append(b);}
  }else if(key==='rugSize'){
   choices.className='choices runner-sizes';for(const size of options.rugSize){const b=document.createElement('button');b.type='button';b.className='choice';b.dataset.kind='rugSize';b.dataset.value=size.id;b.innerHTML=`<strong>${size.id.toUpperCase()}</strong><span>${Math.round(size.width*100)} × ${Math.round(size.length*100)} cm</span>`;b.onclick=()=>choose('rugSize',size.id);choices.append(b);}
  }else if(key==='tiles'){
   choices.className='course-control';const label=document.createElement('label');label.htmlFor='tile-courses';label.innerHTML='<span id="course-value"></span><span>0–4 rows</span>';const slider=document.createElement('input');slider.id='tile-courses';slider.type='range';slider.min='0';slider.max='4';slider.step='1';slider.setAttribute('aria-label','Number of full tile courses');slider.oninput=e=>choose('tiles',['zero','one','two','three','four'][Number(e.target.value)]);choices.append(label,slider);
  }else for(const item of lightKinds.has(key)?lightOptions:options[key]){const b=document.createElement('button');b.type='button';b.className='choice';b.dataset.kind=key;b.dataset.value=item.id;b.innerHTML=`${preview(lightKinds.has(key)?'time':key,lightKinds.has(key)?{...item,id:item.id==='on'?'night':'day'}:item)}<span>${item.name}</span>`;b.onclick=()=>choose(key,item.id);choices.append(b);}
  editorChoices.append(section);
 }
 if(kind==='rug'){
  const detail=document.createElement('p');detail.id='rug-detail';detail.className='detail';editorChoices.append(detail);const link=document.createElement('a');link.id='rug-source';link.className='detail';link.target='_blank';link.rel='noopener noreferrer';editorChoices.append(link);
 }
 if(kind==='clock'){const label=document.createElement('label');label.className='clock-time-label';label.textContent='Clock time';const input=document.createElement('input');input.id='clock-time';input.type='time';input.setAttribute('aria-label','Clock time');input.onchange=e=>{const parts=e.target.value.split(':').map(Number);if(parts.length===2&&parts.every(Number.isFinite))choose('clockMinutes',parts[0]*60+parts[1]);};label.append(input);editorChoices.append(label);const note=document.createElement('p');note.className='detail';note.textContent='Morning sets 07:30, noon 13:15 and night 21:00. You can also set the hands here.';editorChoices.append(note);}

 if(kind==='art'){const note=document.createElement('p');note.className='detail';note.textContent='Original geometric illustrations, with matching frames and equal spacing.';editorChoices.append(note);}
 if(kind==='shoeRack'){const note=document.createElement('p');note.className='detail';note.textContent='Alternatives are 91 × 36 × 97 cm concepts, with four shoe shelves and a single rigid frame. Painted option coordinates with the dresser. Product and fit to confirm.';editorChoices.append(note);}
 if(kind==='radiator'){const note=document.createElement('p');note.className='detail';note.textContent='White tubular concept, approximately the existing width and height. Exact model and heat output to confirm.';editorChoices.append(note);}
 if(kind==='chairs'){const note=document.createElement('p');note.className='detail';note.textContent='Illustrative chair concepts. Dimensions and materials are approximate.';editorChoices.append(note);}
 editor.hidden=false;editor.scrollTop=0;refreshEditor();
 const bounds=canvas.getBoundingClientRect(),x=point?point.x-bounds.left:bounds.width/2,y=point?point.y-bounds.top:bounds.height/2;
 editor.style.maxHeight=Math.max(180,bounds.height-32)+'px';const width=editor.offsetWidth||290,height=editor.offsetHeight||240;
 const left=Math.max(12,Math.min(x+16,bounds.width-width-12)),top=Math.max(12,Math.min(y-height/2,bounds.height-height-12));editor.style.left=left+'px';editor.style.top=top+'px';
 document.querySelector('#close-item').focus({preventScroll:true});
}
function closeEditor(){editor.hidden=true;}
document.querySelector('#close-item').onclick=()=>{closeEditor();canvas.focus({preventScroll:true});};
document.addEventListener('pointerdown',e=>{if(!editor.hidden&&!editor.contains(e.target))closeEditor();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!editor.hidden){closeEditor();canvas.focus({preventScroll:true});}});
editor.addEventListener('keydown',e=>{if(e.key==='Escape'){closeEditor();canvas.focus({preventScroll:true});}});
function objectChoice(object){
 for(let node=object;node;node=node.parent){if(node.userData.action)return 'action:'+node.userData.action;if(node.userData.cabinet)return 'cabinet:'+node.userData.cabinet;if(node.userData.blind)return 'blind:'+node.userData.blind;if(node.userData.door)return 'door:'+node.userData.door;if(node.userData.choice)return node.userData.choice;}
 return object.material===work||object.material===upstandMat?'tiles':object.material===paint?'paint':null;
}
function visibleObject(object){for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;}
const raycaster=new THREE.Raycaster();
function pick(clientX,clientY){
 const bounds=canvas.getBoundingClientRect(),point=new THREE.Vector2((clientX-bounds.left)/bounds.width*2-1,1-(clientY-bounds.top)/bounds.height*2);
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);raycaster.setFromCamera(point,camera);
 const meshes=[];scene.traverse(object=>{if(object.isMesh&&!object.userData.pickThrough&&visibleObject(object))meshes.push(object);});
 const hit=raycaster.intersectObjects(meshes,false)[0];return hit?objectChoice(hit.object):null;
}
const controlsHelp=document.querySelector('#controls-help');let helpExpanded=false;
controlsHelp.onclick=()=>{helpExpanded=!helpExpanded;controlsHelp.setAttribute('aria-expanded',helpExpanded);controlsHelp.title=helpExpanded?'Minimise controls help':'Show controls help';document.querySelector('#controls-help-text').hidden=!helpExpanded;document.querySelector('#controls-help-label').hidden=helpExpanded;};
const pointers=new Set();let gesture=null;
canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);gesture=pointers.size===1&&e.button===0?{id:e.pointerId,x:e.clientX,y:e.clientY,time:performance.now()}:null;});
canvas.addEventListener('pointermove',e=>{if(gesture&&Math.hypot(e.clientX-gesture.x,e.clientY-gesture.y)>7){gesture=null;closeEditor();}});
canvas.addEventListener('pointerup',e=>{const start=gesture;pointers.delete(e.pointerId);gesture=null;if(start&&start.id===e.pointerId&&performance.now()-start.time<700&&Math.hypot(e.clientX-start.x,e.clientY-start.y)<=7){const kind=pick(e.clientX,e.clientY);if(kind==='action:tap'){closeEditor();toggleTap();revealWater();}else if(kind==='action:swivel'){closeEditor();swivelTap();revealWater();}else if(kind?.startsWith('action:plug:')){closeEditor();togglePlug(kind.slice(12));revealWater();}else if(kind?.startsWith('action:dresser:')){closeEditor();dining.toggleDresser(kind.slice(15));}else if(kind?.startsWith('action:burner:')){closeEditor();toggleBurner(Number(kind.split(':')[2]));}else if(kind?.startsWith('cabinet:')){closeEditor();toggleCabinet(kind.slice(8));}else if(kind?.startsWith('door:')){closeEditor();dining.toggleDoor(kind.slice(5));}else if(kind?.startsWith('blind:')){closeEditor();toggleBlind(kind.slice(6));}else if(kind)openEditor(kind,{x:e.clientX,y:e.clientY});else closeEditor();}});
canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;});
for(const [kind,items] of [['time',options.time]]){const target=document.querySelector(`#${kind}`);for(const item of items){const button=document.createElement('button');button.type='button';button.className='choice';button.dataset.value=item.id;button.title=item.id==='night'?'Interior lighting after dark':item.id==='morning'?'Representative spring/autumn morning; rear window approximately ESE':'Representative spring/autumn solar noon; southern sun';button.innerHTML=`${preview(kind,item)}<span>${item.name}</span>`;button.onclick=()=>choose(kind,item.id);target.append(button);}}

let noticeTimer;function notify(s){const n=document.querySelector('#notice');n.textContent=s;n.style.opacity=1;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>n.style.opacity=0,2100);}
const views={
 countertop:countertopView,
 entry:{position:[0,1.65,1.15],target:[0,1.18,-1.48]},
 sink:{position:[.05,1.65,-.65],target:[-.15,.85,-1.55],fov:64},
 hob:{position:[-.65,1.65,-.40],target:[1.04,1.70,-.383],fov:68},
 cooking:{position:[-.85,1.65,3.3],target:[1.03,1.35,1.0],fov:64},
 back:{position:[0,1.65,-.9],target:[-.25,1.2,4.8]},
 dining:{position:[-.9,1.65,1.95],target:[-.4,1,4.8]},
 whole:{position:[.25,1.65,4.55],target:[-.15,1.25,-1.55],fov:67},
 top:{position:[-.4,9,1.77],target:[-.4,0,1.75]}
};
/** Apply an aisle waypoint without inheriting orbit damping from earlier input. */
function applyWalkthrough(v){controls.enableDamping=false;camera.fov=64;camera.updateProjectionMatrix();camera.position.set(...v.position);controls.target.set(...v.target);controls.update();controls.enableDamping=true;}
const walkthrough=createWalkthrough(applyWalkthrough,active=>{document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',active&&b.dataset.view==='walkthrough'));const b=document.querySelector('[data-view="walkthrough"]');b.textContent=active?'Stop walkthrough':'Walkthrough';},()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
function view(name){closeEditor();if(name==='walkthrough'){turning.clear();walkthrough.toggle();return;}walkthrough.stop();const v=views[name];camera.fov=v.fov||58;camera.updateProjectionMatrix();camera.position.set(...v.position);controls.target.set(...v.target);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===name));}
canvas.addEventListener('pointerdown',()=>walkthrough.stop(),{capture:true});
canvas.addEventListener('wheel',()=>walkthrough.stop(),{passive:true});
canvas.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d','q','e','Escape'].includes(e.key.length===1?e.key.toLowerCase():e.key))walkthrough.stop();},{capture:true});
window.addEventListener('blur',()=>walkthrough.stop());
document.addEventListener('visibilitychange',()=>{if(document.hidden)walkthrough.stop();});
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>view(b.dataset.view));
function move(direction){walkthrough.stop();const f=new THREE.Vector3();camera.getWorldDirection(f);f.y=0;if(f.length()<.1)f.set(0,0,-1);f.normalize();const side=new THREE.Vector3().crossVectors(f,new THREE.Vector3(0,1,0));const delta=(direction==='left'||direction==='right'?side:f).multiplyScalar(direction==='left'||direction==='back'?-.14:.14);const next=camera.position.clone().add(delta);next.z=THREE.MathUtils.clamp(next.z,-1.5,5.05);next.x=THREE.MathUtils.clamp(next.x,next.z<1.8?-1.15:-2.08,1.21);delta.copy(next).sub(camera.position);camera.position.add(delta);controls.target.add(delta);controls.update();}
document.querySelectorAll('[data-move]').forEach(b=>{let timer;b.onpointerdown=e=>{e.preventDefault();move(b.dataset.move);timer=setInterval(()=>move(b.dataset.move),100);b.setPointerCapture(e.pointerId);};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>clearInterval(timer);});
/** Turn the viewing direction in place, preserving camera position and pitch. */
function turn(angle){walkthrough.stop();const offset=controls.target.clone().sub(camera.position);offset.applyAxisAngle(new THREE.Vector3(0,1,0),angle);controls.target.copy(camera.position).add(offset);controls.update();document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed','false'));}
const presetKeys=['walkthrough','countertop','sink','hob','cooking','dining','top'];
const movementKeys={ArrowUp:'forward',w:'forward',ArrowDown:'back',s:'back',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
const reducedTurnMotion=matchMedia('(prefers-reduced-motion: reduce)');
const turning=createTurnMotion(turn,()=>reducedTurnMotion.matches);
bindTurnControls(canvas,document.querySelectorAll('[data-turn]'),turning);
canvas.addEventListener('keydown',e=>{if(e.altKey||e.ctrlKey||e.metaKey)return;const key=e.key.length===1?e.key.toLowerCase():e.key;const dir=movementKeys[key];if(dir){e.preventDefault();move(dir);}else if(key==='r'){e.preventDefault();view('entry');}else if(key==='i'){e.preventDefault();view('sink');revealWater(true);document.querySelector('#water-tap').focus();}else if(presetKeys[Number(key)-1]){e.preventDefault();view(presetKeys[Number(key)-1]);}});
const shortcutTip=document.querySelector('#shortcut-tip');
/** Show shortcuts on hover and keyboard focus without intercepting scene input. */
function shortcut(button,label){button.title=label+' (scene focused)';button.setAttribute('aria-description',button.title);button.addEventListener('pointerenter',show);button.addEventListener('focus',show);button.addEventListener('pointerleave',hide);button.addEventListener('blur',hide);
 /** Position the shared tooltip inside the scene beside its current control. */
 function show(){shortcutTip.textContent=button.title;shortcutTip.hidden=false;const box=button.getBoundingClientRect(),main=canvas.getBoundingClientRect();shortcutTip.style.left=Math.max(8,Math.min(box.left-main.left,main.width-shortcutTip.offsetWidth-8))+'px';shortcutTip.style.top=(box.top-main.top>main.height/2?box.top-main.top-shortcutTip.offsetHeight-8:box.bottom-main.top+8)+'px';}
 /** Dismiss the tooltip when its control loses hover or focus. */
 function hide(){shortcutTip.hidden=true;}
}
for(const b of document.querySelectorAll('[data-view]'))shortcut(b,b.textContent+' · '+(presetKeys.indexOf(b.dataset.view)+1));
for(const b of document.querySelectorAll('[data-move]')){shortcut(b,b.getAttribute('aria-label')+' · '+({forward:'↑ / W',back:'↓ / S',left:'← / A',right:'→ / D'}[b.dataset.move]));b.addEventListener('click',e=>{if(e.detail===0)move(b.dataset.move);});}
for(const b of document.querySelectorAll('[data-turn]'))shortcut(b,b.getAttribute('aria-label')+' · Hold '+(b.dataset.turn==='left'?'Q':'E'));

new ResizeObserver(()=>{const r=canvas.parentElement.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();}).observe(canvas.parentElement);
const structuralWalls=[rearWall,rightWall,...room.children.filter(o=>o.isMesh&&o.material===paint&&o.geometry.parameters.width===dimensions.wallThickness),...dining.wallGroups];
/** Apply view-only wall visibility without changing the selected paint or exterior material. */
function updateWallVisibility(elevated=camera.position.y>3.3){
 for(const wall of structuralWalls)wall.visible=state.wallView!=='hide';
 if(state.wallView==='auto'){
  rightWall.visible=!elevated&&camera.position.x<1.4;
  for(const wall of dining.wallGroups)wall.visible=!elevated&&(wall.name==='Dining left'?camera.position.x>-2.2:wall.name==='Dining right'?camera.position.x<1.4:wall.name==='Dining front'?camera.position.z<5.3:true);
 }
}
update();view('entry');
await window.kitchenStartup?.stage('Preparing the first view…');
let firstFrame=true;
renderer.setAnimationLoop(()=>{
 turning.tick();walkthrough.tick(performance.now());controls.update();dining.animateDoors();dining.animateDresser();animateBlinds();animateCabinets();animateSinkWater();animateWaterAndFlames();const elevated=camera.position.y>3.3;
 kitchenCeiling.visible=camera.position.y<2.6;diningCeiling.visible=camera.position.y<2.6;
 updateWallVisibility(elevated);
 dining.lampshade.visible=!elevated;ceilingFixtures.traverse(o=>{if(o.isMesh)o.visible=!elevated;});renderer.render(scene,camera);
 if(firstFrame){firstFrame=false;window.kitchenStartup?.ready();}
});

// Inspection surface for acceptance checks and later room work.
window.kitchenModel={walkthrough,sink,bowls,animateCabinets,hoodChimney,microwave,microwaveLeaf,microwaveFascia,hobBaseRun,hobPlate,hood,hob,burners,burnerKnobs,burnerFlames,toggleBurner,renderer,scene,camera,views,view,sinkWater,toggleTap,togglePlug,syncWater,waterReset,bowlVisuals,puddle,tapAssembly,spout,tapLever,leverTarget,waterStream,swivelTap,openEditor,updateWallVisibility,structuralWalls,objectChoice,pick,choose,state,kitchenDoors,blinds,dining};

const publicReference=document.querySelector("#public-reference");
document.querySelector("#public-reference-open").onclick=()=>publicReference.showModal();
document.querySelector("#public-reference-close").onclick=()=>publicReference.close();
