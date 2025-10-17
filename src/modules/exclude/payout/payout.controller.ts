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
import { Payout as PayoutModel, PayoutType } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { PayoutService } from './payout.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestExtended } from 'src/configs/types';

@ApiTags('payout')
@Controller('/payout')
export class PayoutController {
  constructor(private payoutService: PayoutService) {}
  @UseGuards(AuthGuard)
  @Get('/')
  async getAllPayouts(@Req() request: RequestExtended): Promise<PayoutModel[]> {
    return this.payoutService.findAll({
      where: { tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
  @Get('/payoutType')
  async getAllPayoutTypes(
    @Req() request: RequestExtended,
  ): Promise<PayoutType[]> {
    return this.payoutService.findAllTypes({
      where: { tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async getPayoutById(@Param('id') id: string): Promise<PayoutModel> {
    return this.payoutService.findOne({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: RequestExtended,
    @Body()
    postData: {
      type: number;
      amount: number;
      otherPayoutType?: string;
    },
  ): Promise<PayoutModel> {
    const { type: typeId, amount, otherPayoutType } = postData;
    return this.payoutService.create(
      {
        type: { connect: { id: typeId } },
        amount,
        tenant: { connect: { id: request.user.tenantId } },
        otherPayoutType,
      },
      request.user,
    );
  }

  @UseGuards(AuthGuard)
  @Post('createPayoutType')
  async createPayoutType(
    @Req() request: RequestExtended,
    @Body()
    postData: {
      name: string;
      amount: number;
    },
  ): Promise<PayoutType> {
    const { name } = postData;
    return this.payoutService.createType({
      name,
      tenant: { connect: { id: request.user.tenantId } },
    });
  }

  @UseGuards(AuthGuard)
  @Post('create')
  @Put('/:id')
  async editPayout(
    @Param('id') id: string,
    @Body()
    payoutData: {
      typeId: number;
      amount: number;
    },
  ): Promise<PayoutModel> {
    return this.payoutService.update({
      where: { id: Number(id) },
      data: { ...payoutData },
    });
  }

  @UseGuards(AuthGuard)
  @Delete('/:id')
  async deletePayout(@Param('id') id: string): Promise<{ message: string }> {
    const deletedCount = await this.payoutService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Payout deleted successfully',
      };
    } else {
      return { message: 'Payout deletion failed' };
    }
  }
}
