import * as THREE from 'three';
import {dimensions} from './dimensions.js?v=20261101-release42';
import {furnitureWoodUV} from './furniture-wood.js?v=20261101-release42';

export function addDining({scene,box,cylinder,material,paint,white,silver,dark,oak,wood,surfaces,glass,rollerBlind}) {
  const group=new THREE.Group();
  group.name='Dining room';
  scene.add(group);
  const wallGroups=[];
  const grey=material('#92928b'),fabric=material('#797a73'),pine=material('#b8996d'),red=material('#85483b'),green=material('#4e8068');
  const doorWood=surfaces.pine.clone();doorWood.repeat.set(.46,1);doorWood.offset.x=.12;doorWood.needsUpdate=true;pine.map=doorWood;pine.color.set('#e8cda3');pine.bumpMap=surfaces.relief(doorWood);pine.bumpScale=.0007;pine.roughness=.61;
  fabric.bumpMap=surfaces.relief(surfaces.weave);fabric.bumpScale=.001;grey.map=surfaces.grain;grey.bumpMap=surfaces.relief(surfaces.grain);grey.bumpScale=.0006;
  const diningWood=wood.clone();diningWood.repeat.set(dimensions.diningWidth/(dimensions.boardWidth*10),1);diningWood.offset.x=-2.21/(dimensions.boardWidth*10);diningWood.needsUpdate=true;
  box(3.6,.075,3.5,-.41,-.04,3.55,new THREE.MeshPhysicalMaterial({map:diningWood,bumpMap:surfaces.relief(diningWood),bumpScale:.00035,roughness:.48,clearcoat:.32,clearcoatRoughness:.3,envMapIntensity:.65}),group).userData.choice='rug';
  function wall(name,x,y,z,w,h,d){if(name==='Dining left'){x-=(dimensions.wallThickness-w)/2;w=dimensions.wallThickness;}if(name==='Dining right'){x+=(dimensions.wallThickness-w)/2;w=dimensions.wallThickness;}if(name==='Dining front'){z+=(dimensions.wallThickness-d)/2;d=dimensions.wallThickness;}const m=box(w,h,d,x,y,z,paint,group);m.name=name;wallGroups.push(m);return m;}
  wall('Dining left',-2.25,1.3,3.55,.08,2.6,3.5);
  wall('Dining right',1.43,1.3,3.55,.08,2.6,3.5);
  wall('Dining front',-.41,2.36,5.34,3.6,.48,.08);
  wall('Dining front',-.46,1.07,5.34,1.78,2.14,.08);
  wall('Dining front',-2.15,1.07,5.34,.12,2.14,.08);
  wall('Dining front',1.31,1.07,5.34,.16,2.14,.08);
  wall('Garden lintel',-1.82,2.4,1.84,.85,.4,.08);
  wall('Kitchen lintel',0,dimensions.beamUnderside+.15,1.84,2.8,.3,.36);
  wall('Kitchen upright',-1.29,dimensions.beamUnderside/2,1.84,.24,dimensions.beamUnderside,.36);
  for(const x of [-2.2,1.38])box(.03,.12,3.45,x,.06,3.55,white,group);
  const doors=new Map();
  function hinge(parent,leaf,id,x,angle){const pivot=new THREE.Group();pivot.position.x=x;parent.add(pivot);pivot.add(leaf);leaf.position.x=-x;leaf.userData.door=id;doors.set(id,{pivot,angle,open:false});}
  const door=new THREE.Group();door.position.set(-1.82,1.08,1.855);group.add(door);
  for(const x of [-.37,.37])box(.06,2.14,.16,x,0,.04,white,door);
  for(const y of [-1.04,1.04])box(.8,.06,.16,0,y,.04,white,door);
  box(.74,.06,.12,0,.83,.04,white,door);box(.67,.15,.018,0,.935,.04,glass,door);
  const gardenLeaf=new THREE.Group();box(.64,1.73,.025,0,-.125,.05,glass,gardenLeaf);
  for(const x of [-.335,.335])box(.045,1.82,.065,x,-.125,.05,white,gardenLeaf);for(const y of [-1.015,.765])box(.7,.06,.065,0,y,.05,white,gardenLeaf);
  box(.02,.13,.05,-.28,-.05,.105,silver,gardenLeaf);hinge(door,gardenLeaf,'garden',.35,-Math.PI*.48);
  rollerBlind(door,'back-door',.85,2.15,0,1.15,.17);
  function panelDoor(x,hand=1){
   const d=new THREE.Group();d.position.set(x,1.06,5.29);d.rotation.y=Math.PI;group.add(d);const leaf=new THREE.Group();
   box(.73,2.07,.045,0,0,0,pine,leaf);for(const xx of [-.24,0,.24])box(.014,1.87,.009,xx,0,.028,oak,leaf);for(const yy of [-.67,.16,.93])box(.69,.07,.01,0,yy,.03,oak,leaf);
   for(const side of [-1,1]){const knob=new THREE.Mesh(new THREE.SphereGeometry(.022,12,12),silver);knob.position.set(hand*.27,-.05,side*.06);leaf.add(knob);}for(const yy of [-.67,.16,.93])box(.69,.065,.013,0,yy,-.03,pine,leaf);
   for(const y of [-.75,0,.75])cylinder(.008,.065,-hand*.36,y,.034,silver,d);
   d.name=x>0?'Right dining door':'Left dining door';hinge(d,leaf,x>0?'right':'left',-hand*.365,-hand*Math.PI*.48);
  }
  function toggleDoor(id){const door=doors.get(id);if(door)door.open=!door.open;}
  function animateDoors(){for(const {pivot,angle,open} of doors.values()){const target=open?angle:0;pivot.rotation.y=THREE.MathUtils.lerp(pivot.rotation.y,target,.14);if(Math.abs(target-pivot.rotation.y)<.001)pivot.rotation.y=target;}}
  panelDoor(-1.72,-1);panelDoor(.82,1);
  const mat=box(.72,.009,.46,-1.81,.005,2.21,material('#5c594d'),group);mat.name='Back-door mat';
  const coir=material('#9b8867');coir.bumpMap=surfaces.relief(surfaces.weave);coir.bumpScale=.002;box(.66,.009,.4,-1.81,.009,2.21,coir,group);
  const table=new THREE.Group();table.position.set(-.26,0,3.55);group.add(table);table.name='Existing 180 cm table';table.userData.choice='table';
  const tableWood=surfaces.oak.clone();tableWood.repeat.set(1,1);tableWood.needsUpdate=true;
  const topMat=new THREE.MeshPhysicalMaterial({map:tableWood,bumpMap:surfaces.relief(tableWood),bumpScale:.00045,color:'#d6ba8e',roughness:.52,clearcoat:.15,clearcoatRoughness:.4,envMapIntensity:.5});
  furnitureWoodUV(box(dimensions.tableLength,.055,.88,0,.755,0,topMat,table),'x');
  for(const x of [-.69,.69]){box(.07,.7,.06,x,.35,-.32,dark,table);box(.07,.7,.06,x,.35,.32,dark,table);box(.07,.06,.69,x,.06,0,dark,table);}
  const woodTable=new THREE.Group();woodTable.name='Extending oak table concept';woodTable.userData.choice='table';woodTable.position.copy(table.position);group.add(woodTable);
  const tableOak=new THREE.MeshPhysicalMaterial({map:tableWood,bumpMap:surfaces.relief(tableWood),bumpScale:.00035,color:'#eee3ca',roughness:.56,clearcoat:.12,clearcoatRoughness:.42,envMapIntensity:.5});

  const seamMat=material('#9f825c',.75);let tableKey='';
  function setTable(style,extended){
   const length=extended&&style!=='current'?2.4:1.8,key=style+':'+length;table.visible=style==='current';woodTable.visible=!table.visible;
   const spread=style==='oval'?(length===2.4?1.17:.8):(length===2.4?1.42:1);for(const chairs of [currentChairs,nelChairs,leatherChairs,scandiChairs])for(let i=0;i<chairs.children.length;i++){const c=chairs.children[i];c.userData.baseX??=c.position.x;c.position.x=c.userData.baseX*spread;}
   if(key===tableKey)return;tableKey=key;
   for(const child of [...woodTable.children]){child.traverse(o=>o.geometry?.dispose());woodTable.remove(child);}if(style==='current')return;
   const width=.9,shape=new THREE.Shape(),radius=style==='scandi'?.15:.055;
   if(style==='oval')shape.absellipse(0,0,length/2,width/2,0,Math.PI*2,false,0);
   else{const x=length/2,z=width/2,r=radius;shape.moveTo(-x+r,-z);shape.lineTo(x-r,-z);shape.quadraticCurveTo(x,-z,x,-z+r);shape.lineTo(x,z-r);shape.quadraticCurveTo(x,z,x-r,z);shape.lineTo(-x+r,z);shape.quadraticCurveTo(-x,z,-x,z-r);shape.lineTo(-x,-z+r);shape.quadraticCurveTo(-x,-z,-x+r,-z);}
   const top=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.035,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:3,steps:1,curveSegments:40}),tableOak);top.rotation.x=-Math.PI/2;top.position.y=.731;top.name='Oak tabletop';top.castShadow=true;top.receiveShadow=true;woodTable.add(top);
   const legX=length/2-(style==='oval'?.32:.18),legZ=style==='oval'?.24:.31;
   for(const x of [-legX,legX])for(const z of [-legZ,legZ]){const geo=new THREE.CylinderGeometry(style==='scandi'?.035:.046,style==='scandi'?.021:.036,.70,style==='scandi'?16:4);const leg=new THREE.Mesh(geo,tableOak);leg.rotation.y=Math.PI/4;leg.position.set(x,.35,z);leg.castShadow=true;leg.receiveShadow=true;woodTable.add(leg);}
   for(const z of [-legZ,legZ])box(legX*2,.085,.025,0,.677,z,tableOak,woodTable);for(const x of [-legX,legX])box(.025,.085,legZ*2,x,.677,0,tableOak,woodTable);
   for(const x of extended?[-.3,.3]:[0]){const seamWidth=style==='oval'?width*Math.sqrt(1-(x/(length/2))**2):width-.015;box(.0015,.0007,seamWidth,x,.7705,0,seamMat,woodTable);}
   // Top boards and long aprons run lengthwise; end aprons run across the table.
   for(const part of woodTable.children)if(part.material===tableOak)furnitureWoodUV(part,part.geometry.type==='BoxGeometry'&&part.geometry.parameters.depth>part.geometry.parameters.width?'z':'x');
   woodTable.userData.length=length;woodTable.userData.width=width;woodTable.userData.style=style;
  }
  const currentChairs=new THREE.Group();group.add(currentChairs);currentChairs.name='Current chairs';currentChairs.userData.choice='chairs';
  function chair(x,z,rot,child=false){const c=new THREE.Group();c.position.set(x,0,z);c.rotation.y=rot;currentChairs.add(c);const w=child?.34:.44,h=child?.43:.46,d=child?.32:.43;const body=child?white:fabric;box(w,.065,d,0,h,0,body,c);const back=box(w,.35,.06,0,h+.21,-d/2+.02,body,c);back.rotation.x=-.08;for(const xx of [-w*.39,w*.39])for(const zz of [-d*.36,d*.36]){const leg=box(child?.019:.025,h,.025,xx,h/2,zz,child?green:pine,c);leg.rotation.z=xx>0?-.045:.045;}c.name=child?'Existing child chair':'Existing grey chair';}
  for(const x of [-.6,0,.6])chair(x,2.82,0);
  chair(-.6,4.02,Math.PI,true);chair(0,4.02,Math.PI,true);chair(.6,4.02,Math.PI);
  const nelChairs=new THREE.Group();group.add(nelChairs);nelChairs.name='Habitat Nel natural oak chairs';nelChairs.userData.choice='chairs';
  function rod(a,b,r,mat,parent){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.8,r,delta.length(),12),mat);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
  function nel(x,z,rot){
   const c=new THREE.Group();c.name='Nel 47 x 48 cm';c.position.set(x,0,z);c.rotation.y=rot;nelChairs.add(c);
   const seat=new THREE.Shape();seat.moveTo(-.19,-.205);seat.lineTo(.19,-.205);seat.quadraticCurveTo(.235,-.205,.235,-.16);seat.lineTo(.215,.17);seat.quadraticCurveTo(.21,.205,.17,.205);seat.lineTo(-.17,.205);seat.quadraticCurveTo(-.21,.205,-.215,.17);seat.lineTo(-.235,-.16);seat.quadraticCurveTo(-.235,-.205,-.19,-.205);
   const pad=new THREE.Mesh(new THREE.ExtrudeGeometry(seat,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.004,bevelThickness:.003}),oak);pad.rotation.x=-Math.PI/2;pad.position.y=.423;pad.castShadow=true;pad.receiveShadow=true;c.add(pad);
   for(const xx of [-1,1])for(const zz of [-1,1])rod([xx*.195,.022,zz*.21],[xx*.163,.42,zz*.145],.019,oak,c);
   rod([-.18,.2,-.175],[.18,.2,-.175],.011,oak,c);for(const xx of [-1,1])rod([xx*.183,.19,-.178],[xx*.183,.19,.178],.01,oak,c);
   const bow=[];for(let i=0;i<=24;i++){const a=Math.PI*i/24;bow.push(new THREE.Vector3(-.218*Math.cos(a),.49+.335*Math.sin(a),-.18-.045*Math.sin(a)));}
   const back=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bow),48,.016,10,false),oak);back.castShadow=true;c.add(back);
   for(const xx of [-.153,-.102,-.051,0,.051,.102,.153]){const top=.49+.335*Math.sqrt(1-(xx/.218)**2);rod([xx,.45,-.17],[xx,top-.012,-.18-.045*(top-.49)/.335],.0065,oak,c);}
  }
  for(const x of [-.6,0,.6]){nel(x,2.82,0);nel(x,4.02,Math.PI);}
  const leatherChairs=new THREE.Group();leatherChairs.name='Swyft Dining Chair 01';leatherChairs.userData.choice='chairs';group.add(leatherChairs);
  const leather=new THREE.MeshPhysicalMaterial({color:'#895330',roughness:.6,clearcoat:.12});leather.bumpMap=surfaces.relief(surfaces.plaster);leather.bumpScale=.0003;
  for(const x of [-.6,0,.6])for(const [z,rot] of [[2.82,0],[4.02,Math.PI]]){
   const c=new THREE.Group();c.name='Swyft 01: 53 × 49 × 72 cm';c.position.set(x,0,z);c.rotation.y=rot;leatherChairs.add(c);
   for(const side of [-1,1]){
    rod([side*.245,.018,.217],[side*.239,.626,.164],.019,oak,c);
    rod([side*.236,.018,-.235],[side*.22,.675,-.191],.020,oak,c);
    rod([side*.223,.401,-.19],[side*.23,.401,.165],.019,oak,c);
   }
   rod([-.228,.401,.17],[.228,.401,.17],.02,oak,c);
   const shape=new THREE.Shape();shape.moveTo(-.19,-.219);shape.lineTo(.19,-.219);shape.quadraticCurveTo(.235,-.219,.235,-.17);shape.lineTo(.215,.155);shape.quadraticCurveTo(.21,.207,.165,.207);shape.lineTo(-.165,.207);shape.quadraticCurveTo(-.21,.207,-.215,.155);shape.lineTo(-.235,-.17);shape.quadraticCurveTo(-.235,-.219,-.19,-.219);
   const pad=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.029,bevelEnabled:true,bevelSize:.007,bevelThickness:.007,bevelSegments:3}),leather);pad.rotation.x=-Math.PI/2;pad.position.y=.414;pad.castShadow=true;c.add(pad);
   const curve=new THREE.CatmullRomCurve3([[-.245,.621,.17],[-.245,.65,-.08],[-.205,.681,-.192],[0,.692,-.221],[.205,.681,-.192],[.245,.65,-.08],[.245,.621,.17]].map(p=>new THREE.Vector3(...p)));
   const vertices=[],uvs=[],indices=[];for(let i=0;i<=48;i++){const t=i/48,p=curve.getPoint(t),d=curve.getTangent(t),normal=new THREE.Vector3(-d.z,0,d.x).normalize(),height=.034+.022*Math.sin(Math.PI*t);for(const [across,up] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const q=p.clone().addScaledVector(normal,across*.012);vertices.push(q.x,q.y+up*height/2,q.z);uvs.push(t,(up+1)/2);}if(i<48)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4;indices.push(a,b,a+4,b,b+4,a+4);}}
   indices.push(0,2,1,0,3,2,192,193,194,192,194,195);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();const rail=new THREE.Mesh(geo,oak);rail.castShadow=true;c.add(rail);
  }
  const scandiChairs=new THREE.Group();scandiChairs.name='Peppermill solid oak Scandi chairs';scandiChairs.userData.choice='chairs';group.add(scandiChairs);
  for(const x of [-.6,0,.6])for(const [z,rot] of [[2.82,0],[4.02,Math.PI]]){
   const c=new THREE.Group();c.name='Scandi concept chair, approximate size';c.position.set(x,0,z);c.rotation.y=rot;scandiChairs.add(c);
   for(const side of [-1,1]){
    rod([side*.205,.02,.20],[side*.183,.435,.16],.021,oak,c);
    const points=[[side*.211,.02,-.215],[side*.185,.43,-.162],[side*.196,.66,-.195],[side*.19,.79,-.23]].map(p=>new THREE.Vector3(...p));
    const post=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),32,.019,12,false),oak);post.castShadow=true;c.add(post);
    rod([side*.182,.417,-.16],[side*.182,.417,.165],.02,oak,c);
   }
   const shape=new THREE.Shape();shape.moveTo(-.175,-.2);shape.lineTo(.175,-.2);shape.quadraticCurveTo(.225,-.2,.225,-.15);shape.lineTo(.205,.165);shape.quadraticCurveTo(.2,.2,.165,.2);shape.lineTo(-.165,.2);shape.quadraticCurveTo(-.2,.2,-.205,.165);shape.lineTo(-.225,-.15);shape.quadraticCurveTo(-.225,-.2,-.175,-.2);
   const seat=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.02,bevelEnabled:true,bevelSize:.004,bevelThickness:.004,bevelSegments:3}),oak);seat.rotation.x=-Math.PI/2;seat.position.y=.435;seat.castShadow=true;c.add(seat);
   const vertices=[],uvs=[],indices=[];for(let i=0;i<=24;i++){const t=i/24,xx=(t-.5)*.40,zz=-.23+.7*xx*xx,yy=.772+.018*(1-(xx/.2)**2);vertices.push(xx,yy-.052,zz,xx,yy+.052,zz);uvs.push(t,0,t,1);if(i<24){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
   const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();const backMat=oak.clone();backMat.side=THREE.DoubleSide;const back=new THREE.Mesh(geo,backMat);back.castShadow=true;c.add(back);
  }
  const chairPine=pine.clone();chairPine.map=pine.map.clone();chairPine.map.repeat.set(1,1);chairPine.map.offset.set(0,0);chairPine.map.needsUpdate=true;chairPine.bumpMap=surfaces.relief(chairPine.map);
  currentChairs.traverse(part=>{if(part.isMesh&&part.material===pine){part.material=chairPine;furnitureWoodUV(part,'y');}});
  for(const chairs of [nelChairs,leatherChairs,scandiChairs])chairs.traverse(part=>{
   if(!part.isMesh || (part.material!==oak && part.material.map!==oak.map))return;
   furnitureWoodUV(part,part.geometry.type==='ExtrudeGeometry'?'y':'x');
  });
  for(const chairs of [currentChairs,nelChairs,leatherChairs,scandiChairs])chairs.position.set(-.26,0,.12);
  function setChairs(style){currentChairs.visible=style==='current';nelChairs.visible=style==='nel';leatherChairs.visible=style==='leather'||style==='swyft-shadow';leather.color.set(style==='swyft-shadow'?'#555754':'#895330');leather.roughness=style==='swyft-shadow'?.95:.6;leather.bumpMap=surfaces.relief(style==='swyft-shadow'?surfaces.weave:surfaces.plaster);scandiChairs.visible=style==='peppermill';}

  const dresser=new THREE.Group();dresser.position.set(-.46,0,5.03);dresser.rotation.y=Math.PI;group.add(dresser);dresser.name='Grey and oak dresser';
  const dresserParts=new Map();
  function dresserDrawer(id,x,y,width,depth){
   const drawer=new THREE.Group();drawer.position.set(x,y,.235);drawer.userData.action='dresser:'+id;dresser.add(drawer);
   box(width,.14,.025,0,0,0,grey,drawer);box(.075,.022,.028,0,0,.026,silver,drawer);
   box(width-.035,.014,depth,0,-.064,-depth/2,oak,drawer);for(const side of [-1,1])box(.014,.115,depth,side*(width/2-.025),0,-depth/2,oak,drawer);box(width-.035,.115,.014,0,0,-depth,oak,drawer);
   dresserParts.set(id,{pivot:drawer,type:'drawer',base:.235,open:false,progress:0,travel:depth*.85});
  }
  for(const x of [-.832,.832])box(.035,.82,.43,x,.48,0,grey,dresser);
  box(1.7,.035,.43,0,.085,0,grey,dresser);box(1.67,.79,.025,0,.48,-.204,grey,dresser);
  for(const y of [.15,.65,.875])box(1.67,.025,.4,0,y,0,grey,dresser);
  box(1.76,.025,.46,0,.88,.018,grey,dresser);box(1.79,.045,.49,0,.915,.025,oak,dresser);
  // Fixed stiles and rails cover inter-front gaps without obstructing the dresser cavities.
  const dresserFrame=new THREE.Group();dresserFrame.name='Dresser stationary face frame';dresser.add(dresserFrame);
  for(const x of [-.818,-.275,.275,.818]){box(.045,.72,.034,x,.515,.207,grey,dresserFrame);box(.045,.18,.034,x,1.49,.207,grey,dresserFrame);}
  for(const [y,h] of [[.69,.036],[.8525,.025],[1.42,.016],[1.56,.016]])box(1.67,h,.034,0,y,.207,grey,dresserFrame);
  for(let i=0;i<3;i++){
   const x=(i-1)*.55,pivot=new THREE.Group();pivot.position.set(x-.255,.42,.229);dresser.add(pivot);const leaf=new THREE.Group();leaf.position.x=.255;leaf.userData.action='dresser:door-'+i;pivot.add(leaf);
   box(.51,.51,.024,0,0,0,grey,leaf);box(.44,.42,.012,0,0,.017,material('#878b83'),leaf);box(.44,.42,.009,0,0,-.017,grey,leaf);
   const knob=new THREE.Mesh(new THREE.SphereGeometry(.012,12,8),silver);knob.position.set(.19,.05,.036);leaf.add(knob);dresserParts.set('door-'+i,{pivot,type:'door',open:false,progress:0});
   dresserDrawer('lower-'+i,x,.775,.51,.36);
  }
  box(1.67,1.15,.028,0,1.515,-.18,material('#767e76'),dresser);
  for(let i=0;i<24;i++)box(.003,1.12,.003,-.81+i*.07,1.52,-.164,material('#636d65'),dresser);
  for(const x of [-.85,.85])box(.045,1.17,.33,x,1.51,-.03,grey,dresser);
  for(const x of [-.28,.28])box(.026,.51,.31,x,1.835,-.035,grey,dresser);
  for(const y of [1.40,1.58,2.09])box(1.72,.03,.35,0,y,-.025,grey,dresser);
  for(const x of [-.565,0,.565])box(.535,.024,.31,x,1.84,-.025,grey,dresser);
  for(let i=0;i<3;i++)dresserDrawer('upper-'+i,(i-1)*.55,1.49,.51,.27);
  box(1.77,.023,.37,0,2.108,-.015,grey,dresser);box(1.80,.020,.39,0,2.129,-.015,oak,dresser);box(1.84,.016,.405,0,2.147,-.015,oak,dresser);
  const bookColours=['#dfbd57','#a9553f','#e6dac0','#818b61','#e2c47b','#e9ddce','#ba6756','#79a6a3','#dbba68','#ece8d2','#727c92','#d9b566'];
  const bookTitles=['COOK','PASTA','VEGETABLES','SIMPLE','BAKING','RECIPES','FEAST','FISH','FLAVOUR','THE KITCHEN','BREAD','EVERYDAY'];
  for(let i=0;i<12;i++){
   const h=.25+(i%4)*.018,x=-.76+i*.045,book=new THREE.Group();book.name='Recipe book '+bookTitles[i];book.position.set(x,.94+h/2,.025);dresser.add(book);
   box(.037,h,.19,0,0,0,material(bookColours[i],.9),book);box(.03,h-.018,.182,0,0,-.004,material('#eee7d7'),book);
   const canvas=document.createElement('canvas');canvas.width=64;canvas.height=512;const c=canvas.getContext('2d');c.fillStyle=bookColours[i];c.fillRect(0,0,64,512);c.save();c.translate(32,256);c.rotate(-Math.PI/2);c.fillStyle=i%3===1?'#f8f5ec':'#343a32';c.font='bold 25px sans-serif';c.textAlign='center';c.fillText(bookTitles[i],0,9);c.restore();const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;const spine=new THREE.Mesh(new THREE.PlaneGeometry(.036,h),new THREE.MeshStandardMaterial({map,roughness:.9}));spine.position.z=.097;book.add(spine);
  }
  for(let i=0;i<4;i++)cylinder(.026,.065,.4+i*.085,1.885,.04,white,dresser);
  cylinder(.09,.045,-.52,1.63,.06,white,dresser);
  for(let i=0;i<3;i++)box(.24,.022,.18,.42,.958+i*.024,.03,material(['#a55d4d','#e4ddc7','#657b70'][i]),dresser);
  function toggleDresser(id){const part=dresserParts.get(id);if(part)part.open=!part.open;}
  function animateDresser(){for(const part of dresserParts.values()){part.progress=THREE.MathUtils.lerp(part.progress,part.open?1:0,.12);if(Math.abs(part.progress-(part.open?1:0))<.001)part.progress=part.open?1:0;if(part.type==='door')part.pivot.rotation.y=-part.progress*Math.PI*.52;else part.pivot.position.z=part.base+part.progress*part.travel;}}
  const speakerMat=material('#e9e7e1',.75);speakerMat.bumpMap=surfaces.relief(surfaces.weave);speakerMat.bumpScale=.0003;
  const speaker=new THREE.Group();speaker.name='Small white speaker';speaker.position.set(.69,2.153,0);dresser.add(speaker);
  const outline=new THREE.Shape();outline.moveTo(-.037,-.058);outline.lineTo(.037,-.058);outline.quadraticCurveTo(.058,-.058,.058,-.037);outline.lineTo(.058,.037);outline.quadraticCurveTo(.058,.058,.037,.058);outline.lineTo(-.037,.058);outline.quadraticCurveTo(-.058,.058,-.058,.037);outline.lineTo(-.058,-.037);outline.quadraticCurveTo(-.058,-.058,-.037,-.058);
  const speakerBody=new THREE.Mesh(new THREE.ExtrudeGeometry(outline,{depth:.158,bevelEnabled:true,bevelSize:.0015,bevelThickness:.0015,bevelSegments:2}),speakerMat);speakerBody.rotation.x=-Math.PI/2;speakerBody.castShadow=true;speaker.add(speakerBody);
  const speakerTop=new THREE.Mesh(new THREE.ShapeGeometry(outline),white);speakerTop.rotation.x=-Math.PI/2;speakerTop.position.y=.161;speaker.add(speakerTop);
  for(const x of [-.027,0,.027])box(.006,.001,.003,x,.162,0,material('#aaaead'),speaker);
  const logoCanvas=document.createElement('canvas');logoCanvas.width=192;logoCanvas.height=64;const logoContext=logoCanvas.getContext('2d');logoContext.fillStyle='#e9e7e1';logoContext.fillRect(0,0,192,64);logoContext.fillStyle='#8a8f8d';logoContext.font='bold 36px sans-serif';logoContext.textAlign='center';logoContext.fillText('SONOS',96,45);const logoMap=new THREE.CanvasTexture(logoCanvas);logoMap.colorSpace=THREE.SRGBColorSpace;const logo=new THREE.Mesh(new THREE.PlaneGeometry(.043,.014),new THREE.MeshStandardMaterial({map:logoMap,roughness:.8}));logo.position.set(0,.083,.060);speaker.add(logo);
  const plantPot=material('#4b514b');cylinder(.067,.13,.41,2.218,0,plantPot,dresser);
  const leafShape=new THREE.Shape();leafShape.moveTo(0,-.065);leafShape.bezierCurveTo(-.024,-.03,-.064,.022,-.029,.043);leafShape.bezierCurveTo(-.012,.057,0,.037,0,.026);leafShape.bezierCurveTo(0,.037,.012,.057,.029,.043);leafShape.bezierCurveTo(.064,.022,.024,-.03,0,-.065);
  const leafGeometry=new THREE.ShapeGeometry(leafShape,10),leafMaterial=material('#426342');leafMaterial.side=THREE.DoubleSide;
  for(let strand=0;strand<3;strand++){
   const points=[new THREE.Vector3(.41,2.31,.01),new THREE.Vector3(.69+strand*.07,2.34,.08),new THREE.Vector3(.92+strand*.03,2.04,.12),new THREE.Vector3(.89+strand*.055,1.55-strand*.12,.14),new THREE.Vector3(.94,1.22-strand*.1,.17)];
   const curve=new THREE.CatmullRomCurve3(points);const stem=new THREE.Mesh(new THREE.TubeGeometry(curve,30,.0025,5,false),material('#667446'));dresser.add(stem);
   for(let i=1;i<13;i++){const t=i/13,p=curve.getPoint(t),leaf=new THREE.Mesh(leafGeometry,leafMaterial);leaf.position.copy(p);leaf.position.x+=(i%2?1:-1)*.033;leaf.rotation.z=(i%2?1:-1)*.65;leaf.rotation.y=(i%3-1)*.35;leaf.castShadow=true;dresser.add(leaf);}
  }

  const shoe=new THREE.Group();shoe.position.set(-2.04,0,2.91);shoe.rotation.y=Math.PI/2;group.add(shoe);shoe.name='Shoe rack';shoe.userData.choice='shoeRack';
  const rackFrames=new Map();const existingRack=new THREE.Group();existingRack.name='Existing metal shoe rack';shoe.add(existingRack);rackFrames.set('current',existingRack);
  for(const x of [-.37,.37])for(const z of [-.15,.15])box(.034,.86,.034,x,.45,z,white,existingRack);
  for(const y of [.13,.34,.55,.76])for(const z of [-.11,.11])box(.73,.015,.015,0,y,z,silver,existingRack);
  for(const style of ['oak','painted']){
   const rack=new THREE.Group();rack.name=style==='oak'?'Oak slatted shoe rack concept':'Painted shoe rack with oak top concept';shoe.add(rack);rackFrames.set(style,rack);
   const frameMat=style==='oak'?oak:grey;
   for(const x of [-.425,.425])for(const z of [-.145,.145])box(.045,.92,.045,x,.48,z,frameMat,rack);
   for(const y of [.13,.34,.55,.76]){
    for(const z of [-.135,.135])box(.83,.045,.025,0,y-.025,z,frameMat,rack);
    for(let i=0;i<6;i++)box(.83,.016,.038,0,y-.004,-.125+i*.05,frameMat,rack);
    for(const x of [-.425,.425])box(.025,.055,.29,x,y-.025,0,frameMat,rack);
   }
   box(.91,.025,.36,0,.952,0,oak,rack);
   for(const x of [-.425,.425])box(.026,.70,.026,x,.46,-.145,frameMat,rack);
  }
  function setShoeRack(style){for(const [id,rack] of rackFrames)rack.visible=id===(rackFrames.has(style)?style:'current');}
  function familyShoe(x,y,length,width,colour,boot=false){
   const g=new THREE.Group();g.position.set(x,y+.011,0);g.rotation.y=x>0?-.055:.055;shoe.add(g);g.name=length>.21?'Adult shoe':length>.155?'Four-year-old shoe':'Two-year-old shoe';
   const upperMat=material(colour,.9),soleMat=material('#dad8cb',.88);upperMat.bumpMap=surfaces.relief(surfaces.weave);upperMat.bumpScale=.00025;
   const oval=(w,h,d,xx,yy,zz,mat)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),mat);m.scale.set(w,h,d);m.position.set(xx,yy,zz);m.castShadow=true;g.add(m);return m;};
   oval(width/2,.011,length/2,0,.008,0,soleMat);
   oval(width*.46,.028,length*.40,0,.029,length*.065,upperMat);
   oval(width*.41,boot?.072:.036,length*.19,0,boot?.074:.042,-length*.24,upperMat);
   const collar=new THREE.Mesh(new THREE.TorusGeometry(1,.12,8,24),upperMat);collar.rotation.x=Math.PI/2;collar.scale.set(width*.30,length*.14,width*.3);collar.position.set(0,boot?.14:.066,-length*.25);g.add(collar);
   const opening=new THREE.Mesh(new THREE.CircleGeometry(1,20),dark);opening.rotation.x=-Math.PI/2;opening.scale.set(width*.265,length*.125,1);opening.position.set(0,boot?.137:.063,-length*.25);g.add(opening);
   if(!boot)for(let i=0;i<4;i++)rod([-width*.24,.054,-length*.11+i*.017],[width*.24,.054,-length*.085+i*.017],.0015,soleMat,g);
  }
  for(const [y,length,width,colour,boot,centre] of [[.13,.28,.096,'#464e52',false,-.18],[.13,.245,.084,'#8b8175',false,.18],[.34,.28,.094,'#685443',true,-.18],[.34,.245,.082,'#5b6259',true,.18],[.55,.175,.066,'#4f7376',false,-.16],[.55,.145,.056,'#a55c4d',false,.16],[.76,.175,.064,'#637450',true,-.16],[.76,.145,.054,'#be9760',true,.16]])for(const side of [-1,1])familyShoe(centre+side*width*.59,y,length,width,colour,boot);
  const toy=new THREE.Group();toy.position.set(-2.02,0,3.9);toy.rotation.y=Math.PI/2;group.add(toy);toy.name='Existing children’s play kitchen';
  box(.68,.5,.31,0,.32,0,red,toy);box(.74,.025,.36,0,.59,0,white,toy);box(.34,.33,.018,-.13,.32,.17,dark,toy);box(.25,.21,.02,-.13,.33,.184,material('#52605e'),toy);box(.21,.02,.032,-.13,.49,.19,silver,toy);for(const x of [-.33,.33])box(.028,.57,.028,x,.9,-.13,red,toy);box(.7,.04,.19,0,1.18,-.06,red,toy);box(.7,.05,.19,0,.99,-.06,red,toy);cylinder(.065,.008,-.18,.61,.035,dark,toy);cylinder(.068,.008,.17,.61,.035,silver,toy);
  const panelRadiator=new THREE.Group();panelRadiator.name='Existing panel radiator';panelRadiator.userData.choice='radiator';group.add(panelRadiator);
  box(.085,.67,1.36,1.35,.52,3.53,white,panelRadiator);for(let i=0;i<16;i++)box(.008,.59,.022,1.302,.52,2.91+i*.081,material('#dbdcd3'),panelRadiator);
  const tubularRadiator=new THREE.Group();tubularRadiator.name='White tubular radiator concept';tubularRadiator.userData.choice='radiator';group.add(tubularRadiator);
  const enamel=new THREE.MeshPhysicalMaterial({color:'#eeeae1',roughness:.32,clearcoat:.28});
  for(let i=0;i<18;i++)for(const x of [1.25,1.315]){
   const z=2.89+i*.075;const tube=cylinder(.013,.572,x,.52,z,enamel,tubularRadiator);
   for(const y of [.234,.806]){const end=new THREE.Mesh(new THREE.SphereGeometry(.013,10,8),enamel);end.position.set(x,y,z);tubularRadiator.add(end);}
   for(const y of [.25,.79]){const joint=cylinder(.01,.065,1.2825,y,z,enamel,tubularRadiator);joint.rotation.z=Math.PI/2;}
  }
  for(const y of [.25,.79])for(const x of [1.25,1.315]){const header=cylinder(.016,1.325,x,y,3.5275,enamel,tubularRadiator);header.rotation.x=Math.PI/2;}
  for(const z of [2.85,4.20]){cylinder(.009,.18,1.30,.12,z,silver,tubularRadiator);cylinder(.018,.045,1.30,.225,z,white,tubularRadiator);}
  function setRadiator(style){panelRadiator.visible=style!=='tubular';tubularRadiator.visible=style==='tubular';}

  const lampshade=new THREE.Group();lampshade.userData.choice='time';lampshade.position.set(0,2.04,3.43);group.add(lampshade);box(.008,.44,.008,0,.43,0,dark,lampshade);
  const weave=material('#b99658',.82);weave.emissive=new THREE.Color('#372007');weave.emissiveIntensity=.14;
  for(const sleeve of [{bottom:.27,top:.405,radius:.175},{bottom:.025,top:.315,radius:.255},{bottom:-.145,top:.115,radius:.184}]){
   for(const direction of [-1,1])for(let i=0;i<52;i++){
    const points=[];for(let j=0;j<=24;j++){const t=j/24,a=i*Math.PI*2/52+direction*t*1.45,r=sleeve.radius*(.96+.04*Math.sin(Math.PI*t));points.push(new THREE.Vector3(Math.cos(a)*r,sleeve.bottom+t*(sleeve.top-sleeve.bottom),Math.sin(a)*r));}
    lampshade.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.0018,4,false),weave));
   }
   for(const y of [sleeve.bottom,sleeve.top]){const ring=new THREE.Mesh(new THREE.TorusGeometry(sleeve.radius*.96,.004,6,64),weave);ring.rotation.x=Math.PI/2;ring.position.y=y;lampshade.add(ring);}
  }
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(.035,12,8),new THREE.MeshStandardMaterial({color:'#ffebc5',emissive:'#ffce8a',emissiveIntensity:2}));lampshade.add(bulb);const light=new THREE.PointLight('#ffe8c2',1.2,5,2);light.position.set(0,2.04,3.43);scene.add(light);
  const printPaper=material('#f5f4ef',.92);
  /** Create an original geometric illustration without photographs or external assets. */
  function abstractPrint(w,h,x,y,z,rot,name,index){
   const frame=new THREE.Group();frame.name=name;frame.position.set(x,y,z);frame.rotation.y=rot;group.add(frame);
   box(w+.09,h+.09,.025,0,0,0,dark,frame);box(w+.05,h+.05,.028,0,0,.01,printPaper,frame);
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=384;const c=canvas.getContext('2d');
   c.fillStyle='#f5f1e7';c.fillRect(0,0,512,384);c.fillStyle=['#a56b51','#58746c','#c1a45e','#637b87'][index];c.beginPath();c.arc(160+index*25,160,85,0,Math.PI*2);c.fill();
   c.fillStyle='#d5c5a0';c.fillRect(70,250,370,22);c.strokeStyle='#3d5149';c.lineWidth=9;c.beginPath();c.moveTo(85,300);c.bezierCurveTo(170,90,330,390,440,120);c.stroke();
   const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;
   const image=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map,roughness:.92}));image.position.z=.027;frame.add(image);return frame;
  }
  abstractPrint(1.13,.405,1.34,1.65,3.52,-Math.PI/2,'Abstract landscape',0);
  const crab=abstractPrint(.45,.36,-2.18,1.73,3.85,Math.PI/2,'Abstract print A',1);
  const fish=abstractPrint(.45,.36,-2.18,1.73,3.15,Math.PI/2,'Abstract print B',2);
  const octopus=abstractPrint(.45,.36,-2.18,1.73,4.13,Math.PI/2,'Abstract print C',3);
  for(const print of [crab,fish,octopus])print.userData.choice='art';
  /** Preserve the two-versus-three frame comparison with anonymous illustrations. */
  function setArt(style){octopus.visible=style==='three';fish.position.z=style==='three'?2.93:3.15;crab.position.z=style==='three'?4.13:3.85;octopus.position.z=3.53;}
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(.115,20,12,0,Math.PI*2,Math.PI*.5,Math.PI*.5),oak);bowl.rotation.x=Math.PI;bowl.position.set(.04,.79,3.55);bowl.scale.y=.43;group.add(bowl);for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.SphereGeometry(.027,12,10),material('#a4a563'));f.position.set(-.01+i*.045,.81,3.55);group.add(f);}
  group.scale.set(dimensions.diningWidth/3.6,1,dimensions.diningLength/3.5);group.position.z=dimensions.kitchenLength/2-1.8*group.scale.z;
  function setTime(night){light.intensity=night?1.05:.15;bulb.material.emissiveIntensity=night?1.5:.15;weave.emissiveIntensity=night?.1:0;}
  return {dresserParts,group,wallGroups,lampshade,setChairs,setTable,setTime,setRadiator,setArt,setShoeRack,toggleDoor,animateDoors,toggleDresser,animateDresser};
}
