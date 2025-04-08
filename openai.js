const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function callOpenAI(messages) {
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
}

async function enhanceResponse(text) {
  try {
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
          image: p.image,
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
