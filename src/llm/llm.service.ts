import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FredMcpService } from '../fred/fred-mcp.service';
import { ResponseInput, Tool, ResponseInputItem, EasyInputMessage, ResponseOutputMessage, ResponseOutputText } from 'openai/resources/responses/responses';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private openai: OpenAI;
  private readonly tools: Tool[] = [
    {
      type: "function",
      name: "get_economic_data",
      description: "Get economic data sourced from FRED (Federal Reserve Economic Data) for economic analysis",
      parameters: {
        type: "object",
        properties: {
          seriesIds: {
            type: "array",
            items: {
              type: "string"
            },
            description: "Array of FRED series IDs to retrieve data for."
          },
          limit: {
            type: "integer",
            description: "Number of most recent observations to return for each series (optional)"
          },
          startDate: {
            type: "string",
            format: "date",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "Start date in YYYY-MM-DD format (optional). If not provided, defaults to the first day of the current month."
          },
          endDate: {
            type: "string",
            format: "date",
            pattern: "^\\d{4}-\\d{2}-\\d{2}$",
            description: "End date in YYYY-MM-DD format (optional). If not provided, defaults to today."
          }
        },
        required: ["seriesIds"], 
      }, 
      strict: false
    },
    {
      type: "web_search_preview",
      user_location: {
          type: "approximate",
          timezone: "America/New_York"
      },
      search_context_size: "medium"
  }
  ];
  
  constructor(
    private readonly configService: ConfigService,
    private readonly fredMcpService: FredMcpService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY is not set. OpenAI API calls will fail.');
    }
    
    this.openai = new OpenAI({
      apiKey: apiKey,
    });
  }

  /**
   * Process a chat conversation with economic context from FRED using function calling
   * @param messages Array of chat messages
   * @returns The LLM response
   */
  async processChat(messages: ResponseInput): Promise<string> {
    //TODO: This logic below is supposed to be an example of pre-processing the responses but adding context such as system message. 
    //      lets see if we can find a cleaner way to implment this because I think it'll start to get weird once we implement the 
    //      previous_response_id parameter into our responses API calls
      if (!messages.some(msg => this.isEasyInputMessage(msg) && msg.role === 'system')) {
        messages.unshift({
          role: 'system',
          content: 'You are Cali, a financial AI advisor specializing in economic analysis and stock insights. You provide thoughtful, data-driven financial advice based on current economic indicators. You are helpful, professional, and concise in your responses.'
        });
      }

      try {
        // Initial call to the model with tools
        const response = await this.openai.responses.create({
          model: 'gpt-4o-mini',
          input: messages,
          tools: this.tools,
          temperature: 0.7,
        });

        this.logger.debug(`Initial response ID: ${response.id}`);
        
        // Check if the model wants to use any function tools
        const functionCalls = response.output.filter(output => output.type === 'function_call');
        
        if (functionCalls.length === 0) {
          // No function calls, return the response directly based off web or model
          if(response.output[0].type === 'web_search_call') {
            this.logger.debug(`Spotted web search response for call_id: ${response.output[0].id}`);
            const message = response.output[1] as ResponseOutputMessage;
            const content =  message.content[0] as ResponseOutputText;
            return content.text || 'I apologize, but I couldn\'t generate a response.';
          } else {
            this.logger.debug(`Returning model response`);
            return response.output_text || 'I apologize, but I couldn\'t generate a response.';
          }
        }

        // Process function calls and collect tool outputs
        const updatedMessages: ResponseInput = [...messages];
        
        // Add the model's response to the messages
        for (const output of response.output) {
          updatedMessages.push(output as ResponseInputItem);
        }
        
        // Process each function call
        for (const functionCall of functionCalls) {
          try {
            const args = JSON.parse(functionCall.arguments);
            const functionResponse = await this.handleFunctionCall(
              functionCall.name,
              args,
              functionCall.call_id
            );
            
            // Add function response to messages
            updatedMessages.push(functionResponse);
            
            this.logger.debug(`Added function response for call_id: ${functionCall.call_id}`);
          } catch (error) {
            this.logger.error(`Error processing function call ${functionCall.name}: ${error.message}`);
            // Add error response with a generated ID
            updatedMessages.push({
              id: this.generateShortId('err'),
              type: 'function_call_output',
              call_id: functionCall.call_id,
              output: JSON.stringify({ error: `Error processing function: ${error.message}` })
            });
          }
        }

        // Final call to model with function outputs
        const finalResponse = await this.openai.responses.create({
          model: 'gpt-4o-mini',
          input: updatedMessages,
          temperature: 0.7,
        });

        return finalResponse.output_text || 'I apologize, but I couldn\'t generate a response.';
      } catch (error) {
        this.logger.error(`Error processing chat: ${error.message}`);
        return 'I apologize, but I couldn\'t generate a response.';
      }
  }

  /**
   * Handle function calls from the LLM
   * @param name Function name
   * @param args Function arguments
   * @param callId Function call ID
   * @returns Function response
   */
  private async handleFunctionCall(
    name: string,
    args: any,
    callId: string
  ): Promise<{type: 'function_call_output', call_id: string, output: string}> {
    this.logger.log(`Handling function call: ${name} with callId: ${callId}`);
    
    try {
      let output: any;
      
      if (name === "get_economic_data") {
        output = await this.getEconomicData(
          args.seriesIds,
          args.limit,
          args.startDate,
          args.endDate
        );
      } 

      return {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(output)
      };
    } catch (error) {
      this.logger.error(`Error in function call ${name}: ${error.message}`);
      return {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify({ error: error.message })
      };
    }
  }

  /**
   * Get economic data for specific series IDs
   * @param seriesIds Array of FRED series IDs
   * @param limit Optional number of observations to return
   * @returns Economic data for the requested series
   */
  private async getEconomicData(seriesIds: string[], limit?: number, startDate?: string, endDate?: string): Promise<any> {
    try {
      // Get MCP contexts for the valid series IDs
      const contexts = await this.fredMcpService.getMcpContextsForSeries(seriesIds, limit, startDate, endDate);
      
      // Format the data for the response
      const formattedData = contexts.map(context => {
        const seriesData = context.content;
        
        // Limit the number of observations if specified
        const observations = limit && limit > 0 
          ? seriesData.observations.slice(0, limit) 
          : seriesData.observations;
        
        return {
          seriesId: seriesData.seriesId,
          title: seriesData.title,
          observations: observations,
          frequency: context.metadata.frequency,
          units: context.metadata.units,
          lastUpdated: context.metadata.lastUpdated
        };
      });
      
      return {
        data: formattedData,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error(`Error getting economic data: ${error.message}`);
      return {
        error: "Failed to retrieve economic data",
        message: error.message
      };
    }
  }

  private isEasyInputMessage(obj: ResponseInputItem): obj is EasyInputMessage {
    return (obj as EasyInputMessage).role !== undefined;
  }

  /**
   * Generate a short, unique ID that's compatible with OpenAI's requirements
   * @param prefix Optional prefix for the ID
   * @returns A unique ID string no longer than 64 characters
   */
  private generateShortId(prefix: string = 'id'): string {
    // Create a timestamp component (10 chars)
    const timestamp = Date.now().toString(36);
    
    // Create a random component (6 chars)
    const random = Math.random().toString(36).substring(2, 5);
    
    // Ensure the total length with prefix doesn't exceed 64 chars
    const maxPrefixLength = 52; // 64 - 10 - 2 (separators)
    const safePrefix = prefix.length > maxPrefixLength 
      ? prefix.substring(0, maxPrefixLength) 
      : prefix;
    
    return `${safePrefix}_${timestamp}_${random}`;
  }
}
