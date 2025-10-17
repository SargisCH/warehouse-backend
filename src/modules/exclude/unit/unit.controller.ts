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
import { Unit as UnitModel } from '@prisma/client';
import { ApiTags } from '@nestjs/swagger';

import { UnitService } from './unit.service';
import { AuthGuard } from '../auth/auth.guard';
import { RequestExtended } from 'src/configs/types';

@ApiTags('unit')
@Controller('/unit')
export class UnitController {
  constructor(private unitService: UnitService) {}
  @UseGuards(AuthGuard)
  @Get('/')
  async getAllUnits(@Req() request: RequestExtended): Promise<UnitModel[]> {
    return this.unitService.findAll({
      where: { tenantId: request.user.tenantId },
    });
  }

  @UseGuards(AuthGuard)
  @Get('/:id')
  async getUnitById(@Param('id') id: string): Promise<UnitModel> {
    return this.unitService.findOne({ id: Number(id) });
  }

  @UseGuards(AuthGuard)
  @Post('create')
  async createDraft(
    @Req() request: RequestExtended,
    @Body()
    postData: {
      name: string;
    },
  ): Promise<UnitModel> {
    const { name } = postData;
    return this.unitService.create({
      name,
      value: name,
      tenant: { connect: { id: request.user.tenantId } },
    });
  }

  @UseGuards(AuthGuard)
  @Post('create')
  @Put('/:id')
  async editUnit(
    @Param('id') id: string,
    @Body()
    unitData: {
      name: string;
    },
  ): Promise<UnitModel> {
    return this.unitService.update({
      where: { id: Number(id) },
      data: { ...unitData },
    });
  }

  @UseGuards(AuthGuard)
  @Delete('/:id')
  async deleteUnit(@Param('id') id: string): Promise<{ message: string }> {
    const deletedCount = await this.unitService.delete({
      id: Number(id),
    });

    if (deletedCount) {
      return {
        message: 'Unit deleted successfully',
      };
    } else {
      return { message: 'Unit deletion failed' };
    }
  }
}
