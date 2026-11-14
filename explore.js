'use strict';

(() => {
  // The generated HTML remains the complete timeline when JavaScript is unavailable.
  const timeline = document.getElementById('news');
  const yearSelect = document.getElementById('timeline-year');
  const topicButtons = [...document.querySelectorAll('[data-timeline-filter]')];
  if (timeline && yearSelect) {
    const groups = [...timeline.querySelectorAll('[data-timeline-year]')];
    const rows = [...timeline.querySelectorAll('[data-news-category]')];
    let category = 'all';
    for (const group of groups) yearSelect.add(new Option(group.dataset.timelineYear, group.dataset.timelineYear));
    const filterTimeline = () => {
      let count = 0;
      for (const row of rows) {
        const visible = (category === 'all' || row.dataset.newsCategory === category) && (yearSelect.value === 'all' || row.dataset.newsYear === yearSelect.value);
        row.hidden = !visible;
        if (visible) count++;
      }
      for (const group of groups) group.hidden = ![...group.querySelectorAll('[data-news-category]')].some(row => !row.hidden);
      topicButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.timelineFilter === category)));
      document.getElementById('timeline-status').textContent = `${count} ${count === 1 ? 'update' : 'updates'} shown`;
      document.getElementById('timeline-empty').hidden = count !== 0;
    };
    topicButtons.forEach(button => button.addEventListener('click', () => {category = button.dataset.timelineFilter;filterTimeline();}));
    yearSelect.addEventListener('change', filterTimeline);
    filterTimeline();
  }

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
  // Both views use the original presentation image, cropped by CSS without altering pixels.
  playground.querySelector('.playground-interactive').hidden = false;
  playground.querySelector('.playground-fallback').hidden = true;
  update();
})();
