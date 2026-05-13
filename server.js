const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fetch = require('node-fetch');

const app = express();

app.use(express.json());

// Homepage with form + buy button
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Real-Time Digital Aurascope</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: sans-serif; text-align: center; padding: 40px 20px;
                 background: #0a0a1a; color: #c084fc; margin: 0; }
          h1 { font-size: 2.2em; margin-bottom: 8px; }
          .sub { color: #e2d9f3; font-size: 1em; margin-bottom: 30px; }
          form { max-width: 420px; margin: 0 auto; }
          input, select {
            width: 100%; padding: 12px; margin: 8px 0;
            border-radius: 10px; border: 1px solid #7c3aed;
            background: #1a0a2e; color: #e2d9f3; font-size: 1em;
          }
          label { display: block; text-align: left; color: #a78bfa; 
                  font-size: 0.9em; margin-top: 10px; }
          .price-box { margin: 20px 0; }
          .price { text-decoration: line-through; color: #888; }
          .sale { color: #f0abfc; font-size: 1.4em; font-weight: bold; }
          button {
            width: 100%; margin-top: 20px; padding: 16px;
            background: #7c3aed; color: white; border: none;
            border-radius: 12px; font-size: 1.1em; cursor: pointer;
          }
          button:hover { background: #6d28d9; }
        </style>
      </head>
      <body>
        <h1>✨ Real-Time Digital Aurascope</h1>
        <p class="sub">Your full aura blend — colors, energy layers & what they mean for you right now.</p>
        <form onsubmit="buyReading(event)">
          <label>Your Name</label>
          <input type="text" id="name" placeholder="First name" required />
          <label>Date of Birth</label>
          <input type="date" id="dob" required />
          <label>How are you feeling today?</label>
          <select id="mood">
            <option value="calm">Calm & peaceful</option>
            <option value="anxious">Anxious or stressed</option>
            <option value="energized">Energized & motivated</option>
            <option value="sad">Low or sad</option>
            <option value="confused">Lost or confused</option>
            <option value="happy">Happy & grateful</option>
          </select>
          <label>What do you need most right now?</label>
          <select id="need">
            <option value="clarity">Clarity & direction</option>
            <option value="love">Love & connection</option>
            <option value="healing">Healing & rest</option>
            <option value="confidence">Confidence & strength</option>
            <option value="abundance">Abundance & growth</option>
          </select>
          <div class="price-box">
            <span class="price">Usually $12</span>  

            <span class="sale">Intro offer: $1</span>
          </div>
          <button type="submit">Reveal My Aura →</button>
        </form>
        <script>
          async function buyReading(e) {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.textContent = 'Preparing your reading...';
            btn.disabled = true;
            const res = await fetch('/create-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: document.getElementById('name').value,
                dob: document.getElementById('dob').value,
                mood: document.getElementById('mood').value,
                need: document.getElementById('need').value,
              })
            });
            const data = await res.json();
            window.location.href = data.url;
          }
        </script>
      </body>
    </html>
  `);
});

// Create Stripe checkout, store user info in metadata
app.post('/create-payment', async (req, res) => {
  try {
    const { name, dob, mood, need } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Full Aura Blend Reading',
            description: 'Your complete aura color profile & energy reading — usually $12'
          },
          unit_amount: 100, // $1.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      metadata: { name, dob, mood, need },
      success_url: 'https://realtime-aurascope.onrender.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://realtime-aurascope.onrender.com',
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Payment failed to initialize' });
  }
});

// Success page — generate aura reading
app.get('/success', async (req, res) => {
  try {
    const sessionId = req.query.session_id;
    if (!sessionId) throw new Error('Missing session_id');

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const { name, dob, mood, need } = session.metadata || {};

    // Generate aura reading with Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 800,
        messages: [{
          role: 'user',
          content: `You are a gifted aura reader. Generate a warm, detailed, and personal aura reading for:
Name: ${name}
Date of Birth: ${dob}
Current mood: ${mood}
What they need most: ${need}

Include:
1. Their PRIMARY aura color and what it means right now
2. Their SECONDARY aura color and its influence
3. A third HIDDEN layer color that surprises them
4. What their aura blend says about their energy this week
5. A personal message just for them based on their mood and need
6. One action they can take today to align their energy

Write in a warm, mystical but grounded tone. Use emojis sparingly. Make it feel personal and specific to them, not generic.`
        }]
      })
    });

    const ai = await response.json();

    const reading =
      ai && ai.content && ai.content[0] && ai.content[0].text
        ? ai.content[0].text
        : 'We had trouble generating your reading. Please contact support.';

    res.send(`
      <html>
        <head>
          <title>Your Aura Reading ✨</title>
          <style>
            body { font-family: sans-serif; padding: 40px 20px; max-width: 680px;
                   margin: 0 auto; background: #0a0a1a; color: #e2d9f3; }
            h1 { color: #c084fc; text-align: center; font-size: 2em; }
            .name { text-align: center; color: #a78bfa; margin-bottom: 30px; }
            .reading { 
              background: #1a0a2e; border-radius: 16px; padding: 30px;
              line-height: 1.8; white-space: pre-wrap; border: 1px solid #7c3aed;
            }
            .footer { text-align: center; margin-top: 30px; color: #888; font-size: 0.9em; }
            a { color: #c084fc; }
          </style>
        </head>
        <body>
          <h1>✨ Your Aura Reading</h1>
          <p class="name">Prepared for ${name || 'you'}</p>
          <div class="reading">${reading}</div>
          <p class="footer">
            Want to save this? Screenshot or copy it now.  
  

            <a href="/">← Get another reading</a>
          </p>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('Error on /success:', err);
    res.send(`
      <html><body style="background:#0a0a1a;color:#c084fc;text-align:center;padding:50px;font-family:sans-serif;">
        <h1>Something went wrong ✨</h1>
        <p>Your payment was received but we hit an error generating your reading.</p>
        <p>Email us and we'll sort it out right away.</p>
        <a href="/" style="color:#c084fc;">← Go back</a>
      </body></html>
    `);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
