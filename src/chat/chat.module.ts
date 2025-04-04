import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmService } from './llm.service';
import { FredModule } from '../fred/fred.module';

@Module({
  imports: [FredModule],
  controllers: [ChatController],
  providers: [ChatService, LlmService],
  exports: [ChatService]
})
export class ChatModule {}
