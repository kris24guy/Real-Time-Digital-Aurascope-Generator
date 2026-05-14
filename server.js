const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');
const app = express();
app.use(express.json());

// ============================================================
// DATA — 12 Signs × 3 Traits (+/-) = 36 Core Traits
// ============================================================
const ZODIAC = {
  aries:       { dates:[[3,21],[4,19]],   symbol:'♈', traits:[
    {name:'Courage',       pos:'Bold initiative',          neg:'Recklessness'},
    {name:'Passion',       pos:'Magnetic drive',           neg:'Aggression'},
    {name:'Spark',         pos:'Unstoppable momentum',     neg:'Impulsiveness'},
  ]},
  taurus:      { dates:[[4,20],[5,20]],   symbol:'♉', traits:[
    {name:'Stability',     pos:'Grounded presence',        neg:'Stubbornness'},
    {name:'Loyalty',       pos:'Deep devotion',            neg:'Possessiveness'},
    {name:'Sensuality',    pos:'Rich appreciation',        neg:'Overindulgence'},
  ]},
  gemini:      { dates:[[5,21],[6,20]],   symbol:'♊', traits:[
    {name:'Adaptability',  pos:'Fluid intelligence',       neg:'Inconsistency'},
    {name:'Curiosity',     pos:'Electric mind',            neg:'Restlessness'},
    {name:'Wit',           pos:'Sharp connection',         neg:'Superficiality'},
  ]},
  cancer:      { dates:[[6,21],[7,22]],   symbol:'♋', traits:[
    {name:'Intuition',     pos:'Deep inner knowing',       neg:'Moodiness'},
    {name:'Nurturing',     pos:'Unconditional care',       neg:'Clinginess'},
    {name:'Empathy',       pos:'Emotional wisdom',         neg:'Oversensitivity'},
  ]},
  leo:         { dates:[[7,23],[8,22]],   symbol:'♌', traits:[
    {name:'Confidence',    pos:'Radiant presence',         neg:'Arrogance'},
    {name:'Generosity',    pos:'Open-hearted giving',      neg:'Ego'},
    {name:'Charisma',      pos:'Natural magnetism',        neg:'Drama'},
  ]},
  virgo:       { dates:[[8,23],[9,22]],   symbol:'♍', traits:[
    {name:'Precision',     pos:'Masterful discernment',    neg:'Perfectionism'},
    {name:'Diligence',     pos:'Sacred dedication',        neg:'Harsh criticism'},
    {name:'Analysis',      pos:'Pattern wisdom',           neg:'Overthinking'},
  ]},
  libra:       { dates:[[9,23],[10,22]],  symbol:'♎', traits:[
    {name:'Harmony',       pos:'Peace-weaving grace',      neg:'Avoidance'},
    {name:'Fairness',      pos:'Justice-seeking soul',     neg:'Indecision'},
    {name:'Beauty',        pos:'Aesthetic elevation',      neg:'People-pleasing'},
  ]},
  scorpio:     { dates:[[10,23],[11,21]], symbol:'♏', traits:[
    {name:'Intensity',       pos:'Transformative depth',   neg:'Obsession'},
    {name:'Perception',      pos:'X-ray insight',          neg:'Paranoia'},
    {name:'Transformation',  pos:'Phoenix rebirth',        neg:'Self-destruction'},
  ]},
  sagittarius: { dates:[[11,22],[12,21]], symbol:'♐', traits:[
    {name:'Freedom',       pos:'Expansive vision',         neg:'Restlessness'},
    {name:'Optimism',      pos:'Infectious hope',          neg:'Naivety'},
    {name:'Truth',         pos:'Fearless honesty',         neg:'Bluntness'},
  ]},
  capricorn:   { dates:[[12,22],[1,19]],  symbol:'♑', traits:[
    {name:'Ambition',      pos:'Mountain-climbing will',   neg:'Coldness'},
    {name:'Discipline',    pos:'Unbreakable structure',    neg:'Rigidity'},
    {name:'Endurance',     pos:'Timeless resilience',      neg:'Workaholism'},
  ]},
  aquarius:    { dates:[[1,20],[2,18]],   symbol:'♒', traits:[
    {name:'Vision',        pos:'Future sight',             neg:'Detachment'},
    {name:'Innovation',    pos:'Revolutionary spark',      neg:'Rebellion'},
    {name:'Originality',   pos:'Authentic uniqueness',     neg:'Eccentricity'},
  ]},
  pisces:      { dates:[[2,19],[3,20]],   symbol:'♓', traits:[
    {name:'Compassion',    pos:'Boundless empathy',        neg:'Martyrdom'},
    {name:'Imagination',   pos:'Visionary dreaming',       neg:'Escapism'},
    {name:'Spirituality',  pos:'Soul-level wisdom',        neg:'Delusion'},
  ]},
};

