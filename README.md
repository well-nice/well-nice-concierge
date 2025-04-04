# Well Nice Concierge

An AI-powered concierge with impeccable taste for wellnice.com.

## Overview

The Well Nice Concierge is a sophisticated, design-literate assistant that helps users discover beautiful, thoughtful, and timeless things. With the tone of Alan Rickman, Bill Nighy, and Jude Law, it offers tasteful recommendations in a distinctly British style.

## Features

- Pure AI-powered recommendations with Well Nice aesthetic sensibility
- Elegant, minimalist interface that fits seamlessly into the Well Nice brand
- Thoughtful, considered responses to user queries
- Time-of-day aware greetings
- Conversation context memory

## Tech Stack

- **Backend**: Node.js with Express
- **AI**: OpenAI GPT-4 
- **Frontend**: Embedded in SquareSpace
- **Deployment**: Render

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with:
   ```
   PORT=5000
   OPENAI_API_KEY=your_openai_api_key
   ```
4. Start the server: `npm start`

## API Endpoints

- `POST /api/concierge`: Main endpoint for concierge conversations
- `GET /api/greeting`: Get time-based greeting message

## Deployment

Deploy on Render with the following environment variables:
- `PORT`: 5000 (or let Render handle this)
- `OPENAI_API_KEY`: Your OpenAI API key

## Frontend Integration

The concierge is designed to be embedded directly into a SquareSpace page as a seamless part of the Well Nice experience, rather than as a pop-up chatbot.

## AI Learning Capabilities

The Well Nice Concierge features an intelligent learning system that continuously improves recommendations:

### Insights Accumulation
- Tracks user interactions and preferences over time
- Learns from:
  * Conversation queries
  * Product search results
  * User interaction patterns

### Key Insights Tracked
- Popular brands
- Preferred colors
- Frequently mentioned product categories
- Common user query patterns

### Insights API Endpoints
- `GET /api/insights`: Retrieve current insights summary
- `POST /api/generate-insights`: Manually trigger insights generation

### Learning Mechanism
The concierge becomes smarter with each interaction, providing more personalized and refined recommendations over time.

### Privacy Note
- Insights are anonymized and aggregated
- No personal user data is stored
- Learning is based on collective interaction patterns
