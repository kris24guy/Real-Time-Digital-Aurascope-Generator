// ============================================================
// AURASPANSE — server.js  (drop-in for realtime-aurascope on Render)
// Env vars required on Render:
//   STRIPE_SECRET_KEY     — from stripe.com/dashboard/apikeys
//   STRIPE_PRICE_ID       — price_xxx from your Stripe product
//   STRIPE_WEBHOOK_SECRET — from stripe.com/dashboard/webhooks
//   ANTHROPIC_API_KEY     — from console.anthropic.com
//   RESEND_API_KEY        — from resend.com (3k free/mo)
//   FROM_EMAIL            — e.g. reading@yourdomain.com
//   BASE_URL              — https://realtime-aurascope.onrender.com
// ============================================================
'use strict';
const express  = require('express');
const stripe   = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
const app      = express();
const resend   = new Resend(process.env.RESEND_API_KEY);
const ai       = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Stripe webhooks need raw body BEFORE json middleware
app.use('/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// ── DATA ─────────────────────────────────────────────────────────────────────
const mxh = arr => {
  const c = arr.map(h => ({ r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16) }));
  return '#' + ['r','g','b'].map(k => Math.round(c.reduce((s,v) => s+v[k], 0)/c.length).toString(16).padStart(2,'0')).join('');
};
const SIGNS = [
  { n:'Aries',     sym:'♈', sub:mxh(['#DC143C','#FF6B35','#8B0000']), dates:'Mar 21–Apr 19' },
  { n:'Taurus',    sym:'♉', sub:mxh(['#228B22','#8FBC8F','#4A3728']), dates:'Apr 20–May 20' },
  { n:'Gemini',    sym:'♊', sub:mxh(['#FFD700','#DAA520','#8B7536']), dates:'May 21–Jun 20' },
  { n:'Cancer',    sym:'♋', sub:mxh(['#C8A2C8','#9B8EA5','#6B5B7B']), dates:'Jun 21–Jul 22' },
  { n:'Leo',       sym:'♌', sub:mxh(['#FFA500','#FF8C00','#B8420A']), dates:'Jul 23–Aug 22' },
  { n:'Virgo',     sym:'♍', sub:mxh(['#9DC183','#6B8E6B','#3D5A3E']), dates:'Aug 23–Sep 22' },
  { n:'Libra',     sym:'♎', sub:mxh(['#FFB7C5','#DDA0DD','#9B59B6']), dates:'Sep 23–Oct 22' },
  { n:'Scorpio',   sym:'♏', sub:mxh(['#8B008B','#4B0082','#2C0052']), dates:'Oct 23–Nov 21' },
  { n:'Sagittarius',sym:'♐',sub:mxh(['#9370DB','#7B5EA7','#4A235A']), dates:'Nov 22–Dec 21' },
  { n:'Capricorn', sym:'♑', sub:mxh(['#2E8B57','#4682B4','#191970']), dates:'Dec 22–Jan 19' },
  { n:'Aquarius',  sym:'♒', sub:mxh(['#00CED1','#40E0D0','#008B8B']), dates:'Jan 20–Feb 18' },
  { n:'Pisces',    sym:'♓', sub:mxh(['#7EC8E3','#B0C4DE','#5B7FA6']), dates:'Feb 19–Mar 20' },
];
const STONES = [
  { n:'Garnet',m:1,sub:mxh(['#9B2335','#7A3B2E','#4A1010']) },
  { n:'Amethyst',m:2,sub:mxh(['#7B2FBE','#9B59B6','#4A235A']) },
  { n:'Aquamarine',m:3,sub:mxh(['#7FFFD4','#40E0D0','#005F73']) },
  { n:'Diamond',m:4,sub:mxh(['#D8D8E8','#B4B4C4','#787888']) },
  { n:'Emerald',m:5,sub:mxh(['#50C878','#2E8B57','#1B5E20']) },
  { n:'Pearl',m:6,sub:mxh(['#FAF0E6','#D4C5B0','#B8A898']) },
  { n:'Ruby',m:7,sub:mxh(['#E0115F','#C41E3A','#8B0000']) },
  { n:'Peridot',m:8,sub:mxh(['#9ACD32','#6B8E23','#556B2F']) },
  { n:'Sapphire',m:9,sub:mxh(['#1560BD','#1F6FBF','#0A3055']) },
  { n:'Opal',m:10,sub:mxh(['#D8B4FE','#C084FC','#7C3AED']) },
  { n:'Topaz',m:11,sub:mxh(['#FFC200','#E8A800','#B87A00']) },
  { n:'Turquoise',m:12,sub:mxh(['#30D5C8','#20B2AA','#008080']) },
];
const TR = [
  [{ n:'Warmth of fire', dH:20, dS:5,  dL:3  },
   { n:'Depth of water', dH:-25,dS:10, dL:-5 },
   { n:'Clarity of air', dH:60, dS:-5, dL:8  },
   { n:'Weight of earth',dH:-50,dS:8,  dL:-8 }],
  [{ n:'Expansion',  dH:10, dS:20, dL:5  },
   { n:'Contraction',dH:-10,dS:-15,dL:-5 },
   { n:'Oscillation',dH:30, dS:2,  dL:3  },
   { n:'Stillness',  dH:0,  dS:-18,dL:0  }],
  [{ n:'Memory',   dH:-15,dS:12, dL:-10 },
   { n:'Presence', dH:0,  dS:15, dL:0   },
   { n:'Becoming', dH:15, dS:-8, dL:12  },
   { n:'Return',   dH:-30,dS:0,  dL:-3  }],
];

