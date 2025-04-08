// services/openai.js
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// --- Call ChatGPT with your message history ---
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

// --- Enhance ChatGPT response for frontend formatting ---
async function enhanceResponse(text) {
  try {
    const parsed = parseResponse(text);

    if (parsed.type === 'text') {
      return [{ type: 'text', text: parsed.content }];
    }

    if (parsed.type === 'table') {
      return [
        { type: 'text', text: parsed.title || 'Here’s what I found:' },
        { type: 'table', rows: parsed.content }
      ];
    }

    if (parsed.type === 'product-cards') {
      return [
        { type: 'text', text: parsed.title || 'Here are some options:' },
        ...parsed.content.map(product => ({
          type: 'product',
          title: product.name,
          price: product.price,
          description: product.description,
          image: product.image,
          url: product.url || '#'
        }))
      ];
    }

    return [{ type: 'text', text }];
  } catch (error) {
    console.error('Error enhancing response:', error);
    return [{ type: 'text', text }];
  }
}

// --- Try to detect tables or product card structure from ChatGPT ---
function parseResponse(text) {
  if (text.includes('|') && text.includes('---')) {
    try {
      const lines = text.split('\n').filter(Boolean);
      const start = lines.findIndex(line => line.includes('|'));
      const title = lines.slice(0, start).join(' ').replace(/[#*]/g, '').trim();
      const headers = lines[start].split('|').map(h => h.trim()).filter(Boolean);
      const bodyStart = lines[start + 1].includes('---') ? start + 2 : start + 1;

      const rows = lines.slice(bodyStart).map(line => {
        const values = line.split('|').map(cell => cell.trim()).filter(Boolean);
        if (values.length !== headers.length) return null;
        const row = {};
        headers.forEach((h, i) => { row[h.toLowerCase()] = values[i]; });
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
      console.error('Table parsing failed:', err);
    }
  }

  // Simple product card-style detection
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
        image: '/assets/images/product-placeholder.jpg',
        url: '#'
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
  enhanceResponse
};
