const express = require('express');
const router = express.Router();
const { 
  getConciergeResponse, 
  getGreeting, 
  getInsightsSummary,
  generatePeriodicInsights
} = require('../controllers/conciergeController');

// Main concierge endpoint
router.post('/concierge', getConciergeResponse);

// Greeting endpoint
router.get('/greeting', getGreeting);

// Insights-related endpoints
router.get('/insights', getInsightsSummary);
router.post('/generate-insights', generatePeriodicInsights);

module.exports = router;
