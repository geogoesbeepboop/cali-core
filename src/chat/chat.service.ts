import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import { ChatRequestDto } from './dto/chat.dto';
import { ResponseInput } from 'openai/resources/responses/responses';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly llmService: LlmService) {}

  /**
   * Process chat messages and return AI response
   * @param messages Array of chat messages from the user
   * @returns Object containing the AI response
   */
  async processChat(chatRequest: ChatRequestDto) {
    try {      
      // Add a system message if one doesn't exist
      const messages: ResponseInput = [];
      messages.push({
        role: 'user', 
        content: chatRequest.prompt
      });
      // Process the chat with the LLM service
      const response = await this.llmService.processChat(messages);
      
      this.logger.log('Chat processed successfully');
      return { response };
    } catch (error) {
      this.logger.error('Error processing chat:', error);
      throw error;
    }
  }
}
