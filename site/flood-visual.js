/** Build a smooth, deterministic arrival field inside the tested reachable floor cells. */
export function createFloodVisual(THREE,map,material){
 const size=map.cellSize,minX=Math.min(...map.cells.map(c=>c.x))-size/2,minZ=Math.min(...map.cells.map(c=>c.z))-size/2;
 const width=Math.round((Math.max(...map.cells.map(c=>c.x))-minX)/size+.5),height=Math.round((Math.max(...map.cells.map(c=>c.z))-minZ)/size+.5);
 const lookup=new Map(map.cells.map((c,i)=>[Math.round((c.z-minZ)/size-.5)*width+Math.round((c.x-minX)/size-.5),i]));
 const distances=new Float64Array(map.cells.length).fill(Infinity),queue=[];distances[0]=0;
 /** Maintain the small priority queue used once per furniture layout. */
 function push(index,distance){let n=queue.length;queue.push([index,distance]);while(n){const p=(n-1)>>1;if(queue[p][1]<=distance)break;queue[n]=queue[p];n=p;}queue[n]=[index,distance];}
 /** Remove the next arrival without sorting the whole reachable floor. */
 function pop(){const first=queue[0],last=queue.pop();if(queue.length){let n=0;while(n*2+1<queue.length){let child=n*2+1;if(child+1<queue.length&&queue[child+1][1]<queue[child][1])child++;if(queue[child][1]>=last[1])break;queue[n]=queue[child];n=child;}queue[n]=last;}return first;}
 push(0,0);
 while(queue.length){const [i,d]=pop();if(d!==distances[i])continue;const c=map.cells[i],col=Math.round((c.x-minX)/size-.5),row=Math.round((c.z-minZ)/size-.5);
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
   if(col+dx<0||col+dx>=width||row+dz<0||row+dz>=height)continue;
   const next=lookup.get((row+dz)*width+col+dx);if(next===undefined)continue;
   if(dx&&dz&&(!lookup.has(row*width+col+dx)||!lookup.has((row+dz)*width+col)))continue;
   const speed=1+.24*Math.sin(c.x*5.1+c.z*2.7)+.15*Math.cos(c.z*6.3-c.x*2.4),arrival=d+Math.hypot(dx,dz)/speed;
   if(arrival<distances[next]){distances[next]=arrival;push(next,arrival);}
  }
 }
 const order=Array.from(distances.keys()).sort((a,b)=>distances[a]-distances[b]),ranks=new Float32Array(order.length);order.forEach((id,rank)=>{ranks[id]=(rank+.5)/order.length;});
 const field=new Float32Array(width*height*4).fill(2),mask=new Uint8Array(width*height*4);
 for(const [key,i] of lookup){field.set([ranks[i],ranks[i],ranks[i],1],key*4);mask.set([255,255,255,255],key*4);}
 const arrival=new THREE.DataTexture(field,width,height,THREE.RGBAFormat,THREE.FloatType);arrival.minFilter=arrival.magFilter=THREE.LinearFilter;arrival.needsUpdate=true;
 const allowed=new THREE.DataTexture(mask,width,height);allowed.needsUpdate=true;
 const uniforms={floodArrival:{value:arrival},floodProgress:{value:0},floodFeather:{value:.0025}};
 const film=material.clone();film.map=allowed;film.color.set('#729b9e');film.opacity=.42;film.depthWrite=false;film.roughness=.08;
 film.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.fragmentShader='uniform sampler2D floodArrival; uniform float floodProgress; uniform float floodFeather;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>','#include <alphamap_fragment>\nfloat arrivalTime=texture2D(floodArrival,vMapUv).r; diffuseColor.a *= 1.0-smoothstep(floodProgress-floodFeather,floodProgress+floodFeather,arrivalTime);');};
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width*size,height*size),film);mesh.rotation.x=-Math.PI/2;mesh.position.set(minX+width*size/2,0,minZ+height*size/2);mesh.scale.y=-1;mesh.material.side=THREE.DoubleSide;mesh.userData.pickThrough=true;
 mesh.userData.cells=order.map(i=>map.cells[i]);mesh.userData.update=count=>{uniforms.floodProgress.value=count/map.cells.length;uniforms.floodFeather.value=Math.max(.00015,Math.min(.0025,count/map.cells.length*.08));};
 mesh.userData.dispose=()=>{arrival.dispose();allowed.dispose();film.dispose();};return mesh;
}
