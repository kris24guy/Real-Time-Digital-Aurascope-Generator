'use strict';

const express    = require('express');
const Stripe     = require('stripe');
const fetch      = require('node-fetch');
const { Resend } = require('resend');

const app    = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const REQUIRED = ['STRIPE_SECRET_KEY','ANTHROPIC_API_KEY','RESEND_API_KEY','PRICE_ID'];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) { console.error('❌  Missing:', missing.join(', ')); process.exit(1); }

// ─── DATA ─────────────────────────────────────────────────────────────────────

const ZODIAC = [
  { n:'Aries',       glyph:'♈', el:'Cardinal Fire',
    c:'#FF5C48',
    tr:[{s:'+',n:'Courage',    tc:'#CC2200', desc:'The aura of Aries carries <b>Courage</b> as its first light — a crimson force that moves before fear has time to speak. This is the color that charges forward before permission is granted.'},
        {s:'=',n:'Drive',      tc:'#E07020', desc:'<b>Drive</b> is the steady burn beneath the charge — amber in the aura, neither resting nor consuming. The force that keeps the flame directional, purposeful, aimed.'},
        {s:'-',n:'Impulsive',  tc:'#7A1818', desc:'The shadow of Aries is a deep carmine that surges before wisdom arrives. Every sign carries its shadow. To know it is already to have power over it.'}],
    read:'The Aries aura is the first light of the zodiac — a frequency that does not wait. It enters rooms before the body does.' },
  { n:'Taurus',      glyph:'♉', el:'Fixed Earth',
    c:'#4CAF7D',
    tr:[{s:'+',n:'Steadfast',  tc:'#2D6A2D', desc:'<b>Steadfast</b> is the deep forest green of the Taurus aura — an energy that cannot be rushed, cannot be uprooted. The color of roots that have grown for centuries.'},
        {s:'=',n:'Sensual',    tc:'#B8764A', desc:'<b>Sensual</b> moves as a warm amber-rose — the frequency of the body fully present, of pleasure taken seriously, of beauty recognized as sacred.'},
        {s:'-',n:'Stubborn',   tc:'#5A3A1A', desc:'The shadow of Taurus is dense earth-brown — where the strength of roots becomes resistance to movement. The same force that holds also resists.'}],
    read:'The Taurus aura is the oldest color in the spectrum — it does not chase. It does not need to.' },
  { n:'Gemini',      glyph:'♊', el:'Mutable Air',
    c:'#FFD966',
    tr:[{s:'+',n:'Curious',    tc:'#F0C800', desc:'<b>Curious</b> is pure gold in the Gemini aura — the light that touches everything, turns it over, sees its other side. The color of minds that never stop asking.'},
        {s:'=',n:'Adaptive',   tc:'#60B8D4', desc:'<b>Adaptive</b> moves as sky-blue — the frequency of air taking the shape of whatever contains it, moving through every opening, never truly confined.'},
        {s:'-',n:'Scattered',  tc:'#A898C8', desc:'The shadow of Gemini is pale lavender dispersion — where the gift of multiplicity becomes an inability to land. Light spread too thin loses its warmth.'}],
    read:'The Gemini aura moves like light through a prism — it is not one color but the suggestion of all of them.' },
  { n:'Cancer',      glyph:'♋', el:'Cardinal Water',
    c:'#8FBBE0',
    tr:[{s:'+',n:'Nurturing',  tc:'#9EB8C8', desc:'<b>Nurturing</b> is the silver-blue of moonlight on water — a frequency that wraps, protects, and feeds. It is the color of the first safety anyone ever knew.'},
        {s:'=',n:'Intuitive',  tc:'#C8D8E8', desc:'<b>Intuitive</b> moves as pearl light — a luminescence that knows before the mind translates. The color of knowledge that arrives without being summoned.'},
        {s:'-',n:'Guarded',    tc:'#3A5A7A', desc:'The shadow of Cancer is deep slate-blue — where protection becomes a closed door. The shell that shelters can also become the thing that isolates.'}],
    read:'The Cancer aura is the color of the ocean before dawn — vast, unhurried, holding more than the surface reveals.' },
  { n:'Leo',         glyph:'♌', el:'Fixed Fire',
    c:'#FF8C30',
    tr:[{s:'+',n:'Magnetic',   tc:'#FFB800', desc:'<b>Magnetic</b> is the deepest gold in the Leo aura — the frequency that draws, that centers every room around itself without trying. The color of the sun at full height.'},
        {s:'=',n:'Generous',   tc:'#E07800', desc:'<b>Generous</b> moves as amber fire — the warmth that gives because giving is its nature. The flame that warms everything around it without asking.'},
        {s:'-',n:'Domineering',tc:'#7A4800', desc:'The shadow of Leo is dark amber-brown — where the light that magnetizes becomes the light that blinds. The sun too close does not illuminate, it scorches.'}],
    read:'The Leo aura is the color of something already in full radiance — it does not wait for permission to shine.' },
  { n:'Virgo',       glyph:'♍', el:'Mutable Earth',
    c:'#6BCF6B',
    tr:[{s:'+',n:'Precise',    tc:'#6A9A5A', desc:'<b>Precise</b> is the sage-green of the Virgo aura — the frequency of discernment, of seeing what others miss. The color of the healer who knows exactly where the wound is.'},
        {s:'=',n:'Devoted',    tc:'#C8A878', desc:'<b>Devoted</b> moves as warm wheat — the color of service freely given, of showing up not for recognition but because the work itself is sacred.'},
        {s:'-',n:'Critical',   tc:'#5A6A38', desc:'The shadow of Virgo is olive-shadow — where precision becomes a blade turned inward. The same eye that heals can also wound with its accuracy.'}],
    read:'The Virgo aura is the color of things made carefully — not cold, but precise. Not distant, but exact.' },
  { n:'Libra',       glyph:'♎', el:'Cardinal Air',
    c:'#F06DC0',
    tr:[{s:'+',n:'Harmonic',   tc:'#E890C0', desc:'<b>Harmonic</b> is the rose-pink of the Libra aura — the frequency of balance felt rather than calculated. The color of the space between two people who finally understand each other.'},
        {s:'=',n:'Charming',   tc:'#B880E0', desc:'<b>Charming</b> moves as soft violet — the color of grace that makes every interaction feel meant. The frequency of ease in the presence of others.'},
        {s:'-',n:'Indecisive', tc:'#7888A8', desc:'The shadow of Libra is muted blue-grey — where the gift of seeing all sides becomes an inability to choose any of them. The scales that balance also hesitate.'}],
    read:'The Libra aura is the color of the moment just before harmony — always arriving toward something it deeply feels.' },
  { n:'Scorpio',     glyph:'♏', el:'Fixed Water',
    c:'#8B2252',
    tr:[{s:'+',n:'Perceptive', tc:'#8B0030', desc:'<b>Perceptive</b> is the deepest crimson in the Scorpio aura — the frequency that sees through surfaces, that reads what was never spoken. The color of knowing without being told.'},
        {s:'=',n:'Loyal',      tc:'#205060', desc:'<b>Loyal</b> moves as deep teal-black — the color of water in the deepest ocean, still and total. The frequency of a bond that does not break.'},
        {s:'-',n:'Obsessive',  tc:'#2A0830', desc:'The shadow of Scorpio is near-black purple — where depth becomes a trap. The same intensity that makes Scorpio see everything can make it impossible to look away.'}],
    read:'The Scorpio aura is the color beneath all other colors — the frequency that exists where light does not reach, and does not need to.' },
  { n:'Sagittarius', glyph:'♐', el:'Mutable Fire',
    c:'#60C8F0',
    tr:[{s:'+',n:'Visionary',  tc:'#2060CC', desc:'<b>Visionary</b> is deep cobalt in the Sagittarius aura — the frequency of the horizon, of seeing farther than is comfortable. The arrow already in flight toward something not yet visible.'},
        {s:'=',n:'Honest',     tc:'#308040', desc:'<b>Honest</b> moves as forest-green fire — the color of truth that does not soften itself for comfort. A frequency that speaks before it considers whether to speak.'},
        {s:'-',n:'Restless',   tc:'#4090E0', desc:'The shadow of Sagittarius is electric blue dispersion — where vision becomes inability to stay. The arrow that is always flying has never landed anywhere.'}],
    read:'The Sagittarius aura is the color of open sky just before the arrow reaches it — all direction, all momentum.' },
  { n:'Capricorn',   glyph:'♑', el:'Cardinal Earth',
    c:'#4E9E7A',
    tr:[{s:'+',n:'Disciplined',tc:'#3A5040', desc:'<b>Disciplined</b> is the dark slate-green of the Capricorn aura — the frequency of the mountain that does not move because it does not need to. The color of endurance become its own reward.'},
        {s:'=',n:'Ambitious',  tc:'#6A2040', desc:'<b>Ambitious</b> moves as deep burgundy — the color of desire made structural, of wanting that has learned patience and become a plan.'},
        {s:'-',n:'Rigid',      tc:'#4A5A48', desc:'The shadow of Capricorn is grey-green — where structure becomes a prison. The mountain that will not move also cannot grow.'}],
    read:'The Capricorn aura is the color of stone warmed by decades of sun — cold on the surface, ancient heat within.' },
  { n:'Aquarius',    glyph:'♒', el:'Fixed Air',
    c:'#50D0CC',
    tr:[{s:'+',n:'Original',   tc:'#00B8D0', desc:'<b>Original</b> is the electric cyan of the Aquarius aura — the frequency of the signal that arrived from somewhere else. The color of thought that has no precedent.'},
        {s:'=',n:'Visionary',  tc:'#6040C0', desc:'<b>Visionary</b> in Aquarius moves as deep violet — not the vision of the self but of the collective. Seeing the future as already complete and working backward toward it.'},
        {s:'-',n:'Aloof',      tc:'#A0C0D0', desc:'The shadow of Aquarius is ice-blue remove — where objectivity becomes emotional distance. The current that illuminates from far away never truly touches ground.'}],
    read:'The Aquarius aura is the color of electricity before it becomes light — already moving, already changed, already somewhere else.' },
  { n:'Pisces',      glyph:'♓', el:'Mutable Water',
    c:'#7870D0',
    tr:[{s:'+',n:'Empathic',   tc:'#304880', desc:'<b>Empathic</b> is the deep sea-blue of the Pisces aura — feeling what others feel without a border between them. The color of the ocean that does not know where it ends.'},
        {s:'=',n:'Imaginative',tc:'#60A890', desc:'<b>Imaginative</b> moves as seafoam — the color of what exists between sleeping and waking, where the impossible is simply unbuilt. The frequency of other worlds.'},
        {s:'-',n:'Escapist',   tc:'#8898A8', desc:'The shadow of Pisces is mist-grey dissolution — where boundlessness becomes inability to hold a shape. The ocean that holds everything can also swallow the self.'}],
    read:'The Pisces aura is the color of the place where water becomes sky — no line between them, only continuation.' },
];

