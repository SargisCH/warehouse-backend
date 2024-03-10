import {
  Controller,
  Get,
  Body,
  Delete,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Client as ClientModel, Prisma } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { ClientService } from './client.service';
import { ClientDTO } from './client.dto';

@ApiTags('client')
@Controller('/client')
export class ClientController {
  constructor(private clientService: ClientService) {}

  @Get('/')
  async getAllClients(): Promise<ClientModel[]> {
    return this.clientService.findAll({});
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
