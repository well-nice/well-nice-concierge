const axios = require('axios');
const cheerio = require('cheerio');

// Product cache to reduce redundant scraping
const productCache = new Map();
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Fetch product data from Google Sheet
async function fetchProductData() {
  try {
    const GOOGLE_SHEET_URL = process.env.GOOGLE_SHEET_URL;
    if (!GOOGLE_SHEET_URL) {
      console.error('Google Sheet URL not defined in environment variables');
      return [];
    }

    const response = await axios.get(GOOGLE_SHEET_URL);
    const lines = response.data.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const product = {};
      
      headers.forEach((header, index) => {
        product[header.trim()] = values[index]?.trim() || '';
      });
      
      return product;
    }).filter(product => product.url && product.url.length > 5);
  } catch (error) {
    console.error('Error fetching product data:', error);
    return [];
  }
}

// Scrape website for product details
async function scrapeProductDetails(url) {
  if (productCache.has(url)) {
    const cachedData = productCache.get(url);
    if (Date.now() - cachedData.timestamp < CACHE_EXPIRY) {
      return cachedData.data;
    }
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    const title = $('meta[property="og:title"]').attr('content') || 
                  $('title').text() || 
                  $('h1').first().text();
                  
    const image = $('meta[property="og:image"]').attr('content') || 
                  $('img').first().attr('src');
                  
    const description = $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="description"]').attr('content') || 
                        $('p').first().text();
    
    const price = $('.price').first().text() || 
                  $('[class*="price"]').first().text() || 
                  '';
    
    const productDetails = { 
      title: title?.trim(), 
      image: image?.startsWith('http') ? image : `${new URL(url).origin}${image}`,
      description: description?.trim(), 
      price: price?.trim(),
      url
    };
    
    // Save to cache
    productCache.set(url, {
      data: productDetails,
      timestamp: Date.now()
    });
    
    return productDetails;
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return { url, title: 'Product', description: 'Could not retrieve details', image: '' };
  }
}

// Search for products based on user query
async function searchProducts(query) {
  const products = await fetchProductData();
  const keywords = query.toLowerCase().split(' ');
  
  // Score each product based on keyword matches
  const scoredProducts = products.map(product => {
    let score = 0;
    const searchText = (product.name + ' ' + product.description + ' ' + product.category + ' ' + product.tags).toLowerCase();
    
    keywords.forEach(keyword => {
      if (searchText.includes(keyword)) {
        score += 1;
      }
    });
    
    return { ...product, score };
  });
  
  // Sort by score and take top results
  return scoredProducts
    .filter(product => product.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// Format results for rich preview cards
async function formatResults(products) {
  try {
    const detailedProducts = await Promise.all(
      products.map(product => scrapeProductDetails(product.url))
    );
    
    return detailedProducts.filter(product => product.title && product.description);
  } catch (error) {
    console.error('Error formatting results:', error);
    return [];
  }
}

module.exports = {
  fetchProductData,
  scrapeProductDetails,
  searchProducts,
  formatResults
};