const STONES = [
  { n:'Garnet',     c:'#C1302A', w:'Scar',  mo:'January',   d:'Root-fire passion — the stone of grounding depth and carnal vitality. It burns at the base of the aura, stabilizing what surges.' },
  { n:'Amethyst',   c:'#9B59B6', w:'Veil',  mo:'February',  d:'Third-eye calm — a violet clarity that opens what is usually closed. It quiets the noise in the frequency.' },
  { n:'Aquamarine', c:'#7EC8E3', w:'Tide',  mo:'March',     d:'Sea-light flow — the stone of intuitive ease and oceanic knowing. It carries the aura toward clarity without effort.' },
  { n:'Diamond',    c:'#B9F2FF', w:'Glass', mo:'April',     d:'Pure amplification — the void stone, color of nothing and everything. It magnifies whatever already is without adding itself.' },
  { n:'Emerald',    c:'#2ECC71', w:'Bloom', mo:'May',       d:'Heart growth — the stone of abundant frequency and living green. It expands the aura outward from the center.' },
  { n:'Moonstone',  c:'#E8E0D0', w:'Pearl', mo:'June',      d:'Dream weaving — the moon-tide mystery stone. It pulls the aura into its reflective, luminous orbit.' },
  { n:'Ruby',       c:'#E74C3C', w:'Fire',  mo:'July',      d:'Vital courage — the life-force stone, blazing and unapologetic. It ignites what has gone quiet in the frequency.' },
  { n:'Peridot',    c:'#A8E063', w:'Leaf',  mo:'August',    d:'Earth-spark renewal — the solar light of the aura. The frequency of things returning from long dormancy.' },
  { n:'Sapphire',   c:'#1E6BC4', w:'Deep',  mo:'September', d:'Deep truth — the stone of sapphire knowing, unwavering. It adds solidity and depth to everything it enters.' },
  { n:'Opal',       c:'#E8D5C4', w:'Drift', mo:'October',   d:'Prismatic change — the iridescent stone of perpetual becoming. It reflects differently from every angle, every hour.' },
  { n:'Topaz',      c:'#F4B942', w:'Amber', mo:'November',  d:'Solar joy — amber manifestation, the stone of warmth made solid. It brings the aura into productive, visible expression.' },
  { n:'Turquoise',  c:'#40E0D0', w:'Shore', mo:'December',  d:'Ocean serenity — the healing stone where sky meets sea. It cools and steadies the frequency at every depth.' },
];

const AMPS = [
  { n:'Clear Quartz',     c:'#D0E8FF', w:'Dawn', h0:4,  h1:12, d:'The hour of beginning. Clear Quartz amplifies what already is — a blank lens that intensifies the stone\'s frequency without redirecting it.' },
  { n:'Moldavite',        c:'#4A9B6F', w:'Live', h0:12, h1:20, d:'The hour of transformation. Moldavite carries cosmic impact energy — it accelerates and bends the stone\'s resonance toward evolution.' },
  { n:'Black Tourmaline', c:'#1A1A3A', w:'Void', h0:20, h1:4,  d:'The hour of clearing. Black Tourmaline grounds and protects — it roots the stone\'s frequency into the earth, stripping interference.' },
];

const ZONES = [
  { n:'Rift',   hMin:330, hMax:30,  words:{ dark:['Fell','Tomb','Null'],   mid:['Void','Scar','Dark'],   light:['Pale','Thin','Bare']   }},
  { n:'Ember',  hMin:30,  hMax:90,  words:{ dark:['Char','Forge','Coal'],  mid:['Blaze','Burn','Glow'],  light:['Gold','Dawn','Warm']   }},
  { n:'Growth', hMin:90,  hMax:150, words:{ dark:['Root','Mire','Fen'],    mid:['Moss','Bloom','Vine'],  light:['Leaf','Fern','Sprig']  }},
  { n:'Flow',   hMin:150, hMax:210, words:{ dark:['Deep','Trench','Sink'], mid:['Tide','Shore','Drift'], light:['Mist','Foam','Veil']   }},
  { n:'Depth',  hMin:210, hMax:270, words:{ dark:['Still','Iron','Stone'], mid:['Hold','Keep','Seal'],   light:['Glass','Clear','Pure'] }},
  { n:'Void',   hMin:270, hMax:330, words:{ dark:['Hollow','Shade','Null'],mid:['Dusk','Night','Shad'],  light:['Haze','Shift','Ash']   }},
];

