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
  const labels = {home:'Home',news:'News',projects:'Projects',research:'Vis4GS',about:'About',questions:'Research direction','off-duty':'Off duty',contact:'Say hello'};
  let currentRoute = null;
  let returnFocus = null;
  let directoryFocus = null;
  let zoom = 1;
  let panX = 0;
  let panY = 0;
  let drag = null;
  let resizeFrame = 0;
  let pourObserver = null;
  let pendingEntrance = null;

  /* Motion layer: WAAPI entrance/traces, bounded and cancellable. */
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const trackedMotion = new Set();
  const nodePhysics = createNodePhysics();

  function playMotion(element, keyframes, options) {
    if (reducedMotion.matches || typeof element.animate !== 'function' || document.hidden) return null;
    const animation = element.animate(keyframes, {...options, easing:'cubic-bezier(.16,1,.3,1)', fill:'none'});
    trackedMotion.add(animation);
    const forget = () => trackedMotion.delete(animation);
    animation.addEventListener('finish', forget);
    animation.addEventListener('cancel', forget);
    return animation;
  }

  function cancelMotion() {
    [...trackedMotion].forEach(animation => animation.cancel());
    trackedMotion.clear();
  }

  function pathTraceMotion(path, duration) {
    path.getAnimations().forEach(animation => animation.cancel());
    return playMotion(path, [
      {strokeDasharray:'1', strokeDashoffset:1, opacity:.3},
      {strokeDasharray:'1', strokeDashoffset:0, opacity:1}
    ], {duration});
  }

  reducedMotion.addEventListener('change', () => {
    if (!reducedMotion.matches) return;
    cancelMotion();
    releasePourObserver();
    clearPourStates();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelMotion();
  });

  function routeFromHash() {
    let value;
    try { value = decodeURIComponent(location.hash.slice(1)); } catch { return 'home'; }
    return Object.hasOwn(labels, value) ? value : 'home';
  }

  function closeDirectory(restoreFocus = true) {
    if (!dialog.open) return;
    dialog.close();
    directoryToggle.setAttribute('aria-expanded', 'false');
    nodePhysics.wake();
    if (restoreFocus) (directoryFocus || directoryToggle).focus({preventScroll:true});
  }

  function openDirectory() {
    if (dialog.open) return;
    directoryFocus = document.activeElement;
    nodePhysics.stop();
    dialog.showModal();
    directoryToggle.setAttribute('aria-expanded', 'true');
    document.getElementById('directory-close').focus();
  }

  function renderRoute(route, source = null, initial = false) {
    if (route === currentRoute && !initial) return;
    cancelMotion();
    pendingEntrance = null;
    nodePhysics.stop();
    const previous = currentRoute;
    currentRoute = route;
    closeDirectory(false);
    if (source && atlas.contains(source)) {
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
    document.title = isHome ? 'Kai-Yuan Lin (Ken Lin) | Visual Analytics Researcher' : `${labels[route]} | Kai-Yuan Lin (Ken Lin)`;
    document.querySelectorAll('[data-route]').forEach(link => {
      if (link.dataset.route === route) link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    });
    if (isHome) {
      if (!initial || previous) (returnFocus || viewport).focus({preventScroll:true});
      pendingEntrance = {initial};
      scheduleConnections();
      releasePourObserver();
    } else {
      document.getElementById(route).querySelector('h2').focus({preventScroll:true});
      if (route === 'off-duty') setupPourObserver();
      else releasePourObserver();
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

  function resetCamera() { zoom = 1; panX = 0; panY = 0; updateCamera(); nodePhysics.reset(); }

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
      if (width < 768 && link.dataset.route === 'news' && target.y > origin.y + origin.h/2 + 20 && target.x < origin.x) {
        // Route the lower News branch around the Research node on narrow screens.
        const fromX = origin.x - origin.w/2 - 12;
        const toX = target.x - target.w/2 - 10;
        const gutter = Math.max(4, Math.min(fromX,toX) - 12);
        path.setAttribute('d', `M${fromX} ${origin.y} C${gutter} ${origin.y},${gutter} ${target.y},${toX} ${target.y}`);
      } else {
        path.setAttribute('d', `M${start.x} ${start.y} C${(start.x+end.x)/2} ${start.y},${(start.x+end.x)/2} ${end.y},${end.x} ${end.y}`);
      }
    });
  }

  // Keep the pending entrance across font/image/resize redraws in the same frame.
  function scheduleConnections() {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(() => {
      nodePhysics.measure();
      drawConnections();
      nodePhysics.wake();
      const entrance = pendingEntrance;
      pendingEntrance = null;
      if (entrance && currentRoute === 'home') playHomeEntrance(entrance.initial);
    });
  }

  // A sleeping contact simulation. Positions change only through dragging or collisions.
  function createNodePhysics() {
    const nodes = [...scene.querySelectorAll('.destination')].map(el => ({el,x:0,y:0,tx:0,ty:0,vx:0,vy:0,box:null}));
    let frame = 0, lastTime = 0, quietFrames = 0, held = null, blockedClick = null, placedNode = null, lastLayout = null;
    let width = 0, height = 0, identity = null;
    const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
    const live = () => currentRoute === 'home' && !document.hidden && !dialog.open;

    function measure() {
      const bounds = scene.getBoundingClientRect();
      width = scene.clientWidth; height = scene.clientHeight;
      if (!bounds.width || !bounds.height) return;
      const box = el => {
        const r = el.getBoundingClientRect();
        return {x:(r.left+r.width/2-bounds.left)*width/bounds.width,y:(r.top+r.height/2-bounds.top)*height/bounds.height,w:r.width*width/bounds.width,h:r.height*height/bounds.height};
      };
      identity = box(scene.querySelector('.map-identity'));
      nodes.forEach(node => {node.box=box(node.el);node.box.x-=node.x;node.box.y-=node.y;});
    }
    function paint() {
      nodes.forEach(node => {node.el.style.translate=`${node.x.toFixed(3)}px ${node.y.toFixed(3)}px`;});
      drawConnections();
    }
    // Solve against reserved destinations, not intermediate animation positions.
    // This prevents a wall or another node from repeatedly undoing a separation.
    const targetBox = node => ({x:node.box.x+node.tx,y:node.box.y+node.ty,w:node.box.w,h:node.box.h});
    const intersects = (a,b,gap=8) => Math.abs(a.x-b.x)<(a.w+b.w)/2+gap-.01 && Math.abs(a.y-b.y)<(a.h+b.h)/2+gap-.01;
    function limits(node) {
      const b=node.box;
      return {left:Math.min(b.x,8+b.w/2),right:Math.max(b.x,width-8-b.w/2),top:Math.min(b.y,8+b.h/2),bottom:Math.max(b.y,height-8-b.h/2)};
    }
    function bound(node) {
      const r=limits(node);
      node.tx=clamp(node.tx+node.box.x,r.left,r.right)-node.box.x;
      node.ty=clamp(node.ty+node.box.y,r.top,r.bottom)-node.box.y;
      if (held?.node===node) {node.x=node.tx;node.y=node.ty;}
    }
    function freeSpot(node,preferred=null) {
      const current=targetBox(node), r=limits(node);
      const obstacles=[identity,...nodes.filter(other=>other!==node).map(targetBox)].filter(Boolean);
      const anchor=preferred?{x:clamp(preferred.x,r.left,r.right),y:clamp(preferred.y,r.top,r.bottom)}:current;
      const xs=[anchor.x,current.x,r.left,r.right],ys=[anchor.y,current.y,r.top,r.bottom];
      // The space vacated by the dragged node is a useful escape route when swapping.
      if (held) {xs.push(held.node.box.x+held.x);ys.push(held.node.box.y+held.y);}
      for (const other of obstacles) {
        xs.push(other.x-(other.w+current.w)/2-8,other.x+(other.w+current.w)/2+8);
        ys.push(other.y-(other.h+current.h)/2-8,other.y+(other.h+current.h)/2+8);
      }
      let best=null;
      for (const x of xs) for (const y of ys) {
        if (x<r.left-.01 || x>r.right+.01 || y<r.top-.01 || y>r.bottom+.01) continue;
        const candidate={...current,x,y};
        if (obstacles.some(other=>intersects(candidate,other))) continue;
        const cost=(x-anchor.x)**2+(y-anchor.y)**2;
        if (!best || cost<best.cost) best={x:x-node.box.x,y:y-node.box.y,cost};
      }
      return best;
    }
    function place(node,spot) {
      node.tx=spot.x;node.ty=spot.y;
      // A new collision destination replaces momentum; nothing pushes back to home.
      node.vx=node.vy=0;
    }
    function contacts() {
      nodes.forEach(bound);
      // Keep the dragged object under the pointer, and let its neighbors yield first.
      const pinned=held?.node || placedNode;
      for (const node of nodes) {
        if (node===held?.node || !identity || !intersects(targetBox(node),identity)) continue;
        const spot=freeSpot(node);if (spot) place(node,spot);
      }
      for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) {
        const a=nodes[i],b=nodes[j];
        if (!intersects(targetBox(a),targetBox(b))) continue;
        const first=a===pinned?b:a,second=first===a?b:a;
        const spot=freeSpot(first);
        if (spot) place(first,spot);
        else if (second!==held?.node) {const alternative=freeSpot(second);if(alternative)place(second,alternative);}
      }
      const clear=nodes.every((node,i)=>!intersects(targetBox(node),identity) && nodes.slice(i+1).every(other=>!intersects(targetBox(node),targetBox(other))));
      if (clear) lastLayout=nodes.map(node=>({x:node.tx,y:node.ty}));
      else if (!held && placedNode && lastLayout) {
        // An oversized object cannot fit every narrow slot. Return to the last clear
        // arrangement instead of leaving it wedged under the name or another node.
        nodes.forEach((node,i)=>place(node,lastLayout[i]));
      }
      if (reducedMotion.matches) nodes.forEach(node=>{if(node!==held?.node){node.x=node.tx;node.y=node.ty;node.vx=node.vy=0;}});
    }
    function tick(now) {
      frame=0;
      if (!live() || reducedMotion.matches) return;
      const elapsed=lastTime?Math.min((now-lastTime)/1000,1/30):1/60;
      lastTime=now;
      contacts();
      const steps=Math.ceil(elapsed/(1/120)), dt=elapsed/steps;
      for (let step=0;step<steps;step++) {
        nodes.forEach(node => {
          if (held?.node===node) return;
          node.vx=(node.vx+(node.tx-node.x)*240*dt)*Math.exp(-25*dt);
          node.vy=(node.vy+(node.ty-node.y)*240*dt)*Math.exp(-25*dt);
          node.x+=node.vx*dt;node.y+=node.vy*dt;
        });
      }
      const quiet=nodes.every(node=>Math.hypot(node.x-node.tx,node.y-node.ty)<.02 && Math.hypot(node.vx,node.vy)<.3);
      quietFrames=quiet?quietFrames+1:0;
      if (!held && quietFrames>12) {
        nodes.forEach(node=>{node.x=node.tx;node.y=node.ty;node.vx=node.vy=0;});
        placedNode=null;
      } else frame=requestAnimationFrame(tick);
      paint();
    }
    function wake() {
      quietFrames=0;
      if (!frame && live() && !reducedMotion.matches) {lastTime=0;frame=requestAnimationFrame(tick);}
    }
    function finish(event,cancelled=false) {
      if (!held || (event && event.pointerId!==held.id)) return;
      const active=held;held=null;
      placedNode=active.node;
      if (active.moved && !cancelled) {
        const dropped=targetBox(active.node);
        const occupied=active.startLayout.filter(item=>item.node!==active.node && Math.abs(dropped.x-item.box.x)<item.box.w/2 && Math.abs(dropped.y-item.box.y)<item.box.h/2)
          .sort((a,b)=>Math.hypot(a.box.x-dropped.x,a.box.y-dropped.y)-Math.hypot(b.box.x-dropped.x,b.box.y-dropped.y))[0];
        if (occupied) {
          // Dropping into an occupied spot is a swap: use the space just vacated,
          // even if that neighbor yielded temporarily while the pointer approached.
          const spot=freeSpot(occupied.node,{x:active.node.box.x+active.x,y:active.node.box.y+active.y});
          if (spot) place(occupied.node,spot);
        }
      }
      active.node.el.classList.remove('is-node-held');
      viewport.classList.remove('is-node-dragging');
      if (active.moved) blockedClick=active.node.el;
      // Release fixes the drop position; only subsequent contact can displace it.
      active.node.vx=active.node.vy=0;
      if (active.node.el.hasPointerCapture(active.id)) active.node.el.releasePointerCapture(active.id);
      if (active.moved && !cancelled) {
        active.node.el.focus({preventScroll:true});
        document.getElementById('navigation-status').textContent='Node moved. Press Enter to open it, or Reset view to restore the map.';
      }
      if (reducedMotion.matches) {contacts();paint();} else wake();
    }
    function stop() {
      finish(null,true);
      cancelAnimationFrame(frame);frame=0;lastTime=0;
      nodes.forEach(node=>{node.vx=node.vy=0;});
    }
    function reset() {
      stop();
      placedNode=null;lastLayout=null;
      nodes.forEach(node=>{node.x=node.y=node.tx=node.ty=0;node.el.style.translate='0px 0px';});
      measure();drawConnections();
    }
    nodes.forEach(node => {
      const el=node.el;
      el.addEventListener('dragstart',event=>event.preventDefault());
      el.addEventListener('pointerdown',event=>{
        if (!event.isPrimary || event.button!==0 || held || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !live()) return;
        blockedClick=null;
        viewport.classList.add('is-node-dragging');
        measure();
        node.vx=node.vy=0;node.tx=node.x;node.ty=node.y;placedNode=null;
        const bounds=scene.getBoundingClientRect();
        held={node,id:event.pointerId,startX:event.clientX,startY:event.clientY,x:node.x,y:node.y,scaleX:width/bounds.width,scaleY:height/bounds.height,moved:false,startLayout:nodes.map(other=>({node:other,box:{...other.box,x:other.box.x+other.x,y:other.box.y+other.y}}))};
        // Capture immediately so a fast flick cannot outrun a small node.
        el.setPointerCapture(event.pointerId);
        event.stopPropagation();
      });
      el.addEventListener('pointermove',event=>{
        if (!held || held.node!==node || event.pointerId!==held.id) return;
        const dx=event.clientX-held.startX,dy=event.clientY-held.startY;
        if (!held.moved && Math.hypot(dx,dy)<6) return;
        event.preventDefault();
        if (!held.moved) {
          held.moved=true;el.setPointerCapture(event.pointerId);
          el.classList.add('is-node-held');viewport.classList.add('is-node-dragging');
        }
        const x=held.x+dx*held.scaleX,y=held.y+dy*held.scaleY;
        node.x=node.tx=x;node.y=node.ty=y;node.vx=node.vy=0;
        bound(node);
        contacts();
        paint();wake();
      });
      el.addEventListener('pointerup',event=>finish(event));
      el.addEventListener('pointercancel',event=>finish(event,true));
      el.addEventListener('lostpointercapture',event=>finish(event,true));
      el.addEventListener('keydown',event=>{
        if (event.key==='0') {event.preventDefault();resetCamera();return;}
        if (!event.altKey || event.ctrlKey || event.metaKey) return;
        const moves={ArrowLeft:[-32,0],ArrowRight:[32,0],ArrowUp:[0,-32],ArrowDown:[0,32]};
        if (!moves[event.key]) return;
        event.preventDefault();measure();node.x+=moves[event.key][0];node.y+=moves[event.key][1];
        node.tx=node.x;node.ty=node.y;placedNode=node;
        node.vx=node.vy=0;bound(node);node.x=node.tx;node.y=node.ty;contacts();paint();wake();
      });
    });
    // Block only the synthetic click from a completed drag, never keyboard activation.
    scene.addEventListener('click',event=>{
      if (event.detail && blockedClick && blockedClick.contains(event.target)) {
        event.preventDefault();event.stopPropagation();blockedClick=null;
      }
    },true);
    window.addEventListener('pointerup',event=>finish(event));
    window.addEventListener('blur',stop);
    window.addEventListener('focus',wake);
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else wake();});
    reducedMotion.addEventListener('change',()=>{stop();if(!reducedMotion.matches)wake();});
    return {measure,wake,stop,reset};
  }

  function playHomeEntrance(initial) {
    const paths = [...scene.querySelectorAll('.connections path')];
    paths.forEach((path, i) => {
      path.getAnimations().forEach(animation => animation.cancel());
      playMotion(path, [
        {strokeDasharray:'1', strokeDashoffset:1, opacity:.3},
        {strokeDasharray:'1', strokeDashoffset:0, opacity:1}
      ], {duration:700, delay:Math.min(i * 35, 140)});
    });
    if (initial) {
      // clip-path never changes layout; only the heading's own paint box is animated.
      playMotion(atlas.querySelector('.map-identity h1'), [
        {clipPath:'inset(0 0 100% 0)'},
        {clipPath:'inset(0 0 0 0)'}
      ], {duration:700});
    }
    scene.querySelectorAll('.destination').forEach((link, i) => {
      // Move the artwork, leaving link bounds and connector measurements stable.
      playMotion(link.firstElementChild, [
        {opacity:.45, translate:'0 12px'},
        {opacity:1, translate:'0 0'}
      ], {duration:550, delay:Math.min(i * 45, 180)});
    });
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
    let traceAnimation = null;
    const updateHighlight = () => path.classList.toggle('is-highlighted', link.matches(':hover, :focus'));
    const trace = () => {
      if (traceAnimation) traceAnimation.cancel();
      traceAnimation = pathTraceMotion(path, 450);
    };
    link.addEventListener('pointerenter', event => {
      updateHighlight();
      if (event.pointerType !== 'mouse') return;
      trace();
    });
    link.addEventListener('pointerleave', updateHighlight);
    link.addEventListener('focus', () => {
      updateHighlight();
      trace();
      const a = link.getBoundingClientRect(), b = viewport.getBoundingClientRect();
      if (a.left < b.left || a.right > b.right || a.top < b.top || a.bottom > b.bottom) resetCamera();
    });
    link.addEventListener('blur', updateHighlight);
  });

  function releasePourObserver() {
    pourObserver?.disconnect();
    pourObserver = null;
  }

  function clearPourStates() {
    document.querySelectorAll('.pour-steps li').forEach(step => step.classList.remove('is-poured'));
  }

  function setupPourObserver() {
    releasePourObserver();
    clearPourStates();
    if (reducedMotion.matches || !('IntersectionObserver' in window)) return;
    pourObserver = new IntersectionObserver((entries, observer) => {
      if (currentRoute !== 'off-duty' || reducedMotion.matches) return;
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-poured');
        observer.unobserve(entry.target);
      });
    }, {root:document.getElementById('off-duty'), threshold:.2});
    document.querySelectorAll('.pour-steps li').forEach(step => pourObserver.observe(step));
  }

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
  scene.querySelectorAll('.connections path').forEach(path => path.setAttribute('pathLength', '1'));
  directoryToggle.setAttribute('aria-expanded', 'false');
  root.classList.add('js');
  renderRoute(routeFromHash(),null,true);
  updateCamera();
})();
