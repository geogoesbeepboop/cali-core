import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';

interface ChatRequest {
  messages: Array<{ role: string; content: string }>;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async chat(@Body() chatRequest: ChatRequest) {
    return this.chatService.processChat(chatRequest.messages);
  }
}
