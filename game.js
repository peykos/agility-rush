/* DOM controls and real-time rendering. Gameplay and personal bests stay in this browser. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id), C = window.AgilityCore;

  const input = { keys: new Set(), pointers: new Map(), jumpQueued: false };
  let race, engine, view, sound = false, audio = null, lastFinish = false, best = null, lastUI = 0;
  let renderedFrames = 0, worldTime = 0, previousTime = performance.now(), firstRendered = false;
  try { const stored = JSON.parse(localStorage.getItem('agility-rush-best-v1')); if (stored && Number.isFinite(stored.time) && stored.time > 0) best = stored; } catch (_) {}
  $('menuBest').textContent = best ? best.time.toFixed(2) + 's' : '—';
  const map = $('minimap').getContext('2d');
  function tone(freq = 520, duration = 0.08) {
    if (!sound) return;
    try {
      if (!audio) audio = new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator(), gain = audio.createGain(); osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.045, audio.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch (_) { sound = false; $('soundBtn').textContent = 'SOUND OFF'; }
  }
  function held(action) { return input.keys.has(action) || [...input.pointers.values()].includes(action); }
  function clearInput() { input.keys.clear(); input.pointers.clear(); input.jumpQueued = false; document.querySelectorAll('.is-down').forEach(b => b.classList.remove('is-down')); }
  function bindButton(id, action, oneShot = false) {
    const b = $(id);
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); if (race.state !== 'racing' && race.state !== 'countdown') return;
      try { b.setPointerCapture(e.pointerId); } catch (_) {}
      if (oneShot) input.jumpQueued = true; else input.pointers.set(e.pointerId, action);
      b.classList.add('is-down'); if (oneShot) tone(440, 0.055);
    });
    const release = e => { input.pointers.delete(e.pointerId); b.classList.remove('is-down'); };
    b.addEventListener('pointerup', release); b.addEventListener('pointercancel', release); b.addEventListener('lostpointercapture', release);
  }
  function start() {
    clearInput(); lastFinish = false; race.start(); view.setCamera('chase'); $('cameraMode').textContent = 'CHASE';
    $('results').hidden = true; $('pausePanel').hidden = true; updateUI(true); tone(330, 0.12);
  }
  function setPause() {
    if (race.state === 'paused') race.resume(); else race.pause(); clearInput(); updateUI(true);
  }
  const keyActions = { ArrowLeft:'left', KeyA:'left', ArrowRight:'right', KeyD:'right', ArrowDown:'duck', KeyS:'duck', ShiftLeft:'sprint', ShiftRight:'sprint' };
  window.addEventListener('keydown', e => {
    if (keyActions[e.code] || e.code === 'Space' || e.code === 'ArrowUp') e.preventDefault();
    if (!race) return;
    if (e.code === 'KeyP' || e.code === 'Escape') { if (!e.repeat) setPause(); return; }
    if (e.code === 'KeyC') { if (!e.repeat) $('cameraBtn').click(); return; }
    if ((e.code === 'Space' || e.code === 'ArrowUp') && !e.repeat) {
      if (race.state === 'menu') start(); else if (race.state === 'racing') { input.jumpQueued = true; tone(440,0.055); } return;
    }
    if (race.state === 'racing' || race.state === 'countdown') { if (keyActions[e.code]) input.keys.add(keyActions[e.code]); }
  });
  window.addEventListener('keyup', e => { if (keyActions[e.code]) input.keys.delete(keyActions[e.code]); });
  window.addEventListener('blur', clearInput);
  document.addEventListener('visibilitychange', () => {
    clearInput(); if (document.hidden && race) { race.pause(); updateUI(true); }
  });
  $('startBtn').addEventListener('click', start); $('againBtn').addEventListener('click', start); $('restartPauseBtn').addEventListener('click',start);
  $('pauseBtn').addEventListener('click',setPause); $('resumeBtn').addEventListener('click',setPause);
  $('homeBtn').addEventListener('click',()=>{clearInput();race.reset();lastFinish=false;view.setCamera('tv');$('cameraMode').textContent='TV';updateUI(true);});
  $('cameraBtn').addEventListener('click',()=>{if(!view)return;const mode=view.getCamera()==='tv'?'chase':'tv';view.setCamera(mode);$('cameraMode').textContent=mode.toUpperCase();});
  $('soundBtn').addEventListener('click',()=>{sound=!sound;$('soundBtn').textContent=sound?'SOUND ON':'SOUND OFF';$('soundBtn').setAttribute('aria-pressed',String(sound));tone(600,0.1);});
  $('fullscreenBtn').addEventListener('click',async()=>{
    try { if(!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); } catch (_) { $('status').textContent='Fullscreen unavailable in this browser'; }
  });

  function drawMap() {
    const w=180,h=150,pad=15;
    const point=(p)=>({x:pad+(p.x+24)/48*(w-2*pad),y:h-pad-(p.z+28)/56*(h-2*pad)});
    map.clearRect(0,0,w,h);map.beginPath();
    for(let s=0;s<=C.LENGTH;s+=0.6){const p=point(C.sample(s));if(s===0)map.moveTo(p.x,p.y);else map.lineTo(p.x,p.y);}
    map.lineWidth=5;map.strokeStyle='#526650';map.stroke();map.lineWidth=1;map.strokeStyle='#9aa98a';map.stroke();
    for(const o of C.COURSE){const p=point(C.sample(o.s));map.fillStyle='#d6ff69';map.fillRect(p.x-2,p.y-2,4,4);}
    for(const r of [...race.racers].reverse()) { const p=point(C.sample(r.s,r.lateral));map.beginPath();map.arc(p.x,p.y,r.id===0?4.1:3,0,Math.PI*2);map.fillStyle=r.color;map.fill();if(r.id===0){map.lineWidth=1.3;map.strokeStyle='#fff';map.stroke();} }
  }
  function updateUI(force = false) {
    if (!race) return;
    if (!force && worldTime-lastUI<0.075) return; lastUI=worldTime;
    const r=race.racers[0], menu=race.state==='menu', paused=race.state==='paused', showResult=r.finished&&!menu;
    $('menu').hidden=!menu; $('courseCard').hidden=!menu; $('liveStats').hidden=menu||showResult;
    $('raceInfo').hidden=menu||showResult; $('leaderboard').hidden=menu||showResult;
    $('controls').hidden=menu||paused||showResult; $('bottomHUD').hidden=menu||showResult;
    $('pauseBtn').disabled=menu||race.state==='finished'; $('pausePanel').hidden=!paused;
    $('results').hidden=!showResult||paused;
    $('countdown').hidden=race.state!=='countdown'&&!(race.state==='racing'&&race.time<0.65);
    $('countdown').textContent=race.state==='countdown'?Math.ceil(Math.max(0,race.countdown)):'GO';
    $('timer').textContent=(r.finished?r.finishTime:race.time+r.penalties).toFixed(2).padStart(5,'0');
    $('cleared').innerHTML=r.cleared+'<span>/'+C.COURSE.length+'</span>';
    const standing=race.standings(),rank=standing.findIndex(x=>x.id===0)+1;
    $('position').innerHTML=rank+'<span>/4</span>';
    $('energyFill').style.width=(r.energy*100)+'%';$('energyPercent').textContent=Math.round(r.energy*100)+'%';
    $('progressFill').style.width=(r.s/C.LENGTH*100)+'%';$('speed').textContent=r.speed.toFixed(1)+' m/s';
    $('faults').textContent=r.faults+' FAULT'+(r.faults===1?'':'S')+(r.penalties?' · +'+r.penalties+'s':'');
    $('notice').hidden=menu||paused||showResult||r.eventTTL<=0; if(r.eventTTL>0)$('notice').textContent=r.event;
    const o=C.nextObstacle(r);
    if(o){
      const d=o.s-r.s;$('obstacleIndex').textContent=String(o.id+1).padStart(2,'0');$('obstacleName').textContent=o.name;
      let action=o.action;
      if(o.type==='slalom'&&d<3){let i=0;while(i<C.poleCount(o)&&C.poleS(o,i)<r.s)i++;action=i<C.poleCount(o)?(C.poleTarget(i)<0?'← LEFT':'RIGHT →'):'CENTRE';}
      if((o.type==='ramp'||o.type==='seesaw')&&d<2)action='STAY CENTRED';
      const jumpNow=['hurdle','hoop'].includes(o.type)&&d>0&&d<Math.max(2,r.speed*0.39);
      $('actionHint').textContent=jumpNow?'JUMP NOW':action;
      $('distance').textContent=d>0?Math.ceil(d)+' m':(o.type==='tunnel'?'HOLD ↓':'GO');
      $('approach').style.width=(100-C.clamp(d,0,20)*5)+'%';
      $('jumpBtn').classList.toggle('ready',jumpNow);$('duckBtn').classList.toggle('ready',o.type==='tunnel'&&d<3);
    }
    $('fieldRows').innerHTML=standing.map((p,i)=>'<li><span class="rank">'+(i+1)+'</span><i class="dot" style="background:'+p.color+'"></i><b>'+p.name+'</b><span class="gap">'+(p.finished?p.finishTime.toFixed(2)+'s':Math.round(p.s/C.LENGTH*100)+'%')+'</span></li>').join('');
    drawMap();
    if(showResult){
      if(!lastFinish){
        if(!best||r.finishTime<best.time){best={time:r.finishTime,faults:r.faults};try{localStorage.setItem('agility-rush-best-v1',JSON.stringify(best));}catch(_){}$('resultEyebrow').textContent='NEW PERSONAL BEST';}
        else $('resultEyebrow').textContent='ACROSS THE LINE';
        lastFinish=true;tone(820,0.25);$('menuBest').textContent=best.time.toFixed(2)+'s';
      }
      $('resultTitle').textContent=race.state==='finished'?(rank===1?'Top of the field.':'Every second counts.'):'Finish strong.';
      $('finishTime').innerHTML=r.finishTime.toFixed(2)+'<span>s</span>';
      $('resultDetail').textContent=r.elapsed.toFixed(2)+'s running + '+r.penalties.toFixed(0)+'s penalties · '+r.faults+' faults';
      $('waitingNote').textContent=race.state==='finished'?'FINAL RESULT · Ranked by total time':'Provisional result · The other athletes are still running…';
      $('resultsRows').innerHTML=standing.map((p,i)=>'<li class="'+(p.id===0?'you':'')+'"><span class="place">0'+(i+1)+'</span><span class="result-name">'+p.name+'</span><small>'+(p.finished?p.faults+' faults':'running')+'</small><strong>'+(p.finished?p.finishTime.toFixed(2)+'s':'—')+'</strong></li>').join('');
    }
    if(renderedFrames%30<6)$('status').textContent='BABYLON.JS · '+Math.round(engine.getFps())+' FPS · BROWSER PLAY';
  }
  try {
    if(!window.BABYLON)throw new Error('Babylon.js did not finish loading. Check your Internet connection and reload.');
    $('status').textContent='Building the stadium…';
    engine=new BABYLON.Engine($('arena'),true,{preserveDrawingBuffer:false,stencil:true,powerPreference:'high-performance'},false);
    engine.setHardwareScalingLevel(1/Math.min(window.devicePixelRatio||1,1.4));
    race=new C.Race();view=window.buildAgilityScene(engine,race);view.scene.skipPointerMovePicking=true;
    bindButton('leftBtn','left');bindButton('rightBtn','right');bindButton('duckBtn','duck');bindButton('sprintBtn','sprint');bindButton('jumpBtn','jump',true);
    window.addEventListener('resize',()=>engine.resize());
    engine.onContextLostObservable.add(()=>{race.pause();$('fatalText').textContent='The browser lost its WebGL context. Reload to recover.';$('fatal').hidden=false;});
    engine.runRenderLoop(()=>{
      const now=performance.now(),dt=Math.min((now-previousTime)/1000,0.06);previousTime=now;worldTime+=dt;
      let remaining=dt;
      while(remaining>0.00001){const step=Math.min(1/120,remaining);
        race.advance(step,{steer:(held('right')?1:0)-(held('left')?1:0),jump:input.jumpQueued,duck:held('duck'),sprint:held('sprint')});
        if(race.state==='racing')input.jumpQueued=false;remaining-=step;
      }
      view.update(dt,worldTime);view.scene.render();renderedFrames++;updateUI();
      if(!firstRendered){firstRendered=true;document.body.dataset.ready='true';$('status').textContent='BABYLON.JS · READY · BROWSER PLAY';}
    });
    updateUI(true);

  } catch (e) { $('fatalText').textContent=String(e.message||e);$('fatal').hidden=false;$('status').textContent='3D startup failed';console.error(e); }
})();
