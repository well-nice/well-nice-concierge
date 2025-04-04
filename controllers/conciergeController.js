const { getWellNiceResponse, insightsLearner } = require('../services/aiService');

// Conversation state management
const conversationStates = new Map();

// Main concierge handler
exports.getConciergeResponse = async (req, res) => {
  try {
    const { query, sessionId } = req.body;
    
    // Retrieve or create conversation state
    let conversationState = conversationStates.get(sessionId) || {
      history: [],
      stage: null
    };

    // Get AI response with Well Nice sensibility
    const response = await getWellNiceResponse(query);
    
    // Update conversation history
    conversationState.history.push(
      { role: 'user', content: query },
      { role: 'assistant', content: response.message }
    );
    
    // Update or create conversation state
    conversationStates.set(sessionId, {
      history: conversationState.history,
      stage: response.type
    });

    // Prepare response payload
    const responsePayload = {
      type: response.type,
      message: response.message
    };

    // Add products if available
    if (response.products && response.products.length > 0) {
      responsePayload.products = response.products.map(product => ({
        title: product.title,
        description: product.description,
        url: product.url,
        image: product.image,
        price: product.price,
        insightScore: product.insightScore
      }));
    }

    // Optionally include insights for advanced frontend uses
    if (response.insights) {
      responsePayload.insights = response.insights;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Concierge API Error:', error);
    res.status(500).json({ 
      type: 'error',
      message: 'Something went wrong, elegantly of course.'
    });
  }
};

// Endpoint to retrieve accumulated insights
exports.getInsightsSummary = async (req, res) => {
  try {
    const insights = insightsLearner.generateInsightsSummary();
    res.status(200).json(insights);
  } catch (error) {
    console.error('Insights retrieval error:', error);
    res.status(500).json({ 
      type: 'error',
      message: 'Could not retrieve insights at this moment.'
    });
  }
};

// Periodic insights generation (could be triggered by a scheduled job)
exports.generatePeriodicInsights = async (req, res) => {
  try {
    const insights = await insightsLearner.generateInsightsSummary();
    
    // Optional: You could implement additional processing or storage here
    console.log('Periodic Insights Generated:', insights);
    
    res.status(200).json({
      message: 'Insights generated successfully',
      insights
    });
  } catch (error) {
    console.error('Periodic insights generation error:', error);
    res.status(500).json({ 
      type: 'error',
      message: 'Could not generate insights.'
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
    greeting: `${greeting}. What refined pursuit shall we embark upon today?` 
  });
};