const SIGN_CLOSE = ['Charge','Stone','Echo','Hold','Throne','Thread','Grace','Rift','Arrow','Keep','Current','Basin'];

const Q_MOD = {
  q1:{ fire:.08, water:-.04, air:.02, earth:-.06 },
  q2:{ expansion:.1, contraction:-.08, oscillation:.04, stillness:-.02 },
  q3:{ memory:-.06, presence:.06, becoming:.08, return:-.04 },
};

// ─── ALGORITHM ────────────────────────────────────────────────────────────────

function h2r(h){ return [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)] }
function r2h(rgb){ return '#'+rgb.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('') }
function blend(a,b,t=0.5){ const[r1,g1,b1]=h2r(a),[r2,g2,b2]=h2r(b); return r2h([r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t]) }

function hexToHsl(hex){
  let[r,g,b]=h2r(hex).map(v=>v/255);
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2;
  if(max===min)return[0,0,Math.round(l*100)];
  const d=max-min,s=l>.5?d/(2-max-min):d/(max+min);
  let h=max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4;
  return[Math.round(h*60),Math.round(s*100),Math.round(l*100)];
}
function getZone(hex){
  const[h,,l]=hexToHsl(hex);
  const z=ZONES.find(z=>z.hMin>z.hMax?h>=z.hMin||h<z.hMax:h>=z.hMin&&h<z.hMax)||ZONES[0];
  return{zone:z,tier:l<25?'dark':l<60?'mid':'light'};
}
function hueName(hex,si,stoneWord){
  const{zone,tier}=getZone(hex);
  const ws=zone.words[tier];
  return{ name:ws[si%ws.length]+stoneWord, sub:SIGN_CLOSE[si]+' · '+zone.n, zone:zone.n };
}
function getSign(d){
  const m=d.getMonth()+1,day=d.getDate();
  if((m===3&&day>=21)||(m===4&&day<=19))return 0;
  if((m===4&&day>=20)||(m===5&&day<=20))return 1;
  if((m===5&&day>=21)||(m===6&&day<=20))return 2;
  if((m===6&&day>=21)||(m===7&&day<=22))return 3;
  if((m===7&&day>=23)||(m===8&&day<=22))return 4;
  if((m===8&&day>=23)||(m===9&&day<=22))return 5;
  if((m===9&&day>=23)||(m===10&&day<=22))return 6;
  if((m===10&&day>=23)||(m===11&&day<=21))return 7;
  if((m===11&&day>=22)||(m===12&&day<=21))return 8;
  if((m===12&&day>=22)||(m===1&&day<=19))return 9;
  if((m===1&&day>=20)||(m===2&&day<=18))return 10;
  return 11;
}
function doy(d){ return Math.floor((new Date(d)-new Date(new Date(d).getFullYear(),0,0))/864e5) }
function spectrumColor(t){
  const cols=ZODIAC.map(z=>z.c),seg=t*(cols.length-1),i=Math.min(Math.floor(seg),cols.length-2);
  return blend(cols[i],cols[i+1],seg-i);
}
function getAmp(hour){
  hour=Number(hour);
  if(hour>=4&&hour<12)return AMPS[0];
  if(hour>=12&&hour<20)return AMPS[1];
  return AMPS[2];
}
function computeHues(dob,regDate,regHour,q1,q2,q3){
  const d=new Date(dob),si=getSign(d),mi=d.getMonth();
  const sign=ZODIAC[si],stone=STONES[mi],amp=getAmp(regHour);
  const traitBlend=blend(blend(sign.tr[0].tc,sign.tr[1].tc,.5),sign.tr[2].tc,.33);
  const specCol=spectrumColor(doy(regDate)/365);
  const hue1=blend(traitBlend,specCol,.5);
  const hue2=blend(stone.c,amp.c,.5);
  let t=.5;
  if(q1)t+=(Q_MOD.q1[q1]||0);
  if(q2)t+=(Q_MOD.q2[q2]||0);
  if(q3)t+=(Q_MOD.q3[q3]||0);
  t=Math.max(.1,Math.min(.9,t));
  const hue3=blend(hue1,hue2,t);
  const naming=hueName(hue3,si,stone.w);
  return{si,mi,sign,stone,amp,hue1,hue2,hue3,traitBlend,specCol,...naming};
}

// ─── SHARED CSS + JS ──────────────────────────────────────────────────────────

