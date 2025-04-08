const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Configure OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Middleware
app.use(cors({
  origin: ['https://www.wellnice.com', 'http://localhost:3000'] // Add your domains
}));
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Well Nice Concierge API is running');
});

// Concierge API endpoint
app.post('/api/concierge', async (req, res) => {
  try {
    const { message, conversationHistory } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Format messages for OpenAI
    const messages = [
      { 
        role: 'system', 
        content: `You are the Well Nice Concierge, a sophisticated and knowledgeable assistant for wellnice.com. You provide curated recommendations for beautifully designed products and lifestyle choices. 

Your expertise includes:
- Interior design and home decor
- Fashion and style
- Travel destinations
- Film, TV, and music recommendations
- Food and restaurants
- Fragrances and personal care
- Art and design

Be concise but thorough. Format product recommendations in numbered lists with product names, prices (when possible), and brief descriptions. Highlight what makes each recommendation special.

When asked about products, include a brief reason why each recommendation is well-designed or exceptional.
        `
      }
    ];
    
    // Add conversation history
    if (conversationHistory && Array.isArray(conversationHistory)) {
      messages.push(...conversationHistory);
    }
    
    // Add user's current message
    messages.push({ role: 'user', content: message });
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4",  // Use the appropriate model
      messages: messages,
      max_tokens: 1000,
      temperature: 0.7,
    });
    
    // Send response
    res.json({ 
      reply: completion.choices[0].message.content,
      usage: completion.usage
    });
    
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({ 
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Well Nice Concierge API listening on port ${port}`);
});
