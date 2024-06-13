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
import { Sale as SaleModel, Prisma, User, Manager, Role } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import dayjs from 'dayjs';

import { AuthGuard } from '../auth/auth.guard';
import { ManagerService } from '../manager/manager.service';

import { SaleAPIType, SaleService } from './sale.service';
import { RequestExtended } from 'src/configs/types';

@ApiTags('sale')
@Controller('/sale')
export class SaleController {
  constructor(
    private saleService: SaleService,
    private managerService: ManagerService,
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  async getAllSales(
    @Req() request: Request,
    @Query()
    query?: {
      client?: Array<string>;
      page: number;
      limit: number;
      created_at: string | Date;
    },
  ): Promise<{ saleList: SaleModel[]; totalPages: number }> {
    const user = (request as any).user as User;
    const where: Prisma.SaleWhereInput = { tenantId: user.tenantId };
    let manager: Manager;
    if (user.role === Role.MANAGER) {
      manager = await this.managerService.findFirst({
        email: user.email,
      });

      if (manager) {
        where.client = { managerId: manager.id };
      }
    }

    if (Array.isArray(query?.client)) {
      where.clientId = { in: query.client.map((clId) => Number(clId)) };
    } else if (query.client) {
      where.clientId = Number(query.client);
    }
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = !page ? 0 : (page - 1) * limit;
    const take = parseInt(String(limit));
    const createdAt = dayjs(query.created_at, 'YYYY-MM-DD', true);

    const startOfDay = createdAt.startOf('day');
    const endOfDay = createdAt.endOf('day');

    if (query.created_at && createdAt.isValid()) {
      where.created_at = {
        gte: startOfDay.toISOString(),
        lte: endOfDay.toISOString(),
      };
    }
    const totalPages = await this.saleService.getTotalPages(limit, where);
    const saleList = await this.saleService.findAll({ where, skip, take });
    return {
      saleList,
      totalPages,
    };
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async getSaleById(@Param('id') id: string): Promise<SaleModel> {
    return this.saleService.findOne({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: Request,
    @Body()
    saleData: SaleAPIType,
  ): Promise<SaleModel> {
    return this.saleService.create(saleData, (request as any).user as User);
  }

  @Put('/:id')
  async editSale(
    @Param('id') id: string,
    @Body()
    saleData: Prisma.SaleUpdateInput,
  ): Promise<SaleModel> {
    return this.saleService.update({
      where: { id: Number(id) },
      data: { ...saleData },
    });
  }

  @Delete('/:id')
  async deleteSale(@Param('id') id: string): Promise<{ message: string }> {
    const deletedCount = await this.saleService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Sale deleted successfully',
      };
    } else {
      return { message: 'Sale deletion failed' };
    }
  }
}