const SHARED_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@300;400&family=Karla:ital,wght@0,300;0,400;1,300&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#07060f;min-height:100%}
body{color:#e4dff0;font-family:'Karla',sans-serif}
`;

const ORB_JS = `
function h2r(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}
function r2h(rgb){return'#'+rgb.map(v=>Math.round(Math.max(0,Math.min(255,v))).toString(16).padStart(2,'0')).join('')}
function bl(a,b,t){t=t===undefined?.5:t;const[r1,g1,b1]=h2r(a),[r2,g2,b2]=h2r(b);return r2h([r1+(r2-r1)*t,g1+(g2-g1)*t,b1+(b2-b1)*t])}
function paintGem(id,col,sz){
  const cv=document.getElementById(id);if(!cv)return;
  sz=sz||120;cv.width=sz;cv.height=sz;
  const ctx=cv.getContext('2d'),cx=sz/2,cy=sz/2,r=sz*.46;
  const[r1,g1,b1]=h2r(col);
  const g=ctx.createRadialGradient(cx*.65,cy*.58,r*.04,cx,cy,r);
  g.addColorStop(0,'rgba(255,255,255,.5)');g.addColorStop(.28,col);
  g.addColorStop(.7,r2h([r1*.55,g1*.55,b1*.55]));g.addColorStop(1,r2h([r1*.2,g1*.2,b1*.2]));
  ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
}
`;

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

function homePage(){
  const zData = JSON.stringify(ZODIAC.map(z=>({n:z.n,glyph:z.glyph,el:z.el,c:z.c,tr:z.tr,read:z.read})));
  const sData = JSON.stringify(STONES);
  const aData = JSON.stringify(AMPS);
  const zoData= JSON.stringify(ZONES);
  const scData= JSON.stringify(SIGN_CLOSE);
  const qData = JSON.stringify(Q_MOD);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Auraspanse</title>
<style>
${SHARED_CSS}
#app{min-height:100vh;display:flex;flex-direction:column;align-items:center;padding:0 24px 72px;position:relative;overflow:hidden}
#app::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse 65% 35% at 50% 0%,rgba(60,15,130,.2),transparent 62%);pointer-events:none}

.ph{width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;z-index:1;opacity:0;transition:opacity .8s;pointer-events:none;position:absolute;top:0;left:50%;transform:translateX(-50%)}
.ph.on{opacity:1;pointer-events:all;position:relative;left:auto;transform:none}

/* pips */
.pips{display:flex;gap:7px;margin-bottom:24px;justify-content:center}
.pip{width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,.1);transition:all .4s}
.pip.done{background:rgba(255,255,255,.35)}
.pip.on{width:18px;border-radius:3px}

/* wordmark */
.wm{margin-top:40px;text-align:center;margin-bottom:36px}
.wm h1{font-family:'Cinzel',serif;font-weight:300;font-size:28px;letter-spacing:.36em;color:#fff;text-transform:uppercase}
.wm p{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-top:6px}

/* orb */
.ob{position:relative;margin:0 auto 24px}
.ob canvas{display:block;border-radius:50%;animation:throb 5s ease-in-out infinite}
@keyframes throb{0%,100%{transform:scale(1)}50%{transform:scale(1.04)}}
.rg{position:absolute;border-radius:50%;border:1px solid rgba(255,255,255,.055);animation:spin 15s linear infinite;pointer-events:none}
.rg2{animation-duration:25s;animation-direction:reverse;opacity:.45}
@keyframes spin{to{transform:rotate(360deg)}}

/* type */
.ey{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.24);text-align:center;margin-bottom:8px}
.hl{font-family:'Cinzel',serif;font-weight:300;font-size:clamp(17px,4vw,22px);color:#fff;text-align:center;letter-spacing:.06em;line-height:1.4;margin-bottom:8px}
.st{font-size:13px;font-weight:300;font-style:italic;color:rgba(255,255,255,.35);text-align:center;line-height:1.9;max-width:320px;margin-bottom:22px}
.ar{font-size:14px;font-weight:300;color:rgba(255,255,255,.5);text-align:center;line-height:2.05;max-width:320px;min-height:72px;margin-bottom:24px}
.ar b{color:#fff;font-weight:400;font-style:normal}

/* trait badge */
.tb{display:inline-flex;align-items:center;gap:10px;padding:10px 24px;border:1px solid;margin:0 auto 20px;transition:all .7s}
.tb-sym{font-family:'Cinzel',serif;font-size:20px;font-weight:300}
.tb-n{font-size:13px;letter-spacing:.14em;text-transform:uppercase}

/* spectrum beam */
.beam{width:100%;max-width:320px;margin-bottom:20px;opacity:0;transition:opacity .6s}
.bt{height:2px;background:rgba(255,255,255,.06);position:relative;margin-bottom:8px;border-radius:1px;overflow:visible}
.bf{height:100%;width:0;transition:width 2.2s cubic-bezier(.4,0,.2,1);border-radius:1px}
.bm{position:absolute;top:-5px;width:12px;height:12px;border-radius:50%;border:1.5px solid rgba(255,255,255,.65);transform:translateX(-50%);transition:left 2.2s cubic-bezier(.4,0,.2,1)}
.bl{display:flex;justify-content:space-between;font-size:10px;color:rgba(255,255,255,.18);letter-spacing:.06em}

/* formula */
.formula{display:flex;align-items:flex-start;gap:6px;flex-wrap:wrap;justify-content:center;margin-bottom:20px;opacity:0;transition:opacity .9s}
.formula.show{opacity:1}
.fd{width:20px;height:20px;border-radius:50%;border:1px solid rgba(255,255,255,.18);flex-shrink:0;margin:0 auto 3px}
.fp{font-family:'Cinzel',serif;font-size:12px;color:rgba(255,255,255,.2);margin-top:4px}
.fr{width:28px;height:28px;border-radius:50%;border:1px solid rgba(255,255,255,.28);flex-shrink:0;margin:0 auto 3px}
.fl{font-size:10px;color:rgba(255,255,255,.2);text-align:center;letter-spacing:.05em}

/* hue name */
.hname{font-family:'Cinzel',serif;font-weight:300;font-size:24px;color:#fff;text-align:center;letter-spacing:.1em;opacity:0;transition:opacity .9s;margin-bottom:4px}
.hsub{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.25);text-align:center;opacity:0;transition:opacity .9s .25s;margin-bottom:24px}

/* carried forward strip */
.carried{display:flex;align-items:center;gap:11px;width:100%;max-width:320px;margin-bottom:24px;padding:12px 16px;background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.06)}
.cdot{width:16px;height:16px;border-radius:50%;flex-shrink:0}
.ctxt{font-size:12px;color:rgba(255,255,255,.3);font-style:italic;line-height:1.5}
.cn{color:rgba(255,255,255,.6);font-family:'Cinzel',serif;font-style:normal;font-weight:300;letter-spacing:.06em}

/* stone */
.gem-wrap{display:flex;flex-direction:column;align-items:center;gap:9px;margin:0 auto 22px}
.gem{border-radius:50%;border:1px solid rgba(255,255,255,.12);transition:box-shadow .9s;display:block}
.gem.lit{box-shadow:0 0 30px var(--gc),0 0 60px var(--gc)30}
.gn{font-family:'Cinzel',serif;font-weight:300;font-size:18px;letter-spacing:.12em;color:rgba(255,255,255,0);transition:color .8s .2s;text-align:center}
.gn.lit{color:#fff}
.gmo{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,0);transition:color .8s .4s;text-align:center}
.gmo.lit{color:rgba(255,255,255,.26)}

/* amp block */
.amp-block{width:100%;max-width:320px;margin-bottom:20px;opacity:0;transition:opacity .9s;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.07);padding:14px 18px;display:flex;align-items:center;gap:13px}
.amp-block.show{opacity:1}
.adot{border-radius:50%;display:block;flex-shrink:0}
.an{font-family:'Cinzel',serif;font-weight:300;font-size:13px;color:#fff;letter-spacing:.07em;margin-bottom:3px}
.ad{font-size:12px;font-style:italic;color:rgba(255,255,255,.32);line-height:1.6}

/* questions */
.dv{width:1px;height:24px;background:linear-gradient(to bottom,transparent,rgba(255,255,255,.1),transparent);margin:4px auto 20px}
.ql{font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:12px;text-align:center}
.opts{display:flex;flex-direction:column;width:100%}
.opt{padding:11px 0;font-size:13px;font-weight:300;color:rgba(255,255,255,.33);cursor:pointer;border:none;background:transparent;text-align:left;font-family:'Karla',sans-serif;transition:color .2s;border-bottom:1px solid rgba(255,255,255,.05);width:100%;letter-spacing:.03em}
.opt:last-child{border-bottom:none}
.opt:hover{color:rgba(255,255,255,.65)}
.opt.sel{color:#fff;position:relative;padding-left:16px}
.opt.sel::before{content:'—';position:absolute;left:0;font-size:11px;color:inherit}

/* inputs */
.dinp{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);width:100%;padding:10px 0;color:#fff;font-family:'Karla',sans-serif;font-size:14px;outline:none;text-align:center;letter-spacing:.08em;color-scheme:dark;-webkit-appearance:none;transition:border-color .25s;margin-bottom:6px}
.dinp:focus{border-color:rgba(255,255,255,.32)}
.einp{background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.1);width:100%;padding:10px 0;color:#fff;font-family:'Karla',sans-serif;font-size:14px;outline:none;color-scheme:dark;transition:border-color .25s;margin-bottom:22px}
.einp::placeholder{color:rgba(255,255,255,.18)}
.einp:focus{border-color:rgba(255,255,255,.32)}

/* button */
.btn{background:transparent;border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.45);font-family:'Cinzel',serif;font-weight:300;font-size:11px;letter-spacing:.2em;text-transform:uppercase;padding:13px 32px;cursor:pointer;transition:all .3s;width:100%;max-width:280px}
.btn:hover{border-color:rgba(255,255,255,.3);color:#fff;background:rgba(255,255,255,.03)}
.btn.pr{border-color:rgba(255,255,255,.26);color:rgba(255,255,255,.7)}
.btn.pr:hover{border-color:rgba(255,255,255,.48);color:#fff}

/* trio */
.trio{display:flex;gap:10px;justify-content:center;margin-bottom:20px}
.tunit{display:flex;flex-direction:column;align-items:center;gap:5px;opacity:0;transform:translateY(5px);transition:all .5s}
.tunit.show{opacity:1;transform:none}
.tc{border-radius:50%;border:1px solid rgba(255,255,255,.12);display:block}
.tl{font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.24);text-align:center;line-height:1.4;max-width:62px}

/* sign glyph */
.sg{font-family:'Cinzel',serif;font-weight:300;font-size:52px;color:rgba(255,255,255,.1);text-align:center;margin:2px 0 2px;letter-spacing:.08em}
</style>
</head>
<body>
<div id="app">

<!-- P0: Birth date entry -->
<div class="ph on" id="p0">
  <div class="wm"><h1>Auraspanse</h1><p>Your living aura · no edge, only position</p></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><div class="rg rg2" style="inset:-26px"></div><canvas id="c0" width="120" height="120"></canvas></div>
  <div class="ey">First hue</div>
  <div class="hl">Enter your birth date</div>
  <div class="st">The reading begins with who you were born as.</div>
  <div style="font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:6px;text-align:center">Birth date</div>
  <input class="dinp" type="date" id="dob" oninput="onDob()">
  <div style="height:24px"></div>
  <button class="btn pr" id="b0" style="opacity:.25;pointer-events:none" onclick="go(1)">Begin the reading ✦</button>
</div>

<!-- P1: Sign reveal -->
<div class="ph" id="p1">
  <div class="pips"><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><div class="rg rg2" style="inset:-26px"></div><canvas id="c1" width="120" height="120"></canvas></div>
  <div class="ey" id="p1ey">Your sign</div>
  <div class="sg" id="p1gl">♈</div>
  <div class="hl" id="p1n">—</div>
  <div class="st" id="p1el">—</div>
  <div class="ar" id="p1r"></div>
  <button class="btn" onclick="go(2)">Meet the first force →</button>
</div>

<!-- P2–P4: Traits -->
<div class="ph" id="p2">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c2" width="120" height="120"></canvas></div>
  <div class="ey">Strength · the first force</div>
  <div class="tb" id="tb2"><span class="tb-sym">+</span><span class="tb-n" id="tn2">—</span></div>
  <div class="ar" id="ar2"></div>
  <button class="btn" onclick="go(3)">The balancing force →</button>
</div>

<div class="ph" id="p3">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c3" width="120" height="120"></canvas></div>
  <div class="ey">Balance · the second force</div>
  <div class="tb" id="tb3"><span class="tb-sym">=</span><span class="tb-n" id="tn3">—</span></div>
  <div class="ar" id="ar3"></div>
  <button class="btn" onclick="go(4)">The shadow force →</button>
</div>

<div class="ph" id="p4">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c4" width="120" height="120"></canvas></div>
  <div class="ey">Shadow · the third force</div>
  <div class="tb" id="tb4"><span class="tb-sym">−</span><span class="tb-n" id="tn4">—</span></div>
  <div class="ar" id="ar4"></div>
  <button class="btn" onclick="blendH1()">Blend the three forces →</button>
</div>

<!-- P5: Hue 1 forms -->
<div class="ph" id="p5">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c5" width="120" height="120"></canvas></div>
  <div class="ey" id="p5ey">Hue 1 forming</div>
  <div class="hl" id="p5h">The forces find their frequency</div>
  <div class="beam" id="beam">
    <div class="bt"><div class="bf" id="bfill"></div><div class="bm" id="bmark"></div></div>
    <div class="bl"><span>Jan 1</span><span id="bpct">—</span><span>Dec 31</span></div>
  </div>
  <div class="formula" id="fml1"></div>
  <div class="ar" id="ar5"></div>
  <div class="hname" id="h1name"></div>
  <div class="hsub" id="h1sub"></div>
  <button class="btn pr" id="b5" style="opacity:0;pointer-events:none" onclick="go(6)">The second hue awaits →</button>
</div>

<!-- P6: Stone reveal -->
<div class="ph" id="p6">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c6" width="120" height="120"></canvas></div>
  <div class="ey">The stone of your birth month</div>
  <div class="carried" id="h1strip">
    <div class="cdot" id="h1dot"></div>
    <div class="ctxt">Hue 1 · <span class="cn" id="h1sn">—</span> · first coordinate sealed</div>
  </div>
  <div class="gem-wrap">
    <canvas class="gem" id="sg" width="56" height="56" style="--gc:rgba(255,255,255,.3)"></canvas>
    <div class="gn" id="gn">—</div>
    <div class="gmo" id="gmo">—</div>
  </div>
  <div class="ar" id="ar6"></div>
  <button class="btn" id="b6" style="opacity:0;pointer-events:none" onclick="go(7)">The hour speaks →</button>
</div>

<!-- P7: Amplifier enters -->
<div class="ph" id="p7">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c7" width="120" height="120"></canvas></div>
  <div class="ey">A resonance from this hour</div>
  <div class="hl">Something arrives</div>
  <div class="st">The moment you enter the spectrum carries its own stone. It does not announce itself — it simply enters.</div>
  <div class="amp-block" id="ablock">
    <canvas class="adot" id="ag" width="26" height="26"></canvas>
    <div><div class="an" id="aN">—</div><div class="ad" id="aD">—</div></div>
  </div>
  <div class="ar" id="ar7"></div>
  <button class="btn" id="b7" style="opacity:0;pointer-events:none" onclick="blendH2()">Blend into Hue 2 →</button>
</div>

<!-- P8: Hue 2 + Hue 3 converge -->
<div class="ph" id="p8">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div><div class="pip"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c8" width="120" height="120"></canvas></div>
  <div class="ey">Hue 2 forming</div>
  <div class="trio" id="trio"></div>
  <div class="formula" id="fml2"></div>
  <div class="ar" id="ar8"></div>
  <div class="hname" id="h2name"></div>
  <div class="hsub" id="h2sub"></div>
  <button class="btn pr" id="b8" style="opacity:0;pointer-events:none" onclick="go(9)">Converge into Hue 3 →</button>
</div>

<!-- P9: Questions + Email -->
<div class="ph" id="p9">
  <div class="pips"><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip done"></div><div class="pip on"></div></div>
  <div class="ob"><div class="rg" style="inset:-14px"></div><canvas id="c9" width="120" height="120"></canvas></div>
  <div class="ey">Your aura</div>
  <div class="hname" id="h3name" style="opacity:1;margin-bottom:2px">—</div>
  <div class="hsub" id="h3sub" style="opacity:1;margin-bottom:20px">—</div>
  <div class="dv"></div>
  <div class="ql">What first calls to you?</div>
  <div class="opts">
    <button class="opt" data-q="q1" data-v="fire"        onclick="pick(this)">Warmth of fire</button>
    <button class="opt" data-q="q1" data-v="water"       onclick="pick(this)">Depth of water</button>
    <button class="opt" data-q="q1" data-v="air"         onclick="pick(this)">Clarity of air</button>
    <button class="opt" data-q="q1" data-v="earth"       onclick="pick(this)">Weight of earth</button>
  </div>
  <div class="dv"></div>
  <div class="ql">What moves within you?</div>
  <div class="opts">
    <button class="opt" data-q="q2" data-v="expansion"   onclick="pick(this)">Expansion</button>
    <button class="opt" data-q="q2" data-v="contraction" onclick="pick(this)">Contraction</button>
    <button class="opt" data-q="q2" data-v="oscillation" onclick="pick(this)">Oscillation</button>
    <button class="opt" data-q="q2" data-v="stillness"   onclick="pick(this)">Stillness</button>
  </div>
  <div class="dv"></div>
  <div class="ql">What do you carry forward?</div>
  <div class="opts">
    <button class="opt" data-q="q3" data-v="memory"      onclick="pick(this)">Memory</button>
    <button class="opt" data-q="q3" data-v="presence"    onclick="pick(this)">Presence</button>
    <button class="opt" data-q="q3" data-v="becoming"    onclick="pick(this)">Becoming</button>
    <button class="opt" data-q="q3" data-v="return"      onclick="pick(this)">Return</button>
  </div>
  <div class="dv"></div>
  <div class="ql">Receive your full reading</div>
  <input class="einp" type="email" id="email" placeholder="your email" oninput="chkCta()">
  <button class="btn pr" id="bcta" style="opacity:.25;pointer-events:none" onclick="checkout()">Get full reading · $4.99</button>
  <div style="font-size:10px;letter-spacing:.1em;color:rgba(255,255,255,.14);text-align:center;margin-top:10px">Delivered to your inbox · one time</div>
</div>

</div>
<script>
${ORB_JS}

const ZODIAC=${zData};
const STONES=${sData};
const AMPS=${aData};
const ZONES=${zoData};
const SCL=${scData};
const QM=${qData};

function hexToHsl(hex){let[r,g,cv]=h2r(hex).map(v=>v/255);const max=Math.max(r,g,cv),min=Math.min(r,g,cv),l=(max+min)/2;if(max===min)return[0,0,l*100];const d=max-min,s=l>.5?d/(2-max-min):d/(max+min);let h=max===r?(g-cv)/d+(g<cv?6:0):max===g?(cv-r)/d+2:(r-g)/d+4;return[h*60,s*100,l*100];}
function getZone(hex){const[h,,l]=hexToHsl(hex);const z=ZONES.find(z=>z.hMin>z.hMax?h>=z.hMin||h<z.hMax:h>=z.hMin&&h<z.hMax)||ZONES[0];return{z,tier:l<25?'dark':l<60?'mid':'light'};}
function hName(hex,si,sw){const{z,tier}=getZone(hex);const ws=z.words[tier];return{name:ws[si%ws.length]+sw,sub:SCL[si]+' · '+z.n};}
function doy(d){return Math.floor((d-new Date(d.getFullYear(),0,0))/864e5);}
function getSign(d){const m=d.getMonth()+1,day=d.getDate();if((m===3&&day>=21)||(m===4&&day<=19))return 0;if((m===4&&day>=20)||(m===5&&day<=20))return 1;if((m===5&&day>=21)||(m===6&&day<=20))return 2;if((m===6&&day>=21)||(m===7&&day<=22))return 3;if((m===7&&day>=23)||(m===8&&day<=22))return 4;if((m===8&&day>=23)||(m===9&&day<=22))return 5;if((m===9&&day>=23)||(m===10&&day<=22))return 6;if((m===10&&day>=23)||(m===11&&day<=21))return 7;if((m===11&&day>=22)||(m===12&&day<=21))return 8;if((m===12&&day>=22)||(m===1&&day<=19))return 9;if((m===1&&day>=20)||(m===2&&day<=18))return 10;return 11;}
function specC(t){const c=ZODIAC.map(z=>z.c),s=t*(c.length-1),i=Math.min(Math.floor(s),c.length-2);return bl(c[i],c[i+1],s-i);}
function getAmp(h){if(h>=4&&h<12)return AMPS[0];if(h>=12&&h<20)return AMPS[1];return AMPS[2];}

const S={dob:null,si:0,oc:[26,16,40],tgt:'#1a1028',q1:null,q2:null,q3:null,email:'',hue1:null,hue2:null,hue3:null};

function setTgt(c){S.tgt=c;}
function animOrb(){
  const t=h2r(S.tgt);
  S.oc=S.oc.map((v,i)=>v+(t[i]-v)*.048);
  const col=r2h(S.oc);
  for(let i=0;i<=9;i++){const cv=document.getElementById('c'+i);if(cv)paintGem('c'+i,col,120);}
  requestAnimationFrame(animOrb);
}

function go(n){
  document.querySelectorAll('.ph').forEach((el,i)=>el.classList.toggle('on',i===n));
  if(n===1)setupSign();
  if(n===2)setupTrait(0);
  if(n===3)setupTrait(1);
  if(n===4)setupTrait(2);
  if(n===6)setupStone();
  if(n===7)setupAmp();
  if(n===9)setupH3();
}

function fadeIn(id,html,delay){
  const el=document.getElementById(id);if(!el)return;
  el.style.opacity=0;el.innerHTML='';
  setTimeout(()=>{el.innerHTML=html;el.style.transition='opacity 1.15s';el.style.opacity=1;},delay||400);
}

function onDob(){
  const v=document.getElementById('dob').value;if(!v)return;
  S.dob=new Date(v);S.si=getSign(S.dob);
  setTgt(bl(ZODIAC[S.si].c,'#07060f',.55));
  const b=document.getElementById('b0');b.style.opacity='1';b.style.pointerEvents='all';
}

function setupSign(){
  const z=ZODIAC[S.si];
  document.getElementById('p1ey').textContent='Your sign · '+z.el;
  document.getElementById('p1gl').textContent=z.glyph;
  document.getElementById('p1n').textContent=z.n;
  document.getElementById('p1el').textContent=z.el;
  setTgt(bl(z.c,'#07060f',.42));
  fadeIn('p1r',z.read,700);
}

function setupTrait(idx){
  const z=ZODIAC[S.si],tr=z.tr[idx];
  const pid=idx+2;
  const tb=document.getElementById('tb'+pid);
  document.getElementById('tn'+pid).textContent=tr.n;
  tb.style.borderColor=tr.tc+'72';tb.style.background=tr.tc+'14';tb.style.color=tr.tc;
  setTgt(bl(tr.tc,'#07060f',.4));
  fadeIn('ar'+pid,tr.desc,500);
}

function blendH1(){
  go(5);
  const z=ZODIAC[S.si],now=new Date();
  const trBlend=bl(bl(z.tr[0].tc,z.tr[1].tc,.5),z.tr[2].tc,.33);
  const eT=doy(now)/365;
  const spCol=specC(eT);
  S.hue1=bl(trBlend,spCol,.5);
  setTgt(S.hue1);

  const pct=Math.round(eT*100);
  setTimeout(()=>{
    const beam=document.getElementById('beam');beam.style.opacity='1';
    document.getElementById('bpct').textContent='Now · '+pct+'%';
    const bf=document.getElementById('bfill'),bm=document.getElementById('bmark');
    bf.style.background=spCol;bm.style.background=spCol;bm.style.borderColor=bl(spCol,'#fff',.4);
    setTimeout(()=>{bf.style.width=pct+'%';bm.style.left=pct+'%';},200);
  },400);

  setTimeout(()=>{
    const f=document.getElementById('fml1');
    f.innerHTML=z.tr.map((t,i)=>`<div style="text-align:center"><div class="fd" style="background:${t.tc};box-shadow:0 0 7px ${t.tc}50"></div><div class="fl">${t.s}</div></div>${i<2?'<div class="fp">+</div>':''}`).join('')
      +`<div class="fp">=</div><div style="text-align:center"><div class="fd" style="background:${trBlend}"></div><div class="fl">sign</div></div>`
      +`<div class="fp">+</div><div style="text-align:center"><div class="fd" style="background:${spCol};box-shadow:0 0 7px ${spCol}50"></div><div class="fl">now</div></div>`
      +`<div class="fp">=</div><div style="text-align:center"><div class="fr" style="background:${S.hue1};box-shadow:0 0 12px ${S.hue1}80"></div><div class="fl">hue 1</div></div>`;
    f.classList.add('show');
  },1000);

  const stone=STONES[S.dob.getMonth()];
  const {name,sub}=hName(S.hue1,S.si,stone.w);
  fadeIn('ar5','Your first hue — <b>'+z.n+'</b> carried through the spectrum to this moment. Three forces blended into one frequency, then marked by when you arrived.',1600);
  setTimeout(()=>{
    const hn=document.getElementById('h1name'),hs=document.getElementById('h1sub');
    hn.textContent=name;hn.style.opacity='1';hs.textContent=sub;hs.style.opacity='1';
    const b=document.getElementById('b5');b.style.opacity='1';b.style.pointerEvents='all';
  },2400);
}

function setupStone(){
  const stone=STONES[S.dob.getMonth()];
  const dot=document.getElementById('h1dot');
  dot.style.background=S.hue1;dot.style.boxShadow='0 0 10px '+S.hue1+'80';
  document.getElementById('h1sn').textContent=ZODIAC[S.si].n;
  setTgt(bl(stone.c,'#07060f',.42));
  paintGem('sg',stone.c,56);
  const sg=document.getElementById('sg');
  sg.style.setProperty('--gc',stone.c);
  setTimeout(()=>{
    sg.classList.add('lit');
    document.getElementById('gn').textContent=stone.n;document.getElementById('gn').classList.add('lit');
    document.getElementById('gmo').textContent=stone.mo+' · birth stone';document.getElementById('gmo').classList.add('lit');
    setTgt(stone.c);
  },350);
  fadeIn('ar6',stone.d,900);
  setTimeout(()=>{const b=document.getElementById('b6');b.style.opacity='1';b.style.pointerEvents='all';},1900);
}

function setupAmp(){
  const stone=STONES[S.dob.getMonth()];
  const amp=getAmp(new Date().getHours());
  setTgt(bl(stone.c,amp.c,.32));
  setTimeout(()=>{
    document.getElementById('ablock').classList.add('show');
    paintGem('ag',amp.c,26);
    document.getElementById('aN').textContent=amp.n;
    document.getElementById('aD').textContent=amp.d;
    setTgt(bl(stone.c,amp.c,.5));
  },600);
  fadeIn('ar7','The stone and the hour have never met at exactly this frequency before. What they produce together is <b>Hue 2</b> — specific to this birth month, this exact moment.',1500);
  setTimeout(()=>{const b=document.getElementById('b7');b.style.opacity='1';b.style.pointerEvents='all';},2400);
}

function blendH2(){
  go(8);
  const stone=STONES[S.dob.getMonth()];
  const amp=getAmp(new Date().getHours());
  S.hue2=bl(stone.c,amp.c,.5);
  setTgt(S.hue2);

  const trio=document.getElementById('trio');
  const items=[{id:'tg0',c:S.hue1,l:'Hue 1\ncarried'},{id:'tg1',c:stone.c,l:stone.n.toLowerCase()+'\nbirth'},{id:'tg2',c:amp.c,l:amp.w.toLowerCase()+'\nhour'},{id:'tg3',c:S.hue2,l:'Hue 2\nformed'}];
  trio.innerHTML=items.map((it,i)=>`<div class="tunit" id="tu${i}" style="transition-delay:${i*.18}s"><canvas class="tc" id="${it.id}" width="48" height="48"></canvas><div class="tl">${it.l}</div></div>`).join('');
  items.forEach((it,i)=>setTimeout(()=>{paintGem(it.id,it.c,48);document.getElementById('tu'+i).classList.add('show');},i*200+80));

  setTimeout(()=>{
    const f=document.getElementById('fml2');
    f.innerHTML=`<div style="text-align:center"><div class="fd" style="background:${stone.c};box-shadow:0 0 7px ${stone.c}55"></div><div class="fl">${stone.n.toLowerCase()}</div></div>`
      +`<div class="fp">+</div><div style="text-align:center"><div class="fd" style="background:${amp.c};box-shadow:0 0 7px ${amp.c}55"></div><div class="fl">${amp.w.toLowerCase()}</div></div>`
      +`<div class="fp">=</div><div style="text-align:center"><div class="fr" style="background:${S.hue2};box-shadow:0 0 14px ${S.hue2}90"></div><div class="fl">hue 2</div></div>`;
    f.classList.add('show');
  },900);

  const {name,sub}=hName(S.hue2,S.si,stone.w);
  fadeIn('ar8','<b>'+name+'</b> — your second hue sealed. The stone of your birth month and the resonance of this hour blended into a frequency that belongs to this exact moment.',1400);
  setTimeout(()=>{
    const hn=document.getElementById('h2name'),hs=document.getElementById('h2sub');
    hn.textContent=name;hn.style.opacity='1';hs.textContent=sub;hs.style.opacity='1';
    const b=document.getElementById('b8');b.style.opacity='1';b.style.pointerEvents='all';
  },2200);
}

function setupH3(){
  S.hue3=bl(S.hue1,S.hue2,.5);
  setTgt(S.hue3);
  const stone=STONES[S.dob.getMonth()];
  const {name,sub}=hName(S.hue3,S.si,stone.w);
  S._name=name;
  document.getElementById('h3name').textContent=name;
  document.getElementById('h3sub').textContent=sub;
}

function pick(el){
  const q=el.dataset.q;
  document.querySelectorAll('[data-q="'+q+'"]').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  S[q]=el.dataset.v;
  if(S.hue1&&S.hue2){
    let t=.5;
    if(S.q1)t+=(QM.q1[S.q1]||0);
    if(S.q2)t+=(QM.q2[S.q2]||0);
    if(S.q3)t+=(QM.q3[S.q3]||0);
    t=Math.max(.1,Math.min(.9,t));
    S.hue3=bl(S.hue1,S.hue2,t);
    const stone=STONES[S.dob.getMonth()];
    const {name,sub}=hName(S.hue3,S.si,stone.w);
    S._name=name;
    document.getElementById('h3name').textContent=name;
    document.getElementById('h3sub').textContent=sub;
    setTgt(S.hue3);
  }
  chkCta();
}

function chkCta(){
  S.email=document.getElementById('email').value;
  const ok=S.dob&&S.email&&S.q1&&S.q2&&S.q3;
  const b=document.getElementById('bcta');
  b.style.opacity=ok?'1':'.25';b.style.pointerEvents=ok?'all':'none';
}

async function checkout(){
  if(!(S.dob&&S.email&&S.q1&&S.q2&&S.q3))return;
  const btn=document.getElementById('bcta');
  btn.textContent='Opening…';btn.style.pointerEvents='none';
  try{
    const r=await fetch('/create-payment',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        email:S.email,dob:S.dob.toISOString().split('T')[0],
        regHour:new Date().getHours(),regDate:new Date().toISOString().split('T')[0],
        q1:S.q1,q2:S.q2,q3:S.q3,
        hue1:S.hue1,hue2:S.hue2,hue3:S.hue3,hueName:S._name,
      })
    });
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||'Payment failed');
    window.location.href=j.url;
  }catch(e){
    btn.textContent='Get full reading · $4.99';btn.style.pointerEvents='all';
    alert(e.message);
  }
}

animOrb();
</script>
</body></html>`;
}

