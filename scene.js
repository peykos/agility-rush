/* Procedural stadium and articulated human athletes; Babylon.js, no remote assets. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else root.buildAgilityScene = (engine, race, options) => factory(root.BABYLON, root.AgilityCore, engine, race, options);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (B, C, engine, race, options) {
  'use strict';
  options = options || {};
  const scene = new B.Scene(engine);
  scene.clearColor = B.Color4.FromHexString('#b2c6b8ff');
  scene.ambientColor = new B.Color3(0.65, 0.7, 0.65);
  const camera = new B.FreeCamera('broadcast camera', new B.Vector3(58, 56, -62), scene);
  camera.minZ = 0.15; camera.maxZ = 250; camera.fov = 0.74; camera.setTarget(new B.Vector3(0, 0, 0));
  const hemi = new B.HemisphericLight('daylight', new B.Vector3(0, 1, 0), scene); hemi.intensity = 0.86;
  hemi.groundColor = B.Color3.FromHexString('#526e55');
  const sun = new B.DirectionalLight('late afternoon', new B.Vector3(-0.5, -1.2, 0.6), scene); sun.intensity = 0.85;
  const mats = new Map();
  function material(name, hex, alpha = 1) {
    const key = name + ':' + hex + ':' + alpha;
    if (mats.has(key)) return mats.get(key);
    const m = new B.StandardMaterial(name, scene); m.diffuseColor = B.Color3.FromHexString(hex);
    m.specularColor.set(0.08, 0.08, 0.08); m.emissiveColor = m.diffuseColor.scale(0.07); m.alpha = alpha;
    mats.set(key, m); return m;
  }
  const M = {
    grass: material('pitch', '#7e9c62'), grass2: material('mown stripe', '#88a56b'),
    track: material('racing line', '#96ae74'), white: material('warm white', '#f2f1d6'),
    ink: material('stadium navy', '#21373d'), stands: material('stand concrete', '#637e78'),
    lime: material('signal lime', '#d6fa68'), yellow: material('contact yellow', '#f2d75b'),
    purple: material('agility violet', '#7663ba'), darkPurple: material('tunnel lining', '#514b81'),
    rail: material('rails', '#d4dace'), orange: material('signal orange', '#f87843')
  };
  function box(name, w, h, d, x, y, z, mat, parent) {
    const m = B.MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, scene);
    m.position.set(x, y, z); m.material = mat; if (parent) m.parent = parent; m.isPickable = false; return m;
  }
  function sphere(name, size, x, y, z, mat, parent, segments = 8) {
    const m = B.MeshBuilder.CreateSphere(name, { diameter: size, segments }, scene);
    m.position.set(x, y, z); m.material = mat; if (parent) m.parent = parent; m.isPickable = false; return m;
  }
  function cylinder(name, height, diameter, x, y, z, mat, parent, diameterTop = diameter) {
    const m = B.MeshBuilder.CreateCylinder(name, { height, diameterBottom: diameter, diameterTop, tessellation: 10 }, scene);
    m.position.set(x, y, z); m.material = mat; if (parent) m.parent = parent; m.isPickable = false; return m;
  }
  function label(name, text, width, height, background, foreground, parent, billboard = false) {
    const m = B.MeshBuilder.CreatePlane(name, { width, height }, scene);
    const mat = new B.StandardMaterial(name + ' material', scene); mat.backFaceCulling = false; mat.disableLighting = true;
    mat.emissiveColor = B.Color3.White();
    if (!options.nullEngine) {
      const tex = new B.DynamicTexture(name + ' graphic', { width: 512, height: 128 }, scene, false);
      const ctx = tex.getContext(); ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128);
      ctx.font = 'bold 58px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = foreground;
      ctx.fillText(text, 256, 68); tex.update(); mat.diffuseTexture = tex; mat.emissiveTexture = tex;
    } else mat.emissiveColor = B.Color3.FromHexString(foreground);
    m.material = mat; m.isPickable = false; if (parent) m.parent = parent;
    if (billboard) m.billboardMode = B.Mesh.BILLBOARDMODE_ALL;
    return m;
  }
  function atDistance(name, s) {
    const p = C.sample(s), n = new B.TransformNode(name, scene); n.position.set(p.x, 0, p.z); n.rotation.y = p.angle; return n;
  }

  // Low draw-call stadium: static meshes are combined by material after construction.
  box('stadium foundation', 65, 0.5, 76, 0, -0.36, 0, M.ink);
  box('turf', 51, 0.12, 60, 0, -0.075, 0, M.grass);
  for (let i = 0; i < 10; i++) box('mowing stripe', 50.7, 0.015, 3, 0, 0, -27 + i * 6, M.grass2);
  for (const side of [-1, 1]) {
    box('end boundary', 51, 0.035, 0.12, 0, 0.018, side * 29.6, M.white);
    box('side boundary', 0.12, 0.035, 59.2, side * 25.3, 0.018, 0, M.white);
    box('long trackside wall', 0.4, 1.3, 62, side * 26.5, 0.65, 0, M.ink);
    box('short trackside wall', 53, 1.3, 0.4, 0, 0.65, side * 31, M.ink);
    box('rail cap', 0.5, 0.09, 62, side * 26.5, 1.35, 0, M.lime);
    box('rail cap', 53, 0.09, 0.5, 0, 1.35, side * 31, M.lime);
    for (let tier = 0; tier < 3; tier++) {
      box('grandstand tier', 2.2, 0.85, 66, side * (28 + tier * 1.65), 0.2 + tier * 0.8, 0, M.stands);
      box('end stand tier', 55, 0.85, 1.7, 0, 0.2 + tier * 0.8, side * (32.5 + tier * 1.5), M.stands);
    }
    for (let k = 0; k < 5; k++) {
      const ad = label('trackside brand', k % 2 ? 'HUMAN EDITION' : 'AGILITY RUSH', 5.6, 0.65, '#21373d', '#d6fa68');
      ad.position.set(side * 26.22, 0.72, -24 + k * 12); ad.rotation.y = side * Math.PI / 2;
    }
  }
  // Blocky, original low-poly spectator silhouettes, not textures or downloaded models.
  const crowdColors = ['#d6d4b7', '#47646b', '#8a7593', '#c18b66', '#739992', '#bfad67'];
  const crowdMats = crowdColors.map((x, i) => material('spectator ' + i, x));
  const crowdSkin = material('crowd skin', '#bd9677');
  for (let i = 0; i < 116; i++) {
    const side = i % 2 ? -1 : 1, row = Math.floor(i / 2) % 3;
    const z = -29 + ((Math.floor(i / 6) * 3.23 + row * 1.2) % 59);
    const x = side * (28.05 + row * 1.64), y = 1.1 + row * 0.8;
    box('spectator jacket', 0.5, 0.62, 0.34, x, y, z, crowdMats[i % crowdMats.length]);
    sphere('spectator head', 0.28, x, y + 0.45, z, crowdSkin, null, 5);
  }
  for (const [x, z] of [[-25,-28],[-25,28],[25,-28],[25,28]]) {
    cylinder('stadium light mast', 12, 0.22, x, 6, z, M.ink);
    box('floodlight array', 2.6, 0.75, 0.42, x, 12.15, z, M.ink);
    for (let i = 0; i < 3; i++) box('light glass', 0.58, 0.43, 0.05, x - 0.82 + i * 0.82, 12.15, z - 0.23, M.white);
  }
  // The course is a measured, continuous serpentine, not an endless runner.
  const left = [], right = [];
  for (let s = 0; s <= C.LENGTH; s += 0.45) {
    for (const [lat, arr] of [[-1.72, left], [1.72, right]]) { const p = C.sample(s, lat); arr.push(new B.Vector3(p.x, 0.027, p.z)); }
  }
  const ribbon = B.MeshBuilder.CreateRibbon('the circuit', { pathArray: [left, right], sideOrientation: B.Mesh.DOUBLESIDE }, scene); ribbon.material = M.track;
  for (let s = 1; s < C.LENGTH; s += 3) {
    const p = C.sample(s), m = box('racing line dash', 0.09, 0.02, 0.64, p.x, 0.052, p.z, M.white); m.rotation.y = p.angle;
  }
  // Decorative infield chevrons and tournament signage.
  for (const x of [-11, 0, 12]) {
    const logo = label('infield wordmark', 'AGILITY / RUSH', 7.5, 1.8, '#7e9c62', '#dce6c7');
    logo.position.set(x, 0.04, 1); logo.rotation.x = Math.PI / 2; logo.rotation.z = Math.PI / 2;
  }
  const stadiumSign = label('stadium scoreboard', 'AGILITY RUSH / HUMAN EDITION', 17, 3.3, '#21373d', '#d6fa68');
  stadiumSign.position.set(0, 6.6, 32); stadiumSign.rotation.y = Math.PI;
  for (const x of [-7, 7]) cylinder('scoreboard support', 6.3, 0.28, x, 3.15, 32.1, M.ink);

  function makeGate(s, title) {
    const group = atDistance(title, s);
    box('gate post', 0.24, 3.6, 0.34, -1.9, 1.8, 0, M.ink, group);
    box('gate post', 0.24, 3.6, 0.34, 1.9, 1.8, 0, M.ink, group);
    box('gate beam', 4.2, 0.72, 0.38, 0, 3.5, 0, M.ink, group);
    const t = label(title, title, 3.6, 0.6, '#21373d', '#d6fa68', group); t.position.set(0, 3.5, -0.21);
    for (let a = 0; a < 8; a++) for (let b = 0; b < 2; b++) box('timing line', 0.45, 0.025, 0.4, -1.575 + a * 0.45, 0.05, (b - 0.5) * 0.4, (a+b)%2 ? M.white : M.ink, group);
  }
  makeGate(0.7, 'START'); makeGate(C.LENGTH - 0.5, 'FINISH');
  for (const o of C.COURSE) {
    const n = atDistance('obstacle ' + (o.id + 1), o.s);
    const number = label('obstacle number ' + (o.id + 1), String(o.id + 1).padStart(2, '0'), 0.85, 0.46, '#21373d', '#d6fa68', n, true);
    number.position.set(-2.3, 0.82, 0);
    cylinder('marker stand', 0.57, 0.09, -2.3, 0.3, 0, M.ink, n);
    if (o.type === 'hurdle') {
      for (const side of [-1,1]) {
        box('jump wing', 0.45, 1.35, 0.25, side * 1.57, 0.7, 0, M.purple, n);
        box('jump foot', 0.73, 0.12, 0.7, side * 1.57, 0.07, 0, M.white, n);
        box('jump wing cap', 0.52, 0.09, 0.29, side * 1.57, 1.41, 0, M.yellow, n);
      }
      for (let j=0;j<7;j++) box('striped hurdle bar',0.42,0.12,0.12,(j-3)*0.42,0.85,0,j%2 ? M.purple : M.white,n);
    } else if (o.type === 'hoop') {
      const ring = B.MeshBuilder.CreateTorus('jump ring', { diameter: 3.05, thickness: 0.17, tessellation: 48 }, scene);
      ring.parent = n; ring.position.y = 1.93; ring.rotation.x = Math.PI / 2; ring.material = M.yellow;
      for (const side of [-1,1]) { box('ring upright', 0.13, 2.7, 0.13, side*1.85, 1.35, 0, M.purple, n); box('ring foot',0.7,0.12,0.8,side*1.85,0.06,0,M.white,n); }
    } else if (o.type === 'tunnel') {
      const rings = [];
      for (let j=0;j<=12;j++) {
        const z = j * o.length / 12, points=[];
        for(let k=0;k<=20;k++){ const a=k*Math.PI/20; points.push(new B.Vector3(Math.cos(a)*1.43,0.06+Math.sin(a)*1.25,z)); }
        rings.push(points);
        const rib=B.MeshBuilder.CreateTube('tunnel rib',{path:points,radius:0.045,tessellation:6},scene); rib.parent=n; rib.material=(j===0||j===12)?M.yellow:M.purple;
      }
      const shell=B.MeshBuilder.CreateRibbon('tunnel fabric',{pathArray:rings,sideOrientation:B.Mesh.DOUBLESIDE},scene); shell.parent=n; shell.material=M.darkPurple;
      box('tunnel floor',2.8,0.025,o.length,0,0.034,o.length/2,M.purple,n);
    } else if (o.type === 'slalom') {
      for(let i=0;i<C.poleCount(o);i++){
        const z=C.poleS(o,i)-o.s;
        box('weave foot',1.0,0.05,0.16,0,0.04,z,M.white,n);
        cylinder('weave pole lower',0.9,0.09,0,0.5,z,M.yellow,n);
        cylinder('weave pole upper',0.9,0.09,0,1.4,z,M.purple,n);
        const target=C.poleTarget(i);
        box('weave direction marker',0.33,0.025,0.34,target,0.066,z,M.lime,n);
      }
    } else {
      const paths=[[],[]];
      for(let j=0;j<=40;j++){
        const z=o.length*j/40,y=C.rampHeight(o.s+z)+0.055;
        paths[0].push(new B.Vector3(-0.72,y,z)); paths[1].push(new B.Vector3(0.72,y,z));
      }
      const deck=B.MeshBuilder.CreateRibbon('balance deck',{pathArray:paths,sideOrientation:B.Mesh.DOUBLESIDE},scene); deck.parent=n; deck.material=M.purple;
      for(let j=0;j<=20;j++){
        const z=j*o.length/20,y=C.rampHeight(o.s+z)+0.065;
        const plank=box('deck traction',1.48,0.045,0.12,0,y,z,j<4||j>16?M.yellow:M.white,n);
        const rise=C.rampHeight(o.s+Math.min(o.length,z+0.02))-C.rampHeight(o.s+Math.max(0,z-0.02)); plank.rotation.x=-Math.atan2(rise,0.04);
      }
      for(let j=2;j<=8;j+=2){const h=C.rampHeight(o.s+j); for(const side of [-1,1]) cylinder('ramp support',h,0.08,side*0.57,h/2,j,M.ink,n);}
    }
  }
  // Merge static geometry to keep Android draw calls bounded.
  const buckets = new Map();
  for (const m of [...scene.meshes]) {
    if (!m.material || m.billboardMode || !m.getTotalVertices()) continue;
    m.computeWorldMatrix(true); const k=m.material.uniqueId;
    if(!buckets.has(k))buckets.set(k,[]); buckets.get(k).push(m);
  }
  for(const items of buckets.values()){
    if(items.length>1){ const merged=B.Mesh.MergeMeshes(items,true,true,undefined,false,false); if(merged){merged.name='stadium batch';merged.isPickable=false;merged.freezeWorldMatrix();} }
    else items[0].freezeWorldMatrix();
  }
  const staticMeshCount=scene.meshes.length;

  const athletes = [];
  const skinColors = ['#d7a27b','#865b40','#e2b592','#b47d55'];
  const hairColors = ['#332b25','#242b29','#6e4932','#292723'];
  for (const racer of race.racers) {
    const root = new B.TransformNode('athlete '+racer.name,scene), body = new B.TransformNode('animated body',scene); body.parent=root;
    const jersey=material(racer.name+' jersey',racer.color), skin=material(racer.name+' skin',skinColors[racer.id]), hair=material(racer.name+' hair',hairColors[racer.id]);
    const shorts=material('athletic shorts','#263039'), sole=M.white;
    cylinder('athletic torso',0.57,0.43,0,1.20,0,jersey,body,0.56);
    box('waistband',0.43,0.14,0.28,0,0.89,0,shorts,body);
    cylinder('neck',0.13,0.16,0,1.55,0,skin,body);
    const head=sphere('human head',0.38,0,1.79,0.01,skin,body,12); head.scaling.y=1.16;
    const hairCap=sphere('hair',0.40,0,1.93,-0.02,hair,body,10);hairCap.scaling.y=0.55;
    box('hair back',0.29,0.23,0.08,0,1.83,-0.15,hair,body);
    box('nose',0.065,0.065,0.085,0,1.78,0.199,skin,body);
    for(const side of [-1,1]){
      sphere('ear',0.09,side*0.19,1.79,0,skin,body,6);
      box('eye',0.037,0.025,0.019,side*0.071,1.83,0.177,hair,body);
    }
    box('jersey chest stripe',0.47,0.07,0.028,0,1.30,0.245,sole,body);
    const legs=[],knees=[],arms=[],elbows=[];
    for(const side of [-1,1]){
      const hip=new B.TransformNode('hip',scene);hip.parent=body;hip.position.set(side*0.135,0.86,0);legs.push(hip);
      cylinder('short leg',0.25,0.19,0,-0.10,0,shorts,hip);
      cylinder('thigh',0.24,0.14,0,-0.28,0,skin,hip);
      const knee=new B.TransformNode('knee',scene);knee.parent=hip;knee.position.y=-0.4;knees.push(knee);
      cylinder('calf',0.3,0.115,0,-0.145,0,skin,knee);
      cylinder('sock',0.13,0.12,0,-0.285,0,sole,knee);
      box('running shoe',0.19,0.13,0.32,0,-0.355,0.065,jersey,knee);
      box('shoe sole',0.195,0.05,0.33,0,-0.411,0.065,sole,knee);
      const shoulder=new B.TransformNode('shoulder',scene);shoulder.parent=body;shoulder.position.set(side*0.33,1.43,0);arms.push(shoulder);
      sphere('sleeve',0.235,0,-0.035,0,jersey,shoulder);
      cylinder('upper arm',0.26,0.12,0,-0.19,0,skin,shoulder);
      const elbow=new B.TransformNode('elbow',scene);elbow.parent=shoulder;elbow.position.y=-0.32;elbow.rotation.x=-0.65;elbows.push(elbow);
      cylinder('forearm',0.23,0.10,0,-0.115,0,skin,elbow);
      sphere('hand',0.12,0,-0.255,0,skin,elbow);
    }
    const tag=label(racer.name+' tag',racer.id===0?'YOU':racer.name,0.98,0.27,'#21373d',racer.color,root,true);tag.position.y=2.35;
    const shadow=B.MeshBuilder.CreateDisc('athlete contact shadow',{radius:0.36,tessellation:20},scene);shadow.rotation.x=Math.PI/2;
    shadow.material=material('contact shadow','#243d2c',0.25);shadow.material.backFaceCulling=false;shadow.isPickable=false;
    athletes.push({root,body,legs,knees,arms,elbows,tag,shadow});
  }
  const signal=B.MeshBuilder.CreateTorus('next obstacle beacon',{diameter:3.7,thickness:0.07,tessellation:40},scene);signal.material=M.lime;
  signal.position.y=0.13;
  let cameraMode='tv',camTarget=new B.Vector3(0,0,0),cameraInit=false,lastState='menu';
  function setCamera(mode){cameraMode=mode;cameraInit=false;return cameraMode;}
  function update(dt,elapsed){
    const menu=race.state==='menu';
    for(let i=0;i<athletes.length;i++){
      const a=athletes[i],r=race.racers[i];
      const lane=(r.s<5 ? (i-1.5)*0.64 : i===0?0:(i-2)*0.19);
      const p=C.sample(r.s,r.lateral+lane),floor=C.rampHeight(r.s);
      a.root.position.set(p.x,floor+r.jump,p.z);a.root.rotation.y=p.angle;
      const moving=!['menu','paused','countdown','finished'].includes(race.state)&&!r.finished;
      const stride=r.running*2.8,cycle=moving?Math.sin(stride):Math.sin(elapsed*1.5+i)*0.045;
      const duck=r.duck?1:0;
      a.body.scaling.y=duck?0.57:1;a.body.position.y=moving&&!r.jump?Math.abs(Math.sin(stride))*0.055:0;
      a.body.rotation.x=duck?0.28:r.boosting?0.13:0.025;
      a.body.rotation.z=r.stumble>0?Math.sin(elapsed*28)*0.17:-r.lateral*0.035;
      for(let j=0;j<2;j++){
        const side=j?1:-1;a.legs[j].rotation.x=r.jump>0?-0.55+side*0.26:cycle*side*(duck?0.8:0.78);
        a.knees[j].rotation.x=r.jump>0?1.03:Math.max(0,-cycle*side)*0.85;
        a.arms[j].rotation.x=r.jump>0?-2.1:-cycle*side*0.87-0.12;
        a.arms[j].rotation.z=side*(r.finished?0.72:0.08);
        a.elbows[j].rotation.x=r.finished?-1.2:-0.9;
      }
      a.shadow.position.set(p.x,floor+0.045,p.z);a.shadow.scaling.set(1+r.jump*0.18,1+r.jump*0.18,1);
      a.tag.position.y=r.duck?1.45:2.35;
    }
    const next=C.nextObstacle(race.racers[0]);signal.setEnabled(!menu&&Boolean(next)&&!race.racers[0].finished);
    if(next){const p=C.sample(next.s);signal.position.set(p.x,0.14,p.z);signal.scaling.setAll(1+Math.sin(elapsed*4)*0.025);}
    let desired,target;
    if(menu||cameraMode==='tv'){
      const portrait=engine.getRenderWidth()/engine.getRenderHeight()<0.85;
      desired=new B.Vector3(portrait?69:57,portrait?78:56,portrait?-81:-65);
      target=new B.Vector3(menu?-2:0,0,0);
      if(menu){desired.x+=Math.sin(elapsed*0.08)*2;desired.z+=Math.cos(elapsed*0.08)*2;}
    }else{
      const r=race.racers[0],p=C.sample(r.s,r.lateral*0.45),look=C.sample(Math.min(C.LENGTH,r.s+5.5));
      desired=new B.Vector3(p.x-p.dx*10.3+p.dz*3.4,p.dx?8.2:8.0,p.z-p.dz*10.3-p.dx*3.4);
      desired.y+=C.rampHeight(r.s)*0.65;
      target=new B.Vector3(look.x,0.75+C.rampHeight(r.s)*0.45,look.z);
    }
    const blend=cameraInit?1-Math.exp(-dt*4.2):1;
    B.Vector3.LerpToRef(camera.position,desired,blend,camera.position);B.Vector3.LerpToRef(camTarget,target,blend,camTarget);camera.setTarget(camTarget);cameraInit=true;lastState=race.state;
  }
  update(0.016,0);
  return {scene,camera,athletes,staticMeshCount,update,setCamera,getCamera:()=>cameraMode,dispose:()=>scene.dispose()};
});
