const axios = require('axios');
const cheerio = require('cheerio');
const { Configuration, OpenAIApi } = require('openai');

class ProductDiscoveryService {
  constructor() {
    this.openai = new OpenAIApi(new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    }));
  }

  // Main product search method using Google
  async findPerfectProduct(userContext) {
    try {
      // Generate an intelligent search query
      const searchQuery = await this.generateIntelligentSearchQuery(userContext);
      
      // Perform Google search
      const searchResults = await this.performGoogleSearch(searchQuery);
      
      // Curate and enrich results
      const enrichedResults = await this.enrichSearchResults(searchResults);
      
      return enrichedResults;
    } catch (error) {
      console.error('Product discovery error:', error);
      return [];
    }
  }

  // Generate intelligent search query using AI
  async generateIntelligentSearchQuery(userContext) {
    try {
      const response = await this.openai.createChatCompletion({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `Convert user context into a precise, design-focused Google search query.
            Considerations:
            - High-end, considered products
            - Specific design attributes
            - Potential retailers or brand nuances
            - Minimal, elegant search phrasing`
          },
          {
            role: "user",
            content: JSON.stringify(userContext)
          }
        ],
        max_tokens: 100,
        temperature: 0.7
      });

      const query = response.choices[0].message.content.trim();
      return `${query} buy online site:uk`;
    } catch (error) {
      console.error('Search query generation error:', error);
      return userContext.query || '';
    }
  }

  // Perform Google Search 
  async performGoogleSearch(query) {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: process.env.GOOGLE_SEARCH_API_KEY,
          cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
          q: query,
          num: 5  // Limit to 5 results
        }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Google Search error:', error);
      return [];
    }
  }

  // Enrich search results with additional details
  async enrichSearchResults(results) {
    const enrichPromises = results.map(async (result) => {
      try {
        // Fetch additional details about the product/link
        const pageDetails = await this.fetchPageMetadata(result.link);

        // Use AI to generate a refined description
        const description = await this.generateProductDescription(result);

        return {
          ...result,
          ...pageDetails,
          description,
          preview: this.createProductPreview(result, pageDetails)
        };
      } catch (error) {
        console.error(`Enrichment error for ${result.link}:`, error);
        return result;
      }
    });

    return Promise.all(enrichPromises);
  }

  // Fetch basic metadata from the page
  async fetchPageMetadata(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      return {
        image: $('meta[property="og:image"]').attr('content') || 
               $('img').first().attr('src'),
        price: $('[class*="price"]').first().text().trim()
      };
    } catch (error) {
      console.error(`Metadata fetch error for ${url}:`, error);
      return {};
    }
  }

  // Generate product description using AI
  async generateProductDescription(result) {
    try {
      const response = await this.openai.createChatCompletion({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `Craft a minimal, sophisticated product description.
            Tone: Understated elegance
            Style: Well Nice aesthetic
            Focus: Design essence and quality`
          },
          {
            role: "user",
            content: JSON.stringify(result)
          }
        ],
        max_tokens: 150,
        temperature: 0.5
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Description generation error:', error);
      return "A considered discovery.";
    }
  }

  // Create an elegant product preview
  createProductPreview(result, metadata) {
    return `
      <div class="well-nice-product-preview">
        ${metadata.image ? `<img src="${metadata.image}" alt="${result.title}" />` : ''}
        <div class="product-details">
          <h3>${result.title}</h3>
          <p>${result.description || 'A refined selection.'}</p>
          <a href="${result.link}" target="_blank" class="purchase-link">
            Explore
          </a>
          ${metadata.price ? `<span class="price">${metadata.price}</span>` : ''}
        </div>
      </div>
    `;
  }
}

module.exports = new ProductDiscoveryService();
