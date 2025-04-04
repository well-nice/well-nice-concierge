const axios = require('./axiosConfig');
const cheerio = require('cheerio');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Well Nice Product Discovery Service
 * 
 * A sophisticated product discovery service using Google Custom Search
 * to find design-forward, aesthetically pleasing products.
 */
class ProductService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
    this.googleSearchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  }

  /**
   * Search for products based on a query
   * @param {string} query - The search query
   * @returns {Promise<Array>} - Array of product results
   */
  async searchProducts(query) {
    try {
      // Add UK-specific search modifiers if not present
      const enhancedQuery = query.toLowerCase().includes('uk') ? 
        query : `${query} uk`;

      const searchResults = await this.googleSearch(enhancedQuery);
      
      if (!searchResults.length) {
        console.log('No search results found, falling back to web scraping');
        return [];
      }

      // Enrich the top 5 results with additional details
      const enrichedResults = await Promise.all(
        searchResults.slice(0, 5).map(result => this.enrichResult(result))
      );

      return enrichedResults;
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  /**
   * Perform a Google Custom Search
   * @param {string} query - The search query
   * @returns {Promise<Array>} - Array of search results
   */
  async googleSearch(query) {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: query,
          num: 5
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        return [];
      }

      return response.data.items.map(item => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
        image: item.pagemap?.cse_image?.[0]?.src || '',
        source: item.displayLink
      }));
    } catch (error) {
      console.error('Google Search API error:', error);
      
      // Fallback to basic results if API fails
      return [];
    }
  }

  /**
   * Enrich a search result with additional details
   * @param {object} result - The search result to enrich
   * @returns {Promise<object>} - Enriched result
   */
  async enrichResult(result) {
    try {
      // Fetch page content to extract more details
      const metadata = await this.fetchPageMetadata(result.link);
      
      // Generate AI product description
      const description = await this.generateDescription(
        result.title, 
        result.snippet, 
        metadata.description || ''
      );

      return {
        ...result,
        description,
        price: metadata.price || 'Price not available',
        image: metadata.image || result.image,
        metadata
      };
    } catch (error) {
      console.error(`Error enriching result for ${result.link}:`, error);
      return result;
    }
  }

  /**
   * Fetch metadata from a product page
   * @param {string} url - The URL to fetch metadata from
   * @returns {Promise<object>} - Extracted metadata
   */
  async fetchPageMetadata(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 5000
      });

      const $ = cheerio.load(response.data);
      
      // Extract common metadata
      const metadata = {
        title: $('meta[property="og:title"]').attr('content') || $('title').text(),
        description: $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content'),
        image: $('meta[property="og:image"]').attr('content'),
      };

      // Extract price with various selectors for different sites
      const priceSelectors = [
        '.price', 
        '[data-testid="price"]', 
        '[class*="price"]', 
        '[id*="price"]',
        'span:contains("£")'
      ];

      for (const selector of priceSelectors) {
        const priceElement = $(selector).first();
        if (priceElement.length) {
          metadata.price = priceElement.text().trim();
          break;
        }
      }

      // Fallback to using a better image if none found in metadata
      if (!metadata.image) {
        const imgSrc = $('img[src*="product"], img[src*="large"], img[src*="main"], img[data-main-image]').first().attr('src');
        if (imgSrc) {
          metadata.image = imgSrc.startsWith('http') ? imgSrc : new URL(imgSrc, url).toString();
        }
      }

      return metadata;
    } catch (error) {
      console.error(`Error fetching metadata for ${url}:`, error);
      return {};
    }
  }

  /**
   * Generate an AI-enhanced description for a product
   * @param {string} title - The product title
   * @param {string} snippet - The search snippet
   * @param {string} description - The product description
   * @returns {Promise<string>} - Enhanced description
   */
  async generateDescription(title, snippet, description) {
    try {
      // Call OpenAI to generate a more elegant description
      const response = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `
              You are a design-conscious writer for a high-end concierge service.
              Create a sophisticated, minimal product description in 1-2 sentences.
              Focus on aesthetics, design, and quality.
              Return only the description, with no additional text.
            `
          },
          {
            role: 'user',
            content: `
              Product: ${title}
              Snippet: ${snippet}
              Description: ${description || 'No description available'}
            `
          }
        ],
        temperature: 0.7,
        max_tokens: 100,
        top_p: 1
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating product description:', error);
      return snippet || 'A considered selection.';
    }
  }
}

module.exports = new ProductService();
