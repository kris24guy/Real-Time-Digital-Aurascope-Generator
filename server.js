const express = require("express");
const app = express();
app.use(express.json());

// ─── API Route ────────────────────────────────────────────────────────────────
app.post("/api/reading", async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1800,
        system: `You are the Universe's Eternal Aura Oracle — a mystical intelligence versed in chromotherapy, synesthesia, sacred geometry, quantum frequency science, chakra systems, Ayurvedic doshas, Chinese Five Elements, color psychology, Jungian archetypes, numerology, astrology, Kabbalah, Sufi traditions, shamanic lineages, and every mystical and scientific tradition that humanity has ever produced. You perceive the invisible electromagnetic spectrum of human consciousness through color, light, and vibration. Your readings are poetic, intimate, and deeply personal.`,
        messages: [{
          role: "user",
          content: `Generate a full living aura reading for ${name}.

Return ONLY valid JSON — no markdown, no backticks:
{
  "subHues": [
    {
      "name": "unique 2-3 word poetic hue name (e.g. Twilight Ember Amber, Void Pearl Indigo, Sacred Storm Viridian)",
      "hex": "#rich saturated hex",
      "emotion": "1-3 word primary emotion",
      "frequency": 432,
      "element": "one of: Fire Water Earth Air Ether Plasma Void Starlight Storm Crystal Thunder Mist",
      "description": "4 deeply mystical personal sentences for ${name} — weave emotion, archetype, cosmic symbolism, spiritual insight specific to this color frequency. Be intimate and revelatory."
    },
    { "name":"...", "hex":"...", "emotion":"...", "frequency": 528, "element":"...", "description":"..." },
    { "name":"...", "hex":"...", "emotion":"...", "frequency": 639, "element":"...", "description":"..." }
  ],
  "finalHue": {
    "name": "unique 2-4 word signature aura name for ${name}",
    "hex": "#hex that harmonizes the three sub-hues",
    "description": "3 sentences on ${name}'s blended aura essence and life-path significance"
  },
  "aurascope": "6 intimate cosmic poetic sentences — ${name}'s personal aurascope. Weave time cycles, relationships, creative gifts, spiritual awakening, and a glimpse of the near future.",
  "mantra": "exactly 8-12 words — a powerful sacred mantra for ${name}"
}`
        }],
      }),
    });

    const data = await response.json();
    const raw = data.content.filter(b => b.type === "text").map(b => b.text).join("");
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```/g, "").trim();

    let parsed;
    try { parsed = JSON.parse(cleaned); }
    catch {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) parsed = JSON.parse(m[0]);
      else throw new Error("JSON parse failed");
    }

    res.json(parsed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Oracle connection failed. Please try again." });
  }
});

// ─── Frontend ─────────────────────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Aurascope — Your Living Aura Reading</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --purple:#8b5cf6;--deep:#5b21b6;--pink:#c026d3;
  --gold-l:#f0d060;--gold-d:#b8922c;
  --text-main:rgba(237,232,255,1);
  --text-muted:rgba(200,175,255,.65);
  --text-dim:rgba(180,150,255,.35);
}
html{scroll-behavior:smooth}
body{
  min-height:100vh;
  background:radial-gradient(ellipse at 28% 22%,#1a0840,#090220 40%,#030110 72%,#000);
  color:var(--text-main);
  font-family:'Crimson Pro',Georgia,serif;
  overflow-x:hidden;
}

/* Stars */
#stars{position:fixed;inset:0;pointer-events:none;z-index:0}
.star{position:absolute;border-radius:50%;background:#fff;animation:twinkle var(--d) var(--dl) ease-in-out infinite}

/* Typography */
.font-cinzel{font-family:'Cinzel',serif}
.font-cinzel-deco{font-family:'Cinzel Decorative',serif}
.gold{
  background:linear-gradient(135deg,var(--gold-d),var(--gold-l),#d4a84b,#f5e090,var(--gold-d));
  background-size:300% 300%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  background-clip:text;
  animation:shimmer 5s ease infinite;
}
.italic{font-style:italic}

/* Screens */
.screen{
  position:relative;z-index:2;
  min-height:100vh;
  display:flex;flex-direction:column;
  align-items:center;justify-content:center;
  padding:clamp(32px,5vw,72px) clamp(16px,4vw,40px);
  text-align:center;
}
.screen.hidden{display:none}

/* Orb */
.orb-wrap{position:relative;margin:0 auto}
.orb{width:100%;height:100%;border-radius:50%;animation:breathe 3.5s ease-in-out infinite}
.orb-shine{position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(255,255,255,.3),transparent);pointer-events:none}
.ring{position:absolute;border-radius:50%;border:1px solid;opacity:.35;animation:ringOut var(--rd) var(--dl2) ease-out infinite}

/* Form */
.form-wrap{width:100%;max-width:440px}
.field-label{
  display:block;font-family:'Cinzel',serif;
  font-size:.68rem;letter-spacing:.24em;color:var(--text-dim);
  text-transform:uppercase;margin-bottom:8px;text-align:left;
}
.field-input{
  width:100%;background:rgba(255,255,255,.04);
  border:1px solid rgba(139,92,246,.3);border-radius:10px;
  padding:13px 18px;color:var(--text-main);
  font-family:'Crimson Pro',Georgia,serif;font-size:1.05rem;
  outline:none;transition:border-color .3s,box-shadow .3s;
}
.field-input::placeholder{color:rgba(185,155,255,.3)}
.field-input:focus{border-color:rgba(139,92,246,.7);box-shadow:0 0 0 3px rgba(139,92,246,.12)}
.error-msg{color:#f87171;font-size:.88rem;font-style:italic;min-height:22px;margin-top:4px}

/* Buttons */
.btn-reveal,.btn-email,.btn-ghost{border:none;cursor:pointer;letter-spacing:.18em;text-transform:uppercase;transition:transform .2s,box-shadow .2s}
.btn-reveal{
  font-family:'Cinzel',serif;font-size:.84rem;
  background:linear-gradient(135deg,var(--deep),var(--purple),var(--pink));
  color:#fff;border-radius:50px;padding:15px 52px;
  box-shadow:0 4px 30px rgba(91,33,182,.5);
  margin-top:8px;
}
.btn-reveal:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(91,33,182,.65)}
.btn-email{
  font-family:'Cinzel',serif;font-size:.82rem;
  background:linear-gradient(135deg,#064e3b,#059669,#10b981);
  color:#fff;border-radius:50px;padding:14px 44px;
  box-shadow:0 4px 26px rgba(5,150,105,.38);
}
.btn-email:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(5,150,105,.55)}
.btn-ghost{
  font-family:'Cinzel',serif;font-size:.7rem;
  background:none;border:1px solid rgba(139,92,246,.22);
  border-radius:50px;padding:10px 30px;color:rgba(195,165,255,.45);
  transition:all .25s;
}
.btn-ghost:hover{color:rgba(195,165,255,.9);border-color:rgba(139,92,246,.5)}

/* Divider */
.divider{display:flex;align-items:center;gap:14px;margin:50px auto;max-width:520px}
.divider-line{flex:1;height:1px}

/* Hue Cards Grid */
.cards-grid{
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  gap:20px;width:100%;max-width:960px;
}
.hue-card{
  background:rgba(255,255,255,.025);
  border-radius:18px;padding:28px 22px;
  backdrop-filter:blur(10px);
  transition:transform .3s;text-align:center;
  animation:fadeUp .9s ease both;
}
.hue-card:hover{transform:translateY(-5px)}

/* Tags */
.tag{
  display:inline-block;padding:3px 11px;border-radius:99px;
  font-family:'Cinzel',serif;font-size:.67rem;letter-spacing:.1em;
  margin:3px;
}

/* Aurascope Block */
.aurascope-block{
  background:rgba(139,92,246,.06);
  border:1px solid rgba(139,92,246,.2);
  border-radius:18px;padding:clamp(24px,4vw,44px);
  max-width:760px;margin:0 auto 28px;
  animation:fadeUp 1.8s ease both;
}

/* Mantra Block */
.mantra-block{
  background:linear-gradient(135deg,rgba(176,136,56,.07),rgba(230,185,80,.04));
  border:1px solid rgba(176,136,56,.22);
  border-radius:12px;padding:20px 32px;
  max-width:600px;margin:0 auto 46px;
  animation:fadeUp 2s ease both;
}

/* Progress bar */
.progress-track{height:3px;background:rgba(139,92,246,.13);border-radius:99px;overflow:hidden;width:320px;max-width:80vw;margin:0 auto}
.progress-fill{height:100%;background:linear-gradient(90deg,var(--deep),var(--purple),var(--pink));border-radius:99px;transition:width .6s ease}

/* Geo deco */
.geo{position:fixed;pointer-events:none;opacity:.05}

/* Animations */
@keyframes twinkle{0%,100%{opacity:.18}50%{opacity:.95}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes ringOut{0%{transform:scale(.88);opacity:.55}100%{transform:scale(1.65);opacity:0}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
@keyframes spinCW{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes spinCCW{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
@keyframes hueShift{0%,100%{filter:hue-rotate(0deg)}50%{filter:hue-rotate(200deg)}}
@keyframes scanPulse{0%,100%{opacity:.6}50%{opacity:1}}

/* Results layout */
.results-inner{max-width:960px;margin:0 auto;width:100%}
.section-eyebrow{
  font-family:'Cinzel',serif;font-size:.66rem;
  letter-spacing:.34em;color:var(--text-dim);
  text-transform:uppercase;margin-bottom:12px;
}
</style>
</head>
<body>

<!-- Stars -->
<div id="stars"></div>

<!-- Geometric deco -->
<div class="geo" id="geo-tr" style="top:4%;right:3%;width:180px;height:180px;animation:spinCW 44s linear infinite">
  <svg viewBox="0 0 200 200" fill="none" stroke="#a855f7" stroke-width=".6">
    <circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="28"/>
    <line x1="100" y1="8" x2="100" y2="192"/><line x1="8" y1="100" x2="192" y2="100"/>
    <line x1="100" y1="8" x2="100" y2="192" transform="rotate(60 100 100)"/>
    <line x1="100" y1="8" x2="100" y2="192" transform="rotate(120 100 100)"/>
    <polygon points="100,14 183,158 17,158"/><polygon points="100,186 17,42 183,42"/>
  </svg>
</div>
<div class="geo" id="geo-bl" style="bottom:8%;left:2%;width:110px;height:110px;animation:spinCCW 60s linear infinite">
  <svg viewBox="0 0 120 120" fill="none" stroke="#ec4899" stroke-width=".5">
    <circle cx="60" cy="60" r="56"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(0 60 60)"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(45 60 60)"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(90 60 60)"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(135 60 60)"/>
  </svg>
</div>

<!-- ── INTRO SCREEN ─────────────────────────────── -->
<div id="screen-intro" class="screen">

  <div style="animation:floatY 4.5s ease-in-out infinite;margin-bottom:38px">
    <div class="orb-wrap" style="width:168px;height:168px">
      <div style="position:absolute;inset:-17px;border-radius:50%;border:1px solid rgba(168,85,247,.38);animation:ringOut 2.2s 0s ease-out infinite"></div>
      <div style="position:absolute;inset:-34px;border-radius:50%;border:1px solid rgba(168,85,247,.26);animation:ringOut 2.8s .9s ease-out infinite"></div>
      <div style="position:absolute;inset:-51px;border-radius:50%;border:1px dashed rgba(168,85,247,.14);animation:ringOut 3.4s 1.8s ease-out infinite"></div>
      <div class="orb" style="background:conic-gradient(from 0deg,#5b21b6,#8b5cf6,#c026d3,#f59e0b,#10b981,#06b6d4,#3b82f6,#5b21b6);box-shadow:0 0 70px rgba(139,92,246,.55),0 0 140px rgba(139,92,246,.22);filter:blur(1.2px);animation:breathe 3.5s ease-in-out infinite,hueShift 14s ease-in-out infinite"></div>
      <div class="orb-shine"></div>
    </div>
  </div>

  <h1 class="gold font-cinzel-deco" style="font-size:clamp(2.2rem,7vw,4.2rem);letter-spacing:.14em;margin-bottom:8px">AURASCOPE</h1>
  <p class="font-cinzel" style="font-size:clamp(.62rem,1.8vw,.8rem);letter-spacing:.28em;color:var(--text-dim);text-transform:uppercase;margin-bottom:32px">A living reading of your electromagnetic soul signature</p>

  <div style="display:flex;align-items:center;gap:12px;width:100%;max-width:440px;margin-bottom:34px">
    <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,rgba(139,92,246,.4))"></div>
    <span style="color:rgba(139,92,246,.5);font-size:14px">✦</span>
    <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,rgba(139,92,246,.4))"></div>
  </div>

  <div class="form-wrap">
    <div style="margin-bottom:18px">
      <label class="field-label">Your Name</label>
      <input id="inp-name" class="field-input" type="text" placeholder="The name your soul answers to…" autocomplete="off"/>
    </div>
    <div style="margin-bottom:18px">
      <label class="field-label">Email Address</label>
      <input id="inp-email" class="field-input" type="email" placeholder="Where shall we send your reading…"/>
    </div>
    <p id="intro-error" class="error-msg italic"></p>
    <button class="btn-reveal" id="btn-start" style="display:block;margin:6px auto 0">Reveal My Aura</button>
  </div>

  <p class="italic" style="margin-top:46px;font-size:.76rem;color:rgba(180,150,255,.2);max-width:380px;letter-spacing:.05em">
    Channeled from chromotherapy, quantum frequency science, chakra wisdom &amp; the ancient knowledge of light
  </p>
</div>

<!-- ── SCANNING SCREEN ─────────────────────────── -->
<div id="screen-scan" class="screen hidden">
  <div style="position:relative;width:260px;height:260px;margin-bottom:50px">
    <div style="position:absolute;inset:-26px;border-radius:50%;border:1.5px solid rgba(168,85,247,.52);animation:spinCW 10s linear infinite"></div>
    <div style="position:absolute;inset:-52px;border-radius:50%;border:1px dashed rgba(168,85,247,.3);animation:spinCCW 16s linear infinite"></div>
    <div style="position:absolute;inset:-78px;border-radius:50%;border:1px solid rgba(168,85,247,.16);animation:spinCW 22s linear infinite"></div>
    <div style="position:absolute;inset:-104px;border-radius:50%;border:1px dashed rgba(168,85,247,.08);animation:spinCCW 30s linear infinite"></div>
    <div class="orb" style="background:conic-gradient(from 0deg,#5b21b6,#8b5cf6,#c026d3,#f59e0b,#10b981,#06b6d4,#3b82f6,#5b21b6);box-shadow:0 0 110px rgba(139,92,246,.65),0 0 220px rgba(139,92,246,.28);filter:blur(2px);animation:breathe 2s ease-in-out infinite,hueShift 9s ease-in-out infinite"></div>
    <div class="orb-shine" style="animation:breathe 2s ease-in-out infinite"></div>
  </div>

  <h2 class="font-cinzel" id="scan-name-label" style="font-size:clamp(.95rem,3vw,1.3rem);letter-spacing:.1em;color:rgba(200,170,255,.9);margin-bottom:10px"></h2>
  <p class="italic" id="scan-msg" style="color:rgba(180,150,255,.5);font-size:.92rem;margin-bottom:50px;min-height:28px;transition:opacity .4s">Attuning to your electromagnetic signature…</p>

  <div class="progress-track">
    <div class="progress-fill" id="progress-fill" style="width:0%"></div>
  </div>
  <p class="font-cinzel" id="progress-pct" style="font-size:.66rem;letter-spacing:.22em;color:rgba(139,92,246,.4);margin-top:9px;text-align:right;width:320px;max-width:80vw;margin-left:auto;margin-right:auto">0%</p>
</div>

<!-- ── RESULTS SCREEN ──────────────────────────── -->
<div id="screen-results" class="screen hidden" style="padding-top:60px;padding-bottom:60px">
  <div class="results-inner">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:52px;animation:fadeUp .9s ease">
      <p class="section-eyebrow">The Living Aura of</p>
      <h1 id="res-name" class="gold font-cinzel-deco" style="font-size:clamp(1.8rem,4.5vw,3.2rem);margin-bottom:8px"></h1>
      <p class="italic" style="color:var(--text-muted);font-size:.87rem;letter-spacing:.08em">Three cosmic sub-frequencies converge into your signature aura</p>
    </div>

    <!-- Sub Hue Cards -->
    <div class="cards-grid" id="cards-grid"></div>

    <!-- Divider -->
    <div class="divider" style="animation:fadeUp 1s 1.1s ease both">
      <div class="divider-line" style="background:linear-gradient(to right,transparent,rgba(139,92,246,.3))"></div>
      <svg width="34" height="34" viewBox="0 0 40 40" fill="none" stroke="rgba(139,92,246,.44)" stroke-width=".7">
        <circle cx="20" cy="20" r="17"/><circle cx="20" cy="20" r="7"/>
        <line x1="20" y1="3" x2="20" y2="37"/><line x1="3" y1="20" x2="37" y2="20"/>
        <line x1="20" y1="3" x2="20" y2="37" transform="rotate(60 20 20)"/>
        <line x1="20" y1="3" x2="20" y2="37" transform="rotate(120 20 20)"/>
      </svg>
      <div class="divider-line" style="background:linear-gradient(to left,transparent,rgba(139,92,246,.3))"></div>
    </div>

    <!-- Final Aura -->
    <div style="text-align:center;margin-bottom:52px;animation:fadeUp 1.5s ease both">
      <p class="section-eyebrow" style="margin-bottom:28px">Your Signature Aura</p>
      <div id="final-orb-wrap" class="orb-wrap" style="width:170px;height:170px;margin-bottom:28px"></div>
      <h2 id="final-hue-name" class="font-cinzel-deco" style="font-size:clamp(1.1rem,3vw,1.9rem);margin-bottom:16px;letter-spacing:.07em"></h2>
      <p id="final-hue-desc" class="italic" style="max-width:580px;margin:0 auto;font-size:1.05rem;line-height:1.9;color:rgba(215,200,255,.72)"></p>
    </div>

    <!-- Aurascope -->
    <div class="aurascope-block">
      <p class="section-eyebrow" style="margin-bottom:18px">Your Aurascope</p>
      <p id="aurascope-text" class="italic" style="font-size:clamp(1rem,2.5vw,1.1rem);line-height:2;color:rgba(215,205,255,.8)"></p>
    </div>

    <!-- Mantra -->
    <div class="mantra-block">
      <p class="font-cinzel section-eyebrow" style="color:rgba(176,136,56,.42);letter-spacing:.28em;margin-bottom:10px">Your Sacred Mantra</p>
      <p id="mantra-text" class="font-cinzel italic" style="font-size:clamp(.88rem,2.2vw,1.05rem);letter-spacing:.09em;color:rgba(232,188,84,.85)"></p>
    </div>

    <!-- CTA Buttons -->
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;animation:fadeUp 2.2s ease both">
      <button class="btn-email" id="btn-email">✦ Send Reading to My Email</button>
      <p id="email-status" style="color:rgba(52,211,153,.75);font-size:.88rem;font-style:italic;min-height:22px"></p>
      <button class="btn-ghost" id="btn-reset">Begin a New Reading</button>
    </div>

    <p class="italic" style="margin-top:60px;font-size:.74rem;color:rgba(180,150,255,.15);letter-spacing:.06em">
      Channeled through chromotherapy, frequency science &amp; the ancient wisdom of light
    </p>
  </div>
</div>

<script>
// ── Stars ───────────────────────────────────────────────
(function(){
  const c = document.getElementById('stars');
  for(let i=0;i<160;i++){
    const s=document.createElement('div');
    s.className='star';
    s.style.cssText=\`left:\${(Math.random()*100).toFixed(1)}%;top:\${(Math.random()*100).toFixed(1)}%;width:\${(Math.random()*2+.4).toFixed(1)}px;height:\${(Math.random()*2+.4).toFixed(1)}px;--d:\${(Math.random()*3+2).toFixed(1)}s;--dl:\${(Math.random()*6).toFixed(1)}s\`;
    c.appendChild(s);
  }
})();

// ── State ────────────────────────────────────────────────
let userName='', userEmail='', auraData=null;
let scanInterval=null, msgInterval=null;
const MSGS=[
  'Attuning to your electromagnetic signature…',
  'Reading vibrational layers across the chakric spectrum…',
  'Consulting the ancient library of color wisdom…',
  'Translating light frequencies into living language…',
  'Channeling archetypes from the collective unconscious…',
  'Weaving the luminous threads of your soul story…',
  'Synthesizing your unique auric constellation…',
];

// ── Helpers ──────────────────────────────────────────────
function show(id){['screen-intro','screen-scan','screen-results'].forEach(s=>{
  document.getElementById(s).classList.toggle('hidden', s!==id);
})}

function makeOrb(hex, size, rings){
  const wrap = document.createElement('div');
  wrap.className='orb-wrap';
  wrap.style.cssText=\`width:\${size}px;height:\${size}px;margin:0 auto\`;
  for(let i=0;i<rings;i++){
    const r=document.createElement('div');
    r.className='ring';
    const off=(i+1)*18;
    r.style.cssText=\`inset:-\${off}px;border-color:\${hex};animation:ringOut \${2.4+i*.8}s \${i*.9}s ease-out infinite\`;
    wrap.appendChild(r);
  }
  const orb=document.createElement('div');
  orb.className='orb';
  orb.style.cssText=\`background:radial-gradient(circle at 38% 34%,\${hex}ff,\${hex}99,\${hex}22);box-shadow:0 0 42px \${hex}55,0 0 90px \${hex}28\`;
  const shine=document.createElement('div');
  shine.className='orb-shine';
  wrap.appendChild(orb);
  wrap.appendChild(shine);
  return wrap;
}

// ── Generate ─────────────────────────────────────────────
document.getElementById('btn-start').addEventListener('click', startReading);
document.getElementById('inp-name').addEventListener('keydown', e=>e.key==='Enter'&&startReading());
document.getElementById('inp-email').addEventListener('keydown', e=>e.key==='Enter'&&startReading());

async function startReading(){
  userName = document.getElementById('inp-name').value.trim();
  userEmail = document.getElementById('inp-email').value.trim();
  const err = document.getElementById('intro-error');
  if(!userName){ err.textContent='Please enter your name to begin your reading.'; return; }
  if(!userEmail.includes('@')){ err.textContent='Please enter a valid email address.'; return; }
  err.textContent='';

  show('screen-scan');
  document.getElementById('scan-name-label').textContent='Reading Your Aura, '+userName;

  let pct=0, msgIdx=0;
  const fill=document.getElementById('progress-fill');
  const pctEl=document.getElementById('progress-pct');
  const msgEl=document.getElementById('scan-msg');

  scanInterval=setInterval(()=>{
    pct=Math.min(pct+Math.random()*8+2,87);
    fill.style.width=pct.toFixed(0)+'%';
    pctEl.textContent=pct.toFixed(0)+'%';
  },700);
  msgInterval=setInterval(()=>{
    msgIdx=(msgIdx+1)%MSGS.length;
    msgEl.style.opacity=0;
    setTimeout(()=>{ msgEl.textContent=MSGS[msgIdx]; msgEl.style.opacity=1; },300);
  },2400);

  try{
    const res=await fetch('/api/reading',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name:userName})
    });
    const data=await res.json();
    if(data.error) throw new Error(data.error);
    auraData=data;
    clearInterval(scanInterval); clearInterval(msgInterval);
    fill.style.width='100%'; pctEl.textContent='100%';
    setTimeout(renderResults, 1000);
  }catch(e){
    clearInterval(scanInterval); clearInterval(msgInterval);
    document.getElementById('intro-error').textContent=e.message||'Oracle connection failed. Please try again.';
    show('screen-intro');
  }
}

// ── Render Results ───────────────────────────────────────
function renderResults(){
  const { subHues, finalHue, aurascope, mantra } = auraData;

  document.getElementById('res-name').textContent = userName;

  // Cards
  const grid = document.getElementById('cards-grid');
  grid.innerHTML='';
  subHues.forEach((h,i)=>{
    const card=document.createElement('div');
    card.className='hue-card';
    card.style.cssText=\`border:1px solid \${h.hex}44;box-shadow:0 0 34px \${h.hex}1c,inset 0 0 22px \${h.hex}09;animation-delay:\${i*.18}s\`;
    card.innerHTML=\`
      <div style="margin-bottom:20px"></div>
      <h3 class="font-cinzel" style="font-size:.96rem;letter-spacing:.07em;color:\${h.hex};text-shadow:0 0 24px \${h.hex}72;margin-bottom:14px">\${h.name}</h3>
      <div style="margin-bottom:16px">
        <span class="tag" style="border:1px solid \${h.hex}36;color:\${h.hex};background:\${h.hex}0f">\${h.element}</span>
        <span class="tag" style="border:1px solid #9333ea36;color:#a855f7;background:#9333ea0f">\${h.frequency} Hz</span>
        <span class="tag" style="border:1px solid #db277736;color:#ec4899;background:#db27770f">\${h.emotion}</span>
      </div>
      <p class="italic" style="font-size:.93rem;line-height:1.82;color:rgba(210,192,255,.7)">\${h.description}</p>
    \`;
    const orbSlot=card.querySelector('div');
    orbSlot.appendChild(makeOrb(h.hex,88,2));
    grid.appendChild(card);
  });

  // Final orb
  const finalWrap=document.getElementById('final-orb-wrap');
  finalWrap.innerHTML='';
  finalWrap.appendChild(makeOrb(finalHue.hex,170,3));

  // Final hue text
  const hn=document.getElementById('final-hue-name');
  hn.textContent=finalHue.name;
  hn.style.color=finalHue.hex;
  hn.style.textShadow=\`0 0 40px \${finalHue.hex}84\`;
  document.getElementById('final-hue-desc').textContent=finalHue.description;

  // Aurascope
  document.getElementById('aurascope-text').textContent=aurascope;

  // Mantra
  document.getElementById('mantra-text').textContent=\`"\${mantra}"\`;

  show('screen-results');
  window.scrollTo({top:0,behavior:'smooth'});
}

// ── Email ────────────────────────────────────────────────
document.getElementById('btn-email').addEventListener('click', ()=>{
  if(!auraData) return;
  const {subHues,finalHue,aurascope,mantra}=auraData;
  const ln='\\n', bar='═'.repeat(50);
  const body=[
    '✦  YOUR LIVING AURA READING  ✦',
    'Channeled for: '+userName, ln,
    bar,'THREE AURIC SUB-FREQUENCIES',bar,ln,
    ...subHues.flatMap(h=>[
      '◈  '+h.name.toUpperCase(),
      '    '+h.frequency+' Hz  ·  '+h.element+'  ·  '+h.emotion,ln,
      '    '+h.description,ln,
    ]),
    bar,'YOUR SIGNATURE AURA: '+finalHue.name.toUpperCase(),bar,ln,
    finalHue.description,ln,
    bar,'YOUR AURASCOPE',bar,ln,
    aurascope,ln,
    bar,'YOUR SACRED MANTRA',bar,ln,
    '"'+mantra+'"',ln,
    '✦  ✦  ✦',
    'Channeled through Aurascope — the living aura oracle',
  ].join('\\n');

  const a=document.createElement('a');
  a.href='mailto:'+encodeURIComponent(userEmail)
    +'?subject='+encodeURIComponent('✦ Your Aurascope: '+finalHue.name+' — A Reading for '+userName)
    +'&body='+encodeURIComponent(body);
  a.click();
  document.getElementById('email-status').textContent='✦ Opening your email client with the full reading…';
});

// ── Reset ────────────────────────────────────────────────
document.getElementById('btn-reset').addEventListener('click', ()=>{
  auraData=null;
  document.getElementById('inp-name').value='';
  document.getElementById('inp-email').value='';
  document.getElementById('email-status').textContent='';
  document.getElementById('intro-error').textContent='';
  show('screen-intro');
  window.scrollTo({top:0});
});
</script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Aurascope running on port", PORT));