// ─── SUCCESS PAGE ─────────────────────────────────────────────────────────────

function successPage(data){
  const{sign,stone,amp,hue1,hue2,hue3,name,sub,zone,reading,email,emailSent}=data;
  const rHtml=(reading||'').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} — Auraspanse</title>
<style>
${SHARED_CSS}
body{padding:52px 24px 80px;min-height:100vh;background:#07060f}
.wrap{max-width:580px;margin:0 auto}
.header{text-align:center;margin-bottom:44px}
.header h1{font-family:'Cinzel',serif;font-weight:300;font-size:26px;letter-spacing:.16em;color:#fff;margin-bottom:4px}
.header p{font-size:10px;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.22)}
canvas#orb{display:block;margin:0 auto 22px;border-radius:50%}
.section{border:1px solid rgba(255,255,255,.06);padding:24px 28px;margin-bottom:14px}
.sl{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.2);margin-bottom:16px}
.hues{display:flex;gap:16px;flex-wrap:wrap}
.hue{display:flex;flex-direction:column;align-items:center;gap:6px}
.hue-dot{width:38px;height:38px;border-radius:50%;border:1px solid rgba(255,255,255,.12)}
.hue-lbl{font-size:10px;letter-spacing:.08em;color:rgba(255,255,255,.26);text-align:center;line-height:1.4}
.reading{font-size:14px;font-weight:300;line-height:2.1;color:rgba(255,255,255,.55)}
.reading strong{color:#fff;font-weight:400}
.enote{text-align:center;padding:14px;font-size:11px;color:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.06);margin-top:14px;letter-spacing:.06em}
.enote span{color:rgba(255,255,255,.42)}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <canvas id="orb" width="96" height="96"></canvas>
    <h1>${name}</h1>
    <p>${sub} · ${zone}</p>
  </div>
  <div class="section">
    <div class="sl">Your three hues</div>
    <div class="hues">
      <div class="hue"><div class="hue-dot" style="background:${hue1}"></div><div class="hue-lbl">Hue 1<br>${sign.n}</div></div>
      <div class="hue"><div class="hue-dot" style="background:${hue2}"></div><div class="hue-lbl">Hue 2<br>${stone.n}</div></div>
      <div class="hue"><div class="hue-dot" style="background:${hue3};box-shadow:0 0 14px ${hue3}55"></div><div class="hue-lbl">Hue 3<br>${name}</div></div>
    </div>
  </div>
  <div class="section">
    <div class="sl">Full spectrum reading</div>
    <div class="reading">${rHtml}</div>
  </div>
  ${emailSent?`<div class="enote">Reading sent to <span>${email}</span></div>`:''}
