import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {appRoot} from '../scripts/app-root.mjs';
import {fileURLToPath} from 'node:url';

const root = process.env.EXTRACTOR_SITE_ROOT || fileURLToPath(appRoot).replace(/\/$/, '');
const output = resolve('test-results/extractor-review', process.env.EXTRACTOR_SITE_ROOT ? 'private' : 'public');
await mkdir(output, {recursive: true});
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://local').pathname;
    const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
    if (!file.startsWith(root + '/')) throw Error('Outside site');
    res.setHeader('Content-Type', {'.js': 'text/javascript', '.html': 'text/html'}[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
const diagnostics = {status: 'running', frames: [], errors: [], purpose: 'Four-view manufacturer component review; not a temporal flicker test.'};
const watchdog = setTimeout(async () => {
  diagnostics.errors.push('Camera sweep exceeded 10 minutes');
  await writeFile(resolve(output, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
  console.error(diagnostics.errors.at(-1));
  await browser?.close();
}, 600000);
try {
  browser = await chromium.launch({headless: true, timeout: 30000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport: {width: 720, height: 540}, deviceScaleFactor: 1});
  page.on('pageerror', error => diagnostics.errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) diagnostics.errors.push(response.status() + ' ' + response.url()); });
  // Stop only the animation scheduler before the first frame; retain the actual renderer and shaders.
  await page.route('**/app.js?*', async route => {
    const source = await readFile(resolve(root, 'app.js'), 'utf8');
    assert.ok(source.includes('renderer.setAnimationLoop(()=>{'));
    assert.ok(source.includes('controls.update();dining.animateDoors();dining.animateDresser();animateBlinds();animateCabinets();animateSinkWater();animateWaterAndFlames();'), 'Animation freeze hook must match the application');
    await route.fulfill({contentType: 'text/javascript', body: source.replace('renderer.setAnimationLoop(()=>{', 'window.__frozenFrame=(()=>{').replace('controls.update();dining.animateDoors();dining.animateDresser();animateBlinds();animateCabinets();animateSinkWater();animateWaterAndFlames();', '')});
  });
  await page.goto('http://127.0.0.1:' + server.address().port, {timeout: 30000});
  await page.waitForFunction(() => window.kitchenModel, null, {timeout: 90000});
  diagnostics.geometry = await page.evaluate(async () => {
    /** Check extractor parts touch their neighbours without solid overlap. */
    const {Box3} = await import('/assets/three.module.js');
    const m=kitchenModel; m.scene.updateMatrixWorld(true);
    const failures=[];
    /** Return a named part's world bounds. */
    function bounds(name){return new Box3().setFromObject(m.scene.getObjectByName(name));}
    /** Return signed overlap on all axes. */
    function overlap(a,b){return ['x','y','z'].map(k=>Math.min(a.max[k],b.max[k])-Math.max(a.min[k],b.min[k]));}
    const top=bounds('Extractor sloping canopy'),chimney=bounds('Extractor chimney connected to canopy');
    if(Math.abs(chimney.min.y-top.max.y)>1e-6)failures.push('Chimney / canopy gap or overlap');
    const parts=[...m.hood.children.filter(o=>o.name!=='Extractor sloping canopy'),m.hoodChimney];
    m.scene.traverse(o=>{if(o.name==='Extractor lamp lens')parts.push(o);});
    for(let i=0;i<parts.length;i++)for(let j=i+1;j<parts.length;j++){
      const joint=overlap(new Box3().setFromObject(parts[i]),new Box3().setFromObject(parts[j]));
      if(joint.every(n=>n>1e-6))failures.push([parts[i].name,parts[j].name,joint]);
    }
    const underside=bounds('Extractor underside');
    // Check manufacturer envelope and mounting relationships in world metres.
    if(Math.abs(underside.max.z-underside.min.z-.898)>1e-6)failures.push('Width must be 898 mm');
    if(Math.abs(underside.max.x-underside.min.x-.5)>1e-6)failures.push('Depth must be 500 mm');
    if(Math.abs(top.max.y-underside.min.y-.14)>1e-6)failures.push('Canopy must rise 140 mm');
    if(Math.abs(chimney.max.z-chimney.min.z-.31)>1e-6||Math.abs(chimney.max.x-chimney.min.x-.29)>1e-6)failures.push('Chimney must be 310 by 290 mm');
    if(Math.abs(chimney.max.x-underside.max.x)>1e-6)failures.push('Chimney rear must align with canopy');
    const lamps=parts.filter(o=>o.name==='Extractor lamp lens').map(o=>new Box3().setFromObject(o));
    if(lamps.length!==2||Math.abs((lamps[1].min.z+lamps[1].max.z-lamps[0].min.z-lamps[0].max.z)/2-.4)>1e-6)failures.push('Lamps must be 400 mm apart');
    for(const lamp of lamps)if(Math.abs((lamp.min.x+lamp.max.x)/2-underside.min.x-.045)>1e-6)failures.push('Lamp must be 45 mm behind front');
    if(parts.filter(o=>o.name==='Extractor grease filter').length!==2)failures.push('Two design filters required');
    const supportTop=Math.max(...m.hob.children.filter(o=>o.name.startsWith('Cast-iron pan support')).map(o=>new Box3().setFromObject(o).max.y));
    if(underside.min.y-supportTop<.65)failures.push('Gas hob clearance below 650 mm');
    for(const part of parts.filter(o=>['Extractor grease filter','Extractor lamp lens'].includes(o.name))){
      const b=new Box3().setFromObject(part);
      if(Math.abs(b.max.y-underside.min.y)>1e-6)failures.push('Detached underside part '+part.name);
    }
    m.scene.traverse(o=>{
      if(o.name==='Recessed cornice cavity floor'&&overlap(chimney,new Box3().setFromObject(o)).every(n=>n>1e-6))failures.push({name:'Chimney intersects cornice floor',chimney:chimney, floor:new Box3().setFromObject(o),matrix:m.hoodChimney.matrixWorld.elements,position:o.position.toArray(),parent:o.parent.position.toArray(),overlap:overlap(chimney,new Box3().setFromObject(o))});
    });
    return {parts:parts.length,failures};
  });
  assert.deepEqual(diagnostics.geometry.failures, []);
  diagnostics.gpu = await page.evaluate(() => {
    const gl = kitchenModel.renderer.getContext();
    if (gl.isContextLost()) throw Error('WebGL context lost');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), backend: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'not exposed'};
  });
  const presets = ['underside','top','front','side'];
  /** Check each component inspection view produces nonuniform GPU pixels. */
  for (const preset of presets) {
    for (const offset of [0]) {
      const result = await page.evaluate(({preset, offset}) => {
        const m = kitchenModel;
        m.view('hob');
        const positions={top:[.05,2.1,-.65],underside:[.20,1.18,-.65],front:[-.15,1.85,-.42],side:[.6,1.85,.6]}; const position=positions[preset];m.camera.position.set(position[0],position[1],position[2]+offset);
        m.camera.lookAt(.99,1.64,-.42);
        m.camera.updateMatrixWorld(true);
        window.__frozenFrame();
        const gl = m.renderer.getContext();
        const pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
        gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        let min = 255, max = 0;
        for (let i = 0; i < pixels.length; i += 4) { min = Math.min(min, pixels[i]); max = Math.max(max, pixels[i]); }
        return {preset, offset, min, max, drawCalls: m.renderer.info.render.calls, triangles: m.renderer.info.render.triangles, contextLost: gl.isContextLost(), glError: gl.getError()};
      }, {preset, offset});
      assert.equal(result.contextLost, false);
      assert.equal(result.glError, 0);
      assert.ok(result.drawCalls > 0 && result.triangles > 0 && result.max - result.min > 20, 'GPU must render nonuniform scene pixels');
      const filename = preset + '-' + (offset < 0 ? 'left' : offset > 0 ? 'right' : 'centre') + '.png';
      await page.locator('#scene').screenshot({path: resolve(output, filename), timeout: 30000});
      diagnostics.frames.push({...result, filename});
      console.log(JSON.stringify(result));
    }
  }
  assert.deepEqual(diagnostics.errors, []);
  diagnostics.status = 'passed';
} catch (error) {
  diagnostics.status = 'failed';
  diagnostics.errors.push(error.message);
  throw error;
} finally {
  await writeFile(resolve(output, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
  await writeFile(resolve(output, 'index.html'), '<!doctype html><title>Camera sweep review</title><style>body{background:#222;color:white;font:16px sans-serif}section{display:flex}img{width:32%}</style><h1>Extractor top and underside review</h1><p>Four stationary inspection viewpoints. These frames support component review, not a temporal flicker verdict. Lighting and animation remain frozen. Local geometry review; AEG DKB5960HM drawing defines the envelope, slopes, chimney and lamp centres. Filter frame sizes remain inferred; installed PNC and cabinet construction are unverified.</p>' + [...new Set(diagnostics.frames.map(frame => frame.preset))].map(preset => '<h2>' + preset + '</h2><section>' + diagnostics.frames.filter(frame => frame.preset === preset).map(frame => '<img src="' + frame.filename + '">').join('') + '</section>').join(''));
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  clearTimeout(watchdog);
}
console.log('Rendered sweep artifacts: ' + output);
