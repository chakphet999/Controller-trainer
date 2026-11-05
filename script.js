const $=id=>document.getElementById(id);
const W=800,H=500,PR=14,DURATION=60;
const cv=$('cv'),ctx=cv.getContext('2d'),sv=$('sv'),sc=sv.getContext('2d');
(function(){const d=window.devicePixelRatio||1;cv.width=W*d;cv.height=H*d;ctx.setTransform(d,0,0,d,0,0);sv.width=180*d;sv.height=180*d;sc.setTransform(d,0,0,d,0,0)})();

const DESC={
  target:'ควบคุมจุดไปแตะเป้าหมายที่โผล่ขึ้นทีละจุด ฝึกความแม่นในการเล็งทิศ',
  cone:'เลี้ยงผ่านกรวยตามลำดับแบบซิกแซก กรวยที่เรืองแสงคือจุดถัดไป ครบทั้งชุดได้โบนัส +3',
  pass:'เอียงอนาล็อกเพื่อเล็งทิศ แล้วกดปุ่ม A (หรือ Space) ส่งบอลให้เพื่อนร่วมทีมสีฟ้า ฝึกความแม่นของมุม (กด Q เปิด/ปิดเส้นแนวส่ง)',
  path:'คุมจุดจากซ้ายไปขวาตามเส้นทางโค้ง ห้ามออกนอกเส้น ถ้าหลุดจะถูกดึงกลับไปถอยหลังเล็กน้อย'
};
const S={mode:'target',run:false,score:0,time:DURATION,p:{x:W/2,y:H/2},t:[],next:0,rev:false,side:0,hits:[],lastHit:0,end:0,trail:[],stickTrail:[],errors:0,shots:0,ball:null,aim:0,path:null,flash:0};
let stick=0,dz=.12,speed=380,prevA=false,best={},lv='normal',showAim=true;
// ระดับความยาก: r=ขนาดเป้า/กรวย, hw=ความกว้างทางครึ่งหนึ่ง, amp=ความโค้งของทาง, cones=จำนวนกรวย, dist=ระยะเพื่อนร่วมทีม
const LV={easy:{r:1.3,hw:64,amp:.7,cones:4,dist:[150,260]},normal:{r:1,hw:50,amp:1,cones:5,dist:[180,330]},hard:{r:.62,hw:40,amp:1.3,cones:7,dist:[260,400]}};
const bk=()=>S.mode+'-'+lv;
const keys={};
try{best=JSON.parse(localStorage.getItem('fcst-best')||'{}')}catch(e){best={}}

addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' '){e.preventDefault();if(!e.repeat)action()}if(k==='q'&&!e.repeat&&S.mode==='pass')setAim(!showAim);keys[k]=true});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=false});
addEventListener('gamepadconnected',e=>{$('status').innerHTML='เชื่อมต่อแล้ว: <b>'+e.gamepad.id.slice(0,48)+'</b>'});
addEventListener('gamepaddisconnected',()=>{$('status').textContent='จอยหลุดการเชื่อมต่อ กำลังใช้คีย์บอร์ดแทน'});

function seg(id,attr,fn){$(id).addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;[...$(id).children].forEach(x=>x.setAttribute('aria-pressed',x===b));fn(b.dataset[attr])})}
seg('modes','mode',m=>{S.mode=m;$('desc').textContent=DESC[m];reset()});
seg('sticks','stick',v=>{stick=+v});
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
  let x=0,y=0;
  if(g){
    x=g.axes[stick*2]||0;y=g.axes[stick*2+1]||0;
    const a=!!(g.buttons[0]&&g.buttons[0].pressed);
    if(a&&!prevA)action();prevA=a;
  }else{
    x=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0);
    y=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
    const m=Math.hypot(x,y);if(m>1){x/=m;y/=m}
  }
  const raw=Math.min(1,Math.hypot(x,y));
  let ex=0,ey=0;
  if(raw>dz){const k=(raw-dz)/(1-dz)/raw;ex=x*k;ey=y*k}
  return{x,y,ex,ey,raw};
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
  $('ov').innerHTML='<div class="big">'+S.score+' คะแนน</div><p>เวลาเฉลี่ยต่อเป้า '+(avg?avg.toFixed(2)+' วินาที':'-')+'</p>'+(S.mode==='pass'&&S.shots?'<p>ส่งแม่น '+Math.round(S.score/S.shots*100)+'% ('+S.score+'/'+S.shots+' ครั้ง)</p>':'')+(S.mode==='path'?'<p>ออกนอกเส้น '+S.errors+' ครั้ง</p>':'')+(isBest&&S.score>0?'<p>สถิติใหม่ของโหมดนี้</p>':'')+'<p>กด A หรือ Space เพื่อซ้อมอีกรอบ</p>';
  S.time=0;hud();
}
function hud(){
  $('score').textContent=S.score;$('time').textContent=Math.ceil(S.time);
  const a=S.hits.length?(S.hits.reduce((x,y)=>x+y,0)/S.hits.length/1000).toFixed(2):'-';
  $('avg').textContent=a;$('best').textContent=best[bk()]||0;
  $('err').textContent=S.errors;$('errl').textContent=S.mode==='path'?'ออกนอกเส้น':'ส่งพลาด';
  $('err').parentElement.style.display=(S.mode==='pass'||S.mode==='path')?'':'none';
  $('aimrow').style.display=S.mode==='pass'?'':'none';
}

function action(){if(S.run&&S.mode==='pass')shoot();else toggle()}
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
  if(S.mode==='pass'){
    if(inp.raw>.35)S.aim=Math.atan2(inp.y,inp.x);
    stepBall(dt);
  }else{
    S.p.x=Math.max(PR,Math.min(W-PR,S.p.x+inp.ex*speed*dt));
    S.p.y=Math.max(PR,Math.min(H-PR,S.p.y+inp.ey*speed*dt));
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
  drawField();if(S.mode==='path')drawPath();else if(S.mode==='pass')drawPass();else drawTargets();drawPlayer();drawStick(inp);readout(inp);
  const gp=(navigator.getGamepads?navigator.getGamepads():[]);
  if(![...gp].some(g=>g&&g.connected)&&!$('status').textContent.startsWith('ยังไม่')&&!$('status').textContent.startsWith('จอยหลุด'))$('status').textContent='ยังไม่พบจอย';
  requestAnimationFrame(loop);
}
reset();
requestAnimationFrame(loop);
