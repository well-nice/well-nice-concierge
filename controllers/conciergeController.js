const { getWellNiceResponse } = require('../services/aiService');

// Main concierge handler
exports.getConciergeResponse = async (req, res) => {
  try {
    const { query, conversationHistory = [] } = req.body;
    
    // Get AI response with Well Nice sensibility
    const response = await getWellNiceResponse(query, conversationHistory);
    
    res.status(200).json({
      type: 'text_response',
      message: response
    });
  } catch (error) {
    console.error('Concierge API Error:', error);
    res.status(500).json({ 
      type: 'error',
      message: 'Something went wrong, elegantly of course.'
    });
  }
};

// Simple greeting endpoint
exports.getGreeting = (req, res) => {
  const hour = new Date().getHours();
  let greeting = "Good day";
  
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  
  res.json({ 
    greeting: `${greeting}. Tell me what you're after and I'll go find it.` 
  });
};
