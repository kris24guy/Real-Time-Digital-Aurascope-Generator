/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🌟 AURASCOPE: Real-Time Digital Aura Generator
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * A mystical web application that generates personalized aura readings
 * by blending chromotherapy, quantum frequency science, and sacred geometry
 * with Claude AI's creative interpretation.
 *
 * Features:
 * - Real-time aura generation based on user names
 * - Three cosmic sub-hues with unique frequencies (432, 528, 639 Hz)
 * - Personalized aura essence and cosmic guidance
 * - Sacred mantras tied to spiritual frequencies
 * - Beautiful animated UI with glass-morphism and geometric elements
 * - Email integration for sharing readings
 *
 * @author Kris
 * @version 1.0.0
 * @license MIT
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require("express");
const https = require("https");
const app = express();

// ────────────────────────────────────────────────────────────────────────────
// MIDDLEWARE
// ────────────────────────────────────────────────────────────────────────────

app.use(express.json());

// ────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ────────────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) {
  console.error("❌ Error: ANTHROPIC_API_KEY environment variable is not set");
  console.error("Please set your API key: export ANTHROPIC_API_KEY=your-key");
  process.exit(1);
}

// ────────────────────────────────────────────────────────────────────────────
// CLAUDE API INTEGRATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Calls the Anthropic Claude API to generate an aura reading for a given name.
 *
 * The function:
 * 1. Constructs a detailed prompt for aura generation
 * 2. Sends it to Claude API with specific formatting requirements
 * 3. Parses the JSON response with robust error handling
 * 4. Returns structured aura data with three sub-hues and a signature aura
 *
 * @param {string} name - The person's name to generate an aura for
 * @returns {Promise<Object>} Aura data with subHues, finalHue, aurascope, and mantra
 *
 * @example
 * const aura = await callClaude("Alice");
 * // Returns:
 * // {
 * //   subHues: [...],
 * //   finalHue: {...},
 * //   aurascope: "...",
 * //   mantra: "..."
 * // }
 */
