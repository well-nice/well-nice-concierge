# Well Nice Concierge

An AI-powered concierge with impeccable taste for wellnice.com.

## Overview

The Well Nice Concierge is a sophisticated, design-literate assistant that helps users discover beautiful, thoughtful, and timeless things. With the tone of Alan Rickman, Bill Nighy, and Jude Law, it offers tasteful recommendations in a distinctly British style.

## Features

- Pure AI-powered recommendations with Well Nice aesthetic sensibility
- Elegant, minimalist interface
- Thoughtful, considered responses to user queries
- Intelligent product discovery
- Contextual conversation management
- Continuous learning and insights generation

## Tech Stack

- **Backend**: Node.js with Express
- **AI**: OpenAI GPT-4 
- **Product Discovery**: Google Custom Search
- **Frontend**: Embedded in SquareSpace
- **Deployment**: Render

## Prerequisites

- Node.js (v16.0.0 or later)
- npm
- OpenAI API Key
- Google Custom Search API Key

## Setup

1. Clone the repository
   ```bash
   git clone https://github.com/your-org/well-nice-concierge.git
   cd well-nice-concierge
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create environment variables
   - Copy `.env.example` to `.env`
   - Fill in the required API keys
   ```bash
   cp .env.example .env
   ```

4. Configure environment variables
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GOOGLE_SEARCH_API_KEY`: Your Google Custom Search API key
   - `GOOGLE_SEARCH_ENGINE_ID`: Your Google Custom Search Engine ID

5. Run the application
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

- `POST /api/concierge`: Main conversation endpoint
- `GET /api/greeting`: Get a contextual greeting
- `GET /api/insights`: Retrieve current insights summary

## Deployment

Deploy on Render with the following environment variables:
- `PORT`: 5000 (or let Render handle this)
- `OPENAI_API_KEY`: Your OpenAI API key
- `GOOGLE_SEARCH_API_KEY`: Your Google Search API key
- `GOOGLE_SEARCH_ENGINE_ID`: Your Google Search Engine ID

## AI Learning Capabilities

The concierge features an intelligent learning system that:
- Tracks user interactions and preferences
- Generates insights from conversation patterns
- Continuously refines product recommendations

## Privacy

- Insights are anonymized and aggregated
- No personal user data is stored
- Learning is based on collective interaction patterns

## Contribution

Contributions are welcome. Please ensure:
- Code follows project's coding standards
- All tests pass
- No sensitive information is committed

## License

[Specify your license]

## Contact

For more information, contact [your contact information]
