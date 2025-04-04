import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Post()
  async chat(@Body() chatRequest: ChatRequestDto): Promise<String> {
    this.logger.log(`Processing prompt: ${chatRequest.prompt}`);    
    return this.chatService.processChat(chatRequest);
  }

  @Get('test')
  async testChat(): Promise<String> {
    this.logger.log('Testing chat endpoint');
    return this.chatService.processChat({prompt: 'Whats shakin bacon?'});
  }
}
