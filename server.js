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

// CORS configuration (support your main site & subdomain frontend)
app.use(cors({
  origin: [
    'https://www.wellnice.com',
    'https://concierge.wellnice.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/concierge', apiLimiter);

// In-memory conversation store (consider Redis/DB in production)
const conversations = new Map();

// Request validation middleware
const validateRequest = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ 
      error: 'Invalid request: message is required and must be a non-empty string' 
    });
  }
  next();
};

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Start a new conversation
app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = uuidv4();

    const systemMessage = {
      role: 'system',
      content: `You are the Well Nice concierge — a tastemaker and knower of beautifully designed products and lifestyle choices.

You help users discover products, places to visit, music to listen to, films to watch, clothes to buy, cars to purchase, podcasts, fragrances, interior design ideas, restaurants, and more.

Your responses are elegant, witty, thoughtful, and helpful. Well Nice values timeless design, good taste, and quiet charisma.

Use a warm, personal tone — and format product suggestions as structured card-style JSON blocks.`
    };

    const history = [
      systemMessage,
      { role: 'user', content: message }
    ];

    const response = await callOpenAI(history);
    const enhancedResponse = await enhanceResponse(response);

    conversations.set(conversationId, {
      history: [...history, { role: 'assistant', content: response }],
      created: new Date()
    });

    if (Math.random() < 0.01) cleanupOldConversations();

    res.json({
      conversationId,
      messages: Array.isArray(enhancedResponse)
        ? enhancedResponse
        : [{ type: "text", text: enhancedResponse }]
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error processing your request',
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

    const response = await callOpenAI(conversation.history);
    const enhancedResponse = await enhanceResponse(response);

    conversation.history.push({ role: 'assistant', content: response });
    conversations.set(conversationId, conversation);

    res.json({
      conversationId,
      messages: Array.isArray(enhancedResponse)
        ? enhancedResponse
        : [{ type: "text", text: enhancedResponse }]
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clean up conversations older than 24h
function cleanupOldConversations() {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [id, convo] of conversations.entries()) {
    if (convo.created < oneDayAgo) conversations.delete(id);
  }
}

// Error middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

// Crash safety
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
