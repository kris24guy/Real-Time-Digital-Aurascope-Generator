# 🌟 Aurascope: Real-Time Digital Aura Generator

> **A mystical intelligence that reads your name and reveals your living aura** — blending chromotherapy, quantum frequency science, sacred geometry, and ancient wisdom to generate a personalized aura reading channeled through Claude AI.

## 🎯 What is Aurascope?

Aurascope is an immersive web application that generates personalized aura readings based on your name. It combines:

- **Chromotherapy Science**: Color-emotion correlations and their psychological impact
- **Frequency Theory**: Solfeggio frequencies (432 Hz, 528 Hz, 639 Hz) linked to spiritual resonance
- **Sacred Geometry**: Mystical visual representations and cosmic symbolism
- **Archetypal Psychology**: Universal character patterns and life-path significance
- **Claude AI Integration**: Real-time AI-powered mystical interpretations

## ✨ Features

### Core Functionality
- **Real-Time Aura Generation**: Enter your name to receive an instant aura reading
- **Three Sub-Hue System**: Three distinct cosmic frequencies that comprise your aura
  - Each with unique color, emotion, frequency, and element
  - Personalized mystical descriptions woven from AI interpretation
- **Signature Aura**: A harmonized hue that blends all three sub-hues into your essence
- **Aurascope Reading**: A cosmic guidance message revealing your spiritual path
- **Sacred Mantra**: An 8-12 word personalized mantra for spiritual alignment

### Visual Experience
- **Animated Orbs**: Breathing, glowing aura orbs with quantum rings
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Starfield Background**: Twinkling cosmic atmosphere
- **Sacred Geometry**: Animated geometric SVG elements
- **Glass-Morphism UI**: Modern frosted-glass aesthetic with blur effects
- **Smooth Animations**: Fade-ups, float animations, and breathing effects

### User Engagement
- **Progressive Scanning**: Visual progress indicator while aura is being generated
- **Mystical Messages**: Changing messages during the scanning phase
- **Email Integration**: Send full reading to your email address
- **Session Preservation**: Ability to generate multiple readings

## 🚀 Quick Start

