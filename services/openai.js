const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function callOpenAI(messages) {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages,
      response_format: { type: "json_object" }, // Enforce JSON responses
      temperature: 0.7,
      max_tokens: 1000 // Increased for more detailed responses
    },
    {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.choices[0].message.content;
}

async function enhanceResponse(text) {
  try {
    // First attempt to parse as JSON
    try {
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
    } catch (jsonError) {
      // Not valid JSON, continue with text parsing
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
  // Check for markdown tables
  if (text.includes('|') && text.includes('---')) {
    const lines = text.split('\n').filter(Boolean);
    const start = lines.findIndex(l => l.includes('|'));
    if (start === -1) return { type: 'text', content: text };
    
    const headers = lines[start].split('|')
      .map(h => h.trim())
      .filter(h => h !== '');
      
    // Find the separator line (contains dashes)
    const separatorIndex = lines.findIndex((line, i) => 
      i > start && line.includes('-') && line.includes('|')
    );
    
    if (separatorIndex === -1) return { type: 'text', content: text };
    
    const rows = lines.slice(separatorIndex + 1)
      .filter(line => line.includes('|'))
      .map(line => {
        const cells = line.split('|')
          .map(c => c.trim())
          .filter((_, i) => i > 0 && i <= headers.length);
          
        return Object.fromEntries(headers.map((h, i) => [h.toLowerCase(), cells[i] || '']));
      });
      
    return { 
      type: 'table', 
      title: lines.slice(0, start).join(' ').trim() || 'Curated Selection', 
      content: rows 
    };
  }

  // Check for product-like sections
  const sections = text.split('\n\n').filter(Boolean);
  if (sections.length >= 2) {
    const cards = sections.map(section => {
      const lines = section.split('\n');
      // Extract price with better pattern matching
      const priceIndex = lines.findIndex(l => 
        l.includes('£') || l.match(/\$\d+/) || l.toLowerCase().includes('price')
      );
      
      const price = priceIndex >= 0 ? lines[priceIndex] : '£TBC';
      const name = lines[0].trim();
      
      // Extract URL if present
      const urlLine = lines.find(l => 
        l.includes('http') || l.includes('www.') || l.includes('.com')
      );
      const url = urlLine ? extractUrl(urlLine) : '#';
      
      // Better description handling - remove name, price and URL lines
      const descLines = lines.filter((_, i) => 
        i !== 0 && i !== priceIndex && (urlLine ? !lines[i].includes(urlLine) : true)
      );
      
      return {
        name,
        price,
        description: descLines.join(' ').trim(),
        image: '/assets/images/product-placeholder.jpg',
        url
      };
    });
    
    return { type: 'product-cards', title: 'Curated Selection', content: cards };
  }

  return { type: 'text', content: text };
}

// Helper function to extract URLs
function extractUrl(text) {
  const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[^\s]+)/;
  const match = text.match(urlPattern);
  return match ? match[0] : '#';
}

module.exports = { callOpenAI, enhanceResponse };
