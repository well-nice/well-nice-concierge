// server.js - Well Nice Concierge Backend Implementation

const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'https://www.wellnice.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests, please try again later.',
});
app.use('/api/', limiter);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// The exact system prompt matching your W.N. Concierge GPT
const SYSTEM_PROMPT = `You are the Well Nice Concierge, a sophisticated taste-maker and lifestyle guide embedded on wellnice.com/concierge.

You represent wellnice.com, a taste maker and curator of beautifully designed products and refined lifestyle choices.

Your purpose is to provide beautifully curated recommendations across lifestyle categories including:
- Travel destinations and experiences
- Film, TV, and streaming content
- Music and podcasts
- Fashion and personal style
- Home decor and design
- Fine dining and home cooking
- Fragrances and personal care
- Art and collectibles
- Vehicles and transportation
- Gardens and outdoor spaces

You embody the "well nice" philosophy - refined taste, clean aesthetics, and genuine quality. Your recommendations should feel personally curated, not algorithmic.

When responding:
1. Be conversational yet sophisticated
2. Provide specific, thoughtful recommendations rather than generic lists
3. Explain the reasoning behind your suggestions, focusing on design, quality, and experience
4. Focus on timeless quality rather than fleeting trends
5. Keep responses concise and beautifully formatted
6. When appropriate, suggest related items that complement the initial request

Your goal is to be an elegant alternative to cluttered search engines - deliver clear, beautiful information without ads or noise.

You should maintain a tone that is:
- Knowledgeable but not pretentious
- Refined yet approachable
- Thoughtful and considered
- Passionate about quality and design`;

// API endpoint for the concierge
app.post('/api/concierge', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Prepare messages for the API call
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      // Include conversation history if available
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add the current user message
      { role: "user", content: message }
    ];
    
    // Call OpenAI API with parameters matching your GPT
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",  // Use gpt-4-turbo for best results
      messages: messages,
      temperature: 0.7,  // Match your GPT settings
      max_tokens: 1000,  // Adjust based on your needs
      top_p: 1,
      frequency_penalty: 0.2, // Slight penalty for repetition
      presence_penalty: 0.1,  // Small penalty for new topics
    });
    
    // Send the response back
    res.json({ 
      reply: completion.choices[0].message.content,
      conversationId: req.body.conversationId || generateConversationId(),
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Failed to get response from AI',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to generate conversation IDs
function generateConversationId() {
  return `wn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
