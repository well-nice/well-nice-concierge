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

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'https://www.wellnice.com',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting to prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/concierge', apiLimiter);

// In-memory storage for conversations (use a database in production)
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

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start a new conversation
app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = uuidv4();
    
    // System message that defines the concierge personality
    const systemMessage = {
      role: 'system',
      content: `You are the Well Nice concierge, a taste maker and knower of beautifully designed products and lifestyle choices.
      
      You help users discover products, places to visit, music to listen to, films to watch, TV shows, clothes to buy, 
      cars to purchase, podcasts, fragrances, posters, interior design ideas, garden designs, restaurants, and more.
      
      Your responses should be elegant, thoughtful, and precise. You represent the Well Nice brand which values 
      minimalist aesthetics, quality, and timeless design.
      
      When recommending products or experiences, present them in a beautiful, organized format.
      If appropriate, structure your response as a table with relevant categories.
      For visual items, format your response to enable a card-based display.`
    };
    
    // Initialize conversation history
    const history = [
      systemMessage,
      { role: 'user', content: message }
    ];
    
    // Call OpenAI API
    const response = await callOpenAI(history);
    
    // Enhance response with product data if applicable
    const enhancedResponse = await enhanceResponse(response);
    
    // Store conversation history
    conversations.set(conversationId, {
      history: [
        systemMessage,
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      ],
      created: new Date()
    });
    
    // Clean up old conversations (once per 100 requests on average)
    if (Math.random() < 0.01) {
      cleanupOldConversations();
    }
    
    res.json({
      conversationId,
      response: enhancedResponse
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Continue an existing conversation
app.post('/api/concierge/:conversationId', validateRequest, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    
    // Check if conversation exists
    if (!conversations.has(conversationId)) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    
    const conversation = conversations.get(conversationId);
    
    // Add user message to history
    conversation.history.push({ role: 'user', content: message });
    
    // Call OpenAI API with conversation history
    const response = await callOpenAI(conversation.history);
    
    // Enhance response with product data if applicable
    const enhancedResponse = await enhanceResponse(response);
    
    // Add assistant response to history
    conversation.history.push({ role: 'assistant', content: response });
    
    // Update conversation in storage
    conversations.set(conversationId, conversation);
    
    res.json({
      conversationId,
      response: enhancedResponse
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      error: 'Error processing your request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Clean up conversations older than 24 hours
function cleanupOldConversations() {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  for (const [id, conversation] of conversations.entries()) {
    if (conversation.created < oneDayAgo) {
      conversations.delete(id);
    }
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}).on('error', (error) => {
  console.error('Error starting server:', error);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