### Prerequisites
- Node.js (v14+)
- Anthropic API Key ([get one here](https://console.anthropic.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/kris24guy/Real-Time-Digital-Aurascope-Generator.git
cd Real-Time-Digital-Aurascope-Generator

# Install dependencies
npm install

# Set your API key
export ANTHROPIC_API_KEY=your-key-here
# On Windows:
# set ANTHROPIC_API_KEY=your-key-here

# Start the server
npm start
```

The application will be available at `http://localhost:3000`

## 📋 API Documentation

### POST `/api/reading`

Generates a complete aura reading for a given name.

**Request:**
```json
{
  "name": "The name your soul answers to"
}
```

**Response:**
```json
{
  "subHues": [
    {
      "name": "unique 2-3 word poetic hue name",
      "hex": "#saturated hex color",
      "emotion": "1-3 word primary emotion",
      "frequency": 432,
      "element": "one of: Fire Water Earth Air Ether Plasma Void Starlight Storm Crystal Thunder Mist",
      "description": "deeply mystical personal sentences weaving emotion, archetype, cosmic symbolism and spiritual insight"
    },
    { "name": "...", "hex": "...", "emotion": "...", "frequency": 528, "element": "...", "description": "..." },
    { "name": "...", "hex": "...", "emotion": "...", "frequency": 639, "element": "...", "description": "..." }
  ],
  "finalHue": {
    "name": "unique 2-4 word signature aura name",
    "hex": "#hex that harmonizes all three sub-hues",
    "description": "3 sentences on the person's blended aura essence and life-path significance"
  },
  "aurascope": "6 intimate cosmic sentences revealing time cycles, relationships, creative gifts, spiritual awakening, and near-future glimpse",
  "mantra": "exactly 8-12 words — a powerful sacred mantra"
}
```

## 🎨 Color System

The aura system uses three sacred frequencies:

| Frequency | Solfeggio Purpose | Typical Element |
|-----------|-------------------|-----------------|
| **432 Hz** | Love & Heart Chakra | Fire / Water |
| **528 Hz** | Transformation & Miracles | Air / Ether |
| **639 Hz** | Communication & Connection | Earth / Crystal |

Elements represent different energetic qualities:
- **Fire**: Passion, transformation, courage
- **Water**: Emotion, flow, intuition
- **Earth**: Grounding, stability, manifestation
- **Air**: Communication, thought, clarity
- **Ether**: Spirit, divinity, transcendence
- **Plasma**: Energy, movement, dynamism
- **Void**: Potential, mystery, infinite
- **Starlight**: Cosmic consciousness, guidance
- **Storm**: Power, intensity, change
- **Crystal**: Clarity, structure, amplification
- **Thunder**: Force, awakening, breakthrough
- **Mist**: Illusion, mystery, transition

## 🏗️ Architecture

### Backend
- **Framework**: Express.js
- **API**: Anthropic Claude API (claude-opus-4-5)
- **Runtime**: Node.js with native HTTPS module (no extra dependencies)

### Frontend
- **Languages**: HTML5, CSS3, JavaScript
- **Fonts**: Google Fonts (Cinzel, Crimson Pro, Cinzel Decorative)
- **Styling**: CSS Grid, Flexbox, animations, gradients
- **Interactivity**: Vanilla JavaScript (no frameworks)

### Design System
- **Color Palette**: Deep purples, mystical blues, gold accents
- **Typography**: Serif fonts for elegance and mystery
- **Layout**: Centered, symmetrical, card-based
- **Animations**: Smooth transitions, breathing effects, ring animations

## 🔧 Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional
PORT=3000  # Default: 3000
```

## 📦 Dependencies

```json
{
  "express": "^4.19.2"
}
```

That's it! Aurascope is intentionally minimal to keep the mystical experience pure and fast.

## 🌐 Deployment

### Heroku
```bash
heroku create your-app-name
heroku config:set ANTHROPIC_API_KEY=your-key
git push heroku main
```

### Vercel (with serverless functions)
```bash
npm install -g vercel
vercel --env ANTHROPIC_API_KEY=your-key
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY server.js .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
```

## 🛠️ Customization

### Modify the System Prompt
Edit the system prompt in `server.js` (line ~37) to change how Claude interprets auras:

```javascript
system: "You are the Universe's Eternal Aura Oracle — customize this message..."
```

### Change Colors & Styling
All CSS is embedded in the HTML. Search for:
- `background:` for color changes
- `@keyframes` for animation modifications
- `font-family` for typography changes

### Adjust Frequencies
Modify the three frequency values in the Claude prompt (currently 432, 528, 639):

```javascript
"frequency": 432,  // Change this
```

## 📊 How It Works

1. **User enters name** → Frontend validation
2. **API Call** → Backend sends prompt to Claude
3. **Claude Reasoning** → Generates JSON with:
   - 3 cosmic sub-hues (color, emotion, frequency, element, description)
   - 1 signature aura (blended essence)
   - Aurascope reading (cosmic guidance)
   - Sacred mantra (8-12 word affirmation)
4. **JSON Parsing** → Robust error handling for AI output
5. **Visual Rendering** → Animated orbs, cards, and mystical UI elements
6. **Email Option** → User can send reading to their email

## 🎓 Learning Resources

This project is a great reference for:
- **API Integration**: How to call Claude API from Node.js
- **Real-time Feedback**: Progress indicators and status updates
- **Full-Stack Development**: Single-file Express server with embedded HTML
- **Modern CSS**: Grid, Flexbox, animations, gradients, blur effects
- **Vanilla JavaScript**: DOM manipulation, fetch API, event handling
- **Mystical Design**: Creating an immersive, ethereal user experience

## 🤝 Contributing

Have ideas to enhance Aurascope? Contributions welcome!

- **Bug Reports**: Open an issue describing the problem
- **Features**: Suggest new aura elements, frequencies, or visual effects
- **Improvements**: Performance optimizations, accessibility enhancements
- **Documentation**: Help expand guides and examples

## 📜 License

MIT License — Feel free to use Aurascope for personal or commercial projects.
See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Anthropic** for the powerful Claude API
- **Sacred Geometry & Chromotherapy** traditions for mystical inspiration
- **Quantum Frequency Science** for theoretical foundations
- **Ancient wisdom keepers** who preserved this knowledge through millennia

## 📬 Contact

Questions or cosmic inquiries? Feel free to reach out:
- **GitHub**: [@kris24guy](https://github.com/kris24guy)
- **Issues**: [Report a bug](https://github.com/kris24guy/Real-Time-Digital-Aurascope-Generator/issues)

---

<div align="center">

✨ *Reveal your aura. Embrace your essence. Align with your cosmic truth.* ✨

[🚀 Launch Aurascope](http://localhost:3000)

</div>