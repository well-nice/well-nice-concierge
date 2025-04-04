const { OpenAI } = require('openai');
const dotenv = require('dotenv');

dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Well Nice AI Service
 * 
 * Provides sophisticated, high-end concierge AI assistance with:
 * - Elegant, minimal responses
 * - Design-conscious tone
 * - Intelligent conversation handling
 */
class AIService {
  constructor() {
    this.conversationContext = [];
    this.systemPrompt = `
      You are the Well Nice Concierge, a sophisticated, design-conscious digital assistant.
      
      Core principles:
      - Provide elegant, minimal responses (2-3 sentences when possible)
      - Use a sophisticated, understated tone reflecting high-end design sensibilities
      - Be helpful, direct, and intelligent
      - Never use emojis or exclamation points
      - Think of publications like Kinfolk and Cereal Magazine in your aesthetic
      - Prioritize UK-based, design-forward product recommendations when asked
      
      Conversation style:
      - Brief, considered responses
      - Sophisticated vocabulary
      - Subtle wit when appropriate
      - Genuine curiosity about user needs
      - Minimal filler language
    `;
  }

  /**
   * Process a user message and generate a response
   * @param {string} userMessage - The message from the user
   * @param {object} context - Optional context information
   * @returns {Promise<string>} - The AI response
   */
  async processMessage(userMessage, context = {}) {
    try {
      // Add message to conversation history
      this.conversationContext.push({
        role: 'user',
        content: userMessage
      });

      // Trim conversation context if it gets too long
      if (this.conversationContext.length > 10) {
        this.conversationContext = this.conversationContext.slice(-10);
      }

      // Build the messages array with system prompt
      const messages = [
        { 
          role: 'system', 
          content: this.systemPrompt 
        },
        ...this.conversationContext
      ];

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
        top_p: 1,
        frequency_penalty: 0.5,
        presence_penalty: 0.3,
      });

      const aiResponse = response.choices[0].message.content.trim();
      
      // Add AI response to conversation history
      this.conversationContext.push({
        role: 'assistant',
        content: aiResponse
      });

      return aiResponse;
    } catch (error) {
      console.error('Error in AI service:', error);
      return 'I apologize, but I am unable to process your request at the moment.';
    }
  }

  /**
   * Generate search queries based on user request
   * @param {string} userRequest - The user's product search request
   * @returns {Promise<string>} - Enhanced search query
   */
  async generateSearchQuery(userRequest) {
    try {
      const messages = [
        {
          role: 'system',
          content: `
            You are a search query optimizer for a high-end design concierge.
            Your task is to transform user requests into optimal search queries.
            Focus on UK-based, design-forward, aesthetically pleasing products.
            Return ONLY the search query without any additional text or explanation.
          `
        },
        {
          role: 'user',
          content: `Generate an optimal search query for: "${userRequest}"`
        }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: messages,
        temperature: 0.3,
        max_tokens: 60,
        top_p: 1,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating search query:', error);
      return userRequest;
    }
  }

  /**
   * Enhance product description with design-conscious details
   * @param {object} product - The product object to enhance
   * @returns {Promise<object>} - Enhanced product object
   */
  async enhanceProductDescription(product) {
    try {
      const messages = [
        {
          role: 'system',
          content: `
            You are a design-conscious product writer for a high-end concierge service.
            Enhance the given product with an elegant, minimal description.
            Focus on design elements, materials, and aesthetics.
            Be sophisticated but concise (max 2 sentences).
            Return ONLY the enhanced description without additional text.
          `
        },
        {
          role: 'user',
          content: `Enhance this product description in a Well Nice style:
            Title: ${product.title}
            Description: ${product.description || 'No description available'}
            URL: ${product.link}
          `
        }
      ];

      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: messages,
        temperature: 0.7,
        max_tokens: 100,
        top_p: 1,
      });

      product.enhancedDescription = response.choices[0].message.content.trim();
      return product;
    } catch (error) {
      console.error('Error enhancing product description:', error);
      return product;
    }
  }
}

module.exports = new AIService();
