# Well Nice Concierge API

Backend API for the Well Nice Concierge, a sophisticated taste-maker and lifestyle guide.

## Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- OpenAI API key

### Installation

1. Clone this repository:
```bash
git clone <your-repository-url>
cd well-nice-concierge-api
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on the provided example:
```bash
cp .env.example .env
```

4. Update the `.env` file with your OpenAI API key and other settings.

### Development

To run the server in development mode with auto-reload:

```bash
npm run dev
```

### Production

To start the server in production mode:

```bash
npm start
```

## API Endpoints

### Health Check

```
GET /api/health
```

Returns the API status and version.

### Concierge API

```
POST /api/concierge
```

Body:
```json
{
  "message": "Your user query here",
  "conversationHistory": [
    {"role": "user", "content": "Previous user message"},
    {"role": "assistant", "content": "Previous assistant response"}
  ],
  "conversationId": "optional-existing-conversation-id"
}
```

Response:
```json
{
  "reply": "The AI response",
  "conversationId": "conversation-identifier"
}
```

## Deployment

### Environment Variables

Make sure to set these environment variables in your production environment:

- `OPENAI_API_KEY`: Your OpenAI API key
- `ALLOWED_ORIGINS`: Comma-separated list of allowed origins for CORS
- `NODE_ENV`: Set to "production"
- `PORT`: The port to run the server on (defaults to 3000)

### Deployment Options

#### Render

1. Push your code to a GitHub repository
2. Create a new Web Service in Render
3. Connect to your GitHub repository
4. Set the build command: `npm install`
5. Set the start command: `node server.js`
6. Add your environment variables in the Render dashboard

#### Vercel

1. Install Vercel CLI: `npm install -g vercel`
2. Create a `vercel.json` file:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```
3. Deploy: `vercel --prod`

## License

This project is proprietary software of Well Nice.
