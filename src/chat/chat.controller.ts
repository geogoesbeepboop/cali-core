import { Controller, Post, Body, Logger, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
  private readonly logger = new Logger(ChatController.name);
  
  constructor(
    private readonly chatService: ChatService,
  ) {}

  @Post()
  async chat(@Body() chatRequest: ChatRequestDto): Promise<ChatResponseDto> {
    this.logger.log(`Processing prompt: ${chatRequest.prompt}`);    
    return this.chatService.processChat(chatRequest);
  }

  @Get('test')
  async testChat(): Promise<ChatResponseDto> {
    this.logger.log('Testing chat with economic data integration');
    return this.chatService.processChat({prompt: 'give me a summary of how inflation has been progressing since the 2020 pandemic'});
  }
}
