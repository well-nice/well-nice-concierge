require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conciergeRoutes = require('./routes/conciergeRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', conciergeRoutes);

// Greeting endpoint for the concierge
app.get('/api/greeting', (req, res) => {
  const hour = new Date().getHours();
  let greeting = "Good day";
  
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  
  res.json({ 
    greeting: `${greeting}. Tell me what you're after and I'll go find it.` 
  });
});

app.get('/', (req, res) => {
  res.send('Well Nice Concierge is running beautifully.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge server running on port ${PORT}`);
});
