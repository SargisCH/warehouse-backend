import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { User } from 'src/drizzle/schema';
import {
  StockHistoryRepository,
  stockHistoryKinds,
} from 'src/repositories/stock_history.repository';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.user.decorator';

class StockHistoryQuery {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dateTo?: string;

  @IsOptional()
  @IsIn(stockHistoryKinds)
  kind?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  searchTerm?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page?: number;
}

@Controller('stock-history')
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class StockHistoryController {
  constructor(private readonly history: StockHistoryRepository) {}

  @Get(':scope/:id')
  async find(
    @AuthUser() user: User & { role?: string },
    @Param('scope') scope: string,
    @Param('id', ParseIntPipe) id: number,
    @Query() query: StockHistoryQuery,
  ) {
    if (
      user.tenantId == null ||
      !['Admin', 'Super Admin'].includes(user.role)
    ) {
      throw new ForbiddenException();
    }
    if (id < 1 || (scope !== 'product' && scope !== 'warehouse')) {
      throw new NotFoundException();
    }
    if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
      throw new BadRequestException('Start date must be on or before end date');
    }
    const result = await this.history.find(user.tenantId, scope, id, query);
    if (!result) throw new NotFoundException();
    return result;
  }
}
