const assert = require('node:assert/strict');

module.exports = async function verifyPhysics(page, base) {
  const reset=async()=>{await page.locator('#reset-view').click();await page.waitForTimeout(550);};
  const offset=selector=>page.locator(selector).evaluate(el=>[...getComputedStyle(el).translate.split(' ').map(parseFloat),0].slice(0,2));
  const center=async selector=>{const r=await page.locator(selector).boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2};};
  const move=async(selector,dx,dy)=>{const p=await center(selector);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+dx,p.y+dy,{steps:12});};
  await page.goto(base);await page.waitForTimeout(900);
  const routes=await page.locator('.destination').evaluateAll(els=>els.map(el=>el.dataset.route));
  assert.equal(routes.length,6);
  for (const route of routes) {
    await reset();
    const selector=`.destination[data-route="${route}"]`;
    const path=page.locator(`.connections [data-path="${route}"]`);
    const original=await path.getAttribute('d');
    const camera=await page.locator('#map-scene').getAttribute('style');
    await move(selector,35,25);
    assert(Math.hypot(...await offset(selector))>15,`${route}: node follows drag`);
    assert.notEqual(await path.getAttribute('d'),original,`${route}: connector follows`);
    assert.equal(await page.locator('#map-scene').getAttribute('style'),camera,`${route}: camera must not pan`);
    await page.mouse.up();
    assert.equal(await page.locator('#home').getAttribute('aria-hidden'),'false',`${route}: drag must not navigate`);
  }
  // Dragging into a neighbor transfers displacement instead of stacking both nodes.
  await reset();
  const source=await center('.destination-news'), neighbor=await center('.destination-questions');
  await move('.destination-news',neighbor.x-source.x,neighbor.y-source.y);
  await page.waitForTimeout(120);
  assert(Math.hypot(...await offset('.destination-questions'))>10,'a dragged node pushes its neighbor');
  await page.mouse.up();
  // Returning focus resumes a collision that was paused mid-animation.
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  const suspended=await page.locator('.destination').evaluateAll(els=>els.map(el=>el.style.translate));
  await page.waitForTimeout(150);
  assert.deepEqual(await page.locator('.destination').evaluateAll(els=>els.map(el=>el.style.translate)),suspended,'window blur pauses collision movement');
  await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.waitForFunction(previous=>JSON.stringify([...document.querySelectorAll('.destination')].map(el=>el.style.translate))!==JSON.stringify(previous),suspended);
  // Nodes stay exactly where dropped; physics only resolves collisions.
  await reset();await move('.destination-news',40,10);await page.mouse.up();
  const dropped=await offset('.destination-news');
  assert(Math.hypot(...dropped)>20,'dropped node keeps its placement');
  await page.waitForTimeout(180);
  assert.deepEqual(await offset('.destination-news'),dropped,'stationary drop holds after release');
  await page.waitForTimeout(1200);
  assert.deepEqual(await offset('.destination-news'),dropped,'stationary drop holds over time');
  await page.locator('.destination-news').click();await page.waitForTimeout(850);
  await page.keyboard.press('Escape');await page.waitForTimeout(850);
  assert.deepEqual(await offset('.destination-news'),dropped,'navigation preserves placement');
  await reset();
  assert((await page.locator('.destination').evaluateAll(els=>els.map(el=>el.style.translate))).every(value=>value.split(' ').every(part=>parseFloat(part)===0)),'Reset restores every node');
  // Camera scale is accounted for: screen movement remains equal to pointer movement.
  await page.locator('#zoom-in').click();await page.waitForTimeout(550);
  const start=await center('.destination-news');await move('.destination-news',44,0);
  const dragged=await center('.destination-news');assert(Math.abs(dragged.x-start.x-44)<3,'drag tracks pointer when zoomed');
  await page.mouse.up();await reset();
  // Fast throws stay within the map and stop when the modal suspends it.
  await move('.destination-news',-2000,2000);await page.mouse.up();await page.waitForTimeout(150);
  const node=await page.locator('.destination-news').boundingBox(),scene=await page.locator('#map-scene').boundingBox();
  assert(node.x>=scene.x-1 && node.y>=scene.y-1 && node.x+node.width<=scene.x+scene.width+1 && node.y+node.height<=scene.y+scene.height+1,'throw bounded by scene');
  await page.locator('#directory-toggle').click();
  const paused=await offset('.destination-news');await page.waitForTimeout(200);
  assert.deepEqual(await offset('.destination-news'),paused,'Directory pauses physics');
  await page.keyboard.press('Escape');await reset();
  await page.locator('.destination-news').focus();
  await page.keyboard.press('Alt+ArrowLeft');
  const nudged=await offset('.destination-news');await page.waitForTimeout(200);
  assert.deepEqual(await offset('.destination-news'),nudged,'keyboard nudge stays put');
  assert(Math.hypot(...nudged)>20,'keyboard nudge displaces the node');
  await reset();
  await page.emulateMedia({reducedMotion:'reduce'});
  await move('.destination-news',35,20);await page.mouse.up();
  const still=await offset('.destination-news');await page.waitForTimeout(200);
  assert.deepEqual(await offset('.destination-news'),still,'reduced motion disables inertia');
  await page.locator('.destination-news').focus();
  await page.keyboard.press('Alt+ArrowRight');
  assert.notDeepEqual(await offset('.destination-news'),still,'keyboard moves focused node');
  await page.keyboard.press('0');assert.deepEqual(await offset('.destination-news'),[0,0]);
  await page.keyboard.press('Enter');await page.waitForTimeout(100);
  assert.equal(await page.locator('#news').isVisible(),true,'Enter opens News');
  await page.keyboard.press('Escape');await page.emulateMedia({reducedMotion:'no-preference'});await reset();
  await page.locator('.destination-news').click();await page.waitForTimeout(850);
  assert.equal(await page.locator('#news').isVisible(),true,'click opens News after drag');
  await page.keyboard.press('Escape');await page.waitForTimeout(850);
  // Real touch events exercise browser gesture arbitration and pointer capture on mobile.
  const mobile=await page.context().browser().newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  try {
    const touch=await mobile.newPage();await touch.goto(base);await touch.waitForTimeout(900);
    const client=await mobile.newCDPSession(touch);
    const r=await touch.locator('.destination-news').boundingBox();const x=r.x+r.width/2,y=r.y+r.height/2;
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    for(let i=1;i<=8;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-2*i,y:y-2*i}]});
    // Touch moves may be coalesced until the next browser frame.
    await touch.waitForFunction(()=>{const [x,y=0]=getComputedStyle(document.querySelector('.destination-news')).translate.split(' ').map(parseFloat);return x<=-15 && y<=-15;});
    const translated=await touch.locator('.destination-news').evaluate(el=>el.style.translate.split(' ').map(parseFloat));
    assert(Math.hypot(...translated)>20,'touch moves News node');
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    const resting=await touch.locator('.destination-news').evaluate(el=>el.style.translate);
    await touch.waitForTimeout(250);
    assert.equal(await touch.locator('.destination-news').evaluate(el=>el.style.translate),resting,'touch drop stays put');
    assert.equal(await touch.locator('#home').getAttribute('aria-hidden'),'false','touch drag does not navigate');
    await touch.locator('#reset-view').tap();await touch.waitForTimeout(550);
    const b=await touch.locator('.destination-news').boundingBox();
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:b.x+20,y:b.y+20}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x+50,y:b.y-10}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
    assert.equal(await touch.locator('.is-node-held').count(),0,'cancellation releases capture state');
    await touch.locator('#reset-view').tap();await touch.waitForTimeout(550);
    await touch.locator('.destination-news').tap();await touch.waitForTimeout(850);
    assert.equal(await touch.locator('#news').isVisible(),true,'touch tap still navigates');
  } finally {await mobile.close();}
  console.log('PASS: all six draggable nodes, connectors, camera isolation, stationary drops and collisions, bounds, zoom, modal pause, reset, keyboard, reduced motion, touch and cancellation.');
};
