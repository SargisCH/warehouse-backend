import {
  Body,
  Controller,
  Get,
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
  BalancesQueryDto,
  ClientStatementQueryDto,
  ManagerStockQueryDto,
  SalesAnalysisQueryDto,
  SalesComparisonDto,
} from './report.dto';
import { ReportService } from './report.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(AuthGuard)
// The global pipe only validates; these DTOs also need their values converted.
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('report')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // «Վաճառքների վերլուծություն»
  @Get('sales-analysis')
  salesAnalysis(@AuthUser() user: User, @Query() query: SalesAnalysisQueryDto) {
    return this.reportService.salesAnalysis(user, query);
  }

  // «Վաճառքների համեմատական». A body, since periods and groupings nest.
  @Post('sales-comparison')
  salesComparison(@AuthUser() user: User, @Body() dto: SalesComparisonDto) {
    return this.reportService.salesComparison(user, dto);
  }

  // «Ըստ գնորդի քաղվածք»
  @Get('client-statement')
  clientStatement(
    @AuthUser() user: User,
    @Query() query: ClientStatementQueryDto,
  ) {
    return this.reportService.clientStatement(user, query);
  }

  // «Ըստ գնորդի մնացորդներ»
  @Get('client-balances')
  clientBalances(@AuthUser() user: User, @Query() query: BalancesQueryDto) {
    return this.reportService.clientBalances(user, query);
  }

  // «Ըստ մենեջերի մնացորդներ»
  @Get('manager-balances')
  managerBalances(@AuthUser() user: User, @Query() query: BalancesQueryDto) {
    return this.reportService.managerBalances(user, query);
  }

  // «Ըստ մենեջերի ապրանքի մնացորդ»
  @Get('manager-stock')
  managerStock(@AuthUser() user: User, @Query() query: ManagerStockQueryDto) {
    return this.reportService.managerStock(user, query);
  }
}
