// A shallow connected film: litres determine wetted area, then depth. Not CFD.
/** Rasterize floor rectangles and solid footprints into a connected spill route. */
export function createFloodMap(floors, obstacles, source, cellSize=.045) {
 const minX=Math.min(...floors.map(r=>r.minX)),minZ=Math.min(...floors.map(r=>r.minZ));
 const width=Math.ceil((Math.max(...floors.map(r=>r.maxX))-minX)/cellSize),height=Math.ceil((Math.max(...floors.map(r=>r.maxZ))-minZ)/cellSize);
 const cells=new Map();
 for(let row=0;row<height;row++)for(let col=0;col<width;col++){
  const x=minX+(col+.5)*cellSize,z=minZ+(row+.5)*cellSize,h=cellSize/2;
  if(![-h,h].every(dx=>[-h,h].every(dz=>floors.some(r=>x+dx>=r.minX-1e-8&&x+dx<=r.maxX+1e-8&&z+dz>=r.minZ-1e-8&&z+dz<=r.maxZ+1e-8))))continue;
  if(obstacles.some(r=>x+h>r.minX&&x-h<r.maxX&&z+h>r.minZ&&z-h<r.maxZ))continue;
  cells.set(row*width+col,{x,z,row,col});
 }
 let start,nearest=Infinity;
 for(const [key,c] of cells){const distance=(c.x-source.x)**2+(c.z-source.z)**2;if(distance<nearest){nearest=distance;start=key;}}
 const queue=start===undefined?[]:[start],seen=new Set(queue),ordered=[];
 for(let i=0;i<queue.length;i++){
  const c=cells.get(queue[i]);ordered.push(c);
  for(const [dr,dc] of [[0,-1],[0,1],[-1,0],[1,0]]){
   const row=c.row+dr,col=c.col+dc,key=row*width+col;
   if(row<0||col<0||row>=height||col>=width||seen.has(key)||!cells.has(key))continue;
   seen.add(key);queue.push(key);
  }
 }
 return {cells:ordered,cellSize,area:ordered.length*cellSize**2};
}

/** Allocate retained litres to a one-millimetre advancing film, deepening after coverage. */
export function floodCoverage(map,litres) {
 if(!Number.isFinite(litres)||litres<0)throw new RangeError('Floor water must be finite and non-negative.');
 const cellLitres=map.cellSize**2; // One millimetre over one square metre is one litre.
 const count=Math.min(map.cells.length,Math.ceil(litres/cellLitres));
 return {count,depth:count?litres/(count*map.cellSize**2*1000):0,litres};
}
