const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

module.exports = async (page, base) => {
  const news = JSON.parse(await fs.readFile('news.json','utf8'));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.goto(base+'#news');
  assert.equal(await page.locator('#news article:visible').count(),news.length);
  assert.equal(await page.locator('[data-timeline-filter]').count(),0);
  await page.goto(base+'#about');
  assert(await page.locator('#about .personal-timeline').isVisible());
  assert.deepEqual(await page.locator('.personal-timeline time').allTextContents(),['2022','2023','2026','2026','2026','2026']);
  assert.equal(await page.locator('.about-timeline-link').count(),0);
  assert.deepEqual(await page.locator('.personal-timeline h4').allTextContents(),['Started at NTHU','Transferred to Computer Science','Vis4GS accepted at IEEE VIS','Released the Vis4GS preprint','Started M.S. studies in ISA','Presented at IEEE VIS 2026']);
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
  const family = JSON.parse(await fs.readFile('assets/vis4gs-genealogy.json','utf8'));
  assert.equal(await page.locator('[data-genealogy-id]').count(),family.nodes.length);
  for (const node of family.nodes) {
    const button=page.locator(`[data-genealogy-id="${node.id}"]`);
    assert.equal(await button.getAttribute('data-birth'),String(node.birth));
    assert.equal(await button.getAttribute('data-parent'),node.parentIds.length?String(node.parentIds[0]):'');
    assert.equal(await button.getAttribute('data-pruned'),node.prunedAt===null?'':String(node.prunedAt));
  }
  assert.equal(await page.locator('#genealogy-path').textContent(),'#3125 → #903358 → #1279124');
  await page.locator('#genealogy-parent-button').click();
  assert.equal(await page.locator('#genealogy-select').inputValue(),'903358');
  assert.equal(await page.locator('#genealogy-children').textContent(),'2');
  await page.locator('#genealogy-parent-button').click();
  assert(await page.locator('#genealogy-parent-button').isDisabled());
  assert.equal(await page.locator('#genealogy-pruned').textContent(),'3,100');
  await page.locator('[data-genealogy-id="1171301"]').press('Enter');
  assert.equal(await page.locator('#genealogy-birth').textContent(),'3,300');
  assert.equal(await page.locator('.genealogy-node.is-lineage').count(),3);
  assert.equal(await page.locator('.genealogy-edges path.is-lineage').count(),2);
  for (const size of [{width:320,height:640},{width:390,height:844}]) {
    await page.setViewportSize(size);
    await page.selectOption('#genealogy-select','475872');
    assert.equal(await page.locator('#genealogy-path').textContent(),'#3125 → #475872');
    assert(await page.locator('.genealogy-scroll').evaluate(el=>el.scrollWidth>el.clientWidth));
    await scene.scrollIntoViewIfNeeded();
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
  console.log('PASS: inline personal timeline below the About bio and separate News feed; real reconstruction reveal, image assets, presets, keyboard, pointer drag, zoom, phone layout, themes playground entry focus, recorded genealogy integrity, ancestor selection and mobile tree controls.');
};
