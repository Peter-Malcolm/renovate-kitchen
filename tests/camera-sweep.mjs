import {createServer} from 'node:http';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {resolve, extname} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {appRoot} from '../scripts/app-root.mjs';
import {cabinetGeometry} from './cabinet-geometry.mjs';
import {furnitureGeometry} from './furniture-geometry.mjs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(appRoot).replace(/\/$/, '');
const output = resolve(process.argv.includes('--furniture-only') ? 'test-results/furniture-sweep' : 'test-results/camera-sweep');
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
const diagnostics = {status: 'running', frames: [], errors: [], purpose: 'Visual motion review, not an automatic temporal flicker detector.'};
const watchdog = setTimeout(async () => {
  diagnostics.errors.push('Camera sweep exceeded 10 minutes');
  await writeFile(resolve(output, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
  console.error(diagnostics.errors.at(-1));
  await browser?.close();
}, 600000);
try {
  browser = await chromium.launch({headless: true, timeout: 30000, args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
  const page = await browser.newPage({viewport: {width: 960, height: 720}, deviceScaleFactor: 1});
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
  await page.waitForFunction(() => window.kitchenModel, {timeout: 90000});
  assert.deepEqual((await page.evaluate(furnitureGeometry)).failures,[]);
  diagnostics.geometry = await page.evaluate(cabinetGeometry);
  assert.ok(diagnostics.geometry.fronts > 10);
  assert.deepEqual(diagnostics.geometry.failures, []);
  diagnostics.gpu = await page.evaluate(() => {
    const gl = kitchenModel.renderer.getContext();
    if (gl.isContextLost()) throw Error('WebGL context lost');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    return {version: gl.getParameter(gl.VERSION), renderer: gl.getParameter(gl.RENDERER), backend: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'not exposed'};
  });
  const presets = process.argv.includes('--furniture-only') ? ['cooking', 'dining'] : process.argv.includes('--hob-only') ? ['hob', 'hob-bases'] : await page.evaluate(() => ['hob', 'hob-bases', ...Object.keys(kitchenModel.views).filter(name => name !== 'hob')]);
  /** Check every preset produces nonuniform GPU pixels while a repeatable small camera sweep is captured. */
  for (const preset of presets) {
    for (const offset of [-.06, 0, .06]) {
      const result = await page.evaluate(({preset, offset}) => {
        const m = kitchenModel;
        const baseView = preset === 'hob-bases' ? 'hob' : preset;
        m.view(baseView);
        const target = [...m.views[baseView].target];
        if (preset === 'hob-bases') { m.camera.position.y = 1.1; target[1] = .35; }
        m.camera.position.x += offset;
        m.camera.lookAt(...target);
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
  await writeFile(resolve(output, 'index.html'), '<!doctype html><title>Camera sweep review</title><style>body{background:#222;color:white;font:16px sans-serif}section{display:flex}img{width:32%}</style><h1>Frozen scene camera sweep</h1><p>Left, centre, right: camera translates ±6 cm. These frames support visual review, not an automatic flicker verdict. Lighting and animation remain frozen. Public scene only.</p>' + [...new Set(diagnostics.frames.map(frame => frame.preset))].map(preset => '<h2>' + preset + '</h2><section>' + diagnostics.frames.filter(frame => frame.preset === preset).map(frame => '<img src="' + frame.filename + '">').join('') + '</section>').join(''));
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
  clearTimeout(watchdog);
}
console.log('Rendered sweep artifacts: ' + output);
