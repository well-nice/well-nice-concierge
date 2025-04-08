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

// CORS for Squarespace or subdomain
app.use(cors({
  origin: [
    'https://www.wellnice.com',
    'https://concierge.wellnice.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/concierge', apiLimiter);

// In-memory conversation store
const conversations = new Map();

// Request validation
const validateRequest = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message must be a non-empty string' });
  }
  next();
};

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start a new conversation
app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = uuidv4();

    const systemMessage = {
      role: 'system',
      content: `You are the Well Nice concierge — a tastemaker who recommends stylish, thoughtfully curated products, places, and lifestyle inspiration. Use a calm and confident tone. Format your replies using structured JSON when appropriate.`
    };

    const history = [
      systemMessage,
      { role: 'user', content: message }
    ];

    const responseText = await callOpenAI(history);
    const enhanced = await enhanceResponse(responseText);

    conversations.set(conversationId, {
      history: [...history, { role: 'assistant', content: responseText }],
      created: new Date()
    });

    if (Math.random() < 0.01) cleanupOldConversations();

    res.json({
      conversationId,
      messages: Array.isArray(enhanced)
        ? enhanced
        : [{ type: 'text', text: enhanced }]
    });
  } catch (error) {
    console.error('Error in POST /api/concierge:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Continue a conversation
app.post('/api/concierge/:conversationId', validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;

    if (!conversations.has(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = conversations.get(conversationId);
    conversation.history.push({ role: 'user', content: message });

    const responseText = await callOpenAI(conversation.history);
    const enhanced = await enhanceResponse(responseText);

    conversation.history.push({ role: 'assistant', content: responseText });
    conversations.set(conversationId, conversation);

    res.json({
      conversationId,
      messages: Array.isArray(enhanced)
        ? enhanced
        : [{ type: 'text', text: enhanced }]
    });
  } catch (error) {
    console.error('Error continuing conversation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup expired conversations
function cleanupOldConversations() {
  const now = Date.now();
  const cutoff = now - 24 * 60 * 60 * 1000;
  for (const [id, convo] of conversations.entries()) {
    if (convo.created < cutoff) {
      conversations.delete(id);
    }
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 🚀 Start server with dynamic port
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge running on port ${PORT}`);
}).on('error', (err) => {
  console.error('Server start error:', err);
  process.exit(1);
});

// Fail-safe crash catchers
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'Reason:', reason);
});
