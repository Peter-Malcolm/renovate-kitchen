/** Integrate held inputs in radians at 45 degrees/second (half speed for reduced motion). */
export function createTurnMotion(apply, reduced=()=>false, now=()=>performance.now()){
 const held=new Map();let last=now(),pulseUntil=0,pulseDirection=0;
 /** Advance only elapsed active input time; opposing inputs cancel. */
 function tick(time=now()){const end=Math.min(time,pulseUntil);const pulseSeconds=Math.max(0,end-last)/1000;const seconds=Math.max(0,time-last)/1000;const direction=Math.sign([...held.values()].reduce((a,b)=>a+b,0));const angle=(direction*seconds+pulseDirection*pulseSeconds)*Math.PI/4*(reduced()?.5:1);last=time;if(angle)apply(angle);}
 /** Start a held source without restarting it on keyboard repeat. */
 function start(source,direction){tick();held.set(source,direction);}
 /** Stop one input at its release time. */
 function stop(source){tick();held.delete(source);}
 /** Stop all movement immediately on focus loss or cancellation. */
 function clear(){held.clear();pulseUntil=0;last=now();}
 /** Give assistive activation a short, animated turn rather than a jump. */
 function pulse(direction){tick();pulseDirection=direction;pulseUntil=now()+120;}
 return {tick,start,stop,clear,pulse};
}
/** Connect pointer holds and keyboard holds, including focus-loss cleanup. */
export function bindTurnControls(canvas,buttons,motion){
 /** Translate the two turning shortcut keys to signed directions. */
 function direction(key){return key.toLowerCase()==='q'?1:key.toLowerCase()==='e'?-1:0;}
 canvas.addEventListener('keydown',e=>{const d=direction(e.key);if(d&&!e.altKey&&!e.ctrlKey&&!e.metaKey){e.preventDefault();motion.start('key:'+e.code,d);}});
 window.addEventListener('keyup',e=>motion.stop('key:'+e.code));
 canvas.addEventListener('blur',()=>motion.clear());
 for(const b of buttons){const d=b.dataset.turn==='left'?1:-1,source='button:'+b.dataset.turn;
 b.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();b.setPointerCapture(e.pointerId);motion.start(source,d);});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>motion.stop(source));
 b.addEventListener('keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();motion.start(source,d);}});
 b.addEventListener('keyup',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();motion.stop(source);}});
 b.addEventListener('blur',()=>motion.stop(source));
 b.addEventListener('click',e=>{if(e.detail===0)motion.pulse(d);});
 }
 window.addEventListener('blur',()=>motion.clear());
 document.addEventListener('visibilitychange',()=>{if(document.hidden)motion.clear();});
}
