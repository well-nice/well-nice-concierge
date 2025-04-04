const express = require('express');
const router = express.Router();
const { getConciergeResponse, getGreeting } = require('../controllers/conciergeController');

// Main concierge endpoint
router.post('/concierge', getConciergeResponse);

// Greeting endpoint
router.get('/greeting', getGreeting);

module.exports = router;
