// services/products.js
// This file would typically connect to your product database or CMS
// For now, this is a mock implementation you can replace with your actual data source

// Mock product database
const mockProducts = [
  {
    id: 'p001',
    name: 'Classic White Tee',
    price: '£45',
    description: 'A timeless essential crafted from premium cotton with a relaxed fit and subtle branding.',
    image: '/assets/images/products/classic-white-tee.jpg',
    category: 'Essentials',
    url: '/products/classic-white-tee'
  },
  {
    id: 'p002',
    name: 'Minimalist Hoodie',
    price: '£85',
    description: 'Comfortable, versatile design for everyday wear, made from sustainable materials.',
    image: '/assets/images/products/minimalist-hoodie.jpg',
    category: 'Outerwear',
    url: '/products/minimalist-hoodie'
  },
  {
    id: 'p003',
    name: 'Signature Socks',
    price: '£18',
    description: 'Bold typography meets comfort in our signature style.',
    image: '/assets/images/products/signature-socks.jpg',
    category: 'Accessories',
    url: '/products/signature-socks'
  },
  {
    id: 'p004',
    name: 'Relaxed Fit Tee',
    price: '£50',
    description: 'Effortless style with a contemporary silhouette, perfect for layering.',
    image: '/assets/images/products/relaxed-fit-tee.jpg',
    category: 'Essentials',
    url: '/products/relaxed-fit-tee'
  },
  {
    id: 'p005',
    name: 'Monochrome Cap',
    price: '£35',
    description: 'Clean, minimalist design with embroidered logo detail.',
    image: '/assets/images/products/monochrome-cap.jpg',
    category: 'Accessories',
    url: '/products/monochrome-cap'
  }
];

/**
 * Get product recommendations based on product names
 * In a real implementation, this would query your database or e-commerce API
 * 
 * @param {Array<string>} productNames - Array of product names to look up
 * @returns {Promise<Array>} - Array of matching products with details
 */
async function getProductRecommendations(productNames) {
  try {
    // In a real implementation, you would:
    // 1. Connect to your database or API
    // 2. Query for products matching or similar to the names
    // 3. Return the results with complete information
    
    // For now, this mock implementation searches the mock database
    const recommendations = [];
    
    for (const name of productNames) {
      // Look for exact or similar product names
      const product = mockProducts.find(p => 
        p.name.toLowerCase() === name.toLowerCase() ||
        p.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(p.name.toLowerCase())
      );
      
      if (product) {
        recommendations.push(product);
      }
    }
    
    // If we don't have enough matches, add some popular products
    if (recommendations.length < productNames.length) {
      const missingCount = productNames.length - recommendations.length;
      const existingIds = recommendations.map(p => p.id);
      
      // Add products not already in recommendations
      for (const product of mockProducts) {
        if (!existingIds.includes(product.id)) {
          recommendations.push(product);
          if (recommendations.length >= productNames.length) {
            break;
          }
        }
      }
    }
    
    return recommendations;
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    return []; // Return empty array on error
  }
}

/**
 * IMPLEMENTATION NOTE: 
 * Replace this mock implementation with your actual product data source.
 * This could be:
 * - A database query (MongoDB, PostgreSQL, etc.)
 * - An API call to your e-commerce platform (Shopify, WooCommerce, etc.)
 * - A CMS query (Contentful, Sanity, etc.)
 * 
 * The important thing is that it returns product data in a consistent format:
 * {
 *   name: string,
 *   price: string,
 *   description: string,
 *   image: string (URL),
 *   url: string (product page URL),
 *   category?: string (optional)
 * }
 */

module.exports = {
  getProductRecommendations
};
