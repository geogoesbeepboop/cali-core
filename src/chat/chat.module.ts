import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { FredModule } from '../fred/fred.module';
import { LlmModule } from 'src/llm/llm.module';
import { DynamoDBModule } from './chathistory/dynamodb.module';

@Module({
  imports: [FredModule, LlmModule, DynamoDBModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService]
})
export class ChatModule {}
