const $=id=>document.getElementById(id);
const W=800,H=500,PR=14,DURATION=60;
const cv=$('cv'),ctx=cv.getContext('2d'),sv=$('sv'),sc=sv.getContext('2d');
(function(){const d=window.devicePixelRatio||1;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);sv.width=180*d;sv.height=180*d;sc.setTransform(d,0,0,d,0,0)})();

const DESC={
  target:'ควบคุมจุดไปแตะเป้าหมายที่โผล่ขึ้นทีละจุด ฝึกความแม่นในการเล็งทิศ',
  cone:'เลี้ยงผ่านกรวยตามลำดับแบบซิกแซก กรวยที่เรืองแสงคือจุดถัดไป ครบทั้งชุดได้โบนัส +3',
  pass:'เอียงอนาล็อกเพื่อเล็งทิศ แล้วกดปุ่ม A (หรือ Space) ส่งบอลให้เพื่อนร่วมทีมสีฟ้า ฝึกความแม่นของมุม (กด Q เปิด/ปิดเส้นแนวส่ง)',
  path:'คุมจุดจากซ้ายไปขวาตามเส้นทางโค้ง ห้ามออกนอกเส้น ถ้าหลุดจะถูกดึงกลับไปถอยหลังเล็กน้อย',
  skill:'ดูท่าบนจอ แล้วกดตามบนจอยจริง: ค้างปุ่ม (LT/RB) แล้วดีดหรือหมุนอนาล็อกตามลำดับลูกศร ผ่านแล้วขึ้นท่าใหม่ ระดับความยากกำหนดเวลาต่อสเต็ปและความเข้มงวดของมุม (ระหว่างซ้อม ปุ่ม A ไม่หยุดเกม)',
  defend:'บังคับจุดน้ำเงินไล่ผู้เล่นที่ครองบอล (วงกลมประคือระยะแย่งบอล) กด RT เพื่อวิ่งเร็ว เข้าใกล้แล้วกด B เพื่อแย่งบอล กด B ตอนอยู่ไกลจะพลาดและเสียจังหวะ',
  dodge:'เลี้ยงบอลหลบจุดแดงที่พุ่งเข้ามาหา หลบพ้นได้ +1 ถูกชนเสีย 2 คะแนนและเสียบอลชั่วคราว กด RT เพื่อวิ่งเร็วช่วยหลบ',
  passd:'ส่งบอลผ่านแนวรับสีแดง 3 คน: หนึ่งคนตามประกบผู้ส่งบอลสีเหลือง อีกสองคนตามประกบเพื่อนสีน้ำเงิน ส่งด้วย A เพื่อช่วยดึงบอลเข้าหาเพื่อน หรือ X เพื่อเล็งเอง (คีย์บอร์ด: Space = A, X = X)',
  prun:'หันหน้าหาเพื่อนที่ไฮไลต์ด้วยอนาล็อกซ้าย ค้าง LT+LB แล้วดีดอนาล็อกขวาไปทิศของเส้นเหลืองครั้งเดียว เพื่อนจะวิ่งต่อเองไปเรื่อย ๆ ตามเส้น (คีย์บอร์ด: WASD = LS, ลูกศร = RS, R = LT, T = LB)'
};
const S={mode:'target',run:false,score:0,time:DURATION,p:{x:W/2,y:H/2},t:[],next:0,rev:false,side:0,hits:[],lastHit:0,end:0,trail:[],stickTrail:[],errors:0,shots:0,ball:null,aim:0,path:null,flash:0,stun:0,inv:0,nextFoe:0,car:null,foes:[],fx:null,sprint:false,mates:[],defs:[],cmd:null,runs:[],msg:'',msgT:0,okT:0};
let stick=0,dz=.12,speed=380,prevA=false,best={},lv='normal',showAim=true,showRunGuide=true,runChord='ltlb';
// ระดับความยาก: r=ขนาดเป้า/กรวย, hw=ความกว้างทางครึ่งหนึ่ง, amp=ความโค้งของทาง, cones=จำนวนกรวย, dist=ระยะเพื่อนร่วมทีม
const LV={easy:{r:1.3,hw:64,amp:.7,cones:4,dist:[150,260],win:1500,mag:.55,ang:30,cs:190,tr:52,ds:190,di:1.1,hm:0,as:1.4,nd:1,dd:40,pw:5,ph:1},normal:{r:1,hw:50,amp:1,cones:5,dist:[180,330],win:950,mag:.65,ang:26,cs:260,tr:40,ds:250,di:.8,hm:.5,as:1,nd:2,dd:75,pw:3.5,ph:1},hard:{r:.62,hw:40,amp:1.3,cones:7,dist:[260,400],win:600,mag:.75,ang:20,cs:330,tr:30,ds:310,di:.55,hm:1.1,as:.7,nd:3,dd:110,pw:2.4,ph:0}};
const bk=()=>S.mode+'-'+lv;
const keys={};
try{best=JSON.parse(localStorage.getItem('fcst-best')||'{}')}catch(e){best={}}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' '){e.preventDefault();if(!e.repeat)action()}if(k==='q'&&!e.repeat&&(S.mode==='pass'||S.mode==='passd'))setAim(!showAim);keys[k]=true});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
addEventListener('gamepadconnected',e=>{$('status').innerHTML='เชื่อมต่อแล้ว: <b>'+e.gamepad.id.slice(0,48)+'</b>'});
addEventListener('gamepaddisconnected',()=>{$('status').textContent='จอยหลุดการเชื่อมต่อ กำลังใช้คีย์บอร์ดแทน'});

function seg(id,attr,fn){$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).children].forEach(x=>x.setAttribute('aria-pressed',x===b));fn(b.dataset[attr])})}
$('modes').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  $('modes').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  S.mode=b.dataset.mode;$('desc').textContent=DESC[S.mode];reset();
});
$('modes').addEventListener('keydown',e=>{
  if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
  const bs=[...$('modes').querySelectorAll('button')],i=bs.indexOf(document.activeElement);if(i<0)return;
  e.preventDefault();bs[(i+(e.key==='ArrowDown'?1:bs.length-1))%bs.length].focus();
});
seg('sticks','stick',v=>{stick=+v});
$('runGuide').onclick=()=>{showRunGuide=!showRunGuide;$('runGuide').setAttribute('aria-pressed',showRunGuide);$('runGuide').textContent='เส้นช่วยเส้นขาว: '+(showRunGuide?'เปิด':'ปิด')};
$('runChords').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;runChord=b.dataset.runChord;[...$('runChords').children].forEach(x=>x.setAttribute('aria-pressed',x===b))});
seg('levels','lv',v=>{lv=v;reset()});
$('dz').oninput=e=>{dz=e.target.value/100;$('dzv').textContent=e.target.value+'%'};
$('sp').oninput=e=>{speed=+e.target.value;$('spv').textContent=speed};
$('go').onclick=toggle;
function setAim(v){showAim=v;$('aimbtn').setAttribute('aria-pressed',v);$('aimbtn').textContent='เส้นแนวส่งบอล: '+(v?'เปิด':'ปิด')}
$('aimbtn').onclick=()=>setAim(!showAim);
$('desc').textContent=DESC.target;

