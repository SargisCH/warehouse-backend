import { Module } from '@nestjs/common';
import { DrizzleModule } from '../../drizzle/drizzle.module';
import { AuthModule } from '../auth/auth.module';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { AssistantGuard } from './assistant.guard';
import { GeminiClient } from './gemini.client';
import { AssistantProcessor } from './assistant.processor';
@Module({
  imports: [DrizzleModule, AuthModule],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    AssistantGuard,
    GeminiClient,
    AssistantProcessor,
  ],
  exports: [AssistantProcessor, GeminiClient],
})
export class AssistantModule {}
