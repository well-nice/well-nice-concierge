const { generateGPTRecommendation } = require('../services/aiService');
const { fetchPreviewData } = require('../services/scraperService');

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