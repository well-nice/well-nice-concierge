const fs = require('fs').promises;
const path = require('path');

class ConciergeInsightsLearner {
  constructor(storageDir = './insights') {
    this.storageDir = storageDir;
    this.insights = {
      brands: {},
      colors: {},
      preferences: {},
      categories: {},
      queryPatterns: {},
      userInterests: {}
    };
    this.loadInsights();
  }

  // Create storage directory if it doesn't exist
  async ensureStorageDir() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
    } catch (error) {
      console.error('Error creating insights storage directory:', error);
    }
  }

  // Load existing insights from file
  async loadInsights() {
    await this.ensureStorageDir();
    const insightsPath = path.join(this.storageDir, 'concierge_insights.json');
    
    try {
      const data = await fs.readFile(insightsPath, 'utf8');
      this.insights = JSON.parse(data);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading insights:', error);
      }
      // Initialize with empty insights if file doesn't exist
      this.insights = {
        brands: {},
        colors: {},
        preferences: {},
        categories: {},
        queryPatterns: {},
        userInterests: {}
      };
    }
  }

  // Save insights to file
  async saveInsights() {
    const insightsPath = path.join(this.storageDir, 'concierge_insights.json');
    
    try {
      await fs.writeFile(insightsPath, JSON.stringify(this.insights, null, 2));
    } catch (error) {
      console.error('Error saving insights:', error);
    }
  }

  // Extract and learn from conversation
  async learnFromConversation(conversationMemory) {
    try {
      // Analyze conversation log
      const recentMessages = conversationMemory.conversationLog.slice(-10);
      
      // Extract potential insights
      recentMessages.forEach(message => {
        if (message.role === 'user') {
          this.extractQueryInsights(message.content);
        }
      });

      // Analyze search results and product interactions
      if (conversationMemory.searchHistory.length > 0) {
        const latestSearch = conversationMemory.searchHistory[conversationMemory.searchHistory.length - 1];
        this.learnFromSearchResults(latestSearch.results);
      }

      // Save updated insights
      await this.saveInsights();
    } catch (error) {
      console.error('Error learning from conversation:', error);
    }
  }

  // Extract insights from user queries
  extractQueryInsights(query) {
    const lowercaseQuery = query.toLowerCase();
    
    // Learn from query patterns
    const words = lowercaseQuery.split(/\s+/);
    words.forEach(word => {
      this.incrementCount(this.insights.queryPatterns, word);
    });

    // Detect potential brand mentions
    const brandKeywords = [
      'norse projects', 'apc', 'maison kitsune', 'arket', 'uniqlo', 
      'nike', 'adidas', 'carhartt', 'dickies', 'patagonia', 
      '66north', 'clarks', 'new balance', 'levis', 'filson', 
      'red wing', 'birkenstocks', 'wood wood', 'foret'
    ];
    
    brandKeywords.forEach(brand => {
      if (lowercaseQuery.includes(brand)) {
        this.incrementCount(this.insights.brands, brand);
      }
    });

    // Detect color mentions
    const colors = [
      'black', 'white', 'blue', 'red', 'green', 'yellow', 
      'pink', 'purple', 'brown', 'gray', 'beige', 'navy'
    ];
    
    colors.forEach(color => {
      if (lowercaseQuery.includes(color)) {
        this.incrementCount(this.insights.colors, color);
      }
    });

    // Detect product category interests
    const categories = [
      'furniture', 'clothing', 'accessories', 'home decor', 
      'tech', 'art', 'lighting', 'kitchen', 'outdoor'
    ];
    
    categories.forEach(category => {
      if (lowercaseQuery.includes(category)) {
        this.incrementCount(this.insights.categories, category);
      }
    });
  }

  // Learn from search results
  learnFromSearchResults(results) {
    results.forEach(product => {
      // Learn from product details
      if (product.title) {
        // Extract brand from title
        const brandMatch = product.title.match(/\b([A-Z][a-z]+)\b/);
        if (brandMatch) {
          const brand = brandMatch[1].toLowerCase();
          this.incrementCount(this.insights.brands, brand);
        }
      }

      // Learn from description
      if (product.description) {
        const lowercaseDesc = product.description.toLowerCase();
        
        // Check colors
        const colors = [
          'black', 'white', 'blue', 'red', 'green', 'yellow', 
          'pink', 'purple', 'brown', 'gray', 'beige', 'navy'
        ];
        
        colors.forEach(color => {
          if (lowercaseDesc.includes(color)) {
            this.incrementCount(this.insights.colors, color);
          }
        });

        // Check categories
        const categories = [
          'furniture', 'clothing', 'accessories', 'home decor', 
          'tech', 'art', 'lighting', 'kitchen', 'outdoor'
        ];
        
        categories.forEach(category => {
          if (lowercaseDesc.includes(category)) {
            this.incrementCount(this.insights.categories, category);
          }
        });
      }
    });
  }

  // Utility method to increment count in a dictionary
  incrementCount(dictionary, key, increment = 1) {
    dictionary[key] = (dictionary[key] || 0) + increment;
  }

  // Get top insights
  getTopInsights(category, limit = 5) {
    const insights = this.insights[category] || {};
    return Object.entries(insights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key, value]) => ({ key, count: value }));
  }

  // Generate a summary of accumulated insights
  generateInsightsSummary() {
    return {
      topBrands: this.getTopInsights('brands'),
      topColors: this.getTopInsights('colors'),
      topCategories: this.getTopInsights('categories'),
      topQueryPatterns: this.getTopInsights('queryPatterns')
    };
  }

  // Use insights to enhance product recommendations
  enhanceRecommendations(products) {
    const topBrands = this.getTopInsights('brands').map(b => b.key);
    const topColors = this.getTopInsights('colors').map(c => c.key);
    const topCategories = this.getTopInsights('categories').map(c => c.key);

    // Rerank products based on learned insights
    return products.map(product => {
      let score = 0;
      
      // Check brand alignment
      if (topBrands.some(brand => 
        product.title.toLowerCase().includes(brand))) {
        score += 2;
      }
      
      // Check color alignment
      if (topColors.some(color => 
        product.description.toLowerCase().includes(color))) {
        score += 1;
      }
      
      // Check category alignment
      if (topCategories.some(category => 
        product.description.toLowerCase().includes(category))) {
        score += 1;
      }

      return { ...product, insightScore: score };
    }).sort((a, b) => b.insightScore - a.insightScore);
  }
}

module.exports = new ConciergeInsightsLearner();