</div>
<script>
${ORB_JS}
paintGem('orb','${hue1}',96);
setTimeout(()=>{
  const tgt=h2r('${hue3}');
  let oc=h2r('${hue1}');
  function tick(){oc=oc.map((v,i)=>v+(tgt[i]-v)*.04);paintGem('orb',r2h(oc),96);if(Math.max(...oc.map((v,i)=>Math.abs(v-tgt[i])))>.5)requestAnimationFrame(tick);}
  tick();
},800);
<\/script>
</body></html>`;
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/', (req,res) => res.send(homePage()));

app.post('/create-payment', async (req,res) => {
  const{email,dob,regDate,regHour,q1,q2,q3,hue1,hue2,hue3,hueName}=req.body;
  if(!email||!dob) return res.status(400).json({error:'Email and birth date required.'});
  try{
    const session=await stripe.checkout.sessions.create({
      payment_method_types:['card'],mode:'payment',customer_email:email,
      line_items:[{price:process.env.PRICE_ID,quantity:1}],
      metadata:{
        email,dob,
        regDate:regDate||new Date().toISOString().split('T')[0],
        regHour:String(regHour??new Date().getHours()),
        q1:q1||'',q2:q2||'',q3:q3||'',
        hue1:hue1||'',hue2:hue2||'',hue3:hue3||'',hueName:hueName||'',
      },
      success_url:`${process.env.BASE_URL||''}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:`${process.env.BASE_URL||''}/`,
    });
    res.json({url:session.url});
  }catch(err){
    console.error('Stripe:',err.message);
    res.status(500).json({error:err.message});
  }
});

