// services/openai.js
const axios = require('axios');
const dotenv = require('dotenv');
const { getProductRecommendations } = require('./products');

dotenv.config();

// OpenAI API call
async function callOpenAI(messages) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error.response?.data || error.message);
    
    // Provide more detailed error information
    if (error.response?.data) {
      throw new Error(`OpenAI API Error: ${error.response.data.error?.message || JSON.stringify(error.response.data)}`);
    } else {
      throw new Error(`OpenAI API Error: ${error.message}`);
    }
  }
}

// Enhance the response with real product data
async function enhanceResponse(text) {
  try {
    // Parse the response to detect format type
    const parsedResponse = parseResponse(text);
    
    // If it's a product recommendation, enhance with real data
    if (parsedResponse.type === 'product-cards') {
      const productNames = parsedResponse.content.map(product => product.name);
      const realProducts = await getProductRecommendations(productNames);
      
      // If we have real products, merge them with the parsed data
      if (realProducts && realProducts.length > 0) {
        parsedResponse.content = parsedResponse.content.map((product, index) => {
          const realProduct = realProducts.find(p => p.name.toLowerCase() === product.name.toLowerCase()) || 
                              (index < realProducts.length ? realProducts[index] : null);
          
          if (realProduct) {
            return {
              ...product,
              price: realProduct.price || product.price,
              description: realProduct.description || product.description,
              image: realProduct.image || product.image,
              url: realProduct.url
            };
          }
          return product;
        });
      }
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Error enhancing response:', error);
    // If enhancement fails, return the original text as a fallback
    return {
      type: 'text',
      content: text
    };
  }
}

// Parse response function similar to the one in frontend
function parseResponse(text) {
  // Check if the response contains a table structure
  if (text.includes('|') && (text.includes('---') || text.toLowerCase().includes('product') || text.toLowerCase().includes('item'))) {
    try {
      // Extract table data
      const tableLines = text.split('\n').filter(line => line.trim() !== '');
      const tableStart = tableLines.findIndex(line => line.includes('|'));
      
      if (tableStart !== -1) {
        // Extract title (text before the table)
        const title = tableLines.slice(0, tableStart).join(' ').replace(/[#*]/g, '').trim();
        
        // Parse table headers and rows
        const tableContent = tableLines.slice(tableStart);
        const headers = tableContent[0].split('|').map(h => h.trim()).filter(h => h !== '');
        
        // Skip separator line if it exists
        const dataStartIndex = tableContent[1].includes('---') ? 2 : 1;
        
        // Parse rows
        const rows = [];
        for (let i = dataStartIndex; i < tableContent.length; i++) {
          const rowData = tableContent[i].split('|').map(cell => cell.trim()).filter(cell => cell !== '');
          if (rowData.length === headers.length) {
            const row = {};
            headers.forEach((header, index) => {
              row[header] = rowData[index];
            });
            rows.push(row);
          }
        }
        
        if (rows.length > 0) {
          return {
            type: 'table',
            title: title || 'Recommended Items',
            content: rows
          };
        }
      }
    } catch (error) {
      console.error('Error parsing table:', error);
      // Fall back to text if parsing fails
    }
  }
  
  // Check if the response appears to be about products that could be displayed as cards
  if ((text.toLowerCase().includes('product') || 
       text.toLowerCase().includes('item') || 
       text.toLowerCase().includes('collection') || 
       text.toLowerCase().includes('recommendation')) && 
      text.includes('\n\n')) {
    
    try {
      // Try to parse product-like information
      const sections = text.split('\n\n').filter(s => s.trim() !== '');
      
      // Check if we have what looks like a list of products
      if (sections.length > 1) {
        const productSections = sections.filter(s => 
          !s.startsWith('#') && 
          (s.includes(':') || s.includes('-') || s.includes('£') || s.includes('$'))
        );
        
        if (productSections.length >= 2) { // We need at least 2 products to make cards worthwhile
          // Extract title (likely in the first section)
          const titleSection = sections[0].startsWith('#') ? sections[0] : null;
          const title = titleSection ? 
            titleSection.replace(/[#*]/g, '').trim() : 
            'Curated for You';
          
          // Parse products - this is a simple heuristic, adjust as needed
          const products = productSections.map(section => {
            const lines = section.split('\n');
            const name = lines[0].replace(/[#*:]/g, '').trim();
            
            // Try to find price - look for currency symbols
            const priceLine = lines.find(l => l.includes('£') || l.includes('$') || l.toLowerCase().includes('price'));
            const price = priceLine ? 
              priceLine.replace(/.*?([£$][\d.]+|[\d.]+\s?[£$]).*/i, '$1').trim() : 
              '£TBC';
            
            // Everything else becomes description
            const description = lines.slice(1).filter(l => l !== priceLine).join(' ').trim();
            
            return {
              name,
              price,
              description: description || 'A well nice product from our collection',
              image: '/assets/images/product-placeholder.jpg' // Default placeholder
            };
          });
          
          return {
            type: 'product-cards',
            title,
            content: products
          };
        }
      }
    } catch (error) {
      console.error('Error parsing product cards:', error);
      // Fall back to text if parsing fails
    }
  }
  
  // Default to text response
  return {
    type: 'text',
    content: text
  };
}

module.exports = {
  callOpenAI,
  enhanceResponse,
  parseResponse
};
