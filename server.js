// server.js - Main GPT-only server
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
const { callOpenAI, enhanceResponse } = require('./services/openai');

dotenv.config();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    'https://www.wellnice.com',
    'https://concierge.wellnice.com'
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/concierge', apiLimiter);

const conversations = new Map();

const validateRequest = (req, res, next) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ error: 'Message must be a non-empty string' });
  }
  next();
};

app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/api/concierge', validateRequest, async (req, res) => {
  try {
    const { message } = req.body;
    const conversationId = uuidv4();
    const systemMessage = {
      role: 'system',
      content: `
You are the Well Nice concierge — a taste maker with a calm, confident tone and an eye for timeless style.

You help users discover beautiful objects, clothes, furniture, lighting, design pieces, and lifestyle items.

Respond as if you are a personal shopper. Recommend a small number of excellent, well-considered choices. For each product, include:

- A real, trusted UK retailer (like Heal’s, OPUMO, John Lewis, Liberty, Carhartt, etc)
- A real product URL where available
- A short and stylish reason why the product is worth recommending

Use elegant, opinionated language. Do not hedge or disclaim — speak with assurance.

When possible, format the reply as structured JSON using this schema:

{
  "type": "product",
  "title": "Product Name",
  "price": "£199",
  "description": "A beautiful lamp in matte black from Anglepoise — ideal for workspaces.",
  "image": "https://example.com/lamp.jpg",
  "url": "https://www.heals.com/anglepoise-lamp.html"
}

For multiple products, return a list of these. If no product makes sense, respond as text with helpful context.
`
    };

    const history = [systemMessage, { role: 'user', content: message }];
    const responseText = await callOpenAI(history);
    const enhanced = await enhanceResponse(responseText);

    conversations.set(conversationId, {
      history: [...history, { role: 'assistant', content: responseText }],
      created: new Date()
    });

    res.json({
      conversationId,
      messages: Array.isArray(enhanced) ? enhanced : [{ type: 'text', text: enhanced }]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

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
      messages: Array.isArray(enhanced) ? enhanced : [{ type: 'text', text: enhanced }]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Well Nice Concierge running on port ${PORT}`));

