const express = require('express');

const app = express();

// Landing page: simple link to /reading
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Aurascope Generator ✦</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #000;
            color: #e2d9f3;
            font-family: 'Segoe UI', system-ui, sans-serif;
            padding: 60px 20px;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .wrap {
            max-width: 520px;
            text-align: center;
          }
          h1 {
            font-size: 26px;
            font-weight: 300;
            color: #c084fc;
            margin-bottom: 12px;
          }
          p {
            color: #bbb;
            font-size: 14px;
            line-height: 1.8;
            margin-bottom: 24px;
          }
          a.button {
            display: inline-block;
            padding: 14px 32px;
            background: #7c3aed;
            color: #fff;
            border-radius: 999px;
            font-size: 14px;
            text-decoration: none;
          }
          a.button:hover {
            background: #6d28d9;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>✨ Discover Your Aura</h1>
          <p>Jump straight into a demo full reading page using the Base44-style Aurascope layout.</p>
          <a href="/reading" class="button">Reveal My Aura</a>
        </div>
      </body>
    </html>
  `);
});

// Helper: Base44-style full reading template
function readingPage({ signCap, dob, slice, hour, fmt, email, color }) {
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Your Aurascope Reading ✦</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{
        background:#000;
        color:#e2d9f3;
        font-family:'Segoe UI',system-ui,sans-serif;
        padding:60px 20px;
        min-height:100vh;
      }
      .wrap{max-width:620px;margin:0 auto}
      .headline{margin-bottom:24px;text-align:center}
      .eyebrow{
        font-size:11px;
        letter-spacing:.16em;
        text-transform:uppercase;
        color:#777;
        margin-bottom:8px;
      }
      .title{
        font-size:24px;
        font-weight:300;
        color:#c084fc;
        margin-bottom:6px;
      }
      .cta-line{
        font-size:13px;
        color:#999;
        margin-bottom:18px;
      }
      .cta-button{
        display:inline-block;
        padding:9px 20px;
        border-radius:999px;
        background:#7c3aed;
        color:#fff;
        font-size:12px;
        text-decoration:none;
      }
      .cta-button:hover{background:#6d28d9}

      .orb{
        width:64px;
        height:64px;
        border-radius:50%;
        background:${color};
        margin:0 auto 20px;
        filter:blur(4px);
        opacity:.8;
      }
      .meta{
        text-align:center;
        font-size:11px;
        color:#444;
        margin-bottom:28px;
        letter-spacing:.06em;
        line-height:1.8;
      }
      .card{
        background:rgba(255,255,255,.025);
        border:1px solid rgba(124,58,237,.2);
        border-radius:14px;
        padding:28px 24px;
        line-height:2;
        font-size:14px;
        color:#bbb;
      }
      .card strong{color:#e2d9f3;font-weight:500}
      .trait-label{font-size:12px;color:#777;text-transform:uppercase;letter-spacing:.14em}
      .trait-line{margin-top:6px;font-size:14px;color:#ccc}
      .chip{
        display:inline-block;
        padding:2px 8px;
        border-radius:999px;
        font-size:10px;
        text-transform:uppercase;
        letter-spacing:.12em;
        margin-left:6px;
        background:rgba(124,58,237,.12);
        color:#c4a7ff;
      }

      .footer{
        text-align:center;
        margin-top:30px;
        font-size:11px;
        color:#333;
        line-height:1.9;
      }
      a{color:#7c3aed;text-decoration:none}
      a:hover{color:#c084fc}
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="headline">
        <p class="eyebrow">Aurascope — Live Preview</p>
        <h1 class="title">Discover Your Aura</h1>
        <p class="cta-line">Tap \"Reveal My Aura\" to see how your Base44-style reading card will look.</p>
        <a href="/reading" class="cta-button">Reveal My Aura</a>
      </div>

      <div class="orb"></div>
      <p class="eyebrow">Aurascope — Full Reading</p>
      <h1 class="title">✦ Your Aura Reading</h1>
      <p class="meta">${signCap} · ${dob || ''}  
${slice.label} · Hour ${hour} · ${slice.energy}</p>

      <div class="card">
        <div>
          <div class="trait-label">Core sign snapshot</div>
          <div class="trait-line">
            <strong>${signCap}</strong>
            <span class="chip">Positive</span>
              

            Confidence ■ — you can feel your presence fill a room when your energy is clear.
          </div>
        </div>
          

        <div>
          <div class="trait-label">Neutral frequency</div>
          <div class="trait-line">
            <span class="chip">Presence</span>
              

            You’re often simply *there* — deeply tuned in, soaking up what others miss.
          </div>
        </div>
          

        <div>
          <div class="trait-label">Shadow edge</div>
          <div class="trait-line">
            <span class="chip">Ego</span>
              

            When this energy tips out of balance, it can feel like you’re performing yourself instead of inhabiting yourself.
          </div>
        </div>
          

        <div>
          <div class="trait-label">Sneak peek</div>
          <div class="trait-line">
            ${fmt}
          </div>
        </div>
      </div>

      <p class="footer">
        Sent to your Auraspanse: ${email || 'your account'}  

        Your aura evolves as time moves through the 24-hour spectrum.  
  

        <a href="/">← Back to start</a>
      </p>
    </div>
  </body>
</html>`;
}

// /reading route using the Base44-style template
app.get('/reading', (req, res) => {
  // For now, hard-coded example values. Later you can compute these from DOB, etc.
  const signCap = 'Pisces';
  const dob = '03/14'; // demo
  const hour = new Date().getHours();
  const slice = {
    label: 'Deep Water Slice',
    energy: 'Soft, intuitive, boundary-blurring window',
  };
  const fmt = `This is just a sneak peek of your full aura blend. In a complete reading, we would weave your 3 core Pisces traits with your birthstone colors and time of day to map how your energy moves through a 24-hour spectrum.`;
  const email = '';
  const color = '#7c3aed';

  res.send(
    readingPage({ signCap, dob, slice, hour, fmt, email, color })
  );
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✦ Aurascope generator running on port ${PORT}`);
});
