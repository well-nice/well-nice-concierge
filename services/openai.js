// services/openai.js
const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function callOpenAI(messages) {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000 // Increased from 800
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
    console.error('OpenAI API error:', error.response?.data || error.message);
    throw error;
  }
}

async function enhanceResponse(text) {
  try {
    // Check for JSON format first
    try {
      if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
        const jsonData = JSON.parse(text);
        
        // Handle single product case
        if (jsonData.type === 'product') {
          return [
            { type: 'text', text: 'Perfect Match' },
            {
              type: 'product',
              title: jsonData.title,
              price: jsonData.price,
              description: jsonData.description,
              image: jsonData.image || '/assets/images/product-placeholder.jpg',
              url: jsonData.url || '#'
            }
          ];
        }
        
        // Handle product list case
        if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0].type === 'product') {
          return [
            { type: 'text', text: 'Curated Selection' },
            ...jsonData.map(p => ({
              type: 'product',
              title: p.title,
              price: p.price,
              description: p.description,
              image: p.image || '/assets/images/product-placeholder.jpg',
              url: p.url || '#'
            }))
          ];
        }
        
        // Handle any other structured JSON response
        if (jsonData.products && Array.isArray(jsonData.products)) {
          return [
            { type: 'text', text: jsonData.title || 'Curated Selection' },
            ...jsonData.products.map(p => ({
              type: 'product',
              title: p.title || p.name,
              price: p.price || '£TBC',
              description: p.description,
              image: p.image || '/assets/images/product-placeholder.jpg',
              url: p.url || '#'
            }))
          ];
        }
      }
    } catch (jsonError) {
      // Not valid JSON, continue with text parsing
      console.log('Not JSON format, continuing with other parsing methods');
    }
    
    // Fall back to original parsing methods
    const parsed = parseResponse(text);
    if (parsed.type === 'text') {
      return [{ type: 'text', text: parsed.content }];
    }
    if (parsed.type === 'table') {
      return [{ type: 'text', text: parsed.title }, { type: 'table', rows: parsed.content }];
    }
    if (parsed.type === 'product-cards') {
      return [
        { type: 'text', text: parsed.title },
        ...parsed.content.map(p => ({
          type: 'product',
          title: p.name,
          price: p.price,
          description: p.description,
          image: p.image || '/assets/images/product-placeholder.jpg',
          url: p.url || '#'
        }))
      ];
    }
    return [{ type: 'text', text }];
  } catch (e) {
    console.error('Enhance error:', e);
    return [{ type: 'text', text }];
  }
}

function parseResponse(text) {
  // Keep your original parseResponse function
  if (text.includes('|') && text.includes('---')) {
    const lines = text.split('\n').filter(Boolean);
    const start = lines.findIndex(l => l.includes('|'));
    const headers = lines[start].split('|').map(h => h.trim());
    const rows = lines.slice(start + 2).map(line => {
      const cells = line.split('|').map(c => c.trim());
      return Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), cells[i]]));
    });
    return { type: 'table', title: lines[0] || 'Results', content: rows };
  }

  const sections = text.split('\n\n').filter(Boolean);
  if (sections.length >= 2) {
    const cards = sections.map(section => {
      const lines = section.split('\n');
      return {
        name: lines[0],
        price: lines.find(l => l.includes('£')) || '£TBC',
        description: lines.slice(1).join(' '),
        image: '/assets/images/product-placeholder.jpg',
        url: '#'
      };
    });
    return { type: 'product-cards', title: 'Curated Finds', content: cards };
  }

  return { type: 'text', content: text };
}

module.exports = { callOpenAI, enhanceResponse };
