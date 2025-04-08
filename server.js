// server.js - Main server file
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { callOpenAI, enhanceResponse } = require('./services/openai');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for Squarespace + Subdomain if needed
app.use(cors({
  origin: [
    'https://www.wellnice.com',
    'https://concierge.wellnice.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limit to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests, please try again later.'
});
app.use('/api/concierge', apiLimiter);

// In-memory session store (simple for now)
const conversations = new Map();

// Request validation
const validateRequest = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({
      error: 'Invalid request: "message" must be a non-empty string'
    });
  }
  next();
};

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start new conversation
app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = uuidv4();

    const systemMessage = {
      role: 'system',
      content: `You are the Well Nice concierge — a stylist, personal shopper, and design-led taste maker.

You recommend timeless products, places to visit, playlists, interiors, clothes, prints, and lifestyle pieces with charm and taste.

Use elegant, editorial language. When you recommend something visual (like a product), return it in the following structured JSON format:

{
  "type": "product",
  "title": "Object Name",
  "price": "£Price",
  "description": "Brief but stylish description.",
  "image": "https://example.com/image.jpg",
  "url": "https://example.com/product-page"
}

All non-product replies should use:
{ "type": "text", "text": "Reply here." }

You represent a clean, premium, well-curated brand and respond with grace, clarity, and good design.`
    };

    const history = [
      systemMessage,
      { role: 'user', content: message }
    ];

    const rawResponse = await callOpenAI(history);
    const enhancedResponse = await enhanceResponse(rawResponse);

    conversations.set(conversationId, {
      history: [...history, { role: 'assistant', content: rawResponse }],
      created: new Date()
    });

    if (Math.random() < 0.01) cleanupOldConversations();

    res.json({
      conversationId,
      messages: Array.isArray(enhancedResponse)
        ? enhancedResponse
        : [{ type: 'text', text: enhancedResponse }]
    });

  } catch (error) {
    console.error('Error in /api/concierge:', error);
    res.status(500).json({
      error: 'Something went wrong. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Continue existing conversation
app.post('/api/concierge/:conversationId', validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!conversations.has(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversations.get(conversationId);
    conversation.history.push({ role: 'user', content: message });

    const rawResponse = await callOpenAI(conversation.history);
    const enhancedResponse = await enhanceResponse(rawResponse);

    conversation.history.push({ role: 'assistant', content: rawResponse });
    conversations.set(conversationId, conversation);

    res.json({
      conversationId,
      messages: Array.isArray(enhancedResponse)
        ? enhancedResponse
        : [{ type: 'text', text: enhancedResponse }]
    });

  } catch (error) {
    console.error('Error continuing conversation:', error);
    res.status(500).json({
      error: 'Something went wrong. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clean up old conversations
function cleanupOldConversations() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  for (const [id, convo] of conversations.entries()) {
    if (convo.created < cutoff) conversations.delete(id);
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Boot server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server start error:', err);
  process.exit(1);
});

// Exit safety
process.on('uncaughtException', err => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', promise, 'Reason:', reason);
});
