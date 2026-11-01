import test from 'node:test';
import assert from 'node:assert/strict';
import {createTurnMotion,bindTurnControls} from '../site/turning.js';
/** Make a deterministic clock and collect angular movement. */
function fixture(reduced=false){let time=0,angle=0;const motion=createTurnMotion(a=>angle+=a,()=>reduced,()=>time);return {motion,set(t){time=t;},get angle(){return angle;}};}
/** Check holding for one second turns 45 degrees independently of frame rate. */
test('frame-independent angular speed',()=>{for(const frames of [20,60,120]){const f=fixture();f.motion.start('q',1);for(let i=1;i<=frames;i++){f.set(i*1000/frames);f.motion.tick();}assert.ok(Math.abs(f.angle-Math.PI/4)<1e-12);}});
/** Check release, cancellation and repeated keydowns cannot leave turning active. */
test('release and cancellation',()=>{const f=fixture();f.motion.start('q',1);f.set(100);f.motion.start('q',1);f.set(200);f.motion.stop('q');const angle=f.angle;f.set(1000);f.motion.tick();assert.equal(f.angle,angle);assert.ok(Math.abs(angle-Math.PI/20)<1e-12);f.motion.start('q',1);f.motion.clear();f.set(2000);f.motion.tick();assert.equal(f.angle,angle);});
/** Check assistive activation animates a bounded turn and reduced motion halves speed. */
test('bounded activation and reduced motion',()=>{for(const reduced of [false,true]){const f=fixture(reduced);f.motion.pulse(1);assert.equal(f.angle,0);f.set(60);f.motion.tick();assert.ok(f.angle>0);f.set(1000);f.motion.tick();assert.ok(Math.abs(f.angle-.12*Math.PI/4*(reduced?.5:1))<1e-12);const angle=f.angle;f.set(2000);f.motion.tick();assert.equal(f.angle,angle);}});
/** Check pointer cancellation, focus loss and button keyboard release stop held input. */
test('input lifecycle',()=>{class Target extends EventTarget{dataset={turn:'left'};setPointerCapture(){}}
 const canvas=new Target(),button=new Target();globalThis.window=new Target();globalThis.document=new Target();const f=fixture();bindTurnControls(canvas,[button],f.motion);
 /** Dispatch an input event with the properties used by the control. */
 function fire(target,type,props={}){const event=new Event(type,{cancelable:true});Object.assign(event,props);target.dispatchEvent(event);}
 for(const stop of ['pointerup','pointercancel','lostpointercapture']){fire(button,'pointerdown',{button:0,pointerId:1});f.set(100);f.motion.tick();fire(button,stop);const angle=f.angle;f.set(200);f.motion.tick();assert.equal(f.angle,angle);f.set(0);f.motion.clear();}
 fire(button,'keydown',{key:'Enter'});f.set(100);f.motion.tick();fire(button,'keyup',{key:'Enter'});let angle=f.angle;f.set(200);f.motion.tick();assert.equal(f.angle,angle);
 fire(canvas,'keydown',{key:'q',code:'KeyQ'});fire(window,'blur');angle=f.angle;f.set(300);f.motion.tick();assert.equal(f.angle,angle);
});
