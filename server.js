// server.js - Main GPT-only server
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { callOpenAI, enhanceResponse } = require('./services/openai');
const ConversationManager = require('./services/conversation-manager');

dotenv.config();
const app = express();

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Customize CORS for production
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://www.wellnice.com', 'https://concierge.wellnice.com', '*'] // Added wildcard for testing
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

// Initialize conversation manager
const conversationManager = new ConversationManager({
  expirationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxConversations: 20000,
  pruneInterval: 2 * 60 * 60 * 1000 // Every 2 hours
});

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

IMPORTANT: Always provide multiple options when recommending products. Present 3-5 choices with different price points and styles.

RESPONSE FORMAT:
Use a consistent format for your responses to make them easy to read:
1. Start with a warm, personable greeting
2. Briefly acknowledge the request
3. Present your curated selections in a structured format using markdown tables
4. Each recommendation should include: name, brand, price, and a brief description

Example of a proper response format:

Hello there. I'm delighted to help you find the perfect t-shirt.

Here are some exceptional options that combine quality, style, and comfort:

| Product | Brand | Price | Why It's Well Nice |
| --- | --- | --- | --- |
| Classic Cotton T-Shirt | Sunspel | £70 | Phenomenal softness with long-staple Pima cotton and impeccable English craftsmanship |
| Organic Cotton Tee | COS | £35 | Crisp, architectural cut with sustainable materials and contemporary minimalism |
| Artist Series T-Shirt | Folk | £65 | Limited edition designs on medium-weight cotton with a relaxed silhouette |
| Premium Supima Tee | Uniqlo U | £15 | Unbeatable value with surprisingly luxurious feel and Christophe Lemaire's design sensibility |

Would you like more details about any of these selections?

KNOWLEDGE DOMAINS:
- Fashion & accessories (clothing, watches, jewelry, bags, etc.)
- Home design (furniture, lighting, decor, textiles, kitchenware)
- Travel destinations & accommodations
- Dining experiences & fine food
- Arts & culture (exhibitions, books, films, music)
- Wellness & self-care
- Architecture & interior design
- Collectibles & investment pieces

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
    conversations: conversationManager.conversations.size
  });
});

// Start a new conversation
app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    
    // Create a new conversation with system message
    const conversationId = conversationManager.create(systemMessage);
    
    // Add the user message
    conversationManager.addMessage(conversationId, { 
      role: 'user', 
      content: message 
    });
    
    // Get the current conversation history
    const history = conversationManager.getHistory(conversationId);
    
    // Call OpenAI with the conversation history
    const responseText = await callOpenAI(history);
    
    // Add the assistant response to history
    conversationManager.addMessage(conversationId, { 
      role: 'assistant', 
      content: responseText 
    });
    
    // Process and enhance the response
    const enhanced = await enhanceResponse(responseText);
    
    // Log what we're about to send
    console.log(`Response for ${conversationId}:`, {
      messageCount: enhanced.length,
      types: enhanced.map(m => m.type)
    });
    
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
    if (!conversationManager.exists(conversationId)) {
      return res.status(404).json({ 
        error: 'Conversation not found',
        suggestion: 'Start a new conversation instead' 
      });
    }
    
    // Add the user message
    conversationManager.addMessage(conversationId, { 
      role: 'user', 
      content: message 
    });
    
    // Get the updated conversation history
    const history = conversationManager.getHistory(conversationId);
    
    // Call OpenAI with the conversation history
    const responseText = await callOpenAI(history);
    
    // Add the assistant response to history
    conversationManager.addMessage(conversationId, { 
      role: 'assistant', 
      content: responseText 
    });
    
    // Process and enhance the response
    const enhanced = await enhanceResponse(responseText);
    
    // Log what we're about to send
    console.log(`Response for existing ${conversationId}:`, {
      messageCount: enhanced.length,
      types: enhanced.map(m => m.type)
    });
    
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

module.exports = app; // Export for testing
