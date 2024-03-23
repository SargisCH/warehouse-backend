import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  Manager,
  Prisma,
  Role,
  TransactionHistory as TransactionHistoryModel,
  TransactionType,
  User,
} from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { ManagerService } from '../manager/manager.service';
import { AuthGuard } from '../auth/auth.guard';

import { TransactionHistoryService } from './transactionHistory.service';
type TransactionHistoryApiType = {
  id?: number;
  transactionType: TransactionType;
  amount: number;
  saleId?: number;
  orderId?: number;
  clientId?: number;
  inventorySupplierId?: number;
};

@ApiTags('transactionHistory')
@Controller('/transactionHistory')
export class TransactionHistoryController {
  constructor(
    private transactionHistoryService: TransactionHistoryService,
    private managerService: ManagerService,
  ) {}

  @Get('/')
  @UseGuards(AuthGuard)
  async getAllTransactionHistory(
    @Req() request: Request,
  ): Promise<TransactionHistoryModel[]> {
    const where: Prisma.TransactionHistoryWhereInput = {};
    const user = (request as any).user as User;
    let manager: Manager;

    if (user.role === Role.MANAGER) {
      manager = await this.managerService.findFirst({
        email: user.email,
      });
    }
    if (manager) {
      where.client = { managerId: manager.id };
    }
    return this.transactionHistoryService.findAll({ where });
  }

  @Get('/:id')
  async getTransactionHistoryById(
    @Param('id') id: string,
  ): Promise<TransactionHistoryModel> {
    return this.transactionHistoryService.findOne({ id: Number(id) });
  }

  @Post('create')
  async createTransactionHistory(
    @Body()
    transactionHistoryData: TransactionHistoryApiType,
  ): Promise<TransactionHistoryModel> {
    const createInput: Prisma.TransactionHistoryCreateInput = {
      amount: transactionHistoryData.amount,
      transactionType: transactionHistoryData.transactionType,
    };

    if (transactionHistoryData.clientId) {
      createInput.client = {
        connect: {
          id: transactionHistoryData.clientId,
        },
      };
    }
    if (transactionHistoryData.saleId) {
      createInput.sale = {
        connect: {
          id: transactionHistoryData.saleId,
        },
      };
    }
    if (transactionHistoryData.orderId) {
      createInput.order = {
        connect: {
          id: transactionHistoryData.orderId,
        },
      };
    }
    if (transactionHistoryData.inventorySupplierId) {
      createInput.inventorySupplier = {
        connect: {
          id: transactionHistoryData.inventorySupplierId,
        },
      };
    }
    return this.transactionHistoryService.create(createInput);
  }

  @Put('/:id')
  async editTransactionHistory(
    @Param('id') id: string,
    @Body()
    transactionHistoryData: TransactionHistoryApiType,
  ): Promise<TransactionHistoryModel> {
    const updateInput: Prisma.TransactionHistoryUpdateInput = {
      amount: transactionHistoryData.amount,
      transactionType: transactionHistoryData.transactionType,
    };

    if (transactionHistoryData.clientId) {
      updateInput.client = {
        connect: {
          id: transactionHistoryData.clientId,
        },
      };
    }
    if (transactionHistoryData.saleId) {
      updateInput.sale = {
        connect: {
          id: transactionHistoryData.saleId,
        },
      };
    }
    if (transactionHistoryData.orderId) {
      updateInput.order = {
        connect: {
          id: transactionHistoryData.orderId,
        },
      };
    }
    if (transactionHistoryData.inventorySupplierId) {
      updateInput.inventorySupplier = {
        connect: {
          id: transactionHistoryData.inventorySupplierId,
        },
      };
    }
    return this.transactionHistoryService.update({
      where: { id: Number(id) },
      data: updateInput,
    });
  }
}
