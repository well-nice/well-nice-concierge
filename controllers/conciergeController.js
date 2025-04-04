const aiService = require('../services/aiService');
const productService = require('../services/productService');

/**
 * Well Nice Concierge Controller
 * 
 * Handles the integration between AI services and product discovery
 * for a sophisticated, design-conscious concierge experience.
 */
class ConciergeController {
  /**
   * Process a message from the user and generate an appropriate response
   * @param {object} req - The request object
   * @param {object} res - The response object
   */
  async processMessage(req, res) {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Message is required' 
        });
      }

      // Process the message with the AI service
      const response = await aiService.processMessage(message, context);
      
      return res.status(200).json({ 
        success: true, 
        response 
      });
    } catch (error) {
      console.error('Error processing message:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to process message' 
      });
    }
  }

  /**
   * Search for products based on user request
   * @param {object} req - The request object
   * @param {object} res - The response object
   */
  async searchProducts(req, res) {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ 
          success: false, 
          error: 'Search query is required' 
        });
      }

      // Generate an optimized search query
      const enhancedQuery = await aiService.generateSearchQuery(query);
      
      // Search for products using the enhanced query
      const products = await productService.searchProducts(enhancedQuery);
      
      // Enhance product descriptions if available
      const enhancedProducts = await Promise.all(
        products.slice(0, 3).map(async (product) => {
          return await aiService.enhanceProductDescription(product);
        })
      );

      return res.status(200).json({ 
        success: true, 
        products: enhancedProducts,
        originalQuery: query,
        enhancedQuery 
      });
    } catch (error) {
      console.error('Error searching products:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to search products' 
      });
    }
  }

  /**
   * Get product recommendations based on context
   * @param {object} req - The request object
   * @param {object} res - The response object
   */
  async getRecommendations(req, res) {
    try {
      const { category, preferences, context } = req.body;
      
      if (!category) {
        return res.status(400).json({ 
          success: false, 
          error: 'Category is required' 
        });
      }

      // Generate a search query based on category and preferences
      const searchQuery = await aiService.generateSearchQuery(
        `${category} ${preferences || ''} high quality design-conscious`
      );
      
      // Search for products using the generated query
      const products = await productService.searchProducts(searchQuery);
      
      // Enhance the top products
      const enhancedProducts = await Promise.all(
        products.slice(0, 3).map(async (product) => {
          return await aiService.enhanceProductDescription(product);
        })
      );

      return res.status(200).json({ 
        success: true, 
        recommendations: enhancedProducts,
        category,
        searchQuery 
      });
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get recommendations' 
      });
    }
  }
}

module.exports = new ConciergeController();