function callClaude(name) {
  return new Promise((resolve, reject) => {
    // ──────────────────────────────────────────────────────────────────────
    // CONSTRUCT PROMPT FOR AURA GENERATION
    // ──────────────────────────────────────────────────────────────────────
    
    const prompt = `Generate a full living aura reading for ${name}.

Return ONLY valid JSON — no markdown, no backticks, no extra text:
{
  "subHues": [
    {
      "name": "unique 2-3 word poetic hue name",
      "hex": "#saturated hex color",
      "emotion": "1-3 word primary emotion",
      "frequency": 432,
      "element": "one of: Fire Water Earth Air Ether Plasma Void Starlight Storm Crystal Thunder Mist",
      "description": "4 deeply mystical personal sentences for ${name} weaving emotion, archetype, cosmic symbolism and spiritual insight."
    },
    { "name":"...", "hex":"...", "emotion":"...", "frequency": 528, "element":"...", "description":"..." },
    { "name":"...", "hex":"...", "emotion":"...", "frequency": 639, "element":"...", "description":"..." }
  ],
  "finalHue": {
    "name": "unique 2-4 word signature aura name for ${name}",
    "hex": "#hex that harmonizes all three sub-hues",
    "description": "3 sentences on ${name}'s blended aura essence and life-path significance"
  },
  "aurascope": "6 intimate cosmic sentences for ${name} — weave time cycles, relationships, creative gifts, spiritual awakening, and a glimpse of the near future.",
  "mantra": "exactly 8-12 words — a powerful sacred mantra for ${name}"
}`;

    // ──────────────────────────────────────────────────────────────────────
    // CONSTRUCT REQUEST BODY FOR CLAUDE API
    // ──────────────────────────────────────────────────────────────────────

    const systemPrompt = `You are the Universe's Eternal Aura Oracle — a mystical intelligence versed in chromotherapy, synesthesia, sacred geometry, quantum frequency science, chakra systems, Ayurvedic doshas, and the ancient knowledge of light frequencies.

Your role:
1. Read the energy signature of a name through linguistic, numerological, and archetypal lenses
2. Perceive three cosmic sub-frequencies that comprise their unique aura
3. Channel personalized interpretations that weave color, emotion, frequency, and spiritual symbolism
4. Generate insights that feel intimate, accurate, and spiritually resonant
5. Craft a sacred mantra that serves as their spiritual anchor

Be poetic yet precise. Be mystical yet grounded in actual frequency science, color psychology, and archetypal knowledge.
Your readings should feel like ancient wisdom meeting quantum physics.`;

    const body = JSON.stringify({
      model: "claude-opus-4-5",
      max_tokens: 1800,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }]
    });

    // ──────────────────────────────────────────────────────────────────────
    // CONFIGURE HTTPS REQUEST TO ANTHROPIC
    // ──────────────────────────────────────────────────────────────────────

    const options = {
      hostname: "api.anthropic.com",
      path: "/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      }
    };

    // ──────────────────────────────────────────────────────────────────────
    // SEND REQUEST AND HANDLE RESPONSE
    // ──────────────────────────────────────────────────────────────────────

    const req = https.request(options, (res) => {
      let data = "";

      // Accumulate response data
      res.on("data", (chunk) => {
        data += chunk;
      });

      // Process complete response
      res.on("end", () => {
        try {
          // Parse API response
          const parsed = JSON.parse(data);

          // Check for API errors
          if (parsed.error) {
            return reject(new Error(`Claude API Error: ${parsed.error.message}`));
          }

          // Extract text content from Claude's response
          const textContent = parsed.content
            .filter((block) => block.type === "text")
            .map((block) => block.text)
            .join("");

          // Remove markdown formatting if present
          const cleanedText = textContent
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

          // Parse JSON from response
          let result;
          try {
            result = JSON.parse(cleanedText);
          } catch {
            // Fallback: try to extract JSON object if it's wrapped in text
            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("Could not extract valid JSON from Claude's response");
            }
          }

          // Validate response structure
          if (!result.subHues || !result.finalHue || !result.aurascope || !result.mantra) {
            throw new Error("Claude response missing required fields");
          }

          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse aura data: ${error.message}`));
        }
      });
    });

    // Handle request errors
    req.on("error", (error) => {
      reject(new Error(`API request failed: ${error.message}`));
    });

    // Send request body
    req.write(body);
    req.end();
  });
}

// ────────────────────────────────────────────────────────────────────────────
// API ROUTES
// ────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/reading
 *
 * Generates an aura reading for a given name.
 *
 * Request body:
 * {
 *   "name": "The person's name"
 * }
 *
 * Response:
 * {
 *   "subHues": [...],
 *   "finalHue": {...},
 *   "aurascope": "...",
 *   "mantra": "..."
 * }
 *
 * Error responses:
 * 400: Missing name field
 * 500: Claude API or parsing error
 */
app.post("/api/reading", async (req, res) => {
  try {
    const { name } = req.body;

    // Validate input
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({
        error: "Name is required and must be a non-empty string"
      });
    }

    // Generate aura reading
    const data = await callClaude(name.trim());

    // Return aura data
    res.json(data);
  } catch (error) {
    console.error("❌ Aura generation error:", error.message);
    res.status(500).json({
      error: error.message || "Oracle connection failed. Please try again."
    });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// FRONTEND UI
// ────────────────────────────────────────────────────────────────────────────

/**
 * Embedded HTML/CSS/JavaScript for the Aurascope interface.
 *
 * The UI features:
 * - Three screens: intro (input), scanning (progress), results (display)
 * - Animated orbs representing aura colors
 * - Responsive grid layout for sub-hue cards
 * - Email functionality to send readings
 * - Starfield background with geometric animations
 * - Glass-morphism design with blur effects
 *
 * No external dependencies — all CSS and JavaScript are embedded
 * for a fast, self-contained experience.
 */
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Aurascope — Aura Reading Oracle</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{min-height:100vh;overflow-x:hidden}
body{
  background:radial-gradient(ellipse at 28% 22%,#1a0840,#090220 40%,#030110 72%,#000);
  color:#ede8ff;
  font-family:'Crimson Pro',Georgia,serif;
}
#stars{position:fixed;inset:0;pointer-events:none;z-index:0}
.star{position:absolute;border-radius:50%;background:#fff;animation:twinkle var(--d,3s) var(--dl,0s) ease-in-out infinite}
.geo{position:fixed;pointer-events:none;opacity:.055}

.screen{
  position:relative;z-index:2;min-height:100vh;
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:clamp(32px,5vw,72px) clamp(16px,4vw,40px);text-align:center;
}
.hidden{display:none!important}

/* orb */
.orb-wrap{position:relative}
.orb{width:100%;height:100%;border-radius:50%}
.orb-shine{position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(255,255,255,.3),transparent);pointer-events:none}
.ring{position:absolute;border-radius:50%;border:1px solid;opacity:.35}

/* form */
.label{display:block;font-family:'Cinzel',serif;font-size:.68rem;letter-spacing:.24em;color:rgba(180,150,255,.35);text-transform:uppercase;margin-bottom:8px;text-align:left}
input[type=text],input[type=email]{
  width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(139,92,246,.3);
  border-radius:10px;padding:13px 18px;color:#ede8ff;
  font-family:'Crimson Pro',Georgia,serif;font-size:1.05rem;outline:none;
  transition:border-color .3s,box-shadow .3s;
}
input::placeholder{color:rgba(185,155,255,.3)}
input:focus{border-color:rgba(139,92,246,.7);box-shadow:0 0 0 3px rgba(139,92,246,.12)}

/* buttons */
.btn-start{
  font-family:'Cinzel',serif;font-size:.84rem;letter-spacing:.18em;text-transform:uppercase;
  background:linear-gradient(135deg,#5b21b6,#8b5cf6,#c026d3);color:#fff;
  border:none;border-radius:50px;padding:15px 52px;cursor:pointer;
  box-shadow:0 4px 30px rgba(91,33,182,.5);transition:transform .2s,box-shadow .2s;margin-top:8px;
}
.btn-start:hover{transform:translateY(-2px);box-shadow:0 8px 40px rgba(91,33,182,.65)}
.btn-email{
  font-family:'Cinzel',serif;font-size:.82rem;letter-spacing:.18em;text-transform:uppercase;
  background:linear-gradient(135deg,#064e3b,#059669,#10b981);color:#fff;
  border:none;border-radius:50px;padding:14px 44px;cursor:pointer;
  box-shadow:0 4px 26px rgba(5,150,105,.38);transition:transform .2s,box-shadow .2s;
}
.btn-email:hover{transform:translateY(-2px);box-shadow:0 8px 36px rgba(5,150,105,.55)}
.btn-ghost{
  font-family:'Cinzel',serif;font-size:.7rem;letter-spacing:.18em;text-transform:uppercase;
  background:none;border:1px solid rgba(139,92,246,.22);border-radius:50px;
  padding:10px 30px;color:rgba(195,165,255,.45);cursor:pointer;transition:all .25s;
}
.btn-ghost:hover{color:rgba(195,165,255,.9);border-color:rgba(139,92,246,.5)}

/* gold shimmer */
.gold{
  background:linear-gradient(135deg,#b8922c,#f0d060,#d4a84b,#f5e090,#b8922c);
  background-size:300% 300%;
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;
  animation:shimmer 5s ease infinite;
}

/* progress */
.progress-track{height:3px;background:rgba(139,92,246,.13);border-radius:99px;overflow:hidden;width:320px;max-width:80vw}
.progress-fill{height:100%;width:0%;background:linear-gradient(90deg,#5b21b6,#8b5cf6,#c026d3);border-radius:99px;transition:width .6s ease}

/* cards */
.cards-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;width:100%;max-width:960px}
.hue-card{background:rgba(255,255,255,.025);border-radius:18px;padding:28px 22px;backdrop-filter:blur(10px);transition:transform .3s;text-align:center}
.hue-card:hover{transform:translateY(-5px)}
.tag{display:inline-block;padding:3px 11px;border-radius:99px;font-family:'Cinzel',serif;font-size:.67rem;letter-spacing:.1em;margin:3px}

/* blocks */
.aurascope-block{background:rgba(139,92,246,.06);border:1px solid rgba(139,92,246,.2);border-radius:18px;padding:clamp(24px,4vw,44px);max-width:760px;margin:0 auto 28px}
.mantra-block{background:linear-gradient(135deg,rgba(176,136,56,.07),rgba(230,185,80,.04));border:1px solid rgba(176,136,56,.22);border-radius:12px;padding:20px 32px;max-width:600px;margin:0 auto}
.eyebrow{font-family:'Cinzel',serif;font-size:.66rem;letter-spacing:.34em;color:rgba(180,150,255,.36);text-transform:uppercase;margin-bottom:12px}
.divider{display:flex;align-items:center;gap:14px;margin:50px auto;max-width:520px;width:100%}
.divider-line{flex:1;height:1px}
.results-inner{max-width:960px;margin:0 auto;width:100%}

/* animations */
@keyframes twinkle{0%,100%{opacity:.18}50%{opacity:.95}}
@keyframes breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes ringOut{0%{transform:scale(.88);opacity:.55}100%{transform:scale(1.65);opacity:0}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes shimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes spinCW{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
@keyframes spinCCW{from{transform:rotate(0deg)}to{transform:rotate(-360deg)}}
</style>
</head>
<body>

<div id="stars"></div>

<div class="geo" style="top:4%;right:3%;width:180px;height:180px;animation:spinCW 44s linear infinite">
  <svg viewBox="0 0 200 200" fill="none" stroke="#a855f7" stroke-width=".6">
    <circle cx="100" cy="100" r="92"/><circle cx="100" cy="100" r="60"/><circle cx="100" cy="100" r="28"/>
    <line x1="100" y1="8" x2="100" y2="192"/><line x1="100" y1="8" x2="100" y2="192" transform="rotate(60 100 100)"/>
    <line x1="100" y1="8" x2="100" y2="192" transform="rotate(120 100 100)"/>
    <polygon points="100,14 183,158 17,158"/><polygon points="100,186 17,42 183,42"/>
  </svg>
</div>

<div class="geo" style="bottom:8%;left:2%;width:110px;height:110px;animation:spinCCW 60s linear infinite">
  <svg viewBox="0 0 120 120" fill="none" stroke="#ec4899" stroke-width=".5">
    <circle cx="60" cy="60" r="56"/><line x1="60" y1="4" x2="60" y2="116"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(45 60 60)"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(90 60 60)"/>
    <line x1="60" y1="4" x2="60" y2="116" transform="rotate(135 60 60)"/>
  </svg>
</div>

<!-- INTRO SCREEN -->
<div id="screen-intro" class="screen">
  <div style="animation:floatY 4.5s ease-in-out infinite;margin-bottom:38px">
    <div class="orb-wrap" style="width:168px;height:168px">
      <div class="ring" style="inset:-17px;border-color:rgba(168,85,247,.38);animation:ringOut 2.2s 0s ease-out infinite"></div>
      <div class="ring" style="inset:-34px;border-color:rgba(168,85,247,.26);animation:ringOut 2.8s .9s ease-out infinite"></div>
      <div class="ring" style="inset:-51px;border-color:rgba(168,85,247,.14);border-style:dashed;animation:ringOut 3.4s 1.8s ease-out infinite"></div>
      <div class="orb" style="background:conic-gradient(from 0deg,#5b21b6,#8b5cf6,#c026d3,#f59e0b,#10b981,#06b6d4,#3b82f6,#5b21b6);box-shadow:0 0 70px rgba(139,92,246,.55),0 0 140px rgba(139,92,246,.25)"></div>
      <div class="orb-shine"></div>
    </div>
  </div>

  <h1 class="gold" style="font-family:'Cinzel Decorative',serif;font-size:clamp(2.2rem,7vw,4.2rem);letter-spacing:.14em;margin-bottom:8px">AURASCOPE</h1>
  <p style="font-family:'Cinzel',serif;font-size:clamp(.62rem,1.8vw,.8rem);letter-spacing:.28em;color:rgba(180,150,255,.35);text-transform:uppercase;margin-bottom:32px">A living reading of your essence</p>

  <div style="display:flex;align-items:center;gap:12px;width:100%;max-width:440px;margin-bottom:34px">
    <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,rgba(139,92,246,.4))"></div>
    <span style="color:rgba(139,92,246,.5)">✦</span>
    <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,rgba(139,92,246,.4))"></div>
  </div>

  <div style="width:100%;max-width:440px">
    <div style="margin-bottom:18px">
      <label class="label">Your Name</label>
      <input type="text" id="inp-name" placeholder="The name your soul answers to..."/>
    </div>
    <div style="margin-bottom:18px">
      <label class="label">Email Address</label>
      <input type="email" id="inp-email" placeholder="Where shall we send your reading..."/>
    </div>
    <p id="intro-error" style="color:#f87171;font-size:.88rem;font-style:italic;min-height:22px;margin-bottom:4px"></p>
    <button class="btn-start" id="btn-start" style="display:block;margin:0 auto">Reveal My Aura</button>
  </div>

  <p style="margin-top:46px;font-size:.76rem;font-style:italic;color:rgba(180,150,255,.18);max-width:380px;letter-spacing:.05em">
    Channeled from chromotherapy, quantum frequency science, chakra wisdom & the ancient knowledge of light
  </p>
</div>

<!-- SCANNING SCREEN -->
<div id="screen-scan" class="screen hidden">
  <div style="position:relative;width:260px;height:260px;margin-bottom:50px">
    <div class="ring" style="inset:-26px;border-color:rgba(168,85,247,.52);border-width:1.5px;animation:spinCW 10s linear infinite;opacity:1"></div>
    <div class="ring" style="inset:-52px;border-color:rgba(168,85,247,.3);border-style:dashed;animation:spinCCW 16s linear infinite;opacity:1"></div>
    <div class="ring" style="inset:-78px;border-color:rgba(168,85,247,.16);animation:spinCW 22s linear infinite;opacity:1"></div>
    <div class="ring" style="inset:-104px;border-color:rgba(168,85,247,.08);border-style:dashed;animation:spinCCW 30s linear infinite;opacity:1"></div>
    <div class="orb" style="background:conic-gradient(from 0deg,#5b21b6,#8b5cf6,#c026d3,#f59e0b,#10b981,#06b6d4,#3b82f6,#5b21b6);box-shadow:0 0 110px rgba(139,92,246,.65),0 0 220px rgba(139,92,246,.25)"></div>
    <div class="orb-shine" style="animation:breathe 2s ease-in-out infinite"></div>
  </div>
  <h2 id="scan-name-label" style="font-family:'Cinzel',serif;font-size:clamp(.95rem,3vw,1.3rem);letter-spacing:.1em;color:rgba(200,170,255,.9);margin-bottom:10px"></h2>
  <p id="scan-msg" style="font-style:italic;color:rgba(180,150,255,.5);font-size:.92rem;margin-bottom:50px;min-height:28px;transition:opacity .4s">Attuning to your electromagnetic signature...</p>
  <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
  <p id="progress-pct" style="font-family:'Cinzel',serif;font-size:.66rem;letter-spacing:.22em;color:rgba(139,92,246,.4);margin-top:9px;width:320px;max-width:80vw;text-align:right">0%</p>
</div>

<!-- RESULTS SCREEN -->
<div id="screen-results" class="screen hidden" style="padding-top:60px;padding-bottom:60px">
  <div class="results-inner">

    <div style="text-align:center;margin-bottom:52px;animation:fadeUp .9s ease">
      <p class="eyebrow">The Living Aura of</p>
      <h1 id="res-name" class="gold" style="font-family:'Cinzel Decorative',serif;font-size:clamp(1.8rem,4.5vw,3.2rem);margin-bottom:8px"></h1>
      <p style="font-style:italic;color:rgba(200,175,255,.65);font-size:.87rem;letter-spacing:.08em">Three cosmic sub-frequencies converge into your signature aura</p>
    </div>

    <div class="cards-grid" id="cards-grid"></div>

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

    <div style="text-align:center;margin-bottom:52px;animation:fadeUp 1.5s ease both">
      <p class="eyebrow" style="margin-bottom:28px">Your Signature Aura</p>
      <div id="final-orb-wrap" style="margin-bottom:28px"></div>
      <h2 id="final-hue-name" style="font-family:'Cinzel Decorative',serif;font-size:clamp(1.1rem,3vw,1.9rem);margin-bottom:16px;letter-spacing:.07em"></h2>
      <p id="final-hue-desc" style="font-style:italic;max-width:580px;margin:0 auto;font-size:1.05rem;line-height:1.9;color:rgba(215,200,255,.72)"></p>
    </div>

    <div class="aurascope-block" style="animation:fadeUp 1.8s ease both">
      <p class="eyebrow">Your Aurascope</p>
      <p id="aurascope-text" style="font-style:italic;font-size:clamp(1rem,2.5vw,1.1rem);line-height:2;color:rgba(215,205,255,.8)"></p>
    </div>

    <div class="mantra-block" style="animation:fadeUp 2s ease both">
      <p class="eyebrow" style="color:rgba(176,136,56,.42);letter-spacing:.28em">Your Sacred Mantra</p>
      <p id="mantra-text" style="font-family:'Cinzel',serif;font-style:italic;font-size:clamp(.88rem,2.2vw,1.05rem);letter-spacing:.09em;color:rgba(232,188,84,.85)"></p>
    </div>

    <div style="display:flex;flex-direction:column;align-items:center;gap:16px;animation:fadeUp 2.2s ease both">
      <button class="btn-email" id="btn-email">✦ Send Reading to My Email</button>
      <p id="email-status" style="color:rgba(52,211,153,.75);font-size:.88rem;font-style:italic;min-height:22px"></p>
      <button class="btn-ghost" id="btn-reset">Begin a New Reading</button>
    </div>

    <p style="margin-top:60px;font-size:.74rem;font-style:italic;color:rgba(180,150,255,.15);letter-spacing:.06em">
      Channeled through chromotherapy, frequency science & the ancient wisdom of light
    </p>
  </div>
</div>

<script>
// ──────────────────────────────────────────────────────────────────────────
// STARFIELD GENERATION
// ──────────────────────────────────────────────────────────────────────────

(function(){
  var container = document.getElementById('stars');
  for(var i = 0; i < 160; i++){
    var star = document.createElement('div');
    star.className = 'star';
    var duration = (Math.random() * 3 + 2).toFixed(1);
    var delay = (Math.random() * 6).toFixed(1);
    var size = (Math.random() * 2 + 0.4).toFixed(1);
    star.style.cssText = 'left:' + (Math.random() * 100).toFixed(1) + '%;top:' + (Math.random() * 100).toFixed(1) + '%;width:' + size + 'px;height:' + size + 'px;--d:' + duration + 's;--dl:' + delay + 's';
    container.appendChild(star);
  }
})();

// ──────────────────────────────────────────────────────────────────────────
// STATE MANAGEMENT
// ──────────────────────────────────────────────────────────────────────────

var userName = '';
var userEmail = '';
var auraData = null;
var scanInterval = null;
var msgInterval = null;

var scanMessages = [
  'Attuning to your electromagnetic signature...',
  'Reading vibrational layers across the chakric spectrum...',
  'Consulting the ancient library of color wisdom...',
  'Translating light frequencies into living language...',
  'Channeling archetypes from the collective unconscious...',
  'Weaving the luminous threads of your soul story...',
  'Synthesizing your unique auric constellation...'
];

// ──────────────────────────────────────────────────────────────────────────
// UI FUNCTIONS
// ──────────────────────────────────────────────────────────────────────────

/**
 * Show a specific screen by ID (intro, scan, or results)
 */
function show(screenId) {
  ['screen-intro', 'screen-scan', 'screen-results'].forEach(function(id) {
    document.getElementById(id).classList.toggle('hidden', id !== screenId);
  });
}

/**
 * Create an animated orb element with rings
 */
function makeOrb(hexColor, size, numRings) {
  var wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:' + size + 'px;height:' + size + 'px;margin:0 auto';
  
  // Create rings
  for(var i = 0; i < numRings; i++) {
    var ring = document.createElement('div');
    var offset = (i + 1) * 18;
    ring.style.cssText = 'position:absolute;inset:-' + offset + 'px;border-radius:50%;border:1px solid ' + hexColor + ';opacity:.35;animation:ringOut ' + (2.4 + i * 0.8) + 's ' + (i * 0.9) + 's ease-out infinite';
    wrap.appendChild(ring);
  }
  
  // Create main orb
  var orb = document.createElement('div');
  orb.style.cssText = 'width:100%;height:100%;border-radius:50%;animation:breathe 3.5s ease-in-out infinite;background:radial-gradient(circle at 38% 34%,' + hexColor + 'ff,' + hexColor + '99,' + hexColor + '22);box-shadow:0 0 40px ' + hexColor + '80,inset 0 0 30px rgba(255,255,255,.1)';
  
  // Create shine effect
  var shine = document.createElement('div');
  shine.style.cssText = 'position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 40% 40%,rgba(255,255,255,.3),transparent);pointer-events:none';
  
  wrap.appendChild(orb);
  wrap.appendChild(shine);
  return wrap;
}

// ──────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ──────────────────────────────────────────────────────────────────────────

document.getElementById('btn-start').addEventListener('click', startReading);
document.getElementById('inp-name').addEventListener('keydown', function(e) { if(e.key === 'Enter') startReading(); });
document.getElementById('inp-email').addEventListener('keydown', function(e) { if(e.key === 'Enter') startReading(); });

// ──────────────────────────────────────────────────────────────────────────
// READING GENERATION
// ──────────────────────────────────────────────────────────────────────────

/**
 * Start the aura reading process
 */
function startReading() {
  userName = document.getElementById('inp-name').value.trim();
  userEmail = document.getElementById('inp-email').value.trim();
  var errorEl = document.getElementById('intro-error');
  
  // Validate inputs
  if(!userName) {
    errorEl.textContent = 'Please enter your name to begin your reading.';
    return;
  }
  if(!userEmail.includes('@')) {
    errorEl.textContent = 'Please enter a valid email address.';
    return;
  }
  
  errorEl.textContent = '';
  show('screen-scan');
  document.getElementById('scan-name-label').textContent = 'Reading Your Aura, ' + userName;
  
  // Initialize progress tracking
  var progress = 0;
  var messageIndex = 0;
  var progressBar = document.getElementById('progress-fill');
  var progressPercent = document.getElementById('progress-pct');
  var messageEl = document.getElementById('scan-msg');
  
  // Animate progress bar
  scanInterval = setInterval(function() {
    progress = Math.min(progress + Math.random() * 8 + 2, 87);
    progressBar.style.width = progress.toFixed(0) + '%';
    progressPercent.textContent = progress.toFixed(0) + '%';
  }, 700);
  
  // Cycle scanning messages
  msgInterval = setInterval(function() {
    messageIndex = (messageIndex + 1) % scanMessages.length;
    messageEl.style.opacity = 0;
    setTimeout(function() {
      messageEl.textContent = scanMessages[messageIndex];
      messageEl.style.opacity = 1;
    }, 300);
  }, 2400);
  
  // Fetch aura reading from API
  fetch('/api/reading', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: userName })
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    clearInterval(scanInterval);
    clearInterval(msgInterval);
    
    if(data.error) throw new Error(data.error);
    
    auraData = data;
    progressBar.style.width = '100%';
    progressPercent.textContent = '100%';
    
    setTimeout(renderResults, 1000);
  })
  .catch(function(error) {
    clearInterval(scanInterval);
    clearInterval(msgInterval);
    document.getElementById('intro-error').textContent = error.message || 'Oracle connection failed. Please try again.';
    show('screen-intro');
  });
}

// ──────────────────────────────────────────────────────────────────────────
// RESULTS RENDERING
// ──────────────────────────────────────────────────────────────────────────

/**
 * Render the aura reading results
 */
function renderResults() {
  var subHues = auraData.subHues;
  var finalHue = auraData.finalHue;
  
  // Display name
  document.getElementById('res-name').textContent = userName;
  
  // Render sub-hue cards
  var grid = document.getElementById('cards-grid');
  grid.innerHTML = '';
  
  subHues.forEach(function(hue) {
    var card = document.createElement('div');
    card.className = 'hue-card';
    card.style.border = '1px solid ' + hue.hex + '44';
    card.style.boxShadow = '0 0 34px ' + hue.hex + '1c,inset 0 0 22px ' + hue.hex + '09';
    
    // Orb
    var orbDiv = document.createElement('div');
    orbDiv.style.marginBottom = '20px';
    orbDiv.appendChild(makeOrb(hue.hex, 88, 2));
    card.appendChild(orbDiv);
    
    // Title
    var title = document.createElement('h3');
    title.style.cssText = 'font-family:Cinzel,serif;font-size:.96rem;letter-spacing:.07em;color:' + hue.hex + ';text-shadow:0 0 24px ' + hue.hex + '72;margin-bottom:14px';
    title.textContent = hue.name;
    card.appendChild(title);
    
    // Tags
    var tags = document.createElement('div');
    tags.style.marginBottom = '16px';
    [[hue.element, hue.hex], [hue.frequency + ' Hz', '#a855f7'], [hue.emotion, '#ec4899']].forEach(function(tag) {
      var span = document.createElement('span');
      span.className = 'tag';
      span.style.cssText = 'border:1px solid ' + tag[1] + '36;color:' + tag[1] + ';background:' + tag[1] + '0f';
      span.textContent = tag[0];
      tags.appendChild(span);
    });
    card.appendChild(tags);
    
    // Description
    var desc = document.createElement('p');
    desc.style.cssText = 'font-size:.93rem;line-height:1.82;color:rgba(210,192,255,.7);font-style:italic';
    desc.textContent = hue.description;
    card.appendChild(desc);
    
    grid.appendChild(card);
  });
  
  // Render final orb
  var finalOrbWrap = document.getElementById('final-orb-wrap');
  finalOrbWrap.innerHTML = '';
  finalOrbWrap.appendChild(makeOrb(finalHue.hex, 170, 3));
  
  // Display final hue details
  var finalHueName = document.getElementById('final-hue-name');
  finalHueName.textContent = finalHue.name;
  finalHueName.style.color = finalHue.hex;
  finalHueName.style.textShadow = '0 0 40px ' + finalHue.hex + '84';
  
  document.getElementById('final-hue-desc').textContent = finalHue.description;
  document.getElementById('aurascope-text').textContent = auraData.aurascope;
  document.getElementById('mantra-text').textContent = '"' + auraData.mantra + '"';
  
  // Show results screen
  show('screen-results');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ──────────────────────────────────────────────────────────────────────────
// EMAIL & RESET
// ──────────────────────────────────────────────────────────────────────────

document.getElementById('btn-email').addEventListener('click', function() {
  if(!auraData) return;
  
  var h = auraData.subHues;
  var f = auraData.finalHue;
  var lineBreak = '\\n';
  var bar = '='.repeat(50);
  
  var emailBody = [
    '✦  YOUR LIVING AURA READING  ✦',
    'Channeled for: ' + userName,
    lineBreak,
    bar + 'THREE AURIC SUB-FREQUENCIES' + bar,
    lineBreak,
    '◈  ' + h[0].name.toUpperCase() + '    ' + h[0].frequency + ' Hz  ·  ' + h[0].element + '  ·  ' + h[0].emotion,
    lineBreak,
    '    ' + h[0].description,
    lineBreak,
    '◈  ' + h[1].name.toUpperCase() + '    ' + h[1].frequency + ' Hz  ·  ' + h[1].element + '  ·  ' + h[1].emotion,
    lineBreak,
    '    ' + h[1].description,
    lineBreak,
    '◈  ' + h[2].name.toUpperCase() + '    ' + h[2].frequency + ' Hz  ·  ' + h[2].element + '  ·  ' + h[2].emotion,
    lineBreak,
    '    ' + h[2].description,
    lineBreak,
    bar + 'YOUR SIGNATURE AURA: ' + f.name.toUpperCase() + bar,
    lineBreak,
    f.description,
    lineBreak,
    bar + 'YOUR AURASCOPE' + bar,
    lineBreak,
    auraData.aurascope,
    lineBreak,
    bar + 'YOUR SACRED MANTRA' + bar,
    lineBreak,
    '"' + auraData.mantra + '"',
    lineBreak,
    '✦  ✦  ✦',
    'Channeled through Aurascope — the living aura oracle'
  ].join(lineBreak);
  
  var mailLink = document.createElement('a');
  mailLink.href = 'mailto:' + encodeURIComponent(userEmail) + '?subject=' + encodeURIComponent('✦ Your Aurascope: ' + f.name + ' — A Reading for ' + userName) + '&body=' + encodeURIComponent(emailBody);
  mailLink.click();
  
  document.getElementById('email-status').textContent = '✦ Opening your email client with the full reading...';
});

document.getElementById('btn-reset').addEventListener('click', function() {
  auraData = null;
  document.getElementById('inp-name').value = '';
  document.getElementById('inp-email').value = '';
  document.getElementById('email-status').textContent = '';
  document.getElementById('intro-error').textContent = '';
  show('screen-intro');
  window.scrollTo({ top: 0 });
});
</script>
</body>
</html>`;

// ────────────────────────────────────────────────────────────────────────────
// SERVE APPLICATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Serve the embedded HTML UI for all routes
 */
app.get("*", (req, res) => {
  res.send(HTML);
});

// ────────────────────────────────────────────────────────────────────────────
// START SERVER
// ────────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║  🌟  AURASCOPE: Real-Time Digital Aura Generator                  ║
║                                                                    ║
║  ✦ Server running on http://localhost:${PORT}                        ║
║  ✦ API endpoint: POST /api/reading                                 ║
║  ✦ Database: Claude AI (Anthropic)                                ║
║                                                                    ║
║  Ready to reveal your aura...                                     ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
  `);
});
