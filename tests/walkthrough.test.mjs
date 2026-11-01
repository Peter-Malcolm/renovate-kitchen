import assert from 'node:assert/strict';
import {createWalkthrough,walkthroughRoute} from '../site/viewpoints.js';
/** Check elapsed-time integration is independent of frame rate and remains within the clear aisle. */
function checkRoute(){
 const positions=[];const a=createWalkthrough(v=>positions.push(v),()=>{},()=>false);a.toggle();a.tick(0);
 for(let t=100;t<=60000;t+=100)a.tick(t);
 for(const v of positions){assert.equal(v.position[1],1.65);assert.ok(v.position[0]>=-.301&&v.position[0]<=.051);assert.ok(v.position[2]>=-.651&&v.position[2]<=1.401);}
 assert.equal(a.active,false);assert.deepEqual(positions.at(-1),walkthroughRoute.at(-1));
 let fine,coarse;const f=createWalkthrough(v=>fine=v,()=>{},()=>false),c=createWalkthrough(v=>coarse=v,()=>{},()=>false);f.toggle();c.toggle();f.tick(0);c.tick(0);for(let t=10;t<=6000;t+=10)f.tick(t);c.tick(6000);for(let i=0;i<3;i++)assert.ok(Math.abs(fine.position[i]-coarse.position[i])<1e-10);
}
/** Check stopping and reduced motion prevent subsequent animated camera changes. */
function checkStop(){let count=0;const a=createWalkthrough(()=>count++,()=>{},()=>false);a.toggle();a.stop();a.tick(10000);assert.equal(count,1);const b=createWalkthrough(()=>count++,()=>{},()=>true);b.toggle();b.tick(10000);assert.equal(count,2);assert.equal(b.active,false);}
checkRoute();checkStop();console.log('Walkthrough elapsed-time, aisle envelope, completion, stop and reduced-motion checks passed.');
