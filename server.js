// ==========================================================
// AURASPENSE — server.js
// Backend for $1 Aura Reading SaaS
// ==========================================================
//
// REQUIRED ENV VARIABLES:
//
// STRIPE_SECRET_KEY=sk_live_xxx
// STRIPE_PRICE_ID=price_xxx
// STRIPE_WEBHOOK_SECRET=whsec_xxx
// RESEND_API_KEY=re_xxx
// DOMAIN=https://yourdomain.com
//
// ==========================================================

'use strict';

const express = require('express');
const Stripe = require('stripe');
const { Resend } = require('resend');
const crypto = require('crypto');

const app = express();

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';

app.use(express.json());


// ==========================================================
// SIMPLE AURA ENGINE
// ==========================================================

const auraColors = [
  'Crimson Flame',
  'Ocean Mist',
  'Solar Gold',
  'Emerald Pulse',
  'Violet Echo',
  'Shadow Indigo',
  'Rose Quartz',
  'Electric Cyan',
  'Amber Drift',
  'Obsidian Veil',
  'Celestial Blue',
  'Lunar Silver'
];

const traits = {
  Aries: {
    positive: 'fearless',
    neutral: 'independent',
    negative: 'impulsive'
  },
  Taurus: {
    positive: 'grounded',
    neutral: 'steady',
    negative: 'stubborn'
  },
  Gemini: {
    positive: 'adaptive',
    neutral: 'curious',
    negative: 'restless'
  },
  Cancer: {
    positive: 'protective',
    neutral: 'sensitive',
    negative: 'guarded'
  },
  Leo: {
    positive: 'radiant',
    neutral: 'confident',
    negative: 'prideful'
  },
  Virgo: {
    positive: 'precise',
    neutral: 'analytical',
    negative: 'critical'
  },
  Libra: {
    positive: 'balanced',
    neutral: 'social',
    negative: 'indecisive'
  },
  Scorpio: {
    positive: 'intense',
    neutral: 'private',
    negative: 'obsessive'
  },
  Sagittarius: {
    positive: 'adventurous',
    neutral: 'philosophical',
    negative: 'reckless'
  },
  Capricorn: {
    positive: 'disciplined',
    neutral: 'reserved',
    negative: 'cold'
  },
  Aquarius: {
    positive: 'visionary',
    neutral: 'detached',
    negative: 'rebellious'
  },
  Pisces: {
    positive: 'empathetic',
    neutral: 'dreamy',
    negative: 'escapist'
  }
};


// ==========================================================
// GET ZODIAC SIGN
// ==========================================================

function getZodiac(month, day) {

  if ((month == 1 && day >= 20) || (month == 2 && day <= 18)) return 'Aquarius';
  if ((month == 2 && day >= 19) || (month == 3 && day <= 20)) return 'Pisces';
  if ((month == 3 && day >= 21) || (month == 4 && day <= 19)) return 'Aries';
  if ((month == 4 && day >= 20) || (month == 5 && day <= 20)) return 'Taurus';
  if ((month == 5 && day >= 21) || (month == 6 && day <= 20)) return 'Gemini';
  if ((month == 6 && day >= 21) || (month == 7 && day <= 22)) return 'Cancer';
  if ((month == 7 && day >= 23) || (month == 8 && day <= 22)) return 'Leo';
  if ((month == 8 && day >= 23) || (month == 9 && day <= 22)) return 'Virgo';
  if ((month == 9 && day >= 23) || (month == 10 && day <= 22)) return 'Libra';
  if ((month == 10 && day >= 23) || (month == 11 && day <= 21)) return 'Scorpio';
  if ((month == 11 && day >= 22) || (month == 12 && day <= 21)) return 'Sagittarius';

  return 'Capricorn';
}


// ==========================================================
// GENERATE AURA
// ==========================================================

function generateAura(birthdate) {

  const date = new Date(birthdate);

  const month = date.getMonth() + 1;
  const day = date.getDate();

  const zodiac = getZodiac(month, day);

  const hash = crypto
    .createHash('sha256')
    .update(birthdate + new Date().toDateString())
    .digest('hex');

  const color1 = auraColors[parseInt(hash.slice(0, 2), 16) % auraColors.length];
  const color2 = auraColors[parseInt(hash.slice(2, 4), 16) % auraColors.length];
  const color3 = auraColors[parseInt(hash.slice(4, 6), 16) % auraColors.length];

  return {
    zodiac,
    traits: traits[zodiac],
    colors: [color1, color2, color3],
    summary: `
Your aura is currently vibrating between ${color1}, ${color2}, and ${color3}.
This emotional spectrum reflects a deeply ${traits[zodiac].positive} energy,
balanced by ${traits[zodiac].neutral} tendencies while resisting
${traits[zodiac].negative} distortions.
`
  };
}


// ==========================================================
// PREVIEW ROUTE
// ==========================================================

app.post('/preview', async (req, res) => {

  try {

    const { birthdate } = req.body;

    if (!birthdate) {
      return res.status(400).json({
        error: 'Birthdate required'
      });
    }

    const aura = generateAura(birthdate);

    res.json({
      success: true,
      preview: {
        zodiac: aura.zodiac,
        colors: aura.colors,
        teaser: aura.summary
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Preview failed'
    });
  }
});


// ==========================================================
// CREATE STRIPE CHECKOUT
// ==========================================================

app.post('/create-checkout-session', async (req, res) => {

  try {

    const { birthdate, email } = req.body;

    if (!birthdate || !email) {
      return res.status(400).json({
        error: 'Missing fields'
      });
    }

    const session = await stripe.checkout.sessions.create({

      payment_method_types: ['card'],

      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1
        }
      ],

      mode: 'payment',

      success_url: `${DOMAIN}/success`,
      cancel_url: `${DOMAIN}/cancel`,

      customer_email: email,

      metadata: {
        birthdate,
        email
      }
    });

    res.json({
      url: session.url
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      error: 'Stripe session failed'
    });
  }
});


// ==========================================================
// STRIPE WEBHOOK
// ==========================================================

app.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {

    let event;

    try {

      const sig = req.headers['stripe-signature'];

      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

    } catch (err) {

      console.error(err);

      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {

      const session = event.data.object;

      const email = session.metadata.email;
      const birthdate = session.metadata.birthdate;

      const aura = generateAura(birthdate);

      try {

        await resend.emails.send({

          from: 'AuraSpense <onboarding@resend.dev>',

          to: email,

          subject: 'Your Full Aura Reading',

          html: `
            <div style="font-family:sans-serif;padding:20px;">
              <h1>Your Aura Reading</h1>

              <p><strong>Zodiac:</strong> ${aura.zodiac}</p>

              <p>
                <strong>Your Aura Colors:</strong><br/>
                ${aura.colors.join(', ')}
              </p>

              <p>${aura.summary}</p>

              <hr/>

              <p>
                Your emotional spectrum is constantly evolving through
                layered energetic transitions.
              </p>

              <p>
                Thank you for unlocking your AuraSpense profile.
              </p>
            </div>
          `
        });

        console.log('Aura email sent');

      } catch (err) {

        console.error('Email failed:', err);
      }
    }

    res.json({ received: true });
  }
);


// ==========================================================
// HEALTH CHECK
// ==========================================================

app.get('/', (req, res) => {

  res.send('AuraSpense backend running.');
});


// ==========================================================
// START SERVER
// ==========================================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {

  console.log(`AuraSpense server running on port ${PORT}`);
});
