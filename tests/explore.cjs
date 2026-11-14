const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

module.exports = async (page, base) => {
  const news = JSON.parse(await fs.readFile('news.json','utf8'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'#news');
  const visible = () => page.locator('#news [data-news-category]:visible').count();
  assert.equal(await visible(),news.length);
  for (const category of ['Research','Life']) {
    await page.locator(`[data-timeline-filter="${category}"]`).click();
    assert.equal(await visible(),news.filter(item=>item.category===category).length);
    assert(await page.locator('#news [data-news-category]:visible').evaluateAll((nodes,category)=>nodes.every(node=>node.dataset.newsCategory===category),category));
    for (const year of [...new Set(news.map(item=>item.date.slice(0,4)))]) {
      await page.selectOption('#timeline-year',year);
      const expected=news.filter(item=>item.category===category && item.date.startsWith(year)).length;
      assert.equal(await visible(),expected);
      assert.equal(await page.locator('#timeline-empty').isVisible(),expected===0);
      assert.equal(await page.locator('#timeline-status').textContent(),`${expected} ${expected===1?'update':'updates'} shown`);
      assert(await page.locator('[data-timeline-year]').evaluateAll(groups=>groups.every(group=>group.hidden===[...group.querySelectorAll('[data-news-category]')].every(row=>row.hidden))));
    }
    await page.selectOption('#timeline-year','all');
  }
  await page.locator('[data-timeline-filter="all"]').click();
  assert.equal(await visible(),news.length);
  await page.goto(base+'#questions');
  await page.locator('[data-playground-link]').click();
  await page.waitForFunction(()=>location.hash==='#research' && document.activeElement.id==='playground-heading');
  assert(await page.locator('.playground-interactive').isVisible());
  assert(await page.locator('.playground-fallback').isHidden());
  const scene=page.locator('#reconstruction-comparison');
  await page.waitForFunction(()=>[...document.querySelectorAll('.reconstruction-crop img')].every(img=>img.complete && img.naturalWidth===1704));
  const range=page.locator('#comparison-reveal');
  for (const value of [0,50,100]) {
    await page.locator(`[data-comparison-preset="${value}"]`).click();
    assert.equal(await range.inputValue(),String(value));
    assert.equal(await scene.evaluate(el=>el.style.getPropertyValue('--reveal')),value+'%');
    assert.equal(await page.locator(`[data-comparison-preset="${value}"]`).getAttribute('aria-pressed'),'true');
  }
  const later=await scene.screenshot();
  await range.focus();await page.keyboard.press('Home');
  assert.equal(await range.inputValue(),'0');
  const earlier=await scene.screenshot();
  assert.notDeepEqual(earlier,later,'real early and late views differ');
  await page.keyboard.press('ArrowRight');assert.equal(await range.inputValue(),'1');
  await page.keyboard.press('End');assert.equal(await range.inputValue(),'100');
  await scene.scrollIntoViewIfNeeded();
  let box=await scene.boundingBox();
  await page.mouse.move(box.x+box.width*.8,box.y+box.height*.5);await page.mouse.down();
  await page.mouse.move(box.x+box.width*.25,box.y+box.height*.5,{steps:6});await page.mouse.up();
  assert(Math.abs(Number(await range.inputValue())-25)<=1,'divider follows pointer drag');
  await page.locator('#comparison-zoom').click();
  assert.equal(await page.locator('#comparison-zoom').getAttribute('aria-pressed'),'true');
  assert(await scene.evaluate(el=>el.classList.contains('is-zoomed')));
  await page.locator('#comparison-zoom').click();
  assert.equal(await page.locator('#comparison-zoom').getAttribute('aria-pressed'),'false');
  for (const size of [{width:320,height:640},{width:390,height:844}]) {
    await page.setViewportSize(size);await scene.scrollIntoViewIfNeeded();
    box=await scene.boundingBox();
    assert(box.x>=-1 && box.x+box.width<=size.width+1,'mobile comparison fits');
    assert(await page.locator('#research').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await scene.click({position:{x:box.width*.7,y:box.height*.5}});
    assert(Math.abs(Number(await range.inputValue())-70)<=1,'mobile tap moves divider');
    await page.locator('[data-comparison-preset="50"]').click();
    assert.equal(await range.inputValue(),'50');
  }
  await page.setViewportSize({width:1440,height:960});
  await page.getByRole('button',{name:'Switch to dark theme'}).click();
  assert(await scene.isVisible());
  await page.getByRole('button',{name:'Switch to light theme'}).click();
  const value=await range.inputValue();await page.waitForTimeout(150);assert.equal(await range.inputValue(),value,'no autoplay');
  await page.emulateMedia({reducedMotion:'no-preference'});
  console.log('PASS: research/life/year timeline intersections and empty states; real reconstruction reveal, image assets, presets, keyboard, pointer drag, zoom, phone layout, themes and playground entry focus.');
};
