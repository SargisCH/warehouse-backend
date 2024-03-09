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
import { Manager as ManagerModel, Prisma, User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';

import { ManagerService } from './manager.service';

@ApiTags('manager')
@Controller('/manager')
export class ManagerController {
  constructor(private managerService: ManagerService) {}

  @Get('/')
  async getAllManagers(): Promise<ManagerModel[]> {
    return this.managerService.findAll({});
  }

  @Get('/:id')
  async getManagerById(@Param('id') id: string): Promise<ManagerModel> {
    return this.managerService.findOne({ id: Number(id) });
  }

  @Post('create')
  @UseGuards(AuthGuard)
  async createManager(
    @Req() request: Request,
    @Body()
    managerData: Prisma.ManagerCreateInput,
  ): Promise<ManagerModel> {
    console.log('manahger create');
    return this.managerService.create(
      managerData,
      (request as any).user as User,
    );
  }

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
