'use strict';

/*
╔════════════════════════════════════════════════════════════╗
║                    AURASPANSE SERVER                      ║
║         Production Upgrade / Stripe + Claude             ║
╚════════════════════════════════════════════════════════════╝

NEW FEATURES:
✓ Rate limiting
✓ Stripe automatic payment methods
✓ Stripe webhook fulfillment
✓ Persistent reading storage
✓ Rare aura system
✓ Daily temporal drift
✓ Expanded coordinate system
✓ Better AI prompting
✓ Safer architecture
✓ Cached fulfillment flow
✓ Reading retrieval
✓ Better health checks

ENV REQUIRED:
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
ANTHROPIC_API_KEY=
RESEND_API_KEY=
PRICE_ID=
BASE_URL=
FROM_EMAIL=
*/

const express = require('express');
const Stripe = require('stripe');
const fetch = require('node-fetch');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Resend } = require('resend');

const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

const resend = new Resend(process.env.RESEND_API_KEY);

const REQUIRED = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'PRICE_ID',
];

const missing = REQUIRED.filter(k => !process.env[k]);

if (missing.length) {
  console.error('❌ Missing env:', missing.join(', '));
  process.exit(1);
}

/* ──────────────────────────────────────────────────────────
   BODY PARSING
────────────────────────────────────────────────────────── */

app.use('/stripe-webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

/* ──────────────────────────────────────────────────────────
   RATE LIMITING
────────────────────────────────────────────────────────── */

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts. Please wait.' },
});

app.use('/create-payment', paymentLimiter);

/* ──────────────────────────────────────────────────────────
   STORAGE
────────────────────────────────────────────────────────── */

const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const READINGS_DB = path.join(DATA_DIR, 'readings.json');

if (!fs.existsSync(READINGS_DB)) {
  fs.writeFileSync(READINGS_DB, JSON.stringify([]));
}

function loadReadings() {
  return JSON.parse(fs.readFileSync(READINGS_DB, 'utf8'));
}

function saveReading(data) {
  const db = loadReadings();
  db.push(data);
  fs.writeFileSync(READINGS_DB, JSON.stringify(db, null, 2));
}

function findReadingBySession(id) {
  return loadReadings().find(r => r.sessionId === id);
}

/* ──────────────────────────────────────────────────────────
   UTILITIES
────────────────────────────────────────────────────────── */

function h2r(h) {
  return [
    parseInt(h.slice(1,3),16),
    parseInt(h.slice(3,5),16),
    parseInt(h.slice(5,7),16),
  ];
}

function r2h(rgb) {
  return '#'+rgb.map(v =>
    Math.round(v).toString(16).padStart(2,'0')
  ).join('');
}

function blend(a,b,t=.5){
  const [r1,g1,b1]=h2r(a);
  const [r2,g2,b2]=h2r(b);

  return r2h([
    r1+(r2-r1)*t,
    g1+(g2-g1)*t,
    b1+(b2-b1)*t,
  ]);
}

function hash(str){
  return crypto
    .createHash('sha256')
    .update(str)
    .digest('hex');
}

/* ──────────────────────────────────────────────────────────
   CORE SYSTEMS
────────────────────────────────────────────────────────── */

const RARITIES = [
  { name:'Common', chance:.78 },
  { name:'Rare', chance:.17 },
  { name:'Mythic', chance:.04 },
  { name:'Singular', chance:.01 },
];

function rollRarity(seed){
  const n = parseInt(hash(seed).slice(0,8),16)/0xffffffff;

  let cumulative = 0;

  for(const r of RARITIES){
    cumulative += r.chance;
    if(n <= cumulative) return r.name;
  }

  return 'Common';
}

const SPECIAL_TITLES = {
  Rare:[
    'Ghost Current',
    'Veil Bloom',
    'Silver Hollow',
  ],

  Mythic:[
    'Solar Rift',
    'Null Bloom',
    'Mirror Frequency',
  ],

  Singular:[
    'The Quiet Divide',
    'Blackwater Crown',
    'Veilborne',
  ],
};

function pickRareTitle(rarity, seed){
  const arr = SPECIAL_TITLES[rarity];

  if(!arr) return null;

  const idx = parseInt(hash(seed).slice(0,4),16)%arr.length;

  return arr[idx];
}

/* ──────────────────────────────────────────────────────────
   COLOR LIBRARY
────────────────────────────────────────────────────────── */

