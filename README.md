# Cali Financial AI Advisor - Backend

This is the backend service for Cali, a financial AI advisor specializing in economic analysis and stock insights.

## Features

- Chat functionality with AI for financial advice
- FRED Economic Data integration via Model Context Protocol (MCP)
- RESTful API endpoints for accessing economic indicators
- Scheduled data updates and caching

## Economic Indicators

The FRED MCP server provides access to the following economic indicators:

- `CPIAUCSL`: Consumer Price Index for All Urban Consumers
- `UNRATE`: Unemployment Rate
- `GDP`: Gross Domestic Product
- `DGS10`: 10-Year Treasury Constant Maturity Rate
- `DGS2`: 2-Year Treasury Constant Maturity Rate
- `FEDFUNDS`: Federal Funds Effective Rate
- `UMCSENT`: University of Michigan: Consumer Sentiment
- `HOUST`: Housing Starts
- `RSAFS`: Retail Sales
- `CP`: Corporate Profits
- `M2SL`: M2 Money Stock

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/cali-backend.git
   cd cali-backend
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file based on `.env.example` and add your API keys
   ```
   FRED_API_KEY=your_fred_api_key_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. Start the development server
   ```
   npm run start:dev
   ```

## API Endpoints

### Chat

- `POST /chat`: Send messages to the AI assistant

### FRED Economic Data

- `GET /fred/series`: Get a list of all available series IDs
- `GET /fred/series/:id`: Get data for a specific series
- `POST /fred/series/add`: Add a new series to track
- `GET /fred/mcp/contexts`: Get MCP contexts for all available series
- `GET /fred/mcp/contexts/:seriesId`: Get MCP context for a specific series
- `POST /fred/mcp/contexts`: Get MCP contexts for specific series IDs
- `POST /fred/cache/update`: Force an update of the data cache

## License

This project is licensed under the MIT License - see the LICENSE file for details.
