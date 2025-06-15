import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';

@Controller('/api/chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Post()
  async chat(@Body() chatRequest: ChatRequestDto): Promise<String> {
    this.logger.log(`Processing prompt: ${chatRequest.prompt}`);    
    return (await this.chatService.processChat(chatRequest, '1')).response
  }

  @Get('test')
  async testChat(): Promise<String> {
    this.logger.log('Testing chat endpoint');
    return (await this.chatService.processChat({prompt: 'Whats shakin bacon?'}, "test")).response;
  }
}