const AURA_LIBRARY = [
  {
    id:'null-rift',
    name:'Null Rift',
    hex:'#35263f',
    emotion:'detached transformation',
    polarity:'shadow',
  },

  {
    id:'drift-bloom',
    name:'Drift Bloom',
    hex:'#7ab8c9',
    emotion:'emotional expansion',
    polarity:'light',
  },

  {
    id:'ember-veil',
    name:'Ember Veil',
    hex:'#d46b4a',
    emotion:'warm concealment',
    polarity:'balanced',
  },

  {
    id:'ghost-current',
    name:'Ghost Current',
    hex:'#7a89d0',
    emotion:'silent movement',
    polarity:'rare',
  },
];

function nearestAura(hex){

  let winner = null;
  let best = Infinity;

  const [r,g,b] = h2r(hex);

  for(const aura of AURA_LIBRARY){

    const [ar,ag,ab] = h2r(aura.hex);

    const dist =
      Math.abs(r-ar)+
      Math.abs(g-ag)+
      Math.abs(b-ab);

    if(dist < best){
      best = dist;
      winner = aura;
    }
  }

  return winner;
}

/* ──────────────────────────────────────────────────────────
   TEMPORAL DRIFT
────────────────────────────────────────────────────────── */

function temporalDrift(){

  return (
    Math.sin(Date.now()/86400000)*0.08
  );
}

/* ──────────────────────────────────────────────────────────
   HUE ENGINE
────────────────────────────────────────────────────────── */

function computeHues(payload){

  const {
    dob,
    q1,
    q2,
    q3,
  } = payload;

  const d = new Date(dob);

  const month = d.getMonth();

  const base = [
    '#FF5C48',
    '#4CAF7D',
    '#FFD966',
    '#8FBBE0',
    '#FF8C30',
    '#6BCF6B',
    '#F06DC0',
    '#8B2252',
    '#60C8F0',
    '#4E9E7A',
    '#50D0CC',
    '#7870D0',
  ][month];

  const drift = temporalDrift();

  const hue1 = blend(base,'#ffffff',0.18);

  const hue2 = blend(base,'#000000',0.32);

  const hue3 = blend(
    hue1,
    hue2,
    .5 + drift
  );

  const rarity = rollRarity(
    dob+q1+q2+q3
  );

  const rareTitle = pickRareTitle(
    rarity,
    dob
  );

  const nearest = nearestAura(hue3);

  const finalName =
    rareTitle ||
    nearest.name;

  return {
    hue1,
    hue2,
    hue3,
    rarity,
    aura:nearest,
    finalName,
  };
}

/* ──────────────────────────────────────────────────────────
   CLAUDE READING
────────────────────────────────────────────────────────── */

async function generateReading(data){

  const prompt = `
You are Auraspanse.

Write in slow, restrained,
high-literary mystical language.

Avoid:
- "your soul"
- "your energy"
- "journey"
- generic spirituality

Prefer:
- weather
- geology
- architecture
- tidal movement
- ancient material

Coordinates:

Aura Name: ${data.finalName}
Rarity: ${data.rarity}
Emotion: ${data.aura.emotion}
Polarity: ${data.aura.polarity}

Questions:
Q1: ${data.q1}
Q2: ${data.q2}
Q3: ${data.q3}

Write exactly 5 paragraphs.

Use bold sparingly.
`;

  const aiRes = await fetch(
    'https://api.anthropic.com/v1/messages',
    {
      method:'POST',

      headers:{
        'Content-Type':'application/json',
        'x-api-key':process.env.ANTHROPIC_API_KEY,
        'anthropic-version':'2023-06-01',
      },

      body:JSON.stringify({
        model:'claude-sonnet-4-20250514',
        max_tokens:1000,

        messages:[
          {
            role:'user',
            content:prompt,
          },
        ],
      }),
    }
  );

  const json = await aiRes.json();

  return (
    json?.content?.[0]?.text ||
    'Reading unavailable.'
  );
}

/* ──────────────────────────────────────────────────────────
   EMAIL DELIVERY
────────────────────────────────────────────────────────── */

async function sendReadingEmail(reading){

  const html = `
  <div style="
    background:#07060f;
    color:#e4dff0;
    padding:48px;
    font-family:sans-serif;
  ">

    <h1 style="
      color:white;
      font-weight:300;
      letter-spacing:.18em;
    ">
      ${reading.finalName}
    </h1>

    <p style="
      opacity:.5;
      text-transform:uppercase;
      letter-spacing:.12em;
      font-size:12px;
    ">
      ${reading.rarity}
    </p>

    <div style="
      display:flex;
      gap:12px;
      margin:24px 0;
    ">
      ${[reading.hue1,reading.hue2,reading.hue3]
        .map(c=>`
          <div style="
            width:44px;
            height:44px;
            border-radius:50%;
            background:${c};
          "></div>
        `).join('')}
    </div>

    <div style="
      line-height:2;
      opacity:.82;
      font-size:15px;
    ">
      ${reading.text.replace(/\n/g,'<br><br>')}
    </div>

  </div>
  `;

  await resend.emails.send({

    from:
      process.env.FROM_EMAIL ||
      'Auraspanse <reading@auraspanse.com>',

    to:reading.email,

    subject:`${reading.finalName} — Your Auraspanse Reading`,

    html,
  });
}

