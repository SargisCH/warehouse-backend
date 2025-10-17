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
  BadRequestException,
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
import { RequestExtended } from 'src/configs/types';

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
    @Query()
    query: {
      weekDay?: WeekDay;
      searchTerm?: string;
      managerId: string;
      sortKey?: string;
      sortOrder?: string;
    },
    @Req() request: Request,
  ): Promise<ClientModel[]> {
    const user = (request as any).user as User;
    const where: Prisma.ClientWhereInput = { tenantId: user.tenantId };
    const sort: Prisma.ClientOrderByWithRelationInput = {};
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
    if (user.role === Role.ADMIN && query.managerId) {
      where.managerId = Number(query.managerId);
    }

    if (manager) {
      where.managerId = manager.id;
    }
    if (query.searchTerm) {
      where.OR = [
        { name: { contains: query.searchTerm } },
        { legalName: { contains: query.searchTerm } },
        { accountNumber: { contains: query.searchTerm } },
        { legalAddress: { contains: query.searchTerm } },
        { address: { contains: query.searchTerm } },
        { phoneNumber: { contains: query.searchTerm } },
        { otherPhoneNumber: { contains: query.searchTerm } },
        { email: { contains: query.searchTerm } },
        { taxId: { contains: query.searchTerm } },
      ];
    }
    if (query.sortKey) {
      sort[query.sortKey] = query.sortOrder;
    }
    return this.clientService.findAll({ where, orderBy: sort }, user);
  }

  @Get('/:id')
  async getClientById(@Param('id') id: string): Promise<ClientModel> {
    return this.clientService.findOne({ id: Number(id) });
  }
  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: RequestExtended,
    @Body()
    clientData: ClientDTO,
  ): Promise<ClientModel> {
    if (!clientData.taxId) {
      throw new BadRequestException('ՀՎՀՀ պարդտադիր դաշտ');
    }
    const client = await this.clientService.findFirst({
      taxId: clientData.taxId,
    });
    console.log('taxId', clientData.taxId, client);

    if (client) {
      throw new BadRequestException('ՀՎՀՀ արդեն գոյություն ունի');
    }
    return this.clientService.create(clientData, request.user.tenantId);
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
