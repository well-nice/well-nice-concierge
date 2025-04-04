const express = require('express');
const router = express.Router();
const { 
  getConciergeResponse, 
  getProductResults 
} = require('../controllers/conciergeController');

// Original endpoint
router.post('/query', getConciergeResponse);

// New enhanced endpoint for product search and chat
router.post('/concierge', getProductResults);

module.exports = router;
