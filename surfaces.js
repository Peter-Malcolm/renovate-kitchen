import * as THREE from 'three';

export function createSurfaces({texture,seeded}){
 const pine=texture((c,w,h)=>{
  const rand=seeded(731),plank=w/10;
  for(let p=0;p<10;p++){
   const x=p*plank,tone=Math.floor(rand()*9);
   c.fillStyle=`rgb(${219+tone},${198+tone},${167+tone})`;c.fillRect(x,0,plank,h);
   const knots=[{x:x+plank*(.25+rand()*.5),y:rand()*h}];
   c.save();c.beginPath();c.rect(x,0,plank,h);c.clip();
   for(let i=0;i<48;i++){
    const gx=x+rand()*plank,phase=rand()*6;c.strokeStyle=`rgba(126,101,70,${.025+rand()*.07})`;c.lineWidth=.3+rand()*.6;c.beginPath();
    for(let y=0;y<=h;y+=8){let xx=gx+Math.sin(y/170+phase)*2.4;for(const k of knots){const influence=Math.exp(-(((y-k.y)/48)**2));xx+=(gx<k.x?-1:1)*9*influence*Math.exp(-Math.abs(gx-k.x)/17);}if(y===0)c.moveTo(xx,y);else c.lineTo(xx,y);}c.stroke();
   }
   for(const k of knots){c.fillStyle='rgba(112,79,46,.42)';c.beginPath();c.ellipse(k.x,k.y,1.8,4.8,.12,0,Math.PI*2);c.fill();for(let i=0;i<6;i++){c.strokeStyle=`rgba(124,94,61,${.23-i*.03})`;c.lineWidth=.7;c.beginPath();c.ellipse(k.x,k.y,2.2+i*.95,6+i*3.8,.06,0,Math.PI*2);c.stroke();}}
   c.restore();c.fillStyle='#c1ad90';c.fillRect(x,0,.8,h);c.fillStyle='#edddc4';c.fillRect(x+1,0,.8,h);
   for(let y=(p%3)*230+180;y<h;y+=900){c.fillStyle='rgba(133,112,84,.25)';c.fillRect(x,y,plank,.65);}
  }
 },768,1536);
 pine.wrapS=pine.wrapT=THREE.RepeatWrapping;pine.repeat.set(1.5,1);
 const oak=texture((c,w,h)=>{
  const rand=seeded(23);c.fillStyle='#cba773';c.fillRect(0,0,w,h);
  for(let i=0;i<480;i++){const x=rand()*w,phase=rand()*6;c.strokeStyle=`rgba(105,69,33,${.025+rand()*.17})`;c.lineWidth=.3+rand();c.beginPath();for(let y=0;y<h;y+=10){const xx=x+Math.sin(y/130+phase)*4+Math.sin(y/290+phase)*7;if(y===0)c.moveTo(xx,y);else c.lineTo(xx,y);}c.stroke();}
  for(let i=0;i<1700;i++){c.fillStyle='rgba(247,224,179,.13)';c.fillRect(rand()*w,rand()*h,.6,4+rand()*9);}
 },512,1024);
 const grain=texture((c,w,h)=>{const rand=seeded(18);c.fillStyle='#f7f7f7';c.fillRect(0,0,w,h);for(let i=0;i<420;i++){c.strokeStyle=`rgba(70,70,70,${rand()*.07})`;c.lineWidth=.25+rand()*.6;const x=rand()*w;c.beginPath();c.moveTo(x,0);for(let y=0;y<h;y+=12)c.lineTo(x+Math.sin(y/90+i)*1.6,y);c.stroke();}},256,512);
 const plaster=texture((c,w,h)=>{const rand=seeded(12);c.fillStyle='#eeeeee';c.fillRect(0,0,w,h);for(let i=0;i<14000;i++){c.fillStyle=rand()>.5?'rgba(255,255,255,.15)':'rgba(100,100,100,.035)';c.fillRect(rand()*w,rand()*h,1,1);}},256,256);
 const stone=texture((c,w,h)=>{const rand=seeded(52);c.fillStyle='#efefeb';c.fillRect(0,0,w,h);for(let i=0;i<4800;i++){const grey=165+Math.floor(rand()*45);c.fillStyle=`rgba(${grey},${grey},${grey},${.06+rand()*.1})`;c.fillRect(rand()*w,rand()*h,.35+rand()*.6,.3+rand()*.55);}},512,512);
 stone.wrapS=stone.wrapT=THREE.RepeatWrapping;stone.repeat.set(2,6);
 const metal=texture((c,w,h)=>{const rand=seeded(5);c.fillStyle='#eeeeee';c.fillRect(0,0,w,h);for(let y=0;y<h;y++){c.fillStyle=`rgba(170,170,170,${rand()*.055})`;c.fillRect(0,y,w,.4);}},256,256);
 const weave=texture((c,w,h)=>{c.fillStyle='#b0b0b0';c.fillRect(0,0,w,h);for(let i=0;i<w;i+=4){c.fillStyle='#dedede';c.fillRect(i,0,1,h);c.fillStyle='#878787';c.fillRect(0,i,w,1);}},256,256);
 const environment=texture((c,w,h)=>{for(let y=0;y<h;y++){const v=Math.round(210-Math.abs(y-h*.4)*.55);c.fillStyle=`rgb(${v},${v},${v-5})`;c.fillRect(0,y,w,1);}c.fillStyle='#fffdf5';c.fillRect(60,65,110,90);c.fillRect(290,50,60,80);c.fillStyle='#eeeeeb';c.fillRect(0,25,w,12);},512,256);
 environment.mapping=THREE.EquirectangularReflectionMapping;
 function relief(map){const copy=map.clone();copy.colorSpace=THREE.NoColorSpace;copy.needsUpdate=true;return copy;}
 return {pine,oak,grain,plaster,stone,metal,weave,environment,relief};
}
