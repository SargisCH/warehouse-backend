import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { CreateThreadDto, MessageDto, StatusDto } from './assistant.dto';
import { FinitIntegrationGuard } from './finit-integration';

@Controller('assistant/integrations/finit')
@UseGuards(FinitIntegrationGuard)
export class FinitIntegrationController {
  constructor(private service: AssistantService) {}
  @Get('access') access(@Req() req) {
    return this.service.access(req.user);
  }
  @Get('threads') list(@Req() req) {
    return this.service.list(req.user);
  }
  @Get('threads/:id') detail(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.detail(req.user, id);
  }
  @Post('threads') create(
    @Req() req,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: CreateThreadDto,
  ) {
    return this.service.create(req.user, body);
  }
  @Post('threads/:id/messages') reply(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: MessageDto,
  ) {
    return this.service.reply(req.user, id, body.body);
  }
  @Patch('threads/:id/status') status(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
    body: StatusDto,
  ) {
    return this.service.setStatus(req.user, id, body.status);
  }
}