// ============================================================
// DATA — 21 Birthstones with Colors + ±Emotions
// ============================================================
const BIRTHSTONES = [
  {name:'Garnet',      month:1,  hex:'#C0392B', pos:['devotion','vitality','protection'],       neg:['jealousy','anger','obsession']},
  {name:'Amethyst',    month:2,  hex:'#9B59B6', pos:['clarity','calm','intuition'],             neg:['apathy','detachment','illusion']},
  {name:'Aquamarine',  month:3,  hex:'#1ABC9C', pos:['serenity','flow','truth'],                neg:['avoidance','coldness','scatter']},
  {name:'Bloodstone',  month:3,  hex:'#27AE60', pos:['courage','healing','vitality'],           neg:['aggression','recklessness','rage']},
  {name:'Diamond',     month:4,  hex:'#AED6F1', pos:['strength','purity','clarity'],            neg:['hardness','coldness','isolation']},
  {name:'Emerald',     month:5,  hex:'#2ECC71', pos:['growth','abundance','renewal'],           neg:['envy','greed','possessiveness']},
  {name:'Pearl',       month:6,  hex:'#F0E6FF', pos:['wisdom','purity','femininity'],           neg:['moodiness','illusion','vanity']},
  {name:'Moonstone',   month:6,  hex:'#BDC3C7', pos:['intuition','cycles','mystery'],           neg:['escapism','fantasy','confusion']},
  {name:'Alexandrite', month:6,  hex:'#8E44AD', pos:['transformation','duality','luck'],        neg:['instability','contradiction','chaos']},
  {name:'Ruby',        month:7,  hex:'#E74C3C', pos:['love','vitality','passion'],              neg:['rage','domination','excess']},
  {name:'Peridot',     month:8,  hex:'#A8E63D', pos:['joy','healing','renewal'],                neg:['naivety','jealousy','insecurity']},
  {name:'Sardonyx',    month:8,  hex:'#D35400', pos:['strength','discipline','protection'],     neg:['stubbornness','pride','control']},
  {name:'Spinel',      month:8,  hex:'#E74C3C', pos:['energy','inspiration','revitalization'],  neg:['burnout','impulsiveness','excess']},
  {name:'Sapphire',    month:9,  hex:'#2980B9', pos:['wisdom','truth','loyalty'],               neg:['rigidity','coldness','distance']},
  {name:'Opal',        month:10, hex:'#D6EAF8', pos:['creativity','magic','expression'],        neg:['overwhelm','instability','illusion']},
  {name:'Tourmaline',  month:10, hex:'#F1948A', pos:['compassion','healing','attraction'],      neg:['oversensitivity','clinginess','dependency']},
  {name:'Topaz',       month:11, hex:'#F39C12', pos:['warmth','joy','abundance'],               neg:['excess','vanity','overconfidence']},
  {name:'Citrine',     month:11, hex:'#F4D03F', pos:['optimism','manifestation','clarity'],     neg:['impulsiveness','superficiality','greed']},
  {name:'Turquoise',   month:12, hex:'#1ABC9C', pos:['vision','peace','ancient wisdom'],        neg:['coldness','disconnection','unrealism']},
  {name:'Tanzanite',   month:12, hex:'#8E44AD', pos:['higher vision','transformation','grace'], neg:['overthinking','detachment','elitism']},
  {name:'Zircon',      month:12, hex:'#3498DB', pos:['purity','calm','clarity'],                neg:['isolation','rigidity','coldness']},
];

// ============================================================
// HELPERS
// ============================================================
const ZODIAC_COLORS = {aries:'#DC2626',taurus:'#166534',gemini:'#38BDF8',cancer:'#818CF8',leo:'#FACC15',virgo:'#34D399',libra:'#F9A8D4',scorpio:'#7C3AED',sagittarius:'#F97316',capricorn:'#475569',aquarius:'#06B6D4',pisces:'#A78BFA'};

function getZodiacSign(dob) {
  const d = new Date(dob + 'T12:00:00');
  const m = d.getMonth() + 1, day = d.getDate();
  for (const [sign, {dates}] of Object.entries(ZODIAC)) {
    const [[sm,sd],[em,ed]] = dates;
    if ((m===sm && day>=sd) || (m===em && day<=ed)) return sign;
  }
  return 'capricorn';
}

