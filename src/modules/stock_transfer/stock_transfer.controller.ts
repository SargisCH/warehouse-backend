import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/drizzle/schema';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import {
  CreateStockTransferDto,
  StockTransferListQueryDto,
} from './stock_transfer.dto';
import { StockTransferService } from './stock_transfer.service';

@ApiTags('Stock transfers')
@ApiBearerAuth()
@UseGuards(AuthGuard)
// The global pipe only validates; these DTOs also need their values converted.
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('stock-transfer')
export class StockTransferController {
  constructor(private readonly transferService: StockTransferService) {}

  @Post()
  create(@AuthUser() user: User, @Body() dto: CreateStockTransferDto) {
    return this.transferService.create(user, dto);
  }

  @Get()
  findAll(@AuthUser() user: User, @Query() query: StockTransferListQueryDto) {
    return this.transferService.findAll(user, query);
  }

  @Get(':id')
  findOne(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.transferService.findOne(user, id);
  }

  @Delete(':id')
  remove(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.transferService.remove(user, id);
  }
}