// ── HELPERS ──────────────────────────────────────────────────────────────────
function h2hsl(hex) {
  let r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
  const M=Math.max(r,g,b), m=Math.min(r,g,b); let h,s,l=(M+m)/2;
  if(M===m) return [0,0,l*100];
  const d=M-m; s=l>.5?d/(2-M-m):d/(M+m);
  if(M===r) h=(g-b)/d+(g<b?6:0); else if(M===g) h=(b-r)/d+2; else h=(r-g)/d+4;
  return [h*60, s*100, l*100];
}
function hsl2hex(h,s,l) {
  h=((h%360)+360)%360; s/=100; l/=100;
  const a=s*Math.min(l,1-l);
  const f=n=>{const k=(n+h/30)%12,c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0');};
  return `#${f(0)}${f(8)}${f(4)}`;
}
function blArc(h1,s1,l1,h2,s2,l2,t) {
  let d=h2-h1; if(d>180)d-=360; if(d<-180)d+=360;
  return [(h1+d*t+360)%360, s1+(s2-s1)*t, l1+(l2-l1)*t];
}
function gsi(m,d) {
  if((m===3&&d>=21)||(m===4&&d<=19))return 0;if((m===4&&d>=20)||(m===5&&d<=20))return 1;
  if((m===5&&d>=21)||(m===6&&d<=20))return 2;if((m===6&&d>=21)||(m===7&&d<=22))return 3;
  if((m===7&&d>=23)||(m===8&&d<=22))return 4;if((m===8&&d>=23)||(m===9&&d<=22))return 5;
  if((m===9&&d>=23)||(m===10&&d<=22))return 6;if((m===10&&d>=23)||(m===11&&d<=21))return 7;
  if((m===11&&d>=22)||(m===12&&d<=21))return 8;if((m===12&&d>=22)||(m===1&&d<=19))return 9;
  if((m===1&&d>=20)||(m===2&&d<=18))return 10; return 11;
}
function computeAuraHSL(bdob, rdob, journeyChoices) {
  const b=new Date(bdob+'T12:00:00'), bm=b.getMonth()+1, bd=b.getDate();
  const bSg=SIGNS[gsi(bm,bd)], bSt=STONES.find(s=>s.m===bm)||STONES[0];
  let [h,s,l]=h2hsl(bSg.sub);
  const sH=h2hsl(bSt.sub);
  if (rdob) {
    const r=new Date(rdob+'T12:00:00'), rm=r.getMonth()+1, rd=r.getDate();
    const rH=h2hsl(SIGNS[gsi(rm,rd)].sub);
    const wt=Math.min(Math.abs(r-b)/(1000*86400*365.25*25),1);
    [h,s,l]=blArc(h,s,l,rH[0],rH[1],rH[2],wt);
  }
  if (journeyChoices) {
    journeyChoices.forEach((v,i)=>{
      if(v==null||v===undefined||v==='') return;
      const c=TR[i][+v]; if(!c) return;
      h=((h+c.dH)+360)%360; s=Math.max(15,Math.min(92,s+c.dS)); l=Math.max(22,Math.min(78,l+c.dL));
    });
  }
  const fH=blArc(h,s,l,sH[0],sH[1],sH[2],.25);
  return fH;
}

// ── HTML TEMPLATE ─────────────────────────────────────────────────────────────
const PAGE = () => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AuraSpanse</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  :root{--bg:#06070d;--surf:rgba(255,255,255,0.03);--brd:rgba(255,255,255,0.08);--txt:#e8eaf0;--muted:#6b7280}
  body{background:var(--bg);color:var(--txt);font-family:system-ui,-apple-system,sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:2rem 1rem 4rem}
  h1{font-size:clamp(1.4rem,4vw,2.2rem);letter-spacing:.12em;text-align:center;margin-bottom:.35rem;
     background:linear-gradient(135deg,#FFD700,#FF6B35,#a78bfa,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .sub{font-size:.75rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);text-align:center;margin-bottom:2.5rem}
  .shell{width:100%;max-width:860px;display:grid;grid-template-columns:220px 1fr;gap:2rem;align-items:start}
  @media(max-width:600px){.shell{grid-template-columns:1fr}}
  .orb-side{display:flex;flex-direction:column;align-items:center;gap:.75rem;position:sticky;top:1rem}
  canvas{border-radius:50%;display:block}
  .orb-name{font-size:.8rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
  .orb-hex{font-size:.8rem;font-weight:600;color:var(--txt);min-height:18px}
  .panel{display:flex;flex-direction:column;gap:.875rem}
  .card{background:var(--surf);border:.5px solid var(--brd);border-radius:16px;padding:1.1rem 1.25rem}
  .clbl{font-size:.68rem;letter-spacing:.15em;text-transform:uppercase;color:var(--muted);margin-bottom:.75rem}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .fld label{display:block;font-size:.75rem;color:var(--muted);margin-bottom:4px}
  input[type=date],input[type=email]{width:100%;padding:.55rem .75rem;background:rgba(255,255,255,0.05);
    border:.5px solid var(--brd);border-radius:10px;color:var(--txt);font-size:.85rem;outline:none;color-scheme:dark}
  input:focus{border-color:rgba(139,92,246,.6)}
  .choices{display:flex;flex-direction:column;gap:6px}
  .ch{display:flex;align-items:center;gap:10px;padding:.55rem .75rem;border:.5px solid var(--brd);border-radius:10px;
      cursor:pointer;background:transparent;transition:border-color .12s,background .12s}
  .ch:hover{border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.04)}
  .ch.sel{border-color:rgba(139,92,246,.7);background:rgba(139,92,246,.08)}
  .ch-orb{width:22px;height:22px;border-radius:50%;flex-shrink:0;transition:background .4s}
  .ch-text{font-size:.8rem;color:var(--muted)}
  .ch-text b{display:block;font-size:.82rem;color:var(--txt);margin-bottom:1px}
  .divider{height:.5px;background:var(--brd);margin:.25rem 0}
  .pay-row{display:flex;gap:10px;align-items:flex-end}
  .pay-row .fld{flex:1}
  .btn{padding:.65rem 1.4rem;background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;
       border-radius:10px;color:#fff;font-size:.85rem;font-weight:600;cursor:pointer;white-space:nowrap;
       letter-spacing:.04em;transition:opacity .15s;width:100%}
  .btn:hover{opacity:.88}.btn:disabled{opacity:.4;cursor:not-allowed}
  .msg{font-size:.75rem;min-height:18px;margin-top:.35rem}
  .msg.err{color:#f87171}.msg.ok{color:#4ade80}

  /* Loading screen */
  #loading{display:none;position:fixed;inset:0;background:var(--bg);z-index:100;
    flex-direction:column;align-items:center;justify-content:center;gap:1.5rem}
  #loading.show{display:flex}
  #load-orb{border-radius:50%}
  .load-msg{font-size:1rem;letter-spacing:.08em;color:var(--txt);text-align:center;min-height:24px}
  .prog-track{width:260px;height:3px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden}
  .prog-bar{height:100%;width:0%;border-radius:2px;transition:width .3s ease;background:linear-gradient(90deg,#6366f1,#a78bfa)}
</style>
</head>
<body>

<!-- Loading overlay -->
<div id="loading">
  <canvas id="load-orb" width="130" height="130"></canvas>
  <div class="load-msg" id="load-msg">Tuning your frequency…</div>
  <div class="prog-track"><div class="prog-bar" id="prog"></div></div>
</div>

<h1>AURASPANSE</h1>
<p class="sub">Your living aura · no edge, only position</p>

<div class="shell">
  <div class="orb-side">
    <canvas id="orb" width="200" height="200"></canvas>
    <div class="orb-name">Your auratar</div>
    <div class="orb-hex" id="orb-hex">—</div>
  </div>

  <div class="panel">
    <!-- Coordinates -->
    <div class="card">
      <div class="clbl">Coordinates</div>
      <div class="row2">
        <div class="fld"><label>Birth date</label><input type="date" id="bdt" max="2025-12-31" oninput="upd()"></div>
        <div class="fld"><label>Registration date</label><input type="date" id="rdt" max="2025-12-31" oninput="upd()"></div>
      </div>
    </div>

    <!-- Journey 1 -->
    <div class="card">
      <div class="clbl">What first calls to you?</div>
      <div class="choices" id="cg0"></div>
    </div>

    <!-- Journey 2 -->
    <div class="card">
      <div class="clbl">What moves within you?</div>
      <div class="choices" id="cg1"></div>
    </div>

    <!-- Journey 3 -->
    <div class="card">
      <div class="clbl">What do you carry forward?</div>
      <div class="choices" id="cg2"></div>
    </div>

    <!-- Payment / Email gate -->
    <div class="card">
      <div class="clbl">Receive your full reading</div>
      <div class="pay-row">
        <div class="fld"><label>Email</label>
          <input type="email" id="email" placeholder="you@email.com">
        </div>
        <button class="btn" id="pay-btn" onclick="startPayment()" style="margin-bottom:0;max-width:160px">
          Get Full Reading · $4.99
        </button>
      </div>
      <div class="msg" id="pay-msg"></div>
    </div>
  </div>
</div>

<script>
// ── COLOR MATH (client mirror) ───────────────────────────────────────────────
const h2r=h=>({r:parseInt(h.slice(1,3),16),g:parseInt(h.slice(3,5),16),b:parseInt(h.slice(5,7),16)});
const mxh=a=>'#'+['r','g','b'].map(k=>Math.round(a.map(h2r).reduce((s,v)=>s+v[k],0)/a.length).toString(16).padStart(2,'0')).join('');
function h2hsl(x){let r=parseInt(x.slice(1,3),16)/255,g=parseInt(x.slice(3,5),16)/255,b=parseInt(x.slice(5,7),16)/255;const M=Math.max(r,g,b),m=Math.min(r,g,b);let h,s,l=(M+m)/2;if(M===m)return[0,0,l*100];const d=M-m;s=l>.5?d/(2-M-m):d/(M+m);if(M===r)h=(g-b)/d+(g<b?6:0);else if(M===g)h=(b-r)/d+2;else h=(r-g)/d+4;return[h*60,s*100,l*100];}
function hsl2h(h,s,l){h=((h%360)+360)%360;s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12,c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0');};return '#'+f(0)+f(8)+f(4);}
function blArc(h1,s1,l1,h2,s2,l2,t){let d=h2-h1;if(d>180)d-=360;if(d<-180)d+=360;return[(h1+d*t+360)%360,s1+(s2-s1)*t,l1+(l2-l1)*t];}
const hcss=(h,s,l)=>'hsl('+h.toFixed(1)+','+s.toFixed(1)+'%,'+l.toFixed(1)+'%)';

const SG=${JSON.stringify(SIGNS)};
const ST=${JSON.stringify(STONES)};
const TR_C=${JSON.stringify(TR)};
function gsi(m,d){if((m===3&&d>=21)||(m===4&&d<=19))return 0;if((m===4&&d>=20)||(m===5&&d<=20))return 1;if((m===5&&d>=21)||(m===6&&d<=20))return 2;if((m===6&&d>=21)||(m===7&&d<=22))return 3;if((m===7&&d>=23)||(m===8&&d<=22))return 4;if((m===8&&d>=23)||(m===9&&d<=22))return 5;if((m===9&&d>=23)||(m===10&&d<=22))return 6;if((m===10&&d>=23)||(m===11&&d<=21))return 7;if((m===11&&d>=22)||(m===12&&d<=21))return 8;if((m===12&&d>=22)||(m===1&&d<=19))return 9;if((m===1&&d>=20)||(m===2&&d<=18))return 10;return 11;}

let CUR={h:230,s:18,l:28}, TGT={h:230,s:18,l:28}, sel=[null,null,null], raf=null, orbT=0;

function buildChoices(){
  [0,1,2].forEach(si=>{
    document.getElementById('cg'+si).innerHTML=TR_C[si].map((c,i)=>
      '<div class="ch" id="cc'+si+'_'+i+'" onclick="pick('+si+','+i+')"><div class="ch-orb" id="co'+si+'_'+i+'"></div><div class="ch-text"><b>'+c.n+'</b></div></div>'
    ).join('');
  });
}
buildChoices();

function pick(si,ci){
  sel[si]=ci;
  document.querySelectorAll('#cg'+si+' .ch').forEach((el,j)=>el.classList.toggle('sel',j===ci));
  upd();
}

function upd(){
  const bv=document.getElementById('bdt').value;
  if(!bv) return;
  const b=new Date(bv+'T12:00:00'),bm=b.getMonth()+1,bd=b.getDate();
  const bSg=SG[gsi(bm,bd)], bSt=ST.find(s=>s.m===bm)||ST[0];
  let [h,s,l]=h2hsl(bSg.sub);
  const sH=h2hsl(bSt.sub);
  const rv=document.getElementById('rdt').value;
  if(rv){
    const r=new Date(rv+'T12:00:00'),rm=r.getMonth()+1,rd=r.getDate();
    const rH=h2hsl(SG[gsi(rm,rd)].sub);
    const wt=Math.min(Math.abs(r-b)/(1000*86400*365.25*25),1);
    [h,s,l]=blArc(h,s,l,rH[0],rH[1],rH[2],wt);
  }
  sel.forEach((v,i)=>{
    if(v===null)return;
    const c=TR_C[i][v];
    h=((h+c.dH)+360)%360; s=Math.max(15,Math.min(92,s+c.dS)); l=Math.max(22,Math.min(78,l+c.dL));
    // Update choice orbs
    TR_C[i].forEach((ch,j)=>{
      const el=document.getElementById('co'+i+'_'+j);if(!el)return;
      const ph=((h+ch.dH)+360)%360,ps=Math.max(14,Math.min(98,s+ch.dS)),pl=Math.max(22,Math.min(80,l+ch.dL));
      el.style.background=hcss(ph,ps,pl);
    });
  });
  const fH=blArc(h,s,l,sH[0],sH[1],sH[2],.25);
  TGT={h:fH[0],s:fH[1],l:fH[2]};
  document.getElementById('orb-hex').textContent=hsl2h(fH[0],fH[1],fH[2])+' · H'+fH[0].toFixed(0)+'° S'+fH[1].toFixed(0)+'% L'+fH[2].toFixed(0)+'%';
  if(!raf) raf=requestAnimationFrame(drawOrb);
}

// ── ORB ──────────────────────────────────────────────────────────────────────
function drawOrb(){
  let d=TGT.h-CUR.h;if(d>180)d-=360;if(d<-180)d+=360;
  CUR.h=((CUR.h+d*.045)+360)%360;CUR.s+=(TGT.s-CUR.s)*.045;CUR.l+=(TGT.l-CUR.l)*.045;
  renderOrb(document.getElementById('orb'),CUR,200,orbT);
  orbT++;raf=requestAnimationFrame(drawOrb);
}

function renderOrb(cv,col,W,t){
  if(!cv)return;
  const ctx=cv.getContext('2d'),CX=W/2,CY=W/2,R=W/2-2;
  ctx.clearRect(0,0,W,W);
  for(let r=R+8;r>=R-2;r-=3){ctx.beginPath();ctx.arc(CX,CY,r,0,Math.PI*2);ctx.strokeStyle=hcss(col.h,col.s,col.l+(r-(R-2))*1.2);ctx.globalAlpha=.04*(1-(r-R+2)/10);ctx.lineWidth=4;ctx.stroke();}
  ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fillStyle=hcss(col.h,col.s*.7,col.l*.35);ctx.fill();
  let seed=42;const rng=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
  [[200,.2,22,0],[80,.35,32,7],[35,.55,44,14]].forEach(([cnt,al,lA,sA])=>{
    for(let i=0;i<cnt;i++){
      const ang=rng()*Math.PI*2,r=R*.1+rng()*R*.88,px=CX+Math.cos(ang+t*(.003+rng()*.004))*r,py=CY+Math.sin(ang+t*(.002+rng()*.003))*r;
      ctx.beginPath();ctx.arc(px,py,.5+rng()*1.8,0,Math.PI*2);
      ctx.fillStyle=hcss((col.h+(rng()-.5)*26+360)%360,Math.min(100,col.s+sA),Math.min(92,col.l+lA));
      ctx.globalAlpha=al*(0.7+rng()*.3);ctx.fill();
    }
  });
  ctx.globalAlpha=1;
  const grd=ctx.createRadialGradient(CX,CY,0,CX,CY,R*.7);
  grd.addColorStop(0,hcss(col.h,Math.max(col.s-18,0),Math.min(col.l+46,92)));
  grd.addColorStop(.45,hcss(col.h,col.s,col.l+8)+'33');grd.addColorStop(1,'transparent');
  ctx.beginPath();ctx.arc(CX,CY,R*.7,0,Math.PI*2);ctx.fillStyle=grd;ctx.fill();
  ctx.save();ctx.translate(CX,CY);ctx.rotate(t*.003);
  for(let i=0;i<3;i++){const a=i*(Math.PI*2/3)+t*.002,rx=Math.cos(a)*R*.33,ry=Math.sin(a)*R*.22;const g2=ctx.createRadialGradient(rx,ry,0,rx,ry,R*.5);g2.addColorStop(0,hcss((col.h+i*60)%360,col.s*.8,Math.min(col.l+26,88))+'20');g2.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(rx,ry,R*.5,0,Math.PI*2);ctx.fillStyle=g2;ctx.fill();}
  ctx.restore();
  const sp=ctx.createRadialGradient(CX-R*.28,CY-R*.28,0,CX-R*.28,CY-R*.28,R*.42);
  sp.addColorStop(0,'rgba(255,255,255,.17)');sp.addColorStop(1,'transparent');
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fillStyle=sp;ctx.fill();
  const ev=ctx.createRadialGradient(CX,CY,R*.55,CX,CY,R);
  ev.addColorStop(0,'transparent');ev.addColorStop(1,hcss(col.h,col.s*.6,col.l*.22)+'cc');
  ctx.beginPath();ctx.arc(CX,CY,R,0,Math.PI*2);ctx.fillStyle=ev;ctx.fill();
}

// Start idle orb
raf=requestAnimationFrame(drawOrb);

// ── LOADING SCREEN ────────────────────────────────────────────────────────────
const MSGS=['Tuning your frequency…','Reading your zodiac signature…','Locating your birthstone resonance…','Mapping your journey layers…','Calculating your entry arc…','Crystallizing your auratar…'];
let loadRaf=null,loadT=0,loadCol={h:CUR.h,s:CUR.s,l:CUR.l};
function startLoading(){
  const overlay=document.getElementById('loading');overlay.classList.add('show');
  const prog=document.getElementById('prog');const msgEl=document.getElementById('load-msg');
  const loCv=document.getElementById('load-orb');
  loadCol={h:TGT.h||CUR.h,s:TGT.s||CUR.s,l:TGT.l||CUR.l};
  let pct=0,msgIdx=0;
  const interval=setInterval(()=>{
    pct=Math.min(pct+2,100);
    prog.style.width=pct+'%';
    const mi=Math.floor((pct/100)*MSGS.length);
    if(mi!==msgIdx&&mi<MSGS.length){msgIdx=mi;msgEl.textContent=MSGS[msgIdx];}
    if(pct>=100)clearInterval(interval);
  },48);
  function drawLoad(){
    renderOrb(loCv,loadCol,130,loadT);loadT++;
    loadRaf=requestAnimationFrame(drawLoad);
  }
  drawLoad();
}
function stopLoading(){
  if(loadRaf)cancelAnimationFrame(loadRaf);
  document.getElementById('loading').classList.remove('show');
}

// ── PAYMENT ───────────────────────────────────────────────────────────────────
async function startPayment(){
  const email=document.getElementById('email').value.trim();
  const dob=document.getElementById('bdt').value;
  const msg=document.getElementById('pay-msg');
  if(!email||!dob){msg.className='msg err';msg.textContent='Enter your birth date and email first.';return;}
  if(!email.includes('@')){msg.className='msg err';msg.textContent='Check your email address.';return;}
  msg.className='msg';msg.textContent='';
  document.getElementById('pay-btn').disabled=true;
  startLoading();
  try {
    const res=await fetch('/create-checkout',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({email,dob,rdob:document.getElementById('rdt').value||null,
        journey:sel.map(v=>v===null?null:v)})});
    const data=await res.json();
    if(!res.ok||data.error){throw new Error(data.error||'Payment setup failed');}
    stopLoading();
    window.location.href=data.url;
  } catch(e){
    stopLoading();
    document.getElementById('pay-btn').disabled=false;
    msg.className='msg err';msg.textContent=e.message;
  }
}
</script>
</body></html>`;

// ── SUCCESS PAGE HTML ─────────────────────────────────────────────────────────
function successHTML(reading, email, sign, stone, auraHex) {
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtd = reading
    .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>')
    .replace(/\n/g,'<br>');
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your Aura Reading · AuraSpanse</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#06070d;color:#e8eaf0;font-family:system-ui,sans-serif;
  display:flex;flex-direction:column;align-items:center;padding:3rem 1.25rem 5rem}
.orb{width:110px;height:110px;border-radius:50%;margin:0 auto 1.5rem;
  background:${auraHex};box-shadow:0 0 60px ${auraHex}66,0 0 120px ${auraHex}22}
h1{font-size:1.8rem;letter-spacing:.1em;text-align:center;margin-bottom:.4rem;
   background:linear-gradient(135deg,#FFD700,#a78bfa);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.meta{font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;text-align:center;margin-bottom:2.5rem}
.reading{max-width:680px;line-height:2;font-size:.95rem;color:#d1d5db;background:rgba(255,255,255,.03);
  border:.5px solid rgba(255,255,255,.08);border-radius:16px;padding:2rem 2.25rem}
.reading strong{color:#f1f5f9}
.sent{margin-top:1.25rem;font-size:.78rem;color:#6b7280;text-align:center}
.home{display:inline-block;margin-top:2rem;padding:.65rem 1.6rem;border:.5px solid rgba(255,255,255,.15);
  border-radius:10px;color:#a78bfa;text-decoration:none;font-size:.82rem;letter-spacing:.08em}
</style></head><body>
<div class="orb"></div>
<h1>✦ Your Aura Reading</h1>
<div class="meta">${esc(sign)} · ${esc(stone)} · ${auraHex}</div>
<div class="reading">${fmtd}</div>
<p class="sent">Full reading sent to ${esc(email)}</p>
<a class="home" href="/">← Return to AuraSpanse</a>
</body></html>`;
}

// ── ROUTES ────────────────────────────────────────────────────────────────────
app.get('/', (_req, res) => res.send(PAGE()));

// Create Stripe Checkout Session
app.post('/create-checkout', async (req, res) => {
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not set in Render environment' });
  const { email, dob, rdob, journey } = req.body;
  if (!email || !dob) return res.status(400).json({ error: 'Email and birth date required' });
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.BASE_URL}/`,
      metadata: { email, dob, rdob: rdob || '', journey: JSON.stringify(journey || []) },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error('Stripe error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Success — generate reading + send email
app.get('/success', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.redirect('/');
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') return res.redirect('/');
    const { email, dob, rdob, journey: journeyStr } = session.metadata;
    const journey = JSON.parse(journeyStr || '[]');
    const b = new Date(dob + 'T12:00:00');
    const bm = b.getMonth()+1, bd = b.getDate();
    const sign = SIGNS[gsi(bm, bd)];
    const stone = STONES.find(s => s.m === bm) || STONES[0];
    const fH = computeAuraHSL(dob, rdob || null, journey);
    const auraHex = hsl2hex(fH[0], fH[1], fH[2]);
    const journeyNames = journey.map((v,i) => v != null ? TR[i][+v]?.n : null).filter(Boolean).join(', ');

    // Generate AI reading
    let reading = 'Your aura is a living expression of your journey.';
    try {
      const aiRes = await ai.messages.create({
        model: 'claude-sonnet-4-20250514', max_tokens: 900,
        messages: [{ role: 'user', content:
          `Write a mystical, personal aura reading for someone born on ${dob}, ${sign.n} with birthstone ${stone.n}. ` +
          `Their aura color is ${auraHex} (H${fH[0].toFixed(0)}° S${fH[1].toFixed(0)}% L${fH[2].toFixed(0)}%). ` +
          `Journey path: ${journeyNames || 'unspecified'}. ` +
          `Write 4 paragraphs: core nature, emotional landscape, hidden strength, and path forward. ` +
          `Tone: poetic, grounded, personal. Use **bold** for key phrases. No generic horoscope language.`
        }],
      });
      reading = aiRes.content[0]?.text || reading;
    } catch (e) { console.error('AI error:', e.message); }

    // Send email
    if (email && process.env.RESEND_API_KEY) {
      try {
        const fmtEmail = reading
          .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#f1f5f9">$1</strong>')
          .replace(/\n/g, '<br>');
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to: email,
          subject: `✦ Your ${sign.n} Aura Reading · AuraSpanse`,
          html: `<div style="background:#06070d;color:#e8eaf0;padding:48px 36px;font-family:system-ui,sans-serif;max-width:640px;margin:0 auto;border-radius:16px">
            <div style="width:80px;height:80px;border-radius:50%;background:${auraHex};margin:0 auto 24px;box-shadow:0 0 40px ${auraHex}66"></div>
            <h2 style="text-align:center;color:#a78bfa;letter-spacing:.1em;margin-bottom:6px">✦ Your Aura Reading</h2>
            <p style="text-align:center;color:#6b7280;font-size:13px;letter-spacing:.1em;margin-bottom:32px;text-transform:uppercase">${sign.n} · ${stone.n} · ${auraHex}</p>
            <div style="line-height:2;font-size:15px;color:#d1d5db">${fmtEmail}</div>
            <p style="margin-top:32px;text-align:center;color:#4b5563;font-size:12px">AuraSpanse · your living chromatic field</p>
          </div>`,
        });
      } catch (e) { console.error('Email error:', e.message); }
    }

    res.send(successHTML(reading, email, sign.n, stone.n, auraHex));
  } catch (e) {
    console.error('Success route error:', e.message);
    res.redirect('/');
  }
});

// Stripe webhook (optional — for refund/dispute handling)
app.post('/stripe-webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(200);
  try {
    const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    console.log('Webhook:', event.type);
  } catch (e) { return res.status(400).send('Webhook error: ' + e.message); }
  res.sendStatus(200);
});

// ── START ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AuraSpanse running on :${PORT}`));
