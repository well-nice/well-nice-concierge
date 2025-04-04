const { generateGPTRecommendation, getGptResponse } = require('../services/aiService');
const { fetchPreviewData } = require('../services/scraperService');
const { searchProducts, formatResults } = require('../services/productService');

// Original endpoint handler
exports.getConciergeResponse = async (req, res) => {
  try {
    const userPrompt = req.body.prompt;
    const { commentary, url } = await generateGPTRecommendation(userPrompt);
    const previewData = await fetchPreviewData(url);

    res.status(200).json({
      commentary,
      product: previewData
    });

  } catch (error) {
    console.error('Concierge API Error:', error);
    res.status(500).json({ error: 'Something went wrong, elegantly of course.' });
  }
};

// New enhanced endpoint handler for product search and chat
exports.getProductResults = async (req, res) => {
  const { query, conversationHistory = [] } = req.body;
  
  try {
    // First attempt to find matching products
    const matchingProducts = await searchProducts(query);
    
    if (matchingProducts.length > 0) {
      const formattedResults = await formatResults(matchingProducts);
      
      res.json({
        type: 'product_results',
        message: `I've found a few options that might interest you:`,
        products: formattedResults
      });
    } else {
      // Fallback to GPT response
      const gptResponse = await getGptResponse(query, conversationHistory);
      
      res.json({
        type: 'text_response',
        message: gptResponse
      });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      type: 'error', 
      message: "I'm terribly sorry, but I'm having trouble processing your request at the moment." 
    });
  }
};
