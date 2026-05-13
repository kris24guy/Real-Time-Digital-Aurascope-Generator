const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

// Homepage with buy button
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Real-Time Digital Aurascope</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; 
                 background: #0a0a1a; color: #c084fc; }
          h1 { font-size: 2.5em; margin-bottom: 10px; }
          p { color: #e2d9f3; font-size: 1.1em; }
          .price { text-decoration: line-through; color: #888; }
          .sale { color: #f0abfc; font-size: 1.4em; font-weight: bold; }
          button {
            margin-top: 30px;
            padding: 16px 40px;
            background: #7c3aed;
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1.2em;
            cursor: pointer;
          }
          button:hover { background: #6d28d9; }
        </style>
      </head>
      <body>
        <h1>✨ Real-Time Digital Aurascope</h1>
        <p>Discover your full aura blend — colors, energy layers, and what they mean for you.</p>
          

        <span class="price">Usually $12</span>  

        <span class="sale">Today only: $1</span>
          

        <button onclick="buyReading()">Get My Aura Reading →</button>
        <script>
          async function buyReading() {
            const res = await fetch('/create-payment', { method: 'POST' });
            const data = await res.json();
            window.location.href = data.url;
          }
        </script>
      </body>
    </html>
  `);
});

// Stripe checkout
app.post('/create-payment', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Full Aura Blend Reading',
            description: 'Your complete aura color profile, energy layers & meaning — usually $12'
          },
          unit_amount: 100, // $1.00
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: 'https://realtime-aurascope.onrender.com/success',
      cancel_url: 'https://realtime-aurascope.onrender.com',
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment failed to initialize' });
  }
});

// Success page
app.get('/success', (req, res) => {
  res.send(`
    <html>
      <head><title>Payment Successful</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; 
                   background: #0a0a1a; color: #c084fc;">
        <h1>✨ Thank You!</h1>
        <p style="color: #e2d9f3;">Your aura reading is being prepared.  

        Check your email shortly.</p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
