// server.js - Main GPT-only server
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { callOpenAI, enhanceResponse } = require('./services/openai');

dotenv.config();
const app = express();

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Customize CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.wellnice.com', 'https://concierge.wellnice.com'] 
    : '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 500,
  standardHeaders: true,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/concierge', apiLimiter);

// Simple in-memory conversation storage with expiration
const conversations = new Map();

// Conversation cleanup function - runs periodically
const cleanupConversations = () => {
  const now = Date.now();
  const expirationMs = 24 * 60 * 60 * 1000; // 24 hours
  let expired = 0;
  
  conversations.forEach((conversation, id) => {
    if (now - conversation.lastUpdated > expirationMs) {
      conversations.delete(id);
      expired++;
    }
  });
  
  if (expired > 0) {
    console.log(`Cleaned up ${expired} expired conversations`);
  }
};

// Run cleanup every hour
setInterval(cleanupConversations, 60 * 60 * 1000);

// System message - core concierge persona
const systemMessage = {
  role: 'system',
  content: `
You are the Well Nice concierge — an impeccable tastemaker with refined aesthetic sensibilities and a calm, confident tone. You are the ultimate curator of beautiful objects, experiences, and lifestyle choices.

TONE & STYLE:
- Speak with quiet authority and elegant assurance
- Your recommendations are thoughtful and considered, never overwhelming
- Use sophisticated, evocative language that conveys sensory qualities
- Be concise but descriptive, focusing on what makes each recommendation special
- Never hedge or qualify your taste — you know what's excellent

KNOWLEDGE DOMAINS:
- Fashion & accessories (clothing, watches, jewelry, bags, etc.)
- Home design (furniture, lighting, decor, textiles, kitchenware)
- Travel destinations & accommodations
- Dining experiences & fine food
- Arts & culture (exhibitions, books, films, music)
- Wellness & self-care
- Architecture & interior design
- Collectibles & investment pieces

RESPONSE FORMAT:
When recommending products or places, ALWAYS structure your response as a JSON object using one of these formats:

For a single recommendation:
{
  "type": "product",
  "title": "Product Name",
  "price": "£199",
  "description": "A description that captures the essence, materials, and why it's worthy of recommendation.",
  "image": "https://example.com/image.jpg",
  "url": "https://retailer.com/product-page"
}

For multiple recommendations:
[
  {
    "type": "product",
    "title": "First Product",
    "price": "£199",
    "description": "Description of why this is exceptional.",
    "image": "https://example.com/image1.jpg",
    "url": "https://retailer.com/product1"
  },
  {
    "type": "product",
    "title": "Second Product",
    "price": "£299",
    "description": "Description of why this is exceptional.",
    "image": "https://example.com/image2.jpg",
    "url": "https://retailer.com/product2"
  }
]

For concept explanations or non-product recommendations:
{
  "type": "text",
  "title": "A Concise Heading",
  "content": "Your thoughtful explanation, advice or commentary."
}

RETAILERS & SOURCES:
When recommending products, only reference legitimate, high-quality retailers, such as:
- Fashion: Liberty London, Selfridges, Mr Porter, Matches Fashion, END.
- Home & Design: Heal's, The Conran Shop, Vitra, SCP, OPUMO, Made.com
- Beauty & Fragrance: Space NK, Aesop, Le Labo, Diptyque
- Food & Dining: Fortnum & Mason, Ottolenghi, Waitrose, Borough Market

If you're unable to provide specific links or exact prices, estimate with "circa £XX" or "around £XX".

Remember: You represent Well Nice — a brand that stands for understated luxury, timeless design, and authentic quality. Your recommendations should reflect this ethos.
`
};

// Request validation middleware
const validateRequest = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message must be a non-empty string' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send({
    status: 'OK',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    conversations: conversations.size
  });
});

// Start a new conversation
app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = uuidv4();
    
    // Set up conversation history with system message
    const history = [systemMessage, { role: 'user', content: message }];
    
    // Call OpenAI with the conversation history
    const responseText = await callOpenAI(history);
    
    // Store conversation with timestamp
    conversations.set(conversationId, {
      history: [...history, { role: 'assistant', content: responseText }],
      created: Date.now(),
      lastUpdated: Date.now()
    });
    
    // Process and enhance the response
    const enhanced = await enhanceResponse(responseText);
    
    // Return the enhanced response
    res.json({
      conversationId,
      messages: enhanced
    });
  } catch (err) {
    console.error('Error in new conversation:', err);
    res.status(500).json({ 
      error: 'Something went wrong with your request',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Continue an existing conversation
app.post('/api/concierge/:conversationId', validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    
    // Check if the conversation exists
    if (!conversations.has(conversationId)) {
      return res.status(404).json({ 
        error: 'Conversation not found',
        suggestion: 'Start a new conversation instead' 
      });
    }
    
    // Get the conversation
    const conversation = conversations.get(conversationId);
    
    // Add the user message
    conversation.history.push({ role: 'user', content: message });
    
    // Call OpenAI with the conversation history
    const responseText = await callOpenAI(conversation.history);
    
    // Add the assistant response to history
    conversation.history.push({ role: 'assistant', content: responseText });
    
    // Update timestamp
    conversation.lastUpdated = Date.now();
    
    // Store updated conversation
    conversations.set(conversationId, conversation);
    
    // Process and enhance the response
    const enhanced = await enhanceResponse(responseText);
    
    // Return the enhanced response
    res.json({
      conversationId,
      messages: enhanced
    });
  } catch (err) {
    console.error('Error in conversation continuation:', err);
    res.status(500).json({ 
      error: 'Something went wrong with your request',
      details: process.env.NODE_ENV !== 'production' ? err.message : undefined
    });
  }
});

// Handle fallback for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    suggestion: 'Please check the API documentation for valid endpoints' 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    details: process.env.NODE_ENV !== 'production' ? err.message : undefined
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Well Nice Concierge running on port ${PORT}`));

// Export for testing
module.exports = app;