function readInput(){
  const gp=(navigator.getGamepads?navigator.getGamepads():[]);
  let g=null;for(const x of gp){if(x&&x.connected){g=x;break}}
  let x=0,y=0,btn={lt:false,rb:false,lb:false,rt:false},ls={x:0,y:0},rs={x:0,y:0};
  if(g){
    const si=S.mode==='skill'?(S.sk&&S.sk.stick==='RS'?1:0):S.mode==='prun'?0:stick;ls={x:g.axes[0]||0,y:g.axes[1]||0};rs={x:g.axes[2]||0,y:g.axes[3]||0};x=g.axes[si*2]||0;y=g.axes[si*2+1]||0;
    const bp=i=>!!(g.buttons[i]&&(g.buttons[i].pressed||g.buttons[i].value>.5));btn={lb:bp(4),rb:bp(5),lt:bp(6),rt:bp(7),b:bp(1),x:bp(2)};
    const a=!!(g.buttons[0]&&g.buttons[0].pressed);
    if(a&&!prevA)action();prevA=a;
  }else{
    const ks=S.mode==='skill'&&S.sk,uA=!(ks&&ks.stick==='LS'),uW=!(ks&&ks.stick==='RS');
    x=(((uW&&keys.d)||(uA&&keys.arrowright))?1:0)-(((uW&&keys.a)||(uA&&keys.arrowleft))?1:0);
    y=(((uW&&keys.s)||(uA&&keys.arrowdown))?1:0)-(((uW&&keys.w)||(uA&&keys.arrowup))?1:0);
    const kx=(a,b)=>(a?1:0)-(b?1:0);
    ls={x:kx(keys.d,keys.a),y:kx(keys.s,keys.w)};rs={x:kx(keys.arrowright,keys.arrowleft),y:kx(keys.arrowdown,keys.arrowup)};
    btn={lt:!!keys.r,rb:!!keys.e,lb:!!keys.t,rt:!!keys.shift,b:!!keys.b,x:!!keys.x};
    const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}
  }
  const raw=Math.min(1,Math.hypot(x,y));
  let ex=0,ey=0;
  if(raw>dz){const k=(raw-dz)/(1-dz)/raw;ex=x*k;ey=y*k}
  return{x,y,ex,ey,raw,btn,ls,rs};
}

const rnd=(a,b)=>a+Math.random()*(b-a);
function spawn(){
  if(S.mode==='target'){
    let x,y;do{x=rnd(50,W-50);y=rnd(50,H-50)}while(Math.hypot(x-S.p.x,y-S.p.y)<140);
    S.t=[{x,y,r:26*LV[lv].r}];
  }else if(S.mode==='cone'){
    const n=LV[lv].cones,gap=560/(n-1),xs=Array.from({length:n},(_,i)=>120+i*gap);if(S.rev)xs.reverse();
    S.t=xs.map((x,i)=>({x,y:i%2?370:130,r:22*LV[lv].r}));S.next=0;
  }else if(S.mode==='pass'){
    let x,y;do{const a=rnd(0,6.283),d=rnd(...LV[lv].dist);x=W/2+Math.cos(a)*d;y=H/2+Math.sin(a)*d}while(x<50||x>W-50||y<50||y>H-50);
    S.t=[{x,y,r:28*LV[lv].r}];S.ball=null;
  }else if(S.mode==='skill'){
    pickSkill();
  }else if(S.mode==='defend'){
    spawnCar();
  }else if(S.mode==='dodge'){
    S.foes=[];S.nextFoe=performance.now()+700;S.inv=0;
  }else if(S.mode==='passd'){
    setupPassD();
  }else if(S.mode==='prun'){
    setupRun();
  }else{
    makePath();
  }
}
function reset(){
  S.run=false;S.score=0;S.time=DURATION;S.p={x:W/2,y:H/2};S.hits=[];S.trail=[];S.rev=false;S.side=0;S.errors=0;S.shots=0;S.ball=null;
  spawn();hud();showStart();
}
function showStart(){$('ov').hidden=false;$('ov').innerHTML='<div class="big">พร้อมซ้อม</div><p>กดปุ่ม A บนจอย หรือกด Space เพื่อเริ่ม</p>'}
function toggle(){
  if(S.run){finish();return}
  S.run=true;S.score=0;S.hits=[];S.p={x:W/2,y:H/2};S.rev=false;S.side=0;S.errors=0;S.shots=0;S.ball=null;
  spawn();S.end=performance.now()+DURATION*1000;S.lastHit=performance.now();
  $('ov').hidden=true;$('go').textContent='หยุดซ้อม';
}
function finish(){
  S.run=false;$('go').textContent='เริ่มซ้อม 60 วินาที';
  const avg=S.hits.length?S.hits.reduce((a,b)=>a+b,0)/S.hits.length/1000:0;
  const isBest=S.score>(best[bk()]||0);
  if(isBest){best[bk()]=S.score;try{localStorage.setItem('fcst-best',JSON.stringify(best))}catch(e){}}
  $('ov').hidden=false;
  $('ov').innerHTML='<div class="big">'+S.score+' คะแนน</div><p>เวลาเฉลี่ยต่อเป้า '+(avg?avg.toFixed(2)+' วินาที':'-')+'</p>'+((S.mode==='pass'||S.mode==='passd')&&S.shots?'<p>ส่งแม่น '+Math.round(S.score/S.shots*100)+'% ('+S.score+'/'+S.shots+' ครั้ง)</p>':'')+(S.mode==='path'?'<p>ออกนอกเส้น '+S.errors+' ครั้ง</p>':'')+(S.mode==='skill'?'<p>กดพลาด '+S.errors+' ครั้ง</p>':'')+(S.mode==='defend'?'<p>แย่งพลาด '+S.errors+' ครั้ง</p>':'')+(S.mode==='dodge'?'<p>ถูกแย่งบอล '+S.errors+' ครั้ง</p>':'')+(S.mode==='passd'?'<p>ถูกตัด/ส่งพลาด '+S.errors+' ครั้ง</p>':'')+(S.mode==='prun'?'<p>สั่งพลาด '+S.errors+' ครั้ง</p>':'')+(isBest&&S.score>0?'<p>สถิติใหม่ของโหมดนี้</p>':'')+'<p>กด A หรือ Space เพื่อซ้อมอีกรอบ</p>';
  S.time=0;hud();
}
function hud(){
  $('score').textContent=S.score;$('time').textContent=Math.ceil(S.time);
  const a=S.hits.length?(S.hits.reduce((x,y)=>x+y,0)/S.hits.length/1000).toFixed(2):'-';
  $('avg').textContent=a;$('best').textContent=best[bk()]||0;
  $('err').textContent=S.errors;$('errl').textContent=({path:'ออกนอกเส้น',skill:'กดพลาด',defend:'แย่งพลาด',dodge:'ถูกแย่งบอล',passd:'ส่งพลาด/ถูกตัด',prun:'สั่งพลาด'})[S.mode]||'ส่งพลาด';
  $('err').parentElement.style.display=(S.mode==='target'||S.mode==='cone')?'none':'';
  $('skillrow').style.display=S.mode==='skill'?'':'none';
  $('aimrow').style.display=(S.mode==='pass'||S.mode==='passd')?'':'none';
  $('runrow').style.display=S.mode==='prun'?'':'none';
}

