// src/chat/chathistory/dynamodb.service.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument, PutCommandInput, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { ChatHistory, ChatMessage, CHAT_HISTORY_TABLE } from './chat-history.entity';

@Injectable()
export class DynamoDBService implements OnModuleInit {
  private readonly logger = new Logger(DynamoDBService.name);
  private docClient: ReturnType<typeof DynamoDBDocument.from>;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const client = new DynamoDBClient({
      region: this.configService.get('AWS_REGION'),
      ...(process.env.NODE_ENV === 'development' && {
        credentials: {
          accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
        },
        endpoint: this.configService.get('DYNAMODB_ENDPOINT'),
      }),
    });

    this.docClient = DynamoDBDocument.from(client, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
  }

  async saveChatHistory(
    userId: string,
    sessionId: string,
    messages: ChatMessage[],
  ): Promise<ChatHistory> {
    const now = new Date().toISOString();
    const chatHistory: ChatHistory = {
      id: sessionId || uuidv4(),
      userId,
      sessionId: sessionId || uuidv4(),
      messages,
      createdAt: now,
      updatedAt: now,
    };

    const params: PutCommandInput = {
      TableName: CHAT_HISTORY_TABLE,
      Item: chatHistory,
    };

    try {
      await this.docClient.put(params);
      return chatHistory;
    } catch (error) {
      this.logger.error('Error saving chat history:', error);
      throw error;
    }
  }

  async getChatHistory(sessionId: string): Promise<ChatHistory | null> {
    const params: QueryCommandInput = {
      TableName: CHAT_HISTORY_TABLE,
      KeyConditionExpression: 'id = :sessionId',
      ExpressionAttributeValues: {
        ':sessionId': sessionId,
      },
      Limit: 1,
    };

    try {
      const result = await this.docClient.query(params);
      return (result.Items?.[0] as ChatHistory) || null;
    } catch (error) {
      this.logger.error('Error fetching chat history:', error);
      throw error;
    }
  }

  async updateChatMessages(
    sessionId: string,
    messages: ChatMessage[],
  ): Promise<ChatHistory | null> {
    const now = new Date().toISOString();
    const params = {
      TableName: CHAT_HISTORY_TABLE,
      Key: { id: sessionId },
      UpdateExpression: 'SET #messages = :messages, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#messages': 'messages',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':messages': messages,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW' as const,
    };

    try {
      const result = await this.docClient.update(params);
      return result.Attributes as ChatHistory;
    } catch (error) {
      this.logger.error('Error updating chat messages:', error);
      throw error;
    }
  }
}