'use strict';

// Terminal atmosphere for the atlas. Pointer effects never capture or block input.
(() => {
  const root = document.documentElement;
  const pauseButton = document.getElementById('background-pause');
  if (!pauseButton || !root.classList.contains('js')) return;
  const canvas = document.createElement('canvas');
  canvas.id = 'ambient-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);
  const ctx = canvas.getContext('2d', {alpha:false});
  if (!ctx) { canvas.remove(); pauseButton.disabled = true; return; }

  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const dialog = document.getElementById('directory-dialog');
  let paused = false;
  let width = 0, height = 0, header = 74, frame = 0, lastFrame = 0, time = 0;
  let bg = [215,231,240], ink = [49,91,128], dark = false;
  let vortices = [];
  let pointer = {x:-1000, y:-1000, active:false};
  let command = 'explore --map', commandAge = 0;
  const glyphs = ' .,:;+=xX#';
  const readingZones = [...document.querySelectorAll('.map-identity, .destination-title, .destination-note')];
  const rgba = (rgb, a) => `rgba(${rgb.join(',')},${a})`;
  const isHome = () => document.body.dataset.route === 'home';
  const isLive = () => !paused && !reduce.matches && !document.hidden && isHome() && !dialog?.open;

  function readPalette() {
    dark = root.dataset.theme === 'dark';
    bg = dark ? [20,43,60] : [215,231,240];
    ink = dark ? [150,202,230] : [49,91,128];
  }

  function clear() {
    ctx.fillStyle = rgba(bg, 1);
    ctx.fillRect(0, 0, width, height);
  }

  function resize() {
    width = innerWidth; height = innerHeight;
    header = parseFloat(getComputedStyle(root).getPropertyValue('--header')) || 74;
    const scale = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1900000 / Math.max(1, width*height)));
    canvas.width = Math.round(width*scale); canvas.height = Math.round(height*scale);
    ctx.setTransform(scale,0,0,scale,0,0);
    vortices = [];
    paintStill(); sync();
  }

  // Quiet around the identity; more texture at the perimeter of the atlas.
  function clarity(x,y) {
    const cx = width < 768 ? width*.44 : width*.5;
    const cy = header + (height-header)*.43;
    const dx=(x-cx)/(width*.3), dy=(y-cy)/(height*.22);
    return .18 + .82 * Math.min(1, (dx*dx+dy*dy)*.65);
  }

  function protectText() {
    if (!isHome()) return;
    for (const element of readingZones) {
      const r=element.getBoundingClientRect();
      const rx=r.width*.72+25,ry=r.height*.85+18;
      ctx.save();ctx.translate(r.left+r.width/2,r.top+r.height/2);ctx.scale(rx,ry);
      const shade=ctx.createRadialGradient(0,0,0,0,0,1);
      shade.addColorStop(0,rgba(bg,1));shade.addColorStop(.55,rgba(bg,.96));shade.addColorStop(1,rgba(bg,0));
      ctx.fillStyle=shade;ctx.fillRect(-1,-1,2,2);ctx.restore();
    }
    // Keep the controls on an unbroken paper-colored edge.
    const edge=ctx.createLinearGradient(0,height-100,0,height-55);
    edge.addColorStop(0,rgba(bg,0));edge.addColorStop(1,rgba(bg,1));
    ctx.fillStyle=edge;ctx.fillRect(0,height-100,width,100);
  }

  function terminal() {
    clear();
    const spacing = width < 600 ? 15 : 16;
    const row = 20;
    ctx.font = '11px ui-monospace, SFMono-Regular, Consolas, monospace';
    ctx.textBaseline = 'middle';
    for (let y=header+48; y<height-65; y+=row) {
      for (let x=12; x<width; x+=spacing) {
        const nx=x/width, ny=(y-header)/(height-header);
        let wave = Math.sin(nx*11 + Math.sin(ny*8+time*.2)*1.7 + time*.18)
          + Math.cos(ny*15 - nx*3 - time*.24)
          + Math.sin((nx+ny)*8+time*.12)*.45;
        if (pointer.active && !reduce.matches) {
          const distance=Math.hypot(x-pointer.x,y-pointer.y);
          wave += Math.exp(-distance/125)*Math.sin(distance*.045-time*2)*1.8;
        }
        let pulse = 0;
        for (const v of vortices) {
          const distance=Math.hypot(x-v.x,y-v.y);
          pulse += Math.exp(-Math.pow((distance-v.age*160)/30,2)) * Math.max(0,1-v.age/2.4);
        }
        const band = Math.abs(Math.sin(wave*2.4));
        if (band < .48 && pulse < .1) continue;
        const intensity = Math.min(1,(band-.48)*1.8+pulse*.6);
        const index = Math.min(glyphs.length-1,Math.max(1,Math.floor(intensity*(glyphs.length-1))));
        ctx.fillStyle=rgba(ink, Math.min(.44, (.07+intensity*(dark?.22:.16))*clarity(x,y)+pulse*.2));
        ctx.fillText(glyphs[index],x,y);
      }
    }
    protectText();
    // A small real navigation readout, not a simulated shell or fake system telemetry.
    const x = width < 768 ? 20 : width*.41;
    const y = header + (width < 768 ? 12 : 32);
    ctx.font = `${width < 768 ? 10 : 11}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ctx.fillStyle=rgba(ink,dark?.64:.59);
    const shown = reduce.matches || paused ? command : command.slice(0,Math.floor(commandAge*28));
    ctx.fillText('ken@atlas ~ / '+shown, x, y);
    if (reduce.matches || paused || Math.floor(time*1.5)%2===0) {
      const cursor=x+ctx.measureText('ken@atlas ~ / '+shown).width+5;
      ctx.fillRect(cursor,y-5,5,10);
    }
  }

  function paintStill() {
    terminal();
  }

  function tick(now) {
    frame=0;
    // Some browsers update the query before notifying every change listener.
    if(!isLive()){sync();return;}
    const elapsed=now-lastFrame;
    if(elapsed>=33) {
      const dt=Math.min(elapsed/1000,.05);
      lastFrame=now; time+=dt; commandAge+=dt;
      vortices.forEach(v=>v.age+=dt);vortices=vortices.filter(v=>v.age<3);
      terminal();
    }
    frame=requestAnimationFrame(tick);
  }

  function sync() {
    if(frame)cancelAnimationFrame(frame);
    frame=0;lastFrame=performance.now();
    const stopped=paused||reduce.matches;
    pauseButton.disabled=reduce.matches;
    pauseButton.setAttribute('aria-pressed',String(stopped));
    pauseButton.setAttribute('aria-label',reduce.matches?'Background motion disabled by reduced-motion preference':paused?'Play background animation':'Pause background animation');
    pauseButton.querySelector('span').textContent=stopped?'[ > ]':'[ || ]';
    if(isLive())frame=requestAnimationFrame(tick);
  }

  pauseButton.addEventListener('click',()=>{paused=!paused;sync();});
  window.addEventListener('pointermove',event=>{
    if(!isLive()||event.clientY<header)return;
    pointer={x:event.clientX,y:event.clientY,active:true};
  },{passive:true});
  document.addEventListener('pointerleave',()=>{pointer.active=false;});
  window.addEventListener('pointerdown',event=>{
    if(!isLive()||event.button!==0||!event.isPrimary||event.clientY<header||event.target.closest('button,a,select,dialog'))return;
    pointer={x:event.clientX,y:event.clientY,active:true};
    vortices.push({x:pointer.x,y:pointer.y,age:0});if(vortices.length>6)vortices.shift();
  },{passive:true});
  window.addEventListener('pointerup',event=>{if(event.pointerType==='touch')pointer.active=false;},{passive:true});
  window.addEventListener('pointercancel',()=>{pointer.active=false;},{passive:true});
  document.querySelectorAll('.destination').forEach(link=>{
    const update=()=>{command='open '+link.dataset.route+'/';commandAge=0;};
    link.addEventListener('pointerenter',update);link.addEventListener('focus',update);
  });
  new MutationObserver(()=>{readPalette();paintStill();sync();}).observe(root,{attributes:true,attributeFilter:['data-theme']});
  new MutationObserver(()=>{pointer.active=false;vortices=[];sync();}).observe(document.body,{attributes:true,attributeFilter:['data-route']});
  if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
  reduce.addEventListener('change',()=>{pointer.active=false;vortices=[];paintStill();sync();});
  document.addEventListener('visibilitychange',sync);
  window.addEventListener('resize',resize,{passive:true});
  readPalette();resize();
})();
