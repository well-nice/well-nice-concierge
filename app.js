require('dotenv').config();
const express = require('express');
const cors = require('cors');
const conciergeRoutes = require('./routes/conciergeRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Logging middleware (optional, but helpful for debugging)
app.use((req, res, next) => {
  if (process.env.DEBUG === 'true') {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Mount API routes
app.use('/api', conciergeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.send('Well Nice Concierge is running beautifully.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({
    type: 'error',
    message: 'Something went elegantly wrong.'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Well Nice Concierge server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

module.exports = app;
