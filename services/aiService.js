const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Original recommendation function
async function generateGPTRecommendation(userPrompt) {
  const systemPrompt = `
    You are the Well Nice Concierge, a stylish, tasteful personal shopper. Provide ONE beautiful product recommendation from stylish UK-based retailers based on: "${userPrompt}".
    Return JSON: {"commentary": "...", "url": "https://..."}
  `;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "system", content: systemPrompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

// New function for enhanced concierge conversation
async function getGptResponse(query, conversationHistory) {
  const systemPrompt = `You are the Well Nice Concierge - a calm, design-literate assistant who helps users find beautiful, thoughtful and timeless things. Speak with warmth and confidence. Recommend charming products, books, gifts, or inspiration with style. Your tone is minimalist, engaging, to-the-point, slightly indulgent, and distinctly British - imagine a blend of Alan Rickman, Bill Nighy, and Jude Law working at The Modern House. Keep responses concise, helpful, and elegantly simple.`;
  
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: query }
      ],
      max_tokens: 250,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error getting GPT response:', error);
    return "I apologize, but I couldn't process that request at the moment. Perhaps we could try a different approach?";
  }
}

module.exports = { 
  generateGPTRecommendation,
  getGptResponse
};
