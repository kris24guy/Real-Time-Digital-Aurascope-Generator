'use strict';

// ─── Dependencies ────────────────────────────────────────────────────────────
const express  = require('express');
const Stripe   = require('stripe');
const fetch    = require('node-fetch');
const { Resend } = require('resend');

const app    = express();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Env guard ────────────────────────────────────────────────────────────────
const REQUIRED_ENV = ['STRIPE_SECRET_KEY', 'ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'PRICE_ID'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌  Missing env vars:', missing.join(', '));
  process.exit(1);
}

// ─── Aura Data ────────────────────────────────────────────────────────────────
const ZODIAC = {
  aries:       { color:'#FF4136', stone:'Diamond',    traits:['+Courage','+Initiative','-Impulsive'],   label:'The Ram'         },
  taurus:      { color:'#2ECC40', stone:'Emerald',    traits:['+Steadfast','+Sensual','-Stubborn'],      label:'The Bull'        },
  gemini:      { color:'#FFDC00', stone:'Agate',      traits:['+Curious','+Adaptable','-Inconsistent'],  label:'The Twins'       },
  cancer:      { color:'#B0C4DE', stone:'Moonstone',  traits:['+Nurturing','+Intuitive','-Guarded'],     label:'The Crab'        },
  leo:         { color:'#FF851B', stone:'Peridot',    traits:['+Magnetic','+Generous','-Domineering'],   label:'The Lion'        },
  virgo:       { color:'#01FF70', stone:'Sapphire',   traits:['+Precise','+Devoted','-Critical'],        label:'The Maiden'      },
  libra:       { color:'#F012BE', stone:'Opal',       traits:['+Diplomatic','+Charming','-Indecisive'],  label:'The Scales'      },
  scorpio:     { color:'#85144b', stone:'Topaz',      traits:['+Perceptive','+Loyal','-Obsessive'],      label:'The Scorpion'    },
  sagittarius: { color:'#7FDBFF', stone:'Turquoise',  traits:['+Visionary','+Honest','-Restless'],       label:'The Archer'      },
  capricorn:   { color:'#3D9970', stone:'Garnet',     traits:['+Disciplined','+Ambitious','-Rigid'],     label:'The Sea-Goat'    },
  aquarius:    { color:'#39CCCC', stone:'Amethyst',   traits:['+Original','+Humanitarian','-Aloof'],     label:'The Water Bearer'},
  pisces:      { color:'#001f3f', stone:'Aquamarine', traits:['+Empathic','+Imaginative','-Escapist'],   label:'The Fish'        },
};

const BIRTHSTONES_BY_MONTH = [
  'Garnet','Amethyst','Aquamarine','Diamond','Emerald','Moonstone',
  'Ruby','Peridot','Sapphire','Opal','Topaz','Turquoise'
];

function getZodiacSign(dob) {
  const d = new Date(dob);
  const month = d.getMonth() + 1;
  const day   = d.getDate();
  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'aquarius';
  return 'pisces';
}

