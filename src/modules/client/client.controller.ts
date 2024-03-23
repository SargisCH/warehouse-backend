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
  Query,
} from '@nestjs/common';
import {
  Client as ClientModel,
  Manager,
  Prisma,
  Role,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import { WeekDay } from 'src/shared/constants/global.constants';

import { AuthGuard } from '../auth/auth.guard';
import { ManagerService } from '../manager/manager.service';

import { ClientService } from './client.service';
import { ClientDTO } from './client.dto';

@ApiTags('client')
@Controller('/client')
export class ClientController {
  constructor(
    private clientService: ClientService,
    private managerService: ManagerService,
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  async getAllClients(
    @Query() query: { weekDay?: WeekDay },
    @Req() request: Request,
  ): Promise<ClientModel[]> {
    const where: Prisma.ClientWhereInput = {};
    const user = (request as any).user as User;
    let manager: Manager;

    if (user.role === Role.MANAGER) {
      manager = await this.managerService.findFirst({
        email: user.email,
      });
    }

    if (query.weekDay) {
      const and = manager
        ? [{ managerId: manager.id }, { dayPlan: { has: query.weekDay } }]
        : [{ dayPlan: { has: query.weekDay } }];
      where.Schedule = {
        some: {
          AND: and,
        },
      };
    }

    if (manager) {
      where.managerId = manager.id;
    }

    return this.clientService.findAll({ where }, user);
  }

  @Get('/:id')
  async getClientById(@Param('id') id: string): Promise<ClientModel> {
    return this.clientService.findOne({ id: Number(id) });
  }

  @Post('create')
  async createDraft(
    @Body()
    clientData: ClientDTO,
  ): Promise<ClientModel> {
    return this.clientService.create(clientData);
  }

  @Put('/:id')
  async editClient(
    @Param('id') id: string,
    @Body()
    clientData: Prisma.ClientUpdateInput,
  ): Promise<ClientModel> {
    return this.clientService.update({
      where: { id: Number(id) },
      data: { ...clientData },
    });
  }

  @Delete('/:id')
  async deleteClient(@Param('id') id: string): Promise<{ message: string }> {
    const deletedCount = await this.clientService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Client deleted successfully',
      };
    } else {
      return { message: 'Client deletion failed' };
    }
  }
}
