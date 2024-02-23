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
import { Sale as SaleModel, Prisma, User } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { AuthGuard } from '../auth/auth.guard';

import { SaleAPIType, SaleService } from './sale.service';

@ApiTags('sale')
@Controller('/sale')
export class SaleController {
  constructor(private saleService: SaleService) {}
  @Get('/')
  async getAllSales(
    @Query() query?: { client?: Array<string>; page: number; limit: number },
  ): Promise<{ saleList: SaleModel[]; totalPages: number }> {
    const where: Prisma.SaleWhereInput = {};

    if (Array.isArray(query?.client)) {
      where.clientId = { in: query.client.map((clId) => Number(clId)) };
    } else if (query.client) {
      where.clientId = Number(query.client);
    }
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = (page - 1 || 1) * limit;
    const take = parseInt(String(limit));
    const totalPages = await this.saleService.getTotalPages(limit);
    const saleList = await this.saleService.findAll({ where, skip, take });
    return {
      saleList,
      totalPages,
    };
  }

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
