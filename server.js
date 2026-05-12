const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head><title>Real-Time Digital Aurascope</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 50px; background: #0a0a1a; color: #c084fc;">
        <h1>✨ Real-Time Digital Aurascope</h1>
        <p>Your aura reading API is live.</p>
      </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