function getHour(dob) {
  const d = new Date(dob);
  return d.getHours ? d.getHours() : new Date().getHours();
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ─── HTML Pages ───────────────────────────────────────────────────────────────
function homePage() {
  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Auraspanse — Decode Your Energy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Raleway:wght@300;400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
  --bg:#06030f;--surface:#0d0820;--border:#2a1f4a;
  --purple:#c084fc;--pink:#f472b6;--gold:#fbbf24;--text:#e2d9f3;--muted:#7c6fa0
}
body{background:var(--bg);color:var(--text);font-family:'Raleway',sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow-x:hidden}
.stars{position:fixed;inset:0;pointer-events:none;z-index:0}
.star{position:absolute;width:2px;height:2px;background:#fff;border-radius:50%;animation:twinkle 3s infinite alternate}
@keyframes twinkle{0%{opacity:.1}100%{opacity:.9}}
.card{position:relative;z-index:1;background:var(--surface);border:1px solid var(--border);border-radius:24px;padding:48px 40px;width:100%;max-width:480px;box-shadow:0 0 80px rgba(192,132,252,.15)}
h1{font-family:'Cinzel Decorative',serif;font-size:clamp(1.4rem,5vw,2rem);background:linear-gradient(135deg,var(--purple),var(--pink),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;text-align:center;margin-bottom:8px}
.tagline{text-align:center;color:var(--muted);font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:36px}
label{display:block;font-size:.8rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:6px}
input{width:100%;background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:10px;padding:14px 16px;color:var(--text);font-family:'Raleway',sans-serif;font-size:.95rem;outline:none;transition:border-color .2s}
input:focus{border-color:var(--purple)}
.field{margin-bottom:20px}
.price-note{text-align:center;font-size:.78rem;color:var(--muted);margin:12px 0 24px;line-height:1.6}
.price-note strong{color:var(--gold)}
button{width:100%;background:linear-gradient(135deg,#7c3aed,#a855f7,#ec4899);border:none;border-radius:12px;padding:16px;color:#fff;font-family:'Cinzel Decorative',serif;font-size:1rem;letter-spacing:.05em;cursor:pointer;transition:opacity .2s,transform .1s}
button:hover{opacity:.9}
button:active{transform:scale(.98)}
button:disabled{opacity:.5;cursor:not-allowed}
.error{color:#f87171;font-size:.82rem;text-align:center;margin-top:12px;display:none}
.orb{width:60px;height:60px;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.3),transparent 60%),var(--purple);filter:blur(2px);box-shadow:0 0 30px var(--purple);margin:0 auto 28px;animation:pulse-orb 3s ease-in-out infinite}
@keyframes pulse-orb{0%,100%{transform:scale(1);box-shadow:0 0 30px var(--purple)}50%{transform:scale(1.08);box-shadow:0 0 50px var(--purple),0 0 80px rgba(244,114,182,.3)}}
</style>
</head>
<body>
<div class="stars" id="stars"></div>
<div class="card">
  <div class="orb"></div>
  <h1>Auraspanse</h1>
  <p class="tagline">Decode Your Energy</p>
  <div class="field"><label for="email">Your Email</label><input type="email" id="email" placeholder="you@email.com" autocomplete="email" required></div>
  <div class="field"><label for="dob">Date of Birth</label><input type="date" id="dob" required></div>
  <p class="price-note">Full spectrum reading delivered to your inbox<br><strong>$4.99</strong> — one-time</p>
  <button id="payBtn" onclick="pay()">✦ Reveal My Aura ✦</button>
  <p class="error" id="err"></p>
</div>
<script>
// Generate stars
const s=document.getElementById('stars');
for(let i=0;i<120;i++){
  const d=document.createElement('div');
  d.className='star';
  d.style.left=Math.random()*100+'%';
  d.style.top=Math.random()*100+'%';
  d.style.animationDelay=Math.random()*3+'s';
  d.style.animationDuration=(2+Math.random()*3)+'s';
  s.appendChild(d);
}

async function pay(){
  const email=document.getElementById('email').value.trim();
  const dob=document.getElementById('dob').value;
  const err=document.getElementById('err');
  const btn=document.getElementById('payBtn');
  err.style.display='none';
  if(!email||!dob){err.textContent='Please fill in all fields.';err.style.display='block';return;}
  btn.disabled=true;btn.textContent='Opening checkout…';
  try{
    const r=await fetch('/create-payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,dob})});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error||'Payment failed');
    window.location.href=j.url;
  }catch(e){
    err.textContent=e.message;err.style.display='block';
    btn.disabled=false;btn.textContent='✦ Reveal My Aura ✦';
  }
}
</script>
</body></html>`;
}

function loadingPage(signColor, sign) {
  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Checking the Spectrum…</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400&family=Raleway:wght@300;400&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#06030f;color:#e2d9f3;font-family:'Raleway',sans-serif;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:32px;overflow:hidden}
h2{font-family:'Cinzel Decorative',serif;font-size:1.2rem;letter-spacing:.1em;opacity:.9}
.orb{width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.35),transparent 60%),${signColor};filter:blur(3px);box-shadow:0 0 60px ${signColor},0 0 120px ${signColor}40;animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.12)}}
.msg{font-size:.9rem;color:#a78bca;letter-spacing:.05em;min-height:1.4em;text-align:center;transition:opacity .4s}
.bar-track{width:260px;height:4px;background:#1a1030;border-radius:4px;overflow:hidden}
.bar-fill{height:100%;width:0%;background:linear-gradient(90deg,#7c3aed,#ec4899);border-radius:4px;transition:width .15s linear}
</style>
</head>
<body>
<h2>Checking the Spectrum</h2>
<div class="orb"></div>
<p class="msg" id="msg">Tuning your frequency…</p>
<div class="bar-track"><div class="bar-fill" id="bar"></div></div>
<script>
const msgs=['Tuning your frequency…','Reading your zodiac signature…','Locating your birthstone resonance…','Mapping your energy layers…','Synthesising your core traits…','Composing your full reading…'];
let i=0,pct=0;
const bar=document.getElementById('bar');
const msg=document.getElementById('msg');
function tick(){
  pct=Math.min(100,pct+(100/msgs.length/10));
  bar.style.width=pct+'%';
  if(pct>=100*((i+1)/msgs.length)&&i<msgs.length-1){
    i++;msg.style.opacity=0;
    setTimeout(()=>{msg.textContent=msgs[i];msg.style.opacity=1;},400);
  }
  if(pct<100)setTimeout(tick,250);
}
tick();
</script>
</body></html>`;
}

function successPage(reading, email, signCap, sign, dob, emailSent) {
  const data  = ZODIAC[sign];
  const color = data.color;
  const stone = data.stone;
  const label = data.label;
  const traits = data.traits;
  const month  = new Date(dob).getMonth();
  const birthstone = BIRTHSTONES_BY_MONTH[month];

  const readingHtml = reading
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html><html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Your ${signCap} Aura Reading</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Raleway:wght@300;400;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--aura:${color};--bg:#06030f;--surface:#0d0820;--border:#2a1f4a;--text:#e2d9f3;--muted:#7c6fa0}
body{background:var(--bg);color:var(--text);font-family:'Raleway',sans-serif;min-height:100vh;padding:40px 20px}
.container{max-width:680px;margin:0 auto}
.header{text-align:center;margin-bottom:48px}
.orb{width:100px;height:100px;border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.3),transparent 60%),var(--aura);filter:blur(3px);box-shadow:0 0 60px var(--aura),0 0 120px ${color}40;margin:0 auto 24px;animation:pulse 4s ease-in-out infinite}
@keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
h1{font-family:'Cinzel Decorative',serif;font-size:clamp(1.5rem,5vw,2.2rem);background:linear-gradient(135deg,var(--aura),#f472b6,#fbbf24);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.subtitle{color:var(--muted);font-size:.88rem;letter-spacing:.1em;text-transform:uppercase}
.card{background:#0d0820;border:1px solid var(--border);border-radius:20px;padding:32px;margin-bottom:20px}
.card h2{font-family:'Cinzel Decorative',serif;font-size:1rem;color:var(--aura);letter-spacing:.08em;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border)}
.traits{display:flex;flex-wrap:wrap;gap:10px}
.trait{padding:8px 16px;border-radius:20px;font-size:.82rem;letter-spacing:.05em;border:1px solid}
.trait.pos{border-color:${color}60;background:${color}15;color:#e2d9f3}
.trait.neg{border-color:#f4727260;background:#f4727215;color:#fca5a5}
.stones{display:flex;gap:12px;flex-wrap:wrap}
.stone-chip{padding:10px 18px;border-radius:12px;font-size:.82rem;background:rgba(255,255,255,.04);border:1px solid var(--border);display:flex;align-items:center;gap:8px}
.stone-dot{width:10px;height:10px;border-radius:50%;background:var(--aura);box-shadow:0 0 8px var(--aura)}
.reading{line-height:2;font-size:.95rem;color:#d1c8e8;font-weight:300}
.reading strong{color:#fff;font-weight:600}
.email-note{text-align:center;margin-top:32px;padding:20px;background:rgba(192,132,252,.06);border:1px solid rgba(192,132,252,.2);border-radius:14px;font-size:.82rem;color:var(--muted)}
.email-note strong{color:#c084fc}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="orb"></div>
    <h1>${signCap} Aura Reading</h1>
    <p class="subtitle">${label} &nbsp;·&nbsp; ${stone}</p>
  </div>

  <div class="card">
    <h2>✦ Your Core Traits</h2>
    <div class="traits">
      ${traits.map(t => `<span class="trait ${t[0]==='+' ? 'pos' : 'neg'}">${t}</span>`).join('')}
    </div>
  </div>

  <div class="card">
    <h2>✦ Your Stones</h2>
    <div class="stones">
      <div class="stone-chip"><div class="stone-dot"></div>${stone} (Birth Sign)</div>
      <div class="stone-chip"><div class="stone-dot" style="background:#c084fc;box-shadow:0 0 8px #c084fc"></div>${birthstone} (Birth Month)</div>
    </div>
  </div>

  <div class="card">
    <h2>✦ Full Spectrum Reading</h2>
    <div class="reading">${readingHtml}</div>
  </div>

  ${emailSent ? `<div class="email-note">A copy of this reading was sent to <strong>${email}</strong></div>` : ''}
</div>
</body></html>`;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Home
app.get('/', (req, res) => res.send(homePage()));

// Create Stripe Checkout Session
app.post('/create-payment', async (req, res) => {
  const { email, dob } = req.body;

  if (!email || !dob) {
    return res.status(400).json({ error: 'Email and date of birth are required.' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Payment is not configured on this server.' });
  }
  if (!process.env.PRICE_ID) {
    return res.status(500).json({ error: 'PRICE_ID is not configured on this server.' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [{ price: process.env.PRICE_ID, quantity: 1 }],
      metadata: { email, dob },
      success_url: `${process.env.BASE_URL || ''}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.BASE_URL || ''}/`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Loading screen (shown right after redirect back from Stripe, before AI runs)
app.get('/loading', (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.redirect('/');
  const sign = 'aries'; // default color; full data loads on /success
  res.send(loadingPage(ZODIAC[sign].color, sign));
});

// Success — verify payment, run AI, send email, render reading
app.get('/success', async (req, res) => {
  const { session_id } = req.query;
  if (!session_id) return res.redirect('/');

  try {
    // Verify payment
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== 'paid') {
      return res.status(402).send('<h2>Payment not completed.</h2>');
    }

    const { email, dob } = session.metadata;
    const sign     = getZodiacSign(dob);
    const signCap  = cap(sign);
    const signData = ZODIAC[sign];
    const hour     = getHour(dob);
    const month    = new Date(dob).getMonth();
    const birthstone = BIRTHSTONES_BY_MONTH[month];

    // Show loading page immediately, then redirect to reading
    // (For simplicity, we generate reading synchronously — Render handles it fine)

    // Generate AI reading
    let reading = '';
    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-opus-4-5',
          max_tokens: 900,
          messages: [{
            role: 'user',
            content: `You are Auraspanse, a mystical aura reader. Generate a full spectrum aura reading for a ${signCap} (${signData.label}) born in month ${month + 1} at hour ${hour}.

Their aura color is ${signData.color}, birth stone is ${signData.stone}, month stone is ${birthstone}.
Core traits: ${signData.traits.join(', ')}.

Write a personal, vivid, 4–6 paragraph reading. Cover:
1. Their dominant aura frequency and what it reveals right now
2. How their ${signData.traits[0]} and ${signData.traits[1]} energies are expressing this season
3. The shadow work around their ${signData.traits[2]} tendency
4. What their ${birthstone} and ${signData.stone} stones are amplifying together
5. A closing guidance message for the next 30 days

Use **bold** for key phrases. Speak directly to them as "you". Be specific, not generic.`
          }],
        }),
      });
      const aiJson = await aiRes.json();
      reading = aiJson?.content?.[0]?.text || '';
    } catch (aiErr) {
      console.error('AI error:', aiErr.message);
      reading = `Your ${signCap} aura pulses with ${signData.color} frequency — a signature of **${signData.traits[0].slice(1)}** and **${signData.traits[1].slice(1)}**. This reading could not be fully generated at this time. Please contact support for a full reading.`;
    }

    // Send email
    let emailSent = false;
    if (email && process.env.RESEND_API_KEY) {
      try {
        const emailHtml = `
<div style="background:#06030f;color:#e2d9f3;padding:40px 24px;font-family:sans-serif;max-width:600px;margin:0 auto">
  <h1 style="font-size:1.4rem;color:${signData.color};margin-bottom:4px">Your ${signCap} Aura Reading</h1>
  <p style="color:#7c6fa0;font-size:.8rem;margin-bottom:32px">${signData.label} · ${signData.stone}</p>
  <div style="background:#0d0820;border:1px solid #2a1f4a;border-radius:16px;padding:28px;margin-bottom:20px">
    <h2 style="color:#c084fc;font-size:.9rem;letter-spacing:.08em;margin-bottom:16px">CORE TRAITS</h2>
    <p style="line-height:2;font-size:.9rem">${signData.traits.map(t => `<span style="background:${t[0]==='+'?signData.color+'25':'#f4727225'};padding:4px 12px;border-radius:20px;margin-right:8px">${t}</span>`).join('')}</p>
  </div>
  <div style="background:#0d0820;border:1px solid #2a1f4a;border-radius:16px;padding:28px">
    <h2 style="color:#c084fc;font-size:.9rem;letter-spacing:.08em;margin-bottom:20px">FULL SPECTRUM READING</h2>
    <div style="line-height:2;font-size:.9rem;color:#d1c8e8">
      ${reading.replace(/\*\*(.*?)\*\*/g,'<strong style="color:#fff">$1</strong>').replace(/\n/g,'<br>')}
    </div>
  </div>
  <p style="text-align:center;margin-top:28px;font-size:.75rem;color:#3d3050">Auraspanse · Your personal energy decoded</p>
</div>`;

        await resend.emails.send({
          from:    process.env.FROM_EMAIL || 'Auraspanse <reading@auraspanse.com>',
          to:      email,
          subject: `✦ Your ${signCap} Aura Reading`,
          html:    emailHtml,
        });
        emailSent = true;
      } catch (emailErr) {
        console.error('Email error:', emailErr.message);
        // Don't fail the page — just note it wasn't sent
      }
    }

    res.send(successPage(reading, email, signCap, sign, dob, emailSent));

  } catch (err) {
    console.error('Success route error:', err.message);
    res.status(500).send(`<h2 style="color:#f87171;font-family:sans-serif;padding:40px">Something went wrong: ${err.message}</h2>`);
  }
});

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✦ Auraspanse running on port ${PORT}`));
