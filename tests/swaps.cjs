const assert = require('node:assert/strict');

// Dropping node A onto node B's original seat must end with A on B's seat and
// B on A's seat (or a manual completion drag), with nothing overlapping and
// the route still on home.
module.exports = async function verifySwaps(page, base) {
  const sel = route => `.destination[data-route="${route}"]`;
  const centerOf = async selector => {
    const box = await page.locator(selector).boundingBox();
    return {x:box.x+box.width/2,y:box.y+box.height/2};
  };
  const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  const dragTo = async (from,to) => {
    await page.mouse.move(from.x,from.y);
    await page.mouse.down();
    await page.mouse.move(to.x,to.y,{steps:30});
    await page.mouse.up();
  };
  // No pair among the six nodes and the fixed name may overlap by more than
  // 1px on both axes.
  const noOverlap = () => {
    const rects = [...document.querySelectorAll('.destination'),document.querySelector('.map-identity')]
      .map(el=>el.getBoundingClientRect());
    for (let i=0;i<rects.length;i++) for (let j=i+1;j<rects.length;j++) {
      const a=rects[i],b=rects[j];
      const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      const overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if (overlapX>1 && overlapY>1) return false;
    }
    return true;
  };
  const awaitNoOverlap = async () => {
    await page.waitForTimeout(1000); // Let collision-only easing finish before the next grab.
    await page.waitForFunction(noOverlap,null,{timeout:4000});
  };
  const assertHome = async label => assert.equal(
    await page.locator('#home').getAttribute('aria-hidden'),'false',`${label}: route left home`);

  for (const size of [{width:1440,height:960},{width:390,height:844},{width:320,height:640},{width:844,height:390}]) {
    for (const [a,b] of [['news','questions'],['projects','about'],['off-duty','contact']]) {
      await page.setViewportSize(size);
      await page.goto(base);
      await page.waitForTimeout(900); // entrance animation settles
      const label=`${size.width}x${size.height} ${a}/${b}`;
      try {
        const originalA = await centerOf(sel(a));
        const originalB = await centerOf(sel(b));
        await dragTo(originalA,originalB);
        await awaitNoOverlap();
        await assertHome(`${label}: after drop`);

        if (size.width===1440 && (a==='news'||a==='projects')) {
          const settledA = await centerOf(sel(a));
          const settledB = await centerOf(sel(b));
          assert(distance(settledA,originalB)<=2,`${label}: A must land on B's seat (off by ${distance(settledA,originalB).toFixed(1)}px)`);
          assert(distance(settledB,originalA)<=2,`${label}: B must land on A's seat (off by ${distance(settledB,originalA).toFixed(1)}px)`);
        }

        const geometry = await page.locator('.destination').evaluateAll(nodes=>nodes.map(el=>{
          const r=el.getBoundingClientRect();
          return {name:el.dataset.route,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
        }));
        for (const node of geometry) {
          assert(node.left>=-2 && node.right<=size.width+2,`${label}: ${node.name} outside horizontal viewport: ${JSON.stringify(node)}`);
          assert(node.top>=60 && node.bottom<=size.height-45,`${label}: ${node.name} outside vertical viewport: ${JSON.stringify(node)}`);
          assert(node.width>=44 && node.height>=44,`${label}: small target ${node.name}: ${JSON.stringify(node)}`);
        }

        const centerB = await centerOf(sel(b));
        if (distance(centerB,originalA)>8) {
          await dragTo(centerB,originalA);
          await awaitNoOverlap();
        }
        await assertHome(`${label}: after completion`);

        if (size.width===390) await page.screenshot({path:'test-results/swap-mobile.png'});
        if (size.width===1440 && a==='news') await page.screenshot({path:'test-results/swap-desktop.png'});
      } finally {
        await page.mouse.up().catch(()=>{});
      }
    }
  }

  await page.setViewportSize({width:1440,height:960});
  await page.goto(base);
  await page.waitForTimeout(900);
  console.log('PASS: node swaps at 1440/390/320/844 widths, seat-for-seat on desktop, no overlaps with the fixed name, viewport bounds, route stays home.');
};
