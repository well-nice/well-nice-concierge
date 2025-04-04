const OpenAI = require('openai');
const { searchProducts, formatResults } = require('./productService');
const insightsLearner = require('./insightsLearner');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

class ConversationMemory {
  constructor() {
    this.conversationLog = [];
    this.contextualDetails = {};
    this.searchHistory = [];
    this.currentIntent = null;
  }

  // Add a new message to the conversation log
  addMessage(role, content, metadata = {}) {
    const message = {
      role,
      content,
      timestamp: new Date(),
      metadata
    };
    this.conversationLog.push(message);
  }

  // Update contextual details
  updateContextualDetails(key, value) {
    this.contextualDetails[key] = value;
  }

  // Track search history
  trackSearch(query, results) {
    this.searchHistory.push({
      query,
      results,
      timestamp: new Date()
    });
  }

  // Generate context prompt for AI
  generateContextPrompt() {
    // Create a condensed version of recent conversation
    const recentMessages = this.conversationLog.slice(-5);
    const contextSummary = recentMessages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n');

    const contextualDetails = Object.entries(this.contextualDetails)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    return `
      CONVERSATION CONTEXT:
      Recent Conversation:
      ${contextSummary}

      Contextual Details:
      ${contextualDetails}
    `;
  }

  // Trigger learning process
  async triggerLearning() {
    await insightsLearner.learnFromConversation(this);
  }
}

class WellNiceConcierge {
  constructor() {
    this.memory = new ConversationMemory();
    this.insightsLearner = insightsLearner;
  }

  // Main conversation processing method
  async getWellNiceResponse(query) {
    try {
      // Add user query to conversation memory
      this.memory.addMessage('user', query);

      // Determine conversation strategy using AI
      const contextPrompt = this.memory.generateContextPrompt();
      const conversationStrategy = await this.determineConversationStrategy(query, contextPrompt);

      // Process based on strategy
      let response;
      switch (conversationStrategy.action) {
        case 'product_search':
          response = await this.handleProductSearch(query);
          break;
        case 'context_inquiry':
          response = await this.handleContextInquiry(query);
          break;
        default:
          response = await this.handleDefaultResponse(query);
      }

      // Trigger learning process
      await this.memory.triggerLearning();

      // Add assistant response to memory
      this.memory.addMessage('assistant', response.message);

      return response;
    } catch (error) {
      console.error('Conversation processing error:', error);
      return this.handleErrorResponse(error);
    }
  }

  // Determine conversation strategy using AI
  async determineConversationStrategy(query, contextPrompt) {
    const systemPrompt = `
      Analyze the current conversation and determine the most appropriate action:
      
      Possible Actions:
      1. product_search: Search for products
      2. context_inquiry: Ask clarifying questions
      3. default_response: General conversation

      Consider:
      - Depth and specificity of the query
      - Existing conversation context
      - Implied user intent
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: contextPrompt },
          { role: "user", content: query }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const strategyText = response.choices[0].message.content.toLowerCase();
      
      if (strategyText.includes('product_search')) {
        return { action: 'product_search' };
      }
      
      if (strategyText.includes('context_inquiry')) {
        return { action: 'context_inquiry' };
      }
      
      return { action: 'default_response' };
    } catch (error) {
      console.error('Strategy determination error:', error);
      return { action: 'default_response' };
    }
  }

  // Handle product search
  async handleProductSearch(query) {
    try {
      // Use contextual information to refine search
      const contextualQuery = this.memory.generateContextPrompt() + ' ' + query;
      
      // Search and format products
      const productResults = await searchProducts(contextualQuery);
      const formattedResults = await formatResults(productResults);
      
      // Enhance recommendations using insights
      const enhancedResults = this.insightsLearner.enhanceRecommendations(formattedResults);
      
      // Track search in memory
      this.memory.trackSearch(query, enhancedResults);
      
      return {
        type: 'product_search',
        message: "I've curated some options that might intrigue you.",
        products: enhancedResults,
        insights: this.insightsLearner.generateInsightsSummary()
      };
    } catch (error) {
      console.error('Product search error:', error);
      return this.handleDefaultResponse(query);
    }
  }

  // Handle context inquiry
  async handleContextInquiry(query) {
    const systemPrompt = `
      Provide an elegant, probing response to gather more context.
      
      Your goal is to:
      - Ask thoughtful, refined questions
      - Understand the user's deeper preferences
      - Maintain a sophisticated, minimalist tone
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content": this.memory.generateContextPrompt() },
          { role: "user", content: query }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const contextInquiryResponse = response.choices[0].message.content;
      
      return {
        type: 'context_inquiry',
        message: contextInquiryResponse
      };
    } catch (error) {
      console.error('Context inquiry error:', error);
      return this.handleDefaultResponse(query);
    }
  }

  // Handle default conversational response
  async handleDefaultResponse(query) {
    const systemPrompt = `
      Provide an engaging, sophisticated response that:
      - Acknowledges the user's input
      - Maintains the Well Nice aesthetic
      - Shows genuine interest
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content": this.memory.generateContextPrompt() },
          { role: "user", content: query }
        ],
        max_tokens: 300,
        temperature: 0.7,
      });

      const defaultResponse = response.choices[0].message.content;
      
      return {
        type: 'default_response',
        message: defaultResponse
      };
    } catch (error) {
      console.error('Default response error:', error);
      return this.handleErrorResponse(error);
    }
  }

  // Handle error responses
  handleErrorResponse(error) {
    return {
      type: 'error',
      message: "Apologies, our conversation has been momentarily interrupted."
    };
  }
}

// Singleton instance
const wellNiceConcierge = new WellNiceConcierge();

// Main export function
async function getWellNiceResponse(query) {
  return await wellNiceConcierge.getWellNiceResponse(query);
}

module.exports = { 
  getWellNiceResponse,
  conversationMemory: wellNiceConcierge.memory,
  insightsLearner: wellNiceConcierge.insightsLearner
};
