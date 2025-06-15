import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../llm/llm.service';
import { ChatRequestDto } from './dto/chat.dto';
import { DynamoDBService } from './chathistory/DynamoDBService.service';
import { ChatMessage } from './chathistory/chat-history.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly llmService: LlmService,
    private readonly dynamoDBService: DynamoDBService,
  ) {}

  async processChat(chatRequest: ChatRequestDto, userId: string, sessionId?: string) {
    try {
      // Get existing chat history or create new one
      let chatHistory = sessionId 
        ? await this.dynamoDBService.getChatHistory(sessionId)
        : null;

      // Prepare messages array
      const messages: ChatMessage[] = chatHistory?.messages || [];
      
      // Add user message
      const userMessage: ChatMessage = {
        role: 'user',
        content: chatRequest.prompt
        // timestamp: new Date().toISOString(),
      };
      messages.push(userMessage);

      // Get AI response
      const aiResponse = await this.llmService.processChat(messages);
      
      // Add AI response to messages
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        // timestamp: new Date().toISOString(),
      };
      messages.push(assistantMessage);

      // Save or update chat history
      if (chatHistory) {
        await this.dynamoDBService.updateChatMessages(
          sessionId,
          messages,
        );
      } else {
        chatHistory = await this.dynamoDBService.saveChatHistory(
          userId,
          sessionId,
          messages,
        );
      }

      return {
        response: aiResponse,
        sessionId: chatHistory.id,
      };
    } catch (error) {
      this.logger.error('Error processing chat:', error);
      throw error;
    }
  }
}