function action(){if(S.run&&S.mode==='pass')shoot();else if(S.run&&S.mode==='passd')shootD('A');else if(!(S.run&&['skill','defend','dodge','prun'].includes(S.mode)))toggle()}
// ท่า Skill: stick=อนาล็อกที่ใช้, mods=ปุ่มที่ต้องค้าง, steps=ลำดับทิศ (0=ขวา 1=ขวาบน 2=บน 3=ซ้ายบน 4=ซ้าย 5=ซ้ายล่าง 6=ล่าง 7=ขวาล่าง)
// src: gp12=จากหน้า Gameplay 12th ของ FC Online, ea=อ้างอิงเกมซีรีส์ EA FC
const SKILLS=[
 {id:'brd-l',n:'Ball Roll Drag ซ้าย',st:5,mods:[],stick:'LS',steps:[6,4],src:'gp12'},
 {id:'brd-r',n:'Ball Roll Drag ขวา',st:5,mods:[],stick:'LS',steps:[6,0],src:'gp12'},
 {id:'fn',n:'Flair Nutmeg',st:5,mods:['lt','rb'],stick:'LS',steps:['any'],src:'gp12'},
 {id:'ev',n:'Elastico Variation',st:5,mods:['rb'],stick:'RS',steps:[0,7,6,5,4],src:'gp12'},
 {id:'ec-l',n:'Elastico Chop ซ้าย',st:5,mods:['lt','rb'],stick:'RS',steps:[6,4],src:'gp12'},
 {id:'ec-r',n:'Elastico Chop ขวา',st:5,mods:['lt','rb'],stick:'RS',steps:[6,0],src:'gp12'},
 {id:'el',n:'Elastico',st:5,mods:[],stick:'RS',steps:[0,7,6,5,4],src:'ea'},
 {id:'hf',n:'Heel Flick',st:3,mods:[],stick:'RS',steps:[2,6],src:'ea'},
 {id:'ff',n:'Feint Forward and Turn',st:2,mods:[],stick:'RS',steps:[6,6],src:'ea'},
 {id:'sg',n:'Stop and Go',st:2,mods:['lt'],stick:'RS',steps:[6,2],src:'ea'}
];
const skSel=new Set(SKILLS.map(s=>s.id));
function drawChips(){
  const box=$('skillchips');box.innerHTML='';
  SKILLS.forEach(s=>{
    const b=document.createElement('button');b.textContent=s.n+' '+s.st+'★';b.setAttribute('aria-pressed',skSel.has(s.id));
    b.onclick=()=>{if(skSel.has(s.id)){if(skSel.size>1)skSel.delete(s.id)}else skSel.add(s.id);drawChips();reset()};
    box.appendChild(b);
  });
}
const setSel=ids=>{skSel.clear();ids.forEach(i=>skSel.add(i));drawChips();reset()};
$('skall').onclick=()=>setSel(SKILLS.map(s=>s.id));
$('sk12').onclick=()=>setSel(SKILLS.filter(s=>s.src==='gp12').map(s=>s.id));
drawChips();
function pickSkill(){
  const pool=SKILLS.filter(s=>skSel.has(s.id)),c=pool.filter(s=>s!==S.sk),list=c.length?c:pool;
  S.sk=list[Math.floor(Math.random()*list.length)];
  S.sp={i:0,t0:0,armed:true,last:-1};S.msg='';
}
function dirOf(inp){
  const L=LV[lv];
  if(inp.raw<.3)return -1;
  if(inp.raw<L.mag)return -2;
  const a=(Math.atan2(-inp.y,inp.x)*180/Math.PI+360)%360,k=Math.round(a/45)%8;
  let df=((a-k*45)%360+360)%360;if(df>180)df=360-df;
  return df<=L.ang?k:-2;
}
function skFail(m,d){S.errors++;S.msg=m;S.msgT=performance.now()+900;S.sp.i=0;S.sp.armed=false;S.sp.last=d}
function stepSkill(inp){
  const sk=S.sk,sp=S.sp,now=performance.now(),b=inp.btn,d=dirOf(inp);
  if(!sk)return;
  if(d===-1||(d>=0&&d!==sp.last))sp.armed=true;
  const ok=sk.mods.every(m=>b[m]);
  if(sp.i>0){
    if(!ok)return skFail('ปล่อยปุ่มค้างก่อนเวลา',d);
    if(now-sp.t0>LV[lv].win)return skFail('ช้าเกินไป',d);
  }
  if(!ok||!sp.armed)return;
  const w=sk.steps[sp.i];
  if(d>=0&&(w==='any'||d===w)){
    sp.i++;sp.t0=now;sp.armed=false;sp.last=d;
    if(sp.i>=sk.steps.length){hit();spawn();S.sp.armed=false;S.sp.last=d;S.okT=now+500}
  }
}
let prevX=false;
const ad=(a,b)=>{const d=((a-b)%360+360)%360;return d>180?360-d:d};
const DIRN=['ขวา','ขวาบน','บน','ซ้ายบน','ซ้าย','ซ้ายล่าง','ล่าง','ขวาล่าง'];
function place(min,r){let x,y;do{x=rnd(60,W-60);y=rnd(60,H-60)}while(Math.hypot(x-W/2,y-H/2)<min);return{x,y,a:rnd(0,6.283),tt:0,r}}
// ===== ส่งบอลมีผู้ป้องกัน: A แรงดึงดูดมาก (k=1.2) / X แรงดึงดูดน้อย (k=.4) คูณด้วย LV.as =====
function setupPassD(){
  const L=LV[lv];S.ball=null;
  S.mates=[0,1,2].map(()=>place(150,26*L.r));
  // กองหลัง 1 คนตามจุดเหลือง และอีก 2 คนตามประกบเพื่อนสีน้ำเงินคนละคน
  S.defs=Array.from({length:3},(_,i)=>({...place(120,20),target:i===0?'player':i-1}));
}
function shootD(kind){
  if(S.ball||!S.run)return;
  S.shots++;S.ball={x:S.p.x,y:S.p.y,a:S.aim,v:850,k:kind==='A'?1.2:.4,kind};
}
function stepPassD(inp,dt){
  const L=LV[lv],now=performance.now();
  S.mates.forEach(m=>{
    m.tt-=dt;if(m.tt<=0){m.a=rnd(0,6.283);m.tt=rnd(.8,2)}
    m.x+=Math.cos(m.a)*55*dt;m.y+=Math.sin(m.a)*55*dt;
    if(m.x<50||m.x>W-50){m.a=Math.PI-m.a;m.x=Math.max(50,Math.min(W-50,m.x))}
    if(m.y<50||m.y>H-50){m.a=-m.a;m.y=Math.max(50,Math.min(H-50,m.y))}
    const dx=m.x-W/2,dy=m.y-H/2,dd=Math.hypot(dx,dy)||1;
    if(dd<110){m.x=W/2+dx/dd*110;m.y=H/2+dy/dd*110;m.a=Math.atan2(dy,dx)}
  });
  S.defs.forEach(d=>{
    const t=d.target==='player'?S.p:S.mates[d.target];
    const dx=t.x-d.x,dy=t.y-d.y,dd=Math.hypot(dx,dy)||1,sp=Math.min(L.dd,dd*3);
    d.x+=dx/dd*sp*dt;d.y+=dy/dd*sp*dt;
  });
  if(inp.btn.x&&!prevX)shootD('X');prevX=!!inp.btn.x;
  const b=S.ball;if(!b)return;
  let best=null,ba=.7;
  S.mates.forEach(m=>{const t=Math.atan2(m.y-b.y,m.x-b.x),d=((t-b.a+Math.PI*3)%(Math.PI*2))-Math.PI;if(Math.abs(d)<ba){ba=Math.abs(d);best=d}});
  if(best!==null){const r=b.k*L.as*dt;b.a+=Math.max(-r,Math.min(r,best))}
  b.x+=Math.cos(b.a)*b.v*dt;b.y+=Math.sin(b.a)*b.v*dt;
  const hm=S.mates.find(m=>Math.hypot(b.x-m.x,b.y-m.y)<m.r+8);
  if(hm){hit();S.fx={t:now+400,c:'#5ee08a',x:hm.x,y:hm.y};S.ball=null;Object.assign(hm,place(150,hm.r));return}
  const hd=S.defs.find(d=>Math.hypot(b.x-d.x,b.y-d.y)<d.r+8);
  if(hd){S.errors++;S.fx={t:now+400,c:'#ff6a55',x:hd.x,y:hd.y};S.ball=null;return}
  if(b.x<8||b.x>W-8||b.y<8||b.y>H-8){S.errors++;S.ball=null}
}
function drawPassD(){
  if(showAim){ctx.setLineDash([8,8]);ctx.strokeStyle='rgba(255,207,63,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(S.p.x,S.p.y);ctx.lineTo(S.p.x+Math.cos(S.aim)*110,S.p.y+Math.sin(S.aim)*110);ctx.stroke();ctx.setLineDash([])}
  S.defs.forEach(d=>{ctx.fillStyle='#ff5a46';ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke()});
  S.mates.forEach(m=>{ctx.fillStyle='#4aa3ff';ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke()});
  const b=S.ball;if(b){ctx.fillStyle=b.kind==='A'?'#fff':'#ffe9a8';ctx.beginPath();ctx.arc(b.x,b.y,7,0,7);ctx.fill()}
  drawKeys('A / Space = ส่งแบบดึงดูดมาก · X = ส่งแบบดึงดูดน้อย');
}
// ===== Player Run: หันหน้าหาเพื่อน (LS) + ค้าง LT+LB + ดีด RS ครั้งเดียว =====
const HOMES=[[250,130],[550,130],[400,410]];
function exitDist(x,y,k){
  const a=-k*Math.PI/4,vx=Math.cos(a),vy=Math.sin(a);let t=1e9;
  if(vx>.01)t=Math.min(t,(W-20-x)/vx);if(vx<-.01)t=Math.min(t,(20-x)/vx);
  if(vy>.01)t=Math.min(t,(H-20-y)/vy);if(vy<-.01)t=Math.min(t,(20-y)/vy);
  return t;
}
function setupRun(){S.runs=[];S.cmd=null;S.msg='';nextCmd()}
function nextCmd(){
  const busy=new Set(S.runs.map(r=>r.i)),free=[0,1,2].filter(i=>!busy.has(i));
  if(!free.length){S.cmd=null;return}
  const i=free[Math.floor(Math.random()*free.length)],[x,y]=HOMES[i];
  const ds=[0,1,2,3,4,5,6,7].filter(k=>exitDist(x,y,k)>150);
  S.cmd={i,k:ds[Math.floor(Math.random()*ds.length)],t0:performance.now(),armed:false};
}
function stepRun(inp,dt){
  const L=LV[lv],now=performance.now();
  S.runs.forEach(r=>{r.x+=r.vx*dt;r.y+=r.vy*dt});
  S.runs=S.runs.filter(r=>r.x>20&&r.x<W-20&&r.y>20&&r.y<H-20);
  if(!S.cmd){nextCmd();return}
  const c=S.cmd;
  if(now-c.t0>L.pw*1000){S.errors++;S.msg='หมดเวลา';S.msgT=now+900;nextCmd();return}
  const rm=Math.min(1,Math.hypot(inp.rs.x,inp.rs.y));
  if(rm<.3)c.armed=true;
  const rd=dirOf({x:inp.rs.x,y:inp.rs.y,raw:rm});
  if(!c.armed||rd<0)return;
  c.armed=false;
  const b=inp.btn,[hx,hy]=HOMES[c.i];
  const fl=Math.hypot(inp.ls.x,inp.ls.y)>.4,fa=Math.atan2(-inp.ls.y,inp.ls.x)*180/Math.PI;
  const face=fl&&ad(fa,Math.atan2(H/2-hy,hx-W/2)*180/Math.PI)<=L.ang+15;
  const modOk=runChord==='lb'?b.lb:(b.lt&&b.lb);
  const why=!modOk?(runChord==='lb'?'ต้องค้าง LB':'ต้องค้าง LT+LB'):!face?'หันหน้าไม่ถูกคน':rd!==c.k?'ทิศไม่ตรงเส้นเหลือง':'';
  if(why){S.errors++;S.msg=why;S.msgT=now+900;return}
  const a=-c.k*Math.PI/4;
  S.runs.push({i:c.i,k:c.k,x:hx,y:hy,vx:Math.cos(a)*280,vy:Math.sin(a)*280});
  hit();S.okT=now+500;nextCmd();
}
function drawRun(inp){
  const L=LV[lv],now=performance.now(),c=S.cmd;
  S.runs.forEach(r=>{const [hx,hy]=HOMES[r.i];ctx.strokeStyle='#4aa3ff';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(r.x,r.y);ctx.stroke();ctx.lineCap='butt'});
  if(c){
    const [hx,hy]=HOMES[c.i],e=Math.min(exitDist(hx,hy,c.k),260),a=-c.k*Math.PI/4,ex=hx+Math.cos(a)*e,ey=hy+Math.sin(a)*e;
    ctx.setLineDash([10,8]);ctx.strokeStyle='#ffcf3f';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(ex,ey);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='#ffcf3f';ctx.save();ctx.translate(ex,ey);ctx.rotate(a);ctx.beginPath();ctx.moveTo(14,0);ctx.lineTo(-6,-10);ctx.lineTo(-6,10);ctx.closePath();ctx.fill();ctx.restore();
  }
  const fl=Math.hypot(inp.ls.x,inp.ls.y)>.4,fa=Math.atan2(-inp.ls.y,inp.ls.x)*180/Math.PI;
  HOMES.forEach(([x,y],i)=>{
    const run=S.runs.find(r=>r.i===i),cur=c&&c.i===i,facing=fl&&ad(fa,Math.atan2(H/2-y,x-W/2)*180/Math.PI)<=L.ang+15;
    ctx.beginPath();ctx.arc(x,y,24,0,7);
    if(run){ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=2;ctx.stroke()}
    else{ctx.fillStyle='#4aa3ff';ctx.fill();ctx.strokeStyle=cur?'#ffcf3f':'#fff';ctx.lineWidth=cur?5:3;ctx.stroke()}
    if(facing&&!run){ctx.beginPath();ctx.arc(x,y,33,0,7);ctx.strokeStyle='#5ee08a';ctx.lineWidth=3;ctx.stroke()}
  });
  S.runs.forEach(r=>{ctx.fillStyle='#4aa3ff';ctx.beginPath();ctx.arc(r.x,r.y,24,0,7);ctx.fill();ctx.strokeStyle='#5ee08a';ctx.lineWidth=4;ctx.stroke()});
  if(fl&&showRunGuide){ctx.setLineDash([6,6]);ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.lineTo(W/2+Math.cos(fa*Math.PI/180)*130,H/2-Math.sin(fa*Math.PI/180)*130);ctx.stroke();ctx.setLineDash([])}
  ctx.textAlign='center';
  const shownMods=runChord==='lb'?[['LB',inp.btn.lb]]:[['LT',inp.btn.lt],['LB',inp.btn.lb]];
  shownMods.forEach(([n,on],i)=>{const x=W/2-(shownMods.length*80-10)/2+i*80;ctx.fillStyle=on?'#5ee08a':'rgba(255,255,255,.12)';ctx.fillRect(x,H-52,70,28);ctx.fillStyle=on?'#10200f':'#c5d6c9';ctx.font='600 15px Sarabun,sans-serif';ctx.fillText('ค้าง '+n,x+35,H-33)});
  ctx.fillStyle='#f2f7f1';ctx.font='600 19px Sarabun,sans-serif';
  if(c){
    ctx.fillText('สั่งคนที่ไฮไลต์ให้วิ่งไปทางเส้นเหลือง',W/2,34);
    const r=Math.max(0,1-(now-c.t0)/(L.pw*1000));ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(W/2-150,44,300,7);ctx.fillStyle=r>.3?'#5ee08a':'#ff8a3d';ctx.fillRect(W/2-150,44,300*r,7);
  }
  ctx.fillStyle='#93a99a';ctx.font='400 14px Sarabun,sans-serif';ctx.fillText('LS หันหน้าหาเพื่อน → ค้าง '+(runChord==='lb'?'LB':'LT+LB')+' → ดีด RS '+'ไปทิศเส้นเหลือง'+' (ครั้งเดียว)',W/2,72);
  ctx.font='600 22px Sarabun,sans-serif';
  if(now<S.msgT){ctx.fillStyle='#ff6a55';ctx.fillText('พลาด: '+S.msg,W/2,H-70)}
  else if(now<S.okT){ctx.fillStyle='#5ee08a';ctx.fillText('ผ่าน!',W/2,H-70)}
  ctx.textAlign='start';
}
let prevB=false;
function spawnCar(){
  let x,y;do{x=rnd(60,W-60);y=rnd(60,H-60)}while(Math.hypot(x-S.p.x,y-S.p.y)<200);
  S.car={x,y,a:rnd(0,6.283),tt:0};
}
function stepDefend(inp,dt){
  const c=S.car,L=LV[lv],now=performance.now();if(!c)return;
  const dx=S.p.x-c.x,dy=S.p.y-c.y,dd=Math.hypot(dx,dy);
  c.tt-=dt;
  if(c.tt<=0){c.a=Math.random()<.5?Math.atan2(-dy,-dx)+rnd(-1.1,1.1):rnd(0,6.283);c.tt=rnd(.4,1.1)}
  if(dd<110&&Math.random()<dt*3)c.a+=(Math.random()<.5?1:-1)*1.6;
  c.x+=Math.cos(c.a)*L.cs*dt;c.y+=Math.sin(c.a)*L.cs*dt;
  if(c.x<30||c.x>W-30){c.a=Math.PI-c.a;c.x=Math.max(30,Math.min(W-30,c.x))}
  if(c.y<30||c.y>H-30){c.a=-c.a;c.y=Math.max(30,Math.min(H-30,c.y))}
  const press=inp.btn.b&&!prevB;prevB=!!inp.btn.b;
  if(press&&now>S.stun){
    if(dd<L.tr+PR){hit();S.fx={t:now+400,c:'#5ee08a',x:c.x,y:c.y};spawnCar()}
    else{S.errors++;S.stun=now+600;S.fx={t:now+400,c:'#ff6a55',x:S.p.x,y:S.p.y}}
  }
}
function stepDodge(dt){
  const L=LV[lv],now=performance.now();
  if(now>=S.nextFoe&&S.foes.length<14){
    const e=Math.floor(Math.random()*4);let x,y;
    if(e===0){x=-20;y=rnd(0,H)}else if(e===1){x=W+20;y=rnd(0,H)}else if(e===2){x=rnd(0,W);y=-20}else{x=rnd(0,W);y=H+20}
    S.foes.push({x,y,a:Math.atan2(S.p.y-y,S.p.x-x),age:0});S.nextFoe=now+L.di*1000*rnd(.7,1.3);
  }
  S.foes=S.foes.filter(f=>{
    f.age+=dt;
    if(L.hm&&f.age<1.6){const t=Math.atan2(S.p.y-f.y,S.p.x-f.x),d=((t-f.a+Math.PI*3)%(Math.PI*2))-Math.PI;f.a+=Math.max(-L.hm*dt,Math.min(L.hm*dt,d))}
    f.x+=Math.cos(f.a)*L.ds*dt;f.y+=Math.sin(f.a)*L.ds*dt;
    if(now>S.inv&&Math.hypot(f.x-S.p.x,f.y-S.p.y)<PR*2-4){S.errors++;S.score=Math.max(0,S.score-2);S.inv=now+1000;S.fx={t:now+400,c:'#ff6a55',x:S.p.x,y:S.p.y};return false}
    if(f.x<-40||f.x>W+40||f.y<-40||f.y>H+40){S.score++;return false}
    return true;
  });
}
function drawFx(){
  const f=S.fx,now=performance.now();if(!f||now>=f.t)return;
  const k=1-(f.t-now)/400;ctx.globalAlpha=1-k;ctx.strokeStyle=f.c;ctx.lineWidth=4;
  ctx.beginPath();ctx.arc(f.x,f.y,PR+6+k*34,0,7);ctx.stroke();ctx.globalAlpha=1;
}
function drawKeys(t){
  ctx.fillStyle='rgba(235,245,235,.85)';ctx.font='600 15px Sarabun,sans-serif';ctx.fillText(t,26,H-24);
  if(S.sprint&&(S.mode==='defend'||S.mode==='dodge')){ctx.fillStyle='#ffcf3f';ctx.fillText('วิ่งเร็ว!',26,H-46)}
}
function drawDefend(){
  const c=S.car,L=LV[lv];if(!c)return;
  const near=Math.hypot(S.p.x-c.x,S.p.y-c.y)<L.tr+PR;
  ctx.strokeStyle=near?'#5ee08a':'rgba(255,255,255,.4)';ctx.lineWidth=near?4:2;ctx.setLineDash(near?[]:[6,6]);
  ctx.beginPath();ctx.arc(c.x,c.y,L.tr+PR,0,7);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#4aa3ff';ctx.beginPath();ctx.arc(c.x,c.y,18,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(c.x+Math.cos(c.a)*27,c.y+Math.sin(c.a)*27,6,0,7);ctx.fill();
  drawKeys('RT = วิ่งเร็ว · B = แย่งบอล (กดเมื่อวงเป็นสีเขียว)');
}
function drawDodge(){
  S.foes.forEach(f=>{
    ctx.strokeStyle='rgba(255,90,70,.4)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x-Math.cos(f.a)*32,f.y-Math.sin(f.a)*32);ctx.stroke();
    ctx.fillStyle='#ff5a46';ctx.beginPath();ctx.arc(f.x,f.y,PR,0,7);ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  });
  drawKeys('RT = วิ่งเร็ว · หลบจุดแดงที่พุ่งเข้ามา');
}
function arrow(cx,cy,k,col){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(-k*Math.PI/4);
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(-14,0);ctx.lineTo(8,0);ctx.stroke();
  ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(4,-11);ctx.lineTo(4,11);ctx.closePath();ctx.fill();
  ctx.restore();
}
function drawSkill(inp){
  const sk=S.sk,sp=S.sp;if(!sk)return;
  const now=performance.now(),b=inp.btn;
  ctx.fillStyle='rgba(8,24,14,.82)';ctx.fillRect(40,36,W-80,H-72);
  ctx.textAlign='center';
  ctx.fillStyle='#f2f7f1';ctx.font='700 34px Kanit,Sarabun,sans-serif';ctx.fillText(sk.n,W/2,86);
  ctx.fillStyle='#ffcf3f';ctx.font='500 19px Sarabun,sans-serif';
  ctx.fillText('★'.repeat(sk.st)+'   '+(sk.stick==='LS'?'อนาล็อกซ้าย (LS)':'อนาล็อกขวา (RS)'),W/2,118);
  const mw=118,mx=W/2-(sk.mods.length*(mw+12)-12)/2;
  if(!sk.mods.length){ctx.fillStyle='#93a99a';ctx.font='400 16px Sarabun,sans-serif';ctx.fillText('ไม่ต้องกดปุ่มค้าง',W/2,166)}
  sk.mods.forEach((m,i)=>{
    const on=b[m],x=mx+i*(mw+12);
    ctx.fillStyle=on?'#5ee08a':'rgba(255,255,255,.1)';ctx.fillRect(x,144,mw,34);
    ctx.fillStyle=on?'#10200f':'#c5d6c9';ctx.font='600 17px Sarabun,sans-serif';ctx.fillText('ค้าง '+m.toUpperCase(),x+mw/2,167);
  });
  const n=sk.steps.length,gap=88,x0=W/2-(n-1)*gap/2;
  sk.steps.forEach((w,i)=>{
    const cx=x0+i*gap,cy=262,done=i<sp.i,cur=i===sp.i;
    ctx.beginPath();ctx.arc(cx,cy,34,0,7);
    ctx.fillStyle=done?'#2e9e5b':'rgba(255,255,255,.08)';ctx.fill();
    ctx.lineWidth=cur?5:2;ctx.strokeStyle=cur?'#ffcf3f':'rgba(255,255,255,.3)';ctx.stroke();
    const col=done?'#10200f':cur?'#ffcf3f':'#c5d6c9';
    if(w==='any'){ctx.fillStyle=col;ctx.font='600 15px Sarabun,sans-serif';ctx.fillText('ทุกทิศ',cx,cy+5)}else arrow(cx,cy,w,col);
  });
  if(sp.i>0){const r=Math.max(0,1-(now-sp.t0)/LV[lv].win);ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(W/2-170,332,340,8);ctx.fillStyle=r>.3?'#5ee08a':'#ff8a3d';ctx.fillRect(W/2-170,332,340*r,8)}
  ctx.font='600 22px Sarabun,sans-serif';
  if(now<S.msgT){ctx.fillStyle='#ff6a55';ctx.fillText('พลาด: '+S.msg,W/2,384)}
  else if(now<S.okT){ctx.fillStyle='#5ee08a';ctx.fillText('ผ่าน!',W/2,384)}
  ctx.fillStyle='#93a99a';ctx.font='400 14px Sarabun,sans-serif';
  ctx.fillText(sk.src==='gp12'?'ท่ามาตรฐานจากหน้า Gameplay 12th ของ FC Online':'อ้างอิงจากเกมซีรีส์ EA FC (ตรวจสอบกับในเกมอีกครั้ง)',W/2,440);
  ctx.fillText('ทิศลูกศร = มุมมองหลังนักเตะ (บน = ไปข้างหน้า)',W/2,462);
  ctx.textAlign='start';
}
function shoot(){
  if(S.ball||!S.t[0])return;
  S.shots++;S.ball={x:W/2,y:H/2,vx:Math.cos(S.aim)*900,vy:Math.sin(S.aim)*900};
}
function stepBall(dt){
  const b=S.ball;if(!b||!S.run)return;
  b.x+=b.vx*dt;b.y+=b.vy*dt;
  const t=S.t[0];
  if(Math.hypot(b.x-t.x,b.y-t.y)<t.r+8){hit();S.ball=null;spawn();return}
  if(b.x<10||b.x>W-10||b.y<10||b.y>H-10){S.ball=null;S.errors++}
}
function makePath(){
  const a=rnd(0,6.3),b=rnd(0,6.3),A=rnd(70,100),B=rnd(20,40),k=rnd(.011,.015),m=rnd(.022,.03),dir=Math.random()<.5?-1:1;
  const L=LV[lv];S.path={hw:L.hw,f:x=>H/2+dir*L.amp*(A*Math.sin(a+x*k)+B*Math.sin(b+x*m))};
  S.p={x:36,y:S.path.f(36)};S.trail=[];
}
function stepPath(){
  const P=S.path,x=S.p.x,sl=(P.f(x+3)-P.f(x-3))/6,d=Math.abs(S.p.y-P.f(x))/Math.sqrt(1+sl*sl);
  if(d>P.hw-PR){
    S.errors++;S.flash=performance.now()+350;
    const nx=Math.max(36,x-90);S.p={x:nx,y:P.f(nx)};S.trail=[];
  }else if(x>=W-36){hit();makePath()}
}
function hit(t){
  const now=performance.now();S.hits.push(now-S.lastHit);S.lastHit=now;S.score++;
}
function step(dt,inp){
  if(S.mode==='pass'||S.mode==='passd'){
    if(inp.raw>.35)S.aim=Math.atan2(inp.y,inp.x);
    if(S.mode==='pass')stepBall(dt);
    else{S.p.x=Math.max(PR,Math.min(W-PR,S.p.x+inp.ex*speed*dt));S.p.y=Math.max(PR,Math.min(H-PR,S.p.y+inp.ey*speed*dt))}
  }else if(S.mode!=='skill'&&S.mode!=='prun'){
    S.sprint=(S.mode==='defend'||S.mode==='dodge')&&inp.btn.rt;
    const sv=speed*(S.sprint?1.6:1)*(performance.now()<S.stun?.45:1);
    S.p.x=Math.max(PR,Math.min(W-PR,S.p.x+inp.ex*sv*dt));
    S.p.y=Math.max(PR,Math.min(H-PR,S.p.y+inp.ey*sv*dt));
    S.trail.push({x:S.p.x,y:S.p.y});if(S.trail.length>14)S.trail.shift();
  }
  if(!S.run)return;
  S.time=Math.max(0,(S.end-performance.now())/1000);
  if(S.time<=0){finish();return}
  if(S.mode==='cone'){
    const t=S.t[S.next];
    if(t&&Math.hypot(S.p.x-t.x,S.p.y-t.y)<t.r+PR){hit(t);S.next++;if(S.next>=S.t.length){S.score+=3;S.rev=!S.rev;spawn()}}
  }else if(S.mode==='target'){
    const t=S.t[0];
    if(Math.hypot(S.p.x-t.x,S.p.y-t.y)<t.r+PR){hit(t);spawn()}
  }else if(S.mode==='path')stepPath();
  else if(S.mode==='skill')stepSkill(inp);
  else if(S.mode==='defend')stepDefend(inp,dt);
  else if(S.mode==='dodge')stepDodge(dt);
  else if(S.mode==='passd')stepPassD(inp,dt);
  else if(S.mode==='prun')stepRun(inp,dt);
  hud();
}

function drawField(){
  ctx.fillStyle='#143823';ctx.fillRect(0,0,W,H);
  for(let i=0;i<10;i++){if(i%2){ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(i*80,0,80,H)}}
  ctx.strokeStyle='rgba(235,245,235,.55)';ctx.lineWidth=2;
  ctx.strokeRect(16,16,W-32,H-32);
  ctx.beginPath();ctx.moveTo(W/2,16);ctx.lineTo(W/2,H-16);ctx.stroke();
  ctx.beginPath();ctx.arc(W/2,H/2,62,0,7);ctx.stroke();
  ctx.strokeRect(16,H/2-110,110,220);ctx.strokeRect(W-126,H/2-110,110,220);
}
function drawTargets(){
  const pulse=1+Math.sin(performance.now()/180)*.06;
  S.t.forEach((t,i)=>{
    if(S.mode==='cone'){
      const act=i===S.next,done=i<S.next;
      ctx.globalAlpha=done?.25:1;
      ctx.fillStyle=act?'#ff8a3d':'#e0693a';
      ctx.beginPath();ctx.moveTo(t.x,t.y-t.r);ctx.lineTo(t.x+t.r*.85,t.y+t.r*.7);ctx.lineTo(t.x-t.r*.85,t.y+t.r*.7);ctx.closePath();ctx.fill();
      if(act){ctx.strokeStyle='#ffe3a0';ctx.lineWidth=3;ctx.beginPath();ctx.arc(t.x,t.y,t.r*1.5*pulse,0,7);ctx.stroke()}
      ctx.globalAlpha=1;
    }else{
      ctx.strokeStyle='#ff8a3d';ctx.lineWidth=4;
      ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse,0,7);ctx.stroke();
      ctx.fillStyle='rgba(255,138,61,.28)';ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse,0,7);ctx.fill();
      ctx.fillStyle='#ff8a3d';ctx.beginPath();ctx.arc(t.x,t.y,4,0,7);ctx.fill();
    }
  });
}
function drawPass(){
  const t=S.t[0];if(!t)return;
  if(showAim){
    ctx.setLineDash([8,8]);ctx.strokeStyle='rgba(255,207,63,.75)';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.lineTo(W/2+Math.cos(S.aim)*110,H/2+Math.sin(S.aim)*110);ctx.stroke();ctx.setLineDash([]);
  }
  const pulse=1+Math.sin(performance.now()/200)*.05;
  ctx.fillStyle='#4aa3ff';ctx.beginPath();ctx.arc(t.x,t.y,t.r*pulse,0,7);ctx.fill();
  ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.stroke();
  if(S.ball){ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(S.ball.x,S.ball.y,7,0,7);ctx.fill()}
}
function drawPath(){
  const P=S.path;if(!P)return;
  const hot=performance.now()<S.flash;
  const trace=()=>{ctx.beginPath();for(let x=30;x<=W-30;x+=8){const y=P.f(x);x===30?ctx.moveTo(x,y):ctx.lineTo(x,y)}};
  ctx.lineCap='round';ctx.lineJoin='round';
  trace();ctx.strokeStyle=hot?'#ff5a46':'rgba(235,245,235,.7)';ctx.lineWidth=P.hw*2+6;ctx.stroke();
  trace();ctx.strokeStyle=hot?'#5a2a22':'#1b4d2f';ctx.lineWidth=P.hw*2;ctx.stroke();
  trace();ctx.strokeStyle='rgba(255,255,255,.22)';ctx.lineWidth=2;ctx.setLineDash([10,12]);ctx.stroke();ctx.setLineDash([]);
  ctx.lineCap='butt';
  ctx.fillStyle='#ffcf3f';ctx.fillRect(30,P.f(36)-P.hw,4,P.hw*2);
  ctx.fillStyle='#fff';ctx.fillRect(W-34,P.f(W-36)-P.hw,4,P.hw*2);
}
function drawPlayer(){
  S.trail.forEach((q,i)=>{ctx.fillStyle='rgba(255,207,63,'+(i/S.trail.length*.28)+')';ctx.beginPath();ctx.arc(q.x,q.y,PR*(.5+i/S.trail.length*.5),0,7);ctx.fill()});
  ctx.fillStyle='#ffcf3f';ctx.beginPath();ctx.arc(S.p.x,S.p.y,PR,0,7);ctx.fill();
  ctx.strokeStyle='#1a2a10';ctx.lineWidth=2;ctx.stroke();
}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function drawStick(inp){
  const c=sc,h=90,R=80;c.clearRect(0,0,180,180);
  c.strokeStyle=css('--line');c.lineWidth=2;c.beginPath();c.arc(h,h,R,0,7);c.stroke();
  c.beginPath();c.moveTo(h,10);c.lineTo(h,170);c.moveTo(10,h);c.lineTo(170,h);c.stroke();
  c.setLineDash([4,4]);c.strokeStyle=css('--mute');c.beginPath();c.arc(h,h,R*dz,0,7);c.stroke();c.setLineDash([]);
  S.stickTrail.push({x:inp.x,y:inp.y});if(S.stickTrail.length>18)S.stickTrail.shift();
  const ok=css('--ok');
  S.stickTrail.forEach((q,i)=>{c.globalAlpha=i/S.stickTrail.length*.35;c.fillStyle=ok;c.beginPath();c.arc(h+q.x*R*.9,h+q.y*R*.9,5,0,7);c.fill()});
  c.globalAlpha=1;c.fillStyle='#ffcf3f';c.beginPath();c.arc(h+inp.x*R*.9,h+inp.y*R*.9,9,0,7);c.fill();
  c.strokeStyle='#1a2a10';c.lineWidth=2;c.stroke();
}
function readout(inp){
  $('vx').textContent=inp.x.toFixed(2);$('vy').textContent=inp.y.toFixed(2);
  $('mag').textContent=Math.round(inp.raw*100);
  if(inp.raw<dz){$('ang').textContent='-';return}
  const a=(Math.atan2(-inp.y,inp.x)*180/Math.PI+360)%360;
  const names=['ขวา','ขวาบน','บน','ซ้ายบน','ซ้าย','ซ้ายล่าง','ล่าง','ขวาล่าง'];
  $('ang').textContent=names[Math.round(a/45)%8]+' '+Math.round(a)+'°';
}

let last=performance.now();
function loop(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  const inp=readInput();
  step(dt,inp);
  drawField();if(S.mode==='path')drawPath();else if(S.mode==='pass')drawPass();else if(S.mode==='defend')drawDefend();else if(S.mode==='dodge')drawDodge();else if(S.mode==='passd')drawPassD();else if(S.mode==='prun')drawRun(inp);else if(S.mode!=='skill')drawTargets();
  if(S.mode==='skill')drawSkill(inp);else if(!(performance.now()<S.inv&&Math.floor(performance.now()/90)%2))drawPlayer();
  drawFx();drawStick(inp);readout(inp);
  const gp=(navigator.getGamepads?navigator.getGamepads():[]);
  if(![...gp].some(g=>g&&g.connected)&&!$('status').textContent.startsWith('ยังไม่')&&!$('status').textContent.startsWith('จอยหลุด'))$('status').textContent='ยังไม่พบจอย';
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);