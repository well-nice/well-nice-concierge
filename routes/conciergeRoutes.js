const express = require('express');
const router = express.Router();
const conciergeController = require('../controllers/conciergeController');

/**
 * Well Nice Concierge API Routes
 * 
 * Defines the API endpoints for the Well Nice concierge service
 */

/**
 * @route POST /api/concierge
 * @description Process a message from the user
 * @access Public
 */
router.post('/concierge', conciergeController.processMessage);

/**
 * @route POST /api/search
 * @description Search for products based on user request
 * @access Public
 */
router.post('/search', conciergeController.searchProducts);

/**
 * @route POST /api/recommendations
 * @description Get product recommendations based on category and preferences
 * @access Public
 */
router.post('/recommendations', conciergeController.getRecommendations);

/**
 * @route GET /api/greeting
 * @description Get a contextual greeting
 * @access Public
 */
router.get('/greeting', (req, res) => {
  const greetings = [
    "Welcome to Well Nice. How might I assist you today?",
    "Good day. I'm here to help you discover beautiful things.",
    "Hello. I'm your Well Nice concierge, ready to assist with your design needs."
  ];
  
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  
  res.status(200).json({ 
    success: true, 
    greeting 
  });
});

/**
 * @route GET /api/health
 * @description Health check endpoint
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Well Nice Concierge is running' 
  });
});

module.exports = router;