function getBirthstones(dob) {
  const month = new Date(dob + 'T12:00:00').getMonth() + 1;
  return BIRTHSTONES.filter(b => b.month === month);
}

const TIME_SLICES = [
  {range:[23,5],  label:'Midnight Void',       energy:'mysterious and still',    hex:'#191970'},
  {range:[5,8],   label:'Dawn Emergence',       energy:'fresh and expansive',     hex:'#FFB347'},
  {range:[8,11],  label:'Morning Ascension',    energy:'clear and purposeful',    hex:'#87CEEB'},
  {range:[11,14], label:'Solar Apex',           energy:'radiant and powerful',    hex:'#FFD700'},
  {range:[14,17], label:'Afternoon Flow',       energy:'fluid and creative',      hex:'#FFA07A'},
  {range:[17,20], label:'Dusk Integration',     energy:'reflective and warm',     hex:'#FF6347'},
  {range:[20,23], label:'Evening Depth',        energy:'intuitive and deep',      hex:'#9370DB'},
];

function getTimeSlice(hour) {
  for (const s of TIME_SLICES) {
    const [a,b] = s.range;
    if (a > b ? (hour >= a || hour < b) : (hour >= a && hour < b)) return s;
  }
  return TIME_SLICES[0];
}

function buildPreviewColors(sign, stones) {
  const traits = ZODIAC[sign]?.traits || ZODIAC.leo.traits;
  const stone  = stones[0] || BIRTHSTONES[0];
  const slice  = getTimeSlice(new Date().getHours());
  const signCap = sign.charAt(0).toUpperCase() + sign.slice(1);
  return [
    { color: ZODIAC_COLORS[sign] || '#7c3aed',
      label: signCap + ' Core',
      name:  traits[0]?.name,
      desc:  `${ZODIAC[sign]?.symbol} ${signCap} — ${traits[0]?.pos}, balanced with awareness of ${traits[0]?.neg}`,
      pos: traits[0]?.pos, neg: traits[0]?.neg, stone: null },
    { color: stone.hex,
      label: stone.name + ' Resonance',
      name:  stone.name,
      desc:  `Your birth month stone — ${stone.pos[0]} and ${stone.pos[1]} tempered by ${stone.neg[0]}`,
      pos: stone.pos[0], neg: stone.neg[0], stone },
    { color: slice.hex,
      label: slice.label,
      name:  'Time Layer',
      desc:  `The spectrum is currently at ${slice.label} — your aura is ${slice.energy}`,
      pos: slice.energy, neg: 'shadow integration', stone: null },
  ];
}

// ============================================================
// API ROUTES
// ============================================================
app.post('/api/preview', (req, res) => {
  const { dob } = req.body || {};
  if (!dob) return res.status(400).json({ error: 'dob required' });
  const sign   = getZodiacSign(dob);
  const stones = getBirthstones(dob);
  const colors = buildPreviewColors(sign, stones);
  res.json({ sign, symbol: ZODIAC[sign]?.symbol, traits: ZODIAC[sign]?.traits, stones, colors });
});

