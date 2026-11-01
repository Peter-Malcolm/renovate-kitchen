/** The fridge-side position frames the long left counter and its upstand. */
export const countertopView = Object.freeze({position: [-.24, 1.65, 2.78], target: [-.95, 1.04, -.55], fov: 57});

/** A guided route stays in the clear kitchen aisle; dining is seen from its doorway. */
export const walkthroughRoute = [
 {position:[0,1.65,1.3],target:[0,1.18,-1.48]},
 {position:[-.15,1.65,.4],target:[-.95,1.04,-.55]},
 {position:[.05,1.65,-.65],target:[-.15,.85,-1.55]},
 {position:[-.3,1.65,-.35],target:[1.04,1.4,-.383]},
 {position:[-.3,1.65,1.3],target:[1.03,1.35,1.0]},
 {position:[0,1.65,1.4],target:[-.4,1.1,4.8]}
];
/** Advance by elapsed time, with zero-velocity joins and no movement in reduced motion. */
export function createWalkthrough(apply, changed, reducedMotion) {
 let active=false, elapsed=0, previous=null, staticIndex=-1;
 return {
  get active(){return active;},
  stop(){active=false;previous=null;changed(false);},
  toggle(){
   if(active){this.stop();return;}
   if(reducedMotion()){staticIndex=(staticIndex+1)%walkthroughRoute.length;apply(walkthroughRoute[staticIndex]);changed(false);return;}
   elapsed=0;previous=null;active=true;apply(walkthroughRoute[0]);changed(true);
  },
  tick(now){
   if(!active)return;
   if(reducedMotion()){this.stop();return;}
   if(previous!==null)elapsed+=Math.max(0,now-previous)/1000;
   previous=now;
   const segment=Math.floor(elapsed/12);
   if(segment>=walkthroughRoute.length-1){apply(walkthroughRoute.at(-1));this.stop();return;}
   const a=walkthroughRoute[segment],b=walkthroughRoute[segment+1],t=(elapsed%12)/12,s=t*t*(3-2*t);
   apply({position:a.position.map((v,i)=>v+(b.position[i]-v)*s),target:a.target.map((v,i)=>v+(b.target[i]-v)*s)});
  }
 };
}
