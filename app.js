'use strict';

(() => {
  const root = document.documentElement;
  const atlas = document.getElementById('home');
  const viewport = document.getElementById('map-viewport');
  const scene = document.getElementById('map-scene');
  const pages = [...document.querySelectorAll('[data-page]')];
  const dialog = document.getElementById('directory-dialog');
  const directoryToggle = document.getElementById('directory-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const labels = {home:'Home',research:'Research',about:'About',questions:'Research direction','off-duty':'Off duty',contact:'Say hello'};
  let currentRoute = null;
  let returnFocus = null;
  let directoryFocus = null;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let drag = null;
  let resizeFrame = 0;

  function routeFromHash() {
    let value;
    try { value = decodeURIComponent(location.hash.slice(1)); } catch { return 'home'; }
    return Object.hasOwn(labels, value) ? value : 'home';
  }

  function closeDirectory(restoreFocus = true) {
    if (!dialog.open) return;
    dialog.close();
    if (restoreFocus) (directoryFocus || directoryToggle).focus({preventScroll:true});
  }

  function openDirectory() {
    if (dialog.open) return;
    directoryFocus = document.activeElement;
    dialog.showModal();
    document.getElementById('directory-close').focus();
  }

  function renderRoute(route, source = null, initial = false) {
    if (route === currentRoute && !initial) return;
    const previous = currentRoute;
    currentRoute = route;
    closeDirectory(false);
    if (source?.classList.contains('destination')) {
      returnFocus = source;
      const rect = source.getBoundingClientRect();
      const bounds = atlas.getBoundingClientRect();
      if (bounds.width && bounds.height) {
        atlas.style.setProperty('--origin-x', `${((rect.left + rect.width / 2 - bounds.left) / bounds.width) * 100}%`);
        atlas.style.setProperty('--origin-y', `${((rect.top + rect.height / 2 - bounds.top) / bounds.height) * 100}%`);
      }
    }
    pages.forEach(page => {
      const active = page.id === route;
      page.hidden = !active;
      page.inert = !active;
      if (active) page.scrollTop = 0;
    });
    const isHome = route === 'home';
    atlas.classList.toggle('is-away', !isHome);
    atlas.inert = !isHome;
    atlas.setAttribute('aria-hidden', String(!isHome));
    document.body.dataset.route = route;
    document.getElementById('route-crumb').textContent = isHome ? '' : labels[route];
    document.title = isHome ? 'Ken Lin | Research atlas' : `${labels[route]} | Ken Lin`;
    document.querySelectorAll('[data-route]').forEach(link => {
      if (link.dataset.route === route) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if (isHome) {
      if (!initial || previous) (returnFocus || viewport).focus({preventScroll:true});
      scheduleConnections();
    } else {
      document.getElementById(route).querySelector('h2').focus({preventScroll:true});
    }
    document.getElementById('navigation-status').textContent = isHome ? 'Home overview' : `${labels[route]} opened. Use Home to return to the map.`;
  }

  function navigate(route, source = null) {
    if (!Object.hasOwn(labels, route)) return;
    const unchanged = route === currentRoute;
    closeDirectory(unchanged);
    if (unchanged) return;
    history.pushState({route},'',`#${route}`);
    renderRoute(route, source);
  }

  function updateCamera() {
    // Bounded travel always leaves part of the map visible; Reset restores all destinations.
    const limitX = viewport.clientWidth * (.2 + (zoom - 1) / 2);
    const limitY = viewport.clientHeight * (.2 + (zoom - 1) / 2);
    panX = Math.max(-limitX, Math.min(limitX, panX));
    panY = Math.max(-limitY, Math.min(limitY, panY));
    scene.style.setProperty('--pan-x', `${panX}px`);
    scene.style.setProperty('--pan-y', `${panY}px`);
    scene.style.setProperty('--zoom', String(zoom));
    document.getElementById('zoom-level').value = `${Math.round(zoom * 100)}%`;
    zoomOut.disabled = zoom <= .8;
    zoomIn.disabled = zoom >= 1.6;
  }

  function changeZoom(amount) {
    zoom = Math.max(.8,Math.min(1.6,Math.round((zoom + amount) * 10) / 10));
    updateCamera();
  }

  function resetCamera() { zoom = 1; panX = 0; panY = 0; updateCamera(); }

  function drawConnections() {
    if (currentRoute !== 'home') return;
    const bounds = scene.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const width = scene.clientWidth;
    const height = scene.clientHeight;
    const svg = scene.querySelector('.connections');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const ratioX = width / bounds.width;
    const ratioY = height / bounds.height;
    const localBox = element => {
      const r = element.getBoundingClientRect();
      return {x:(r.left + r.width / 2 - bounds.left) * ratioX, y:(r.top + r.height / 2 - bounds.top) * ratioY, w:r.width * ratioX, h:r.height * ratioY};
    };
    const origin = localBox(scene.querySelector('.map-identity'));
    scene.querySelectorAll('.destination').forEach(link => {
      const target = localBox(link);
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const startT = Math.min((origin.w / 2 + 16) / Math.max(Math.abs(dx),1),(origin.h / 2 + 16) / Math.max(Math.abs(dy),1));
      const endT = Math.min((target.w / 2 + 12) / Math.max(Math.abs(dx),1),(target.h / 2 + 12) / Math.max(Math.abs(dy),1));
      const start = {x:origin.x + dx * startT,y:origin.y + dy * startT};
      const end = {x:target.x - dx * endT,y:target.y - dy * endT};
      const path = svg.querySelector(`[data-path="${link.dataset.route}"]`);
      path.setAttribute('d', `M${start.x} ${start.y} C${(start.x+end.x)/2} ${start.y},${(start.x+end.x)/2} ${end.y},${end.x} ${end.y}`);
    });
  }

  function scheduleConnections() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(drawConnections);
  }

  document.addEventListener('click', event => {
    const link = event.target.closest('a[data-route]');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.dataset.route, link);
  });
  document.querySelector('.skip-link').addEventListener('click', event => {event.preventDefault();openDirectory();});
  window.addEventListener('popstate', () => renderRoute(routeFromHash()));
  window.addEventListener('hashchange', () => renderRoute(routeFromHash()));
  directoryToggle.addEventListener('click', openDirectory);
  document.getElementById('directory-close').addEventListener('click', () => closeDirectory());
  dialog.addEventListener('cancel', event => {event.preventDefault();closeDirectory();});
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDirectory();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (dialog.open) {event.preventDefault();closeDirectory();}
      else if (currentRoute !== 'home') {event.preventDefault();navigate('home');}
    }
  });
  // Native modal dialogs manage focus containment; this also keeps behavior deterministic.
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('a,button')];
    if (event.shiftKey && document.activeElement === items[0]) {event.preventDefault();items.at(-1).focus();}
    else if (!event.shiftKey && document.activeElement === items.at(-1)) {event.preventDefault();items[0].focus();}
  });
  zoomIn.addEventListener('click', () => changeZoom(.1));
  zoomOut.addEventListener('click', () => changeZoom(-.1));
  document.getElementById('reset-view').addEventListener('click', resetCamera);
  viewport.addEventListener('keydown', event => {
    if (event.target !== viewport || event.ctrlKey || event.metaKey || event.altKey) return;
    const moves = {ArrowLeft:[40,0],ArrowRight:[-40,0],ArrowUp:[0,40],ArrowDown:[0,-40]};
    if (moves[event.key]) {event.preventDefault();panX += moves[event.key][0];panY += moves[event.key][1];updateCamera();}
    else if (event.key === '+' || event.key === '=') {event.preventDefault();changeZoom(.1);}
    else if (event.key === '-') {event.preventDefault();changeZoom(-.1);}
    else if (event.key === '0') {event.preventDefault();resetCamera();}
  });
  viewport.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.isPrimary || event.target.closest('a,button')) return;
    drag = {id:event.pointerId,x:event.clientX,y:event.clientY,panX,panY};
    viewport.setPointerCapture(event.pointerId);
    viewport.classList.add('is-dragging');
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    panX = drag.panX + event.clientX - drag.x;
    panY = drag.panY + event.clientY - drag.y;
    updateCamera();
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const id = drag.id; drag = null;
    viewport.classList.remove('is-dragging');
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
  }
  viewport.addEventListener('pointerup',endDrag);
  viewport.addEventListener('pointercancel',endDrag);
  viewport.addEventListener('lostpointercapture',endDrag);
  scene.querySelectorAll('.destination').forEach(link => {
    const path = scene.querySelector(`[data-path="${link.dataset.route}"]`);
    link.addEventListener('mouseenter', () => path.classList.add('is-highlighted'));
    link.addEventListener('mouseleave', () => path.classList.remove('is-highlighted'));
    link.addEventListener('focus', () => {
      path.classList.add('is-highlighted');
      const a = link.getBoundingClientRect(), b = viewport.getBoundingClientRect();
      if (a.left < b.left || a.right > b.right || a.top < b.top || a.bottom > b.bottom) resetCamera();
    });
    link.addEventListener('blur', () => path.classList.remove('is-highlighted'));
  });

  function setTheme(value) {
    root.dataset.theme = value;
    themeToggle.textContent = value === 'dark' ? 'Light' : 'Dark';
    themeToggle.setAttribute('aria-label',`Switch to ${value === 'dark' ? 'light' : 'dark'} theme`);
    document.querySelector('meta[name="theme-color"]').content = value === 'dark' ? '#142b3c' : '#d7e7f0';
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('ken-portfolio-theme'); } catch { /* Storage is optional. */ }
  setTheme(savedTheme === 'dark' ? 'dark' : 'light');
  themeToggle.addEventListener('click', () => {
    const value = root.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(value);
    try {localStorage.setItem('ken-portfolio-theme',value);} catch { /* Still works this visit. */ }
  });
  window.addEventListener('resize', () => {resetCamera();scheduleConnections();});
  scene.querySelectorAll('img').forEach(image => image.addEventListener('load',scheduleConnections));
  document.fonts?.ready.then(scheduleConnections);
  root.classList.add('js');
  renderRoute(routeFromHash(),null,true);
  updateCamera();
})();