app.get('/success', async (req,res) => {
  const{session_id}=req.query;
  if(!session_id) return res.redirect('/');
  try{
    const session=await stripe.checkout.sessions.retrieve(session_id);
    if(session.payment_status!=='paid') return res.status(402).send('<p style="font-family:sans-serif;color:#f87171;padding:40px">Payment not completed.</p>');

    const{email,dob,regDate,regHour,q1,q2,q3}=session.metadata;
    const C=computeHues(dob,regDate,Number(regHour),q1,q2,q3);
    const{sign,stone,amp,hue1,hue2,hue3,name,sub,zone,traitBlend,specCol}=C;

    let reading='';
    try{
      const aiRes=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',max_tokens:1000,
          messages:[{role:'user',content:`You are Auraspanse — a living aura reader. Speak in slow, precise, poetic language. Never generic. Never astrology-platitudes. Every sentence must feel like it required this person's exact coordinates.

Person's coordinates:
Sign: ${sign.n} (${sign.el})
Strength: ${sign.tr[0].n} · color ${sign.tr[0].tc}
Balance: ${sign.tr[1].n} · color ${sign.tr[1].tc}
Shadow: ${sign.tr[2].n} · color ${sign.tr[2].tc}
Birth stone: ${stone.n} — ${stone.d}
Resonance stone: ${amp.n} — ${amp.d}
Hue 1: ${hue1} (traits ${traitBlend} × spectrum ${specCol})
Hue 2: ${hue2} (${stone.n} × ${amp.n})
Hue 3: ${hue3} — named ${name}
Emotional zone: ${zone}
What calls to them: ${q1}
What moves within them: ${q2}
What they carry forward: ${q3}

Write exactly 5 paragraphs. Use **bold** for key phrases. Speak as "you". Reference the actual hue name (${name}), actual stone (${stone.n}), actual sign trait. The three questions are not rhetorical — interpret them literally in the reading. This reading should be impossible to give to anyone else.`}],
        }),
      });
      const aj=await aiRes.json();
      reading=aj?.content?.[0]?.text||'';
    }catch(e){
      console.error('AI:',e.message);
      reading=`Your aura carries the frequency of **${name}** — a color that required four exact coordinates to exist. This reading was interrupted in generation. Please contact support and we will resend your full reading.`;
    }

    let emailSent=false;
    try{
      const emailHtml=`<div style="background:#07060f;color:#e4dff0;padding:52px 28px;font-family:sans-serif;max-width:580px;margin:0 auto">
<h1 style="font-family:serif;font-weight:300;font-size:24px;letter-spacing:.16em;color:#fff;margin-bottom:4px">${name}</h1>
<p style="font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.22);margin-bottom:36px">${sub} · ${zone}</p>
<div style="display:flex;gap:16px;margin-bottom:32px">
${[{c:hue1,l:'Hue 1 · '+sign.n},{c:hue2,l:'Hue 2 · '+stone.n},{c:hue3,l:'Hue 3 · '+name}].map(h=>`<div style="text-align:center"><div style="width:36px;height:36px;border-radius:50%;background:${h.c};border:1px solid rgba(255,255,255,.12);margin:0 auto 6px"></div><div style="font-size:10px;color:rgba(255,255,255,.28);letter-spacing:.06em">${h.l}</div></div>`).join('')}
</div>
<div style="border:1px solid rgba(255,255,255,.06);padding:24px;line-height:2.1;font-size:14px;font-weight:300;color:rgba(255,255,255,.55)">
${reading.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#fff;font-weight:400">$1</strong>').replace(/\n/g,'<br>')}
</div>
<p style="text-align:center;margin-top:32px;font-size:10px;color:rgba(255,255,255,.14);letter-spacing:.14em">AURASPANSE · YOUR LIVING AURA</p>
</div>`;
      await resend.emails.send({
        from:process.env.FROM_EMAIL||'Auraspanse <reading@auraspanse.com>',
        to:email,subject:`${name} — Your Auraspanse Reading`,html:emailHtml,
      });
      emailSent=true;
    }catch(e){ console.error('Email:',e.message); }

    res.send(successPage({sign,stone,amp,hue1,hue2,hue3,name,sub,zone,reading,email,emailSent}));
  }catch(err){
    console.error('Success route:',err.message);
    res.status(500).send(`<p style="color:#f87171;font-family:sans-serif;padding:40px">Error: ${err.message}</p>`);
  }
});

app.get('/health',(req,res)=>res.json({ok:true}));

const PORT=process.env.PORT||3000;
app.listen(PORT,()=>console.log(`✦ Auraspanse on port ${PORT}`));
