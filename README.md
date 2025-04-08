# Well Nice Concierge (GPT-only)

This is the full backend for the Well Nice Concierge, powered 100% by GPT.

## Features
- Uses OpenAI GPT-4 to power product/lifestyle discovery
- Formats responses as text, tables, or product cards
- No scraping or external data enrichment — clean and fast

## Setup

1. Clone the repo or unzip the project folder
2. Install dependencies:

   ```bash
   npm install
   ```

3. Add a `.env` file:

   ```
   OPENAI_API_KEY=your-api-key
   OPENAI_MODEL=gpt-4
   ```

4. Start the server locally:

   ```bash
   node server.js
   ```

5. Deploy to Render, Railway, or your host of choice. Ensure the server binds to `process.env.PORT`.

## Endpoints

- `POST /api/concierge`
- `POST /api/concierge/:conversationId`
