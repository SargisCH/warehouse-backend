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
  Sale as SaleModel,
  SaleReturn as SaleReturnModel,
  User,
  Manager,
  Role,
  Prisma,
  SaleItem,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';
import dayjs from 'dayjs';

import { AuthGuard } from '../auth/auth.guard';
import { ManagerService } from '../manager/manager.service';

import { SaleAPIType, SaleService } from './sale.service';
import { RequestExtended } from 'src/configs/types';
import { PaymentTypeEnum } from '../inventorySupplier/inventorySupplierOrder.dto';

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
      manager?: Array<string>;
      stockProduct?: Array<string>;
      startDate: string | Date;
      endDate: string | Date;
    },
  ): Promise<{ saleList: SaleModel[]; totalPages: number }> {
    const user = (request as any).user as User;
    const where: Prisma.SaleWhereInput = { tenantId: user.tenantId };
    let manager: Manager;

    if (Array.isArray(query?.client)) {
      where.clientId = { in: query.client.map((clId) => Number(clId)) };
    } else if (query.client) {
      where.clientId = Number(query.client);
    }
    if (Array.isArray(query?.stockProduct)) {
      where.saleItems = {
        some: {
          stockProduct: {
            id: { in: query.stockProduct.map((clId) => Number(clId)) },
          },
        },
      };
    } else if (query?.stockProduct) {
      where.saleItems = {
        some: {
          stockProduct: {
            id: Number(query.stockProduct),
          },
        },
      };
    }
    if (Array.isArray(query?.manager)) {
      where.client = {
        managerId: { in: query.manager.map((mnId) => Number(mnId)) },
      };
    } else if (query.manager) {
      where.client = { managerId: Number(query.manager) };
    }
    if (user.role === Role.MANAGER) {
      manager = await this.managerService.findFirst({
        email: user.email,
      });

      if (manager) {
        where.client = { managerId: manager.id };
        if (query.startDate) {
          const startDate = dayjs(query.startDate, 'YYYY-MM-DD', true);
          if (startDate.isAfter(startDate.add(30, 'days'))) {
          }
        }
      }
    }
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = !page ? 0 : (page - 1) * limit;
    const take = parseInt(String(limit));
    const startDate = dayjs(query.startDate, 'YYYY-MM-DD', true);
    let endDate;
    if (query.endDate) {
      endDate = dayjs(query.endDate, 'YYYY-MM-DD', true);
    }

    const startOfDay = startDate.startOf('day');

    let endOfDay;
    if (query.endDate) {
      endOfDay = endDate.endOf('day');
    }

    if (query.startDate && startDate.isValid() && !query.endDate) {
      const end = startDate.endOf('day');
      where.created_at = {
        gte: startOfDay.toISOString(),
        lte: end.toISOString(),
      };
    } else if (
      query.startDate &&
      query.endDate &&
      startDate.isValid() &&
      endDate &&
      endDate.isValid()
    ) {
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
  @Get('/return')
  @UseGuards(AuthGuard)
  async getAllReturnSales(
    @Req() request: Request,
    @Query()
    query?: {
      client?: Array<string>;
      page: number;
      limit: number;
      created_at: string | Date;
    },
  ): Promise<{ saleId: number; returnItems: SaleReturnModel[] }[]> {
    const user = (request as any).user as User;
    const where: Prisma.SaleReturnWhereInput = {
      tenantId: user.tenantId,
      sale: {},
    };
    const page = query?.page || 1;
    const limit = query?.limit || 10;
    const skip = !page ? 0 : (page - 1) * limit;
    const take = parseInt(String(limit));
    const createdAt = dayjs(query.created_at, 'YYYY-MM-DD', true);

    const startOfDay = createdAt.startOf('day');
    const endOfDay = createdAt.endOf('day');
    if (Array.isArray(query?.client)) {
      where.sale.clientId = { in: query.client.map((clId) => Number(clId)) };
    } else if (query.client) {
      where.sale.clientId = Number(query.client);
    }
    if (query.created_at && createdAt.isValid()) {
      where.created_at = {
        gte: startOfDay.toISOString(),
        lte: endOfDay.toISOString(),
      };
    }
    const saleList = await this.saleService.findAllReturns({
      where,
      skip,
      take,
    });
    return saleList;
  }

  @Get('/return/:saleId')
  @UseGuards(AuthGuard)
  async getReturnBySaleId(
    @Param('saleId') saleId: string,
    @Req() request: Request,
    @Query()
    query?: {
      client?: Array<string>;
      page: number;
      limit: number;
      created_at: string | Date;
    },
  ): Promise<{ saleId: number; returnItems: SaleReturnModel[] }> {
    const returns = await this.saleService.findAllReturns({
      where: { saleId: Number(saleId) },
    });
    return returns[0];
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
  @UseGuards(AuthGuard)
  @Post('/:id/return/confirm')
  async confirmReturn(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body() {},
  ): Promise<{ message: string }> {
    await this.saleService.confirmReturn(Number(id), request.user);
    return { message: 'Return is confirmed' };
  }

  @UseGuards(AuthGuard)
  @Post('/return/confirm/:returnId')
  async confirmReturnById(
    @Req() request: RequestExtended,
    @Param('returnId') returnId: string,
    @Body() {},
  ): Promise<{ message: string }> {
    await this.saleService.confirmReturnByReturnId(
      Number(returnId),
      request.user,
    );
    return { message: 'Return is confirmed' };
  }

  @UseGuards(AuthGuard)
  @Post('/return/dispose/returnId')
  async disposeReturnById(
    @Param('returnId') returnId: string,
    @Body() {},
  ): Promise<{ message: string }> {
    await this.saleService.disposeByReturnId(Number(returnId));
    return { message: 'Return is confirmed' };
  }

  @UseGuards(AuthGuard)
  @Post('/:id/return/dispose')
  async disposeReturn(
    @Param('id') id: string,
    @Body() {},
  ): Promise<{ message: string }> {
    await this.saleService.disposeReturn(Number(id));
    return { message: 'Return is confirmed' };
  }

  @UseGuards(AuthGuard)
  @Post('/:id/return')
  async returnSale(
    @Req() request: RequestExtended,
    @Param('id') id: string,
    @Body()
    returnData: Array<{ amount: number; stockProductId: number }>,
  ): Promise<{ message: string }> {
    await this.saleService.returnSale(
      Number(id),
      { saleItems: returnData },
      request.user,
    );
    return { message: 'A sale returned successfully' };
  }
  @UseGuards(AuthGuard)
  @Post('/:id/cancel')
  async cancelSale(
    @Req() request: RequestExtended,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.saleService.cancelSale(Number(id), request.user);

    return { message: 'The sale returned successfully' };
  }
  @UseGuards(AuthGuard)
  @Get('/latest/:stockProductId')
  async getLatestOrderDetails(
    @Param('stockProductId') stockProductId: string,
  ): Promise<{ saleItem: SaleItem | undefined }> {
    return this.saleService.getLatestOrderDetails(Number(stockProductId));
  }
}
