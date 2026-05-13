const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());
app.use(express.static('public')); // We'll add a public folder later if needed

// === YOUR AURA ENGINE ===
const zodiacTraits = {
  aries: { pos: {trait: "Courage", color: "#DC2626", hex: "#DC2626"}, neu: {trait: "Drive", color: "#EA580C"}, neg: {trait: "Impulsiveness", color: "#FF3131"} },
  taurus: { pos: {trait: "Stability", color: "#166534"}, neu: {trait: "Patience", color: "#6B8E23"}, neg: {trait: "Stubbornness", color: "#5A3E2B"} },
  gemini: { pos: {trait: "Adaptability", color: "#38BDF8"}, neu: {trait: "Curiosity", color: "#FDE047"}, neg: {trait: "Restlessness", color: "#22D3EE"} },
  // ... (add the rest from previous messages — I can expand if you want)
  leo: { pos: {trait: "Confidence", color: "#FACC15"}, neu: {trait: "Presence", color: "#F59E0B"}, neg: {trait: "Ego", color: "#FB923C"} },
  // Add all 12 signs similarly
};

function getZodiac(month, day) {
  const signs = ["capricorn","aquarius","pisces","aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius"];
  const days = [19,18,20,20,21,21,22,22,21,22,21,20];
  let sign = signs[month];
  if (day > days[month]) sign = signs[(month + 1) % 12];
  return sign;
}

function generateAura(dob) {
  const date = new Date(dob);
  const month = date.getMonth();
  const day = date.getDate();
  const sign = getZodiac(month, day);
  const traits = zodiacTraits[sign] || zodiacTraits.leo; // fallback

  // Simple daily modifier for "unique each time"
  const today = new Date().getDate();
  const blendHueShift = (today % 30) - 15; // subtle daily variation

  return {
    sign: sign.charAt(0).toUpperCase() + sign.slice(1),
    positive: traits.pos,
    neutral: traits.neu,
    negative: traits.neg,
    composite: `A dynamic blend showing ${traits.pos.trait.toLowerCase()} tempered by ${traits.neu.trait.toLowerCase()} with underlying ${traits.neg.trait.toLowerCase()}.`,
    dailyTip: "Lean into your strengths today by..."
  };
}

// Routes
app.get('/', (req, res) => {
  res.send(`
    <h1>Real-Time Digital Aurascope</h1>
    <p>Enter birthdate for your aura reading</p>
    <a href="/reading">Start Reading →</a>
  `);
});

app.get('/reading', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Aura Reading</title><style>body {background:#000; color:#fff; font-family:sans-serif; text-align:center; padding:50px;}</style></head>
    <body>
      <h1>Discover Your Aura</h1>
      <input type="date" id="dob" style="padding:10px; font-size:18px;">
      <button onclick="getAura()" style="padding:10px 20px; margin:20px;">Reveal My Aura</button>
      <div id="result"></div>

      <script>
        async function getAura() {
          const dob = document.getElementById('dob').value;
          if (!dob) return alert("Enter birthdate");
          const res = await fetch('/api/aura', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({dob})
          });
          const data = await res.json();
          document.getElementById('result').innerHTML = \`
            <h2>\${data.sign}</h2>
            <p>Positive: \${data.positive.trait} <span style="color:\${data.positive.color};">■</span></p>
            <p>Neutral: \${data.neutral.trait}</p>
            <p>Negative: \${data.negative.trait}</p>
            <button onclick="sendToEmail()">Send Full Reading to Email</button>
          \`;
        }
      </script>
    </body>
    </html>
  `);
});

app.post('/api/aura', (req, res) => {
  const { dob } = req.body;
  if (!dob) return res.status(400).json({error: "Birthdate required"});
  const aura = generateAura(dob);
  res.json(aura);
});

// Add email + Stripe later — tell me when this works

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Aurascope running on ${PORT}`));
