import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  Manager as ManagerModel,
  Prisma,
  Schedule,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';

import { ManagerService } from './manager.service';
import { RequestExtended } from 'src/configs/types';

@ApiTags('manager')
@Controller('/manager')
export class ManagerController {
  constructor(private managerService: ManagerService) {}

  @UseGuards(AuthGuard)
  @Get('/')
  async getAllManagers(
    @Req() request: RequestExtended,
  ): Promise<ManagerModel[]> {
    return this.managerService.findAll({
      where: { tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async getManagerById(@Param('id') id: string): Promise<ManagerModel> {
    return this.managerService.findOne({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @Get('/:id/schedule/:clientId')
  async getSchedule(
    @Param('id') id: string,
    @Param('clientId') clientId: string,
  ): Promise<Schedule> {
    return this.managerService.findSchedule(Number(id), Number(clientId));
  }

  @Post('create')
  @UseGuards(AuthGuard)
  async createManager(
    @Req() request: Request,
    @Body()
    managerData: Prisma.ManagerCreateInput,
  ): Promise<ManagerModel> {
    return this.managerService.create(
      managerData,
      (request as any).user as User,
    );
  }

  @UseGuards(AuthGuard)
  @Put('/:id')
  async editManager(
    @Param('id') id: string,
    @Body()
    managerData: Prisma.ManagerUpdateInput,
  ): Promise<ManagerModel> {
    return this.managerService.update({
      where: { id: Number(id) },
      data: { ...managerData },
    });
  }

  @UseGuards(AuthGuard)
  @Delete('/:id')
  async deleteManager(@Param('id') id: string): Promise<{ message: string }> {
    const deletedCount = await this.managerService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Manager deleted successfully',
      };
    } else {
      return { message: 'Manager deletion failed' };
    }
  }
}
