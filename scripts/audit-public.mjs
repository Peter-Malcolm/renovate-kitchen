import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {appRoot} from './app-root.mjs';
const root=appRoot;
const approvedPhotos={
 'assets/kitchen-hob-detail.jpg':'62d18912456bfbb4277bbfcf757d730c40585c4d1806202af2c24fff62ee5e69',
 'assets/kitchen-extractor-detail.jpg':'1675e4889d7e644406890571d9407ff7e4703b248005a1cd547864e6783c7306'
};
const approvedPlans={'assets/public-floorplan-model.svg':'8c96a5bb41546641cd05609b12cc0e15500968b61b5b6c283baf5924c50f93ee'};
const allowed=[...Object.keys(approvedPhotos),...Object.keys(approvedPlans),'THIRD_PARTY_NOTICES.txt','app.js','assets/OrbitControls.js','assets/three.module.js','dimensions.js','flood-visual.js','flood.js','dining.js','furniture-wood.js','index.html','lighting.js','stainless.js','surfaces.js','viewpoints.js','handle-clearance.js','turning.js','water.js'];
/** Inventory the deployment recursively and reject links to files outside it. */
function inventory(directory,prefix=''){
 return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  assert.equal(entry.isSymbolicLink(),false,'Deployment must not contain symlinks');
  const relative=prefix+entry.name;
  return entry.isDirectory()?inventory(new URL(entry.name+'/',directory),relative+'/'):[relative];
 });
}
/** Check selected JPEGs contain no metadata segments or appended data. */
function checkPhotoMetadata(buffer){
 assert.equal(buffer.readUInt16BE(0),0xffd8,'Expected JPEG start');
 let offset=2;
 while(offset<buffer.length){
  assert.equal(buffer[offset++],0xff,'Expected JPEG marker');
  while(buffer[offset]===0xff)offset++;
  const marker=buffer[offset++];
  assert.ok(!(marker>=0xe0&&marker<=0xef)&&marker!==0xfe,'Photo metadata is forbidden');
  if(marker===0xd9){assert.equal(offset,buffer.length,'Appended image or data is forbidden');return;}
  if(marker===0x01||(marker>=0xd0&&marker<=0xd7))continue;
  const length=buffer.readUInt16BE(offset);
  assert.ok(length>=2&&offset+length<=buffer.length,'Invalid JPEG segment');
  offset+=length;
  if(marker===0xda){
   while(offset<buffer.length){
    if(buffer[offset]!==0xff){offset++;continue;}
    const next=buffer[offset+1];
    if(next===0x00||(next>=0xd0&&next<=0xd7)){offset+=2;continue;}
    break;
   }
  }
 }
 assert.fail('Missing JPEG end');
}
const files=inventory(root).sort();assert.deepEqual(files,allowed.sort(),'Unexpected deployment asset');
const result=[];
for(const file of files){
 const buffer=fs.readFileSync(new URL(file,root));
 const hash=crypto.createHash('sha256').update(buffer).digest('hex');
 if(Object.hasOwn(approvedPhotos,file)){
  assert.equal(hash,approvedPhotos[file],'Selected photo must match its reviewed, metadata-stripped copy');
  checkPhotoMetadata(buffer);
  result.push({file,bytes:buffer.length,sha256:hash});
  continue;
 }
 const text=buffer.toString('utf8');
 if(Object.hasOwn(approvedPlans,file)){
  assert.equal(hash,approvedPlans[file],'Plan must match its reviewed original model schematic');
  assert.ok(!/<(?:script|image|foreignObject|metadata|use|iframe)\b|\b(?:href|on[a-z]+)\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i.test(text),'Unsafe or embedded SVG content');
  assert.ok(!/https?:\/\//i.test(text.replace('http://www.w3.org/2000/svg','')),'External SVG reference');
  assert.ok(!/rightmove|postcode|latitude|longitude|[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/i.test(text),'Identifying plan annotation');
 }

 const withoutApprovedReferences=Object.keys(approvedPhotos).reduce((value,name)=>value.replaceAll(name,''),text);
 assert.ok(!/\.(?:jpg|jpeg|png|webp|gif|heic|mp4)(?:["'\s?]|$)/i.test(withoutApprovedReferences),'Raster or video reference in '+file);
 assert.ok(!/appgprj_|chatgpt\.site|oaiusercontent|source_repository_credential|Bearer\s+[A-Za-z0-9]|BEGIN .*PRIVATE KEY/i.test(text),'Private hosting or credential marker in '+file);
 if(!file.startsWith('assets/')){
  assert.ok(!/https?:\/\//i.test(text),'Unexpected external URL in '+file);
  assert.ok(!/\b(?:postcode|latitude|longitude)\s*[:=]|[A-Z]{1,2}\d[A-Z\d]?\s+\d[A-Z]{2}\b/.test(text),'Location metadata in '+file);
 }
 result.push({file,bytes:buffer.length,sha256:crypto.createHash('sha256').update(buffer).digest('hex')});
}
assert.ok(!fs.readFileSync(new URL('index.html',root),'utf8').includes('id="reference"'),'Private reference viewer must be absent');
console.log(JSON.stringify({files:result,totalBytes:result.reduce((sum,file)=>sum+file.bytes,0),rasterAssets:Object.keys(approvedPhotos).length,externalApplicationUrls:0,sourceHistoryIncluded:false},null,2));
