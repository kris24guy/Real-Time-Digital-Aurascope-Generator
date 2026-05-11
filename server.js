const express = require("express");
const app = express();

app.use(express.json());

// --- AuraScope core placeholder ---
// You can swap this with your full zodiac + stones + POS/NEU/NEG engine later.
function generateAuraSpanse(birthdate) {
  const now = new Date();

  // Simple deterministic variation based on birthdate string
  const day = new Date(birthdate).getDate() || 1;
  const mod = day % 3;

  let pos;
  let neu;
  let neg;

  if (mod === 0) {
    pos = "There’s a gentle opening in you today — something feels a bit easier to move toward than before.";
    neu = "Most of you feels steady and observant, just taking things in without pushing too hard.";
    neg = "There’s a soft inward weight sitting in the background, not overwhelming but still present.";
  } else if (mod === 1) {
    pos = "There’s a quiet sense of motivation waking up in you, like a small part of you wants to move forward.";
    neu = "You feel in-between — not fully activated, not shut down, just processing what’s in front of you.";
    neg = "Some tension sits underneath the surface, as if there’s something you haven’t fully said or finished yet.";
  } else {
    pos = "Your energy leans toward connection today — more open to people or ideas than you might expect.";
    neu = "Emotionally you feel balanced enough to watch things play out without rushing to react.";
    neg = "There’s a bit of emotional heaviness hanging around, like a thought or feeling you keep circling back to.";
  }

  const finalAura =
    "A blended emotional field shifting between openness, observation, and quiet tension — something in you is still adjusting rather than fully settled.";

  return {
    timestamp: now.toISOString(),
    birthdate,
    pos,
    neu,
    neg,
    finalAura,
    residualEcho: "This may continue to shift quietly over the next little while."
  };
}

// --- HTTP endpoint ---

app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "AuraSpanse server is running" });
});

app.post("/aurascope", (req, res) => {
  const { birthdate } = req.body || {};

  if (!birthdate) {
    return res.status(400).json({ error: "birthdate is required (YYYY-MM-DD)" });
  }

  try {
    const result = generateAuraSpanse(birthdate);
    res.json(result);
  } catch (err) {
    console.error("AuraSpanse error", err);
    res.status(500).json({ error: "Failed to generate AuraScope reading" });
  }
});

// NEW: Registration endpoint for Step 1
app.post("/register", (req, res) => {
  const { email, name } = req.body || {};

  if (!email) {
    return res.status(400).json({ error: "email is required" });
  }

  const sessionId = `session_${Date.now()}`;

  console.log("New registration:", { email, name, sessionId });

  return res.json({
    success: true,
    sessionId,
    message: "Registration successful"
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AuraSpanse server running on port ${PORT}`);
});
