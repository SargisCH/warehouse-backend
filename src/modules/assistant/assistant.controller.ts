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
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AssistantGuard, DeveloperOnly } from './assistant.guard';
import { AssistantService } from './assistant.service';
import {
  ApproveDto,
  CreateThreadDto,
  MessageDto,
  PlanDto,
  StatusDto,
} from './assistant.dto';
@Controller('assistant')
@UseGuards(AuthGuard)
export class AssistantController {
  constructor(private service: AssistantService) {}
  @Get('access') access(@Req() req) {
    return this.service.access(req.user);
  }
  @Get('threads')
  @UseGuards(AssistantGuard)
  list(@Req() req) {
    return this.service.list(req.user);
  }
  @Get('plans/:id')
  @UseGuards(AssistantGuard)
  @DeveloperOnly()
  planDetail(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.planDetail(req.user, id);
  }
  @Post('threads')
  @UseGuards(AssistantGuard)
  create(@Req() req, @Body() body: CreateThreadDto) {
    return this.service.create(req.user, body);
  }
  @Get('threads/:id')
  @UseGuards(AssistantGuard)
  detail(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.detail(req.user, id);
  }
  @Post('threads/:id/messages')
  @UseGuards(AssistantGuard)
  reply(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MessageDto,
  ) {
    return this.service.reply(req.user, id, body.body);
  }
  @Post('threads/:id/plan')
  @UseGuards(AssistantGuard)
  @DeveloperOnly()
  plan(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.requestPlan(req.user, id);
  }
  @Post('threads/:id/plans')
  @UseGuards(AssistantGuard)
  @DeveloperOnly()
  edit(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PlanDto,
  ) {
    return this.service.editPlan(req.user, id, body.basePlanId, body.body);
  }
  @Post('threads/:id/approve')
  @UseGuards(AssistantGuard)
  @DeveloperOnly()
  approve(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: ApproveDto,
  ) {
    return this.service.approve(req.user, id, body.planId);
  }
  @Patch('threads/:id/status')
  @UseGuards(AssistantGuard)
  status(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: StatusDto,
  ) {
    return this.service.setStatus(req.user, id, body.status);
  }
}
