const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');

(async () => {
  const root = process.cwd();
  const server = http.createServer(async (req,res) => {
    try {
      const raw = decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\/kekn521\//,'/');
      const file = path.resolve(root,'.'+(raw === '/' ? '/index.html' : raw));
      if (!file.startsWith(root+path.sep)) {res.writeHead(403).end();return;}
      const types = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
      res.setHeader('Content-Type',types[path.extname(file)] || 'application/octet-stream');
      res.end(await fs.readFile(file));
    } catch {res.writeHead(404).end();}
  });
  await new Promise(resolve => server.listen(4173,'127.0.0.1',resolve));
  await fs.mkdir('test-results',{recursive:true});
  const browser = await chromium.launch();
  const context = await browser.newContext({viewport:{width:1440,height:960}});
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)errors.push(`${response.status()}: ${response.url()}`);});
  const base='http://127.0.0.1:4173/';
  const settle = async () => {await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(850);};
  const screenshot = async name => {await page.screenshot({path:`test-results/${name}.png`,fullPage:true});const review=await page.screenshot({type:'jpeg',quality:45,fullPage:true});console.log('VISUAL_REVIEW '+name+' '+review.toString('base64'));};
  try {
    await page.goto(base);await settle();await screenshot('atlas-desktop');
    assert.equal(await page.locator('[data-page]:visible').count(),0);
    assert.equal(await page.locator('.destination:visible').count(),5);
    await page.getByRole('button',{name:'Zoom in',exact:true}).click();
    assert.equal(await page.locator('#zoom-level').textContent(),'110%');
    await page.getByRole('button',{name:'Reset view',exact:true}).click();
    assert.equal(await page.locator('#zoom-level').textContent(),'100%');
    await page.mouse.move(500,800);await page.mouse.down();await page.mouse.move(570,820,{steps:5});await page.mouse.up();
    assert.notEqual(await page.locator('#map-scene').evaluate(el=>el.style.getPropertyValue('--pan-x')),'0px');
    await page.getByRole('button',{name:'Reset view',exact:true}).click();
    await page.locator('.destination-research').click();await settle();
    assert.equal(new URL(page.url()).hash,'#projects');
    assert.equal(await page.locator('#projects-heading').evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('#projects article').count(),5);
    await screenshot('projects-desktop');
    await page.locator('#projects a[data-route="research"]').click();await settle();
    assert.equal(new URL(page.url()).hash,'#research');
    assert.equal(await page.locator('[data-page]:visible').count(),1);
    assert.equal(await page.locator('#research-heading').evaluate(el=>el===document.activeElement),true);
    await screenshot('research-desktop');
    await page.goBack();await settle();assert.equal(await page.locator('#projects').isVisible(),true);
    await page.goBack();await settle();assert.equal(await page.locator('#home').getAttribute('aria-hidden'),'false');
    await page.goForward();await settle();assert.equal(await page.locator('#projects').isVisible(),true);
    await page.keyboard.press('Escape');await settle();assert.equal(new URL(page.url()).hash,'#home');
    await page.getByRole('button',{name:'Directory',exact:false}).click();assert.equal(await page.locator('#directory-dialog').evaluate(el=>el.open),true);
    await page.locator('#directory-dialog a[data-route="about"]').click();await settle();assert.equal(await page.locator('#about').isVisible(),true);
    await page.getByRole('button',{name:'Directory',exact:false}).click();
    await page.locator('#directory-dialog a[data-route="about"]').click();
    assert.equal(await page.locator('#directory-toggle').evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Escape');await settle();
    await page.getByRole('button',{name:'Switch to dark theme'}).click();await screenshot('atlas-dark');
    await page.getByRole('button',{name:'Switch to light theme'}).click();

    for (const size of [{width:390,height:844},{width:320,height:640},{width:844,height:390}]) {
      await page.setViewportSize(size);await page.goto(base);await settle();await screenshot(`atlas-${size.width}x${size.height}`);
      const geometry=await page.locator('.destination').evaluateAll(nodes=>nodes.map(el=>{const r=el.getBoundingClientRect();return {name:el.dataset.route,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};}));
      for(let i=0;i<geometry.length;i++)for(let j=i+1;j<geometry.length;j++){const a=geometry[i],b=geometry[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top,`${size.width}: overlapping ${a.name} and ${b.name}`);}
      for(const node of geometry){assert(node.left>=-2 && node.right<=size.width+2,`${size.width}: ${node.name} outside horizontal viewport: ${JSON.stringify(node)}`);assert(node.top>=60 && node.bottom<=size.height-45,`${size.width}: ${node.name} outside vertical viewport: ${JSON.stringify(node)}`);assert(node.width>=44 && node.height>=44,`Small target: ${node.name}`);}
      for(const route of ['projects','research','about','questions','off-duty','contact']) {
        await page.goto(base+'#'+route);await settle();
        assert.equal(await page.locator('#'+route).isVisible(),true);
        const headingTop=await page.locator('#'+route+' h2').evaluate(el=>el.getBoundingClientRect().top);
        assert(headingTop>=60,`${size.width}: clipped heading in ${route}: ${headingTop}`);
        assert.equal(await page.locator('#'+route).evaluate(el=>el.scrollWidth<=el.clientWidth+1),true,`${size.width}: overflow in ${route}`);
        if(size.width===390 && ['projects','research','off-duty'].includes(route)) await screenshot(`${route}-mobile`);
      }
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.goto(base+'#about');await settle();
    assert.equal(await page.locator('#about').evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.goto(base+'#does-not-exist');await settle();assert.equal(await page.locator('#home').getAttribute('aria-hidden'),'false');
    assert.deepEqual(errors,[]);
    const noJS = await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});
    const plain = await noJS.newPage();await plain.goto(base);
    assert.equal(await plain.locator('[data-page]:visible').count(),6);
    assert.equal(await plain.locator('#directory').isVisible(),true);
    await noJS.close();
    console.log('PASS: atlas navigation, direct routes, back/forward, Escape, directory focus, camera controls, theme, 3 viewport sizes, reduced motion, assets, and no-JS content.');
  } catch(error) {
    await screenshot('failure');throw error;
  } finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
