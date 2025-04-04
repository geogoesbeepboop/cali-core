import { FredModule } from "src/fred/fred.module";
import { LlmService } from "./llm.service";
import { Module } from "@nestjs/common";

@Module({
  imports: [FredModule],
  providers: [LlmService],
  exports: [LlmService],
})
export class LlmModule {}