/* ──────────────────────────────────────────────────────────
   ROUTES
────────────────────────────────────────────────────────── */

app.get('/', (req,res)=>{

  res.send(`
    <h1>Auraspanse</h1>
    <p>Server online.</p>
  `);

});

/* ──────────────────────────────────────────────────────────
   CREATE PAYMENT
────────────────────────────────────────────────────────── */

app.post('/create-payment', async(req,res)=>{

  try{

    const {
      email,
      dob,
      q1,
      q2,
      q3,
    } = req.body;

    if(!email || !dob){

      return res.status(400).json({
        error:'Missing required fields.',
      });
    }

    const session =
      await stripe.checkout.sessions.create({

        mode:'payment',

        customer_email:email,

        automatic_payment_methods:{
          enabled:true,
        },

        allow_promotion_codes:true,

        line_items:[
          {
            price:process.env.PRICE_ID,
            quantity:1,
          },
        ],

        metadata:{
          email,
          dob,
          q1,
          q2,
          q3,
        },

        success_url:
          `${process.env.BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${process.env.BASE_URL}/`,
      });

    res.json({
      url:session.url,
    });

  }catch(err){

    console.error(err);

    res.status(500).json({
      error:'Payment creation failed.',
    });
  }
});

/* ──────────────────────────────────────────────────────────
   STRIPE WEBHOOK
────────────────────────────────────────────────────────── */

app.post('/stripe-webhook', async(req,res)=>{

  let event;

  try{

    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );

  }catch(err){

    console.error('Webhook verify failed:',err.message);

    return res.sendStatus(400);
  }

  if(event.type === 'checkout.session.completed'){

    const session = event.data.object;

    try{

      const {
        email,
        dob,
        q1,
        q2,
        q3,
      } = session.metadata;

      const hues = computeHues({
        dob,
        q1,
        q2,
        q3,
      });

      const readingText =
        await generateReading({
          ...hues,
          q1,
          q2,
          q3,
        });

      const reading = {

        sessionId:session.id,

        createdAt:new Date().toISOString(),

        email,

        dob,

        q1,
        q2,
        q3,

        ...hues,

        text:readingText,
      };

      saveReading(reading);

      await sendReadingEmail(reading);

      console.log('✓ Fulfilled:',session.id);

    }catch(err){

      console.error(
        'Fulfillment failed:',
        err
      );
    }
  }

  res.json({ received:true });
});

/* ──────────────────────────────────────────────────────────
   SUCCESS PAGE
────────────────────────────────────────────────────────── */

app.get('/success',(req,res)=>{

  const { session_id } = req.query;

  const reading =
    findReadingBySession(session_id);

  if(!reading){

    return res.send(`
      <h2>
        Your reading is still forming...
      </h2>

      <p>
        Refresh in a few seconds.
      </p>
    `);
  }

  res.send(`
  <html>
  <body style="
    background:#07060f;
    color:#e4dff0;
    font-family:sans-serif;
    padding:48px;
  ">

    <h1 style="
      font-weight:300;
      letter-spacing:.18em;
    ">
      ${reading.finalName}
    </h1>

    <p style="
      opacity:.45;
      text-transform:uppercase;
      letter-spacing:.12em;
    ">
      ${reading.rarity}
    </p>

    <div style="
      display:flex;
      gap:12px;
      margin:28px 0;
    ">
      ${[reading.hue1,reading.hue2,reading.hue3]
        .map(c=>`
          <div style="
            width:52px;
            height:52px;
            border-radius:50%;
            background:${c};
          "></div>
        `).join('')}
    </div>

    <div style="
      line-height:2;
      max-width:700px;
      opacity:.84;
    ">
      ${reading.text.replace(/\n/g,'<br><br>')}
    </div>

  </body>
  </html>
  `);
});

/* ──────────────────────────────────────────────────────────
   HEALTH
────────────────────────────────────────────────────────── */

app.get('/health',(req,res)=>{

  res.json({
    ok:true,
    timestamp:new Date().toISOString(),
    uptime:process.uptime(),
  });

});

/* ──────────────────────────────────────────────────────────
   START
────────────────────────────────────────────────────────── */

const PORT =
  process.env.PORT || 3000;

app.listen(PORT,()=>{

  console.log(`
✦ Auraspanse online
✦ Port ${PORT}
✦ Environment ready
`);

});
