// services/openai.js
const axios = require('axios');
const dotenv = require('dotenv');
const { getProductRecommendations } = require('./products');

dotenv.config();

// --- Call OpenAI with conversation history ---
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
    throw new Error(`OpenAI API Error: ${error.response?.data?.error?.message || error.message}`);
  }
}

// --- Enhance response: text → structure ---
async function enhanceResponse(text) {
  try {
    const parsedResponse = parseResponse(text);

    // If product cards, enrich with real data
    if (parsedResponse.type === 'product-cards') {
      const productNames = parsedResponse.content.map(p => p.name);
      const realProducts = await getProductRecommendations(productNames);

      if (realProducts?.length) {
        parsedResponse.content = parsedResponse.content.map((product, i) => {
          const match = realProducts.find(p => p.name.toLowerCase() === product.name.toLowerCase()) || realProducts[i];
          return match ? {
            ...product,
            price: match.price || product.price,
            description: match.description || product.description,
            image: match.image || product.image,
            url: match.url || '#'
          } : product;
        });
      }
    }

    // --- Standardized Output Format ---
    if (parsedResponse.type === 'text') {
      return [{ type: 'text', text: parsedResponse.content }];
    }

    if (parsedResponse.type === 'table') {
      return [
        { type: 'text', text: parsedResponse.title || 'Here’s what I found:' },
        { type: 'table', rows: parsedResponse.content }
      ];
    }

    if (parsedResponse.type === 'product-cards') {
      return [
        { type: 'text', text: parsedResponse.title || 'Here are some options:' },
        ...parsedResponse.content.map(product => ({
          type: 'product',
          title: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          url: product.url || '#'
        }))
      ];
    }

    // Fallback
    return [{ type: 'text', text }];
  } catch (error) {
    console.error('Error enhancing response:', error);
    return [{ type: 'text', text }];
  }
}

// --- Parse GPT response for structure ---
function parseResponse(text) {
  // Try to parse a markdown-style table
  if (text.includes('|') && text.includes('---')) {
    try {
      const lines = text.split('\n').filter(line => line.trim());
      const start = lines.findIndex(line => line.includes('|'));
      const title = lines.slice(0, start).join(' ').replace(/[#*]/g, '').trim();

      const headers = lines[start].split('|').map(h => h.trim()).filter(Boolean);
      const bodyStart = lines[start + 1].includes('---') ? start + 2 : start + 1;

      const rows = lines.slice(bodyStart).map(line => {
        const values = line.split('|').map(cell => cell.trim()).filter(Boolean);
        if (values.length !== headers.length) return null;

        const row = {};
        headers.forEach((header, i) => {
          row[header.toLowerCase()] = values[i];
        });
        return row;
      }).filter(Boolean);

      if (rows.length) {
        return {
          type: 'table',
          title: title || 'Recommended Products',
          content: rows
        };
      }
    } catch (err) {
      console.error('Table parsing error:', err);
    }
  }

  // Try to detect and extract product card-like content
  const sections = text.split('\n\n').filter(Boolean);
  if (sections.length >= 2) {
    const cards = sections.map(section => {
      const lines = section.split('\n').filter(Boolean);
      const name = lines[0].replace(/[#*:]/g, '').trim();
      const priceLine = lines.find(l => l.includes('£') || l.includes('$') || l.toLowerCase().includes('price'));
      const price = priceLine ? priceLine.match(/([£$]?\s?\d+[\d.,]*)/i)?.[0] : '£TBC';
      const description = lines.slice(1).filter(l => l !== priceLine).join(' ');

      return {
        name,
        price: price || '£TBC',
        description: description || 'A well nice item',
        image: '/assets/images/product-placeholder.jpg'
      };
    });

    if (cards.length >= 2) {
      const title = sections[0].startsWith('#') ? sections[0].replace(/[#*]/g, '').trim() : 'Curated Picks';
      return {
        type: 'product-cards',
        title,
        content: cards
      };
    }
  }

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
