'use strict';

(() => {
  const playground = document.getElementById('research-playground');
  const comparison = document.getElementById('reconstruction-comparison');
  const reveal = document.getElementById('comparison-reveal');
  if (!playground || !comparison || !reveal) return;
  const presets = [...playground.querySelectorAll('[data-comparison-preset]')];
  const zoom = document.getElementById('comparison-zoom');
  let pointer = null;
  const update = () => {
    const value = Number(reveal.value);
    comparison.style.setProperty('--reveal', `${value}%`);
    document.getElementById('comparison-amount').textContent = `${value}%`;
    reveal.setAttribute('aria-valuetext', `${value} percent of the later reconstruction revealed`);
    comparison.setAttribute('aria-label', `Real reconstruction comparison: iteration 30,000 revealed across ${value} percent of the view, with iteration 500 in the remaining area.`);
    presets.forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.comparisonPreset) === value)));
  };
  const setFromPointer = event => {
    const bounds = comparison.getBoundingClientRect();
    reveal.value = String(Math.round(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * 100));
    update();
  };
  comparison.addEventListener('pointerdown', event => {
    if (!event.isPrimary || event.button !== 0) return;
    pointer = event.pointerId;
    comparison.setPointerCapture(pointer);
    setFromPointer(event);
  });
  comparison.addEventListener('pointermove', event => {if (event.pointerId === pointer) setFromPointer(event);});
  const release = event => {
    if (event.pointerId !== pointer) return;
    if (comparison.hasPointerCapture(pointer)) comparison.releasePointerCapture(pointer);
    pointer = null;
  };
  comparison.addEventListener('pointerup', release);
  comparison.addEventListener('pointercancel', release);
  comparison.addEventListener('lostpointercapture', () => {pointer = null;});
  reveal.addEventListener('input', update);
  presets.forEach(button => button.addEventListener('click', () => {reveal.value = button.dataset.comparisonPreset;update();}));
  zoom.addEventListener('click', () => {
    const active = comparison.classList.toggle('is-zoomed');
    zoom.setAttribute('aria-pressed', String(active));
    zoom.innerHTML = active ? 'Full view <span aria-hidden="true">−</span>' : 'Look closer <span aria-hidden="true">＋</span>';
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-playground-link]') || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    requestAnimationFrame(() => {document.getElementById('playground-heading').focus({preventScroll:true});playground.scrollIntoView({block:'start',behavior:'instant'});});
  });
  const tree = document.querySelector('.genealogy-playground');
  if (tree) {
    const buttons = [...tree.querySelectorAll('[data-genealogy-id]')];
    const nodes = new Map(buttons.map(button => [button.dataset.genealogyId, button]));
    const menu = document.getElementById('genealogy-select');
    const parentButton = document.getElementById('genealogy-parent-button');
    let selected = '';
    const selectNode = id => {
      const node = nodes.get(id);
      if (!node) return;
      selected = id;menu.value = id;
      const ancestry = [], visited = new Set();
      let current = id;
      while (nodes.has(current) && !visited.has(current)) {visited.add(current);ancestry.push(current);current = nodes.get(current).dataset.parent;}
      buttons.forEach(button => {button.setAttribute('aria-pressed', String(button === node));button.classList.toggle('is-lineage', visited.has(button.dataset.genealogyId));});
      tree.querySelectorAll('[data-genealogy-edge]').forEach(edge => edge.classList.toggle('is-lineage', visited.has(edge.dataset.genealogyEdge)));
      const number = value => Number(value).toLocaleString('en-US');
      document.getElementById('genealogy-selection').textContent = `Gaussian #${id}`;
      document.getElementById('genealogy-birth').textContent = number(node.dataset.birth);
      document.getElementById('genealogy-operation').textContent = node.dataset.operation === 'create' ? 'Initial Gaussian' : 'Clone';
      document.getElementById('genealogy-parent').textContent = node.dataset.parent ? `#${node.dataset.parent}` : 'None (root)';
      document.getElementById('genealogy-children').textContent = String(buttons.filter(button => button.dataset.parent === id).length);
      document.getElementById('genealogy-pruned').textContent = node.dataset.pruned ? number(node.dataset.pruned) : 'Not pruned by 30,000';
      document.getElementById('genealogy-path').textContent = ancestry.reverse().map(value => `#${value}`).join(' → ');
      parentButton.disabled = !node.dataset.parent;
    };
    buttons.forEach(button => button.addEventListener('click', () => selectNode(button.dataset.genealogyId)));
    menu.addEventListener('change', () => selectNode(menu.value));
    parentButton.addEventListener('click', () => selectNode(nodes.get(selected).dataset.parent));
    tree.querySelector('.genealogy-interactive').hidden = false;
    tree.querySelector('.genealogy-fallback').hidden = true;
    selectNode('1279124');
  }
  // Both views use the original presentation image, cropped by CSS without altering pixels.
  playground.querySelector('.playground-interactive').hidden = false;
  playground.querySelector('.playground-fallback').hidden = true;
  update();
})();
