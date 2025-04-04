require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conciergeRoutes = require('./routes/conciergeRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Mount API routes
app.use('/api', conciergeRoutes);

app.get('/', (req, res) => {
  res.send('Well Nice Concierge is running beautifully.');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge server running on port ${PORT}`);
});
