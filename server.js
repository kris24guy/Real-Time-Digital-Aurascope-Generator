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
function fullReadingPage({ color, signCap, dob, slice, hour, fmt, email }) {
  return `<!DOCTYPE html>
<html>
  <head>
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
      <p class="meta">${signCap} · ${dob || ''}  
${slice.label} · Hour ${hour} · ${slice.energy}</p>
      <div class="card">${fmt}</div>
      <p class="footer">
        Sent to your Auraspanse: ${email || 'your account'}  

        Your aura evolves as time moves through the 24-hour spectrum.  
  

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
