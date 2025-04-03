# FRED MCP Server

This module implements a Model Context Protocol (MCP) server for Federal Reserve Economic Data (FRED). It provides economic indicators and data that can be used by LLM clients to enhance their understanding of economic conditions.

## Features

- Fetches economic data from the FRED API
- Implements the Model Context Protocol for seamless integration with LLM clients
- Caches data to minimize API calls
- Supports dynamic addition of new economic indicators
- Scheduled daily updates to keep data fresh

## Available Economic Indicators

The following economic indicators are available by default:

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

## API Endpoints

### FRED Data Endpoints

- `GET /fred/series`: Get a list of all available series IDs
- `GET /fred/series/:id`: Get data for a specific series
- `POST /fred/series/add`: Add a new series to track

### MCP Endpoints

- `GET /fred/mcp/contexts`: Get MCP contexts for all available series
- `GET /fred/mcp/contexts/:seriesId`: Get MCP context for a specific series
- `POST /fred/mcp/contexts`: Get MCP contexts for specific series IDs

### Cache Management

- `POST /fred/cache/update`: Force an update of the data cache

## Usage

To use this module, you need a FRED API key which you can obtain from [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html).

Set your API key in the `.env` file:

```
FRED_API_KEY=your_fred_api_key_here
```

## Adding New Economic Indicators

To add a new economic indicator, use the `/fred/series/add` endpoint:

```
POST /fred/series/add
{
  "seriesId": "NEW_SERIES_ID"
}
```

## Architecture

The FRED MCP server is designed with scalability in mind. It consists of:

1. `FredService`: Handles direct API calls to FRED
2. `FredMcpService`: Implements the Model Context Protocol and manages caching
3. `FredController`: Exposes REST endpoints for client interaction

This modular design allows for easy extension to support additional data sources in the future.
