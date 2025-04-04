# Well Nice Concierge Backend API

GPT-driven personal shopper backend with product search and AI assistance.

## Overview

The Well Nice Concierge is a chat interface that:

- Helps users discover products (e.g., Carhartt t-shirts, mid-century desk lamps)
- Compares items with style and reasoning
- Provides inspiration (books, lifestyle picks, gifts)
- Answers design-minded queries
- Shows rich product previews with images, descriptions, and links

## Features

- WhatsApp-style chat interface
- AI-powered product recommendations
- Product search through curated retailers
- Rich preview cards
- Warm, British tone (Alan Rickman, Bill Nighy, etc.)
- Fallback to GPT-4 for non-product queries
- Conversation context memory

## Tech Stack

- **Backend**: Node.js with Express
- **AI**: OpenAI GPT-4 
- **Scraping**: Metascraper, Cheerio
- **Data**: Google Sheets integration
- **Deployment**: Render

## API Endpoints

- `POST /api/query`: Original product recommendation endpoint
- `POST /api/concierge`: Enhanced product search with conversation context
- `GET /api/greeting`: Get time-based greeting message

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with:
   ```
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_SHEET_URL=https://docs.google.com/spreadsheets/d/your_sheet_id/export?format=csv
   ```
4. Start the server: `npm start`

## Google Sheet Setup

Create a Google Sheet with columns like:
- name
- description
- category 
- url
- tags

Make the sheet public and use the CSV export URL.

## Deployment

Deploy this API on Render.com for optimal performance.

## Frontend Integration

The backend API is designed to work with a SquareSpace embedded frontend.