app.post('/create-payment', async (req, res) => {
  try {
    const { email, dob } = req.body || {};
    const sign = getZodiacSign(dob);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Full Aurascope Reading',
            description: `Complete aura blend — ${sign} zodiac × birthstone spectrum × 24hr time layer`,
          },
          unit_amount: 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { email: email||'', dob: dob||'', sign },
      success_url: `${process.env.BASE_URL||'https://realtime-aurascope.onrender.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:   process.env.BASE_URL||'https://realtime-aurascope.onrender.com',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: 'Payment failed to initialize' });
  }
});

app.get('/success', async (req, res) => {
  try {
    const session  = await stripe.checkout.sessions.retrieve(req.query.session_id);
    const { email, dob, sign } = session.metadata || {};
    const stones   = getBirthstones(dob);
    const traits   = ZODIAC[sign]?.traits || [];
    const hour     = new Date().getHours();
    const slice    = getTimeSlice(hour);
    const signCap  = sign ? sign.charAt(0).toUpperCase()+sign.slice(1) : '';

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `You are the Aurascope Engine — a living aura reading system. Generate a full personal aura reading.

USER:
- Auraspanse email: ${email}
- Date of Birth: ${dob}
- Zodiac Sign: ${signCap} ${ZODIAC[sign]?.symbol||''}
- Current Time Slice: ${slice.label} (hour ${hour}, energy: ${slice.energy})

THEIR 3 CORE ZODIAC TRAITS (each has + and – expression):
${traits.map((t,i)=>`${i+1}. ${t.name}: + ${t.pos} / – ${t.neg}`).join('\n')}

THEIR BIRTH MONTH STONES:
${stones.map(s=>`${s.name}: + ${s.pos.join(', ')} / – ${s.neg.join(', ')}`).join('\n')}

READING STRUCTURE:
**Primary Aura Color** — Name a specific color tied to their ${signCap} zodiac core. What does it mean right now?
**Secondary Aura Color** — From their birthstone(s). What is the emotional resonance?
**Hidden Layer Color** — From the ${slice.label} time spectrum. Make this a surprise.
**The Blend** — How these 3 layers create their unique aura right now.
**Your + Energy** — The positive trait strongest in them today and how to channel it.
**Your – Awareness** — What shadow needs gentle attention, without judgment.
**24-Hour Forecast** — How their aura shifts as the day moves through the time spectrum.
**Your Action** — One specific thing to do today to align with this aura state.

Speak directly to them. Warm, mystical, grounded. No generic astrology. This is a living, time-sensitive reading unique to their Auraspanse.`
        }]
      })
    });
    const ai = await aiRes.json();
    const reading = ai?.content?.[0]?.text || 'We had trouble generating your reading — please contact us.';
    res.send(successPage(reading, email, signCap, sign, dob, hour, slice));
  } catch (err) {
    console.error('Success error:', err.message);
    res.send(errorPage());
  }
});

app.get('/', (req, res) => res.send(homePage()));

// ============================================================
// HTML
// ============================================================
function homePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Real-Time Digital Aurascope</title>
<meta name="description" content="Your evolving aura generated from zodiac traits, birthstone resonance, and the 24-hour color spectrum."/>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000;color:#fff;font-family:'Segoe UI',system-ui,sans-serif;overflow-x:hidden;min-height:100vh}
canvas{position:fixed;inset:0;z-index:0;pointer-events:none}
.page{position:relative;z-index:1;display:none;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:48px 24px;text-align:center}
.page.active{display:flex}
.eyebrow{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#555;margin-bottom:16px}
h1{font-size:clamp(26px,5vw,48px);font-weight:300;letter-spacing:.04em;margin-bottom:12px}
h1 span{color:#c084fc}
.tagline{color:#666;font-size:13px;max-width:380px;line-height:1.8;margin-bottom:40px}
form{width:100%;max-width:340px;display:flex;flex-direction:column;gap:14px}
.field label{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#444;display:block;margin-bottom:6px}
input{width:100%;padding:13px 16px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:10px;color:#fff;font-size:14px;outline:none;transition:border .2s}
input:focus{border-color:rgba(124,58,237,.6)}
.btn{width:100%;padding:14px;background:#7c3aed;border:none;border-radius:10px;color:#fff;font-size:13px;font-weight:500;cursor:pointer;letter-spacing:.05em;transition:background .2s;margin-top:4px}
.btn:hover{background:#6d28d9}
.btn:disabled{opacity:.45;cursor:not-allowed}
.btn-ghost{padding:12px 32px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:transparent;color:#888;font-size:13px;cursor:pointer;transition:all .2s;letter-spacing:.04em}
.btn-ghost:hover{border-color:#7c3aed;color:#c084fc}
.orb{width:96px;height:96px;border-radius:50%;margin:0 auto 20px;filter:blur(3px);opacity:.9}
.counter{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#444;margin-bottom:28px}
.orb-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#555;margin-bottom:6px}
.orb-name{font-size:20px;font-weight:400;color:#fff;margin-bottom:10px}
.orb-desc{font-size:13px;color:#888;line-height:1.8;max-width:320px;margin:0 auto 20px}
.pills{margin-bottom:28px}
.pill{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;margin:3px}
.pill-pos{background:rgba(52,211,153,.1);color:#34d399}
.pill-neg{background:rgba(248,113,113,.09);color:#f87171}
.trio{display:flex;justify-content:center;margin-bottom:24px}
.trio-orb{width:52px;height:52px;border-radius:50%;margin:0 -8px;filter:blur(4px);opacity:.8}
.blur-text{font-size:13px;color:#888;line-height:1.8;filter:blur(5px);pointer-events:none;max-width:340px;margin:0 auto 28px}
.cta-box{border:1px solid rgba(124,58,237,.2);border-radius:14px;padding:28px 24px;background:rgba(124,58,237,.04);width:100%;max-width:360px}
.cta-box h3{font-size:15px;font-weight:400;color:#c084fc;margin-bottom:8px}
.price-strike{font-size:12px;color:#444;text-decoration:line-through;margin-bottom:4px}
.price-main{font-size:22px;color:#f0abfc;font-weight:600;margin-bottom:6px}
.price-note{font-size:11px;color:#444;margin-bottom:20px;line-height:1.6}
.secure{font-size:10px;color:#333;margin-top:10px;letter-spacing:.06em}
@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.fade{animation:fadeUp .5s ease both}
@keyframes pulse{0%,100%{opacity:.75;transform:scale(1)}50%{opacity:1;transform:scale(1.07)}}
.pulsing{animation:pulse 3s ease-in-out infinite}
</style>
</head>
<body>
<canvas id="bg"></canvas>

<div class="page active" id="pg-landing">
  <p class="eyebrow">Real-Time Digital</p>
  <h1>Aura<span>scope</span></h1>
  <p class="tagline">Your evolving aura, generated from your zodiac signature, birthstone resonance, and the living 24-hour color spectrum.</p>
  <form id="mainForm">
    <div class="field"><label>Email — your Auraspanse address</label><input type="email" id="email" placeholder="you@email.com" required/></div>
    <div class="field"><label>Date of birth</label><input type="date" id="dob" required/></div>
    <button class="btn" id="startBtn" type="submit">Read My Aura →</button>
  </form>
</div>

<div class="page" id="pg-reveal">
  <p class="counter" id="counter">Color 1 of 3</p>
  <div class="orb pulsing" id="rOrb"></div>
  <p class="orb-label" id="rLabel"></p>
  <p class="orb-name" id="rName"></p>
  <p class="orb-desc" id="rDesc"></p>
  <div class="pills" id="rPills"></div>
  <button class="btn-ghost fade" id="rBtn">Reveal Color 2 →</button>
</div>

<div class="page" id="pg-peek">
  <p class="eyebrow fade">Your aura signature</p>
  <div class="trio fade" id="trio"></div>
  <p class="blur-text" id="peekText">
    Your aura is a living weave of zodiac fire, birthstone memory, and the current moment in the 24-hour spectrum.
    The full reading reveals all 63 trait-blends unique to your Auraspanse, your personal forecast, and what your aura is asking of you today.
  </p>
  <div class="cta-box fade">
    <h3>Unlock your full aura reading</h3>
    <p class="price-strike">Usually $12</p>
    <p class="price-main">$1 intro offer</p>
    <p class="price-note">Full reading sent to your Auraspanse email<br>+ added to your aura record</p>
    <button class="btn" id="payBtn">Get Full Reading for $1 →</button>
    <p class="secure">🔒 Secure checkout via Stripe</p>
  </div>
</div>

<script>
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let W,H,mx,my,orbs=[];
let bgColors=['#7c3aed','#4f46e5','#9333ea'];
let t0=Date.now();
function resize(){W=canvas.width=innerWidth;H=canvas.height=innerHeight;mx=W/2;my=H/2}
resize(); addEventListener('resize',resize);
addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
function mkOrbs(){orbs=bgColors.map((c,i)=>({x:W/2+(i-1)*130,y:H/2,vx:(Math.random()-.5)*.3,vy:(Math.random()-.5)*.3,r:170+i*50,color:c,ph:i*2.2}))}
mkOrbs();
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.globalCompositeOperation='screen';
  const t=(Date.now()-t0)*.0006;
  orbs.forEach(o=>{
    o.x+=(mx-o.x)*.014+Math.sin(t+o.ph)*.6;
    o.y+=(my-o.y)*.014+Math.cos(t+o.ph*1.3)*.5;
    const g=ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
    g.addColorStop(0,o.color+'4A'); g.addColorStop(1,'transparent');
    ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2);
    ctx.fillStyle=g; ctx.fill();
  });
  ctx.globalCompositeOperation='source-over';
  requestAnimationFrame(draw);
}
draw();

let state={email:'',dob:'',preview:null};

document.getElementById('mainForm').onsubmit=async e=>{
  e.preventDefault();
  const btn=document.getElementById('startBtn');
  state.email=document.getElementById('email').value;
  state.dob=document.getElementById('dob').value;
  btn.textContent='Reading...'; btn.disabled=true;
  try{
    const r=await fetch('/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dob:state.dob})});
    state.preview=await r.json();
    bgColors=state.preview.colors.map(c=>c.color);
    mkOrbs();
    showReveal(0);
  }catch(err){
    btn.textContent='Read My Aura →'; btn.disabled=false;
    alert('Could not read aura — please try again.');
  }
};

function show(id){['pg-landing','pg-reveal','pg-peek'].forEach(p=>{
  const el=document.getElementById(p);
  el.classList.toggle('active',p===id);
})}

function showReveal(idx){
  show('pg-reveal');
  const c=state.preview.colors[idx];
  document.getElementById('counter').textContent='Color '+(idx+1)+' of 3';
  document.getElementById('rOrb').style.background=c.color;
  document.getElementById('rLabel').textContent=c.label.toUpperCase();
  document.getElementById('rName').textContent=c.name||'';
  document.getElementById('rDesc').textContent=c.desc||'';
  document.getElementById('rPills').innerHTML=
    (c.pos?'<span class="pill pill-pos">+ '+c.pos+'</span>':'')+
    (c.neg?'<span class="pill pill-neg">– '+c.neg+'</span>':'');
  const btn=document.getElementById('rBtn');
  if(idx<2){btn.textContent='Reveal Color '+(idx+2)+' →';btn.onclick=()=>showReveal(idx+1);}
  else{btn.textContent='See Your Aura Blend →';btn.onclick=showPeek;}
}

function showPeek(){
  show('pg-peek');
  document.getElementById('trio').innerHTML=state.preview.colors.map(c=>'<div class="trio-orb pulsing" style="background:'+c.color+'"></div>').join('');
  document.getElementById('payBtn').onclick=startPayment;
}

async function startPayment(){
  const btn=document.getElementById('payBtn');
  btn.textContent='Opening Stripe...'; btn.disabled=true;
  try{
    const r=await fetch('/create-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:state.email,dob:state.dob})});
    const d=await r.json();
    if(d.url)window.location.href=d.url;
    else throw new Error();
  }catch{
    btn.textContent='Get Full Reading for $1 →'; btn.disabled=false;
    alert('Payment error — please try again.');
  }
}
</script>
</body>
</html>`;
}

function successPage(reading, email, signCap, sign, dob, hour, slice) {
  const color = ZODIAC_COLORS[sign]||'#7c3aed';
  const fmt   = reading.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Your Aurascope Reading ✦</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#000;color:#e2d9f3;font-family:'Segoe UI',system-ui,sans-serif;padding:60px 20px;min-height:100vh}
.wrap{max-width:620px;margin:0 auto}
.orb{width:64px;height:64px;border-radius:50%;background:${color};margin:0 auto 20px;filter:blur(4px);opacity:.8}
.eyebrow{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#555;text-align:center;margin-bottom:10px}
h1{font-size:26px;font-weight:300;text-align:center;color:#c084fc;margin-bottom:6px}
.meta{text-align:center;font-size:11px;color:#444;margin-bottom:36px;letter-spacing:.06em;line-height:1.8}
.card{background:rgba(255,255,255,.025);border:1px solid rgba(124,58,237,.2);border-radius:14px;padding:32px 28px;line-height:2;font-size:14px;color:#bbb}
.card strong{color:#e2d9f3;font-weight:500}
.footer{text-align:center;margin-top:36px;font-size:11px;color:#333;line-height:1.9}
a{color:#7c3aed;text-decoration:none}
a:hover{color:#c084fc}
</style>
</head>
<body>
<div class="wrap">
  <div class="orb"></div>
  <p class="eyebrow">Aurascope — Full Reading</p>
  <h1>✦ Your Aura Reading</h1>
  <p class="meta">${signCap} · ${dob||''}<br>${slice.label} · Hour ${hour} · ${slice.energy}</p>
  <div class="card">${fmt}</div>
  <p class="footer">
    Sent to your Auraspanse: ${email||'your account'}<br>
    Your aura evolves as time moves through the 24-hour spectrum.<br><br>
    <a href="/">← Read again</a>
  </p>
</div>
</body>
</html>`;
}

function errorPage() {
  return `<!DOCTYPE html><html><body style="background:#000;color:#c084fc;text-align:center;padding:60px 20px;font-family:sans-serif">
<h1>Something went wrong ✦</h1><p style="color:#666;margin-top:12px">Your payment was received but we hit an error. Contact us and we'll fix it immediately.</p>
<p style="margin-top:24px"><a href="/" style="color:#7c3aed">← Go back</a></p></body></html>`;
}

// ============================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✦ Aurascope running on port ${PORT}`));
