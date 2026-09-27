(function(){
  "use strict";
  /* =====================================================================
     FÁBRICA 3D — complexo industrial + interior de cada setor
     ===================================================================== */
  let scene,camera,renderer,root,campusRoot,container,clock,viewMode="campus",hoverTip,labelLayer,sectorPanel;
  let skyMat,skyMesh,sun,hemi,stars,moon,emergency;
  const tgt={ax:.9,ay:.7,dist:128,look:null}, cur={ax:.9,ay:.7,dist:128,look:null};
  let drag=false,lastX=0,lastY=0,dragMoved=false,lastInteract=0;
  let currentState=null,shake=0,celebration=0,valvePuff=0;
  const machines={}, products=[], confetti=[], sparks=[], clickTargets=[], vehicles=[], walkers=[], flags=[], roofFans=[], labels=[];
  const stockMeshes={wood:[],graphite:[],paint:[]}, nightMats=[], operators=[], emitters={}, brandMats=[];
  const views={};            // id -> {group, cam, tick, sync, built}
  const pointers=new Map();let pinchStart=0,pinchDistance=0;
  let tech=null,forklift=null,bridgeBoxes=[],beltTexture=null,softTex=null,wallTex=null,doorTex=null,brandTex=null;
  let lampMat,interiorWinMat,screenMat,roadMat,lineMat,dashGeo,roofMatDark,skylightMat,glassMat,treeMats=[],panelTex=null,roofTex=null,padTex=null;
  const LEVEL_SPEED=[0,1,1.35,1.75], LEVEL_RATE=[0,1,1.5,2.1];
  const RAINBOW=[0x2e79bd,0x3e9d63,0xd4483f,0xe8b838,0x7a54a5,0xe78630];
  const PRODUCT_COLORS={hb:0xe8b838,azul:0x2e79bd,cor:null,b2:0x2d3a36,eco:0x3e9d63};
  const colors={green:0x42bb75,red:0xe34d45,yellow:0xf0c040,off:0x647168,wood:0xc99255,belt:0x263a35,orange:0xe78630};
  const ROAD_Y=.06;
  const TALK_SLIDES={seguranca:["Segurança em primeiro lugar","EPI sempre: capacete, óculos e luvas","Máquina desligada para manutenção","Zero acidentes é meta de todos"],
    qualidade:["Os 5 sensos: utilização, ordem, limpeza, saúde e disciplina","Cada lápis conta","Inspeção na origem","Cliente satisfeito volta"],
    inovacao:["Melhoria contínua (kaizen)","As melhores ideias vêm da linha","Menos desperdício, mais lápis","Teste, meça e melhore"],
    motivacao:["Juntos somos mais fortes","Cada etapa da linha importa","Comemore as pequenas vitórias","Obrigado, equipe!"],
    escolas:["Da árvore ao lápis","Madeira de reflorestamento","Como a mina entra no lápis","Venham nos visitar!"]};

  const SECTORS={
    producao:  {name:"Produção",             icon:"🏭",cam:{dist:34}},
    caldeira:  {name:"Caldeira",             icon:"🔥",cam:{dist:18}},
    auditorio: {name:"Auditório",            icon:"🎤",cam:{dist:21}},
    clube:     {name:"Clube da Fábrica",     icon:"🎉",cam:{dist:19}},
    loja:      {name:"Loja da Fábrica",      icon:"🛍️",cam:{dist:19}},
    feira:     {name:"Feira — seu estande",  icon:"🎪",cam:{dist:21,look:[2.5,1.4,4.5],ax:2.75}},
    madeira:   {name:"Depósito de madeira",  icon:"🪵",cam:{dist:21}},
    tintas:    {name:"Setor de tintas",      icon:"🎨",cam:{dist:18}},
    estoque:   {name:"Estoque",              icon:"📦",cam:{dist:22}},
    acabamento:{name:"Acabamento",           icon:"✨",cam:{dist:22}},
    logistica: {name:"Logística",            icon:"🚚",cam:{dist:23}},
    expedicao: {name:"Expedição",            icon:"📮",cam:{dist:21}},
    admin:     {name:"Administração",        icon:"🏢",cam:{dist:30,ay:1.02,ax:2.75,look:[0,0,-.5]}},
    oficinas:  {name:"Oficinas",             icon:"🔧",cam:{dist:16}},
    visitantes:{name:"Museu do Lápis",       icon:"🏛️",cam:{dist:22}},
    laboratorio:{name:"Laboratório de Cores", icon:"🔬",cam:{dist:19}},
    refeitorio:{name:"Refeitório",           icon:"🍽️",cam:{dist:21}},
    cantina:   {name:"Cantina da praça",     icon:"🥪",cam:{dist:15}},
    ambulatorio:{name:"Ambulatório",         icon:"🩺",cam:{dist:16}},
    qualidade: {name:"Controle de Qualidade",icon:"🧪",cam:{dist:18}},
    mina:      {name:"Preparo da Mina",      icon:"⚫",cam:{dist:20}},
    viveiro:   {name:"Viveiro",              icon:"🌲",cam:{dist:22}},
    reciclagem:{name:"Reciclagem",           icon:"♻️",cam:{dist:18}},
    subestacao:{name:"Subestação",           icon:"⚡",cam:{dist:18}},
    brigada:   {name:"Brigada e Enfermaria", icon:"🚒",cam:{dist:18}},
    portaria:  {name:"Portaria",             icon:"🛂",cam:{dist:12}},
    treinamento:{name:"Centro de Treinamento",icon:"🎓",cam:{dist:18}},
    creche:    {name:"Creche",               icon:"👶",cam:{dist:16}}
  };

  /* ---------------- utilidades ---------------- */
  function material(color,extra={}){return new THREE.MeshStandardMaterial({color,roughness:.62,metalness:.12,...extra});}
  function shadowed(m){m.castShadow=m.receiveShadow=true;return m;}
  function box(w,h,d,color,x=0,y=0,z=0){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),color&&color.isMaterial?color:material(color));m.position.set(x,y,z);return shadowed(m);}
  function cylinder(r,h,color,x=0,y=0,z=0,rotZ=0,seg=18){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,seg),color&&color.isMaterial?color:material(color));m.position.set(x,y,z);m.rotation.z=rotZ;return shadowed(m);}
  function canvasTex(w,h,draw,repeat=true){const c=document.createElement("canvas");c.width=w;c.height=h;draw(c.getContext("2d"),w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;if(repeat)t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;return t;}
  function stripes(horizontal,light="#ffffff",dark="#c9c9c9",step=8){return canvasTex(64,64,(g)=>{for(let i=0;i<64;i+=step){const gr=horizontal?g.createLinearGradient(0,i,0,i+step):g.createLinearGradient(i,0,i+step,0);gr.addColorStop(0,dark);gr.addColorStop(.45,light);gr.addColorStop(1,dark);g.fillStyle=gr;horizontal?g.fillRect(0,i,64,step):g.fillRect(i,0,step,64);}});}
  function tiled(tex,rx,ry){const t=tex.clone();t.needsUpdate=true;t.repeat.set(rx,ry);return t;}
  function lerpAngle(a,b,k){let d=((b-a+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return a+d*k;}
  function seededRandom(seed){let value=seed%2147483647;return()=>{value=value*16807%2147483647;return(value-1)/2147483646;};}
  function roundRect(g,x,y,w,h,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
  function nightMat(color,kind,extra={}){const {emissive=0xffd58a,...rest}=extra;const m=material(color,rest);m.emissive=new THREE.Color(emissive);m.emissiveIntensity=0;m.userData.kind=kind;nightMats.push(m);return m;}
  function syncCount(list,frac){const n=Math.ceil(Math.max(0,Math.min(1,frac))*list.length);list.forEach((m,i)=>m.visible=i<n);}
  const clamp01=v=>Math.max(0,Math.min(1,v));

  /* ---------------- rótulos HTML ---------------- */
  function addLabel(html,pos,view,opts={}){
    const el=document.createElement(opts.action||opts.station?"button":"div");if(el.tagName==="BUTTON")el.type="button";
    el.className=`scene-label ${opts.cls||""}`;el.innerHTML=html;labelLayer.append(el);
    const L={el,pos,view,...opts,canMini:/sl-icon/.test(html),prio:opts.prio??(/act|machine/.test(opts.cls||"")?2:/dept/.test(opts.cls||"")?1:0)};
    if(opts.action)el.addEventListener("click",()=>handleAction(opts.action));
    if(opts.station)el.addEventListener("click",()=>window.toggleStationBy3D?.(opts.station));
    labels.push(L);return L;
  }
  const _v=new THREE.Vector3();
  /* Placas sem sobreposição: as mais importantes e mais próximas mostram o nome;
     as que colidiriam viram só um ícone (nome aparece ao passar o mouse) ou somem. */
  let labelFrame=0;
  function hideLabel(L){if(L.shown!==false){L.el.style.display="none";L.shown=false;}}
  function updateLabels(){
    const w=container.clientWidth,h=container.clientHeight;labelFrame++;
    const items=[];
    for(const L of labels){
      if(L.view!==viewMode||L.hidden){hideLabel(L);continue;}
      _v.copy(L.pos).project(camera);
      if(_v.z>1||Math.abs(_v.x)>1.05||Math.abs(_v.y)>1.05){hideLabel(L);continue;}
      items.push({L,x:(_v.x*.5+.5)*w,y:(-_v.y*.5+.5)*h,z:_v.z});
    }
    items.sort((a,b)=>(b.L.prio||0)-(a.L.prio||0)||a.z-b.z);
    const boxes=[],fits=b=>b.t>2&&!boxes.some(o=>b.l<o.r&&b.r>o.l&&b.t<o.b&&b.b>o.t);
    const mk=(it,wd,ht)=>({l:it.x-wd/2-4,r:it.x+wd/2+4,t:it.y-ht-10,b:it.y-4});
    for(const it of items){
      const L=it.L;
      if(L.shown===false){L.el.style.display="";L.shown=true;}
      if(!L.mini&&(L.fw==null||labelFrame%45===0)){L.fw=L.el.offsetWidth;L.fh=L.el.offsetHeight;}
      let bx=mk(it,L.fw||90,L.fh||24),mini=false;
      if(!fits(bx)){if(L.canMini){bx=mk(it,30,26);mini=true;}if(!fits(bx)){hideLabel(L);continue;}}
      if(mini!==!!L.mini){L.mini=mini;L.el.classList.toggle("mini",mini);}
      boxes.push(bx);
      L.el.style.transform=`translate(${it.x}px,${it.y}px) translate(-50%,-100%)`;
      L.el.style.zIndex=String(1000-Math.round(it.z*1000));
    }
  }
  function handleAction(action){if(SECTORS[action])setView(action);else window.onFactoryAction?.(action);}

  /* ---------------- partículas ---------------- */
  function makeEmitter(count,opts,parent=scene){
    const list=[];for(let i=0;i<count;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:softTex,transparent:true,depthWrite:false,opacity:0}));s.visible=false;parent.add(s);list.push({s,t:i/count,ox:0,oz:0,live:false});}
    return {list,speed:.25,rise:6,drift:2,spread:.5,size:1,opacity:.5,...opts};
  }
  function runEmitter(e,dt,on,x,y,z,color,strength=1){
    for(const p of e.list){
      p.t+=dt*e.speed*(on?1:1.6);
      if(p.t>1){p.t-=1;p.ox=(Math.random()-.5)*e.spread;p.oz=(Math.random()-.5)*e.spread;p.live=on;}
      if(!p.live){p.s.visible=false;continue;}
      const t=p.t;p.s.visible=true;p.s.position.set(x+p.ox+t*e.drift,y+t*e.rise,z+p.oz+t*e.drift*.3);
      const sc=e.size*(.5+t*2.4);p.s.scale.set(sc,sc,1);p.s.material.opacity=Math.sin(Math.min(1,t*1.4)*Math.PI*.5)*(1-t)*e.opacity*strength*1.6;p.s.material.color.setHex(color);
    }
  }

  /* ---------------- modelos ---------------- */
  function makeWorker(helmet,shirt,scale=1){
    const g=new THREE.Group();
    const legs=[];for(const x of [-.12,.12]){const leg=box(.14,.55,.16,0x2c3b4a,x,.28,0);g.add(leg);legs.push(leg);}
    g.add(box(.46,.6,.28,shirt,0,.85,0));g.add(box(.47,.08,.3,0xe8e3a0,0,.95,0));
    const head=new THREE.Mesh(new THREE.SphereGeometry(.16,12,10),material(0xd9a47c));head.position.y=1.32;g.add(shadowed(head));
    const hat=new THREE.Mesh(new THREE.SphereGeometry(.19,12,8,0,Math.PI*2,0,Math.PI/2),material(helmet));hat.position.y=1.38;g.add(hat);
    g.userData.legs=legs;g.scale.setScalar(scale);return g;
  }
  function randomWorker(scale=1){return makeWorker(Math.random()<.5?0xf3efe4:0xe8b838,[0x2f7a52,0x3a5f8f,0xb0603f,0x6c5a8f][Math.floor(Math.random()*4)],scale);}
  function wheel(r,w,x,y,z){const wh=cylinder(r,w,0x1b211e,x,y,z,0,14);wh.rotation.x=Math.PI/2;wh.add(cylinder(r*.45,w+.02,0xa9b1ad,0,0,0,0,10));return wh;}
  function headlights(g,x,y,z){const hl=nightMats.find(m=>m.userData.kind==="headlight");for(const s of [-1,1])g.add(box(.06,.14,.2,hl,x,y,s*z));}
  function makeTruck(color,cab=0x2e7351,len=3.6){
    const g=new THREE.Group();const wheels=[];
    const cargo=box(len,1.55,1.7,color,-.4,1.2,0);g.add(cargo);cargo.add(box(len+.02,.14,1.72,cab,0,-.55,0));
    g.add(box(1.35,1.3,1.62,cab,len/2+.35,1,0));g.add(box(.06,.55,1.4,0x9fc4d2,len/2+1.03,1.3,0));
    g.add(box(1.36,.1,1.64,0x1b211e,len/2+.35,.36,0));headlights(g,len/2+1.04,.65,.6);
    for(const x of [-len/2+.2,-len/2+1.1,len/2+.4])for(const s of [-1,1]){const w=wheel(.33,.22,x,.34,s*.86);g.add(w);wheels.push(w);}
    g.userData.wheels=wheels;return g;
  }
  function makeBus(){
    const g=new THREE.Group(),wheels=[];g.add(box(6,1.9,1.9,0xf1ede2,0,1.35,0));g.add(box(6.02,.25,1.92,0x2e7351,0,.55,0));
    const win=material(0x3d5563,{metalness:.5,roughness:.2});g.add(box(5,.6,1.94,win,-.2,1.75,0));g.add(box(.05,.9,1.6,win,3.01,1.55,0));headlights(g,3.02,.8,.65);
    for(const x of [-2,2.1])for(const s of [-1,1]){const w=wheel(.36,.24,x,.36,s*.95);g.add(w);wheels.push(w);}
    g.userData.wheels=wheels;return g;
  }
  function makeCar(color,scale=1){
    const g=new THREE.Group(),wheels=[];g.add(box(1.6,.45,.8,color,0,.38,0));g.add(box(.85,.36,.72,0xb9d0d8,-.1,.78,0));g.add(box(.87,.06,.74,color,-.1,.97,0));
    headlights(g,.81,.42,.26);for(const x of [-.5,.5])for(const s of [-1,1]){const w=wheel(.16,.12,x,.17,s*.4);g.add(w);wheels.push(w);}
    g.userData.wheels=wheels;g.scale.setScalar(scale);return g;
  }
  function makeForklift(){
    const g=new THREE.Group(),wheels=[];g.add(box(1.1,.6,.8,0xe8b838,0,.55,0));g.add(box(.5,.5,.78,0x2c3b4a,-.35,1.05,0));
    for(const x of [-.3,.3])for(const z of [-.3,.3])g.add(box(.05,1,.05,0x2c3b4a,x-.15,1.3,z));g.add(box(.62,.05,.66,0x2c3b4a,-.15,1.8,0));
    g.add(box(.08,1.6,.6,0x3a3f3e,.62,1.05,0));const fork=new THREE.Group();fork.position.set(.9,.3,0);for(const z of [-.2,.2])fork.add(box(.6,.05,.1,0x3a3f3e,0,0,z));
    const pallet=box(.8,.12,.8,0xb68a55,0,.1,0);const load=box(.7,.55,.7,0xc69258,0,.45,0);load.add(box(.72,.05,.3,0x2f7a52,0,.2,0));pallet.add(load);fork.add(pallet);g.add(fork);
    for(const x of [-.35,.35])for(const s of [-1,1]){const w=wheel(.2,.14,x,.2,s*.42);g.add(w);wheels.push(w);}
    g.userData={wheels,fork,pallet};return g;
  }
  function makePencil(color,len=1.5,r=.08){const g=new THREE.Group();const body=cylinder(r,len,color,0,0,0,0,6);g.add(body);const tip=new THREE.Mesh(new THREE.ConeGeometry(r,r*2.8,6),material(0xe7c9a0));tip.position.y=len/2+r*1.4;g.add(tip);const lead=new THREE.Mesh(new THREE.ConeGeometry(r*.35,r,6),material(0x2d3a36));lead.position.y=len/2+r*2.5;g.add(lead);return g;}

  /* ---------------- pessoas e empilhadeiras em movimento ---------------- */
  function walk(worker,targetX,targetZ,dt,t,speed=3.2){
    const dx=targetX-worker.position.x,dz=targetZ-worker.position.z,dist=Math.hypot(dx,dz);
    if(dist>.08){const step=Math.min(dist,dt*speed);worker.position.x+=dx/dist*step;worker.position.z+=dz/dist*step;worker.rotation.y=Math.atan2(dx,dz);if(dt>0)worker.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*10+i*Math.PI)*.5);return false;}
    worker.userData.legs.forEach(l=>l.rotation.x=0);return true;
  }
  function addPacer(g,a,b,worker=randomWorker(),y=0){worker.position.set(a[0]+(b[0]-a[0])*Math.random(),y,a[1]+(b[1]-a[1])*Math.random());Object.assign(worker.userData,{a,b,dir:1,wait:Math.random()*2});g.add(worker);return worker;}
  function tickPacer(w,dt,t,k){const u=w.userData;if(!k||!w.visible){u.legs.forEach(l=>l.rotation.x=0);return;}if(u.wait>0){u.wait-=dt*k;u.legs.forEach(l=>l.rotation.x=0);return;}const tg=u.dir>0?u.b:u.a;if(walk(w,tg[0],tg[1],dt*k,t,1.3)){u.dir*=-1;u.wait=.8+Math.random()*2.5;}}
  function shuttle(f,dt,k,a,b){const u=f.userData;u.cycle=(u.cycle||0)+dt*.07*k;const c=u.cycle%1,go=c<.5,p=(1-Math.cos((go?c*2:(1-c)*2)*Math.PI))/2;f.position.x=a[0]+(b[0]-a[0])*p;f.position.z=a[1]+(b[1]-a[1])*p;const h=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);f.rotation.y=go?h:h+Math.PI;u.pallet.visible=go;u.fork.position.y=.3+(go?.35:0);u.wheels.forEach(w=>w.rotation.y-=dt*k*4);}

  /* ---------------- casca de galpão interno ---------------- */
  function roomShell(g,w,d,h,o={}){
    g.userData.bounds={w,d};
    const floorTex=canvasTex(64,64,(c)=>{c.fillStyle="#fff";c.fillRect(0,0,64,64);c.strokeStyle="rgba(0,0,0,.13)";c.lineWidth=2;c.strokeRect(1,1,62,62);});floorTex.repeat.set(w/2,d/2);
    g.add(box(w+.6,.4,d+.6,new THREE.MeshStandardMaterial({color:o.floor??0xcfcabb,map:floorTex,roughness:.92}),0,-.2,0));
    const wall=o.wall??0xd6cfbd;
    g.add(box(w,h,.3,new THREE.MeshStandardMaterial({color:wall,map:tiled(wallTex,Math.round(w),1),roughness:.9}),0,h/2,d/2+.15));
    g.add(box(.3,h,d,new THREE.MeshStandardMaterial({color:wall,map:tiled(wallTex,Math.round(d),1),roughness:.9}),-w/2-.15,h/2,0));
    g.add(box(w,1.2,.3,0xded8c9,0,.6,-d/2-.15));g.add(box(.3,1.2,d,0xded8c9,w/2+.15,.6,0));
    const trim=o.trim??0x2f5d4a;g.add(box(w+.3,.4,.34,trim,0,h,d/2+.15));g.add(box(.34,.4,d+.3,trim,-w/2-.15,h,0));
    const deco=(m,hw,hh)=>{m.userData.backDeco={hw,hh};g.add(m);};
    const winY=h-1.5;for(let x=-w/2+2;x<=w/2-1.5;x+=3)deco(box(2.2,1.1,.05,interiorWinMat,x,winY,d/2-.02),1.1,.55);for(let z=-d/2+2;z<=d/2-1.5;z+=3)g.add(box(.05,1.1,2.2,interiorWinMat,-w/2+.02,winY,z));
    for(let x=-w/2+3;x<=w/2-2;x+=6)deco(box(.3,h,.3,0x7d8a84,x,h/2,d/2-.05),.15,h/2);
    for(let x=-w/2+3;x<=w/2-2;x+=5)deco(cylinder(.11,1.2,lampMat,x,h-.6,d/2-.5,Math.PI/2),.15,.6);
  }

  /* =====================================================================
     INTERIOR: PRODUÇÃO (linha com as 4 máquinas)
     ===================================================================== */
  const LINE_X=[-18,-12,-6,0,6,12,18];            // posição das 7 máquinas no galpão
  const PROD_W=48,PROD_D=34,PROD_H=8;
  const extraLines=[];   // linhas 2 a 5 (compradas no jogo)
  function addConveyor(){
    beltTexture=stripes(false,"#3b534b","#1c2b26",16);beltTexture.repeat.set(42,1);
    root.add(box(43,.35,2.05,new THREE.MeshStandardMaterial({color:0xffffff,map:beltTexture,roughness:.9}),0,1.05,0));
    root.add(box(43,.22,.16,0x789087,0,1.35,-1));root.add(box(43,.22,.16,0x789087,0,1.35,1));
    for(let x=-20;x<=20;x+=2.5){root.add(box(.16,1.2,.16,0x31483f,x,.45,-.8));root.add(box(.16,1.2,.16,0x31483f,x,.45,.8));}
  }
  function addMachine(id,name,x,color,type){
    const g=new THREE.Group();g.position.set(x,0,0);g.userData.stationId=id;
    g.add(box(4.35,.38,5.35,0x263b34,0,.34,0));
    for(const sx of [-1,1])for(const sz of [-1,1]){g.add(box(.18,3.6,.18,0x22352f,sx*1.75,2.05,sz*2));g.add(box(.35,.14,.35,0xe1ad2f,sx*1.75,.12,sz*2));}
    for(const z of [-2,2])g.add(box(3.7,.18,.18,0x365449,0,3.78,z));
    for(const xx of [-1.75,1.75])g.add(box(.18,.18,4.15,0x365449,xx,3.78,0));
    const body=box(3.35,1.05,4.25,color,0,.95,.05);body.userData={stationId:id,view:"producao",label:name};g.add(body);clickTargets.push(body);
    const consoleGroup=new THREE.Group();consoleGroup.position.set(1.25,1.35,-2.42);consoleGroup.rotation.x=-.16;consoleGroup.add(box(1.05,.9,.28,0x243a33));
    consoleGroup.add(box(.7,.42,.035,screenMat,0,.12,-.16));
    for(let i=0;i<3;i++)consoleGroup.add(cylinder(.055,.04,[0x4fb06e,0xe1b33f,0xd74e44][i],-.25+i*.25,-.25,-.18,Math.PI/2));g.add(consoleGroup);
    const light=cylinder(.16,.52,material(colors.off,{emissive:new THREE.Color(colors.off)}),1.5,4.12,-1.7);g.add(light);
    const pips=[];for(let i=0;i<3;i++){const pip=box(.32,.16,.12,material(0x3b4a44,{emissive:new THREE.Color(0)}),-.55+i*.42,3.78,-2.12);g.add(pip);pips.push(pip);}
    const moving=new THREE.Group(),parts={};g.add(moving);
    if(type===0){
      g.add(box(3.2,.22,3.7,0x899b94,0,1.55,0));
      for(let z=-1.35;z<=1.35;z+=.45){const roller=cylinder(.11,2.8,0xb9c3bf,0,1.75,z,Math.PI/2);roller.rotation.y=Math.PI/2;g.add(roller);}
      const bladeMat=material(0xcbd2cf,{metalness:.75,roughness:.22});parts.blades=[];
      for(const bx of [-.72,.72]){const blade=new THREE.Mesh(new THREE.CylinderGeometry(.72,.72,.09,28),bladeMat);blade.position.set(bx,2.45,.05);blade.rotation.x=Math.PI/2;blade.castShadow=true;moving.add(blade);parts.blades.push(blade);const guard=new THREE.Mesh(new THREE.TorusGeometry(.76,.07,8,26,Math.PI),material(0xe2ad32));guard.position.set(bx,2.45,.05);guard.rotation.x=Math.PI/2;moving.add(guard);}
      for(let z=-1.3;z<=1.3;z+=.65)moving.add(box(2.9,.12,.42,0xc99151,0,1.92,z));
      g.add(box(3.55,.12,.16,0xe1ad2f,0,3.05,-1.9));
    }else if(type===1){
      const hopper=new THREE.Mesh(new THREE.CylinderGeometry(.58,1.25,1.35,4),material(0x567c82,{metalness:.35}));hopper.position.set(0,3.15,.55);hopper.rotation.y=Math.PI/4;hopper.castShadow=true;g.add(hopper);
      parts.rollers=[];for(const rx of [-.62,.62]){const roller=cylinder(.48,3.25,0xb8c4c1,rx,2.02,0,Math.PI/2);roller.rotation.x=Math.PI/2;moving.add(roller);parts.rollers.push(roller);}
      for(let i=-4;i<=4;i++){const rod=cylinder(.035,3.5,i%2?0x333b3a:0x48504e,i*.18,1.82,0,Math.PI/2);rod.rotation.x=Math.PI/2;moving.add(rod);}
      g.add(box(3.15,.18,3.65,0x78928a,0,1.58,0));g.add(box(3.4,.18,.15,0xe1ad2f,0,2.8,-1.92));
    }else if(type===2){
      g.add(box(3.45,2.45,3.8,0xa85d3d,0,2.55,.1));
      const glass=new THREE.Mesh(new THREE.BoxGeometry(2.55,1.4,.08),material(0x8ec7cb,{transparent:true,opacity:.38,metalness:.15,roughness:.12}));glass.position.set(0,2.65,-1.85);g.add(glass);
      g.add(box(2.7,1.3,2.7,0x28332f,0,2.35,.1));
      parts.drum=cylinder(.62,2.55,0xd5d8d4,0,2.25,.1,Math.PI/2);parts.drum.rotation.x=Math.PI/2;moving.add(parts.drum);
      [0x2f77b5,0xd64c46,0xe5be3e].forEach((c,i)=>{g.add(cylinder(.36,1.25,c,-1.05+i*1.05,1.35,1.45));g.add(cylinder(.045,1.2,0xb9c4c0,-1.05+i*1.05,2.15,1.45));});
      g.add(cylinder(.33,2.2,0xadb7b3,-1.25,4.05,.8));g.add(box(3.2,.14,.15,0xe1ad2f,0,3.55,-1.95));
    }else if(type===3){
      g.add(box(3.3,.24,3.7,0x7e938b,0,1.52,0));
      parts.armBase=cylinder(.52,.5,0x315f4d,-.5,1.95,.35);moving.add(parts.armBase);
      const shoulder=new THREE.Group();shoulder.position.set(-.5,2.18,.35);shoulder.add(box(.36,1.65,.4,0xe0a52e,0,.75,0));shoulder.rotation.z=-.5;moving.add(shoulder);parts.shoulder=shoulder;
      const elbow=new THREE.Group();elbow.position.set(.22,3.55,.35);elbow.add(box(.32,1.35,.36,0xe0a52e,0,-.58,0));elbow.rotation.z=.75;moving.add(elbow);parts.elbow=elbow;
      const claw=box(.72,.18,.7,0x283b34,.7,2.95,.35);moving.add(claw);parts.claw=claw;
      for(const [bx,bz] of [[-.9,-.9],[.75,-.8],[.3,.8]]){const pack=box(.78,.55,.7,0xc69258,bx,1.92,bz);g.add(pack);pack.add(box(.62,.035,.55,0x376b4f,0,.29,0));}
      g.add(box(.15,2.1,.15,0x31483f,1.25,2.55,-1.55));g.add(box(.15,2.1,.15,0x31483f,-1.25,2.55,-1.55));g.add(box(2.65,.15,.15,0x3c564c,0,3.55,-1.55));
      const scanner=box(2.15,.32,.12,material(0x4b6d62,{emissive:new THREE.Color(0x285c4c),emissiveIntensity:.45}),0,3.4,-1.58);g.add(scanner);parts.scanner=scanner;
    }else if(type===4){   // colagem e prensa
      g.add(box(3.2,.22,3.7,0x899b94,0,1.55,0));
      for(let i=0;i<4;i++)g.add(box(2.6,.14,.55,i%2?0xc99151:0xd8a868,0,1.74,-1.1+i*.7));
      for(const sx of [-1,1])g.add(box(.32,2.7,.32,0x2f5a45,sx*1.25,2.7,0));
      g.add(box(3,.45,1.3,0x2f5a45,0,3.85,0));g.add(cylinder(.38,1.1,0xb9c3bf,0,3.2,0));
      parts.plate=box(2.4,.25,2.9,0xe1ad2f,0,2.4,0);moving.add(parts.plate);
      parts.glue=cylinder(.22,2.9,0xf3efe4,-1.35,1.95,0);parts.glue.rotation.x=Math.PI/2;moving.add(parts.glue);
      g.add(box(.5,.6,.5,0xf3efe4,-1.35,2.5,-1.6));
    }else if(type===5){   // fresagem
      g.add(box(3.2,.22,3.7,0x899b94,0,1.55,0));
      const glass=new THREE.Mesh(new THREE.BoxGeometry(3,1.5,3.3),material(0x8ec7cb,{transparent:true,opacity:.22,metalness:.15,roughness:.1}));glass.position.set(0,2.45,0);g.add(glass);
      g.add(box(3.1,.2,3.4,0x3d6f80,0,3.25,0));
      parts.cutters=[];for(const cx of [-.9,0,.9]){const c=cylinder(.45,.5,material(0xcbd2cf,{metalness:.8,roughness:.2}),cx,2.2,0,0,6);c.rotation.x=Math.PI/2;moving.add(c);parts.cutters.push(c);}
      for(let i=0;i<6;i++){const hex=cylinder(.08,1.2,0xd8a868,-1.1+i*.44,1.75,1.1,Math.PI/2,6);hex.rotation.y=Math.PI/2;g.add(hex);}
    }else{                // secagem a vapor (estufa)
      const tunnel=box(3.6,2.3,3.4,0x6e4a3a,0,2.3,0);g.add(tunnel);
      g.add(box(3.62,.6,3.42,0x2c3b4a,0,1.35,0));
      parts.heat=box(3.2,.12,.06,material(0x551a00,{emissive:new THREE.Color(0xff7a1a),emissiveIntensity:0}),0,1.85,-1.72);g.add(parts.heat);
      for(let i=0;i<3;i++)g.add(box(.9,.5,.04,0x1f2826,-1.1+i*1.1,2.6,-1.72));
      for(const vx of [-.9,.9])g.add(cylinder(.22,.6,0x9aa2a3,vx,3.75,.4,0,12));
      const pipe=cylinder(.14,4.6,0xb9c4c0,.9,5.9,2.8);pipe.rotation.x=Math.PI/2;g.add(pipe);g.add(cylinder(.14,2.4,0xb9c4c0,.9,4.7,.6));
    }
    const fan=cylinder(.42,.16,0xb5c4bd,-1.48,2.75,2.13,Math.PI/2);g.add(fan);
    root.add(g);
    const label=addLabel(`<i class="sl-dot"></i><b>${name}</b><small></small>`,new THREE.Vector3(x,4.7,0),"producao",{station:id,cls:"machine"});
    machines[id]={group:g,body,light,moving,fan,parts,type,pips,label,name,level:1,phase:Math.random()*6,status:"off",pulse:0};
  }
  let boardTex=null,lastBoard=0;
  function drawBoard(s){
    const c=boardTex.image,g=c.getContext("2d"),sum=window.getProdSummary?.();if(!sum)return;
    g.fillStyle="#0b1f16";g.fillRect(0,0,1024,440);
    if(s.blackout>0){g.fillStyle="#050807";g.fillRect(0,0,1024,440);boardTex.needsUpdate=true;return;}
    g.fillStyle="#56dd88";g.font="800 30px Segoe UI, Arial";g.fillText("PAINEL DA PRODUÇÃO",36,52);
    g.fillStyle="#cfe3d6";g.font="700 26px Consolas, monospace";g.textAlign="right";g.fillText(`DIA ${sum.day}  ${sum.time}`,988,52);g.textAlign="left";
    const ids=Object.keys(sum.names),tw=128,gap=8,x0=(1024-(ids.length*tw+(ids.length-1)*gap))/2;
    ids.forEach((id,i)=>{const st=s.stations[id],x=x0+i*(tw+gap),status=st.repair>0?"repair":st.broken?"broken":st.on?"on":"off";
      const col={repair:"#f0c040",broken:"#ff6258",on:sum.rate?"#56dd88":"#8fb3ff",off:"#44524b"}[status];
      g.fillStyle="#123427";g.fillRect(x,78,tw,150);g.fillStyle=col;g.fillRect(x,78,tw,12);
      g.beginPath();g.arc(x+tw/2,122,14,0,Math.PI*2);g.fill();
      g.fillStyle="#fff";g.font="700 20px Segoe UI, Arial";g.textAlign="center";g.fillText(sum.names[id],x+tw/2,168);
      g.fillStyle="#8fb5a0";g.font="700 18px Consolas, monospace";g.fillText(st.broken?"DEFEITO":st.repair>0?"CONSERTO":`${Math.round(st.wear)}%`,x+tw/2,195);
      g.fillStyle="#efc64d";g.fillText("●".repeat(st.level)+"○".repeat(3-st.level),x+tw/2,218);g.textAlign="left";
      if(i<ids.length-1){g.fillStyle="#24503c";g.fillRect(x+tw,150,gap,4);}});
    const kpi=(x,w,label,value,sub,bar,barCol)=>{g.fillStyle="#123427";g.fillRect(x,250,w,160);g.fillStyle="#8fb5a0";g.font="700 16px Segoe UI, Arial";g.fillText(label,x+16,280);
      g.fillStyle="#fff";g.font="800 44px Consolas, monospace";g.fillText(value,x+16,330);g.fillStyle="#8fb5a0";g.font="600 17px Segoe UI, Arial";g.fillText(sub,x+16,360);
      if(bar!=null){g.fillStyle="#0a1c14";g.fillRect(x+16,378,w-32,12);g.fillStyle=barCol;g.fillRect(x+16,378,(w-32)*Math.min(1,bar),12);}};
    kpi(36,220,"RITMO",String(sum.rate),`lápis/h (máx. ${sum.max})`);
    kpi(268,200,"HOJE",String(sum.today),"lápis produzidos");
    kpi(480,300,"PEDIDO ATUAL",sum.order?`${sum.order.done}/${sum.order.amount}`:"—",sum.order?sum.order.name:"sem pedido",sum.order?sum.order.done/sum.order.amount:0,"#56dd88");
    const b=sum.boiler;kpi(792,196,"VAPOR",b.on?`${b.pressure}`:"OFF",b.on?`psi · +${b.bonus}%`:"caldeira apagada",b.pressure/130,b.status==="high"?"#ff6258":b.status==="ok"?"#56dd88":"#8fb3ff");
    boardTex.needsUpdate=true;
  }
  function buildProducao(g){
    root=g;roomShell(g,PROD_W,PROD_D,PROD_H);
    for(const z of [-3.1,3.1])g.add(box(44,.02,.12,0xe1ad2f,0,.03,z));
    addConveyor();
    [["corte","CORTE",0x376d52,0],["mina","MINA",0x3d6f80,1],["prensa","PRENSA",0x5b6f3a,4],["fresagem","FRESAGEM",0x3d5a80,5],["pintura","PINTURA",0xa85d3d,2],["secagem","SECAGEM",0x8a5a2b,6],["embalagem","EMBALAGEM",0x6c5a8f,3]]
      .forEach(([id,name,c,type],i)=>addMachine(id,name,LINE_X[i],c,type));
    // telão de status na parede do fundo
    boardTex=canvasTex(1024,440,()=>{},false);
    g.add(box(13.6,6.1,.12,0x1d2624,0,4.3,16.72));
    const board=new THREE.Mesh(new THREE.PlaneGeometry(13,5.6),new THREE.MeshBasicMaterial({map:boardTex,toneMapped:false}));board.rotation.y=Math.PI;board.position.set(0,4.3,16.64);g.add(board);
    for(const sx of [-6.9,6.9])g.add(box(.2,1.4,.2,0x4d5558,sx,7.8,16.72));
    // matéria-prima
    const wg=new THREE.Group();wg.position.set(-22,0,6.5);
    for(let y=.55;y<3;y+=1.1){wg.add(box(3,.14,2.8,0x2f5a45,0,y,0));for(let z=-.9;z<=.9;z+=.6){const log=cylinder(.22,2.5,colors.wood,0,y+.28,z,Math.PI/2);wg.add(log);stockMeshes.wood.push(log);}}
    g.add(wg);addLabel("🪵 Madeira",new THREE.Vector3(-22,3.6,6.5),"producao",{cls:"small"});
    const gg=new THREE.Group();gg.position.set(-22,0,-6.5);
    for(let i=0;i<8;i++){const crate=box(.8,.55,.8,0x3a3f3e,-1.2+(i%4)*.8,.3+Math.floor(i/4)*.58,-.45);crate.add(box(.82,.06,.82,0x1f2322,0,.26,0));gg.add(crate);stockMeshes.graphite.push(crate);}
    const paintCols=[0x2f77b5,0xd64c46,0xe5be3e,0x3e9d63];
    for(let i=0;i<8;i++){const barrel=cylinder(.3,.8,paintCols[i%4],-1.2+(i%4)*.8,.42+Math.floor(i/4)*.84,.55);gg.add(barrel);stockMeshes.paint.push(barrel);}
    g.add(gg);addLabel("⚫ Grafite · 🧪 Tinta",new THREE.Vector3(-22.4,2.4,-6.5),"producao",{cls:"small"});
    const dock=new THREE.Group();dock.position.set(22.2,0,6.5);dock.add(box(4,.3,4.2,0x3a4b45,0,.15,0));dock.add(box(.3,3.4,4.2,0x3a4b45,1.85,1.8,0));
    const door=box(.25,2.8,3.4,colors.orange,1.62,1.7,0);dock.add(door);const truck=makeTruck(0xe9e5d7);truck.scale.setScalar(.8);truck.rotation.y=Math.PI;truck.position.set(-1.2,0,0);dock.add(truck);g.add(dock);machines.dockDoor=door;
    addLabel("📦 Saída",new THREE.Vector3(22.2,3.9,6.5),"producao",{cls:"small"});
    // tubulação de vapor vindo da caldeira até a estufa
    const steamPipe=cylinder(.16,30,0xb9c4c0,-3,7.3,15.9,Math.PI/2);g.add(steamPipe);
    addLabel("♨️ Vapor da caldeira",new THREE.Vector3(-12,7.9,15.9),"producao",{cls:"small"});
    tech=makeWorker(0xe78630,0x3a5f8f);tech.position.set(-21,0,3.2);tech.visible=false;g.add(tech);tech.add(box(.08,.4,.08,0xb9c3bf,.3,.85,.05));
    for(const x of [-9,9]){const op=makeWorker(0xf3efe4,0x2f7a52);op.position.set(x,0,-3.2);op.visible=false;op.userData.home=x;g.add(op);operators.push(op);}
    const tipMat=material(0xe7c9a0);
    for(let i=0;i<18;i++){
      const pg=new THREE.Group();pg.position.set(-21+i*2.4,1.85,0);
      for(let j=-2;j<=2;j++){const pencil=cylinder(.08,1.5,RAINBOW[(i+j+2)%RAINBOW.length],0,j*.18,0,Math.PI/2,6);pencil.rotation.y=Math.PI/2;pg.add(pencil);const tip=new THREE.Mesh(new THREE.ConeGeometry(.08,.22,6),tipMat);tip.rotation.set(Math.PI/2,0,0);tip.position.set(0,j*.18,.86);pg.add(tip);}
      pg.userData.offset=i/18;pg.visible=false;g.add(pg);products.push(pg);
    }
    for(let i=0;i<14;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.06),new THREE.MeshBasicMaterial({color:0xffd35a}));p.visible=false;g.add(p);sparks.push({mesh:p,t:Math.random(),vx:0,vy:0,vz:0});}
    emitters.machine=makeEmitter(18,{speed:.3,rise:3,drift:.6,spread:.3,size:.55,opacity:.45},g);
    emitters.drying=makeEmitter(16,{speed:.35,rise:2.6,drift:.5,spread:.5,size:.6,opacity:.4},g);
    // linhas extras (2 a 5), lado a lado com a principal; aparecem quando compradas
    [[-6.4,1],[6.4,2],[-12.8,3],[12.8,4]].forEach(([zz,idx])=>makeExtraLine(g,zz,idx));
    let linesKey="";
    return {tick:tickProducao,sync:(s)=>{const key=`${s.lines||1}|${(s.active||[]).map(o=>`${o.product}:${Math.floor(o.done)}/${o.amount}`).join()}`;if(key===linesKey)return;linesKey=key;
      extraLines.forEach(L=>{const on=L.idx<(s.lines||1);L.group.visible=on;L.lbl.hidden=!on;const o=s.active[L.idx];const txt=o?`🏭 Linha ${L.idx+1} · ${PRODUCTS[o.product]?.name||""}: ${Math.floor(o.done)}/${o.amount}`:`🏭 Linha ${L.idx+1} · sem pedido`;if(L.lbl.el.textContent!==txt){L.lbl.el.textContent=txt;L.lbl.fw=null;}});}};
  }
  function makeExtraLine(g,zz,idx){
    const L=new THREE.Group();L.position.set(0,0,zz);L.visible=false;g.add(L);
    L.add(box(40,.35,2.05,new THREE.MeshStandardMaterial({color:0xffffff,map:beltTexture,roughness:.9}),0,1.05,0));
    L.add(box(40,.22,.16,0x789087,0,1.35,-1));L.add(box(40,.22,.16,0x789087,0,1.35,1));
    for(let x=-19;x<=19;x+=2.5){L.add(box(.16,1.2,.16,0x31483f,x,.45,-.8));L.add(box(.16,1.2,.16,0x31483f,x,.45,.8));}
    const lights=[],fans=[],cols=[0x376d52,0x3d6f80,0x5b6f3a,0x3d5a80,0xa85d3d,0x8a5a2b,0x6c5a8f];
    LINE_X.forEach((x,i)=>{L.add(box(4.35,.38,5.35,0x263b34,x,.34,0));for(const sx of [-1,1])for(const sz of [-1,1])L.add(box(.18,3.6,.18,0x22352f,x+sx*1.75,2.05,sz*2));
      L.add(box(3.35,1.05,4.25,cols[i],x,.95,.05));L.add(box(3,1.6,3.4,cols[i],x,2.2,.1));L.add(box(3.4,.18,.15,0xe1ad2f,x,3.05,-1.9));
      const l=cylinder(.16,.52,material(colors.off,{emissive:new THREE.Color(colors.off)}),x+1.5,4.12,-1.7);L.add(l);lights.push(l);
      const f=cylinder(.42,.16,0xb5c4bd,x-1.48,2.75,2.13,Math.PI/2);L.add(f);fans.push(f);});
    const pens=[];for(let i=0;i<14;i++){const p=makePencil(0xe8b838,.9,.07);p.rotation.z=Math.PI/2;p.position.set(0,1.35,(i%2-.5)*.4);p.visible=false;L.add(p);pens.push(p);}
    const lbl=addLabel(`🏭 Linha ${idx+1}`,new THREE.Vector3(-19,4.6,zz),"producao",{cls:"small"});lbl.hidden=true;
    extraLines.push({group:L,lights,fans,pens,lbl,idx});
  }
  function paintProducts(productKey){
    let c=PRODUCT_COLORS[productKey];if(c===undefined&&typeof PRODUCTS!=="undefined"&&PRODUCTS[productKey])c=PRODUCTS[productKey].color;
    products.forEach((g,i)=>{let j=0;g.children.forEach(ch=>{if(ch.geometry.type==="CylinderGeometry"){ch.material.color.setHex(c==null?RAINBOW[(i+j)%RAINBOW.length]:c);j++;}});});
  }
  function tickProducao(dt,t,s,x){
    const steam=!!s.boiler?.on&&!s.boiler.broken;
    for(const m of Object.values(machines)){if(!m.group)continue;const lk=LEVEL_SPEED[m.level]||1;
      if(m.status==="on"&&x.running){m.fan.rotation.y+=dt*7*lk;
        if(m.type===0)m.parts.blades.forEach(b=>b.rotation.y+=dt*9*lk);
        if(m.type===1)m.parts.rollers.forEach((r,i)=>r.rotation.y+=dt*(i?5:-5)*lk);
        if(m.type===2)m.parts.drum.rotation.y+=dt*4*lk;
        if(m.type===3){const w=t*2.2*lk+m.phase;m.parts.shoulder.rotation.z=-.5+Math.sin(w)*.28;m.parts.elbow.rotation.z=.75+Math.sin(w+1)*.32;m.parts.claw.position.y=2.95+Math.sin(w)*.18;m.parts.scanner.material.emissiveIntensity=.45+Math.max(0,Math.sin(t*6))*.8;}
        if(m.type===4){m.parts.plate.position.y=2.4-Math.max(0,Math.sin(t*2.6*lk+m.phase))*.5;m.parts.glue.rotation.y+=dt*5*lk;}
        if(m.type===5)m.parts.cutters.forEach((c,i)=>c.rotation.y+=dt*(14+i*3)*lk);
        if(m.type===6)m.parts.heat.material.emissiveIntensity=(steam?1.4:.35)+Math.sin(t*7)*.15;
      }else if(m.type===6)m.parts.heat.material.emissiveIntensity=0;
      if(m.status==="broken")m.light.material.emissiveIntensity=.5+Math.sin(t*9)*1.2;
      if(m.status==="repair")m.light.material.emissiveIntensity=.6+Math.abs(Math.sin(t*5))*1.4;
      if(m.pulse>0){m.pulse-=dt;const sc=1+Math.sin(m.pulse*Math.PI/1.2*3)*.06*m.pulse;m.group.scale.set(sc,sc,sc);}else m.group.scale.set(1,1,1);
    }
    const dry=machines.secagem;runEmitter(emitters.drying,dt,x.running&&steam&&dry?.status==="on",dry?dry.group.position.x:0,4.1,.4,0xf4f6f5,1);
    products.forEach((p,i)=>{p.visible=x.production;if(x.production){p.userData.offset=(p.userData.offset+dt*.03*s.speed*x.rateK)%1;p.position.x=-21+p.userData.offset*42;p.rotation.y=Math.sin(t+i)*.035;}});
    if(x.production)beltTexture.offset.x-=dt*.6*s.speed*x.rateK;
    const brokenId=Object.keys(s.stations).find(id=>s.stations[id].broken&&!(s.stations[id].repair>0));const bm=brokenId&&machines[brokenId];
    runEmitter(emitters.machine,dt,!!bm,bm?bm.group.position.x:0,3.4,0,0x555c59,1);
    const repairId=Object.keys(s.stations).find(id=>s.stations[id].repair>0);
    sparks.forEach(sp=>{if(!repairId||!x.running||!machines[repairId]){sp.mesh.visible=false;return;}const m=machines[repairId];sp.t+=dt*1.6;if(sp.t>1){sp.t=0;sp.mesh.position.set(m.group.position.x-.2,1.6,1.9);sp.vx=(Math.random()-.5)*2.2;sp.vy=1+Math.random()*1.8;sp.vz=Math.random()*1.4;}sp.mesh.visible=true;sp.mesh.position.x+=sp.vx*dt;sp.mesh.position.y+=sp.vy*dt;sp.mesh.position.z+=sp.vz*dt;sp.vy-=5*dt;});
    if(tech.visible){const target=Object.keys(s.stations).find(id=>s.stations[id].repair>0&&s.stations[id].byTech&&machines[id])||Object.keys(s.stations).find(id=>s.stations[id].broken&&machines[id]);
      const tx=target?machines[target].group.position.x-.2:-21,tz=3.2;const arrived=walk(tech,tx,tz,x.running?dt:0,t);if(arrived&&target){tech.rotation.y=Math.PI;tech.children.at(-1).rotation.z=Math.sin(t*12)*.6;}}
    operators.forEach((op,i)=>{if(!op.visible)return;const tx=op.userData.home+(x.production?Math.sin(t*.4+i*2)*3:0);walk(op,tx,-3.2,x.running?dt*.6:0,t);if(Math.abs(op.position.x-tx)<.1)op.rotation.y=0;});
    machines.dockDoor.position.y=1.7+(celebration>0?Math.min(2.6,(2.5-celebration)*3):0);
    extraLines.forEach(L=>{if(!L.group.visible)return;const on=x.production&&!!s.active[L.idx];L.lights.forEach(l=>{const c=on?colors.green:colors.off;l.material.color.setHex(c);l.material.emissive.setHex(c);l.material.emissiveIntensity=on?1.6:.1;});L.fans.forEach(f=>f.rotation.y+=dt*(on?7:.5));L.pens.forEach((p,i)=>{p.visible=on;if(on)p.position.x=-19+((t*.06*x.speedK*x.rateK+i/14)%1)*38;});});
    if(t-lastBoard>.5){lastBoard=t;drawBoard(s);}
  }

  /* =====================================================================
     INTERIORES DOS OUTROS SETORES
     ===================================================================== */
  function buildMadeira(g){
    roomShell(g,22,14,6.5,{wall:0xcbb08c,trim:0x5c3f26,floor:0xc4b79c});
    const logs=[];
    for(const rx of [-7,0,7]){
      for(const px of [-2.6,2.6])for(const pz of [4,6])g.add(box(.2,4,.2,0xe1ad2f,rx+px,2,pz));
      for(const y of [.9,2.2,3.5]){g.add(box(5.6,.12,2.3,0x5c3f26,rx,y,5));for(let i=0;i<5;i++){const log=cylinder(.26,5.2,colors.wood,rx,y+.32,4.1+i*.45,Math.PI/2,10);g.add(log);logs.push(log);}}
    }
    addLabel("🪵 Estoque de madeira",new THREE.Vector3(0,5.2,5),"madeira",{cls:"small"});
    // serra de fita
    const saw=new THREE.Group();saw.position.set(-4,0,-1.2);g.add(saw);
    saw.add(box(3,1,2,0x376d52,0,.5,0));saw.add(box(3.6,.15,2.4,0x899b94,0,1.08,0));saw.add(box(.5,3.6,.6,0x2f5a45,-1.3,2.8,0));saw.add(box(1.4,.5,.6,0x2f5a45,-.7,4.4,0));
    const wheels=[];for(const y of [4.4,1.9]){const wh=cylinder(.75,.18,0xcbd2cf,-.7,y,.35,0,24);wh.rotation.x=Math.PI/2;saw.add(wh);wheels.push(wh);}
    saw.add(box(.04,2.6,.04,0xe8eef0,0,3.1,.35));
    const cutLog=cylinder(.32,3,colors.wood,.2,1.45,0,Math.PI/2,10);saw.add(cutLog);
    addLabel("Serra de fita",new THREE.Vector3(-4,5.4,-1.2),"madeira",{cls:"small"});
    // esteira de tábuas
    g.add(box(10,.3,1.3,0x263a35,4.5,1,-1.2));const planks=[];for(let i=0;i<5;i++){const p=box(1.3,.12,.55,0xd8a868,0,1.22,-1.2);g.add(p);planks.push(p);}
    const fl=makeForklift();fl.position.set(-8,0,-5);g.add(fl);
    const dust=makeEmitter(12,{speed:.6,rise:1.5,drift:.8,spread:.4,size:.35,opacity:.5},g);
    const people=[addPacer(g,[-9,-3.4],[2,-3.4]),addPacer(g,[3,2.3],[9,2.3])];
    return {
      sync:(s)=>syncCount(logs,s.stock.wood/capOf(s)),
      tick:(dt,t,s,x)=>{
        if(x.production){wheels.forEach(w=>w.rotation.y+=dt*14);planks.forEach((p,i)=>{p.position.x=-.3+((t*.25*x.speedK+i/5)%1)*9.6;p.visible=true;});}else planks.forEach(p=>p.visible=false);
        runEmitter(dust,dt,x.production,-3.8,1.4,-.9,0xd9b98a,1);
        shuttle(fl,dt,x.k,[-8,-5],[8,-5]);people.forEach(p=>tickPacer(p,dt,t,x.k));
      }
    };
  }
  function buildTintas(g){
    roomShell(g,18,12,6,{wall:0xd9d4c9,trim:0x2f77b5});
    // um tanque para cada cor: os das cores ainda não descobertas ficam escondidos
    const tanks=[];colorList().forEach(([id,col],i)=>{const row=Math.floor(i/7),k=i%7,x=-6.9+k*2.3,z=1.4+row*1.8,c=hexToNum(col.hex);
      const t=new THREE.Group();t.position.set(x,0,z);t.visible=false;g.add(t);
      t.add(cylinder(.7,2.6,material(c,{metalness:.35,roughness:.4}),0,1.5,0,0,20));t.add(cylinder(.74,.2,0x9aa2a3,0,2.85,0,0,20));t.add(cylinder(.3,.25,0x9aa2a3,0,3.05,0,0,12));
      for(const sx of [-.5,.5])t.add(box(.14,.3,.14,0x4d5558,sx,.15,.4));
      t.add(box(.16,2.2,.05,0x1f2826,0,1.5,.72));const fill=box(.1,2.2,.06,material(c,{emissive:new THREE.Color(c),emissiveIntensity:.35}),0,1.5,.73);t.add(fill);
      const label=addLabel(col.name,new THREE.Vector3(x,3.5,z),"tintas",{cls:"small"});label.hidden=true;tanks.push({id,t,fill,label});});
    for(const z of [1.4,3.2,5]){const pipe=cylinder(.08,16,0xb9c4c0,0,3.3,z,Math.PI/2);g.add(pipe);}
    const vat=new THREE.Group();vat.position.set(4,0,-2.4);g.add(vat);
    vat.add(cylinder(1.2,1.4,material(0xc9ced0,{metalness:.5,roughness:.3}),0,.7,0,0,24));vat.add(cylinder(1.05,.05,0x6c5a8f,0,1.38,0,0,24));
    for(const s of [-1,1])vat.add(box(.15,3,.15,0x3c4a45,s*1.3,1.5,0));vat.add(box(2.8,.2,.3,0x3c4a45,0,3,0));vat.add(box(.6,.5,.5,0x2f77b5,0,3.3,0));
    const paddle=new THREE.Group();paddle.position.set(0,1.4,0);paddle.add(cylinder(.05,2.6,0x9aa2a3,0,.9,0));for(let b=0;b<2;b++){const bl=box(1.5,.35,.06,0x9aa2a3,0,-.2,0);bl.rotation.y=b*Math.PI/2;paddle.add(bl);}vat.add(paddle);
    addLabel("Misturador",new THREE.Vector3(4,4,-2.4),"tintas",{cls:"small"});
    const barrels=[];const bc=[0x2f77b5,0xd64c46,0xe5be3e,0x3e9d63,0x7a54a5];
    for(let i=0;i<12;i++){const b=cylinder(.32,.85,bc[i%5],-6.5+(i%4)*.75,.45+Math.floor(i/4)*0,-3.5+Math.floor(i/4)*.75,0,14);g.add(b);barrels.push(b);}
    const people=[addPacer(g,[-7,-.6],[6.5,-.6]),addPacer(g,[-2,-4.6],[1.5,-4.6])];
    return {
      sync:(s)=>{const un=s.lab?.unlocked||[],f=clamp01(s.stock.paint/capOf(s));
        tanks.forEach((tk,i)=>{const on=un.includes(tk.id);tk.t.visible=on;tk.label.hidden=!on;const h=Math.max(.04,f*(1-(i%7)*.05));tk.fill.scale.y=h;tk.fill.position.y=.4+h*1.1;});syncCount(barrels,f);},
      tick:(dt,t,s,x)=>{if(x.running)paddle.rotation.y+=dt*(x.production?5:1.5);people.forEach(p=>tickPacer(p,dt,t,x.k));}
    };
  }
  function buildEstoque(g){
    roomShell(g,22,14,7,{wall:0xcfc3a3,trim:0x7a6120});
    const crates=[],boxes=[];
    const rack=(z,fill,list,color,stripe)=>{
      for(let x=-9;x<=7;x+=2){g.add(box(.12,4.4,.12,0xe78630,x,2.2,z-.65));g.add(box(.12,4.4,.12,0xe78630,x,2.2,z+.65));}
      for(const y of [.2,1.6,3]){g.add(box(16.2,.1,.1,0x2f77b5,-1,y,z-.65));g.add(box(16.2,.1,.1,0x2f77b5,-1,y,z+.65));
        for(let x=-8;x<=6;x+=2){const p=box(1.5,.1,1.2,0xb68a55,x,y+.1,z);g.add(p);const c=box(1.3,.9,1.1,color,x,y+.6,z);if(stripe)c.add(box(1.32,.1,.5,stripe,0,.2,0));g.add(c);if(list)list.push(c);else c.visible=Math.random()<fill;}}
    };
    rack(4.8,.8,boxes,0xc69258,0x2f7a52);rack(0,1,crates,0x3a3f3e,null);rack(-4.8,.6,null,0xc9b27a,0xd64c46);
    addLabel("⚫ Grafite",new THREE.Vector3(-1,4.9,0),"estoque",{cls:"small"});addLabel("✏️ Lápis prontos",new THREE.Vector3(-1,4.9,4.8),"estoque",{cls:"small"});
    const fl=makeForklift();g.add(fl);const fl2=makeForklift();g.add(fl2);fl2.userData.cycle=.5;
    const people=[addPacer(g,[9,-5],[9,5])];
    return {
      sync:(s)=>{syncCount(crates,s.stock.graphite/capOf(s));syncCount(boxes,.35+.65*Math.min(1,(s.stats?.produced||0)/3000));},
      tick:(dt,t,s,x)=>{shuttle(fl,dt,x.k,[-8,2.4],[7,2.4]);shuttle(fl2,dt,x.k*.8,[7,-2.4],[-8,-2.4]);people.forEach(p=>tickPacer(p,dt,t,x.k));}
    };
  }
  function buildAcabamento(g){
    roomShell(g,24,12,6,{wall:0x9fb4c0,trim:0x2c4a5e});
    const belt=stripes(false,"#3b534b","#1c2b26",16);belt.repeat.set(22,1);
    g.add(box(22,.3,1.6,new THREE.MeshStandardMaterial({color:0xffffff,map:belt,roughness:.9}),0,.95,0));for(let x=-10;x<=10;x+=2.5)for(const s of [-1,1])g.add(box(.14,.9,.14,0x31483f,x,.45,s*.65));
    const sharp=new THREE.Group();sharp.position.set(-7,0,0);g.add(sharp);sharp.add(box(2.2,1.3,2.4,0x3d6f80,0,1.9,-.2));const discs=[];for(const z of [-.5,.5]){const d=cylinder(.45,.1,0xcbd2cf,0,1.9,z,Math.PI/2,20);sharp.add(d);discs.push(d);}
    addLabel("Apontadeira",new THREE.Vector3(-7,3.3,0),"acabamento",{cls:"small"});
    const press=new THREE.Group();press.position.set(-1,0,0);g.add(press);for(const s of [-1,1])press.add(box(.25,3.4,.25,0x2c4a5e,s*1,1.7,0));press.add(box(2.4,.3,.6,0x2c4a5e,0,3.4,0));const head=box(1.2,.5,.9,0xe8b838,0,2.2,0);press.add(head);
    addLabel("Gravação da marca",new THREE.Vector3(-1,4.1,0),"acabamento",{cls:"small"});
    const robot=new THREE.Group();robot.position.set(5,0,-1.6);g.add(robot);robot.add(cylinder(.5,.6,0x315f4d,0,.3,0));const turret=new THREE.Group();turret.position.y=.6;robot.add(turret);
    const arm=new THREE.Group();arm.position.y=.3;arm.add(box(.3,1.6,.3,0xe0a52e,0,.8,0));turret.add(arm);const fore=new THREE.Group();fore.position.set(0,1.6,0);fore.add(box(1.6,.26,.26,0xe0a52e,.8,0,0));arm.add(fore);
    addLabel("Robô de embalagem",new THREE.Vector3(5,3.4,-1.6),"acabamento",{cls:"small"});
    const items=[];for(let i=0;i<9;i++){const b=box(.6,.35,.5,0xc69258,0,1.3,0);b.add(box(.62,.05,.2,0x2f7a52,0,.1,0));g.add(b);items.push(b);}
    const stack=[];for(let i=0;i<12;i++){const b=box(.8,.5,.7,0xc69258,9.5+(i%3)*.85,.3+Math.floor(i/6)*.52,-3.5+Math.floor(i/3)%2*.75);g.add(b);stack.push(b);}
    const people=[addPacer(g,[-10,-2.6],[8,-2.6]),addPacer(g,[-6,2.6],[3,2.6]),addPacer(g,[4,2.6],[9,2.6])];
    return {
      sync:(s)=>syncCount(stack,.3+.7*((s.active?.[0]?.done||0)/(s.active?.[0]?.amount||1))),
      tick:(dt,t,s,x)=>{
        if(x.production){discs.forEach(d=>d.rotation.x+=dt*18);head.position.y=2.2-Math.max(0,Math.sin(t*4*x.speedK))*.9;turret.rotation.y=Math.sin(t*1.6*x.speedK)*1.2;fore.rotation.z=Math.sin(t*1.6*x.speedK+1)*.3;belt.offset.x-=dt*.8*x.speedK;
          items.forEach((b,i)=>{b.visible=true;b.position.x=-10+((t*.12*x.speedK+i/9)%1)*20;});}else items.forEach(b=>b.visible=false);
        people.forEach(p=>tickPacer(p,dt,t,x.k));
      }
    };
  }
  function buildDocas(g,docks,label){
    roomShell(g,24,14,7,{wall:label==="expedicao"?0xe0ddd4:0xe3d9c2,trim:label==="expedicao"?0xe78630:0xc9772f});
    const doors=[],xs=docks===3?[-6,0,6]:[-4,4];
    g.add(box(24.6,.3,7,0x50565a,0,-.15,11));
    for(const x of xs){g.add(box(3.2,3.4,.2,0x2c3b4a,x,1.7,6.9));const d=box(2.8,3,.14,new THREE.MeshStandardMaterial({color:0xe78630,map:doorTex,roughness:.7}),x,1.6,6.8);g.add(d);doors.push(d);
      const tr=makeTruck(0xf1ede2,0x2c4a5e);tr.rotation.y=-Math.PI/2;tr.position.set(x,0,10.4);tr.scale.setScalar(.95);g.add(tr);g.add(box(3,.1,1,0xe1ad2f,x,.06,5.6));}
    const pallets=[];for(let i=0;i<14;i++){const px=-8+(i%7)*2.4,pz=-1.2-Math.floor(i/7)*1.8;const p=box(1.4,.14,1.2,0xb68a55,px,.07,pz);g.add(p);const c=box(1.2,.8+((i*7)%3)*.25,1,0xc69258,0,.5,0);c.add(box(1.22,.08,.4,0x2f7a52,0,.1,0));p.add(c);pallets.push(p);}
    g.add(box(18,.3,1.2,0x263a35,0,.9,-5.5));
    const fl=makeForklift();g.add(fl);const fl2=makeForklift();g.add(fl2);fl2.userData.cycle=.4;
    const people=[addPacer(g,[-10,3],[10,3]),addPacer(g,[-9,-4],[8,-4])];
    let doorIdx=0;
    return {
      sync:(s)=>syncCount(pallets,.25+Math.min(.75,(s.active?.length||0)*.35)),
      tick:(dt,t,s,x)=>{
        const u=fl.userData,c=((u.cycle||0)%1);if(c<.02&&!u.flip){doorIdx=(doorIdx+1)%xs.length;u.flip=true;}if(c>.1)u.flip=false;
        doors.forEach((d,i)=>{const open=celebration>0||i===doorIdx;d.position.y+= ((open?4.2:1.6)-d.position.y)*Math.min(1,dt*2);});
        shuttle(fl,dt,x.k,[xs[doorIdx],-1],[xs[doorIdx],5]);shuttle(fl2,dt,x.k*.8,[-9,-3.6],[9,-3.6]);people.forEach(p=>tickPacer(p,dt,t,x.k));
      }
    };
  }
  /* ---------- telas dos computadores (mudam sozinhas) ---------- */
  const SCREEN_APPS=["planilha","grafico","texto","email","codigo","painel"];
  function makeScreen(){
    const cv=document.createElement("canvas");cv.width=192;cv.height=112;
    const tex=new THREE.CanvasTexture(cv);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=4;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.82,.48),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));
    return {cv,tex,mesh,step:0,next:Math.random(),data:[]};
  }
  function drawScreen(sc,off){
    const g=sc.cv.getContext("2d"),W=192,H=112,r=Math.random;
    if(off){g.fillStyle="#050807";g.fillRect(0,0,W,H);sc.tex.needsUpdate=true;return;}
    sc.step++;
    const bar=(title,color)=>{g.fillStyle=color;g.fillRect(0,0,W,14);g.fillStyle="#fff";g.font="bold 9px Segoe UI, Arial";g.fillText(title,6,10);g.fillStyle="#ffffff88";for(let i=0;i<3;i++)g.fillRect(W-10-i*9,4,6,6);};
    switch(sc.app){
      case "planilha":{
        g.fillStyle="#fff";g.fillRect(0,0,W,H);bar("Planilha — Custos.xlsx","#1f7a45");
        g.strokeStyle="#d6dcd8";g.lineWidth=1;for(let x=0;x<=W;x+=32){g.beginPath();g.moveTo(x+.5,14);g.lineTo(x+.5,H);g.stroke();}for(let y=14;y<=H;y+=11){g.beginPath();g.moveTo(0,y+.5);g.lineTo(W,y+.5);g.stroke();}
        const rows=Math.min(8,1+(sc.step%12));g.fillStyle="#3b4a41";
        for(let row=0;row<rows;row++)for(let c=0;c<6;c++){const w=6+((row*7+c*13+sc.seed)%20);g.fillRect(c*32+4,17+row*11,w,5);}
        const cr=(rows-1),cc=sc.step%6;g.strokeStyle="#1f7a45";g.lineWidth=2;g.strokeRect(cc*32+1,15+cr*11,31,11);break;}
      case "grafico":{
        g.fillStyle="#f6f8fb";g.fillRect(0,0,W,H);bar("Vendas por dia","#2f77b5");
        if(!sc.data.length)for(let i=0;i<10;i++)sc.data.push(.2+r()*.7);sc.data.shift();sc.data.push(Math.max(.1,Math.min(.95,sc.data.at(-1)+(r()-.4)*.3)));
        sc.data.forEach((v,i)=>{g.fillStyle=i===sc.data.length-1?"#e88d32":"#4b82c4";const h=v*80;g.fillRect(10+i*17,H-8-h,12,h);});
        g.strokeStyle="#1f7a45";g.lineWidth=2;g.beginPath();sc.data.forEach((v,i)=>{const x=16+i*17,y=H-8-v*80-4;i?g.lineTo(x,y):g.moveTo(x,y);});g.stroke();break;}
      case "texto":{
        g.fillStyle="#fff";g.fillRect(0,0,W,H);bar("Relatório.docx","#2c4a5e");
        const total=sc.step%40,lines=Math.floor(total/5);g.fillStyle="#9aa3a6";
        for(let l=0;l<lines&&l<8;l++)g.fillRect(10,22+l*11,[160,150,168,120,158,140,165,100][l],4);
        const cur=Math.min(1,(total%5)/5),ly=Math.min(lines,7);const w=[160,150,168,120,158,140,165,100][ly]*cur;g.fillRect(10,22+ly*11,w,4);
        if(sc.step%2){g.fillStyle="#143c2b";g.fillRect(11+w,20+ly*11,1.5,8);}break;}
      case "email":{
        g.fillStyle="#fff";g.fillRect(0,0,W,H);bar("E-mail — Caixa de entrada","#6c5a8f");
        if(!sc.data.length||r()<.25){sc.data.unshift({w:40+r()*50,new:true});sc.data.length=Math.min(sc.data.length,7);}
        g.fillStyle="#f1eff6";g.fillRect(0,14,70,H);
        sc.data.forEach((m,i)=>{g.fillStyle=i===0?"#dcd4ec":"#f1eff6";g.fillRect(0,14+i*14,70,14);g.fillStyle=m.new&&i<2?"#6c5a8f":"#9aa3a6";g.fillRect(5,18+i*14,m.w*.6,3);g.fillStyle="#c9c3d6";g.fillRect(5,24+i*14,50,2);});
        g.fillStyle="#3b4a41";g.fillRect(78,22,90,5);g.fillStyle="#b7bdbf";for(let l=0;l<6;l++)g.fillRect(78,34+l*9,[100,95,108,80,104,60][l],3);break;}
      case "codigo":{
        g.fillStyle="#0f1a17";g.fillRect(0,0,W,H);bar("sistema-producao.js","#243a33");
        if(!sc.data.length)for(let i=0;i<9;i++)sc.data.push({x:6+(i%3)*8,w:30+r()*90,c:["#56dd88","#efc64d","#8fb3ff","#e4eee7"][i%4]});
        sc.data.shift();sc.data.push({x:6+Math.floor(r()*3)*8,w:30+r()*100,c:["#56dd88","#efc64d","#8fb3ff","#e4eee7","#ff8a7a"][Math.floor(r()*5)]});
        sc.data.forEach((l,i)=>{g.fillStyle="#3f5a50";g.fillRect(2,20+i*10,2,4);g.fillStyle=l.c;g.fillRect(l.x+4,20+i*10,l.w,4);});
        if(sc.step%2){g.fillStyle="#56dd88";g.fillRect(sc.data.at(-1).x+sc.data.at(-1).w+6,18+8*10,4,8);}break;}
      default:{
        g.fillStyle="#0f2a1d";g.fillRect(0,0,W,H);bar("Painel da produção","#1f7a45");
        const v=(Math.sin(sc.step*.4+sc.seed)+1)/2;g.lineWidth=12;g.strokeStyle="#264d3a";g.beginPath();g.arc(48,64,30,0,Math.PI*2);g.stroke();
        g.strokeStyle="#56dd88";g.beginPath();g.arc(48,64,30,-Math.PI/2,-Math.PI/2+Math.PI*2*(.35+v*.6));g.stroke();
        g.fillStyle="#fff";g.font="bold 13px Segoe UI, Arial";g.textAlign="center";g.fillText(`${Math.round(35+v*60)}%`,48,69);g.textAlign="left";
        for(let i=0;i<4;i++){const k=(Math.sin(sc.step*.3+i*1.7+sc.seed)+1)/2;g.fillStyle="#264d3a";g.fillRect(96,30+i*18,86,8);g.fillStyle=["#56dd88","#efc64d","#8fb3ff","#e88d32"][i];g.fillRect(96,30+i*18,20+k*66,8);}
      }
    }
    sc.tex.needsUpdate=true;
  }

  let ceoState={name:"",photo:null},applyCeo=null;
  function setCeo(c){ceoState={...c};applyCeo?.(ceoState);}
  function buildAdmin(g){
    const W=34,D=22;roomShell(g,W,D,5,{wall:0xdfe4e3,trim:0x1d3444,floor:0x9aa3a6});
    const glassW=material(0xcfe6ef,{transparent:true,opacity:.28,roughness:.08,metalness:.1,side:THREE.DoubleSide});
    const seg=(x1,z1,x2,z2,col=0x1d3444)=>{const len=Math.hypot(x2-x1,z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,alongX=Math.abs(x2-x1)>Math.abs(z2-z1);
      const lw=alongX?len:.12,ld=alongX?.12:len;g.add(box(lw,.9,ld,col,cx,.45,cz));const gl=new THREE.Mesh(new THREE.BoxGeometry(alongX?len:.05,1.7,alongX?.05:len),glassW);gl.position.set(cx,1.75,cz);g.add(gl);g.add(box(alongX?len:.1,.1,alongX?.1:len,0x3a3f3e,cx,2.62,cz));};
    const wallWithDoors=(axis,fixed,from,to,doors,col)=>{let a=from;for(const d of [...doors].sort((p,q)=>p-q)){if(d-.9>a)axis==="x"?seg(a,fixed,d-.9,fixed,col):seg(fixed,a,fixed,d-.9,col);a=d+.9;}if(to>a)axis==="x"?seg(a,fixed,to,fixed,col):seg(fixed,a,fixed,to,col);};
    // paredes de vidro separando as salas
    wallWithDoors("x",3,-17,17,[-11.5,-.5,11],0x1d3444);wallWithDoors("x",-2,-17,17,[-11,-2.2,8,10.2],0x1d3444);
    seg(-6,3,-6,11);seg(5,3,5,11);seg(-9,-11,-9,-2);seg(-1,-11,-1,-2);seg(9,-11,9,-2);
    const rooms=[["👑 Sala do CEO",-11.5,7,11,8,0x6e4a2a],["💰 Financeiro",-.5,7,11,8,0x3a5f8f],["📣 Marketing",11,7,12,8,0xc9824a],["🧑‍🤝‍🧑 RH",-13,-6.5,8,9,0x3e9d63],["📑 DP",-5,-6.5,8,9,0x8a7a5a],["🗂️ PCP",4,-6.5,10,9,0x2f5d4a],["🤝 Reunião",13,-6.5,8,9,0x5a6f8a]];
    for(const [name,x,z,w,d,col] of rooms){const c=box(w-.3,.02,d-.3,col,x,.02,z);c.castShadow=false;g.add(c);addLabel(`<b>${name}</b>`,new THREE.Vector3(x,3,z),"admin",{cls:"small dept"});}
    addLabel("🛎️ Recepção",new THREE.Vector3(14,2.4,.5),"admin",{cls:"small"});
    const screens=[],seated=[];
    const desk=(x,z,app,worker=true,wood=0xc9a47a)=>{g.add(box(2,.08,1,wood,x,.78,z));for(const sx of [-.9,.9])g.add(box(.06,.75,.9,0x4d5558,x+sx,.38,z));
      g.add(box(.85,.52,.05,0x1d2624,x,1.2,z+.33));const sc=makeScreen();sc.app=app;sc.seed=Math.round(x*3+z);sc.mesh.rotation.y=Math.PI;sc.mesh.position.set(x,1.2,z+.3);sc.mesh.scale.setScalar(.95);g.add(sc.mesh);drawScreen(sc,false);screens.push(sc);
      g.add(box(.1,.3,.1,0x2c3b4a,x,.95,z+.38));g.add(box(.5,.04,.2,0x2c3b4a,x,.82,z-.05));g.add(box(.55,.08,.55,0x2c3b4a,x,.5,z-.85));g.add(box(.55,.6,.08,0x2c3b4a,x,.85,z-1.12));
      if(worker){const w=randomWorker(.95);w.position.set(x,-.2,z-.8);w.userData.legs.forEach(l=>l.visible=false);g.add(w);seated.push(w);sc.worker=w;}else sc.worker={visible:true};return sc;};
    const board=(x,y,z,w,h,rotY=Math.PI,frame=0x1d2624)=>{const tex=canvasTex(512,Math.round(512*h/w),()=>{},false);const fr=box(rotY===Math.PI||rotY===0?w+.2:.1,h+.2,rotY===Math.PI||rotY===0?.1:w+.2,frame,x,y,z);g.add(fr);
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));pl.rotation.y=rotY;const off=rotY===Math.PI?-.06:rotY===0?.06:rotY===Math.PI/2?.06:-.06;
      if(rotY===Math.PI||rotY===0)pl.position.set(x,y,z+off);else pl.position.set(x+off,y,z);g.add(pl);return tex;};
    const plant=(x,z)=>{g.add(cylinder(.3,.6,0xb0603f,x,.3,z,0,12));const bush=shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(.6,1),treeMats[0]));bush.position.set(x,1.1,z);g.add(bush);};

    // ===== SALA DO CEO =====
    g.add(box(4,.12,1.8,0x4a2e1a,-11.5,.82,7.4));g.add(box(3.8,.7,.1,0x5c3a22,-11.5,.42,6.55));for(const sx of [-1.8,1.8])g.add(box(.12,.76,1.7,0x5c3a22,-11.5+sx,.4,7.4));
    g.add(box(.9,.1,.9,0x1d1d1d,-11.5,.55,8.6));g.add(box(.9,1.5,.14,0x1d1d1d,-11.5,1.15,9.05));
    const ceoFig=makeWorker(0x2c3b4a,0x1d2624);ceoFig.children.at(-1).visible=false;ceoFig.add(box(.08,.4,.04,0xc8473b,0,.9,.16));ceoFig.position.set(-11.5,-.2,8.5);ceoFig.rotation.y=Math.PI;ceoFig.userData.legs.forEach(l=>l.visible=false);g.add(ceoFig);
    const ceoLaptop=makeScreen();ceoLaptop.app="painel";ceoLaptop.mesh.scale.setScalar(.55);ceoLaptop.mesh.position.set(-12.3,1.12,7.2);ceoLaptop.mesh.rotation.set(-.2,0,0);g.add(ceoLaptop.mesh);ceoLaptop.worker={visible:true};screens.push(ceoLaptop);
    const plateTex=canvasTex(256,64,()=>{},false);const plate=new THREE.Mesh(new THREE.PlaneGeometry(1,.25),new THREE.MeshBasicMaterial({map:plateTex,toneMapped:false}));plate.position.set(-11.5,.98,6.62);plate.rotation.x=-.3;g.add(plate);
    for(const gx of [-12.5,-10.5]){g.add(box(.6,.08,.6,0x8b2530,gx,.5,5.9));g.add(box(.6,.6,.08,0x8b2530,gx,.8,5.62));}
    // quadro com a foto do CEO
    g.add(box(2.3,2.9,.12,0x6e4a2a,-11.5,3.1,10.86));g.add(box(2.05,2.65,.13,0xc9a47a,-11.5,3.1,10.85));
    const photoTex=canvasTex(360,450,()=>{},false);const photo=new THREE.Mesh(new THREE.PlaneGeometry(1.8,2.3),new THREE.MeshBasicMaterial({map:photoTex,toneMapped:false}));photo.rotation.y=Math.PI;photo.position.set(-11.5,3.1,10.77);g.add(photo);
    addLabel("🖼️ Quadro do CEO",new THREE.Vector3(-11.5,4.75,10.4),"admin",{cls:"small"});
    for(let r=0;r<3;r++){g.add(box(.5,.06,5,0x5c3a22,-16.6,.9+r*1,7));for(let i=0;i<9;i++)g.add(box(.35,.5+(i%3)*.08,.18,[0x8b2530,0x2f5d4a,0x2e79bd,0xe8b838,0x5c3a22][(i+r)%5],-16.6,1.18+r*1+(i%3)*.04,4.8+i*.5));}
    g.add(box(1,.8,2.6,0x2c3b4a,-15.9,.4,4.5));g.add(box(.3,.9,2.6,0x2c3b4a,-16.3,.95,4.5));g.add(box(.9,.35,.9,0x2c3b4a,-15.7,.75,3.5));
    g.add(box(2.6,.05,.4,0x5c3a22,-8.2,2.3,10.7));const trophies=[];for(let i=0;i<16;i++){const tr=new THREE.Group();tr.add(cylinder(.07,.1,0x5c3a22,0,.05,0,0,8));tr.add(cylinder(.03,.12,0xe8b838,0,.16,0,0,6));const cup=new THREE.Mesh(new THREE.CylinderGeometry(.1,.05,.16,10),material(0xe8b838,{metalness:.8,roughness:.25}));cup.position.y=.3;tr.add(cup);
      tr.position.set(-9.3+(i%8)*.3,2.33+Math.floor(i/8)*.55,10.7);g.add(tr);trophies.push(tr);}g.add(box(2.6,.05,.4,0x5c3a22,-8.2,2.85,10.7));
    addLabel("🏆 Troféus",new THREE.Vector3(-8.2,3.6,10.5),"admin",{cls:"small"});
    plant(-7,4);g.add(box(3.4,.02,2.4,0x8b2530,-11.5,.04,5.8));
    // ===== FINANCEIRO =====
    desk(-3.5,5.2,"planilha");desk(.5,5.2,"grafico");desk(3.2,8,"planilha");
    const safe=box(1.2,1.4,1,0x2c3b4a,-4.8,.7,9.8);g.add(safe);const dial=cylinder(.18,.06,0xcbd2cf,-4.8,.9,9.28,0,16);dial.rotation.x=Math.PI/2;g.add(dial);g.add(box(.08,.4,.06,0xcbd2cf,-4.4,.9,9.28));
    addLabel("🔐 Cofre",new THREE.Vector3(-4.8,2,9.8),"admin",{cls:"small"});
    for(let i=0;i<3;i++)g.add(box(.9,1.3,.7,0x9aa3a6,1.8+i*1,.65,10.4));
    const finTex=board(-.5,3.3,10.83,4.6,2.2);
    // ===== MARKETING =====
    const ideaTex=board(9,3.1,10.83,4.2,2.1,Math.PI,0xf3efe4);
    const campTex=board(14.2,3.1,10.83,3.2,1.9);
    desk(8,5.5,"texto");desk(12.5,5.5,"email");desk(14.5,8.3,"grafico");
    for(const [bx,bz,c] of [[6.2,9.4,0xe8b838],[7.4,9.9,0xd4483f],[6.4,8.2,0x2e79bd]]){const bb=new THREE.Mesh(new THREE.SphereGeometry(.55,14,10),material(c,{roughness:.9}));bb.scale.y=.55;bb.position.set(bx,.3,bz);g.add(shadowed(bb));}
    const mega=new THREE.Mesh(new THREE.ConeGeometry(.22,.6,14,1,true),material(0xe8b838,{side:THREE.DoubleSide}));mega.rotation.z=Math.PI/2;mega.position.set(12.5,1.05,5.1);g.add(mega);
    // ===== RH =====
    desk(-15,-8,"email");desk(-11,-8,"texto");
    g.add(cylinder(.8,.06,0xf3efe4,-13,.8,-4.2,0,18));g.add(cylinder(.08,.78,0x3a3f3e,-13,.4,-4.2,0,8));for(const cx of [-13.9,-12.1])g.add(box(.5,.5,.5,0x2c3b4a,cx,.25,-4.2));
    const candFig=makeWorker(0x2c3b4a,0x6c5a8f,.92);candFig.children.at(-1).visible=false;candFig.position.set(-12.1,-.1,-4.2);candFig.rotation.y=-Math.PI/2;candFig.userData.legs.forEach(l=>l.visible=false);g.add(candFig);
    const vagasTex=board(-16.8,2.9,-6.5,3.6,2.2,Math.PI/2);
    plant(-16,-10.2);
    // ===== DP =====
    desk(-7,-8,"planilha");desk(-3,-8,"planilha");
    for(let i=0;i<4;i++)g.add(box(.8,1.4,.6,0x9aa3a6,-8.4+i*.9,.7,-10.5));
    g.add(box(.8,1,.3,0x2c3b4a,-8,1.6,-2.3));g.add(box(.5,.3,.05,screenMat,-8,1.8,-2.47));addLabel("⏰ Relógio de ponto",new THREE.Vector3(-8,2.5,-2.3),"admin",{cls:"small"});
    const folhaTex=board(-5,2,-2.25,3.2,1.7,Math.PI,0x2c3b4a);
    // ===== PCP =====
    const pcpTex=board(3.8,2.2,-2.25,5.8,2.2,Math.PI,0x1d2624);addLabel("📋 Quadro de planejamento",new THREE.Vector3(4,3.8,-2.4),"admin",{cls:"small"});
    desk(1.5,-8.5,"painel");desk(5.5,-8.5,"codigo");
    g.add(box(2.4,.08,1.2,0xdfe4e3,4,.8,-5.6));for(let i=0;i<5;i++)g.add(box(.3,.3,.3,[0x376d52,0x3d6f80,0x5b6f3a,0xa85d3d,0x6c5a8f][i],2.9+i*.55,1,-5.6));g.add(box(2.6,.04,.25,0x263a35,4,.86,-5.6));
    // ===== REUNIÃO =====
    g.add(box(4.2,.1,1.8,0xc9a47a,13,.8,-6.8));for(const [cx,cz] of [[10.3,-6.8],[15.7,-6.8],[12.2,-5.4],[13.8,-5.4],[12.2,-8.2],[13.8,-8.2]]){g.add(box(.5,.5,.5,0x2c3b4a,cx,.25,cz));const bk=cx<11?[-.26,0]:cx>15?[.26,0]:[0,cz>-6.8?.26:-.26];g.add(box(bk[0]?.08:.5,.55,bk[0]?.5:.08,0x2c3b4a,cx+bk[0],.75,cz+bk[1]));}
    const reuTex=board(13,2,-2.25,3.4,1.9,Math.PI,0x1d2624);const reuMeshes=g.children.slice(-2);
    const meetTex=canvasTex(1024,576,()=>{},false);
    const bigScreen=new THREE.Group();bigScreen.visible=false;g.add(bigScreen);
    bigScreen.add(box(6.4,3.8,.1,0x1d2624,13,2.55,-2.36));const bigPl=new THREE.Mesh(new THREE.PlaneGeometry(6.1,3.43),new THREE.MeshBasicMaterial({map:meetTex,toneMapped:false}));bigPl.rotation.y=Math.PI;bigPl.position.set(13,2.55,-2.43);bigScreen.add(bigPl);
    const beam=new THREE.Mesh(new THREE.ConeGeometry(1.8,4.4,4,1,true),new THREE.MeshBasicMaterial({color:0xfff6d0,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false}));beam.rotation.x=-Math.PI/2+.08;beam.position.set(13,3.7,-4.7);beam.rotation.y=Math.PI/4;bigScreen.add(beam);
    // lugares da reunião (cadeiras em volta da mesa) e caminho pelo corredor
    const SEATS=[{x:10.3,z:-6.8,r:Math.PI/2},{x:12.2,z:-8.2,r:0},{x:13.8,z:-8.2,r:0},{x:12.2,z:-5.4,r:Math.PI},{x:13.8,z:-5.4,r:Math.PI},{x:15.7,z:-6.8,r:-Math.PI/2}];
    const exitPath=(h)=>{if(h.z>3){const dx=h.x<-6?-11.5:h.x<5?-.5:11;return[{x:h.x,z:h.z-1.1},{x:dx,z:3.8},{x:dx,z:1.3}];}
      if(h.x>9)return[];const dx=h.x<-9?-11:h.x<-1?-2.2:8;return[{x:h.x,z:h.z+1.1},{x:dx,z:-2.9},{x:dx,z:-.7}];};
    const toMeeting=[{x:10.2,z:-.7},{x:10.2,z:-3.3}];
    const meet={active:false,people:[]};
    // ===== RECEPÇÃO e painel ao vivo =====
    g.add(box(1,1.1,3.2,0xf3efe4,14.5,.55,.5));g.add(box(1.1,.06,3.3,0x1d3444,14.5,1.13,.5));const recep=makeWorker(0x2c3b4a,0x3a5f8f);recep.children.at(-1).visible=false;recep.position.set(15.5,0,.5);recep.rotation.y=-Math.PI/2;g.add(recep);
    const liveTex=canvasTex(512,220,()=>{},false);const totem=new THREE.Group();totem.position.set(-8,0,2.4);g.add(totem);totem.add(box(.2,1.3,.2,0x4d5558,0,.65,0));totem.add(box(3.2,1.5,.12,0x1d2624,0,2,0));
    const livePl=new THREE.Mesh(new THREE.PlaneGeometry(3,1.3),new THREE.MeshBasicMaterial({map:liveTex,toneMapped:false}));livePl.rotation.y=Math.PI;livePl.position.set(0,2,-.07);totem.add(livePl);
    plant(10,2.3);plant(-16,2.3);
    const people=[addPacer(g,[-15,-.2],[12,-.2]),addPacer(g,[-10,1.2],[8,1.2])];
    const boss=addPacer(g,[-8,-1.2],[11,-1.2],makeWorker(0x2c3b4a,0x1d2624));boss.children.at(-1).visible=false;boss.add(box(.08,.4,.04,0xc8473b,0,.9,.16));boss.visible=false;
    const bossTag=addLabel("👔 Gerente",new THREE.Vector3(0,2.2,-.4),"admin",{cls:"small"});bossTag.hidden=true;

    // ---------- desenhos dos quadros ----------
    const wrapText=(x,text,px,py,maxW,lh)=>{const words=String(text).split(" ");let l="",y=py;for(const w of words){if(x.measureText(l+w).width>maxW&&l){x.fillText(l,px,y);y+=lh;l="";}l+=w+" ";}x.fillText(l,px,y);return y;};
    const drawPhoto=(c)=>{const img=photoTex.image,x=img.getContext("2d");x.fillStyle="#efe7d6";x.fillRect(0,0,360,450);
      if(c.photo){const im=new Image();im.onload=()=>{const k=Math.max(360/im.width,450/im.height),w=im.width*k,h=im.height*k;x.drawImage(im,(360-w)/2,(450-h)/2,w,h);photoTex.needsUpdate=true;};im.src=c.photo;}
      else{x.fillStyle="#c9bfa9";x.beginPath();x.arc(180,170,75,0,Math.PI*2);x.fill();x.beginPath();x.ellipse(180,400,130,120,0,Math.PI,0);x.fill();x.fillStyle="#7a6f5a";x.font="700 26px Segoe UI, Arial";x.textAlign="center";x.fillText("Coloque sua foto",180,300);x.font="500 20px Segoe UI, Arial";x.fillText("aba Diretoria",180,330);}
      photoTex.needsUpdate=true;
      const pt=plateTex.image.getContext("2d");pt.fillStyle="#e8b838";pt.fillRect(0,0,256,64);pt.fillStyle="#2c1a0e";pt.font="800 26px Segoe UI, Arial";pt.textAlign="center";pt.fillText(`CEO · ${c.name||"Presidente"}`,128,42,240);plateTex.needsUpdate=true;};
    applyCeo=drawPhoto;drawPhoto(ceoState);
    const fmt=v=>`R$ ${Math.round(v).toLocaleString("pt-BR")}`;
    const drawBoards=(s,info)=>{
      let x=finTex.image.getContext("2d");x.fillStyle="#0f2a1d";x.fillRect(0,0,512,245);x.fillStyle="#56dd88";x.font="800 22px Segoe UI, Arial";x.fillText("FLUXO DE CAIXA",18,32);x.fillStyle="#fff";x.font="800 30px Segoe UI, Arial";x.fillText(fmt(info.money),18,70);
      const hist=info.history.length?info.history:[{income:0,expenses:0,day:s.day}];const mx=Math.max(1,...hist.map(h=>Math.max(h.income,h.expenses)));hist.forEach((h,i)=>{const bx=240+i*38;x.fillStyle="#43a66f";x.fillRect(bx,225-h.income/mx*170,14,h.income/mx*170);x.fillStyle="#e88d32";x.fillRect(bx+15,225-h.expenses/mx*170,14,h.expenses/mx*170);});
      x.fillStyle="#9fbfad";x.font="600 16px Segoe UI, Arial";x.fillText("receita × despesa por dia",18,110);x.fillText(`folha: ${fmt(info.wages)}/dia`,18,140);finTex.needsUpdate=true;
      x=ideaTex.image.getContext("2d");x.fillStyle="#fbfbf7";x.fillRect(0,0,512,256);x.fillStyle="#2c3b4a";x.font="800 24px Segoe UI, Arial";x.fillText("IDEIAS DE CAMPANHA",16,32);
      [["Volta às aulas!","#ffe066"],["Lápis de cor em promoção","#ffadad"],["Vídeo da fábrica","#a0e7a0"],["Parceria com escolas","#9fd3ff"],["Kit desenho 2B","#ffd6a5"],[info.campaign?"CAMPANHA NO AR!":"Próxima campanha?","#caffbf"]].forEach(([t,c],i)=>{const px=16+(i%3)*165,py=50+Math.floor(i/3)*100;x.fillStyle=c;x.fillRect(px,py,150,86);x.fillStyle="#2c3b4a";x.font="700 17px Segoe UI, Arial";wrapText(x,t,px+8,py+26,134,22);});ideaTex.needsUpdate=true;
      x=campTex.image.getContext("2d");x.fillStyle=info.campaign?"#c8473b":"#1d2624";x.fillRect(0,0,512,304);x.fillStyle="#fff";x.textAlign="center";x.font="900 40px Segoe UI, Arial";x.fillText(info.campaign?"📣 NO AR":"📣 MARKETING",256,110);x.font="700 26px Segoe UI, Arial";x.fillText(info.campaign?"Campanha nas redes":"Sem campanha agora",256,170);x.fillText(`Estoque da loja: ${info.shopStock}`,256,220);x.textAlign="left";campTex.needsUpdate=true;
      x=vagasTex.image.getContext("2d");x.fillStyle="#fffdf7";x.fillRect(0,0,512,313);x.fillStyle="#3e9d63";x.fillRect(0,0,512,56);x.fillStyle="#fff";x.font="900 30px Segoe UI, Arial";x.fillText("VAGAS ABERTAS",18,38);x.fillStyle="#15251d";x.font="600 22px Segoe UI, Arial";(info.openRoles.length?info.openRoles:["Nenhuma vaga no momento"]).slice(0,7).forEach((r,i)=>x.fillText(`• ${r}`,22,92+i*32));vagasTex.needsUpdate=true;
      x=folhaTex.image.getContext("2d");x.fillStyle="#fffdf7";x.fillRect(0,0,512,272);x.fillStyle="#8a7a5a";x.fillRect(0,0,512,50);x.fillStyle="#fff";x.font="900 26px Segoe UI, Arial";x.fillText("FOLHA DE PAGAMENTO",16,34);x.fillStyle="#15251d";x.font="700 22px Segoe UI, Arial";x.fillText(`Total: ${fmt(info.wages)}/dia${info.benefits?" (com benefícios)":""}`,16,86);x.font="500 19px Segoe UI, Arial";(info.staff.length?info.staff:["Só a equipe fixa"]).slice(0,6).forEach((r,i)=>x.fillText(`• ${r}`,20,120+i*26));folhaTex.needsUpdate=true;
      x=pcpTex.image.getContext("2d");x.fillStyle="#f4f6f3";x.fillRect(0,0,512,192);const cols=[["A FAZER","#e88d32"],["PRODUZINDO","#43a66f"],["ENTREGUES","#4b82c4"]];cols.forEach(([t,c],i)=>{x.fillStyle=c;x.fillRect(8+i*168,6,160,24);x.fillStyle="#fff";x.font="800 14px Segoe UI, Arial";x.fillText(t,16+i*168,23);});
      x.font="600 12px Segoe UI, Arial";info.orders.forEach((o,i)=>{const col=i===0?1:0;const py=38+(col===1?0:(i-1))*52;x.fillStyle="#fff";x.fillRect(12+col*168,py,152,46);x.fillStyle="#15251d";x.fillText(o.name.slice(0,22),18+col*168,py+16);x.fillText(`${o.done}/${o.amount} · ${o.left}`,18+col*168,py+32);x.fillStyle="#43a66f";x.fillRect(18+col*168,py+37,140*o.done/o.amount,4);});
      if(info.offers){x.fillStyle="#fff3e0";x.fillRect(12,150,152,34);x.fillStyle="#7a4617";x.fillText(`${info.offers} oferta(s) no quadro`,18,171);}
      x.fillStyle="#fff";x.fillRect(348,38,152,46);x.fillStyle="#15251d";x.font="800 22px Segoe UI, Arial";x.fillText(String(info.delivered),360,70);x.font="600 12px Segoe UI, Arial";x.fillText("pedidos entregues",400,68);if(info.pcp){x.fillStyle="#43a66f";x.font="800 13px Segoe UI, Arial";x.fillText("PLANO OTIMIZADO +10%",348,110);}pcpTex.needsUpdate=true;
      if(!meet.active){x=reuTex.image.getContext("2d");x.fillStyle="#143c2b";x.fillRect(0,0,512,286);x.fillStyle="#efc64d";x.font="800 26px Segoe UI, Arial";x.fillText(`REUNIÃO — DIA ${info.day}`,20,44);x.fillStyle="#fff";x.font="600 22px Segoe UI, Arial";[`Caixa: ${fmt(info.money)}`,`Reputação: ${Math.round(info.reputation)}%`,`Moral: ${Math.round(info.morale)}`,`Metas: ${info.goals}`].forEach((l,i)=>x.fillText(l,24,96+i*42));reuTex.needsUpdate=true;}
      x=liveTex.getContext?null:liveTex.image.getContext("2d");x.fillStyle="#0f2a1d";x.fillRect(0,0,512,220);x.fillStyle="#56dd88";x.font="700 22px Segoe UI";x.fillText(`${(info.brand||"").toUpperCase().slice(0,26)} — DIA ${s.day}`,24,40);x.fillStyle="#fff";x.font="800 44px Segoe UI";x.fillText(fmt(s.money),24,98);
      x.font="600 22px Segoe UI";x.fillStyle="#cfe3d6";x.fillText(`Reputação ${Math.round(s.reputation)}%   ·   ${Math.floor(s.stats.produced).toLocaleString("pt-BR")} lápis`,24,142);x.fillText(`Pedidos em produção: ${s.active.length}   ·   Moral ${Math.round(s.morale)}`,24,178);liveTex.needsUpdate=true;
      trophies.forEach((t,i)=>t.visible=i<info.goals);
      if(s.blackout>0)[finTex,campTex,pcpTex,reuTex,liveTex].forEach(tx=>{const c=tx.image.getContext("2d");c.fillStyle="#000";c.fillRect(0,0,tx.image.width,tx.image.height);tx.needsUpdate=true;});};
    let lastDraw=-9;
    return {
      sync:(s)=>{
        const want=!!s.meeting;
        if(want&&!meet.active){meet.active=true;bigScreen.visible=true;reuMeshes.forEach(m=>m.visible=false);
          const crew=[{w:ceoFig,home:{x:-11.5,y:-.2,z:8.5,r:Math.PI}},...seated.filter(w=>w.visible).slice(0,5).map(w=>({w,home:{x:w.position.x,y:-.2,z:w.position.z,r:0}}))];
          meet.people=crew.map((c,i)=>{const seat=SEATS[i];c.w.userData.busy=true;c.w.userData.legs.forEach(l=>l.visible=true);c.w.position.y=0;
            c.path=[...exitPath(c.home),...toMeeting,...(seat.z<-7?[{x:10.2,z:-8.2}]:[]),{x:seat.x,z:seat.z}];c.seat=seat;c.state="going";c.delay=i*.35;return c;});}
        if(!want&&meet.active){meet.active=false;bigScreen.visible=false;reuMeshes.forEach(m=>m.visible=true);
          meet.people.forEach(c=>{c.w.userData.legs.forEach(l=>l.visible=true);c.w.position.y=0;c.path=[...(c.seat.z<-7?[{x:10.2,z:-8.2}]:[]),...toMeeting.slice().reverse(),...exitPath(c.home).reverse(),{x:c.home.x,z:c.home.z}];c.state="returning";c.delay=Math.random()*.6;});}
        const n=Math.min(seated.length,6+Object.values(s.staff).reduce((a,b)=>a+b,0)*2);seated.forEach((w,i)=>w.visible=i<n);boss.visible=s.staff.manager>0;bossTag.hidden=!boss.visible;candFig.visible=!!(s.recruits&&s.recruits.day===s.day&&s.recruits.candidates.length);},
      tick:(dt,t,s,x)=>{if(t-lastDraw>2){lastDraw=t;const info=window.getAdminInfo?.();if(info)drawBoards(s,info);}
        screens.forEach(sc=>{const off=x.blackout||!sc.worker.visible;sc.next-=dt;if(sc.next>0&&!(off&&!sc.wasOff))return;sc.wasOff=off;sc.next=off?1:.35+Math.random()*.6;if(!off&&Math.random()<.02){sc.app=SCREEN_APPS[Math.floor(Math.random()*SCREEN_APPS.length)];sc.data=[];}drawScreen(sc,off);});
        seated.forEach((w,i)=>{if(!w.visible||w.userData.busy)return;w.rotation.y=Math.sin(t*.6+i)*.15;w.position.y=-.2+(x.blackout?0:Math.abs(Math.sin(t*11+i*1.3))*.018);});
        if(!ceoFig.userData.busy)ceoFig.rotation.y=Math.PI+Math.sin(t*.4)*.2;
        // pessoas indo e voltando da sala de reunião
        for(const c of meet.people){
          if(c.state==="seated"||c.state==="home")continue;
          if(c.delay>0){c.delay-=dt;continue;}
          const tg=c.path[0];
          if(!tg||walk(c.w,tg.x,tg.z,dt,t,3.3)){if(tg)c.path.shift();
            if(!c.path.length){c.w.userData.legs.forEach(l=>l.visible=false);c.w.position.y=-.2;
              if(c.state==="going"){c.state="seated";c.w.rotation.y=c.seat.r;}else{c.state="home";c.w.rotation.y=c.home.r;c.w.userData.busy=false;}}}
        }
        if(meet.people.length&&meet.people.every(c=>c.state==="home"))meet.people=[];
        if(meet.active){meet.people.forEach((c,i)=>{if(c.state==="seated")c.w.rotation.y=c.seat.r+Math.sin(t*.8+i)*.12;});
          if(!meet.lastFrame||t-meet.lastFrame>.08){meet.lastFrame=t;const ctx=meetTex.image.getContext("2d");window.drawMeetingFrame?.(ctx,1024,576);meetTex.needsUpdate=true;}}
        people.forEach(p=>tickPacer(p,dt,t,x.k||.5));tickPacer(boss,dt,t,x.k||.5);bossTag.pos.set(boss.position.x,2.2,boss.position.z);}
    };
  }
  function buildOficinas(g){
    roomShell(g,16,12,5,{wall:0xb9bdb6,trim:0x4d5558});
    for(const x of [-5,0,5]){g.add(box(3.5,.1,1.2,0x8b6b45,x,.95,4.9));for(const sx of [-1,1])g.add(box(.08,.9,1.1,0x4d5558,x+sx*1.6,.45,4.9));
      g.add(box(3.4,1.6,.05,0xa8865a,x,2.4,5.95));for(let i=0;i<6;i++)g.add(box(.12,.5+Math.random()*.4,.05,[0xd64c46,0x2f77b5,0x4d5558,0xe8b838][i%4],x-1.3+i*.5,2.4,5.9));
      g.add(box(.6,.4,.5,0x6c7478,x-.8,1.2,4.8));}
    const lathe=new THREE.Group();lathe.position.set(-3.5,0,-2);g.add(lathe);lathe.add(box(3,.9,.9,0x3d6f80,0,.45,0));lathe.add(box(3,.15,.7,0x9aa2a3,0,1,0));lathe.add(box(.7,.8,.8,0x3d6f80,-1.2,1.35,0));
    const chuck=cylinder(.3,.3,0xcbd2cf,-.7,1.35,0,Math.PI/2,12);lathe.add(chuck);lathe.add(cylinder(.08,1.4,0xb9c3bf,.1,1.35,0,Math.PI/2,8));
    addLabel("Torno",new THREE.Vector3(-3.5,2.3,-2),"oficinas",{cls:"small"});
    for(let y of [.3,1.2,2.1]){g.add(box(.9,.08,4,0x4d5558,-7.3,y,-1));for(let i=0;i<5;i++)g.add(box(.5,.35,.5,[0x8d989c,0xe8b838,0x3a3f3e][i%3],-7.3,y+.22,-2.6+i*.8));}
    const gear=cylinder(.5,.3,0x8d989c,0,1.2,4.8,Math.PI/2,12);g.add(gear);
    const weld=[];for(let i=0;i<10;i++){const p=new THREE.Mesh(new THREE.BoxGeometry(.05,.05,.05),new THREE.MeshBasicMaterial({color:0xffd35a}));p.visible=false;g.add(p);weld.push({m:p,t:Math.random()});}
    const mech=addPacer(g,[-2,3.6],[3,3.6],makeWorker(0xe78630,0x3a5f8f));const techW=makeWorker(0xe78630,0x3a5f8f);techW.position.set(0,0,3.8);techW.rotation.y=Math.PI;g.add(techW);
    return {
      sync:(s)=>{techW.visible=s.staff.tech>0;},
      tick:(dt,t,s,x)=>{if(x.running)chuck.rotation.y+=dt*16;
        const repairing=Object.values(s.stations).some(st=>st.repair>0)||x.running;
        weld.forEach(w=>{if(!repairing){w.m.visible=false;return;}w.t+=dt*1.8;if(w.t>1){w.t=0;w.m.position.set(0,1.35,4.6);w.vx=(Math.random()-.5)*2;w.vy=1+Math.random()*1.5;w.vz=-Math.random();}w.m.visible=true;w.m.position.x+=w.vx*dt;w.m.position.y+=w.vy*dt;w.m.position.z+=w.vz*dt;w.vy-=5*dt;});
        tickPacer(mech,dt,t,x.k);}
    };
  }



  /* =====================================================================
     NOVOS SETORES: cada interior começa como canteiro de obras
     ===================================================================== */
  function screenTex(w,h){return canvasTex(w,h,()=>{},false);}
  function wallScreen(g,tex,x,y,z,w,h){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));m.position.set(x,y,z-.03);m.rotation.y=Math.PI;g.add(m);g.add(box(w+.2,h+.2,.06,0x1d2624,x,y,z+.02));return m;}
  function seated(g,x,z,rot,scale=.95,w=randomWorker(scale)){w.position.set(x,-.28,z);w.rotation.y=rot;g.add(w);return w;}
  function facView(id,dims,shell,fill){
    return g=>{
      const [w,d,h]=dims;roomShell(g,w,d,h,shell);
      const built=new THREE.Group(),obra=new THREE.Group();g.add(built);g.add(obra);
      const l0=labels.length;const api=fill(built,dims)||{};const mine=labels.slice(l0);
      const pad=box(w*.8,.05,d*.7,0x9a8f7a,0,.03,0);pad.castShadow=false;obra.add(pad);
      for(const [x,z] of [[-w/4,-d/5],[w/4,-d/5],[-w/4,d/5],[w/4,d/5]])obra.add(box(.25,h*.8,.25,0x8b9496,x,h*.4,z));
      for(const z of [-d/5,d/5])obra.add(box(w/2+.3,.2,.2,0x8b9496,0,h*.8,z));
      for(let i=0;i<6;i++){const c=new THREE.Mesh(new THREE.ConeGeometry(.22,.6,10),material(0xe78630));c.position.set(-w/3+i*w/7.5,.3,d/2.6);obra.add(c);}
      const sand=new THREE.Mesh(new THREE.ConeGeometry(1.4,1.2,14),material(0xc9b48a));sand.position.set(w/3,.6,-d/4);obra.add(sand);
      for(let i=0;i<3;i++)obra.add(box(1.4,.35,.7,0xb5452f,-w/3,.18+i*.36,-d/4));
      const obraL=addLabel("🚧 Em obras · construa pelo quadro da cena",new THREE.Vector3(0,2.6,0),id,{cls:"small"});
      let was=null;
      return {
        sync:(s)=>{const b=!!s.facilities?.[id];if(b!==was){was=b;built.visible=b;obra.visible=!b;mine.forEach(L=>L.hidden=!b);obraL.hidden=b;}if(b)api.sync?.(s);},
        tick:(dt,t,s,x)=>{if(was)api.tick?.(dt,t,s,x);}
      };
    };
  }
  const buildQualidade=facView("qualidade",[16,11,4.5],{wall:0xe8eef2,trim:0x2f7a52},(b)=>{
    for(const z of [-2.5,1.5]){b.add(box(10,.9,1.2,0xdfe4e3,-1,.45,z));b.add(box(10.2,.06,1.3,0x2c3b4a,-1,.92,z));}
    const plungers=[];
    for(let i=0;i<3;i++){const fr=new THREE.Group();fr.position.set(-4.5+i*3.5,.95,-2.5);b.add(fr);
      for(const sx of [-.4,.4])fr.add(box(.08,1.3,.08,0x4d5558,sx,.65,0));fr.add(box(.95,.1,.2,0x4d5558,0,1.3,0));
      const pl=box(.12,.5,.12,0xd4483f,0,1,0);fr.add(pl);const pen=makePencil(0xe8b838,.7,.05);pen.rotation.z=Math.PI/2;pen.position.set(0,.1,0);fr.add(pen);plungers.push(pl);}
    for(let i=0;i<3;i++){const x=-5+i*3.2;b.add(cylinder(.18,.08,0x2c3b4a,x,.98,1.5));b.add(box(.08,.5,.08,0x2c3b4a,x,1.25,1.4));b.add(cylinder(.07,.35,0xdfe4e3,x,1.35,1.55,.6));}
    b.add(box(1.2,.8,.9,0x3e9d63,6,.4,-2.5));b.add(box(1.2,.8,.9,0xd4483f,6,.4,1.5));
    addLabel("✅ Aprovados",new THREE.Vector3(6,1.5,-2.5),"qualidade",{cls:"small"});addLabel("❌ Reprovados",new THREE.Vector3(6,1.5,1.5),"qualidade",{cls:"small"});
    addLabel("Teste de quebra da ponta",new THREE.Vector3(-1,2.8,-2.5),"qualidade",{cls:"small"});
    const tex=screenTex(512,256);wallScreen(b,tex,0,3,5.5,4,2);let key="";
    const draw=(s)=>{const pct=Math.min(99.6,96+s.reputation/40).toFixed(1),k=pct+"|"+s.stats.ordersDone;if(k===key)return;key=k;const c=tex.image.getContext("2d");
      c.fillStyle="#0c1a24";c.fillRect(0,0,512,256);c.fillStyle="#7fd6c8";c.font="700 22px system-ui";c.fillText("CONTROLE DE QUALIDADE",20,40);
      c.fillStyle="#fff";c.font="800 64px system-ui";c.fillText(pct+"%",20,125);c.font="600 20px system-ui";c.fillStyle="#9fb3bf";c.fillText("dos lotes aprovados",20,160);c.fillText(`${s.stats.ordersDone} pedidos inspecionados`,20,205);tex.needsUpdate=true;};
    const people=[addPacer(b,[-6,-.6],[4,-.6],makeWorker(0xf3efe4,0xf6f6f2)),addPacer(b,[-6,3.3],[4,3.3],makeWorker(0xf3efe4,0xf6f6f2))];
    return {sync:draw,tick:(dt,t,s,x)=>{plungers.forEach((p,i)=>p.position.y=1-Math.max(0,Math.sin(t*2+i*2))*.35);people.forEach(p=>tickPacer(p,dt,t,x.k||.6));}};
  });
  const buildMina=facView("mina",[18,12,6],{wall:0x5a6066,trim:0xe8b838,floor:0x9aa0a0},(b)=>{
    const drum=new THREE.Group();drum.position.set(-5,1.7,-2.2);b.add(drum);const dm=cylinder(1.2,3,0x6d7478,0,0,0,Math.PI/2,20);drum.add(dm);
    for(let i=0;i<4;i++){const r=box(3.05,.12,.12,0x2d3a36,0,Math.cos(i*Math.PI/2)*1.18,Math.sin(i*Math.PI/2)*1.18);drum.add(r);}
    for(const sx of [-1.6,1.6])b.add(box(.3,1.7,1.6,0x3a3f44,-5+sx,.85,-2.2));
    addLabel("Misturador: grafite + argila",new THREE.Vector3(-5,3.6,-2.2),"mina",{cls:"small"});
    b.add(box(2,1.4,1.4,0x8b9496,0,.9,-2.2));b.add(cylinder(.25,.8,0x4d5558,1.2,1,-2.2,Math.PI/2));
    b.add(box(6,.2,.8,colors.belt,4.4,.7,-2.2));for(const x of [1.8,7])b.add(box(.1,.6,.7,0x4d5558,x,.35,-2.2));
    const rods=[];for(let i=0;i<9;i++){const r=cylinder(.05,.9,0x1b211e,0,.86,-2.2,Math.PI/2,8);b.add(r);rods.push(r);}
    addLabel("Extrusora de minas",new THREE.Vector3(1.5,2.6,-2.2),"mina",{cls:"small"});
    b.add(box(3.4,2.8,2.4,0x8d5a45,4.5,1.4,3));const door=new THREE.Mesh(new THREE.PlaneGeometry(1.6,1.2),new THREE.MeshBasicMaterial({color:0xff7a2a}));door.position.set(4.5,1.2,1.78);door.rotation.y=Math.PI;b.add(door);
    b.add(cylinder(.3,2.5,0x3a3f44,5.6,4,3.4));addLabel("Forno · 1000 °C",new THREE.Vector3(4.5,3.6,3),"mina",{cls:"small"});
    for(let i=0;i<6;i++)b.add(box(.8,.5,.55,i%2?0xc9b48a:0x2d3a36,-7.5+(i%3)*.9,.25+Math.floor(i/3)*.5,3.5));
    addLabel("Sacos de grafite e argila",new THREE.Vector3(-6.6,1.8,3.5),"mina",{cls:"small"});
    const people=[addPacer(b,[-7,.8],[5,.8]),addPacer(b,[-2,3.8],[2,3.8])];
    return {tick:(dt,t,s,x)=>{const on=x.running;drum.rotation.x+=dt*(on?2.2:.2);
      rods.forEach((r,i)=>{r.visible=on;r.position.x=1.9+((t*.35+i/9)%1)*5;});
      door.material.color.setHex(on?(Math.sin(t*3)>0?0xff7a2a:0xff9a3a):0x5a2a1a);people.forEach(p=>tickPacer(p,dt,t,x.k||.6));}};
  });
  const buildViveiro=facView("viveiro",[20,14,5],{wall:0xcfe8d6,trim:0x2f7a52,floor:0x7a5a3c},(b)=>{
    const plants=[];
    for(let r=0;r<5;r++)for(let i=0;i<10;i++){const x=-7.2+i*1.6,z=-4.6+r*2.1;b.add(box(1.3,.25,1.4,0x5c3f26,x,.12,z));
      const p=new THREE.Group();p.position.set(x,.25,z);p.add(cylinder(.05,.6,0x6b4a30,0,.3,0,0,6));const cr=new THREE.Mesh(new THREE.ConeGeometry(.35,.9,8),treeMats[(r+i)%3]);cr.position.y=.9;p.add(cr);b.add(p);plants.push(p);}
    const status=addLabel("🌱 Mudas crescendo",new THREE.Vector3(0,3.4,0),"viveiro",{cls:"small"});
    for(let x=-8;x<=8;x+=4)b.add(cylinder(.04,17,0x9aa2a3,x,4.2,0,Math.PI/2));
    const people=[addPacer(b,[-8,-3.5],[8,-3.5],makeWorker(0x3e9d63,0x6b8f3a)),addPacer(b,[-8,1],[8,1],makeWorker(0xe8b838,0x6b8f3a))];
    let key="";
    return {sync:(s)=>{const days=s.day-(s.facilities.viveiro?.day||s.day),g=Math.max(.35,Math.min(1,.35+days/3*.65)),k=g.toFixed(2);if(k===key)return;key=k;
        plants.forEach((p,i)=>p.scale.setScalar(g*(.85+(i%4)*.06)));status.el.textContent=g>=1?"🌳 Mudas crescidas: madeira mais barata":`🌱 Mudas crescendo · ${Math.round(g*100)}%`;status.fw=null;},
      tick:(dt,t,s,x)=>{plants.forEach((p,i)=>p.rotation.z=Math.sin(t*1.3+i)*.03);people.forEach(p=>tickPacer(p,dt,t,x.k||.6));}};
  });
  const buildReciclagem=facView("reciclagem",[16,11,5],{wall:0xb9cfa9,trim:0x2f5d4a},(b)=>{
    const pile=new THREE.Mesh(new THREE.ConeGeometry(2,1.6,16),material(0xd9b98a,{roughness:1}));pile.position.set(-5,.8,-2);b.add(pile);addLabel("Serragem",new THREE.Vector3(-5,2.4,-2),"reciclagem",{cls:"small"});
    const fr=new THREE.Group();fr.position.set(-.5,0,-2);b.add(fr);for(const sx of [-.9,.9])fr.add(box(.2,2.6,.9,0x3a3f44,sx,1.3,0));fr.add(box(2,.3,1,0x3a3f44,0,2.6,0));const plate=box(1.5,.3,.8,0xe8b838,0,1.8,0);fr.add(plate);fr.add(box(1.6,.8,.9,0x6d7478,0,.4,0));
    addLabel("Prensa de briquetes",new THREE.Vector3(-.5,3.3,-2),"reciclagem",{cls:"small"});
    b.add(box(5.5,.2,.8,colors.belt,4,.7,-2));const bq=[];for(let i=0;i<7;i++){const c=cylinder(.14,.3,0x8a5a3b,0,.9,-2,Math.PI/2,10);b.add(c);bq.push(c);}
    [0x2e79bd,0xe8b838,0x3e9d63,0xd4483f].forEach((c,i)=>b.add(box(1,1.2,1,c,-5+i*1.5,.6,3.6)));
    for(let i=0;i<9;i++)b.add(cylinder(.14,.3,0x8a5a3b,5.2+(i%3)*.32,.18+Math.floor(i/3)*.3,3.4,Math.PI/2,10));addLabel("Lenha para a caldeira",new THREE.Vector3(5.5,1.6,3.4),"reciclagem",{cls:"small"});
    const people=[addPacer(b,[-6,.8],[6,.8],makeWorker(0xe8b838,0x3e9d63))];
    return {tick:(dt,t,s,x)=>{const on=x.running;plate.position.y=on?1.8-Math.max(0,Math.sin(t*2.2))*.9:1.8;bq.forEach((c,i)=>{c.visible=on;c.position.x=1.4+((t*.3+i/7)%1)*5.2;});people.forEach(p=>tickPacer(p,dt,t,x.k||.6));}};
  });
  const buildSubestacao=facView("subestacao",[16,11,5],{wall:0xd9dcd6,trim:0xe8b838,floor:0xbfc2bd},(b)=>{
    for(const x of [-5,-1.5,2]){b.add(box(1.8,2.2,1.3,0x7f8a8a,x,1.1,-2.4));for(let f=0;f<5;f++)b.add(box(.06,1.8,1.5,0x6d7478,x-.8+f*.4,1.1,-2.4));
      for(const sx of [-.5,0,.5])b.add(cylinder(.1,.6,0xb5452f,x+sx,2.5,-2.4,0,8));}
    addLabel("Transformadores",new THREE.Vector3(-1.5,3.4,-2.4),"subestacao",{cls:"small"});
    const leds=[];for(const x of [-4,-1,2]){b.add(box(2.2,2.2,.8,0x2c3b4a,x,1.1,3.6));for(let r=0;r<4;r++)for(let c=0;c<4;c++){const l=new THREE.Mesh(new THREE.BoxGeometry(.14,.08,.02),new THREE.MeshBasicMaterial({color:0x42bb75}));l.position.set(x-.7+c*.46,.5+r*.45,3.19);b.add(l);leds.push(l);}}
    addLabel("Baterias",new THREE.Vector3(-1,2.8,3.6),"subestacao",{cls:"small"});
    const tex=screenTex(512,256);wallScreen(b,tex,5.5,3,5.5,3.6,1.8);let last=0;
    const people=[addPacer(b,[-6,.8],[6,.8],makeWorker(0xe8b838,0x2e79bd))];
    return {tick:(dt,t,s,x)=>{leds.forEach((l,i)=>l.material.color.setHex(s.blackout>0?(Math.sin(t*8+i)>0?0xe34d45:0x3b1a18):(i+Math.floor(t*2))%7===0?0xf0c040:0x42bb75));
      if(t-last>1){last=t;const on=STATIONS_ON(s),hr=((s.minute/60)%24),sol=Math.max(0,Math.round(Math.sin((hr-6)/12*Math.PI)*100));const c=tex.image.getContext("2d");
        c.fillStyle="#0c1a24";c.fillRect(0,0,512,256);c.fillStyle="#f0c040";c.font="700 24px system-ui";c.fillText("⚡ ENERGIA DA FÁBRICA",20,42);c.fillStyle="#fff";c.font="800 52px system-ui";c.fillText(`${on*12} kW`,20,115);
        c.font="600 22px system-ui";c.fillStyle="#9fd3b0";c.fillText(`☀️ Solar agora: ${sol}%`,20,165);c.fillStyle=s.blackout>0?"#ff7a6a":"#9fb3bf";c.fillText(s.blackout>0?"Rede caiu: usando baterias":"Rede estável",20,210);tex.needsUpdate=true;}
      people.forEach(p=>tickPacer(p,dt,t,x.k||.6));}};
  });
  function STATIONS_ON(s){return Object.values(s.stations).filter(x=>x.on).length;}
  const buildBrigada=facView("brigada",[16,11,5],{wall:0xf1e4e0,trim:0xd4483f},(b)=>{
    const truck=new THREE.Group();truck.position.set(-3,0,-2);b.add(truck);truck.add(box(5,1.8,2,0xd4483f,0,1.2,0));truck.add(box(1.6,1.4,2,0xd4483f,3.1,1,0));truck.add(box(1.5,.7,1.9,0x9cc6d6,3.2,1.4,0));
    truck.add(box(4.4,.12,.5,0xdfe4e3,-.2,2.25,0));for(let i=0;i<6;i++)truck.add(box(.08,.12,.6,0xdfe4e3,-2.2+i*.8,2.33,0));
    for(const x of [-1.6,1.4,3.1])for(const sd of [-1,1])truck.add(wheel(.42,.3,x,.42,sd*1.02));
    const siren=new THREE.Mesh(new THREE.BoxGeometry(.8,.2,.4),new THREE.MeshBasicMaterial({color:0xff3a2a}));siren.position.set(3.1,1.8,0);truck.add(siren);
    addLabel("🚒 Caminhão de bombeiros",new THREE.Vector3(-2.5,3.2,-2),"brigada",{cls:"small"});
    for(let i=0;i<5;i++){b.add(cylinder(.16,.6,0xd4483f,-6.5+i*.5,.9,5.1,0,10));}b.add(box(3,.08,.4,0x4d5558,-5.5,.58,5.1));
    for(const x of [4.2,6.4]){b.add(box(1.1,.5,2.1,0xf6f6f2,x,.5,2.8));b.add(box(1.1,.2,.5,0xbfdcef,x,.85,1.9));}
    b.add(box(.05,2.2,3,0xbfdcef,3.1,1.1,2.8));addLabel("🩺 Enfermaria",new THREE.Vector3(5.3,2.2,2.8),"brigada",{cls:"small"});
    const people=[addPacer(b,[-6,.9],[2,.9],makeWorker(0xe8b838,0x3a3f44)),addPacer(b,[4,-.5],[7,-.5],makeWorker(0xffffff,0xffffff))];
    return {tick:(dt,t,s,x)=>{siren.material.color.setHex(Math.sin(t*6)>0?0xff3a2a:0x3a7bff);people.forEach(p=>tickPacer(p,dt,t,x.k||.6));}};
  });
  const buildPortaria=facView("portaria",[10,8,3.5],{wall:0xe9e6dd,trim:0x2f5d4a},(b)=>{
    b.add(box(3.6,.9,1.1,0x8a6a3a,0,.45,0));b.add(box(3.8,.06,1.2,0x2c3b4a,0,.92,0));seated(b,0,-1,0,1,makeWorker(0x1d3444,0x2c4a5e));
    const tex=screenTex(512,288);const scr=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.46),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));scr.position.set(0,1.75,.5);scr.rotation.y=Math.PI;b.add(scr);b.add(box(2.7,1.56,.08,0x1d2624,0,1.75,.56));
    addLabel("Câmeras do complexo",new THREE.Vector3(0,2.8,.5),"portaria",{cls:"small"});
    b.add(box(1.2,1.6,.1,0x5c3f26,-3.5,1.6,3.9));for(let i=0;i<8;i++)b.add(box(.08,.2,.04,0xe8b838,-3.9+(i%4)*.25,1.8-Math.floor(i/4)*.4,3.83));
    for(const x of [2.5,3.5])b.add(box(.12,1,.9,0x9aa2a3,x,.5,-2.5));const arm=box(.9,.06,.06,0xd4483f,3,1,-2.5);b.add(arm);
    let last=0;
    return {tick:(dt,t,s,x)=>{arm.rotation.y=Math.sin(t*.8)*.8;if(t-last>.25){last=t;const c=tex.image.getContext("2d");c.fillStyle="#050b0f";c.fillRect(0,0,512,288);
      for(let i=0;i<6;i++){const cx=(i%3)*170+4,cy=Math.floor(i/3)*144+4;c.fillStyle="#12222b";c.fillRect(cx,cy,164,138);c.fillStyle="#2f4a55";c.fillRect(cx+10,cy+90,144,6);c.fillRect(cx+60,cy+20,6,110);
        for(let k=0;k<3;k++){const px=cx+((t*30+k*50+i*37)%150)+6,py=cy+60+k*18;c.fillStyle=k===1?"#e8b838":"#9fd3b0";c.fillRect(px,py,8,8);}
        c.fillStyle="#9fb3bf";c.font="600 14px system-ui";c.fillText(`CAM ${i+1}`,cx+8,cy+18);}
      c.fillStyle="#ff4a3a";c.beginPath();c.arc(498,14,6,0,7);c.fill();tex.needsUpdate=true;}}};
  });
  const TOPICS=["Manutenção preventiva","Segurança com máquinas","Qualidade e 5S","Operação da caldeira","Primeiros socorros"];
  const buildTreinamento=facView("treinamento",[16,11,4.5],{wall:0xf3e3b5,trim:0x2e79bd},(b)=>{
    const tex=screenTex(512,256);wallScreen(b,tex,0,2.6,5.5,5,2.4);let key="";
    for(let r=0;r<3;r++)for(let i=0;i<4;i++){const x=-4.5+i*3,z=-3.5+r*2.2;b.add(box(1.8,.08,.7,0xb58a5a,x,.76,z+.45));b.add(box(.08,.72,.6,0x5c3f26,x,.38,z+.45));seated(b,x,z,0);}
    const trainer=addPacer(b,[-4,3.8],[4,3.8],makeWorker(0x2e79bd,0x2e79bd));
    const demo=new THREE.Group();demo.position.set(6.2,0,3.4);b.add(demo);demo.add(box(1.4,.9,1,0xdfe4e3,0,.45,0));const fan=box(.8,.05,.12,0x4d5558,0,1.3,0);demo.add(box(.8,.4,.6,0x2e79bd,0,1.1,0));demo.add(fan);
    addLabel("Máquina de treino",new THREE.Vector3(6.2,2,3.4),"treinamento",{cls:"small"});
    return {sync:(s)=>{const top=TOPICS[s.day%TOPICS.length];if(top===key)return;key=top;const c=tex.image.getContext("2d");c.fillStyle="#f7f7f2";c.fillRect(0,0,512,256);c.strokeStyle="#2e79bd";c.lineWidth=8;c.strokeRect(4,4,504,248);
        c.fillStyle="#2e79bd";c.font="800 24px system-ui";c.fillText("TREINAMENTO DE HOJE",24,48);c.fillStyle="#1b2b20";c.font="700 34px system-ui";c.fillText(top,24,110,470);
        c.font="500 20px system-ui";c.fillStyle="#4b5a50";c.fillText("✔ equipe mais rápida na linha",24,165);c.fillText("✔ consertos mais curtos",24,200);tex.needsUpdate=true;},
      tick:(dt,t,s,x)=>{tickPacer(trainer,dt,t,.5);fan.rotation.y+=dt*6;}};
  });
  const buildCreche=facView("creche",[14,10,4],{wall:0xfbe7ef,trim:0xe8b838,floor:0xf3e6c8},(b)=>{
    const mat=[0xe86a9a,0xe8b838,0x2e79bd,0x3e9d63,0x7a54a5,0xe78630];
    for(let i=0;i<12;i++)b.add(box(1.4,.05,1.4,mat[i%6],-4.2+(i%4)*1.45,.04,-3.2+Math.floor(i/4)*1.45));
    for(let i=0;i<10;i++)b.add(box(.35,.35,.35,mat[(i+2)%6],3+(i%4)*.5,.18+Math.floor(i/4)*.35,-3));
    for(let i=0;i<5;i++){const ball=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),material(mat[i]));ball.position.set(-5+i*.8,.22,2.6);b.add(ball);}
    const sl=box(2.4,.12,.8,0xe86a9a,4.5,.7,2.4);sl.rotation.z=.45;b.add(sl);b.add(box(.8,1.4,.8,0x2e79bd,5.7,.7,2.4));
    for(const x of [-1,1.2]){b.add(box(1.2,.45,.8,0xf6f6f2,x,.45,1.4));for(const sd of [-1,1])b.add(box(.35,.25,.35,mat[(x>0?1:3)],x+sd*.4,.25,1.4+.6));}
    const kids=[];for(let i=0;i<7;i++){const k=makeWorker(mat[i%6],mat[(i+3)%6],.5);kids.push(addPacer(b,[-5+(i%4)*2,-3.5+Math.floor(i/4)*3],[-3+(i%4)*2,-2+Math.floor(i/4)*3],k));}
    const carers=[addPacer(b,[-5,0],[5,0],makeWorker(0xe86a9a,0xf6f6f2)),addPacer(b,[-5,3.8],[3,3.8],makeWorker(0xe8b838,0xf6f6f2))];
    const tex=canvasTex(512,256,(c)=>{c.fillStyle="#fff8e6";c.fillRect(0,0,512,256);c.fillStyle="#e8b838";c.beginPath();c.arc(70,70,40,0,7);c.fill();
      c.fillStyle="#e86a9a";c.fillRect(180,120,120,90);c.fillStyle="#7a54a5";c.beginPath();c.moveTo(170,120);c.lineTo(240,60);c.lineTo(310,120);c.fill();c.fillStyle="#3e9d63";c.fillRect(0,210,512,46);
      c.fillStyle="#2e79bd";c.font="800 30px Comic Sans MS, system-ui";c.fillText("Creche da Fábrica",300,50);},false);
    wallScreen(b,tex,0,2.5,5,4,2);
    return {tick:(dt,t,s,x)=>{kids.forEach(k=>tickPacer(k,dt,t,1));carers.forEach(c=>tickPacer(c,dt,t,.5));}};
  });

  const facMeshes={},gates=[];
  function makeSite(o,id){
    const s=new THREE.Group();s.position.set(o.x,0,o.z);campusRoot.add(s);
    const pad=box(o.w+.6,.06,o.d+.6,0x9a8f7a,0,.03,0);pad.castShadow=false;s.add(pad);
    const fw=o.w+1,fd=o.d+1;for(let x=-fw/2;x<=fw/2+.01;x+=2)for(const z of [-fd/2,fd/2])s.add(box(.08,1.1,.08,0xdfe4e3,x,.55,z));
    for(let z=-fd/2;z<=fd/2+.01;z+=2)for(const x of [-fw/2,fw/2])s.add(box(.08,1.1,.08,0xdfe4e3,x,.55,z));
    const tape=material(0xe78630);for(const z of [-fd/2,fd/2])for(const y of [.5,.95])s.add(box(fw,.1,.04,tape,0,y,z));for(const x of [-fw/2,fw/2])for(const y of [.5,.95])s.add(box(.04,.1,fd,tape,x,y,0));
    const fh=Math.max(2.5,o.h*.7);for(const [x,z] of [[-o.w/2+.5,-o.d/2+.5],[o.w/2-.5,-o.d/2+.5],[-o.w/2+.5,o.d/2-.5],[o.w/2-.5,o.d/2-.5]])s.add(box(.25,fh,.25,0x8b9496,x,fh/2,z));
    s.add(box(o.w-.8,.2,.2,0x8b9496,0,fh,-o.d/2+.5));s.add(box(o.w-.8,.2,.2,0x8b9496,0,fh,o.d/2-.5));
    const ch=o.h+5;s.add(box(.5,ch,.5,0xe8b838,-o.w/2+1.2,ch/2,-o.d/2+1.2));const jib=box(Math.max(6,o.w*.8),.3,.3,0xe8b838,-o.w/2+1.2+Math.max(6,o.w*.8)/2-1.5,ch,-o.d/2+1.2);s.add(jib);
    s.add(box(1,.8,.8,0x5d6468,-o.w/2+.2,ch-.3,-o.d/2+1.2));
    const sand=new THREE.Mesh(new THREE.ConeGeometry(1.2,1,12),material(0xc9b48a));sand.position.set(o.w/4,.5,0);s.add(sand);
    for(let i=0;i<3;i++)s.add(box(1.4,.35,.7,0xb5452f,-o.w/4,.18+i*.36,0));
    const f=(typeof FACILITIES!=="undefined"&&FACILITIES[id])||{name:o.label,cost:0};
    const tex=canvasTex(512,160,(g)=>{g.fillStyle="#e8b838";roundRect(g,4,4,504,152,16);g.fill();g.fillStyle="#1b2b20";g.font="900 40px Segoe UI, Arial";g.textAlign="center";g.fillText("🚧 EM OBRAS",256,56);
      g.font="700 30px Segoe UI, Arial";g.fillText(f.name,256,100,480);g.font="800 28px Segoe UI, Arial";g.fillText(`Construa por R$ ${Math.round(f.cost).toLocaleString("pt-BR")}`,256,140);},false);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.2,1),new THREE.MeshBasicMaterial({map:tex,toneMapped:false,side:THREE.DoubleSide}));sign.position.set(0,1.6,fd/2+.05);s.add(sign);
    s.add(box(.1,1.2,.1,0x4d5558,-1.3,.6,fd/2+.02));s.add(box(.1,1.2,.1,0x4d5558,1.3,.6,fd/2+.02));
    return s;
  }
  function facBuilding(id,o,extras){
    const g=building({...o,action:id});const ex=new THREE.Group();campusRoot.add(ex);extras&&extras(ex);
    facMeshes[id]={g,ex,site:makeSite(o,id),built:null};g.visible=ex.visible=false;
  }
  function syncFacilities(s){for(const [id,f] of Object.entries(facMeshes)){const b=!!s.facilities?.[id];if(b===f.built)continue;f.built=b;f.g.visible=f.ex.visible=b;f.site.visible=!b;}}
  function tickGates(dt){for(const gt of gates){const gz=gt.z??44,nearAt=p=>Math.abs(p.x-gt.x)<7&&Math.abs(p.z-gz)<3;const near=vehicles.some(v=>nearAt(v.position))||commuters.some(c=>c.car.visible&&nearAt(c.car.position));
    const target=near?-Math.PI/2.3*gt.side:0;gt.arm.rotation.z+=(target-gt.arm.rotation.z)*Math.min(1,dt*5);}}

  /* ---------------- Ambulatório (ao lado do auditório) ---------------- */
  /* ---------------- Cantina da praça ---------------- */
  function buildCantina(g){
    roomShell(g,14,10,4,{wall:0xf3e3b5,trim:0xc8473b,floor:0xe0d6c4});
    // balcão com vitrine de salgados, máquina de café, sucos e geladeira de bebidas
    g.add(box(9,1,1.2,0xc8473b,-1,.5,3.2));g.add(box(9.2,.08,1.3,0x8b6b45,-1,1.04,3.2));
    g.add(box(3.4,.6,.9,material(0xbfe0ec,{transparent:true,opacity:.4,roughness:.1}),-3.5,1.4,3.1));
    const snackCols=[0xd9a24a,0xe8d9a0,0xc8763c,0xd9a24a,0xe8d9a0,0xb5452f];for(let i=0;i<12;i++){const s=new THREE.Mesh(new THREE.SphereGeometry(.1,8,6),material(snackCols[i%6]));s.position.set(-5+(i%6)*.55,1.2+Math.floor(i/6)*.2,2.9+Math.floor(i/6)*.35);g.add(s);}
    for(let i=0;i<3;i++){g.add(box(.5,.12,.5,0xf3efe4,-.2+i*.7,1.14,3.1));g.add(box(.46,.1,.46,0xe6d3a3,-.2+i*.7,1.25,3.1));g.add(box(.42,.06,.42,0x3e9d63,-.2+i*.7,1.33,3.1));}   // sanduíches
    g.add(box(.8,.9,.6,0x2c3b4a,2.4,1.5,3.3));g.add(box(.3,.3,.06,screenMat,2.4,1.7,2.98));   // máquina de café
    for(const [dx,c] of [[3.3,0xe78630],[3.8,0x7a54a5]])g.add(cylinder(.16,.7,material(c,{transparent:true,opacity:.85}),dx,1.45,3.2,0,10));   // sucos
    g.add(box(1.4,2.2,.8,0xdfe4e3,5.6,1.1,3.6));g.add(box(1.2,1.8,.06,material(0x9cc6d6,{transparent:true,opacity:.5}),5.6,1.2,3.17));for(let i=0;i<6;i++)g.add(cylinder(.08,.3,[0xd4483f,0x2e79bd,0xe8b838][i%3],5.2+(i%3)*.4,.6+Math.floor(i/3)*.7,3.5,0,8));   // geladeira
    const menuT=canvasTex(512,256,(c)=>{c.fillStyle="#1d2624";c.fillRect(0,0,512,256);c.fillStyle="#f0c040";c.font="900 36px Segoe UI, Arial";c.fillText("🥪 CANTINA — LANCHES",24,50);c.fillStyle="#fff";c.font="700 26px Segoe UI, Arial";["Coxinha ..................... R$ 6","Pão de queijo .............. R$ 4","Sanduíche natural ....... R$ 9","Suco de laranja / uva ... R$ 5","Café ........................... R$ 3"].forEach((l,i)=>c.fillText(l,24,96+i*32));},false);
    wallScreen(g,menuT,-1,2.8,5,5,2.5);
    const cashier=makeWorker(0xffffff,0xf6f6f2);cashier.position.set(1,0,4.1);cashier.rotation.y=Math.PI;g.add(cashier);
    const cook=addPacer(g,[-5,4.2],[3,4.2],makeWorker(0xffffff,0xf6f6f2));
    // mesas redondas com banquetas e gente lanchando
    const eaters=[];for(const [tx,tz] of [[-4.5,-1.2],[0,-1.5],[4.5,-1.2],[-2.5,-4],[2.5,-4]]){g.add(cylinder(.65,.06,0xf3efe4,tx,.85,tz,0,16));g.add(cylinder(.07,.82,0x3a3f3e,tx,.42,tz,0,8));
      for(let k=0;k<3;k++){const a=k*Math.PI*2/3+.4,sx=tx+Math.cos(a)*1.05,sz=tz+Math.sin(a)*1.05;g.add(cylinder(.22,.5,0x8b6b45,sx,.25,sz,0,10));if(Math.random()<.75){const w=seated(g,sx,sz,Math.atan2(tx-sx,tz-sz));eaters.push(w);const cup=cylinder(.05,.12,[0xe78630,0xf3efe4,0x7a54a5][k],tx+Math.cos(a)*.35,.94,tz+Math.sin(a)*.35,0,8);g.add(cup);}}}
    addLabel("Balcão de lanches",new THREE.Vector3(-1,2.2,3.2),"cantina",{cls:"small"});
    const queue=[];for(let i=0;i<3;i++){const w=randomWorker(.95);w.position.set(-2+i*1.1,0,1.9);w.rotation.y=0;g.add(w);queue.push(w);}
    return {sync:(s)=>{const n=Math.min(eaters.length,Math.round(eaters.length*(.35+s.morale/150)));eaters.forEach((w,i)=>w.visible=i<n);queue.forEach((q,i)=>q.visible=i<(s.morale>=65?3:2));},
      tick:(dt,t,s,x)=>{eaters.forEach((w,i)=>{if(w.visible)w.children[4].rotation.x=Math.sin(t*2.5+i)*.12;});queue.forEach((q,i)=>{if(q.visible)q.position.x=-2+((i*1.1+t*.2)%3.3);});tickPacer(cook,dt,t,.6);cashier.rotation.y=Math.PI+Math.sin(t*1.4)*.25;}};
  }
  function buildAmbulatorio(g){
    roomShell(g,14,10,4,{wall:0xf4f6f6,trim:0xd4483f,floor:0xdfe6e6});
    g.add(box(3.4,1,1,0xf6f6f2,-4,.5,-2.6));g.add(box(3.6,.06,1.1,0x2e79bd,-4,1.02,-2.6));
    const nurse=addPacer(g,[-5.5,-3.6],[-2.5,-3.6],makeWorker(0xffffff,0xffffff));
    for(let i=0;i<4;i++)g.add(box(.6,.45,.6,0x2e79bd,-6+i*.8,.25,.6));const wait=seated(g,-5.2,.6,Math.PI);
    for(const x of [1.4,3.8,6.2]){g.add(box(1,.55,2.1,0xf6f6f2,x,.5,2.6));g.add(box(1,.22,.5,0xbfdcef,x,.88,1.8));g.add(box(.05,2.3,2.6,0xbfdcef,x-.75,1.15,2.6));}
    const patient=new THREE.Group();const pw=randomWorker(.95);pw.rotation.x=-Math.PI/2;pw.position.set(0,.85,-.2);patient.add(pw);patient.position.set(3.8,0,3.3);g.add(patient);
    g.add(box(1.6,2.2,.5,0xf3efe4,5.8,1.1,-4.6));for(let i=0;i<6;i++)g.add(box(.3,.25,.3,[0xd4483f,0x2e79bd,0x3e9d63][i%3],5.3+(i%3)*.5,1.2+Math.floor(i/3)*.6,-4.3));
    const doc=addPacer(g,[0,.2],[6.5,.2],makeWorker(0x3e9d63,0xf6f6f2));
    const tex=canvasTex(512,256,(c)=>{c.fillStyle="#ffffff";c.fillRect(0,0,512,256);c.fillStyle="#d4483f";c.fillRect(46,78,100,100);c.fillStyle="#fff";c.fillRect(82,92,28,72);c.fillRect(60,114,72,28);
      c.fillStyle="#1b2b20";c.font="900 44px system-ui";c.fillText("AMBULATÓRIO",170,118);c.font="600 24px system-ui";c.fillStyle="#4b5a50";c.fillText("Atendimento da equipe",170,160);},false);
    wallScreen(g,tex,0,2.5,5,4,2);
    addLabel("Leitos",new THREE.Vector3(3.8,2.4,2.6),"ambulatorio",{cls:"small"});addLabel("Recepção",new THREE.Vector3(-4,2,-2.6),"ambulatorio",{cls:"small"});
    return {tick:(dt,t,s,x)=>{tickPacer(nurse,dt,t,.5);tickPacer(doc,dt,t,.4);pw.rotation.z=Math.sin(t*.8)*.05;}};
  }

  /* ---------------- Refeitório ---------------- */
  function buildRefeitorio(g){
    roomShell(g,20,13,4.6,{wall:0xf1e4c8,trim:0xd07a2c,floor:0xd9cdb5});
    // balcão do buffet no fundo
    g.add(box(11,1,1.2,material(0xc9ced0,{metalness:.45,roughness:.3}),1,.5,4.9));
    g.add(box(11,.06,.5,material(0xe8f4f8,{transparent:true,opacity:.35}),1,1.55,4.55));for(const x of [-4.3,6.3])g.add(box(.06,.55,.06,0x9aa2a3,x,1.3,4.55));
    [0xf3efe4,0x6b3f26,0x5fa844,0xc8763c,0xe8c04a,0xe78630,0xd4483f,0x8a5a3b].forEach((c,i)=>{g.add(box(1.1,.1,.8,0x9aa2a3,-3.6+i*1.3,1.02,4.9));g.add(box(.95,.12,.65,material(c,{roughness:.8}),-3.6+i*1.3,1.1,4.9));});
    const cooks=[addPacer(g,[-3,5.8],[5,5.8],makeWorker(0xffffff,0xf6f6f2)),addPacer(g,[-2,5.8],[6,5.8],makeWorker(0xffffff,0xf6f6f2))];
    // quadro do cardápio
    const menuTex=canvasTex(512,256,()=>{},false);const menu=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.1),new THREE.MeshBasicMaterial({map:menuTex,toneMapped:false}));menu.position.set(-7,3,6.47);menu.rotation.y=Math.PI;g.add(menu);
    g.add(box(4.4,2.3,.06,0x5c3f26,-7,3,6.52));
    let menuKey="";
    function drawMenu(s){const lv=s.canteen?.level||1,key=(s.canteen?.menu||"")+lv;if(key===menuKey)return;menuKey=key;
      const c=menuTex.image.getContext("2d");c.fillStyle="#1f2a24";c.fillRect(0,0,512,256);c.strokeStyle="#d07a2c";c.lineWidth=8;c.strokeRect(6,6,500,244);
      c.fillStyle="#f0c14d";c.font="800 30px system-ui";c.textAlign="center";c.fillText("CARDÁPIO DO DIA",256,52);
      c.fillStyle="#fff";c.font="600 24px system-ui";const txt=s.canteen?.menu||"Arroz, feijão e salada";const words=txt.split(" ");let line="",y=110;
      for(const w of words){if(c.measureText(line+w).width>440){c.fillText(line,256,y);line="";y+=32;}line+=w+" ";}c.fillText(line,256,y);
      c.fillStyle="#9fd3b0";c.font="600 20px system-ui";c.fillText(`Almoço 12:00 às 13:30 · ${["","Marmitas","Buffet","Restaurante com chef"][lv]}`,256,226);menuTex.needsUpdate=true;}
    // mesas compridas com bancos
    const tables=[],diners=[],plates=[];
    for(const x of [-4.8,4.8])for(const z of [-4.3,-1.4,1.5]){g.add(box(4.4,.08,1,0xb58a5a,x,.78,z));for(const sx of [-1.9,1.9])g.add(box(.1,.76,.8,0x5c3f26,x+sx,.38,z));
      for(const sd of [-1,1])g.add(box(4.4,.08,.35,0x8a6a3a,x,.45,z+sd*.8));tables.push([x,z]);
      for(let i=0;i<4;i++)for(const sd of [-1,1]){const px=x-1.5+i*1,pz=z+sd*.8;const w=randomWorker(.95);w.position.set(px,-.28,pz);w.rotation.y=sd>0?Math.PI:0;w.visible=false;g.add(w);diners.push(w);
        const pl=cylinder(.16,.03,0xf6f6f2,px,.84,z+sd*.3,0,12);pl.visible=false;g.add(pl);plates.push(pl);
        const food=cylinder(.1,.04,[0xe8c04a,0x6b3f26,0x5fa844,0xc8763c][(i+tables.length)%4],px,.87,z+sd*.3,0,10);food.visible=false;g.add(food);plates.push(food);}}
    const queue=[];for(let i=0;i<5;i++){const w=randomWorker(.95);w.position.set(-3.5+i*1.1,0,3.7);w.rotation.y=Math.PI/2;w.visible=false;g.add(w);queue.push(w);}
    const cleaner=addPacer(g,[-8,-5.5],[8,-5.5],makeWorker(0x3e9d63,0x3e9d63));
    addLabel("Buffet",new THREE.Vector3(1,2.3,4.9),"refeitorio",{cls:"small"});
    let lastN=-1;
    return {
      sync:(s)=>{drawMenu(s);},
      tick:(dt,t,s,x)=>{const lunch=typeof isLunch==="function"&&isLunch(s),n=lunch?diners.length:0;
        if(n!==lastN){lastN=n;diners.forEach((d,i)=>d.visible=i<n);plates.forEach((p,i)=>p.visible=Math.floor(i/2)<n);queue.forEach((q,i)=>q.visible=lunch&&i<Math.min(5,n/3));}
        if(lunch)diners.forEach((d,i)=>{if(i<n)d.children[4].rotation.x=Math.sin(t*3+i)*.12;});
        queue.forEach((q,i)=>{if(q.visible)q.position.x=-3.5+((i*1.1+t*.25)%5.5);});
        cooks.forEach(c=>tickPacer(c,dt,t,lunch?1.4:.5));tickPacer(cleaner,dt,t,lunch?0:.6);cleaner.visible=!lunch;}
    };
  }

  /* ---------------- almoço e hora de ir embora: o pessoal anda pelo complexo ---------------- */
  const commuters=[],lunchCrowd=[],movers=new Set();
  const DOORS={prod:[-13,11.4],acab:[42,9.4],ref:[-40.4,14.3]};
  let commutePhase=null;
  function go(m,pts,speed,delay,onDone){m.userData.mv={pts,i:0,speed,delay,onDone,started:false};movers.add(m);}
  function tickMovers(dt,t){
    for(const m of movers){const u=m.userData.mv;if(!u){movers.delete(m);continue;}
      if(u.delay>0){u.delay-=dt;continue;}
      if(!u.started){u.started=true;m.visible=true;m.position.set(u.pts[0][0],ROAD_Y,u.pts[0][1]);u.i=1;}
      const p=u.pts[u.i];if(!p){movers.delete(m);m.userData.mv=null;u.onDone?.();continue;}
      const dx=p[0]-m.position.x,dz=p[1]-m.position.z,d=Math.hypot(dx,dz),step=u.speed*dt;
      if(d<=step){m.position.x=p[0];m.position.z=p[1];u.i++;if(u.i>=u.pts.length){movers.delete(m);m.userData.mv=null;u.onDone?.();}continue;}
      m.position.x+=dx/d*step;m.position.z+=dz/d*step;
      if(m.userData.legs){m.rotation.y=Math.atan2(dx,dz);m.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*12+i*Math.PI)*.55);}
      else m.rotation.y=lerpAngle(m.rotation.y,Math.atan2(-dz,dx),Math.min(1,dt*8));
    }
  }
  function personRoute(c){const D=DOORS[c.home],sx=c.slot.x+.75;return [[D[0]+(Math.random()-.5)*2,D[1]],[D[0],14.8],[sx,18],[sx,c.slot.z]];}
  function exitRoute(c){return [[c.slot.x,c.slot.z],[c.slot.x,c.cz],[c.side*60,c.cz],[c.side*60,44],[c.side*89,44]];}
  function lunchRoute(i){const D=DOORS.prod,ox=(i%5-2)*.7;return [[D[0]+ox,D[1]],[D[0]+ox,14.6+(i%3)*.3],[DOORS.ref[0]+(i%3-1)*.5,14.6+(i%3)*.3],[DOORS.ref[0]+(i%3-1)*.5,DOORS.ref[1]]];}
  function parkCar(c){c.car.visible=true;c.car.position.set(c.slot.x,ROAD_Y,c.slot.z);c.car.rotation.y=c.slot.rot;}
  function initCommute(){
    commuters.forEach((c,i)=>{c.person=randomWorker(.9);c.person.visible=false;campusRoot.add(c.person);c.home=i%2?"prod":"acab";});
    for(let i=0;i<16;i++){const w=randomWorker(.9);w.visible=false;campusRoot.add(w);lunchCrowd.push(w);}
  }
  function dayPhase(s){if(s.night)return "night";if(typeof isLunch==="function"&&isLunch(s))return "lunch";return "work";}
  function tickCommute(dt,t,s){
    const ph=dayPhase(s);
    if(ph!==commutePhase){const prev=commutePhase;commutePhase=ph;const instant=prev==null;
      if(ph==="night"){
        lunchCrowd.forEach(w=>{movers.delete(w);w.visible=false;});
        for(const c of commuters){movers.delete(c.car);movers.delete(c.person);c.person.visible=false;
          if(instant){c.car.visible=false;continue;}
          parkCar(c);go(c.person,personRoute(c),9.5,Math.random()*2,()=>{c.person.visible=false;go(c.car,exitRoute(c),19,.2,()=>{c.car.visible=false;});});}
      }else{
        if(prev==="night"||instant){for(const c of commuters){movers.delete(c.car);movers.delete(c.person);c.person.visible=false;
          if(instant){parkCar(c);continue;}
          c.car.visible=false;go(c.car,exitRoute(c).reverse(),19,Math.random()*2,()=>{parkCar(c);go(c.person,personRoute(c).reverse(),9.5,.2,()=>{c.person.visible=false;});});}}
        if(ph==="lunch"&&!instant)lunchCrowd.forEach((w,i)=>go(w,lunchRoute(i),7.5,i*.22+Math.random()*.4,()=>{w.visible=false;}));
        else if(ph==="work"&&prev==="lunch")lunchCrowd.forEach((w,i)=>go(w,lunchRoute(i).reverse(),7.5,i*.22+Math.random()*.4,()=>{w.visible=false;}));
      }
    }
    if(movers.size)tickMovers(dt,t);
    if(gates.length)tickGates(dt);
  }

  /* ---------------- Laboratório de Cores ---------------- */
  const colorList=()=>typeof COLORS!=="undefined"?Object.entries(COLORS):[];
  const hexToNum=h=>parseInt(String(h).slice(1),16);
  function buildLaboratorio(g){
    roomShell(g,18,12,5.5,{wall:0xf3f1ec,trim:0x7a54a5,floor:0xe6e3da});
    // bancadas com frascos que borbulham nas cores descobertas
    const flasks=[];
    for(const z of [-2.4,1.2]){g.add(box(12.4,.9,1.4,0xdfe4e3,-1.2,.45,z));g.add(box(12.6,.08,1.5,0x2c3b4a,-1.2,.93,z));
      g.add(box(12.4,.05,.4,0xbfc7c9,-1.2,1.9,z));for(const x of [-7.2,4.8])g.add(box(.06,1,.06,0x9aa2a3,x,1.45,z));}
    const glassM=material(0xe8f4f8,{transparent:true,opacity:.32,roughness:.08,metalness:.1});
    for(let i=0;i<22;i++){const z=i<11?-2.4:1.2,x=-6.6+(i%11)*1.08;const fl=new THREE.Group();fl.position.set(x,.97,z);
      const liq=new THREE.Mesh(new THREE.CylinderGeometry(.15,.17,.3,12),material(0xffffff,{emissive:new THREE.Color(0xffffff),emissiveIntensity:.35}));liq.position.y=.16;fl.add(liq);
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.17,.19,.46,12),glassM);body.position.y=.23;fl.add(body);
      const neck=new THREE.Mesh(new THREE.CylinderGeometry(.06,.07,.18,8),glassM);neck.position.y=.55;fl.add(neck);
      g.add(fl);flasks.push({fl,liq,phase:i*.7});}
    // misturador de cores (centrífuga)
    const mixer=new THREE.Group();mixer.position.set(6.3,0,-2.6);g.add(mixer);
    mixer.add(cylinder(1.15,1,material(0xc9ced0,{metalness:.5,roughness:.3}),0,.5,0,0,24));
    const drum=new THREE.Group();drum.position.y=1.15;mixer.add(drum);
    [0xd4483f,0xe78630,0xe8b838,0x3e9d63,0x2e79bd,0x7a54a5].forEach((c,i)=>{const seg=box(.7,.28,.34,material(c,{emissive:new THREE.Color(c),emissiveIntensity:.3}),Math.cos(i/6*Math.PI*2)*.62,0,Math.sin(i/6*Math.PI*2)*.62);seg.rotation.y=-i/6*Math.PI*2;drum.add(seg);});
    drum.add(cylinder(.25,.5,0xdfe4e3,0,.1,0,0,14));
    addLabel("Misturador de cores",new THREE.Vector3(6.3,2.4,-2.6),"laboratorio",{cls:"small"});
    // tela do espectrômetro na parede do fundo
    const labTex=canvasTex(512,256,()=>{},false);
    const scr=new THREE.Mesh(new THREE.PlaneGeometry(5.2,2.6),new THREE.MeshBasicMaterial({map:labTex,toneMapped:false}));scr.position.set(1.5,3.2,5.97);scr.rotation.y=Math.PI;g.add(scr);
    g.add(box(5.5,2.9,.08,0x1d2624,1.5,3.2,6.02));
    let scrKey="",scrT=0;
    function drawScreen(s,t){const L=s.lab||{},r=L.research,key=(r?r.color+Math.round((1-r.left/r.total)*100):"idle")+(L.unlocked||[]).length+Math.floor(t*2)%2;if(key===scrKey)return;scrKey=key;
      const c=labTex.image.getContext("2d");c.fillStyle="#0c1a24";c.fillRect(0,0,512,256);
      c.fillStyle="#7fd6c8";c.font="700 20px system-ui";c.fillText("ESPECTRÔMETRO",20,34);
      const list=colorList(),un=L.unlocked||[];
      for(let i=0;i<list.length;i++){const [id,col]=list[i],x=20+i*23;const on=un.includes(id);c.fillStyle=on?col.hex:"#1f3140";const hgt=on?60+((i*37)%50):14;c.fillRect(x,200-hgt,18,hgt);}
      c.fillStyle="#1f3140";c.fillRect(20,202,472,2);
      if(r){const col=(typeof COLORS!=="undefined"&&COLORS[r.color])||{hex:"#fff",name:""},pct=Math.round((1-r.left/r.total)*100);
        c.fillStyle="#fff";c.font="700 18px system-ui";c.fillText(`Pesquisando: ${col.name}`,20,64);
        c.fillStyle="#1f3140";c.fillRect(20,226,472,16);c.fillStyle=col.hex;c.fillRect(20,226,472*pct/100,16);
        c.fillStyle="#fff";c.font="700 14px system-ui";c.fillText(`${pct}%`,455,220);
        if(Math.floor(t*2)%2){c.beginPath();c.arc(490,30,7,0,7);c.fillStyle="#ff5a5a";c.fill();}}
      else{c.fillStyle="#9fb3bf";c.font="600 16px system-ui";c.fillText(`${un.length} cores descobertas · escolha uma pesquisa na aba Cores`,20,64);}
      labTex.needsUpdate=true;}
    // parede de amostras: cada cor descoberta acende um azulejo
    const tiles=[];colorList().forEach(([id,col],i)=>{const tl=box(.7,.7,.05,material(hexToNum(col.hex),{roughness:.4}),-8.97,1.3+Math.floor(i/7)*.85,-3.4+(i%7)*.95);tl.rotation.y=Math.PI/2;g.add(tl);tiles.push({id,tl});});
    addLabel("Cartela de cores",new THREE.Vector3(-8.6,4.3,-.5),"laboratorio",{cls:"small"});
    // vitrine com os lápis criados no Estúdio
    g.add(box(4.6,1,1.1,0x8a6a3a,-5.5,.5,4.6));const vit=box(4.6,1,1.1,material(0xe8f4f8,{transparent:true,opacity:.22,roughness:.05}),-5.5,1.5,4.6);g.add(vit);
    const shelf=[];for(let i=0;i<6;i++){const pen=makePencil(0xe8b838,.9,.07);pen.rotation.z=Math.PI/2;pen.position.set(-7.3+i*.72,1.2,4.6);pen.visible=false;g.add(pen);shelf.push(pen);}
    addLabel("Vitrine dos seus lápis",new THREE.Vector3(-5.5,2.6,4.6),"laboratorio",{cls:"small"});
    const people=[addPacer(g,[-6.5,-.6],[4,-.6],makeWorker(0xf3efe4,0xf6f6f2)),addPacer(g,[-6,3],[3,3],makeWorker(0x7a54a5,0xf6f6f2)),addPacer(g,[5,.5],[7.5,2.5],makeWorker(0xf3efe4,0xf6f6f2))];
    let colKey="";
    return {
      sync:(s)=>{const un=s.lab?.unlocked||[],key=un.join()+JSON.stringify((s.custom||[]).map(c=>[c.body,c.retired]));if(key===colKey)return;colKey=key;
        const list=colorList();flasks.forEach((f,i)=>{const e=list[i],on=!!e&&un.includes(e[0]);f.fl.visible=on;if(on){const c=hexToNum(e[1].hex);f.liq.material.color.setHex(c);f.liq.material.emissive.setHex(c);}});
        tiles.forEach(x=>x.tl.visible=un.includes(x.id));
        const mine=(s.custom||[]).filter(c=>!c.retired);shelf.forEach((p,i)=>{const c=mine[i];p.visible=!!c;if(c)p.children[0].material.color.setHex(hexToNum(COLORS[c.body]?.hex||"#e8b838"));});},
      tick:(dt,t,s,x)=>{const busy=!!s.lab?.research;drum.rotation.y+=dt*(busy?6:.6);
        flasks.forEach(f=>{f.liq.scale.y=1+Math.sin(t*3+f.phase)*.08;f.liq.material.emissiveIntensity=(x.blackout?0:.25)+(busy?Math.max(0,Math.sin(t*4+f.phase))*.5:0);});
        people.forEach(p=>tickPacer(p,dt,t,x.k||.6));drawScreen(s,t);}
    };
  }
  function buildVisitantes(g){
    roomShell(g,26,14,6,{wall:0xf0e6d8,trim:0x6e3522,floor:0xd8c7a8});
    g.add(box(24,.02,2.4,0x8b2530,0,.02,.8));
    // lápis gigante girando + corte mostrando madeira e mina
    g.add(cylinder(1.4,.4,0x6e3522,-8,.2,-2.8,0,24));const giant=makePencil(0xe8b838,3.2,.45);giant.position.set(-8,2.2,-2.8);g.add(giant);
    addLabel("✏️ Lápis gigante",new THREE.Vector3(-8,4.6,-2.8),"visitantes",{cls:"small"});
    const cut=new THREE.Group();cut.position.set(-2.5,1.7,-3.4);g.add(cut);
    const wood=cylinder(1.1,.5,0xd8a868,0,0,0,0,6);wood.rotation.x=Math.PI/2;cut.add(wood);const paint=cylinder(1.2,.44,0xe8b838,0,0,-.04,0,6);paint.rotation.x=Math.PI/2;cut.add(paint);
    const core=cylinder(.34,.54,0x2d3a36,0,0,0,0,18);core.rotation.x=Math.PI/2;cut.add(core);g.add(box(1.4,1.1,1,0x6e3522,-2.5,.55,-3.4));
    addLabel("Corte do lápis: madeira + mina",new THREE.Vector3(-2.5,3.2,-3.4),"visitantes",{cls:"small"});
    // linha do tempo: 6 painéis com vitrines
    const panels=[],pedestals=[];
    for(let i=0;i<6;i++){const x=-10.5+i*4.2;
      const tex=canvasTex(512,340,()=>{},false);g.add(box(3.8,2.6,.1,0x3a2a22,x,3.3,6.85));
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(3.6,2.4),new THREE.MeshBasicMaterial({map:tex,toneMapped:false}));pl.rotation.y=Math.PI;pl.position.set(x,3.3,6.78);g.add(pl);
      const ped=new THREE.Group();ped.position.set(x,0,4.9);g.add(ped);ped.add(box(1.3,1,1.3,0x6e3522,0,.5,0));
      const glass=new THREE.Mesh(new THREE.BoxGeometry(1.2,1,1.2),material(0xbfe0ec,{transparent:true,opacity:.22,roughness:.05}));glass.position.y=1.5;ped.add(glass);
      const model=new THREE.Group();model.position.y=1.05;ped.add(model);
      const cover=box(1.1,.9,1.1,0x8d989c,0,1.45,0);ped.add(cover);
      panels.push({tex}); pedestals.push({model,cover,glass});}
    const M=pedestals.map(p=>p.model);
    {const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(.32,0),material(0x2d3a36,{metalness:.6,roughness:.35,flatShading:true}));rock.scale.set(1.3,.8,1);rock.position.y=.25;M[0].add(rock);}
    {M[1].add(cylinder(.35,.2,0x9aa2a3,0,.1,0,0,16));for(let i=0;i<5;i++){const r=cylinder(.03,.6,0x2d3a36,-.2+i*.1,.45,0,0,6);r.rotation.z=(i-2)*.12;M[1].add(r);}}
    {const pz=makePencil(0xd8a868,.8,.07);pz.position.y=.45;M[2].add(pz);M[2].add(cylinder(.075,.12,0xcbd2cf,0,.0,0,0,10));M[2].add(cylinder(.07,.12,0xff9aa2,0,-.1,0,0,10));M[2].children.forEach(c=>c.position.y+=.1);}
    {M[3].add(cylinder(.22,.35,0x2f5d4a,0,.17,0,0,12));for(let i=0;i<3;i++){const pz=makePencil(0xe8b838,.8,.06);pz.position.set(-.08+i*.08,.6,0);pz.rotation.z=(i-1)*.15;M[3].add(pz);}}
    {for(let i=0;i<6;i++){const pz=makePencil(RAINBOW[i],.75,.05);pz.position.set(0,.4,0);pz.rotation.z=(i-2.5)*.22;M[4].add(pz);}}
    {M[5].add(box(.9,.3,.6,0xd9d4c8,0,.15,0));M[5].add(box(.3,.2,.3,0xc8473b,.35,.4,-.1));const lg=new THREE.Mesh(new THREE.PlaneGeometry(.8,.3),brandMaterial());lg.rotation.y=Math.PI;lg.position.set(0,.2,-.31);M[5].add(lg);M[5].add(cylinder(.05,.6,0xc8473b,-.3,.5,-.2,0,8));}
    addLabel("📜 Linha do tempo do lápis",new THREE.Vector3(0,5.2,6.4),"visitantes",{cls:"small"});
    // "você sabia?" e painel de números da fábrica
    const factTex=canvasTex(512,256,(x)=>{x.fillStyle="#143c2b";x.fillRect(0,0,512,256);x.fillStyle="#efc64d";x.font="800 34px Segoe UI, Arial";x.fillText("VOCÊ SABIA?",30,58);x.fillStyle="#fff";x.font="600 25px Segoe UI, Arial";
      ["A “mina” do lápis nunca teve chumbo.","É grafite misturado com argila.","Mais argila = mina mais dura (H).","Mais grafite = mais escura (B)."].forEach((l,i)=>x.fillText(l,30,110+i*36));},false);
    const fact=new THREE.Mesh(new THREE.PlaneGeometry(5,2.5),new THREE.MeshBasicMaterial({map:factTex,toneMapped:false}));fact.rotation.y=Math.PI/2;fact.position.set(-12.83,3.2,-1.5);g.add(fact);
    const statsTex=canvasTex(512,300,()=>{},false);
    const kiosk=new THREE.Group();kiosk.position.set(7.5,0,-4.2);g.add(kiosk);kiosk.add(box(.2,1.6,.2,0x4d5558,0,.8,0));kiosk.add(box(3.2,2,.14,0x1d2624,0,2.4,0));
    const statsPl=new THREE.Mesh(new THREE.PlaneGeometry(3,1.76),new THREE.MeshBasicMaterial({map:statsTex,toneMapped:false}));statsPl.rotation.y=Math.PI;statsPl.position.set(0,2.4,-.08);kiosk.add(statsPl);
    // bilheteria e lojinha
    g.add(box(1,1.1,3.2,0x8b6b45,11.8,.55,-1.5));g.add(box(1.2,.08,3.4,0xc9a47a,11.8,1.14,-1.5));const clerk=makeWorker(0x2c3b4a,0x8b2530);clerk.children.at(-1).visible=false;clerk.position.set(12.5,0,-1.5);clerk.rotation.y=-Math.PI/2;g.add(clerk);
    addLabel("🎟️ Bilheteria",new THREE.Vector3(11.8,2.2,-1.5),"visitantes",{cls:"small"});
    for(let y of [.4,1.1,1.8]){g.add(box(.6,.06,3.6,0x5c3f26,-12.6,y,3.4));for(let i=0;i<6;i++)g.add(box(.4,.3,.45,[0xe8b838,0x2e79bd,0xd4483f,0x3e9d63][i%4],-12.6,y+.19,1.9+i*.6));}
    addLabel("🛍️ Lojinha",new THREE.Vector3(-12.4,2.6,3.4),"visitantes",{cls:"small"});
    for(const x of [-6,6])g.add(box(2.4,.45,.7,0x8b6b45,x,.3,-5.6));
    // visitantes com guia
    const guide=addPacer(g,[-11,2.4],[11,2.4],makeWorker(0xe78630,0xe78630));const guideTag=addLabel("🧑‍🏫 Guia",new THREE.Vector3(0,2,2.4),"visitantes",{cls:"small"});
    const visitors=[];for(let i=0;i<16;i++){const kid=i%3===0;const v=addPacer(g,[-11,1.4-(i%4)*.75],[11,1.4-(i%4)*.75],makeWorker(0x2c3b4a,[0xd64c46,0x2f77b5,0xe8b838,0x3e9d63,0x7a54a5][i%5],kid?.68:.88));v.children.at(-1).visible=false;visitors.push(v);}
    let lastKey="",lastStats=0;
    const drawPanel=(i,ex,on)=>{const c=panels[i].tex.image,x=c.getContext("2d");
      if(!on){x.fillStyle="#b9b3a6";x.fillRect(0,0,512,340);x.fillStyle="#6d675c";x.font="900 90px Segoe UI, Arial";x.textAlign="center";x.fillText("🔒",256,160);x.font="700 28px Segoe UI, Arial";x.fillText("Peça ainda não chegou",256,230);x.font="600 22px Segoe UI, Arial";x.fillText(`Libera com ${ex.goals} meta(s) concluída(s)`,256,270);x.textAlign="left";panels[i].tex.needsUpdate=true;return;}
      x.fillStyle="#fffaf0";x.fillRect(0,0,512,340);x.fillStyle="#8b2530";x.fillRect(0,0,512,70);x.fillStyle="#efc64d";x.font="900 40px Segoe UI, Arial";x.fillText(ex.year,24,50);
      x.fillStyle="#15251d";x.font="800 32px Segoe UI, Arial";x.fillText(ex.title,24,118,464);x.fillStyle="#3b4a41";x.font="500 22px Segoe UI, Arial";
      const words=ex.text.split(" ");let l="",y=160;for(const w of words){if(x.measureText(l+w).width>460){x.fillText(l,24,y);y+=30;l="";}l+=w+" ";}x.fillText(l,24,y);panels[i].tex.needsUpdate=true;};
    const drawStats=(info)=>{const c=statsTex.image,x=c.getContext("2d");x.fillStyle="#0b1f16";x.fillRect(0,0,512,300);x.fillStyle="#56dd88";x.font="800 26px Segoe UI, Arial";x.fillText("NOSSA FÁBRICA EM NÚMEROS",24,44);
      x.font="700 24px Segoe UI, Arial";[["Lápis produzidos",info.produced],["Pedidos entregues",info.orders],["Dias de história",info.days],["Visitantes do museu",info.visitors]].forEach(([k,v],i)=>{x.fillStyle="#9fbfad";x.fillText(k,24,100+i*50);x.fillStyle="#fff";x.textAlign="right";x.fillText(String(v),488,100+i*50);x.textAlign="left";});statsTex.needsUpdate=true;};
    return {
      sync:(s)=>{const info=window.getMuseumInfo?.();if(!info)return;const key=info.unlocked+"|"+info.list[5].title+"|"+Math.floor(info.producedRaw/100);
        if(key!==lastKey){lastKey=key;info.list.forEach((ex,i)=>{const on=i<info.unlocked;drawPanel(i,ex,on);pedestals[i].model.visible=on;pedestals[i].cover.visible=!on;pedestals[i].glass.visible=on;});}
        const n=Math.min(16,3+Math.floor(s.reputation/8));visitors.forEach((v,i)=>v.visible=i<n);},
      tick:(dt,t,s,x)=>{giant.rotation.y+=dt*.4;cut.rotation.z+=dt*.25;pedestals.forEach((p,i)=>{if(p.model.visible)p.model.rotation.y+=dt*(.5+i*.05);});
        if(t-lastStats>2){lastStats=t;const info=window.getMuseumInfo?.();if(info)drawStats(info);}
        tickPacer(guide,dt,t,x.k||.5);guideTag.pos.set(guide.position.x,2.1,guide.position.z);visitors.forEach(v=>tickPacer(v,dt,t,x.k||.5));}
    };
  }
  function buildCaldeira(g){
    roomShell(g,18,12,6.5,{wall:0xb08a74,trim:0x3a3f3e,floor:0xa9a79c});
    const shellMat=material(0xa8412f,{metalness:.35,roughness:.45});
    const shell=cylinder(1.8,8,shellMat,0,2.4,1.4,Math.PI/2,32);g.add(shell);
    for(const x of [-4,-1.3,1.3,4])g.add(cylinder(1.86,.2,0x3a3f3e,x,2.4,1.4,Math.PI/2,32));
    for(const x of [-2.6,2.6])g.add(box(1,1.1,3.2,0x4d5558,x,.55,1.4));
    const burner=box(1.1,2.2,2.4,0x2c3b4a,4.55,1.6,1.4);g.add(burner);
    const fireMat=material(0x3a1000,{emissive:new THREE.Color(0xff7a1a),emissiveIntensity:0});
    const fireWin=box(.06,.9,1.3,fireMat,5.12,1.4,1.4);g.add(fireWin);
    const fireLight=new THREE.PointLight(0xff8a2a,0,9,2);fireLight.position.set(6,1.6,1.4);g.add(fireLight);
    addLabel("🔥 Fornalha",new THREE.Vector3(4.6,3.2,1.4),"caldeira",{cls:"small"});
    // válvula de segurança e tubulação de vapor
    g.add(cylinder(.2,.9,0xcbd2cf,1.6,4.6,1.4,0,12));g.add(cylinder(.34,.18,0xe1ad2f,1.6,5.1,1.4,0,12));
    g.add(cylinder(.26,2.6,0xb9c4c0,-1.5,5.3,1.4,0,14));const hp=cylinder(.26,4.4,0xb9c4c0,-1.5,6.5,3.6);hp.rotation.x=Math.PI/2;g.add(hp);
    addLabel("💨 Válvula de segurança",new THREE.Vector3(1.6,5.8,1.4),"caldeira",{cls:"small"});
    // manômetro grande (redesenhado em tempo real)
    const dialTex=canvasTex(256,256,()=>{},false);
    const stand=new THREE.Group();stand.position.set(5.5,0,-3.2);g.add(stand);
    stand.add(box(.15,1.7,.15,0x4d5558,0,.85,.1));stand.add(box(1.7,1.7,.14,0x2c3b4a,0,2.3,.1));
    const dial=new THREE.Mesh(new THREE.PlaneGeometry(1.5,1.5),new THREE.MeshBasicMaterial({map:dialTex,toneMapped:false}));dial.rotation.y=Math.PI;dial.position.set(0,2.3,.02);stand.add(dial);
    const readout=addLabel("",new THREE.Vector3(5.5,3.55,-3.2),"caldeira",{cls:"small"});
    // lenha para a fornalha (espelha o estoque de madeira)
    const logs=[];for(let r=0;r<3;r++)for(let i=0;i<6-r;i++){const log=cylinder(.26,2.6,colors.wood,6.4+i*.0,.28+r*.46,3.2-2.2+i*.5+r*.25,0,10);log.rotation.set(0,0,Math.PI/2);log.position.set(7.2,.28+r*.46,1.2+i*.5+r*.25);g.add(log);logs.push(log);}
    addLabel("🪵 Lenha",new THREE.Vector3(7.2,2,2.4),"caldeira",{cls:"small"});
    g.add(cylinder(.9,2.6,0x2f77b5,-6.8,1.3,3.6,0,20));addLabel("💧 Água",new THREE.Vector3(-6.8,3,3.6),"caldeira",{cls:"small"});
    const puff=makeEmitter(22,{speed:.9,rise:3.5,drift:1.2,spread:.4,size:.9,opacity:.75},g);
    const leak=makeEmitter(8,{speed:.35,rise:1.2,drift:.3,spread:.2,size:.35,opacity:.3},g);
    const people=[addPacer(g,[-7,-3.8],[3.5,-3.8],makeWorker(0xe78630,0x3a3f3e))];
    const drawDial=(b)=>{const c=dialTex.image,x=c.getContext("2d"),cx=128,cy=132,R=104;
      x.fillStyle="#f4f1e8";x.beginPath();x.arc(cx,cy,120,0,Math.PI*2);x.fill();x.lineWidth=10;x.strokeStyle="#3a3f3e";x.stroke();
      const lim={1:100,2:112,3:125}[b.level]||100,ang=v=>Math.PI*.75+(v/130)*Math.PI*1.5;
      const arc=(a,bv,col)=>{x.beginPath();x.arc(cx,cy,R-8,ang(a),ang(bv));x.lineWidth=16;x.strokeStyle=col;x.stroke();};
      arc(0,45,"#9fb3d6");arc(45,lim,"#56b37a");arc(lim,130,"#d65a4f");
      x.fillStyle="#2c3b4a";for(let v=0;v<=130;v+=10){const a=ang(v);x.fillRect(cx+Math.cos(a)*(R-24)-2,cy+Math.sin(a)*(R-24)-2,4,4);}
      x.font="700 20px Consolas, monospace";x.textAlign="center";x.fillText("PSI",cx,cy+50);x.font="800 30px Consolas, monospace";x.fillText(String(Math.round(b.pressure)),cx,cy+84);
      const a=ang(Math.min(130,b.pressure));x.strokeStyle="#c8473b";x.lineWidth=6;x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*(R-18),cy+Math.sin(a)*(R-18));x.stroke();
      x.fillStyle="#3a3f3e";x.beginPath();x.arc(cx,cy,10,0,Math.PI*2);x.fill();dialTex.needsUpdate=true;};
    let lastDial=0;
    return {
      sync:(s)=>syncCount(logs,s.stock.wood/capOf(s)),
      tick:(dt,t,s,x)=>{
        const b=s.boiler||{on:false,pressure:0,fire:1,level:1};const lit=b.on&&!b.broken;
        fireMat.emissiveIntensity=lit?(.6+b.fire*.45+Math.sin(t*13)*.15+Math.sin(t*7.3)*.1):0;
        fireLight.intensity=lit?(1.2+b.fire*.8+Math.sin(t*11)*.3):0;
        if(t-lastDial>.15){lastDial=t;drawDial(b);readout.el.textContent=b.broken?"💥 Caldeira quebrada":!b.on?"Caldeira apagada":`${Math.round(b.pressure)} psi · fogo ${b.fire}`;}
        runEmitter(puff,dt,valvePuff>0,1.6,5.2,1.4,0xf4f6f5,1.4);
        runEmitter(leak,dt,lit&&b.pressure>80,-1.5,6.8,3.6,0xf4f6f5,1);
        people.forEach(p=>tickPacer(p,dt,t,x.k||.5));
      }
    };
  }
  function seatedPerson(color){const g=new THREE.Group();g.add(box(.42,.5,.3,color,0,.95,0));const head=new THREE.Mesh(new THREE.SphereGeometry(.15,10,8),material(0xd9a47c));head.position.y=1.35;g.add(head);return g;}
  function buildAuditorio(g){
    roomShell(g,20,14,7,{wall:0x5a6f8a,trim:0x2c3b4a,floor:0x8b6b45});
    g.add(box(13,.8,3.6,0x3a2a22,0,.4,5.1));g.add(box(13.1,.12,.12,0xe1ad2f,0,.82,3.3));
    const slideTex=canvasTex(1024,460,()=>{},false);
    g.add(box(9.6,4.6,.12,0x1d2624,0,4.3,6.86));
    const screen=new THREE.Mesh(new THREE.PlaneGeometry(9.2,4.13),new THREE.MeshBasicMaterial({map:slideTex,toneMapped:false}));screen.rotation.y=Math.PI;screen.position.set(0,4.3,6.78);g.add(screen);
    g.add(box(.8,1.2,.6,0x5c3f26,4.2,1.4,4.4));g.add(box(.5,.05,.4,0x2c3b4a,4.2,2.05,4.3));
    const speaker=makeWorker(0x2c3b4a,0x1d2624);speaker.children.at(-1).visible=false;speaker.add(box(.08,.4,.04,0xc8473b,0,.9,.16));speaker.position.set(3.4,.8,5.2);speaker.rotation.y=Math.PI;g.add(speaker);
    for(const sx of [-5.8,5.8]){g.add(box(.5,1.6,.5,0x1d2624,sx,1.6,5.5));g.add(cylinder(.18,.05,0x3a3f3e,sx,1.9,5.24,Math.PI/2,12));}
    for(const sx of [-4,4]){const cone=new THREE.Mesh(new THREE.ConeGeometry(.3,.5,12,1,true),material(0x1d2624,{emissive:new THREE.Color(0xfff2c0),emissiveIntensity:.6,side:THREE.DoubleSide}));cone.position.set(sx,6.4,1);cone.rotation.x=-.6;g.add(cone);}
    const audience=[],cols=[0x2f7a52,0x3a5f8f,0xb0603f,0x6c5a8f,0xe8b838,0xd64c46];
    for(let r=0;r<5;r++)for(let c=0;c<9;c++){const x=-6+c*1.5,z=1.6-r*1.55;
      g.add(box(.8,.12,.75,0x8b2530,x,.5,z));g.add(box(.8,.8,.12,0x8b2530,x,.9,z-.38));for(const sx of [-.4,.4])g.add(box(.06,.5,.7,0x3a3f3e,x+sx,.25,z));
      const p=seatedPerson(cols[(r*9+c)%cols.length]);p.position.set(x,0,z-.05);p.visible=false;g.add(p);audience.push(p);}
    addLabel("🎤 Palco",new THREE.Vector3(0,1.6,4.4),"auditorio",{cls:"small"});
    const drawSlide=(s,idx)=>{const c=slideTex.image,x=c.getContext("2d");const t=s.talk,def=t&&TALK_SLIDES[t.id];
      x.fillStyle=t?"#fffdf7":"#141c2b";x.fillRect(0,0,1024,460);
      if(!t){x.fillStyle="#efc64d";x.font="800 54px Segoe UI, Arial";x.textAlign="center";x.fillText("AUDITÓRIO LIVRE",512,200);x.fillStyle="#cfe3d6";x.font="600 30px Segoe UI, Arial";x.fillText("Agende uma palestra na aba Clube & Auditório",512,260);x.textAlign="left";slideTex.needsUpdate=true;return;}
      x.fillStyle="#143c2b";x.fillRect(0,0,1024,90);x.fillStyle="#fff";x.font="800 40px Segoe UI, Arial";x.fillText(t.name,40,60);
      const slides=def||[t.name];const line=slides[idx%slides.length];
      x.fillStyle="#e88d32";x.fillRect(40,150,12,80);x.fillStyle="#15251d";x.font="800 46px Segoe UI, Arial";
      const words=line.split(" ");let l="",y=205;for(const w of words){if(x.measureText(l+w).width>880){x.fillText(l,70,y);y+=58;l="";}l+=w+" ";}x.fillText(l,70,y);
      x.fillStyle="#647067";x.font="600 26px Segoe UI, Arial";x.fillText(`Slide ${idx%slides.length+1} de ${slides.length}`,40,420);
      x.fillStyle="#43a66f";x.fillRect(0,448,1024*((idx%slides.length)+1)/slides.length,12);slideTex.needsUpdate=true;};
    let lastSlide=-1,lastKey="";
    return {
      sync:(s)=>{const n=s.talk?Math.min(45,24+Object.values(s.staff).reduce((a,b)=>a+b,0)*4):2;audience.forEach((p,i)=>p.visible=i<n);speaker.visible=!!s.talk;},
      tick:(dt,t,s,x)=>{const idx=Math.floor(t/5),key=(s.talk?.id||"")+idx;if(key!==lastKey){lastKey=key;drawSlide(s,idx);}
        if(s.talk){speaker.position.x=3.4+Math.sin(t*.5)*1.2;speaker.rotation.y=Math.PI+Math.sin(t*.9)*.4;speaker.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*4+i*Math.PI)*.2);}
        audience.forEach((p,i)=>{if(p.visible)p.rotation.y=Math.sin(t*.7+i)*.12;});}
    };
  }
  function buildClube(g){
    roomShell(g,18,12,5,{wall:0xd9674e,trim:0x6e3522,floor:0x5a4636});
    const tiles=[];for(let i=0;i<6;i++)for(let j=0;j<6;j++){const m=material(0x222222,{emissive:new THREE.Color(0),emissiveIntensity:1,roughness:.3});const tl=box(.95,.06,.95,m,-5+i,.04,-3.5+j);g.add(tl);tiles.push({m,i,j});}
    g.add(box(4.4,1.1,1.2,0x1d2624,-2.5,.55,3.6));g.add(box(4.4,.08,1.2,0x3a3f3e,-2.5,1.14,3.6));
    const speakersL=[];for(const sx of [-5.6,.6]){const sp=new THREE.Group();sp.position.set(sx,0,4);sp.add(box(1,2.2,.9,0x1d2624,0,1.1,0));const woofer=cylinder(.34,.06,0x3a3f3e,0,.8,-.46,0,16);woofer.rotation.x=Math.PI/2;sp.add(woofer);const tw=cylinder(.16,.06,0x3a3f3e,0,1.7,-.46,0,12);tw.rotation.x=Math.PI/2;sp.add(tw);g.add(sp);speakersL.push(sp);}
    const dj=makeWorker(0x1d2624,0xc77dff);dj.children.at(-1).visible=false;dj.position.set(-2.5,0,4.6);dj.rotation.y=Math.PI;g.add(dj);
    g.add(box(1,1.1,7,0x8b6b45,6.2,.55,0));g.add(box(1.2,.08,7.2,0xc9a47a,6.2,1.14,0));
    for(let i=0;i<14;i++)g.add(cylinder(.07,.4,[0x3e9d63,0xd64c46,0xe8b838,0x2f77b5][i%4],8.4,1.9+Math.floor(i/7)*.6,-3+(i%7)*1,0,8));
    g.add(box(.3,.08,7,0x5c3f26,8.4,1.68,0));g.add(box(.3,.08,7,0x5c3f26,8.4,2.28,0));
    for(let i=0;i<4;i++)g.add(cylinder(.22,.75,0x3a3f3e,5.2,.38,-2.6+i*1.7,0,10));
    for(const [tx,tz] of [[2.6,-4],[2.6,-1.2],[2.6,1.6]]){g.add(cylinder(.6,.06,0xf3efe4,tx,.85,tz,0,16));g.add(cylinder(.08,.8,0x3a3f3e,tx,.42,tz,0,8));}
    const ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.45,2),material(0xeef2f5,{metalness:.35,roughness:.25,flatShading:true,emissive:new THREE.Color(0x8fa8c8),emissiveIntensity:.35}));ball.position.set(-2,4.1,-1);g.add(ball);g.add(cylinder(.02,.8,0x9aa2a3,-2,4.7,-1,0,4));
    const l1=new THREE.PointLight(0xff4fc3,0,12,2),l2=new THREE.PointLight(0x4fd6ff,0,12,2);l1.position.set(-2,3,-1);l2.position.set(-2,3,-1);g.add(l1,l2);
    const balloons=[];for(let i=0;i<14;i++){const bg=new THREE.Group();const b=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),material([0xff4f6d,0xffc93c,0x5ce1e6,0x7bff7b,0xc77dff][i%5],{roughness:.3}));b.scale.y=1.15;bg.add(b);bg.add(cylinder(.008,1.2,0xdfe4e3,0,-.85,0,0,4));bg.position.set(-7.5+Math.random()*14,3.6+Math.random()*.7,-5+Math.random()*9);bg.userData.p=Math.random()*6;g.add(bg);balloons.push(bg);}
    const bannerTex=canvasTex(1024,160,()=>{},false);g.add(box(7.4,1.4,.08,0x2b1233,0,3.6,5.9));
    const banner=new THREE.Mesh(new THREE.PlaneGeometry(7.2,1.2),new THREE.MeshBasicMaterial({map:bannerTex,toneMapped:false}));banner.rotation.y=Math.PI;banner.position.set(0,3.6,5.84);g.add(banner);
    const drawBanner=(p)=>{const c=bannerTex.image,x=c.getContext("2d");x.fillStyle="#2b1233";x.fillRect(0,0,1024,160);x.textAlign="center";x.font="900 70px Segoe UI, Arial";x.fillStyle=p?"#ffc93c":"#f7c6e6";x.fillText(p?`🎉 ${p.name}`:"Clube da Fábrica",512,105,980);bannerTex.needsUpdate=true;};
    const dancers=[];for(let i=0;i<16;i++){const d=randomWorker(.95);d.position.set(-5+Math.random()*5,0,-3.5+Math.random()*5);d.userData.p=Math.random()*6;d.visible=false;g.add(d);dancers.push(d);}
    const barPeople=[addPacer(g,[4.6,-3],[4.6,3])];
    let lastBanner=null;
    return {
      sync:(s)=>{const n=s.party?Math.min(16,6+Math.round(s.morale/10)):0;dancers.forEach((d,i)=>d.visible=i<n);balloons.forEach((b,i)=>b.visible=!!s.party||i<4);const k=s.party?s.party.name:"";if(k!==lastBanner){lastBanner=k;drawBanner(s.party);}},
      tick:(dt,t,s,x)=>{const party=!!s.party&&!(s.blackout>0);
        tiles.forEach(tl=>{if(party){tl.m.emissive.setHSL(((tl.i+tl.j)*.08+t*.3)%1,1,.5);tl.m.emissiveIntensity=.6+.5*Math.max(0,Math.sin(t*6+tl.i*1.3+tl.j));}else{tl.m.emissive.setHex(0x2a1a14);tl.m.emissiveIntensity=.3;}});
        speakersL.forEach(sp=>{const k=party?1+Math.max(0,Math.sin(t*14))*.05:1;sp.scale.set(k,k,k);});
        ball.rotation.y+=dt*(party?1.5:.2);
        l1.intensity=party?3:0;l2.intensity=party?3:0;l1.position.set(-2+Math.cos(t*1.3)*3,2.6,-1+Math.sin(t*1.3)*3);l2.position.set(-2+Math.cos(t*1.3+Math.PI)*3,2.6,-1+Math.sin(t*1.3+Math.PI)*3);
        balloons.forEach(b=>{b.position.y+=Math.sin(t*1.2+b.userData.p)*dt*.08;b.rotation.z=Math.sin(t+b.userData.p)*.1;});
        dancers.forEach((d,i)=>{if(!d.visible)return;d.position.y=Math.abs(Math.sin(t*6+d.userData.p))*.18;d.rotation.y=t*(i%2?1.2:-1.2)+d.userData.p;d.userData.legs.forEach((l,j)=>l.rotation.x=Math.sin(t*12+j*Math.PI+i)*.45);});
        dj.rotation.y=Math.PI+Math.sin(t*3)*.25;dj.position.y=party?Math.abs(Math.sin(t*6))*.06:0;
        barPeople.forEach(p=>tickPacer(p,dt,t,x.k||.5));}
    };
  }
  function buildLoja(g){
    roomShell(g,20,12,5,{wall:0xf3efe4,trim:0xc8473b,floor:0xe0d6c4});
    const boxCols=[0xe8b838,0x2e79bd,0xd4483f,0x3e9d63,0x7a54a5,0xe78630];const stockBoxes=[];
    for(const z of [-2.2,.6,3.4]){for(let x=-7;x<=5;x+=4){g.add(box(3.2,.08,1,0x8b6b45,x,.4,z));g.add(box(3.2,.08,1,0x8b6b45,x,1.1,z));g.add(box(3.2,.08,1,0x8b6b45,x,1.8,z));for(const sx of [-1.55,1.55])g.add(box(.08,2,1,0x6e3522,x+sx,1,z));
      for(const y of [.62,1.32,2.02])for(let i=0;i<5;i++){const b=box(.5,.36,.4,boxCols[(i+Math.round(x+z))%6],x-1.2+i*.6,y,z-.15);g.add(b);stockBoxes.push(b);}}}
    const wallTexS=canvasTex(512,140,(x)=>{x.fillStyle="#c8473b";x.fillRect(0,0,512,140);x.fillStyle="#fff";x.font="900 54px Segoe UI, Arial";x.textAlign="center";x.fillText("LÁPIS DIRETO DA FÁBRICA",256,80,490);x.font="700 28px Segoe UI, Arial";x.fillText("preço de fábrica • feito aqui",256,122);},false);
    const wsign=new THREE.Mesh(new THREE.PlaneGeometry(9,2.4),new THREE.MeshBasicMaterial({map:wallTexS,toneMapped:false}));wsign.rotation.y=Math.PI;wsign.position.set(-1,3.3,5.83);g.add(wsign);
    const lg=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1.3),brandMaterial());lg.rotation.y=Math.PI/2;lg.position.set(-9.83,3.2,0);g.add(lg);
    const tills=[];for(const z of [-3.6,-1.2]){g.add(box(1.1,1,1.8,0x2c3b4a,7.6,.5,z));g.add(box(1.2,.06,1.9,0xc9a47a,7.6,1.03,z));g.add(box(.4,.3,.05,screenMat,7.2,1.3,z));const c=makeWorker(0x2c3b4a,0xc8473b);c.children.at(-1).visible=false;c.position.set(8.5,0,z);c.rotation.y=-Math.PI/2;g.add(c);tills.push(c);}
    addLabel("🧾 Caixas",new THREE.Vector3(7.6,2.4,-2.4),"loja",{cls:"small"});
    const promo=new THREE.Group();promo.position.set(4,0,4.6);g.add(promo);promo.add(cylinder(.9,.8,0xe8b838,0,.4,0,0,6));for(let i=0;i<14;i++){const pz=makePencil(RAINBOW[i%6],.9,.05);pz.position.set(Math.cos(i)*.5,1.2,Math.sin(i)*.5);pz.rotation.z=(Math.random()-.5)*.3;promo.add(pz);}
    addLabel("🔥 Promoção",new THREE.Vector3(4,2.4,4.6),"loja",{cls:"small"});
    const priceTex=canvasTex(256,128,()=>{},false);const priceSign=new THREE.Mesh(new THREE.PlaneGeometry(1.6,.8),new THREE.MeshBasicMaterial({map:priceTex,toneMapped:false}));priceSign.rotation.y=Math.PI;priceSign.position.set(4,2.1,5.6);g.add(priceSign);
    const customers=[];for(let i=0;i<12;i++){const lane=[-3.6,-.8,2,4.8][i%4];const c=addPacer(g,[-8.5,lane],[6,lane],makeWorker(0x2c3b4a,[0xd64c46,0x2f77b5,0xe8b838,0x3e9d63,0x7a54a5,0x8b2530][i%6],i%4===0?.7:.9));c.children.at(-1).visible=false;const bag=box(.25,.3,.12,0xc8473b,.3,.7,0);c.add(bag);customers.push(c);}
    let lastPrice="";
    return {
      sync:(s)=>{const sh=s.shop||{stock:0,level:1};syncCount(stockBoxes,sh.stock/([0,400,800,1500][sh.level]||400));const n=Math.min(12,2+Math.round(s.reputation/12)+(s.staff.seller||0)*2);customers.forEach((c,i)=>c.visible=i<n);tills[1].visible=(s.staff.seller||0)>0;
        const key=sh.price;if(key!==lastPrice){lastPrice=key;const x=priceTex.image.getContext("2d");const v={barato:"R$ 26",normal:"R$ 36",premium:"R$ 54"}[key]||"R$ 36";x.fillStyle="#fff7d6";x.fillRect(0,0,256,128);x.fillStyle="#c8473b";x.font="900 48px Segoe UI, Arial";x.textAlign="center";x.fillText(v,128,62);x.fillStyle="#3b4a41";x.font="700 22px Segoe UI, Arial";x.fillText("a dezena",128,100);priceTex.needsUpdate=true;}},
      tick:(dt,t,s,x)=>{promo.rotation.y+=dt*.3;customers.forEach(c=>tickPacer(c,dt,t,x.k||.5));tills.forEach((c,i)=>{if(c.visible)c.rotation.y=-Math.PI/2+Math.sin(t*2+i)*.3;});}
    };
  }
  function buildFeira(g){
    g.userData.bounds={w:38,d:26};
    // pavilhão de exposições: carpete, treliça com refletores e estandes vizinhos
    g.add(box(40,.4,28,0x2a3350,0,-.2,0));
    const carpet=box(38,.02,3.2,0x8b2530,0,.02,-3.2);g.add(carpet);g.add(box(3.2,.02,26,0x8b2530,-7,.02,0));
    g.add(box(40,9,.3,0x3a3f4a,0,4.5,14.1));g.add(box(.3,9,28,0x3a3f4a,-20.1,4.5,0));
    for(let x=-18;x<=18;x+=6){const spot=new THREE.Mesh(new THREE.ConeGeometry(.3,.5,10,1,true),material(0x1d2624,{emissive:new THREE.Color(0xfff2c0),emissiveIntensity:.8,side:THREE.DoubleSide}));spot.position.set(x,9.4,12);spot.rotation.x=.5;g.add(spot);}
    const bannerTex=canvasTex(1024,128,()=>{},false);const hb=new THREE.Mesh(new THREE.PlaneGeometry(22,2.75),new THREE.MeshBasicMaterial({map:bannerTex,toneMapped:false}));hb.rotation.y=Math.PI;hb.position.set(2,7.2,13.9);g.add(hb);
    const others=[["PAPEL & CIA",0x2f77b5],["CADERNOS SOL",0xe8b838],["CANETAS ÁGIL",0x3e9d63],["ARTE LIVRE",0x7a54a5],["MOCHILAS ROTA",0xd64c46]];
    [[-14,6],[-14,-10],[10,-10],[16,6],[2,-10]].forEach(([bx,bz],i)=>{const [name,col]=others[i];const bg=new THREE.Group();bg.position.set(bx,0,bz);g.add(bg);
      bg.add(box(6,.15,5,0x5a5f6a,0,.07,0));bg.add(box(6,3.4,.15,col,0,1.85,2.4));bg.add(box(.15,3.4,5,col,-2.95,1.85,0));bg.add(box(2.4,1,.9,0xf3efe4,.8,.5,-1.2));
      const t=canvasTex(256,64,(x)=>{x.fillStyle="#fff";x.fillRect(0,0,256,64);x.fillStyle="#15251d";x.font="900 30px Segoe UI, Arial";x.textAlign="center";x.fillText(name,128,43);},false);
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(4,1),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));sg.rotation.y=Math.PI;sg.position.set(0,3.9,2.32);bg.add(sg);bg.add(box(4.2,1.1,.1,0x1d2624,0,3.9,2.42));
      const w=makeWorker(0x2c3b4a,col,.9);w.children.at(-1).visible=false;w.position.set(.8,0,-.3);w.rotation.y=Math.PI;bg.add(w);});
    // SEU ESTANDE (cresce conforme o tamanho escolhido)
    const my=new THREE.Group();my.position.set(2,0,6);g.add(my);
    const plat=box(10,.25,7,0x2f5d4a,0,.12,0);my.add(plat);
    const back=box(10,4.2,.2,0xf3efe4,0,2.3,3.4);my.add(back);const side=box(.2,4.2,7,0xf3efe4,-4.9,2.3,0);my.add(side);
    const bigLogo=new THREE.Mesh(new THREE.PlaneGeometry(5,1.9),brandMaterial());bigLogo.rotation.y=Math.PI;bigLogo.position.set(-1.5,3.3,3.28);my.add(bigLogo);
    const tvTex=canvasTex(512,288,()=>{},false);my.add(box(2.6,1.6,.12,0x1d2624,3,3.2,3.26));const tv=new THREE.Mesh(new THREE.PlaneGeometry(2.4,1.35),new THREE.MeshBasicMaterial({map:tvTex,toneMapped:false}));tv.rotation.y=Math.PI;tv.position.set(3,3.2,3.18);my.add(tv);
    const counter=new THREE.Group();counter.position.set(0,0,-2.2);my.add(counter);counter.add(box(4.4,1.1,1,0x2f5d4a,0,.55,0));counter.add(box(4.6,.08,1.1,0xe8b838,0,1.14,0));
    for(let i=0;i<8;i++){const b=box(.45,.32,.3,[0xe8b838,0x2e79bd,0xd4483f,0x3e9d63][i%4],-1.6+i*.46,1.35,0);counter.add(b);}
    const shelves=[];for(let y of [.8,1.6,2.4]){my.add(box(.6,.06,3,0x8b6b45,-4.4,y,0));for(let i=0;i<5;i++){const b=box(.4,.3,.45,[0xe8b838,0x2e79bd,0xd4483f,0x3e9d63,0x7a54a5][i],-4.4,y+.2,-1.2+i*.6);my.add(b);shelves.push(b);}}
    const extraWing=new THREE.Group();my.add(extraWing);extraWing.add(box(5,.25,7,0x2f5d4a,7.5,.12,0));extraWing.add(box(5,4.2,.2,0xf3efe4,7.5,2.3,3.4));
    for(let i=0;i<3;i++){const tb=cylinder(.55,.06,0xf3efe4,6.2+i*1.3,.85,-1+i*.9,0,14);extraWing.add(tb);extraWing.add(cylinder(.07,.8,0x3a3f3e,6.2+i*1.3,.42,-1+i*.9,0,8));}
    const kids=new THREE.Group();my.add(kids);kids.add(box(3,.08,2,0xffffff,7.5,1.2,2));for(let i=0;i<6;i++){const kp=makePencil(RAINBOW[i],.6,.05);kp.position.set(6.4+i*.4,1.35,2);kids.add(kp);}
    const tall=new THREE.Group();my.add(tall);tall.add(box(.3,6.5,.3,0x9aa2a3,-4.7,3.25,3.2));const tower=new THREE.Mesh(new THREE.BoxGeometry(2.4,1.2,.12),brandMaterial());tower.rotation.y=Math.PI;tower.position.set(-4.7,6.2,3.05);tall.add(tower);
    const balloons=[];for(let i=0;i<8;i++){const bl=new THREE.Mesh(new THREE.SphereGeometry(.28,12,10),material([0x2f7a52,0xe8b838,0xf3efe4][i%3],{roughness:.3}));bl.position.set(-4+i*1.1,4.9+Math.sin(i)*.2,3.2);my.add(bl);balloons.push(bl);}
    const recruit=canvasTex(256,96,(x)=>{x.fillStyle="#e8b838";x.fillRect(0,0,256,96);x.fillStyle="#15251d";x.font="900 30px Segoe UI, Arial";x.textAlign="center";x.fillText("TRABALHE",128,40);x.fillText("CONOSCO!",128,78);},false);
    const rsign=new THREE.Group();rsign.position.set(-3.6,0,-3.2);my.add(rsign);rsign.add(box(.1,1.8,.1,0x4d5558,0,.9,0));const rp=new THREE.Mesh(new THREE.PlaneGeometry(1.4,.55),new THREE.MeshBasicMaterial({map:recruit,toneMapped:false,side:THREE.DoubleSide}));rp.position.y=1.9;rsign.add(rp);
    addLabel("🎪 Seu estande",new THREE.Vector3(2,5.6,6),"feira",{cls:"small"});
    const promoters=[];for(let i=0;i<4;i++){const w=makeWorker(0x2f5d4a,0x2f7a52);w.children.at(-1).visible=false;w.position.set(-1.2+i*.9,.25,-1.4);w.rotation.y=Math.PI;my.add(w);promoters.push(w);}
    const candidates=[];for(let i=0;i<4;i++){const c=makeWorker(0x2c3b4a,[0x3a5f8f,0xb0603f,0x6c5a8f,0x8b2530][i],.92);c.children.at(-1).visible=false;c.position.set(-3.6+(i%2)*.7,.25,-4.2-Math.floor(i/2)*.7);my.add(c);candidates.push(c);}
    const crowd=[];for(let i=0;i<24;i++){const lane=i%2?[[-18,-3.2],[18,-3.2]]:[[-7,-12],[-7,12]];const off=(i%5-2)*.5;const v=addPacer(g,[lane[0][0]+(i%2?0:off),lane[0][1]+(i%2?off:0)],[lane[1][0]+(i%2?0:off),lane[1][1]+(i%2?off:0)],makeWorker(0x2c3b4a,[0xd64c46,0x2f77b5,0xe8b838,0x3e9d63,0x7a54a5][i%5],i%6===0?.7:.9));v.children.at(-1).visible=false;crowd.push(v);}
    const statusLabel=addLabel("",new THREE.Vector3(2,1.2,-6),"feira",{cls:"small"});
    let lastKey="",lastTv=0,slide=0;
    const drawBanner=(txt)=>{const x=bannerTex.image.getContext("2d");x.fillStyle="#141c2b";x.fillRect(0,0,1024,128);x.fillStyle="#efc64d";x.font="900 60px Segoe UI, Arial";x.textAlign="center";x.fillText(txt,512,86,980);bannerTex.needsUpdate=true;};
    const drawTv=(s)=>{const x=tvTex.image.getContext("2d");const slides=[["Direto da fábrica","7 etapas, feito com cuidado"],["Lápis de cor, HB, 2B","para escola, arte e escritório"],["Visite nosso museu!","a história do lápis"],[`${Math.floor(s.stats.produced).toLocaleString("pt-BR")} lápis`,"já produzidos"]];const [a,b]=slides[slide%slides.length];
      x.fillStyle="#143c2b";x.fillRect(0,0,512,288);x.fillStyle="#e8b838";x.fillRect(0,250,512*((slide%slides.length)+1)/slides.length,38);x.fillStyle="#fff";x.font="900 44px Segoe UI, Arial";x.textAlign="center";x.fillText(a,256,130,480);x.fillStyle="#cfe3d6";x.font="600 26px Segoe UI, Arial";x.fillText(b,256,180,480);tvTex.needsUpdate=true;};
    return {
      sync:(s)=>{const f=s.fair&&s.fair.day===s.day?s.fair:null;const size=f?f.size:null;
        const key=(f?f.name+size+f.candidates.length:"none")+(s.staff.seller||0);if(key!==lastKey){lastKey=key;drawBanner(f?`${f.name.toUpperCase()}`:"PAVILHÃO DE FEIRAS");}
        my.visible=true;[back,side,bigLogo,counter,tv].forEach(o=>o.visible=!!f);shelves.forEach(o=>o.visible=!!f);
        extraWing.visible=size==="medio"||size==="grande";kids.visible=size==="grande";tall.visible=size==="grande";balloons.forEach(b=>b.visible=!!f);rsign.visible=!!f;
        promoters.forEach((w,i)=>w.visible=!!f&&i<1+(s.staff.seller||0)+(size==="grande"?1:0));
        candidates.forEach((c,i)=>c.visible=!!f&&i<f.candidates.length);
        const crowdN=f?Math.min(24,8+{pequeno:4,medio:9,grande:14}[size]):4;crowd.forEach((c,i)=>c.visible=i<crowdN);
        statusLabel.el.textContent=f?`🧾 ${Math.floor(f.sold)} lápis vendidos no estande`:"Estande ainda não montado — veja a aba Loja & Feiras";},
      tick:(dt,t,s,x)=>{if(t-lastTv>3){lastTv=t;slide++;drawTv(s);}balloons.forEach((b,i)=>{b.position.y=4.9+Math.sin(t*1.3+i)*.15;});
        promoters.forEach((w,i)=>{if(w.visible)w.rotation.y=Math.PI+Math.sin(t*1.5+i)*.5;});crowd.forEach(c=>tickPacer(c,dt,t,x.k||.6));}
    };
  }
  const BUILDERS={loja:buildLoja,feira:buildFeira,auditorio:buildAuditorio,clube:buildClube,caldeira:buildCaldeira,producao:buildProducao,madeira:buildMadeira,tintas:buildTintas,estoque:buildEstoque,acabamento:buildAcabamento,
    logistica:g=>buildDocas(g,3,"logistica"),expedicao:g=>buildDocas(g,2,"expedicao"),admin:buildAdmin,oficinas:buildOficinas,visitantes:buildVisitantes,laboratorio:buildLaboratorio,refeitorio:buildRefeitorio,cantina:buildCantina,ambulatorio:buildAmbulatorio,qualidade:buildQualidade,mina:buildMina,viveiro:buildViveiro,reciclagem:buildReciclagem,subestacao:buildSubestacao,brigada:buildBrigada,portaria:buildPortaria,treinamento:buildTreinamento,creche:buildCreche};
  function capOf(s){return [0,300,500,800][s.warehouse]||300;}
  // quadros/telas na parede do fundo: desgruda da parede e some com janela, pilar e luminária que ficariam na frente
  function fixBackBoards(g){
    const B=g.userData.bounds;if(!B)return;const zb=B.d/2,v=new THREE.Vector3();g.updateMatrixWorld(true);
    const boards=[];
    g.traverse(o=>{if(!o.isMesh||o.geometry.type!=="PlaneGeometry"||Math.abs(Math.abs(o.rotation.y)-Math.PI)>.01||o.rotation.x||o.parent.rotation.y)return;
      o.getWorldPosition(v);v.sub(g.position);if(v.z>zb||zb-v.z>.8)return;boards.push({o,x:v.x,y:v.y,z:v.z,hw:o.geometry.parameters.width*o.scale.x/2,hh:o.geometry.parameters.height*o.scale.y/2});});
    for(const b of boards){
      const dz=(zb-.3)-b.z;
      if(dz<0){for(const c of b.o.parent.children){if(c===b.o||!c.isMesh||c.geometry.type!=="BoxGeometry"||c.geometry.parameters.depth>.2)continue;
          if(Math.abs(c.position.x-b.o.position.x)<.12&&Math.abs(c.position.y-b.o.position.y)<.12&&Math.abs(c.position.z-b.o.position.z)<.15)c.position.z+=dz;}
        b.o.position.z+=dz;}
      g.traverse(o=>{const d=o.userData.backDeco;if(!d||!o.visible)return;
        if(Math.abs(o.position.x-b.x)<b.hw+d.hw+.1&&Math.abs(o.position.y-b.y)<b.hh+d.hh+.1)o.visible=false;});
    }
  }
  function ensureView(id){
    if(views[id])return views[id];
    const g=new THREE.Group();g.visible=false;scene.add(g);
    const api=BUILDERS[id](g)||{};views[id]={group:g,...api};fixBackBoards(g);
    if(currentState)views[id].sync?.(currentState);
    return views[id];
  }

  /* =====================================================================
     COMPLEXO INDUSTRIAL (vista aérea)
     ===================================================================== */
  function addRoad(w,d,x,z,dashed=true){
    const r=new THREE.Mesh(new THREE.BoxGeometry(w,.12,d),roadMat);r.position.set(x,ROAD_Y-.06,z);r.receiveShadow=true;campusRoot.add(r);
    if(dashed){const along=w>d,len=along?w:d;for(let s=-len/2+1.5;s<len/2-1;s+=3.2){const m=new THREE.Mesh(dashGeo,lineMat);m.position.set(along?x+s:x,ROAD_Y+.01,along?z:z+s);if(!along)m.rotation.y=Math.PI/2;campusRoot.add(m);}}
  }
  function doorX(o,i){return -o.w/2+2.4+i*((o.w-4.8)/Math.max(1,o.doors-1));}
  function doorAt(o,x){for(let i=0;i<o.doors;i++)if(Math.abs(doorX(o,i)-x)<1.9)return true;return false;}
  function brandMaterial(){const m=new THREE.MeshBasicMaterial({map:brandTex,side:THREE.DoubleSide,toneMapped:false});brandMats.push(m);return m;}
  function building(o){
    const g=new THREE.Group();g.position.set(o.x,0,o.z);
    const wallMat=o.glass?material(o.wall,{metalness:.55,roughness:.18}):new THREE.MeshStandardMaterial({color:o.wall,map:tiled(panelTex,Math.max(1,Math.round(o.w/3.2)),Math.max(1,Math.round(o.h/3.2))),roughness:.85,metalness:.08});
    const body=shadowed(new THREE.Mesh(new THREE.BoxGeometry(o.w,o.h,o.d),wallMat));body.position.y=o.h/2;g.add(body);
    {const m=1.6,sw=o.w+2*m,sd=o.d+2*m,mx=Math.round(128*m/sw),mz=Math.round(128*m/sd);   // sombra de contato (oclusão) no pé do prédio
      const tex=canvasTex(128,128,(c)=>{c.clearRect(0,0,128,128);c.shadowColor="rgba(0,0,0,1)";c.shadowBlur=Math.max(mx,mz)*1.1;c.fillStyle="rgba(0,0,0,1)";c.fillRect(mx,mz,128-2*mx,128-2*mz);},false);
      const sk=new THREE.Mesh(new THREE.PlaneGeometry(sw,sd),new THREE.MeshBasicMaterial({map:tex,transparent:true,opacity:.34,depthWrite:false}));sk.rotation.x=-Math.PI/2;sk.position.y=.05;sk.renderOrder=1;g.add(sk);}
    g.add(box(o.w+.25,.45,o.d+.25,0x596166,0,.22,0));const trimBox=box(o.w+.08,.32,o.d+.08,o.trim??0x2f5d4a,0,o.h-.16,0);g.add(trimBox);
    if(!o.glass)themeMats.push({m:wallMat,role:"wall",orig:wallMat.color.getHex()});themeMats.push({m:trimBox.material,role:"trim",orig:trimBox.material.color.getHex()});
    const targets=[body];
    const roofMat=o.corrugated?new THREE.MeshStandardMaterial({color:o.roofColor||0xa9adaa,map:tiled(stripes(false,"#e2e4e1","#9a9e9b",4),Math.max(2,Math.round(o.w/1.2)),1),roughness:.85,metalness:.05,side:THREE.DoubleSide}):o.roofColor?material(o.roofColor,{roughness:.8,side:THREE.DoubleSide}):roofMatDark;if(o.roofColor)themeMats.push({m:roofMat,role:"roof",orig:o.roofColor});
    if(o.roof==="saw"){
      const teeth=Math.max(2,Math.round(o.d/2.8)),td=o.d/teeth,th=1.5;
      const shape=new THREE.Shape();shape.moveTo(0,0);shape.lineTo(td,0);shape.lineTo(td,th);shape.lineTo(0,0);
      const geo=new THREE.ExtrudeGeometry(shape,{depth:o.w,bevelEnabled:false});
      for(let i=0;i<teeth;i++){const m=shadowed(new THREE.Mesh(geo,roofMat));m.rotation.y=-Math.PI/2;m.position.set(o.w/2,o.h,-o.d/2+i*td);g.add(m);targets.push(m);
        const sk=new THREE.Mesh(new THREE.BoxGeometry(o.w-.4,th*.72,.05),skylightMat);sk.position.set(0,o.h+th*.46,-o.d/2+(i+1)*td+.03);g.add(sk);}
    }else if(o.roof==="vault"){
      const r=o.d/2+.2,vault=shadowed(new THREE.Mesh(new THREE.CylinderGeometry(r,r,o.w+.3,28,1,true,0,Math.PI),roofMat));vault.rotation.z=Math.PI/2;vault.scale.set(.55,1,1);vault.position.y=o.h;g.add(vault);targets.push(vault);
      for(const sx of [-1,1]){const cap=new THREE.Mesh(new THREE.CircleGeometry(r,28,0,Math.PI),material(o.wall,{side:THREE.DoubleSide}));cap.rotation.y=Math.PI/2;cap.scale.set(1,.55,1);cap.position.set(sx*(o.w/2+.15),o.h,0);g.add(cap);}
      for(let i=-2;i<=2;i++){const rib=new THREE.Mesh(new THREE.TorusGeometry(r+.02,.06,6,28,Math.PI),material(0x2c3b4a));rib.rotation.y=Math.PI/2;rib.scale.set(1,.55,1);rib.position.set(i*o.w/5.2,o.h,0);g.add(rib);}
    }else if(o.roof==="gable"){
      const ridge=1.8,shape=new THREE.Shape();shape.moveTo(-.2,0);shape.lineTo(o.d+.2,0);shape.lineTo(o.d/2,ridge);shape.lineTo(-.2,0);
      const m=shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:o.w+.3,bevelEnabled:false}),roofMat));m.rotation.y=-Math.PI/2;m.position.set(o.w/2+.15,o.h,-o.d/2);g.add(m);targets.push(m);
      if(o.corrugated){const half=o.d/2+.2,len=Math.hypot(half,ridge),ang=Math.atan2(ridge,half),rib=material(0x8f9390,{roughness:.9});
        for(let x=-o.w/2;x<=o.w/2+.01;x+=.42)for(const sd of [-1,1]){const r=box(.08,.06,len,rib,x,o.h+ridge/2+.05,sd*half/2);r.rotation.x=sd*ang;r.castShadow=false;g.add(r);}}
    }else{
      const slab=box(o.w+.1,.2,o.d+.1,roofMat,0,o.h+.08,0);g.add(slab);targets.push(slab);
      const rnd=seededRandom(Math.round(o.x*13+o.z*7+99));
      for(let i=0;i<Math.max(1,Math.floor(o.w*o.d/40));i++){const ux=(rnd()-.5)*o.w*.7,uz=(rnd()-.5)*o.d*.6;g.add(box(1.1,.55,.8,0xa7aeb0,ux,o.h+.45,uz));
        const fan=new THREE.Group();fan.position.set(ux,o.h+.75,uz);for(let b=0;b<3;b++){const arm=new THREE.Group();arm.rotation.y=b*Math.PI*2/3;const blade=box(.5,.03,.12,0x4d5558,.2,0,0);arm.add(blade);fan.add(arm);}g.add(fan);roofFans.push(fan);}
    }
    if(o.windows!==false&&!o.glass){
      // fachada em baias: pilastras na cor do acabamento, janelas com caixilho escuro e peitoril nos quatro lados
      const rows=o.h>5.5?2:1,trimMat=trimBox.material,frameMat=material(0x2f3538,{roughness:.55});
      const nx=Math.max(1,Math.round(o.w/3.6)),nz=Math.max(1,Math.round(o.d/3.6)),bw=o.w/nx,bd=o.d/nz,ph=o.h-.35;
      const ww=Math.min(2.3,bw*.56),wd=Math.min(2.3,bd*.56),wh=o.h>4.2?1.05:.85;
      const nearDoor=(x,gap)=>{for(let k=0;k<(o.doors||0);k++)if(Math.abs(doorX(o,k)-x)<gap)return true;return false;};
      for(let i=0;i<=nx;i++)for(const sz of [-1,1]){const x=-o.w/2+i*bw;if(sz>0&&nearDoor(x,1.6))continue;g.add(box(i===0||i===nx?.4:.28,ph,.34,trimMat,x,ph/2,sz*(o.d/2+.05)));}
      for(let i=1;i<nz;i++)for(const sx of [-1,1])g.add(box(.34,ph,.28,trimMat,sx*(o.w/2+.05),ph/2,-o.d/2+i*bd));
      for(let r=0;r<rows;r++){const y=rows>1?1.7+r*(o.h-3.2):Math.min(o.h*.6,2.25);
        for(let i=0;i<nx;i++){const x=-o.w/2+(i+.5)*bw;for(const sz of [-1,1]){if(sz>0&&y<3.2&&nearDoor(x,1.5+ww/2))continue;
          g.add(box(ww+.24,wh+.22,.08,frameMat,x,y,sz*(o.d/2+.02)));const pane=new THREE.Mesh(new THREE.BoxGeometry(ww,wh,.08),glassMat);pane.position.set(x,y,sz*(o.d/2+.05));g.add(pane);
          g.add(box(ww+.36,.1,.22,trimMat,x,y-wh/2-.14,sz*(o.d/2+.1)));}}
        for(let i=0;i<nz;i++){const z=-o.d/2+(i+.5)*bd;for(const sx of [-1,1]){
          g.add(box(.08,wh+.22,wd+.24,frameMat,sx*(o.w/2+.02),y,z));const pane=new THREE.Mesh(new THREE.BoxGeometry(.08,wh,wd),glassMat);pane.position.set(sx*(o.w/2+.05),y,z);g.add(pane);
          g.add(box(.22,.1,wd+.36,trimMat,sx*(o.w/2+.1),y-wh/2-.14,z));}}}
    }
    if(o.glass){for(let y=1.3;y<o.h;y+=1.3)g.add(box(o.w+.06,.12,o.d+.06,0xdfe4e3,0,y,0));
      const glow=new THREE.Mesh(new THREE.BoxGeometry(o.w+.02,o.h-.6,o.d+.02),material(0x000000,{transparent:true,opacity:.25,emissive:new THREE.Color(0xffd58a),emissiveIntensity:0}));glow.position.y=o.h/2;glow.material.userData.kind="window";nightMats.push(glow.material);g.add(glow);}
    if(o.doors)for(let i=0;i<o.doors;i++){const dx=doorX(o,i),dh=Math.min(3.2,o.h*.55);g.add(box(2.3,dh,.08,new THREE.MeshStandardMaterial({color:0x8d989c,map:doorTex,roughness:.7}),dx,dh/2+.2,o.d/2+.05));g.add(box(2.6,.18,.3,0xe1ad2f,dx,dh+.32,o.d/2+.12));
      g.add(box(3.4,.14,1.5,trimBox.material,dx,dh+.78,o.d/2+.72));g.add(box(3.4,.3,.1,0xe1ad2f,dx,dh+.66,o.d/2+1.44));}   // marquise da entrada
    for(const m of targets){m.userData.view="campus";m.userData.label=o.label;m.userData.action=o.action;clickTargets.push(m);}
    campusObstacles.push({x1:o.x-o.w/2,x2:o.x+o.w/2,z1:o.z-o.d/2,z2:o.z+o.d/2});
    if(o.action)campusDoors.push({action:o.action,label:o.label,icon:o.icon,x:o.x,z:o.z+o.d/2+(o.label==="MUSEU DO LÁPIS"?3.4:1.4)});
    campusRoot.add(g);
    addLabel(`<span class="sl-icon">${o.icon}</span><span class="sl-text">${o.label}</span>`,new THREE.Vector3(o.x,o.h+(o.roof==="saw"?1.9:o.roof==="gable"?2.2:o.roof==="vault"?2.6:1)+(o.labelUp||0),o.z),"campus",{action:o.action,cls:"act"});
    return g;
  }
  function addTree(x,z,scale,rnd){
    const g=new THREE.Group();g.add(cylinder(.18*scale,1.4*scale,0x6b4a30,0,.7*scale,0,0,7));
    const mat=treeMats[Math.floor(rnd()*treeMats.length)];
    if(rnd()<.3){for(let i=0;i<3;i++){const cone=shadowed(new THREE.Mesh(new THREE.ConeGeometry((1.1-i*.25)*scale,1.5*scale,8),mat));cone.position.y=(1.5+i*.75)*scale;g.add(cone);}}
    else for(const [dx,dy,dz,s] of [[0,2,0,1.05],[-.55,1.75,.2,.78],[.55,1.8,-.15,.82],[0,1.7,.55,.72]]){const crown=shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(scale*s,1),mat));crown.position.set(dx*scale,dy*scale,dz*scale);g.add(crown);}
    g.position.set(x,0,z);g.rotation.y=rnd()*6;campusRoot.add(g);
  }
  const CAR_COLORS=[0xe7e7e1,0x273b4a,0x8b2530,0x43607a,0xb6b8b2,0x2d2f30,0x3f6f55,0xd9d4c9,0x6c5a8f,0xc8473b,0x1d3444,0xe8b838];
  function makeParkedCar(color,rnd){   // versão leve (sem faróis) para lotar os estacionamentos
    const g=new THREE.Group(),kind=rnd();const len=kind<.2?1.9:1.6,tall=kind<.2?.55:.45;
    g.add(box(len,tall,.8,color,0,.18+tall/2,0));g.add(box(len*.55,.34,.72,0xb9d0d8,-.1,.36+tall,0));g.add(box(len*.56,.06,.74,color,-.1,.56+tall,0));
    for(const x of [-len*.32,len*.32])for(const sd of [-1,1]){const w=cylinder(.16,.12,0x1b211e,x,.17,sd*.4,0,10);w.rotation.x=Math.PI/2;g.add(w);}
    return g;
  }
  function addBigParking(cx,cz,cols){
    const W=cols*2.35+2.4,D=17.4,rnd=seededRandom(Math.floor((cx+99)*31+cz*7));
    addRoad(W,D,cx,cz,false);
    // corredor central com setas e faixa de pedestres
    for(let i=0;i<cols;i+=3){const a=new THREE.Mesh(new THREE.BoxGeometry(.9,.02,.18),lineMat);a.position.set(cx-W/2+2+i*2.35,ROAD_Y+.01,cz);campusRoot.add(a);}
    for(let i=0;i<5;i++){const st=new THREE.Mesh(new THREE.BoxGeometry(.5,.02,2.2),lineMat);st.position.set(cx+(cx<0?W/2-1.2:-W/2+1.2)+(i-2)*.9*(cx<0?-1:1),ROAD_Y+.01,cz+D/2-1.3);campusRoot.add(st);}
    const rows=[{z:cz-4.3,rot:-Math.PI/2},{z:cz-6.9,rot:Math.PI/2},{z:cz+4.3,rot:Math.PI/2},{z:cz+6.9,rot:-Math.PI/2}];
    rows.forEach((r,ri)=>{
      for(let c=0;c<=cols;c++){const ln=new THREE.Mesh(new THREE.BoxGeometry(.08,.02,2.5),lineMat);ln.position.set(cx-W/2+1.2+c*2.35,ROAD_Y+.01,r.z);campusRoot.add(ln);}
      for(let c=0;c<cols;c++){
        const x=cx-W/2+1.2+2.35/2+c*2.35;
        if(c===0&&ri===0){const acc=new THREE.Mesh(new THREE.BoxGeometry(2.2,.02,2.4),material(0x2f77b5));acc.position.set(x,ROAD_Y+.005,r.z);campusRoot.add(acc);continue;}   // vaga preferencial
        if(rnd()<.14)continue;
        const car=makeParkedCar(CAR_COLORS[Math.floor(rnd()*CAR_COLORS.length)],rnd);car.position.set(x,ROAD_Y,r.z+(rnd()-.5)*.2);car.rotation.y=r.rot+(rnd()-.5)*.06;campusRoot.add(car);
        if((ri===0||ri===2)&&rnd()<.8)commuters.push({car,slot:{x:car.position.x,z:car.position.z,rot:car.rotation.y},cz,side:cx<0?-1:1});
      }
      // meio-fio entre as fileiras de trás
    });
    for(const sd of [-1,1])campusRoot.add(box(W-2,.18,.35,0xcfcbbf,cx,.09,cz+sd*5.6));
    // cobertura com placas solares sobre a fileira externa (lado da avenida)
    const solarMat=material(0x223b5a,{metalness:.6,roughness:.25});
    for(let c=0;c<cols;c+=2){const x=cx-W/2+1.2+2.35+c*2.35;campusRoot.add(box(.16,2.6,.16,0x9aa2a3,x,1.3,cz+7.9));
      const roof=box(4.6,.1,3,solarMat,x,2.72,cz+6.9);roof.rotation.x=-.12;campusRoot.add(roof);campusRoot.add(box(4.6,.08,.08,0xdfe4e3,x,2.62,cz+8.35));}
    // carro manobrando no corredor
    const lane=makePath([[cx-W/2+2,cz-1],[cx+W/2-2,cz-1],[cx+W/2-2,cz+1],[cx-W/2+2,cz+1]]);
    addVehicle(makeCar(CAR_COLORS[Math.floor(rnd()*CAR_COLORS.length)]),lane,rnd()*20,2.4,0);
    addVehicle(makeCar(CAR_COLORS[Math.floor(rnd()*CAR_COLORS.length)]),lane,rnd()*20+26,2.1,0);
  }
  function addParking(x,z,cols,rows){
    const width=cols*2.2+1.6,depth=rows*3.8+.2;addRoad(width,depth,x,z,false);
    const rnd=seededRandom(Math.floor((x+60)*19+(z+60)*7));const palette=[0xe7e7e1,0x273b4a,0x8b2530,0x43607a,0xb6b8b2,0x2d2f30,0x3f6f55];
    for(let r=0;r<rows;r++){const rz=z-depth/2+2+r*3.8;
      for(let c=0;c<=cols;c++){const s=new THREE.Mesh(new THREE.BoxGeometry(.08,.02,3),lineMat);s.position.set(x-width/2+.8+c*2.2,ROAD_Y+.01,rz);campusRoot.add(s);}
      for(let c=0;c<cols;c++)if(rnd()>.22){const car=makeCar(palette[Math.floor(rnd()*palette.length)],.95);car.position.set(x-width/2+1.9+c*2.2,ROAD_Y,rz);car.rotation.y=Math.PI/2*(r%2?1:-1);campusRoot.add(car);}}
  }
  function makePath(pts){const segs=[];let total=0;for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push({a,b,len,start:total});total+=len;}return {segs,total};}
  function pointAt(path,s){s=((s%path.total)+path.total)%path.total;for(const g of path.segs)if(s<=g.start+g.len){const t=(s-g.start)/g.len;return [g.a[0]+(g.b[0]-g.a[0])*t,g.a[1]+(g.b[1]-g.a[1])*t];}return path.segs[0].a;}
  function addVehicle(model,path,s,speed,lane=1.15){Object.assign(model.userData,{path,s,speed,lane});campusRoot.add(model);vehicles.push(model);placeVehicle(model,0,true);}
  function placeVehicle(v,dt,snap){
    const u=v.userData,p=pointAt(u.path,u.s),q=pointAt(u.path,u.s+3);
    let fx=q[0]-p[0],fz=q[1]-p[1];const l=Math.hypot(fx,fz)||1;fx/=l;fz/=l;
    const heading=Math.atan2(-fz,fx);u.heading=snap?heading:lerpAngle(u.heading??heading,heading,Math.min(1,dt*6));
    const hx=Math.cos(u.heading),hz=-Math.sin(u.heading);
    v.position.set(p[0]-hz*u.lane,ROAD_Y,p[1]+hx*u.lane);v.rotation.y=u.heading;
  }
  function addFlag(x,z,color){
    campusRoot.add(cylinder(.05,4.2,0xd8dcda,x,2.1,z,0,8));
    const geo=new THREE.PlaneGeometry(1.5,.95,12,4);geo.translate(.75,0,0);
    const flag=new THREE.Mesh(geo,material(color,{side:THREE.DoubleSide,roughness:.9}));flag.position.set(x+.05,3.7,z);flag.castShadow=true;campusRoot.add(flag);
    flags.push({mesh:flag,base:Float32Array.from(geo.attributes.position.array),phase:Math.random()*6});
  }
  function addStreetLamp(x,z,rot=0){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.add(cylinder(.07,3.4,0x4d5558,0,1.7,0,0,8));g.add(box(.9,.08,.08,0x4d5558,.4,3.35,0));
    g.add(box(.4,.12,.22,nightMats.find(m=>m.userData.kind==="street"),.8,3.28,0));campusRoot.add(g);
  }
  function addBillboard(x,y,z,w,h,postH=0){
    const g=new THREE.Group();g.position.set(x,y,z);
    if(postH)for(const s of [-1,1])g.add(box(.18,postH+h/2,.18,0x4d5558,s*w*.35,(postH+h/2)/2,-.1));
    g.add(box(w+.3,h+.3,.2,0x143c2b,0,postH+h/2,-.12));
    const face=new THREE.Mesh(new THREE.PlaneGeometry(w,h),brandMaterial());face.position.set(0,postH+h/2,.0);g.add(face);
    campusRoot.add(g);return g;
  }
  function brickTexture(){return canvasTex(128,64,(g)=>{g.fillStyle="#8e4a36";g.fillRect(0,0,128,64);g.fillStyle="#b9b0a4";for(let y=0;y<64;y+=16){g.fillRect(0,y,128,2);const off=(y/16)%2?16:0;for(let x=off;x<128;x+=32)g.fillRect(x,y,2,16);}const r=seededRandom(5);for(let i=0;i<60;i++){g.fillStyle=`rgba(${120+r()*60|0},${50+r()*30|0},${30+r()*20|0},.35)`;g.fillRect(r()*128,r()*64,10,6);}});}
  let marqueeTex=null,clubSignTex=null,clubBulbs=[],fireworks=[],fwTimer=0,lastMarquee="",lastClubSign="";
  function drawMarquee(text){const c=marqueeTex.image,g=c.getContext("2d");g.fillStyle="#141c2b";g.fillRect(0,0,512,96);g.strokeStyle="#efc64d";g.lineWidth=6;g.strokeRect(4,4,504,88);
    g.fillStyle="#efc64d";g.font="800 22px Segoe UI, Arial";g.textAlign="center";g.fillText("AUDITÓRIO",256,34);g.fillStyle="#fff";g.font="700 26px Segoe UI, Arial";g.fillText(text,256,72,480);marqueeTex.needsUpdate=true;}
  function drawClubSign(party){const c=clubSignTex.image,g=c.getContext("2d");g.clearRect(0,0,512,128);g.fillStyle="#2b1233";roundRect(g,4,4,504,120,24);g.fill();
    g.font="900 44px Segoe UI, Arial";g.textAlign="center";g.fillStyle=party?"#ff7ad9":"#f7c6e6";g.shadowColor="#ff4fc3";g.shadowBlur=party?24:6;g.fillText("CLUBE DA FÁBRICA",256,62);g.shadowBlur=0;
    g.font="700 22px Segoe UI, Arial";g.fillStyle="#fff2b0";g.fillText(party?`🎉 ${party.name}`:"festas e comemorações",256,100,480);clubSignTex.needsUpdate=true;}
  const CLUB={x:-44.6,z:29,w:13,d:9,h:4.5}, MUSEUM={x:0,z:29,w:20,d:9,h:5.5}, AUD={x:-24,z:29,w:12,d:9,h:5};
  function addSidewalk(x,z,w,d){const m=box(w,.1,d,0xcfcbbf,x,.04,z);m.castShadow=false;campusRoot.add(m);}
  function addHedge(x,z,w,d){campusRoot.add(box(w,.8,d,treeMats[0],x,.4,z));}
  // canteiro elevado com meio-fio, grama, cerca-viva e árvores (usado ao longo das ruas do pátio)
  function addPlanter(x,z,w,d,rnd,trees=true){
    const g=new THREE.Group();g.position.set(x,0,z);g.add(box(w,.34,d,0xa9a597,0,.17,0));g.add(box(w-.24,.1,d-.24,0x6b9d56,0,.37,0));g.add(box(w-.7,.5,d-.7,treeMats[2],0,.62,0));campusRoot.add(g);
    campusObstacles.push({x1:x-w/2,x2:x+w/2,z1:z-d/2,z2:z+d/2});
    if(trees){const along=Math.max(w,d),n=Math.max(1,Math.floor(along/5.5));for(let i=0;i<n;i++){const t=(i+.5)/n-.5;addTree(x+(w>d?t*along:0),z+(w>d?0:t*along),.72+rnd()*.14,rnd);}}
    return g;
  }
  function addBench(x,z,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.add(box(1.6,.1,.5,0x8b6b45,0,.45,0));g.add(box(1.6,.5,.08,0x8b6b45,0,.75,-.22));for(const sx of [-.7,.7])g.add(box(.08,.45,.45,0x3a3f3e,sx,.22,0));campusRoot.add(g);}
  function addCampus(){
    // terreno bem maior: setores separados por ruas e gramados
    const grass=canvasTex(128,128,(g)=>{g.fillStyle="#6fa35a";g.fillRect(0,0,128,128);const r=seededRandom(7);for(let i=0;i<900;i++){g.fillStyle=`rgba(${40+r()*60|0},${100+r()*70|0},${40+r()*30|0},.35)`;g.fillRect(r()*128,r()*128,2,2);}});grass.repeat.set(32,19);
    const ground=new THREE.Mesh(new THREE.BoxGeometry(182,.6,112),new THREE.MeshStandardMaterial({color:0xffffff,map:grass,roughness:1}));ground.position.y=-.3;ground.receiveShadow=true;campusRoot.add(ground);
    const pad=box(116,.08,58,new THREE.MeshStandardMaterial({color:0xffffff,map:tiled(padTex,14.5,7.25),roughness:1}),0,-.02,-15);pad.castShadow=false;campusRoot.add(pad);   // pátio industrial (a área da frente fica em grama)

    // ruas: perímetro + avenida da frente + rua dos fundos + duas transversais
    addRoad(125,5,0,44);addRoad(5,95,-60,-1);addRoad(5,95,60,-1);addRoad(125,4.5,0,-46);
    addRoad(117.5,4.5,0,16);addRoad(117.5,4,0,-24);addRoad(4,62,-32,-15);addRoad(4,62,26,-15);

    // ===== PRODUÇÃO (centro) =====
    const P={x:-5,z:-3,w:34,d:22,h:8};
    building({...P,wall:0xd9d4c8,trim:0x2f5d4a,roof:"saw",label:"PRODUÇÃO",icon:"🏭",action:"producao",doors:0,windows:false,labelUp:4.4});
    const brick=new THREE.MeshStandardMaterial({color:0xffffff,map:tiled(brickTexture(),P.w/2,1),roughness:.9});
    const brickSide=new THREE.MeshStandardMaterial({color:0xffffff,map:tiled(brickTexture(),P.d/2,1),roughness:.9});
    {const band=new THREE.Mesh(new THREE.BoxGeometry(P.w+.08,3,P.d+.08),[brickSide,brickSide,brick,brick,brick,brick]);band.position.set(P.x,1.7,P.z);shadowed(band);campusRoot.add(band);}
    for(let x=-P.w/2+1.5;x<=P.w/2-1.5;x+=3.4)campusRoot.add(box(.35,P.h-.6,.3,0x2f5d4a,P.x+x,P.h/2,P.z+P.d/2+.12));
    for(let x=-P.w/2+3.2;x<=P.w/2-3;x+=3.4){const pane=new THREE.Mesh(new THREE.BoxGeometry(2.6,1.4,.06),glassMat);pane.position.set(P.x+x,5.6,P.z+P.d/2+.08);campusRoot.add(pane);}
    for(let z=-P.d/2+2;z<=P.d/2-2;z+=3){const pane=new THREE.Mesh(new THREE.BoxGeometry(.06,1.4,2.2),glassMat);pane.position.set(P.x+P.w/2+.08,5.6,P.z+z);campusRoot.add(pane);}
    const lobby=new THREE.Group();lobby.position.set(-13,0,P.z+P.d/2+.9);campusRoot.add(lobby);
    lobby.add(box(12,4.4,1.8,material(0x355a70,{metalness:.55,roughness:.18}),0,2.2,0));
    for(let x=-5.5;x<=5.5;x+=1.83)lobby.add(box(.12,4.4,1.86,0xdfe4e3,x,2.2,0));
    const lobbyGlow=new THREE.Mesh(new THREE.BoxGeometry(12.02,3.6,1.82),material(0,{transparent:true,opacity:.25,emissive:new THREE.Color(0xffd58a),emissiveIntensity:0}));lobbyGlow.position.y=2.1;lobbyGlow.material.userData.kind="window";nightMats.push(lobbyGlow.material);lobby.add(lobbyGlow);
    lobby.add(box(14,.35,2.6,0x2f5d4a,0,4.6,.5));for(const x of [-6.6,6.6])lobby.add(box(.22,4.4,.22,0x2f5d4a,x,2.2,1.4));
    lobby.add(box(3,2.6,.08,0x1d2624,0,1.3,.94));
    campusObstacles.push({x1:-19.2,x2:-6.8,z1:P.z+P.d/2,z2:P.z+P.d/2+1.9});{const pd=campusDoors.find(d=>d.action==="producao");if(pd){pd.x=-13;pd.z=P.z+P.d/2+3.1;}}
    for(const x of [2,5.6,9.2]){campusRoot.add(box(2.8,3.2,.1,new THREE.MeshStandardMaterial({color:0x8d989c,map:doorTex,roughness:.7}),x,1.8,P.z+P.d/2+.1));campusRoot.add(box(3.2,.22,.4,0xe1ad2f,x,3.55,P.z+P.d/2+.2));campusRoot.add(box(2.8,.5,1,0x3a3f3e,x,.25,P.z+P.d/2+.55));}
    const td=P.d/Math.max(2,Math.round(P.d/2.8));
    for(const zz of [P.z-P.d/2+td*3,P.z-P.d/2+td*6])for(let x=-15;x<=9;x+=6){campusRoot.add(cylinder(.34,.7,0x9aa2a3,P.x+x+3,P.h+1.85,zz,0,12));const cap=new THREE.Group();cap.position.set(P.x+x+3,P.h+2.3,zz);for(let b=0;b<6;b++){const fin=box(.06,.32,.45,0xb9c3bf,0,0,0);fin.position.set(Math.cos(b)*.28,0,Math.sin(b)*.28);fin.rotation.y=-b;cap.add(fin);}campusRoot.add(cap);roofFans.push(cap);}
    const TW={x:-20.5,z:P.z-P.d/2-1.8};
    campusRoot.add(box(3.6,12,3.6,0xc9c2b0,TW.x,6,TW.z));campusRoot.add(box(3.7,.4,3.7,0x2f5d4a,TW.x,12,TW.z));
    for(let y=2;y<11;y+=2.2){const w=new THREE.Mesh(new THREE.BoxGeometry(.9,1.2,.06),glassMat);w.position.set(TW.x+1.83,y,TW.z);w.rotation.y=Math.PI/2;campusRoot.add(w);}
    for(const [dx,dz] of [[-1,-1],[1,-1],[-1,1],[1,1]])campusRoot.add(box(.14,2,.14,0x4d5558,TW.x+dx,13.2,TW.z+dz));
    campusRoot.add(cylinder(1.4,2.2,0x5d8aa8,TW.x,15.2,TW.z,0,20));campusRoot.add(cylinder(1.45,.2,0xdfe4e3,TW.x,16.35,TW.z,0,20));
    addBillboard(-2,P.h+1.5,P.z+P.d/2-.3,12,3.6,.6);
    // chaminé principal e silos atrás do galpão
    for(let i=0;i<9;i++)campusRoot.add(cylinder(.75-i*.03,1.5,i%2?0xf2efe8:0xc8473b,-15,.75+i*1.5,-19.5,0,16));
    campusRoot.add(cylinder(.8,.3,0x3a3f3e,-15,13.6,-19.5,0,16));
    for(const [sx,sz] of [[-9,-19],[-6,-19]]){campusRoot.add(cylinder(1.15,5.5,0xc3c8c6,sx,2.75,sz,0,20));const cone=shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.2,1,20),material(0x9aa2a3)));cone.position.set(sx,6,sz);campusRoot.add(cone);}
    campusRoot.add(box(3.8,.2,.5,0x8b9496,-7.5,5,-19));
    // caldeira atrás da produção, ligada por um tubo
    building({x:6,z:-19.3,w:9,d:4.6,h:5.4,wall:0x8d5a45,trim:0x3a3f3e,label:"CALDEIRA",icon:"🔥",action:"caldeira",doors:1});
    for(let i=0;i<7;i++)campusRoot.add(cylinder(.55-i*.02,1.6,i%2?0x6d7478:0x3a3f3e,9.5,.8+i*1.6,-20.3,0,14));
    const pipeC=cylinder(.3,3.4,0xb9c4c0,3,3.4,-15.3);pipeC.rotation.x=Math.PI/2;campusRoot.add(pipeC);
    const beacon=cylinder(.26,.8,material(colors.off,{emissive:new THREE.Color(colors.off),emissiveIntensity:.2}),-17,10,-10);campusRoot.add(beacon);machines.campusBeacon=beacon;

    // ===== quarteirão da direita: acabamento, logística, administração =====
    building({x:42,z:3,w:22,d:14,h:7,wall:0x9fb4c0,trim:0x2c4a5e,roof:"saw",label:"ACABAMENTO",icon:"✨",action:"acabamento",doors:3});
    building({x:37,z:-12.5,w:12,d:7,h:5,wall:0xe3d9c2,trim:0xc9772f,label:"LOGÍSTICA",icon:"🚚",action:"logistica",doors:3});
    building({x:51.5,z:-13,w:11,d:12,h:12.5,wall:0x355a70,glass:true,trim:0x1d3444,label:"ADMINISTRAÇÃO",icon:"🏢",action:"admin"});
    campusRoot.add(box(6,.3,2.6,0x1d3444,51.5,3.6,-5.9));for(const sx of [-2.8,2.8])campusRoot.add(box(.2,3.6,.2,0x1d3444,51.5+sx,1.8,-4.8));
    campusRoot.add(cylinder(2.4,.12,0x5d6468,51.5,12.7,-13,0,24));campusRoot.add(cylinder(1.6,.13,0xe8b838,51.5,12.72,-13,0,24));campusRoot.add(cylinder(1.45,.14,0x5d6468,51.5,12.74,-13,0,24));campusRoot.add(box(.4,4,.4,0x9aa2a3,55,14.6,-17));
    const adminLogo=new THREE.Mesh(new THREE.PlaneGeometry(6.4,2.4),brandMaterial());adminLogo.position.set(51.5,10.2,-6.93);campusRoot.add(adminLogo);
    const solar=material(0x223b5a,{metalness:.6,roughness:.25});for(let i=0;i<4;i++){const p=box(2,.08,1.2,solar,32.5+i*2.9,4.5,-13.5);p.rotation.x=-.35;campusRoot.add(p);}
    for(const x of [33.4,40.6]){const t=makeTruck(0xf1ede2,0x2c4a5e);t.rotation.y=-Math.PI/2;t.position.set(x,ROAD_Y,-7);t.scale.setScalar(.85);campusRoot.add(t);}
    forklift=makeForklift();forklift.position.set(44,ROAD_Y,-6);campusRoot.add(forklift);
    // ponte com esteira: PRODUÇÃO → ACABAMENTO passando por cima da rua
    campusRoot.add(box(19.2,.24,1.3,0x3c4a45,21.5,4.6,3));for(const sd of [-1,1])campusRoot.add(box(19.2,.42,.08,0xe1ad2f,21.5,4.85,3+sd*.6));
    for(const x of [16.5,22.5,29.5])campusRoot.add(box(.3,4.6,.3,0x3c4a45,x,2.3,3));
    for(let i=0;i<8;i++){const b=box(.5,.4,.5,0xc69258,12.5+i*2.3,4.95,3);b.add(box(.52,.05,.2,0x2f7a52,0,.12,0));campusRoot.add(b);bridgeBoxes.push(b);}

    // ===== quarteirão da esquerda: madeira =====
    building({x:-46,z:-4,w:12,d:16,h:5.4,wall:0x9a7652,trim:0x5c3f26,roof:"gable",roofColor:0x7a4a33,label:"MADEIRA",icon:"🪵",action:"madeira",doors:1});
    for(let r=0;r<3;r++)for(let i=0;i<5-r;i++){const log=cylinder(.3,3.2,colors.wood,-48+i*.62+r*.31,.3+r*.52,-17,0,10);log.rotation.x=Math.PI/2;campusRoot.add(log);}
    // ===== REFEITÓRIO: todo mundo almoça aqui ao meio-dia =====
    building({x:-45,z:10,w:14,d:7,h:4.8,wall:0xe6dcc3,trim:0xcfc4a8,roof:"gable",corrugated:true,roofColor:0xeef0ee,label:"REFEITÓRIO",icon:"🍽️",action:"refeitorio",doors:2});
    {const awnT=canvasTex(64,32,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?"#ffffff":"#d07a2c";g.fillRect(i*8,0,8,32);}});awnT.repeat.set(3,1);
      const aw=box(9.5,.1,1.3,new THREE.MeshStandardMaterial({color:0xffffff,map:awnT,roughness:.8}),-45,3.15,14.1);aw.rotation.x=.22;campusRoot.add(aw);
      const signT=canvasTex(512,96,(g)=>{g.fillStyle="#d07a2c";roundRect(g,4,4,504,88,18);g.fill();g.fillStyle="#fff";g.font="900 46px Segoe UI, Arial";g.textAlign="center";g.fillText("🍽️ REFEITÓRIO",256,64);},false);
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(4.6,.86),new THREE.MeshBasicMaterial({map:signT,toneMapped:false}));sign.position.set(-45,3.3,13.56);campusRoot.add(sign);}
    emitters.kitchen=makeEmitter(14,{speed:.35,rise:4,drift:1.2,spread:.4,size:.8,opacity:.45},campusRoot);

    // ===== fundos: estoque, tintas, oficinas, expedição =====
    building({x:-12,z:-35,w:14,d:11,h:5.2,wall:0xcfc3a3,trim:0x7a6120,label:"ESTOQUE",icon:"📦",action:"estoque",doors:2});
    building({x:6,z:-35,w:12,d:11,h:5,wall:0xd9d4c9,trim:0x2f77b5,label:"TINTAS",icon:"🎨",action:"tintas",doors:1});
    [0xd64c46,0x2f77b5,0xe5be3e].forEach((c,i)=>{campusRoot.add(cylinder(.85,2.8,c,14.5+i*2,1.4,-35,0,16));campusRoot.add(cylinder(.87,.1,0xdfe4e3,14.5+i*2,2.82,-35,0,16));});
    building({x:-46,z:-35,w:12,d:11,h:4.6,wall:0xb9bdb6,trim:0x4d5558,label:"OFICINAS",icon:"🔧",action:"oficinas",doors:1});
    building({x:33.5,z:-35,w:10,d:9,h:4.8,wall:0xf3f1ec,trim:0x7a54a5,roof:"vault",roofColor:0xdfe4e3,label:"LABORATÓRIO DE CORES",icon:"🔬",action:"laboratorio",doors:1,labelUp:.6});
    [0xd4483f,0xe78630,0xe8b838,0x3e9d63,0x2e79bd,0x7a54a5].forEach((c,i)=>campusRoot.add(box(10.1,.12,.06,material(c,{emissive:new THREE.Color(c),emissiveIntensity:.25}),33.5,4.2-i*.12,-30.45)));
    for(const [fx,c] of [[30,0xff3fa6],[37,0x1fb5b0]]){const fl=new THREE.Group();fl.position.set(fx,0,-28.4);fl.add(cylinder(.5,.3,0xdfe4e3,0,.15,0,0,14));
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.62,16,12),material(c,{transparent:true,opacity:.85,emissive:new THREE.Color(c),emissiveIntensity:.35}));bulb.position.y=.9;fl.add(bulb);fl.add(cylinder(.18,.8,material(0xe8f4f8,{transparent:true,opacity:.5}),0,1.7,0,0,10));campusRoot.add(fl);}
    building({x:46,z:-35,w:12,d:10,h:4.8,wall:0xe0ddd4,trim:0xe78630,label:"EXPEDIÇÃO",icon:"📮",action:"expedicao",doors:2});

    // ===== área de lazer na frente: auditório, museu e clube =====
    // auditório
    building({...AUD,wall:0xe9e6dd,trim:0x8b9496,roof:"gable",corrugated:true,roofColor:0xa9adaa,label:"AUDITÓRIO",icon:"🎤",action:"auditorio",doors:1,windows:false,labelUp:2});
    marqueeTex=canvasTex(512,96,()=>{},false);drawMarquee("Agende uma palestra");
    const marquee=new THREE.Mesh(new THREE.PlaneGeometry(6.5,1.2),new THREE.MeshBasicMaterial({map:marqueeTex,toneMapped:false}));marquee.position.set(AUD.x,4.1,AUD.z+AUD.d/2+.07);campusRoot.add(marquee);
    const audDoor=AUD.x-AUD.w/2+2.4;for(let x=AUD.x-AUD.w/2+1;x<=AUD.x+AUD.w/2-1;x+=1.5){if(Math.abs(x-audDoor)<1.4)continue;const w=new THREE.Mesh(new THREE.BoxGeometry(.9,2.2,.06),glassMat);w.position.set(x,1.6,AUD.z+AUD.d/2+.04);campusRoot.add(w);}
    // AMBULATÓRIO ao lado do auditório
    building({x:-14,z:30,w:6.5,d:6,h:3.4,wall:0xf4f6f6,trim:0xd4483f,roof:"gable",corrugated:true,roofColor:0xa9adaa,label:"AMBULATÓRIO",icon:"🩺",action:"ambulatorio",doors:1});
    {const crossT=canvasTex(128,128,(c)=>{c.fillStyle="#ffffff";c.fillRect(0,0,128,128);c.fillStyle="#d4483f";c.fillRect(44,14,40,100);c.fillRect(14,44,100,40);},false);
      const cross=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:crossT,toneMapped:false}));cross.position.set(-12.2,2.3,33.04);campusRoot.add(cross);
      const am=new THREE.Group();am.position.set(-14,0,35.4);am.add(box(3.2,1.5,1.6,0xf6f6f2,0,1,0));am.add(box(3.22,.25,1.62,0xd4483f,0,1.1,0));for(const x of [-1,1])for(const sd of [-1,1])am.add(wheel(.33,.24,x,.33,sd*.82));campusRoot.add(am);}
    // MUSEU DO LÁPIS: pórtico com colunas, escadaria e jardim
    const M=MUSEUM;building({...M,wall:0xefe6d2,trim:0x8a6a3a,roofColor:0xb9ae98,label:"MUSEU DO LÁPIS",icon:"🏛️",action:"visitantes",doors:0,windows:false,labelUp:3.2});
    const marble=material(0xf4efe4,{roughness:.55});
    for(let i=0;i<3;i++)campusRoot.add(box(12-i*.6,.22,1.4-i*.35,0xdcd5c6,M.x,.11+i*.22,M.z+M.d/2+1.9-i*.32));
    campusRoot.add(box(12.6,.3,2.4,marble,M.x,M.h+.05,M.z+M.d/2+1.1));
    for(let i=0;i<6;i++){const cx=M.x-5.5+i*2.2;campusRoot.add(cylinder(.32,M.h-.95,marble,cx,(M.h-.95)/2+.76,M.z+M.d/2+1.6,0,16));campusRoot.add(box(.8,.2,.8,marble,cx,.76,M.z+M.d/2+1.6));campusRoot.add(box(.8,.22,.8,marble,cx,M.h-.2,M.z+M.d/2+1.6));}
    {const sh=new THREE.Shape();sh.moveTo(-6.6,0);sh.lineTo(6.6,0);sh.lineTo(0,2);sh.lineTo(-6.6,0);const ped=shadowed(new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:2.4,bevelEnabled:false}),marble));ped.position.set(M.x,M.h+.2,M.z+M.d/2-.1);campusRoot.add(ped);
      const tymp=new THREE.Mesh(new THREE.PlaneGeometry(3.4,1),brandMaterial());tymp.position.set(M.x,M.h+.95,M.z+M.d/2+2.32);campusRoot.add(tymp);}
    campusRoot.add(box(3,3.6,.1,0x5c3f26,M.x,1.8+.66,M.z+M.d/2+.06));
    for(const sx of [-1,1]){campusRoot.add(box(1.4,3.8,.08,0x8b2530,M.x+sx*8.2,2.8,M.z+M.d/2+.07));const pen=makePencil(0xe8b838,2.2,.16);pen.position.set(M.x+sx*8.2,2.8,M.z+M.d/2+.13);campusRoot.add(pen);}
    for(let x=M.x-M.w/2+1.5;x<=M.x+M.w/2-1.5;x+=3){if(Math.abs(x-M.x)<7.5)continue;const w=new THREE.Mesh(new THREE.BoxGeometry(1.2,2,.06),glassMat);w.position.set(x,2.6,M.z+M.d/2+.04);campusRoot.add(w);}
    // jardim do museu com escultura de lápis gigante
    addSidewalk(M.x,38.6,4,5.6);addHedge(M.x-6.5,37.8,6,1);addHedge(M.x+6.5,37.8,6,1);
    campusRoot.add(box(3.2,.5,1.4,0xdcd5c6,M.x-9,.25,35.2));const statue=makePencil(0xe8b838,7,.55);statue.rotation.z=-Math.PI/2.6;statue.position.set(M.x-9,2.2,35.2);campusRoot.add(statue);
    for(const [fx,fc] of [[5,0xff4f6d],[7,0xffc93c],[9,0xc77dff],[11,0x5ce1e6]])campusRoot.add(box(1.6,.25,1,fc,M.x+fx,.12,39.6));
    addBench(M.x-4,40.7,Math.PI);addBench(M.x+4,40.7,Math.PI);
    // ===== PRAÇA DA FONTE, em frente ao museu =====
    {const pav=canvasTex(64,64,(g)=>{g.fillStyle="#cfc9bb";g.fillRect(0,0,64,64);g.fillStyle="#c4beb0";g.fillRect(0,0,32,32);g.fillRect(32,32,32,32);g.fillStyle="#b3ad9f";g.fillRect(0,0,64,2);g.fillRect(0,0,2,64);g.fillRect(0,32,64,2);g.fillRect(32,0,2,64);});pav.repeat.set(22,5.2);
      const plaza=box(22,.12,5.2,new THREE.MeshStandardMaterial({color:0xffffff,map:pav,roughness:.95}),M.x,.06,38.7);plaza.castShadow=false;campusRoot.add(plaza);
      const stone=material(0xdcd5c6,{roughness:.6}),rim=material(0xefe9dc,{roughness:.5}),water=material(0x5fb3d6,{transparent:true,opacity:.85,roughness:.12,metalness:.1,emissive:new THREE.Color(0x1f6f8a),emissiveIntensity:.25});
      const F={x:M.x,z:39};
      campusRoot.add(cylinder(2,.6,stone,F.x,.42,F.z,0,32));campusRoot.add(cylinder(2.08,.14,rim,F.x,.76,F.z,0,32));
      const pool=cylinder(1.86,.06,water,F.x,.7,F.z,0,32);pool.castShadow=false;campusRoot.add(pool);
      campusRoot.add(cylinder(.5,.9,stone,F.x,1.2,F.z,0,16));campusRoot.add(cylinder(1.05,.18,stone,F.x,1.72,F.z,0,24));campusRoot.add(cylinder(1.1,.08,rim,F.x,1.84,F.z,0,24));
      const bowl=cylinder(.94,.05,water,F.x,1.86,F.z,0,24);bowl.castShadow=false;campusRoot.add(bowl);
      campusRoot.add(cylinder(.18,.8,stone,F.x,2.28,F.z,0,12));const top=new THREE.Mesh(new THREE.SphereGeometry(.24,14,10),rim);top.position.set(F.x,2.74,F.z);campusRoot.add(shadowed(top));
      campusObstacles.push({x1:F.x-2.1,x2:F.x+2.1,z1:F.z-2.1,z2:F.z+2.1});
      // floreiras, postes de jardim e lixeiras
      for(const sx of [-1,1]){const px=F.x+sx*3.4,pz=37.2;campusRoot.add(cylinder(.48,.55,0xb0603f,px,.28,pz,0,14));campusRoot.add(cylinder(.42,.1,0x4f8f3f,px,.58,pz,0,14));
        [0xff4f6d,0xffc93c,0xc77dff,0xff8a1f,0xffffff].forEach((c,i)=>{const fl=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),material(c));fl.position.set(px+Math.cos(i*1.26)*.26,.7,pz+Math.sin(i*1.26)*.26);campusRoot.add(fl);});
        const streetMat=nightMats.find(m=>m.userData.kind==="street");for(const lz of [36.9,40.9]){const lx=F.x+sx*10.2;campusRoot.add(cylinder(.06,2.4,0x4d5558,lx,1.2,lz,0,8));const globe=new THREE.Mesh(new THREE.SphereGeometry(.24,12,10),streetMat);globe.position.set(lx,2.55,lz);campusRoot.add(globe);}
        campusRoot.add(cylinder(.22,.7,0x2f5d4a,F.x+sx*6.2,.35,40.9,0,10));}
      emitters.fountain=makeEmitter(28,{speed:.9,rise:1.6,drift:.15,spread:.5,size:.5,opacity:.55},campusRoot);}
    // clube da fábrica
    building({...CLUB,wall:0xd9674e,trim:0x6e3522,roofColor:0x8b6b45,label:"CLUBE DA FÁBRICA",icon:"🎉",action:"clube",doors:1,labelUp:2.6});
    clubSignTex=canvasTex(512,128,()=>{},false);drawClubSign(null);
    const csign=new THREE.Mesh(new THREE.PlaneGeometry(6,1.5),new THREE.MeshBasicMaterial({map:clubSignTex,transparent:true,toneMapped:false}));csign.position.set(CLUB.x+1,3.5,CLUB.z+CLUB.d/2+.08);campusRoot.add(csign);
    for(const [dx,c] of [[-3.5,0xe8b838],[0,0x2f77b5],[3.5,0x3e9d63]]){campusRoot.add(cylinder(.05,1.6,0xdfe4e3,CLUB.x+dx,5.5,CLUB.z,0,8));const um=shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.3,.6,10),material(c)));um.position.set(CLUB.x+dx,6.4,CLUB.z);campusRoot.add(um);campusRoot.add(cylinder(.5,.08,0xf3efe4,CLUB.x+dx,5.2,CLUB.z,0,12));}
    for(const [w,d,x,z] of [[CLUB.w,.08,CLUB.x,CLUB.z-CLUB.d/2],[CLUB.w,.08,CLUB.x,CLUB.z+CLUB.d/2],[.08,CLUB.d,CLUB.x-CLUB.w/2,CLUB.z],[.08,CLUB.d,CLUB.x+CLUB.w/2,CLUB.z]])campusRoot.add(box(w,.6,d,0xdfe4e3,x,CLUB.h+.45,z));
    const bulbCols=[0xff4f6d,0xffc93c,0x5ce1e6,0x7bff7b,0xc77dff];
    for(let i=0;i<26;i++){const t=i/25,x=CLUB.x-CLUB.w/2+.3+t*(CLUB.w-.6),y=CLUB.h-.15-Math.sin(t*Math.PI*3)*.35,m=new THREE.MeshBasicMaterial({color:bulbCols[i%5]});const b=new THREE.Mesh(new THREE.SphereGeometry(.11,8,6),m);b.position.set(x,y,CLUB.z+CLUB.d/2+.2);campusRoot.add(b);clubBulbs.push({m,base:new THREE.Color(bulbCols[i%5]),i});}
    for(let i=0;i<90;i++){const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:softTex,transparent:true,depthWrite:false,opacity:0,blending:THREE.AdditiveBlending}));sp.visible=false;sp.scale.set(.7,.7,1);campusRoot.add(sp);fireworks.push({s:sp,v:new THREE.Vector3(),life:0});}
    // calçadas até as entradas, bandeiras e totem
    for(const x of [AUD.x,CLUB.x])addSidewalk(x,37.5,3,7.4);
    addFlag(M.x+6,35.2,0x2f7a52);addFlag(M.x+7.6,35.2,0xe8b838);addFlag(M.x+9.2,35.2,0xf3efe4);
    addBillboard(16,0,49.3,4.4,1.7,1.8);
    // ===== CANTINA DA PRAÇA: quiosque com balcão de atendimento virado para a praça =====
    {const C={x:-14.5,z:38.5,w:6,d:4,h:3.2};building({...C,wall:0xf3e3b5,trim:0xc8473b,roofColor:0xd9674e,label:"CANTINA",icon:"🥪",action:"cantina",doors:0,windows:false,labelUp:.3});
      const fx=C.x+C.w/2;   // face leste, de frente para a praça
      campusRoot.add(box(.12,1.6,3.2,0x2b1f18,fx+.03,2.05,C.z));   // vão do balcão
      campusRoot.add(box(.7,.12,3.4,0x8b6b45,fx+.3,1.15,C.z));campusRoot.add(box(.5,1.0,3.4,0xc8473b,fx+.2,.6,C.z));   // balcão
      campusRoot.add(box(.4,.5,1.4,material(0xbfe0ec,{transparent:true,opacity:.45,roughness:.1}),fx+.35,1.47,C.z-.8));   // vitrine de salgados
      [0xd9a24a,0xe8d9a0,0xd9a24a,0xe8d9a0,0xc8763c].forEach((c,i)=>{const s=new THREE.Mesh(new THREE.SphereGeometry(.09,8,6),material(c));s.position.set(fx+.35,1.32,C.z-1.35+i*.27);campusRoot.add(s);});
      for(const [dz,c] of [[.6,0xe78630],[1.05,0x7a54a5]])campusRoot.add(cylinder(.14,.5,material(c,{transparent:true,opacity:.85}),fx+.35,1.5,C.z+dz,0,10));   // sucos
      const awnT=canvasTex(64,32,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?"#ffffff":"#c8473b";g.fillRect(i*8,0,8,32);}});awnT.repeat.set(3,1);
      const aw=box(1.6,.1,4.4,new THREE.MeshStandardMaterial({color:0xffffff,map:awnT,roughness:.8}),fx+.7,2.75,C.z);aw.rotation.z=.22;campusRoot.add(aw);
      const menuT=canvasTex(256,192,(g)=>{g.fillStyle="#1d2624";g.fillRect(0,0,256,192);g.fillStyle="#f0c040";g.font="900 26px Segoe UI, Arial";g.fillText("🥪 LANCHES",14,34);g.fillStyle="#fff";g.font="700 19px Segoe UI, Arial";["Coxinha ......... R$ 6","Pão de queijo .. R$ 4","Sanduíche ...... R$ 9","Suco ............... R$ 5","Café ............... R$ 3"].forEach((l,i)=>g.fillText(l,14,66+i*25));},false);
      const menu=new THREE.Mesh(new THREE.PlaneGeometry(1.3,.98),new THREE.MeshBasicMaterial({map:menuT,toneMapped:false}));menu.position.set(fx+.06,2.2,C.z+2.2);menu.rotation.y=Math.PI/2;campusRoot.add(menu);
      const cook=makeWorker(0xffffff,0xf6f6f2);cook.position.set(fx-.7,0,C.z);cook.rotation.y=Math.PI/2;campusRoot.add(cook);
      campusRoot.add(cylinder(.22,.7,0x2f5d4a,fx+1.2,.35,C.z-2.4,0,10));   // lixeira
      const cd=campusDoors.find(d=>d.action==="cantina");if(cd){cd.x=fx+1.4;cd.z=C.z;}
      for(const [a,b] of [[C.z-1.3,C.z+1.3],[C.z-.6,C.z+1.6]]){const w=addPacer(campusRoot,[fx+1.1,a],[fx+1.1,b],randomWorker(.9),ROAD_Y);w.children.at(-1).visible=false;walkers.push(w);}
      // mesas com guarda-sol na frente do balcão, na praça
      const umbT=canvasTex(64,16,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?"#ffffff":"#c8473b";g.fillRect(i*8,0,8,16);}});
      const umbMat=new THREE.MeshStandardMaterial({color:0xffffff,map:umbT,roughness:.85,side:THREE.DoubleSide}),cupCols=[0xe78630,0xf3efe4,0x7a54a5];
      [[-7.8,37.9],[-7.8,39.9],[-5.6,38.9]].forEach(([tx,tz],ti)=>{
        campusRoot.add(cylinder(.6,.06,0xf3efe4,tx,.82,tz,0,16));campusRoot.add(cylinder(.06,.8,0x3a3f3e,tx,.41,tz,0,8));
        campusRoot.add(cylinder(.035,2.3,0xdfe4e3,tx,1.95,tz,0,8));const cone=shadowed(new THREE.Mesh(new THREE.ConeGeometry(1.15,.5,12,1,true),umbMat));cone.position.set(tx,2.95,tz);campusRoot.add(cone);
        const tip=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),material(0xc8473b));tip.position.set(tx,3.22,tz);campusRoot.add(tip);
        [1.05,3.14,5.24].forEach((a,k)=>{const cx=tx+Math.cos(a)*.95,cz=tz+Math.sin(a)*.95;campusRoot.add(cylinder(.2,.48,0x8b6b45,cx,.24,cz,0,10));
          if((ti+k)%3!==2){const w=randomWorker(.92);w.position.set(cx,-.22,cz);w.rotation.y=Math.atan2(tx-cx,tz-cz);w.userData.legs.forEach(l=>l.visible=false);w.children.at(-1).visible=false;campusRoot.add(w);
            campusRoot.add(cylinder(.05,.12,cupCols[k],tx+Math.cos(a)*.32,.9,tz+Math.sin(a)*.32,0,8));}});
        campusRoot.add(box(.36,.05,.26,0xe6d3a3,tx-.1,.87,tz+.05));   // prato com lanche
        campusObstacles.push({x1:tx-1.2,x2:tx+1.2,z1:tz-1.2,z2:tz+1.2});});}

    // ===== LOJA DA FÁBRICA: de frente para a rua da cidade, fora do muro =====
    addRoad(70,3.4,0,54.6);addSidewalk(0,52.3,52,1.2);
    const SH={x:0,z:49.2,w:16,d:5,h:4.4};
    building({...SH,wall:0xf3efe4,trim:0xc8473b,roofColor:0x6d7478,label:"LOJA DA FÁBRICA",icon:"🛍️",action:"loja",doors:0,windows:false,labelUp:2.4});
    // a vitrine fica virada para a rua (lado de fora, +z)
    const vitrine=material(0x9cc6d6,{metalness:.4,roughness:.12,emissive:new THREE.Color(0xffe6b0),emissiveIntensity:0});vitrine.userData.kind="window";nightMats.push(vitrine);
    campusRoot.add(box(SH.w-1.2,2.6,.06,vitrine,SH.x,1.7,SH.z+SH.d/2+.04));for(let x=-6;x<=6;x+=3)campusRoot.add(box(.14,2.8,.1,0xc8473b,SH.x+x,1.7,SH.z+SH.d/2+.08));
    campusRoot.add(box(2,2.7,.1,0x5c3f26,SH.x,1.35,SH.z+SH.d/2+.1));
    const awn=canvasTex(64,32,(g)=>{for(let i=0;i<8;i++){g.fillStyle=i%2?"#ffffff":"#c8473b";g.fillRect(i*8,0,8,32);}});awn.repeat.set(4,1);
    const awning=box(SH.w+.4,.12,1.8,new THREE.MeshStandardMaterial({color:0xffffff,map:awn,roughness:.8}),SH.x,3.35,SH.z+SH.d/2+.85);awning.rotation.x=.25;campusRoot.add(awning);
    const shopSignTex=canvasTex(512,110,(g)=>{g.fillStyle="#c8473b";roundRect(g,4,4,504,102,20);g.fill();g.fillStyle="#fff";g.font="900 52px Segoe UI, Arial";g.textAlign="center";g.fillText("LOJA DA FÁBRICA",256,72);},false);
    const shopSign=new THREE.Mesh(new THREE.PlaneGeometry(8,1.7),new THREE.MeshBasicMaterial({map:shopSignTex,toneMapped:false}));shopSign.position.set(SH.x-2.5,4.05,SH.z+SH.d/2+.07);campusRoot.add(shopSign);
    const shopLogo=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.35),brandMaterial());shopLogo.position.set(SH.x+5,4.05,SH.z+SH.d/2+.07);campusRoot.add(shopLogo);
    const roofPencil=makePencil(0xe8b838,9,.5);roofPencil.rotation.z=Math.PI/2;roofPencil.position.set(SH.x,SH.h+1.1,SH.z);campusRoot.add(roofPencil);
    for(const sx of [-1,1])campusRoot.add(box(.12,1.1,.12,0x4d5558,SH.x+sx*3.5,SH.h+.55,SH.z));
    for(let i=0;i<3;i++)for(let j=0;j<4;j++){const b=box(.5,.35,.18,[0xe8b838,0x2e79bd,0xd4483f,0x3e9d63][(i+j)%4],SH.x-6+j*.6+i*4.5,.95+ (j%2)*.36,SH.z+SH.d/2-.25);campusRoot.add(b);}
    addBench(SH.x-10,52.4);addBench(SH.x+10,52.4);
    for(let i=0;i<7;i++){const car=makeParkedCar(CAR_COLORS[(i*5)%CAR_COLORS.length],seededRandom(i+3));car.position.set(SH.x-18+i*2.4+(i>2?14:0),ROAD_Y,55.4);car.rotation.y=i%2?0:Math.PI;campusRoot.add(car);}
    for(const [a,b] of [[-14,-3],[3,14],[-8,8]]){const w=addPacer(campusRoot,[a,52.3],[b,52.3],randomWorker(.9),ROAD_Y);w.children.at(-1).visible=false;walkers.push(w);}

    // canteiros com cerca-viva e árvores ao longo das ruas transversais do pátio
    {const pr=seededRandom(51);
      for(const x of [-35.3,-28.7]){addPlanter(x,-35,1.6,15,pr);addPlanter(x,-4.5,1.6,32,pr);}
      addPlanter(23.5,-35,1.6,15,pr);addPlanter(23.5,-17.2,1.6,6.6,pr);addPlanter(23.5,4.75,1.6,13.5,pr);addPlanter(29.3,-4.5,1.6,32,pr);}
    // estacionamentos e postes
    addBigParking(35.2,29.7,17);   // estacionamento único, dentro do muro da fábrica
    for(const [tx,tz] of [[-55,24],[-55,35],[-34.5,24],[-34.5,35]])addTree(tx,tz,.8,seededRandom(Math.abs(Math.round(tx*3+tz))+7));
    for(let x=-56;x<=56;x+=14){if(Math.abs(x)<10)continue;addStreetLamp(x,47.2,Math.PI/2);}
    for(let z=-40;z<=40;z+=10){addStreetLamp(-63.2,z,0);addStreetLamp(63.2,z,Math.PI);}
    for(let x=-52;x<=52;x+=13)addStreetLamp(x,19.2,Math.PI/2);

    // árvores: fora do perímetro, fileira entre a avenida e a área de lazer, e canteiros entre os quarteirões
    const rnd=seededRandom(84);
    for(let i=0;i<520;i++){const x=(rnd()-.5)*148,z=(rnd()-.5)*110;if(Math.abs(x)<63.5&&z>-49.5&&z<47.5)continue;if(Math.abs(x)>62&&z>-41&&z<47)continue;if(Math.abs(x)<36&&z>46&&z<57)continue;addTree(x,z,.75+rnd()*.6,rnd);}
    for(let x=-55;x<=55;x+=7.4){if(Math.abs(x)>31.5||x>11||Math.abs(x-AUD.x)<2.4||Math.abs(x-M.x)<2.6)continue;addTree(x,21.4,.72,rnd);}
    for(let x=-55;x<=55;x+=9){if(Math.abs(x+32)<4||Math.abs(x-26)<4)continue;addTree(x,-28.6,.68,rnd);}
    for(const [x,z] of [[-38,-8],[-38,2],[-52,-17],[-38,-17],[54,-24.8],[19,-19],[-26,-12],[-26,4],[14,11.5]])addTree(x,z,.72,rnd);

    // pedestres
    for(const [a,b,z] of [[M.x-8,M.x+8,36.5],[M.x-9,M.x+9,41.1],[AUD.x-5,AUD.x+5,35.4],[CLUB.x-5,CLUB.x+5,35.4],[32,52,10.6],[-20,10,11.4],[-8,14,-27]]){const w=addPacer(campusRoot,[a,z],[b,z],randomWorker(.9),ROAD_Y);walkers.push(w);}

    // veículos em circuito
    const loopA=makePath([[-60,44],[60,44],[60,-46],[-60,-46]]);
    const loopB=makePath([[-60,16],[60,16],[60,44],[-60,44]]);
    const loopC=makePath([[-32,16],[-32,-46],[60,-46],[60,16]]);
    const loopD=makePath([[26,16],[26,-24],[-60,-24],[-60,16]]);
    addVehicle(makeTruck(0xf1ede2,0x2e7351),loopA,0,6.5);addVehicle(makeCar(0x8b2530),loopA,100,8.5);addVehicle(makeTruck(0xe4b743,0x2c4a5e),loopA,210,6);addVehicle(makeCar(0x3f6f55),loopA,320,8.5);
    addVehicle(makeBus(),loopB,10,6);addVehicle(makeCar(0x43607a),loopB,140,8);
    addVehicle(makeTruck(0xd9d4c9,0xc8473b,3),loopC,20,6);addVehicle(makeCar(0xe7e7e1),loopC,150,8);
    addVehicle(makeTruck(0xf1ede2,0x6c5a8f),loopD,40,5.5);addVehicle(makeCar(0xe8b838),loopD,120,7.5);
    [[loopA,50,0xc8473b],[loopA,160,0xe7e7e1],[loopA,270,0x1d3444],[loopB,60,0x3e9d63],[loopB,190,0xd9d4c9],[loopC,80,0x6c5a8f],[loopC,200,0x273b4a],[loopD,80,0xb6b8b2]].forEach(([l,sv,c],i)=>addVehicle(makeCar(c),l,sv,7+(i%3)*.8));


    // ===== ÁREA DE EXPANSÃO: novos setores dos dois lados, além da rua do perímetro =====
    addRoad(28,5,-76.5,44,true);addRoad(28,5,76.5,44,true);
    facBuilding("qualidade",{x:18.5,z:-8,w:8,d:6.5,h:4,wall:0xe8eef2,trim:0x2f7a52,label:"QUALIDADE",icon:"🧪",doors:1});
    facBuilding("viveiro",{x:-75,z:-32,w:16,d:14,h:4.6,glass:true,wall:0x8fc9a3,trim:0x2f7a52,label:"VIVEIRO",icon:"🌲",doors:0},ex=>{
      for(let r=0;r<2;r++)for(let i=0;i<9;i++){const p=new THREE.Group();p.position.set(-82+i*1.8,0,-22.6+r*1.8);p.add(cylinder(.05,.5,0x6b4a30,0,.25,0,0,6));const c=new THREE.Mesh(new THREE.ConeGeometry(.35,1,8),treeMats[(i+r)%3]);c.position.y=.9;p.add(c);ex.add(p);}});
    facBuilding("reciclagem",{x:-75,z:-9,w:12,d:8,h:4.2,wall:0x7fa36b,trim:0x2f5d4a,label:"RECICLAGEM",icon:"♻️",doors:1},ex=>{
      [0x2e79bd,0xe8b838,0x3e9d63,0xd4483f].forEach((c,i)=>ex.add(box(1.2,1.3,1.2,c,-79+i*1.5,.65,-3.4)));const pl=new THREE.Mesh(new THREE.ConeGeometry(1.6,1.4,14),material(0xd9b98a,{roughness:1}));pl.position.set(-84,.7,-9);ex.add(pl);});
    facBuilding("subestacao",{x:-82,z:8,w:7,d:5,h:3.2,wall:0xd9dcd6,trim:0xe8b838,label:"SUBESTAÇÃO",icon:"⚡",doors:1},ex=>{
      for(const x of [-74,-70.5,-67]){ex.add(box(1.8,2.2,1.4,0x7f8a8a,x,1.1,8));for(const sx of [-.5,0,.5])ex.add(cylinder(.1,.7,0xb5452f,x+sx,2.55,8,0,8));}
      for(let x=-77;x<=-64;x+=1.3){ex.add(box(.08,1.8,.08,0x9aa2a3,x,.9,4.5));ex.add(box(.08,1.8,.08,0x9aa2a3,x,.9,11.5));}
      for(const z of [4.5,11.5])ex.add(box(13,.06,.06,0x9aa2a3,-70.5,1.7,z));for(const x of [-77,-64])ex.add(box(.06,.06,7,0x9aa2a3,x,1.7,8));
      const solar=material(0x223b5a,{metalness:.6,roughness:.25});for(let r=0;r<2;r++)for(let i=0;i<7;i++){const p=box(2.6,.08,1.5,solar,-84+i*3,1,15.2+r*2.2);p.rotation.x=-.4;ex.add(p);ex.add(box(.1,.9,.1,0x9aa2a3,-84+i*3,.45,15.2+r*2.2));}});
    facBuilding("creche",{x:-75,z:25,w:12,d:7,h:3.6,wall:0xf6e1e7,trim:0xe8b838,roof:"gable",roofColor:0xe86a9a,label:"CRECHE",icon:"👶",doors:1},ex=>{
      const sl=box(2.4,.12,.8,0xe86a9a,-82,.8,31.5);sl.rotation.z=.5;ex.add(sl);ex.add(box(.8,1.6,.8,0x2e79bd,-80.6,.8,31.5));
      for(const x of [-76,-73.5]){ex.add(box(.1,2,.1,0xe8b838,x-1,1,31.5));ex.add(box(.1,2,.1,0xe8b838,x+1,1,31.5));ex.add(box(2.2,.1,.1,0xe8b838,x,2,31.5));ex.add(box(.5,.06,.25,0x7a54a5,x,.6,31.5));}
      ex.add(box(2.6,.25,2.6,0xe6d3a3,-69,.12,31.5));for(let x=-84;x<=-66;x+=1.5)ex.add(box(.06,.8,.06,0xf3efe4,x,.4,33.8));ex.add(box(18,.06,.06,0xf3efe4,-75,.75,33.8));});
    facBuilding("portaria",{x:65.6,z:21.6,w:6,d:4,h:3,wall:0xe9e6dd,trim:0x2f5d4a,label:"PORTARIA",icon:"🛂",doors:1},ex=>{
      // cancelas nas duas portarias do muro da fábrica, cruzando a rua interna (sobem quando um veículo chega)
      for(const sx of [-1,1]){const px=sx*53.6,pz=12.9;ex.add(box(.4,1.1,.4,0x3a3f44,px,.55,pz));const arm=new THREE.Group();arm.position.set(px,1,pz);arm.rotation.y=sx*Math.PI/2;arm.add(box(5.6,.14,.14,0xd4483f,sx*-2.8,0,0));for(let i=0;i<5;i++)arm.add(box(.5,.15,.15,0xf3efe4,sx*-(.8+i*1.1),0,0));ex.add(arm);gates.push({arm,x:px,z:16,side:sx});}});
    for(const [tx,tz] of [[70,-34],[78,-25],[82,-35],[73,-26],[85,-29]])addTree(tx,tz,.9,seededRandom(Math.abs(Math.round(tx*5+tz))+3));   // bosque onde ficava o Galpão 2
    facBuilding("mina",{x:75,z:-8,w:14,d:9,h:5,wall:0x3a3f44,trim:0xe8b838,label:"PREPARO DA MINA",icon:"⚫",doors:1},ex=>{
      for(const z of [-11,-7])ex.add(cylinder(1,4.5,0x2d3a36,84.6,2.25,z,0,16));ex.add(cylinder(.35,3,0x6d7478,70,6.4,-10,0,10));});
    facBuilding("treinamento",{x:75,z:10,w:14,d:8,h:4.5,wall:0xf3e3b5,trim:0x2e79bd,label:"TREINAMENTO",icon:"🎓",doors:1});
    facBuilding("brigada",{x:75,z:28,w:14,d:8,h:4.2,wall:0xd4483f,trim:0xf3efe4,label:"BRIGADA",icon:"🚒",doors:2},ex=>{
      const ft=new THREE.Group();ft.position.set(71,0,34.5);ft.add(box(4,1.5,1.7,0xd4483f,0,1,0));ft.add(box(1.3,1.2,1.7,0xd4483f,2.6,.85,0));ft.add(box(3.6,.1,.4,0xdfe4e3,-.2,1.85,0));
      for(const x of [-1.3,1.1,2.6])for(const sd of [-1,1])ft.add(wheel(.36,.26,x,.36,sd*.88));ex.add(ft);
      const am=new THREE.Group();am.position.set(79.5,0,34.5);am.add(box(3.2,1.5,1.6,0xf6f6f2,0,1,0));am.add(box(3.22,.25,1.62,0xd4483f,0,1.1,0));for(const x of [-1,1])for(const sd of [-1,1])am.add(wheel(.33,.24,x,.33,sd*.82));ex.add(am);});
    for(const [sx,list] of [[-1,[[-32,14],[-9,8],[25,7]]],[1,[[-29,16],[-8,9],[10,8],[28,8]]]])for(const [zc,dd] of list)addRoad(12.5,2.6,sx*68.75,zc+dd/2+1.4,false);
    for(let z=-54;z<=54;z+=4.5){if(Math.abs(z-44)<5)continue;for(const sx of [-1,1])addTree(sx*(89.6+Math.random()*.5),z,.62+Math.random()*.2,Math.random);}
    addFactoryWall();addRoadSigns();addStreetFurniture();
    emitters.chimney=makeEmitter(32,{speed:.16,rise:12,drift:6,spread:.8,size:2,opacity:.7},campusRoot);
    emitters.boilerStack=makeEmitter(26,{speed:.2,rise:9,drift:5,spread:.6,size:1.5,opacity:.65},campusRoot);
    emitters.valve=makeEmitter(20,{speed:.9,rise:5,drift:2,spread:.6,size:1.4,opacity:.8},campusRoot);
    emitters.vent=makeEmitter(14,{speed:.3,rise:4,drift:1.8,spread:.5,size:.8,opacity:.35},campusRoot);
  }
  /* ---------------- bancos e lixeiras nas calçadas das ruas internas ---------------- */
  function addBin(x,z,color=0x2f5d4a){const g=new THREE.Group();g.position.set(x,0,z);g.add(cylinder(.22,.75,color,0,.38,0,0,12));g.add(cylinder(.24,.06,0x1b2b20,0,.79,0,0,12));g.add(cylinder(.12,.03,0x1b2b20,0,.83,0,0,10));campusRoot.add(g);}
  function addStreetFurniture(){
    // banco virado para a rua, com uma lixeira ao lado (rua principal, rua dos fundos e transversal da esquerda)
    const sets=[[-25.5,12.6,0],[-3,12.6,0],[18.5,12.6,0],[36.5,12.6,0],[46.5,12.6,0],[-49.5,19,Math.PI],[-41,19,Math.PI],[-16,19,Math.PI],[7,19,Math.PI],[30,19,Math.PI],
      [-41.5,-27.2,0],[-14.5,-27.2,0],[3.5,-27.2,0],[48.5,-27.2,0],[-25.4,-6,-Math.PI/2],[-25.4,8,-Math.PI/2]];
    for(const [x,z,r] of sets){addBench(x,z,r);addBin(x+Math.cos(r)*1.35,z-Math.sin(r)*1.35);campusObstacles.push({x1:x-.9,x2:x+.9,z1:z-.9,z2:z+.9});}
    // coleta seletiva (azul, verde e amarela) perto do refeitório e na entrada do estacionamento
    for(const [x,z] of [[-36.2,12.7],[33,19]])[0x2e79bd,0x3e9d63,0xe8b838].forEach((c,i)=>addBin(x+i*.55,z,c));
  }
  /* ---------------- placas de sinalização das ruas internas ---------------- */
  function addRoadSigns(){
    const mk=(w,h,draw)=>canvasTex(w,h,(g)=>{g.clearRect(0,0,w,h);draw(g);},false);
    const octo=(g)=>{g.beginPath();for(let i=0;i<8;i++){const a=Math.PI/8+i*Math.PI/4;g[i?"lineTo":"moveTo"](64+Math.cos(a)*60,64+Math.sin(a)*60);}g.closePath();g.fillStyle="#c8281e";g.fill();g.lineWidth=6;g.strokeStyle="#fff";g.stroke();};
    const diamond=(g)=>{g.beginPath();g.moveTo(64,4);g.lineTo(124,64);g.lineTo(64,124);g.lineTo(4,64);g.closePath();g.fillStyle="#f0c040";g.fill();g.lineWidth=6;g.strokeStyle="#1b2b20";g.stroke();};
    const ring=(g)=>{g.beginPath();g.arc(64,64,58,0,7);g.fillStyle="#fff";g.fill();g.lineWidth=11;g.strokeStyle="#c8281e";g.stroke();};
    const T={
      pare:mk(128,128,g=>{octo(g);g.fillStyle="#fff";g.font="900 36px Segoe UI, Arial";g.textAlign="center";g.fillText("PARE",64,77);}),
      vel:mk(128,128,g=>{ring(g);g.fillStyle="#1b2b20";g.font="900 52px Segoe UI, Arial";g.textAlign="center";g.fillText("20",64,76);g.font="700 18px Segoe UI, Arial";g.fillText("km/h",64,100);}),
      ped:mk(128,128,g=>{diamond(g);g.fillStyle="#1b2b20";g.beginPath();g.arc(64,40,8,0,7);g.fill();g.fillRect(58,50,12,24);g.fillRect(52,74,8,22);g.fillRect(68,74,8,22);g.fillRect(44,54,10,6);g.fillRect(74,54,10,6);}),
      truck:mk(128,128,g=>{diamond(g);g.fillStyle="#1b2b20";g.fillRect(30,50,46,30);g.fillRect(76,60,22,20);g.beginPath();g.arc(46,86,8,0,7);g.arc(86,86,8,0,7);g.fill();}),
      nopark:mk(128,128,g=>{ring(g);g.fillStyle="#1b2b20";g.font="900 60px Segoe UI, Arial";g.textAlign="center";g.fillText("E",64,86);g.strokeStyle="#c8281e";g.lineWidth=10;g.beginPath();g.moveTo(24,104);g.lineTo(104,24);g.stroke();})
    };
    const dirTex=(lines)=>{const h=20+lines.length*44;return mk(336,h,g=>{g.fillStyle="#1f7a45";roundRect(g,2,2,332,h-4,10);g.fill();g.lineWidth=4;g.strokeStyle="#fff";g.stroke();g.fillStyle="#fff";g.font="800 25px Segoe UI, Arial";g.textAlign="left";lines.forEach((l,i)=>g.fillText(l,16,44+i*44,300));});};
    // a placa "olha" para o +z do grupo: rot=π encara quem vem do sul, π/2 quem vem do leste, -π/2 quem vem do oeste
    const sign=(x,z,rot,tex,w,h,y)=>{const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;g.add(cylinder(.04,y+h/2,0x8d989c,0,(y+h/2)/2,0,0,8));
      if(w>1){const back=box(w,h,.03,0x6d7478,0,y,-.03);back.castShadow=false;g.add(back);}
      const pl=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.5,toneMapped:false,side:w>1?THREE.FrontSide:THREE.DoubleSide}));pl.position.set(0,y,0);g.add(pl);campusRoot.add(g);};
    const round=(x,z,rot,kind)=>sign(x,z,rot,T[kind],.8,.8,2.1);
    const dir=(x,z,rot,lines)=>sign(x,z,rot,dirTex(lines),2.6,.15+lines.length*.34,2.5);
    // PARE nos cruzamentos das ruas transversais
    round(-29.4,12.7,Math.PI,"pare");round(28.6,12.7,Math.PI,"pare");
    round(-29.4,-27,Math.PI,"pare");round(-34.6,-20.9,0,"pare");round(28.6,-27,Math.PI,"pare");round(23.4,-20.9,0,"pare");
    // limite de velocidade logo depois das portarias e na rua dos fundos
    round(50,18.9,Math.PI/2,"vel");round(-50,13.1,-Math.PI/2,"vel");round(50,-21,Math.PI/2,"vel");round(-50,-27,-Math.PI/2,"vel");
    // travessia de pedestres na frente da Produção, com faixas pintadas aqui e diante do Acabamento
    round(-4,18.9,Math.PI/2,"ped");round(-22,13.1,-Math.PI/2,"ped");
    for(const x0 of [-15,40.2])for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.5,.02,4.2),lineMat);m.position.set(x0+i*.9,ROAD_Y+.01,16);campusRoot.add(m);}
    // saída de caminhões (docas da Logística e do Estoque) e proibido estacionar na rua principal
    round(40,-21,Math.PI/2,"truck");round(-20,-27,-Math.PI/2,"truck");
    round(-24,18.9,Math.PI/2,"nopark");round(16,13.1,-Math.PI/2,"nopark");
    // placas de direção nas duas portarias
    dir(48,19,Math.PI/2,["↑ PRODUÇÃO","→ ESTACIONAMENTO","← LOGÍSTICA"]);
    dir(-48,13.1,-Math.PI/2,["↑ PRODUÇÃO","→ REFEITÓRIO","→ OFICINAS"]);
  }
  /* ---------------- muro da fábrica: fecha só a área fabril; museu, clube, loja, creche e estacionamentos ficam do lado de fora ---------------- */
  function addFactoryWall(){
    const X=57.6,ZN=20,ZS=-42.9,H=2.6;
    const wallMat=material(0xd8d3c6,{roughness:.92}),capMat=material(0x2f5d4a,{roughness:.8}),pilMat=material(0xc6c1b3,{roughness:.9}),gateMat=material(0x2f5d4a),frameMat=material(0x3a3f44,{metalness:.5,roughness:.5});
    const meshTex=canvasTex(64,64,(g)=>{g.strokeStyle="rgba(215,220,224,.95)";g.lineWidth=1.6;for(let k=-2;k<=2;k++){g.beginPath();g.moveTo(k*32,0);g.lineTo(k*32+64,64);g.stroke();g.beginPath();g.moveTo(k*32+64,0);g.lineTo(k*32,64);g.stroke();}});
    const signTex=canvasTex(256,160,(g)=>{g.fillStyle="#f0c040";g.fillRect(0,0,256,160);g.strokeStyle="#1b2b20";g.lineWidth=10;g.strokeRect(5,5,246,150);g.fillStyle="#1b2b20";g.font="900 30px Segoe UI, Arial";g.textAlign="center";g.fillText("ÁREA INDUSTRIAL",128,58);g.font="700 22px Segoe UI, Arial";g.fillText("USO OBRIGATÓRIO",128,100);g.fillText("DE EPI",128,130);},false);
    const sign=(x,y,z,rotY)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(.9,.56),new THREE.MeshBasicMaterial({map:signTex,toneMapped:false,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotY;campusRoot.add(m);};
    const seg=(x1,z1,x2,z2)=>{const alongX=Math.abs(x2-x1)>Math.abs(z2-z1),len=alongX?Math.abs(x2-x1):Math.abs(z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2;
      campusRoot.add(box(alongX?len:.4,H,alongX?.4:len,wallMat,cx,H/2,cz));
      const cap=box(alongX?len+.1:.56,.2,alongX?.56:len+.1,capMat,cx,H+.1,cz);cap.castShadow=false;campusRoot.add(cap);
      const n=Math.max(1,Math.round(len/6));
      for(let i=0;i<=n;i++){const t=i/n,px=alongX?x1+(x2-x1)*t:cx,pz=alongX?cz:z1+(z2-z1)*t;campusRoot.add(box(.62,H+.35,.62,pilMat,px,(H+.35)/2,pz));campusRoot.add(box(.74,.14,.74,capMat,px,H+.42,pz));}
      campusObstacles.push({x1:Math.min(x1,x2)-.3,x2:Math.max(x1,x2)+.3,z1:Math.min(z1,z2)-.3,z2:Math.max(z1,z2)+.3});};
    const panel=(x1,z1,x2,z2,h,y0,rep=.4)=>{const alongX=Math.abs(x2-x1)>Math.abs(z2-z1),len=alongX?Math.abs(x2-x1):Math.abs(z2-z1);
      const m=new THREE.Mesh(new THREE.PlaneGeometry(len,h),new THREE.MeshStandardMaterial({map:tiled(meshTex,len/rep,h/rep),transparent:true,alphaTest:.35,side:THREE.DoubleSide,color:0xdfe4e3,metalness:.4,roughness:.6}));
      m.position.set((x1+x2)/2,y0+h/2,(z1+z2)/2);if(!alongX)m.rotation.y=Math.PI/2;campusRoot.add(m);return m;};
    // portão de correr para veículos (aberto, com a folha encostada por dentro do muro)
    const vgate=(x1,z1,x2,z2,dir)=>{const alongX=Math.abs(x2-x1)>Math.abs(z2-z1),len=alongX?Math.abs(x2-x1):Math.abs(z2-z1),cx=(x1+x2)/2,cz=(z1+z2)/2,inn=(alongX?-Math.sign(cz+15):-Math.sign(cx))*.5;
      for(const [px,pz] of [[x1,z1],[x2,z2]]){campusRoot.add(box(.7,3.2,.7,gateMat,px,1.6,pz));campusRoot.add(box(.82,.14,.82,0xe8b838,px,3.27,pz));}
      const L=len*.92,a=dir>0?(alongX?x2:z2):(alongX?x1:z1),b=a+dir*L,lo=Math.min(a,b),hi=Math.max(a,b);
      const sx1=alongX?lo:cx+inn,sz1=alongX?cz+inn:lo,sx2=alongX?hi:cx+inn,sz2=alongX?cz+inn:hi,mx=(sx1+sx2)/2,mz=(sz1+sz2)/2;
      for(const y of [.34,2.12])campusRoot.add(box(alongX?L:.08,.08,alongX?.08:L,frameMat,mx,y,mz));
      for(const [ex,ez] of [[sx1,sz1],[sx2,sz2]])campusRoot.add(box(.08,1.9,.08,frameMat,ex,1.23,ez));
      panel(sx1,sz1,sx2,sz2,1.7,.4);
      sign(x1+(alongX?0:-inn*.9),1.75,z1+(alongX?-inn*.9:0),alongX?0:Math.PI/2);};
    // catraca de pedestres (para quem chega do estacionamento)
    const pgate=(x,z)=>{for(const dx of [-.9,.9])campusRoot.add(box(.4,2.9,.4,gateMat,x+dx,1.45,z));campusRoot.add(box(2.1,.14,.5,0xe8b838,x,2.97,z));
      campusRoot.add(cylinder(.06,1.05,0x8d989c,x,.52,z,0,8));const arms=new THREE.Group();arms.position.set(x,1.02,z);for(let i=0;i<3;i++){const ag=new THREE.Group();ag.rotation.y=i*Math.PI*2/3;ag.add(box(.72,.04,.04,0x8d989c,.36,0,0));arms.add(ag);}campusRoot.add(arms);
      sign(x-1.7,1.7,z+.32,0);};
    // frente (voltada para a área de lazer), fundos e laterais, com passagens onde as ruas cruzam o muro
    const ZP=39.6;   // o estacionamento (x 14..56,5) fica dentro: o muro da frente avança até perto da avenida nesse trecho
    seg(-X,ZN,-45.5,ZN);seg(-43.7,ZN,12,ZN);pgate(-44.6,ZN);seg(12,ZN,12,ZP);seg(12,ZP,34.1,ZP);pgate(35,ZP);seg(35.9,ZP,X,ZP);
    seg(-X,ZS,-34.5,ZS);seg(-29.5,ZS,23.5,ZS);seg(28.5,ZS,X,ZS);vgate(-34.5,ZS,-29.5,ZS,1);vgate(23.5,ZS,28.5,ZS,1);
    seg(-X,ZN,-X,18.7);seg(X,ZP,X,32.3);seg(X,27.1,X,18.7);vgate(X,27.1,X,32.3,-1);   // saída dos carros para a rua lateral
    for(const sx of [-1,1]){seg(sx*X,13.3,sx*X,-21.5);seg(sx*X,-26.5,sx*X,ZS);vgate(sx*X,-26.5,sx*X,-21.5,-1);
      // PORTARIA na rua interna: pilares do portão, guarita com vigia, cobertura com o logo virado para fora e faixa de pedestres
      for(const pz of [13.3,18.7]){campusRoot.add(box(.7,3.2,.7,gateMat,sx*X,1.6,pz));campusRoot.add(box(.82,.14,.82,0xe8b838,sx*X,3.27,pz));}
      const gx=sx*54.9,gz=11.2;
      const pad=box(4.2,.1,3.6,0xcfcbbf,gx,.05,gz);pad.castShadow=false;campusRoot.add(pad);
      campusRoot.add(box(2.6,2.7,2.4,0xe9e6dd,gx,1.4,gz));
      campusRoot.add(box(2,.9,.06,glassMat,gx,1.75,gz+1.23));for(const sd of [-1,1])campusRoot.add(box(.06,.9,1.6,glassMat,gx+sd*1.23,1.75,gz));
      campusRoot.add(box(3.2,.2,3,0x2f5d4a,gx,2.85,gz));campusRoot.add(box(.62,.6,.62,0x2f5d4a,gx,3.35,gz));
      const st=canvasTex(256,64,(g)=>{g.fillStyle="#2f5d4a";roundRect(g,2,2,252,60,10);g.fill();g.fillStyle="#fff";g.font="900 30px Segoe UI, Arial";g.textAlign="center";g.fillText("PORTARIA",128,44);},false);
      const sg=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.48),new THREE.MeshBasicMaterial({map:st,toneMapped:false}));sg.position.set(gx,2.45,gz+1.24);campusRoot.add(sg);
      const guard=makeWorker(0x1d3444,0x2c4a5e);guard.position.set(gx+sx*.5,0,gz+2.1);campusRoot.add(guard);
      const px=sx*55.5;for(const pz of [13.3,18.7])campusRoot.add(box(.32,4.5,.32,0x2f5d4a,px,2.25,pz));
      campusRoot.add(box(5.6,.22,7.4,0xd9d4c8,px,4.6,16));campusRoot.add(box(.18,1.2,7.4,0x2f5d4a,px+sx*2.7,4.85,16));
      const logo=new THREE.Mesh(new THREE.PlaneGeometry(4.4,1),brandMaterial());logo.position.set(px+sx*2.8,4.85,16);logo.rotation.y=sx*Math.PI/2;campusRoot.add(logo);
      for(let i=0;i<5;i++){const m=new THREE.Mesh(new THREE.BoxGeometry(.5,.02,4.2),lineMat);m.position.set(sx*(49.6+i*.9),ROAD_Y+.01,16);campusRoot.add(m);}
      sign(sx*(X+.26),1.7,20.9,sx*Math.PI/2);
      // totem com o nome da fábrica na entrada (usa a marca do jogo: logo + nome)
      const tx=sx*55.6,tz=8.6;campusRoot.add(box(1.6,.5,1.1,0x596166,tx,.25,tz));campusRoot.add(box(.5,6.4,.5,0x2f5d4a,tx,3.45,tz));
      campusRoot.add(box(.34,1.9,5.6,0x143c2b,tx,6.3,tz));campusRoot.add(box(.4,.14,5.6,0xe8b838,tx,5.28,tz));
      for(const f of [-1,1]){const pl=new THREE.Mesh(new THREE.PlaneGeometry(5.2,1.7),brandMaterial());pl.position.set(tx+f*.18,6.3,tz);pl.rotation.y=f*Math.PI/2;campusRoot.add(pl);}
      campusObstacles.push({x1:tx-.8,x2:tx+.8,z1:tz-.55,z2:tz+.55});
      campusObstacles.push({x1:gx-1.4,x2:gx+1.4,z1:gz-1.3,z2:gz+1.3});
    }
  }
  function launchFirework(){
    const cx=CLUB.x+(Math.random()-.5)*9,cy=13+Math.random()*6,cz=CLUB.z+(Math.random()-.5)*5,col=new THREE.Color().setHSL(Math.random(),1,.6);
    let n=0;for(const f of fireworks){if(f.life>0)continue;f.s.visible=true;f.s.position.set(cx,cy,cz);f.v.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(4+Math.random()*3);f.life=1.4+Math.random()*.5;f.s.material.color.copy(col);if(++n>=28)break;}
  }
  function tickClubOutside(dt,t,s){
    const party=s.party,night=1-daylightAt(((s.minute/60)%24+24)%24);
    clubBulbs.forEach(b=>{const on=s.blackout>0?0:party?(.5+.5*Math.sin(t*6+b.i*.9)):(.35+night*.65);b.m.color.copy(b.base).multiplyScalar(Math.max(.15,on));});
    const key=party?party.name:"";if(key!==lastClubSign){lastClubSign=key;drawClubSign(party);}
    const nx=(s.schedule||[]).find(x=>x.type==="talk");const mk=s.talk?`Agora: ${s.talk.name}`:nx?`Dia ${nx.day}: ${nx.name}`:"Agende uma palestra";if(mk!==lastMarquee){lastMarquee=mk;drawMarquee(mk);}
    if(party&&s.blackout<=0){fwTimer-=dt;if(fwTimer<=0){fwTimer=.7+Math.random()*.8;launchFirework();}}
    fireworks.forEach(f=>{if(f.life<=0){f.s.visible=false;return;}f.life-=dt;f.v.y-=3*dt;f.v.multiplyScalar(1-dt*.8);f.s.position.addScaledVector(f.v,dt);f.s.material.opacity=Math.min(1,f.life*1.2);f.s.scale.setScalar(.35+f.life*.4);});
  }
  /* ---------------- marca (logo + nome) ---------------- */
  function drawBrand(name,img){
    const c=document.createElement("canvas");c.width=1024;c.height=384;const g=c.getContext("2d");
    g.fillStyle="#fffdf7";roundRect(g,10,10,1004,364,44);g.fill();g.lineWidth=12;g.strokeStyle="#143c2b";g.stroke();
    if(img){const s=Math.min(300/img.width,300/img.height);const w=img.width*s,h=img.height*s;g.drawImage(img,40+(300-w)/2,42+(300-h)/2,w,h);}
    else{g.font="220px 'Segoe UI Emoji','Apple Color Emoji',sans-serif";g.textBaseline="middle";g.textAlign="center";g.fillText("✏️",190,200);}
    g.fillStyle="#143c2b";g.textAlign="left";g.textBaseline="middle";
    const words=(name||"Fábrica de Lápis").toUpperCase().split(/\s+/);let size=96,lines;
    const fit=()=>{g.font=`900 ${size}px 'Segoe UI',Arial,sans-serif`;lines=[];let line="";for(const w of words){const test=line?line+" "+w:w;if(g.measureText(test).width>600&&line){lines.push(line);line=w;}else line=test;}lines.push(line);return lines.length<=2&&lines.every(l=>g.measureText(l).width<=600);};
    while(!fit()&&size>36)size-=6;
    const lh=size*1.05,top=192-(lines.length-1)*lh/2;lines.forEach((l,i)=>g.fillText(l,370,top+i*lh));
    const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;tex.anisotropy=8;
    brandTex=tex;brandMats.forEach(m=>{m.map=tex;m.needsUpdate=true;});
  }
  function setBrand(brand={}){
    if(!renderer)return;
    if(brand.logo){const img=new Image();img.onload=()=>drawBrand(brand.name,img);img.onerror=()=>drawBrand(brand.name,null);img.src=brand.logo;}
    else drawBrand(brand.name,null);
  }

  /* ---------------- céu, estrelas e lua ---------------- */
  function makeSky(){
    skyMat=new THREE.ShaderMaterial({uniforms:{top:{value:new THREE.Color(0x5b9bd5)},bottom:{value:new THREE.Color(0xdcebf0)}},side:THREE.BackSide,depthWrite:false,fog:false,
      vertexShader:"varying vec3 vP;void main(){vP=normalize((modelMatrix*vec4(position,1.)).xyz);gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(position,1.);}",
      fragmentShader:"uniform vec3 top;uniform vec3 bottom;varying vec3 vP;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(-.02,.55,vP.y)),1.);\n#include <encodings_fragment>\n}"});
    skyMesh=new THREE.Mesh(new THREE.SphereGeometry(320,24,12),skyMat);scene.add(skyMesh);
    const pts=[];const r=seededRandom(3);for(let i=0;i<700;i++){const th=r()*Math.PI*2,ph=Math.acos(r()*.95);pts.push(Math.sin(ph)*Math.cos(th)*300,Math.cos(ph)*300,Math.sin(ph)*Math.sin(th)*300);}
    const sg=new THREE.BufferGeometry();sg.setAttribute("position",new THREE.Float32BufferAttribute(pts,3));
    stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false,depthWrite:false}));scene.add(stars);
    moon=new THREE.Mesh(new THREE.SphereGeometry(7,20,14),new THREE.MeshBasicMaterial({color:0xf3f0dc,fog:false,transparent:true,opacity:0}));scene.add(moon);
  }
  const SKY_KEYS=[[0,0x070f22,0x141d36],[4.8,0x070f22,0x141d36],[6.2,0x34497a,0xf2a36f],[7.6,0x5b9bd5,0xdcebf0],[16.3,0x5b9bd5,0xdcebf0],[17.7,0x3f5f8f,0xf0a06a],[18.9,0x152348,0x3b3656],[20.2,0x070f22,0x141d36],[24,0x070f22,0x141d36]];
  const _c1=new THREE.Color(),_c2=new THREE.Color(),_c3=new THREE.Color(),_c4=new THREE.Color();
  function skyAt(h,outTop,outBottom){for(let i=0;i<SKY_KEYS.length-1;i++){const a=SKY_KEYS[i],b=SKY_KEYS[i+1];if(h>=a[0]&&h<=b[0]){const k=(h-a[0])/(b[0]-a[0]);outTop.copy(_c1.setHex(a[1])).lerp(_c2.setHex(b[1]),k);outBottom.copy(_c3.setHex(a[2])).lerp(_c4.setHex(b[2]),k);return;}}}
  function daylightAt(h){return clamp01((h-5.6)/1.8)*clamp01((19-h)/1.8);}

  /* ---------------- câmera e controles ---------------- */
  function applyCamera(){const y=cur.ay;camera.position.set(cur.look.x+Math.sin(cur.ax)*Math.cos(y)*cur.dist,cur.look.y+Math.sin(y)*cur.dist*.78+2,cur.look.z+Math.cos(cur.ax)*Math.cos(y)*cur.dist);camera.lookAt(cur.look);}
  /* =====================================================================
     MODO PASSEIO: você controla o gerente em terceira pessoa
     ===================================================================== */
  const campusObstacles=[],campusDoors=[],keys={};
  const walkMode={on:false,avatar:null,tag:null,vel:0,from:null,prompt:null,pad:null,target:null};
  function makeAvatar(){
    const a=makeWorker(0x2c3b4a,0x1d2624,1.05);a.children.at(-1).visible=false;a.add(box(.08,.42,.04,0xc8473b,0,.9,.16));
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.17,12,8,0,Math.PI*2,0,Math.PI/2),material(0x3a2a1e));hair.position.y=1.36;a.add(hair);
    const ring=new THREE.Mesh(new THREE.RingGeometry(.45,.6,28),new THREE.MeshBasicMaterial({color:0xe8b838,transparent:true,opacity:.75,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.04;a.add(ring);
    a.visible=false;scene.add(a);return a;
  }
  function roomBounds(){if(viewMode==="campus")return{x1:-89,x2:89,z1:-54,z2:55};const b=views[viewMode]?.group.userData.bounds||{w:20,d:12};return{x1:-b.w/2+.6,x2:b.w/2-.6,z1:-b.d/2+.6,z2:b.d/2-.6};}
  function obstaclesNow(){
    if(viewMode==="campus")return campusObstacles;
    if(viewMode==="producao"){const list=Object.values(machines).filter(m=>m.group&&m.type!=null).map(m=>({x1:m.group.position.x-2.2,x2:m.group.position.x+2.2,z1:-2.7,z2:2.7}));list.push({x1:-21.6,x2:21.6,z1:-1.05,z2:1.05});for(const L of extraLines){if(!L.group.visible)continue;const z=L.group.position.z;LINE_X.forEach(x=>list.push({x1:x-2.2,x2:x+2.2,z1:z-2.7,z2:z+2.7}));list.push({x1:-20,x2:20,z1:z-1.05,z2:z+1.05});}return list;}
    return [];
  }
  function collide(p,r=.4){
    const b=roomBounds();p.x=Math.max(b.x1,Math.min(b.x2,p.x));p.z=Math.max(b.z1,Math.min(b.z2,p.z));
    for(const o of obstaclesNow()){
      if(p.x+r<=o.x1||p.x-r>=o.x2||p.z+r<=o.z1||p.z-r>=o.z2)continue;
      const dl=p.x+r-o.x1,dr=o.x2-(p.x-r),dt=p.z+r-o.z1,db=o.z2-(p.z-r),m=Math.min(dl,dr,dt,db);
      if(m===dl)p.x=o.x1-r;else if(m===dr)p.x=o.x2+r;else if(m===dt)p.z=o.z1-r;else p.z=o.z2+r;
    }
  }
  function spawnFor(mode){
    if(mode==="campus"){const d=walkMode.from&&campusDoors.find(x=>x.action===walkMode.from);return d?{x:d.x,z:d.z+1.2,rot:0}:{x:-13,z:12,rot:0};}
    const b=roomBounds();return{x:mode==="feira"?-6:0,z:b.z1+1,rot:0};
  }
  function placeAvatar(mode){const sp=spawnFor(mode);walkMode.avatar.position.set(sp.x,viewMode==="campus"?ROAD_Y:0,sp.z);walkMode.avatar.rotation.y=sp.rot;collide(walkMode.avatar.position);
    tgt.look.set(sp.x,1.4,sp.z);cur.look.copy(tgt.look);Object.assign(tgt,{dist:mode==="campus"?11:9,ay:mode==="campus"?.42:.62});tgt.ax=mode==="campus"?0:Math.PI;cur.ax=tgt.ax;walkMode.avatar.rotation.y=mode==="campus"?Math.PI:0;cur.dist=tgt.dist*1.6;cur.ay=.6;}
  function setWalk(on){
    if(on===walkMode.on)return;walkMode.on=on;
    if(!walkMode.avatar){walkMode.avatar=makeAvatar();walkMode.tag=addLabel("👔 Você",new THREE.Vector3(),"__walk",{cls:"small you",prio:9});}
    walkMode.avatar.visible=on;
    document.getElementById("walkBtn")?.classList.toggle("active",on);
    container.classList.toggle("walking",on);
    if(on){placeAvatar(viewMode);lastInteract=performance.now();}
    else{walkMode.prompt.hidden=true;setView(viewMode);}
    updateHelp();
  }
  function updateHelp(){const h=document.getElementById("cameraHelp");if(!h)return;
    if(walkMode.on)h.textContent="WASD ou setas: andar • Shift: correr • Arraste: girar a câmera • E: entrar/usar • Esc: sair do passeio";}
  function nearestInteraction(){
    const p=walkMode.avatar.position;
    if(viewMode==="campus"){let best=null,bd=3.2;for(const d of campusDoors){const dd=Math.hypot(d.x-p.x,d.z-p.z);if(dd<bd){bd=dd;best=d;}}return best&&{text:`Entrar: ${best.icon} ${best.label.charAt(0)+best.label.slice(1).toLowerCase()}`,run:()=>{walkMode.from=best.action;setView(best.action);}};}
    const b=roomBounds();
    if(p.z<b.z1+1.8)return{text:"Sair para o complexo",run:()=>setView("campus")};
    if(viewMode==="producao"){let best=null,bd=3.4;for(const [id,m] of Object.entries(machines)){if(!m.group||!currentState?.stations[id])continue;const dd=Math.hypot(m.group.position.x-p.x,(p.z<0?-2.7:2.7)-p.z);if(dd<bd){bd=dd;best=[id,m];}}
      if(best){const st=currentState.stations[best[0]];return{text:`${st.on?"Desligar":"Ligar"} ${best[1].name}`,run:()=>window.toggleStationBy3D?.(best[0])};}}
    return null;
  }
  function tickWalk(dt,t){
    const a=walkMode.avatar;walkMode.tag.view=viewMode;walkMode.tag.pos.set(a.position.x,a.position.y+2.1,a.position.z);
    const f=(keys.w||keys.arrowup||keys.padup?1:0)-(keys.s||keys.arrowdown||keys.paddown?1:0),r=(keys.d||keys.arrowright||keys.padright?1:0)-(keys.a||keys.arrowleft||keys.padleft?1:0);
    const fx=-Math.sin(cur.ax),fz=-Math.cos(cur.ax),rx=-fz,rz=fx;
    let mx=fx*f+rx*r,mz=fz*f+rz*r;const len=Math.hypot(mx,mz);
    const running=keys.shift||keys.padrun,speed=(viewMode==="campus"?5.2:3.2)*(running?1.9:1);
    if(len>0){mx/=len;mz/=len;a.position.x+=mx*speed*dt;a.position.z+=mz*speed*dt;collide(a.position);a.rotation.y=lerpAngle(a.rotation.y,Math.atan2(mx,mz),Math.min(1,dt*12));
      a.userData.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*(running?16:11)+i*Math.PI)*.6);lastInteract=performance.now();}
    else a.userData.legs.forEach(l=>l.rotation.x*=.8);
    tgt.look.set(a.position.x,a.position.y+1.4,a.position.z);
    const it=nearestInteraction();walkMode.target=it;walkMode.prompt.hidden=!it;if(it)walkMode.prompt.innerHTML=`<kbd>E</kbd> ${it.text}`;
  }
  function interact(){if(walkMode.on&&walkMode.target)walkMode.target.run();}
  function initWalk(){
    walkMode.prompt=document.createElement("button");walkMode.prompt.type="button";walkMode.prompt.className="walk-prompt";walkMode.prompt.hidden=true;container.append(walkMode.prompt);walkMode.prompt.onclick=interact;
    walkMode.pad=document.createElement("div");walkMode.pad.className="walk-pad";walkMode.pad.innerHTML=`<button data-k="padup" aria-label="Andar para frente">▲</button><button data-k="padleft" aria-label="Andar para a esquerda">◀</button><button data-k="padright" aria-label="Andar para a direita">▶</button><button data-k="paddown" aria-label="Andar para trás">▼</button><button data-k="padrun" class="run" aria-label="Correr">🏃</button>`;container.append(walkMode.pad);
    walkMode.pad.querySelectorAll("[data-k]").forEach(b=>{const k=b.dataset.k,on=e=>{e.preventDefault();keys[k]=true;},off=()=>{keys[k]=false;};b.addEventListener("pointerdown",on);b.addEventListener("pointerup",off);b.addEventListener("pointerleave",off);b.addEventListener("pointercancel",off);});
    const map={" ":"space"};
    window.addEventListener("keydown",e=>{if(!walkMode.on||e.target.closest?.("input,select,textarea"))return;const k=map[e.key]||e.key.toLowerCase();
      if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k)){keys[k]=true;if(k.startsWith("arrow"))e.preventDefault();}
      if(k==="e"||k==="enter"){e.preventDefault();interact();}if(k==="escape")setWalk(false);});
    window.addEventListener("keyup",e=>{const k=e.key.toLowerCase();keys[k]=false;});
    window.addEventListener("blur",()=>{for(const k in keys)keys[k]=false;});
    const btn=document.getElementById("walkBtn");if(btn)btn.onclick=()=>setWalk(!walkMode.on);
  }
  function zoomLimits(){return walkMode.on?[4,24]:viewMode==="campus"?[10,210]:[6,70];}
  // arrastar o mapa (botão direito, Shift ou dois dedos) e mover com WASD na vista de cima
  let panning=false,pinchMid=null,overCanvas=false;
  function panBy(dx,dy){const k=tgt.dist*.0016,fx=-Math.sin(cur.ax),fz=-Math.cos(cur.ax),rx=-fz,rz=fx;
    tgt.look.x-=rx*dx*k;tgt.look.z-=rz*dx*k;tgt.look.x+=fx*dy*k*1.4;tgt.look.z+=fz*dy*k*1.4;
    const b=viewMode==="campus"?{x:88,z1:-52,z2:52}:{x:14,z1:-10,z2:10};tgt.look.x=Math.max(-b.x,Math.min(b.x,tgt.look.x));tgt.look.z=Math.max(b.z1,Math.min(b.z2,tgt.look.z));lastInteract=performance.now();}
  function setView(mode,instant=false){
    if(mode!=="campus"&&!SECTORS[mode])mode="producao";
    const prev=viewMode;viewMode=mode;
    campusRoot.visible=mode==="campus";
    for(const [id,v] of Object.entries(views)){v.group.visible=id===mode;if(id!==mode)v.hide?.();}
    if(mode!=="campus")ensureView(mode).group.visible=true;
    skyMesh.visible=stars.visible=moon.visible=mode==="campus";
    scene.background=mode==="campus"?null:new THREE.Color(0x1e2724);
    const portrait=container.clientHeight>container.clientWidth*1.05,pk=portrait?1.32:1;
    if(mode==="campus"){Object.assign(tgt,{ax:.9,ay:.86,dist:122*pk});tgt.look.set(0,0,-2);scene.fog.near=150;scene.fog.far=390;}
    else{const cm=SECTORS[mode].cam;const cd=cm.dist*(mode==="producao"?1+.09*((currentState?.lines||1)-1):1);Object.assign(tgt,{ax:cm.ax??2.4,ay:cm.ay??.55,dist:cd*pk});tgt.look.set(...(cm.look||[-.5,1.2,.4]));scene.fog.near=34;scene.fog.far=90;}
    if(instant||!prev){Object.assign(cur,{ax:tgt.ax,ay:tgt.ay,dist:tgt.dist});cur.look.copy(tgt.look);}
    else{cur.dist=tgt.dist*(mode==="campus"?.55:1.8);cur.ay=tgt.ay+.25;cur.look.copy(tgt.look);}
    const sel=document.getElementById("sectorSelect");if(sel)sel.value=mode;
    document.getElementById("viewAerialBtn").classList.toggle("active",mode==="campus");document.getElementById("viewInteriorBtn").classList.toggle("active",mode!=="campus");
    document.getElementById("cameraHelp").textContent=mode==="campus"?"Arraste para girar • Botão direito ou Shift arrasta o mapa • Role para aproximar • WASD move • Clique num prédio para entrar":mode==="producao"?"Arraste para girar • Clique numa máquina para ligar/desligar":"Arraste para girar • Role para aproximar";
    lastInteract=performance.now();hideTip();renderSectorPanel(true);window.dispatchEvent(new CustomEvent("factory:view",{detail:mode}));
    if(walkMode.on&&walkMode.avatar){placeAvatar(mode);updateHelp();}
  }
  function pick(e){
    const el=renderer.domElement,rect=el.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);
    return ray.intersectObjects(clickTargets,false).find(h=>h.object.userData.view===viewMode);
  }
  function hideTip(){if(hoverTip)hoverTip.hidden=true;if(renderer)renderer.domElement.style.cursor=drag?"grabbing":"grab";}
  function showTip(hit,e){
    const u=hit.object.userData,rect=container.getBoundingClientRect();let text;
    if(u.stationId&&currentState){const st=currentState.stations[u.stationId];const status=st.repair>0?"em conserto":st.broken?"com defeito":st.on?"ligada":"desligada";text=`${u.label} · nível ${st.level} · ${status} · desgaste ${Math.round(st.wear)}%`;}
    else text=`${u.label} — clique para entrar`;
    hoverTip.textContent=text;hoverTip.hidden=false;
    hoverTip.style.left=`${Math.max(8,Math.min(rect.width-hoverTip.offsetWidth-8,e.clientX-rect.left+14))}px`;hoverTip.style.top=`${e.clientY-rect.top+16}px`;
    renderer.domElement.style.cursor="pointer";
  }
  function initControls(){
    const el=renderer.domElement;el.style.cursor="grab";
    el.addEventListener("pointerdown",e=>{lastInteract=performance.now();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const [a,b]=[...pointers.values()];pinchStart=Math.hypot(a.x-b.x,a.y-b.y);pinchDistance=tgt.dist;dragMoved=true;}drag=true;if(pointers.size===1){dragMoved=false;panning=!walkMode.on&&(e.button===2||e.shiftKey);}if(pointers.size===2){const [a,b]=[...pointers.values()];pinchMid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};}lastX=e.clientX;lastY=e.clientY;el.setPointerCapture(e.pointerId);el.style.cursor="grabbing";hoverTip.hidden=true;sectorPanel?.classList.add("dim");});
    el.addEventListener("pointermove",e=>{
      if(pointers.has(e.pointerId))pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      if(pointers.size===2){const [a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);const [mn,mx]=zoomLimits();tgt.dist=Math.max(mn,Math.min(mx,pinchDistance*pinchStart/Math.max(1,d)));const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};if(pinchMid&&!walkMode.on)panBy(mid.x-pinchMid.x,mid.y-pinchMid.y);pinchMid=mid;lastInteract=performance.now();return;}
      if(!drag){if(e.pointerType==="mouse"){const hit=pick(e);if(hit)showTip(hit,e);else hideTip();}return;}
      const dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.abs(dx)+Math.abs(dy)>3)dragMoved=true;
      if(panning){panBy(dx,dy);lastX=e.clientX;lastY=e.clientY;return;}
      tgt.ax-=dx*.008;tgt.ay=Math.max(walkMode.on?.12:viewMode==="campus"?.3:.2,Math.min(1.35,tgt.ay+dy*.006));lastX=e.clientX;lastY=e.clientY;lastInteract=performance.now();
    });
    const up=e=>{pointers.delete(e.pointerId);if(pointers.size<2)pinchMid=null;if(!pointers.size){drag=false;panning=false;el.style.cursor="grab";sectorPanel?.classList.remove("dim");}try{el.releasePointerCapture(e.pointerId);}catch(_){}};
    el.addEventListener("pointerup",up);el.addEventListener("pointercancel",up);el.addEventListener("pointerleave",()=>{if(!drag)hideTip();});
    el.addEventListener("wheel",e=>{const [mn,mx]=zoomLimits();
      if((e.deltaY<0&&tgt.dist<=mn+.05)||(e.deltaY>0&&tgt.dist>=mx-.05))return;   // no limite do zoom a página volta a rolar
      e.preventDefault();tgt.dist=Math.max(mn,Math.min(mx,tgt.dist*(1+Math.sign(e.deltaY)*Math.min(.25,Math.abs(e.deltaY)*.0015))));lastInteract=performance.now();},{passive:false});
    el.addEventListener("contextmenu",e=>e.preventDefault());
    el.addEventListener("pointerenter",()=>overCanvas=true);el.addEventListener("pointerleave",()=>overCanvas=false);
    const panKeys={w:[0,1],s:[0,-1],a:[1,0],d:[-1,0],arrowup:[0,1],arrowdown:[0,-1],arrowleft:[1,0],arrowright:[-1,0]},held={};
    window.addEventListener("keydown",e=>{if(walkMode.on||e.target.closest?.("input,select,textarea")||e.ctrlKey||e.metaKey)return;const k=e.key.toLowerCase();if(!panKeys[k])return;if(k.startsWith("arrow")&&!overCanvas)return;held[k]=true;if(k.startsWith("arrow"))e.preventDefault();});
    window.addEventListener("keyup",e=>{held[e.key.toLowerCase()]=false;});window.addEventListener("blur",()=>{for(const k in held)held[k]=false;});
    setInterval(()=>{if(walkMode.on)return;let x=0,y=0;for(const [k,v] of Object.entries(panKeys))if(held[k]){x+=v[0];y+=v[1];}if(x||y)panBy(x*14,y*14);},33);
    el.addEventListener("click",e=>{if(dragMoved)return;const hit=pick(e);if(!hit)return;const u=hit.object.userData;if(u.action)handleAction(u.action);else if(u.stationId)window.toggleStationBy3D?.(u.stationId);});
    document.getElementById("resetCameraBtn").onclick=()=>setView(viewMode);
    const sel=document.getElementById("sectorSelect");
    if(sel){sel.innerHTML=`<option value="campus">🗺️ Vista aérea</option>`+Object.entries(SECTORS).map(([id,s])=>`<option value="${id}">${s.icon} ${s.name}</option>`).join("");sel.onchange=()=>setView(sel.value);}
    document.getElementById("viewAerialBtn").onclick=()=>setView("campus");document.getElementById("viewInteriorBtn").onclick=()=>setView("producao");
  }
  function resize(){const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}

  /* ---------------- painel do setor (canto da cena) ---------------- */
  let panelKey="",actionsKey="";
  // cartão do setor pode ser recolhido; a escolha fica guardada neste navegador
  let panelCollapsed=(()=>{try{const v=localStorage.getItem("fabrica-painel-recolhido");return v==null?window.innerWidth<700:v==="1";}catch(_){return window.innerWidth<700;}})();
  function togglePanel(){panelCollapsed=!panelCollapsed;try{localStorage.setItem("fabrica-painel-recolhido",panelCollapsed?"1":"0");}catch(_){}sectorPanel.classList.toggle("collapsed",panelCollapsed);panelKey="";renderSectorPanel(false);}
  function renderSectorPanel(force){
    if(!sectorPanel)return;
    if(viewMode==="campus"){sectorPanel.hidden=true;panelKey=actionsKey="";return;}
    const info=(currentState&&window.getSectorInfo?.(viewMode,currentState))||{};
    const sec=SECTORS[viewMode];
    const head=`<div class="sp-head"><span class="sp-icon">${sec.icon}</span><div><strong>${sec.name}</strong><small>${info.text||""}</small></div>
      <button type="button" class="sp-toggle" data-panel-toggle aria-label="${panelCollapsed?"Abrir":"Recolher"} o painel do setor" title="${panelCollapsed?"Abrir":"Recolher"}">${panelCollapsed?"▾":"▴"}</button></div>
      <ul class="sp-stats">${(info.stats||[]).map(s=>`<li><span>${s[0]}</span><b>${s[1]}</b></li>`).join("")}</ul>`;
    const acts=`<div class="sp-actions">${(info.actions||[]).map(a=>`<button type="button" ${a.attrs}>${a.label}</button>`).join("")}<button type="button" class="sp-back" data-view="campus">← ${panelCollapsed?"Complexo":"Voltar ao complexo"}</button></div>`;
    if(force||!sectorPanel.firstChild){sectorPanel.innerHTML=`<div class="sp-body"></div><div class="sp-acts"></div>`;panelKey=actionsKey="";}
    sectorPanel.hidden=false;sectorPanel.classList.toggle("collapsed",panelCollapsed);
    if(head!==panelKey){panelKey=head;sectorPanel.querySelector(".sp-body").innerHTML=head;}
    if(acts!==actionsKey){actionsKey=acts;sectorPanel.querySelector(".sp-acts").innerHTML=acts;}
  }

  /* ---------------- início ---------------- */
  function init(){
    container=document.getElementById("factory3d");if(!container||!window.THREE)return;
    if(THREE.ColorManagement)THREE.ColorManagement.legacyMode=false;
    try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});}catch(_){document.getElementById("webglFallback").hidden=false;return;}
    renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputEncoding=THREE.sRGBEncoding;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    container.prepend(renderer.domElement);
    labelLayer=document.createElement("div");labelLayer.className="label-layer";container.append(labelLayer);
    hoverTip=document.createElement("div");hoverTip.className="hover-tip";hoverTip.hidden=true;container.append(hoverTip);
    sectorPanel=document.createElement("div");sectorPanel.className="sector-panel";sectorPanel.hidden=true;container.append(sectorPanel);
    sectorPanel.addEventListener("click",e=>{if(e.target.closest("[data-panel-toggle]")){togglePanel();return;}const b=e.target.closest("[data-view]");if(b)setView(b.dataset.view);});
    scene=new THREE.Scene();scene.fog=new THREE.Fog(0xdcebf0,95,260);campusRoot=new THREE.Group();scene.add(campusRoot);clock=new THREE.Clock();
    tgt.look=new THREE.Vector3();cur.look=new THREE.Vector3();
    softTex=canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.45,"rgba(255,255,255,.55)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,64,64);},false);
    wallTex=stripes(false,"#ffffff","#d3d3d3",8);doorTex=stripes(true,"#ffffff","#b8b8b8",6);
    // painéis pré-moldados (fachadas do campus), manta do telhado e concreto do pátio com juntas de dilatação
    panelTex=canvasTex(128,128,(g)=>{g.fillStyle="#f3f2ee";g.fillRect(0,0,128,128);const r=seededRandom(11);for(let i=0;i<420;i++){g.fillStyle=`rgba(40,40,36,${(r()*.07).toFixed(3)})`;g.fillRect(r()*128,r()*128,3,3);}g.fillStyle="#d6d5d0";for(let y=0;y<128;y+=64){g.fillRect(0,y,128,2);g.fillRect((y/64)%2?64:0,y,2,64);}});
    roofTex=canvasTex(128,128,(g)=>{g.fillStyle="#f0f0ee";g.fillRect(0,0,128,128);const r=seededRandom(13);for(let i=0;i<1400;i++){const v=200+r()*55|0;g.fillStyle=`rgb(${v},${v},${v-4})`;g.fillRect(r()*128,r()*128,2,2);}});
    padTex=canvasTex(256,256,(g)=>{g.fillStyle="#cbc8bc";g.fillRect(0,0,256,256);const r=seededRandom(21);for(let i=0;i<3000;i++){const v=180+r()*50|0;g.fillStyle=`rgba(${v},${v-2},${v-10},.5)`;g.fillRect(r()*256,r()*256,3,3);}g.fillStyle="rgba(70,68,60,.35)";g.fillRect(0,0,256,3);g.fillRect(0,0,3,256);g.fillStyle="rgba(70,68,60,.14)";g.fillRect(0,126,256,2);g.fillRect(126,0,2,256);});
    // materiais que reagem a dia/noite/falta de luz
    nightMat(0xfff7dd,"headlight",{emissive:0xfff0c0});
    lampMat=nightMat(0xf6db78,"lamp",{emissive:0xf0c84e});
    interiorWinMat=nightMat(0xbfe0ec,"daywin",{emissive:0xdff3ff,roughness:.2});
    screenMat=nightMat(0x7fc6bd,"screen",{emissive:0x5fd0bf});
    skylightMat=nightMat(0x9cc6d6,"window",{metalness:.4,roughness:.15});
    glassMat=nightMat(0x4f7c96,"window",{metalness:.55,roughness:.18});
    nightMat(0xfff4d0,"street",{emissive:0xffe2a0});
    roadMat=material(0x50565a,{roughness:.95});lineMat=new THREE.MeshBasicMaterial({color:0xe9e4c8});dashGeo=new THREE.BoxGeometry(1.4,.02,.14);
    roofMatDark=material(0x8a9296,{roughness:.9,side:THREE.DoubleSide,map:tiled(roofTex,6,6)});themeMats.push({m:roofMatDark,role:"roof",orig:0x8a9296});
    treeMats=[material(0x3f7d4a,{roughness:1,flatShading:true}),material(0x4f8f3f,{roughness:1,flatShading:true}),material(0x2f6a45,{roughness:1,flatShading:true})];
    drawBrand("Fábrica de Lápis",null);
    camera=new THREE.PerspectiveCamera(42,1,.1,800);
    makeSky();
    hemi=new THREE.HemisphereLight(0xd6e8ff,0x5d6b4c,.9);scene.add(hemi);
    sun=new THREE.DirectionalLight(0xfff1dc,2.3);sun.position.set(-26,40,22);sun.castShadow=true;sun.shadow.mapSize.set(4096,4096);
    Object.assign(sun.shadow.camera,{left:-94,right:94,top:66,bottom:-66,near:1,far:320});sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun);scene.add(sun.target);
    emergency=new THREE.PointLight(0xff2a1a,0,60,1.4);emergency.position.set(0,6,0);scene.add(emergency);
    ensureView("producao");
    root=campusRoot;addCampus();
    const cs=[0x46c779,0xf0bf44,0xe9584c,0x4b86d1];for(let i=0;i<60;i++){const p=box(.09,.09,.25,cs[i%4]);p.castShadow=false;p.visible=false;scene.add(p);confetti.push({mesh:p,vx:0,vy:0,vz:0});}
    initCommute();initControls();initWalk();setView("campus",true);
    new ResizeObserver(resize).observe(container);resize();animate();
  }

  /* ---------------- ligação com o estado do jogo ---------------- */
  let lastProduct=null;
  function update(s){
    if(!renderer)return;
    currentState=s;const all=Object.values(s.stations).every(x=>x.on&&!x.broken),broken=Object.values(s.stations).some(x=>x.broken);
    const lunch=typeof isLunch==="function"&&isLunch(s);
    const producing=s.running&&!s.paused&&all&&s.active.length>0&&!s.blackout&&!lunch;
    const where=viewMode==="campus"?"":`${SECTORS[viewMode].name} · `;
    document.getElementById("sceneStatus").textContent=where+(s.ended?"Fábrica fechada":s.blackout>0?"⚡ Sem energia":s.night?(s.dayOff?"🛌 Folga — fábrica fechada":"🌙 Noite — fábrica fechada"):lunch?"🍽️ Hora do almoço":!s.running?"Aguardando o início do turno":s.paused?"Operação pausada":broken?"⚠ Alerta de manutenção":producing?"Em produção":all?"Linha pronta — aguardando pedido":"Produção parcial");
    container.classList.toggle("blackout",s.blackout>0);
    for(const [id,m] of Object.entries(machines)){
      if(!s.stations[id])continue;const st=s.stations[id],status=st.repair>0?"repair":st.broken?"broken":st.on?"on":"off";m.status=status;
      const c={repair:colors.yellow,broken:colors.red,on:colors.green,off:colors.off}[status];m.light.material.color.setHex(c);m.light.material.emissive.setHex(c);m.light.material.emissiveIntensity=status==="off"?.1:1.6;
      m.level=st.level;
      m.pips.forEach((p,i)=>{const lit=i<st.level;p.material.color.setHex(lit?0xf0c040:0x3b4a44);p.material.emissive.setHex(lit?0xc89a1c:0);p.material.emissiveIntensity=lit&&!s.blackout?.9:0;});
      m.label.el.className=`scene-label machine ${status}`;m.label.el.querySelector("small").textContent=`Nv${st.level} · ${status==="repair"?"conserto":status==="broken"?"defeito":`${Math.round(st.wear)}%`}`;
    }
    if(machines.campusBeacon){const c=broken?colors.red:producing?colors.green:colors.off;machines.campusBeacon.material.color.setHex(c);machines.campusBeacon.material.emissive.setHex(c);machines.campusBeacon.material.emissiveIntensity=(broken||producing)&&!s.blackout?2:.1;}
    const product=s.active[0]?.product||null;if(product!==lastProduct){lastProduct=product;if(product)paintProducts(product);}
    const cap=capOf(s);
    for(const k of ["wood","graphite","paint"])syncCount(stockMeshes[k],s.stock[k]/cap);
    tech.visible=s.staff.tech>0&&!lunch;operators.forEach((op,i)=>op.visible=i<s.staff.operator&&!lunch);
    syncFacilities(s);
    for(const v of Object.values(views))v.sync?.(s);
    renderSectorPanel(false);
  }
  function notify(type,id){
    if(type==="breakdown")shake=.55;
    if(type==="valve"){valvePuff=1.6;shake=Math.max(shake,.25);}
    if(type==="party"&&viewMode==="campus"){fwTimer=0;}
    if(type==="upgrade"&&machines[id])machines[id].pulse=1.2;
    if(type==="complete"){celebration=2.5;const origin=viewMode==="campus"?new THREE.Vector3(46,7,-35):new THREE.Vector3(8,5,0);for(const [i,c] of confetti.entries()){c.mesh.visible=true;c.mesh.position.set(origin.x+(Math.random()-.5)*4,origin.y+Math.random()*2,origin.z+(Math.random()-.5)*5);c.vx=(Math.random()-.5)*2.4;c.vy=2+Math.random()*2.4;c.vz=(Math.random()-.5)*2.4;c.mesh.rotation.set(i,i*.2,0);}}
  }

  /* ---------------- animação ---------------- */
  const _top=new THREE.Color(),_bottom=new THREE.Color(),_sunCol=new THREE.Color();
  function animate(){requestAnimationFrame(animate);const dt=Math.min(.05,clock.getDelta()),t=performance.now()*.001;
    if(viewMode==="campus"&&!walkMode.on&&!drag&&performance.now()-lastInteract>8000)tgt.ax+=dt*.03;
    if(walkMode.on&&walkMode.avatar)tickWalk(dt,performance.now()*.001);
    if(currentState)tickCommute(dt,performance.now()*.001,currentState);
    if(peerAvatars.size)tickPeers(dt,performance.now()*.001);
    const k=1-Math.exp(-dt*5);cur.ax+=(tgt.ax-cur.ax)*k;cur.ay+=(tgt.ay-cur.ay)*k;cur.dist+=(tgt.dist-cur.dist)*k;cur.look.lerp(tgt.look,k);applyCamera();
    const s=currentState;
    if(s){
      const blackout=s.blackout>0;
      const active=!s.paused&&!s.ended;
      const lunchNow=typeof isLunch==="function"&&isLunch(s);
      const running=active&&s.running&&!s.night&&!blackout&&!lunchNow;
      const production=running&&s.active.length>0&&Object.values(s.stations).every(x=>x.on&&!x.broken);
      const speedK=Math.sqrt(s.speed||1);
      const ctx={running,production,speedK,blackout,k:active?(running?speedK:.55):0,rateK:LEVEL_RATE[Math.min(...Object.values(s.stations).map(x=>x.level))]*(1+.2*s.staff.operator)};
      if(viewMode!=="campus")views[viewMode]?.tick?.(dt,t,s,ctx);

      // ciclo de 24 h: sol se move, céu muda de cor, estrelas e lua à noite
      const hour=((s.minute/60)%24+24)%24,day=daylightAt(hour),night=1-day;
      const ang=(hour-6)/12*Math.PI;
      sun.position.set(-100*Math.cos(ang),Math.max(6,115*Math.sin(ang)),40);
      _sunCol.setHex(0xfff1dc).lerp(_c1.setHex(0xff9a50),clamp01(1-Math.sin(Math.max(0,ang))*2.2));sun.color.copy(_sunCol);
      skyAt(hour,_top,_bottom);skyMat.uniforms.top.value.copy(_top);skyMat.uniforms.bottom.value.copy(_bottom);
      stars.material.opacity=night*.95;moon.material.opacity=night;moon.position.set(120*Math.cos(ang),Math.max(20,140*Math.sin(-ang)+30),-160);
      if(viewMode==="campus"){sun.intensity=.05+day*2.25;hemi.intensity=(.28+day*.6);scene.fog.color.copy(_bottom);}
      else{sun.intensity=day*1.1;hemi.intensity=blackout?.06:.9;scene.fog.color.set(0x1e2724);}
      const glow=clamp01(night*1.2);
      for(const mt of nightMats){const kind=mt.userData.kind;mt.emissiveIntensity=
        kind==="lamp"?(blackout?0:.9):kind==="window"?(blackout?0:glow*1.1):kind==="street"?(blackout?0:glow*2.4):kind==="headlight"?.2+glow*2.2:kind==="daywin"?day*.55:kind==="screen"?(blackout?0:.9):0;}
      brandMats.forEach(m=>m.color.setHex(blackout&&night>.5?0x333333:night>.5?0xd8d0b8:0xffffff));
      emergency.intensity=blackout?(Math.sin(t*6)>0?3.2:.4):0;emergency.position.set(cur.look.x,viewMode==="campus"?14:6,cur.look.z);

      if(viewMode==="campus"){
        const anyBroken=Object.values(s.stations).some(x=>x.broken);
        runEmitter(emitters.chimney,dt,running||anyBroken,-15,13.9,-19.5,anyBroken?0x3d4240:0xe6e9ea,anyBroken?1.3:production?1:.6);
        runEmitter(emitters.vent,dt,production,42,6.9,3,0xf4f6f5,1);
        runEmitter(emitters.fountain,dt,!blackout,MUSEUM.x,2.6,39,0xd8f1ff,1);
        tickClubOutside(dt,t,s);
        runEmitter(emitters.kitchen,dt,dayPhase(s)==="lunch"||(s.running&&!s.night&&s.minute>=690&&s.minute<720),-49,4.6,9,0xf4f6f5,.9);
        const vk=ctx.k;
        for(const v of vehicles){const u=v.userData;u.s+=dt*u.speed*vk;placeVehicle(v,dt);u.wheels.forEach(w=>w.rotation.y-=dt*u.speed*vk*3);}
        for(const w of walkers)tickPacer(w,dt,t,s.night?0:vk);
        for(const f of flags){const pos=f.mesh.geometry.attributes.position,b=f.base;for(let i=0;i<pos.count;i++){const x=b[i*3];pos.array[i*3+2]=Math.sin(x*3-t*4+f.phase)*x*.12;pos.array[i*3+1]=b[i*3+1]+Math.sin(x*2-t*3)*x*.03;}pos.needsUpdate=true;f.mesh.geometry.computeVertexNormals();}
        for(const fan of roofFans)fan.rotation.y+=dt*(blackout?0:running?9:2);
        shuttle(forklift,dt,running?vk:0,[44,-6],[55,-6]);
        bridgeBoxes.forEach((b,i)=>{b.visible=production;if(production)b.position.x=12.5+((t*.08*speedK+i/8)%1)*18.4;});
        const bo=s.boiler||{};runEmitter(emitters.boilerStack,dt,!!bo.on&&!bo.broken,9.5,12.2,-20.3,0xeef1f1,.5+Math.min(1,(bo.pressure||0)/90));runEmitter(emitters.valve,dt,valvePuff>0,6,5.2,-19.3,0xf4f6f5,1.3);
      }else{runEmitter(emitters.chimney,dt,false,0,0,0,0);runEmitter(emitters.vent,dt,false,0,0,0,0);}
    }
    const activeRoot=viewMode==="campus"?campusRoot:views[viewMode]?.group;if(activeRoot){if(shake>0){shake-=dt;activeRoot.position.x=Math.sin(t*70)*shake*.08;}else activeRoot.position.x=0;}
    if(valvePuff>0)valvePuff-=dt;
    if(celebration>0){celebration-=dt;confetti.forEach(c=>{c.mesh.position.x+=c.vx*dt;c.mesh.position.y+=c.vy*dt;c.mesh.position.z+=c.vz*dt;c.vy-=4.5*dt;c.mesh.rotation.x+=dt*5;if(c.mesh.position.y<.1)c.mesh.visible=false;});}else confetti.forEach(c=>c.mesh.visible=false);
    renderer.render(scene,camera);updateLabels();
  }
  /* ---------------- visitantes: bonecos das outras pessoas com a página aberta ---------------- */
  const PEER_SHIRTS=[0x3a5f8f,0xb0603f,0x6c5a8f,0x2f7a52,0x9a3b5c,0x2f8a8f,0x8f7a2f],peerAvatars=new Map();
  function hashKey(k){let h=0;for(const c of k)h=(h*31+c.charCodeAt(0))|0;return Math.abs(h);}
  function setPeers(list){
    if(!renderer)return;const seen=new Set();
    for(const p of list){seen.add(p.key);let a=peerAvatars.get(p.key);
      if(!a){const mesh=makeWorker(p.host?0x1d2624:0xf3efe4,PEER_SHIRTS[hashKey(p.key)%PEER_SHIRTS.length],1.02);mesh.visible=false;scene.add(mesh);mesh.position.set(p.x,0,p.z);
        a={mesh,tag:addLabel("",new THREE.Vector3(),"__none",{cls:"small peer",prio:8}),name:null,lastView:p.view};peerAvatars.set(p.key,a);}
      a.view=p.view;a.tx=p.x;a.tz=p.z;a.tr=p.r;
      if(a.lastView!==p.view){a.lastView=p.view;a.mesh.position.set(p.x,0,p.z);}
      const nm=(p.host?"👔 ":"👤 ")+p.name;if(nm!==a.name){a.name=nm;a.tag.el.textContent=nm;a.tag.fw=null;a.tag.el.classList.toggle("host",p.host);}
    }
    for(const [k,a] of peerAvatars)if(!seen.has(k)){scene.remove(a.mesh);a.tag.el.remove();const i=labels.indexOf(a.tag);if(i>=0)labels.splice(i,1);peerAvatars.delete(k);}
  }
  function tickPeers(dt,t){
    for(const a of peerAvatars.values()){
      const here=a.view===viewMode;a.mesh.visible=here;a.tag.view=here?viewMode:"__none";if(!here)continue;
      const p=a.mesh.position,dx=a.tx-p.x,dz=a.tz-p.z,d=Math.hypot(dx,dz);
      if(d>12){p.x=a.tx;p.z=a.tz;}else{const k=Math.min(1,dt*8);p.x+=dx*k;p.z+=dz*k;}
      p.y=viewMode==="campus"?ROAD_Y:0;a.mesh.rotation.y=lerpAngle(a.mesh.rotation.y,a.tr||0,Math.min(1,dt*10));
      a.mesh.userData.legs.forEach((l,i)=>l.rotation.x=d>.05?Math.sin(t*11+i*Math.PI)*.6:l.rotation.x*.8);
      a.tag.pos.set(p.x,p.y+2.1,p.z);
    }
  }
  // onde eu estou: andando (posição do boneco) ou parado na entrada da vista atual — assim quem visita sempre me vê
  function getWalk(){const r=v=>Math.round(v*100)/100;if(walkMode.on&&walkMode.avatar){const p=walkMode.avatar.position;return{v:viewMode,x:r(p.x),z:r(p.z),r:r(walkMode.avatar.rotation.y)};}if(!renderer)return null;const sp=spawnFor(viewMode);return{v:viewMode,x:r(sp.x),z:r(sp.z),r:r(sp.rot||0),s:1};}
  // vai até outra pessoa da sala: muda de vista se preciso e aproxima a câmera do boneco dela
  function focusPeer(key,view){const a=peerAvatars.get(key);const v=view||a?.view||"campus";if(v!==viewMode)setView(v);if(!a)return;if(walkMode.on&&walkMode.avatar){walkMode.avatar.position.set(a.tx+1.2,walkMode.avatar.position.y,a.tz+.8);collide(walkMode.avatar.position);}else{tgt.look.set(a.tx,1.2,a.tz);tgt.dist=v==="campus"?16:12;lastInteract=performance.now();}}
  const themeMats=[];
  function setTheme(th){
    if(!renderer||!th)return;const tc=new THREE.Color();
    for(const x of themeMats){const target=th.id==="classico"?null:th[x.role];
      if(target==null){x.m.color.setHex(x.orig);continue;}
      if(x.role==="wall")x.m.color.setHex(x.orig).lerp(tc.setHex(target),.85);else x.m.color.setHex(target);}
  }
  function toggleView(){if(renderer)setView(viewMode==="campus"?"producao":"campus");}
  window.Factory3D={init,update,notify,toggleView,setBrand,focusPeer:(k,v)=>renderer&&focusPeer(k,v),setView:(v)=>renderer&&setView(v),getView:()=>viewMode,isWalking:()=>walkMode.on,setWalk:(v)=>renderer&&setWalk(v),setPeers,getWalk,setTheme,stepCommute:(dt)=>{if(currentState)tickCommute(dt,performance.now()*.001,currentState);},commuteInfo:()=>({phase:commutePhase,moving:movers.size,carsVisible:commuters.filter(c=>c.car.visible).length,cars:commuters.length,walking:[...commuters.map(c=>c.person),...lunchCrowd].filter(p=>p.visible).length}),setWalkName:(t)=>{if(!renderer)return;if(!walkMode.avatar)setWalk(true);walkMode.tag.el.textContent=t;walkMode.tag.fw=null;},setCeo,focusMeeting:()=>{if(!renderer)return;if(viewMode!=="admin")setView("admin");if(walkMode.on)return;tgt.look.set(13,1.3,-6.3);tgt.dist=12.5;tgt.ax=Math.PI;tgt.ay=.5;lastInteract=performance.now();},focus:(x,z,d=45)=>{if(!renderer||viewMode!=="campus")return;tgt.look.set(x,0,z);tgt.dist=d;lastInteract=performance.now();}};
})();
