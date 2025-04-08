// services/conversation-manager.js
const { v4: uuidv4 } = require('uuid');

class ConversationManager {
  constructor(options = {}) {
    this.conversations = new Map();
    this.expirationMs = options.expirationMs || 24 * 60 * 60 * 1000; // Default 24 hours
    this.maxConversations = options.maxConversations || 10000;
    this.pruneInterval = options.pruneInterval || 60 * 60 * 1000; // Default 1 hour
    
    // Start the pruning interval
    this.startPruneTimer();
  }
  
  startPruneTimer() {
    setInterval(() => {
      this.pruneExpiredConversations();
    }, this.pruneInterval);
  }
  
  create(systemMessage) {
    const conversationId = uuidv4();
    const conversation = {
      id: conversationId,
      history: [systemMessage],
      created: new Date(),
      lastUpdated: new Date()
    };
    
    this.conversations.set(conversationId, conversation);
    this.pruneIfNeeded();
    
    return conversationId;
  }
  
  get(conversationId) {
    return this.conversations.get(conversationId);
  }
  
  exists(conversationId) {
    return this.conversations.has(conversationId);
  }
  
  addMessage(conversationId, message) {
    if (!this.conversations.has(conversationId)) {
      return false;
    }
    
    const conversation = this.conversations.get(conversationId);
    conversation.history.push(message);
    conversation.lastUpdated = new Date();
    this.conversations.set(conversationId, conversation);
    
    return true;
  }
  
  getHistory(conversationId) {
    if (!this.conversations.has(conversationId)) {
      return null;
    }
    
    return this.conversations.get(conversationId).history;
  }
  
  // Clean up old conversations
  pruneExpiredConversations() {
    const now = new Date();
    let expired = 0;
    
    for (const [id, conversation] of this.conversations.entries()) {
      const age = now - conversation.lastUpdated;
      if (age > this.expirationMs) {
        this.conversations.delete(id);
        expired++;
      }
    }
    
    if (expired > 0) {
      console.log(`Pruned ${expired} expired conversations`);
    }
  }
  
  pruneIfNeeded() {
    // If we have too many conversations, remove the oldest ones
    if (this.conversations.size > this.maxConversations) {
      const sortedByAge = [...this.conversations.entries()]
        .sort(([, a], [, b]) => a.lastUpdated - b.lastUpdated);
      
      const toRemove = sortedByAge.slice(0, Math.floor(this.maxConversations * 0.2));
      toRemove.forEach(([id]) => this.conversations.delete(id));
      
      console.log(`Pruned ${toRemove.length} oldest conversations due to capacity limits`);
    }
  }
}

module.exports = ConversationManager;
