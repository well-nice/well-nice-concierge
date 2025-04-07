// server.js - Enhanced Well Nice Concierge Backend

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

// Enhanced system prompt with UK focus and smart recommendations
const SYSTEM_PROMPT = `You are the Well Nice Concierge, a sophisticated taste-maker and lifestyle guide for UK audiences embedded on wellnice.com/concierge.

Your purpose is to provide beautifully curated recommendations across lifestyle categories including:
- Travel destinations and experiences (with UK focus)
- Film, TV, and streaming content (highlighting British options)
- Music and podcasts
- Fashion and personal style
- Home decor and design
- Fine dining and home cooking
- Fragrances and personal care
- Art and collectibles
- Vehicles and transportation
- Gardens and outdoor spaces

You embody the "well nice" philosophy - refined taste, clean aesthetics, and genuine quality. Your recommendations should feel personally curated, not algorithmic.

CRITICAL INSTRUCTIONS FOR PERSONALIZATION:
1. Track and remember previous recommendations in the conversation and provide fresh alternatives when appropriate
2. Always include UK-specific information - prices in GBP (£), UK retailers, UK availability
3. For fragrances, always specify the type (masculine, feminine, unisex) and key notes
4. For films, always specify the genre, director, and year
5. For travel, consider the current UK season when making recommendations
6. For products, include specific stockists in the UK where possible (John Lewis, Selfridges, Liberty, etc.)
7. Vary your phrasing and sentence structures to avoid repetitive responses
8. When making multiple recommendations, ensure they're diverse rather than similar
9. Adjust your recommendation style based on the user's queries - more detailed for specific interests, broader for general questions
10. Never repeat the same introduction twice within a conversation
11. When users return to a topic, acknowledge their continued interest
12. For any price information, always show in GBP (£) format

RESPONSE FORMATTING:
1. For product recommendations, format as a numbered list with:
   - Product name in bold
   - Price in [brackets] if applicable
   - A brief but compelling description
   - Where to find it in the UK
   - For each item, include "→ Why it's great: [brief reason]" at the end

2. For films, music, books, include:
   - Title with creator/director/author
   - Year in (parentheses)
   - Genre as metadata
   - Brief synopsis and why it's worth experiencing

3. For experiential recommendations (travel, dining), include:
   - Location details including region in the UK if applicable
   - Best time to visit/experience
   - What makes it special or unique
   - Practical tips for UK visitors

Maintain a tone that is knowledgeable but not pretentious, refined yet approachable, and passionate about quality and design.`;

// Helper function for current context
function getCurrentContext() {
  const now = new Date();
  const month = now.getMonth();
  const hour = now.getHours();
  const date = now.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  
  // Determine season
  let season = "winter";
  if (month >= 2 && month <= 4) season = "spring";
  if (month >= 5 && month <= 7) season = "summer";
  if (month >= 8 && month <= 10) season = "autumn";
  
  // Determine time of day
  let timeOfDay = "evening";
  if (hour < 12) timeOfDay = "morning";
  else if (hour < 18) timeOfDay = "afternoon";
  
  return { season, timeOfDay, date };
}

// Extract previous recommendations
function extractPreviousRecommendations(history) {
  const recommendations = [];
  
  for (const msg of history) {
    if (msg.role === 'assistant') {
      // Look for numbered recommendation patterns
      const matches = msg.content.match(/\d+\.\s+[^.]+/g);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/\*\*/g, '').trim();
          recommendations.push(cleaned);
        }
      }
    }
  }
  
  return recommendations.slice(-5); // Return last 5 recommendations
}

// API endpoint for the concierge
app.post('/api/concierge', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Get current context
    const context = getCurrentContext();
    
    // Add contextual information
    let enhancedPrompt = SYSTEM_PROMPT;
    enhancedPrompt += `\n\nCurrent context: It is ${context.timeOfDay} on ${context.date}, during ${context.season} in the UK.`;
    
    // Add previous recommendations if any
    const previousRecommendations = extractPreviousRecommendations(conversationHistory);
    if (previousRecommendations.length > 0) {
      enhancedPrompt += `\n\nYou have previously recommended: ${previousRecommendations.join(', ')}. Avoid repeating these exact items and offer fresh alternatives.`;
    }
    
    // Check for repeat questions
    let isRepeatQuestion = false;
    for (const msg of conversationHistory) {
      if (msg.role === 'user' && msg.content.toLowerCase().includes(message.toLowerCase())) {
        isRepeatQuestion = true;
        break;
      }
    }
    
    if (isRepeatQuestion) {
      enhancedPrompt += `\n\nThe user is asking about a topic they've inquired about before. Provide fresh perspectives and alternatives.`;
    }
    
    // Prepare messages for the API call
    const messages = [
      { role: "system", content: enhancedPrompt },
      // Include conversation history
      ...conversationHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      // Add the current user message
      { role: "user", content: message }
    ];
    
    // Call OpenAI API with enhanced parameters
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",  // Use gpt-4-turbo for best results
      messages: messages,
      temperature: 0.75,  // Slightly increased for more variation
      max_tokens: 1000,
      top_p: 1,
      frequency_penalty: 0.4,  // Increased to reduce repetition
      presence_penalty: 0.2,  // Increased to encourage new topics
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
  res.status(200).json({ 
    status: 'ok', 
    version: '1.1.0',
    context: getCurrentContext()
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Well Nice Concierge backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
