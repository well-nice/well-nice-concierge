const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

module.exports = { generateGPTRecommendation };