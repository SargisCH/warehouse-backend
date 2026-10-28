import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SaleService } from './sale.service';
import {
  CreateSaleDto,
  ManagerStockLoadDto,
  PaySaleDto,
  SaleListQueryDto,
  SettleClientDto,
} from './sale.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';
import { ManagerStockRepository } from 'src/repositories/manager_stock.repository';

@ApiTags('Sales')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sale')
export class SaleController {
  constructor(
    private readonly saleService: SaleService,
    private readonly managerStock: ManagerStockRepository,
  ) {}

  @Post()
  create(@AuthUser() user: User, @Body() dto: CreateSaleDto) {
    return this.saleService.create(user, dto);
  }

  @Get()
  async findAll(@AuthUser() user: User, @Query() query: SaleListQueryDto) {
    const options = await this.saleService.resolveFilters(user, {
      searchTerm: query.searchTerm,
      sortKey: query.sortKey,
      sortOrder: query.sortOrder,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      managerId: query.managerId,
      salesZoneId: query.salesZoneId,
      clientSalesZoneId: query.clientSalesZoneId,
      clientId: query.clientId,
      clientGroupId: query.clientGroupId,
      documentId: query.documentId,
      delivererId: query.delivererId,
      paymentType: query.paymentType,
      location: query.location,
      externalStatus: query.externalStatus,
      onlyWithBalance: query.onlyWithBalance === 'true',
      isReturn:
        query.isReturn === undefined ? undefined : query.isReturn === 'true',
    });
    return this.saleService.findAll(user, options);
  }

  // Declared before ':id' so the literal paths aren't swallowed by the param route.
  @Get('client/:clientId/snapshot')
  clientSnapshot(
    @AuthUser() user: User,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    return this.saleService.clientSnapshot(user, clientId);
  }

  @Get('client/:clientId/balance')
  balanceHistory(
    @AuthUser() user: User,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    return this.saleService.balanceHistory(user, clientId);
  }

  @Get('manager/:managerId/stock')
  managerStockList(@Param('managerId', ParseIntPipe) managerId: number) {
    return this.managerStock.findByManager(managerId);
  }

  // Loads the agent's van. The van-loading flow itself is not specified yet;
  // this is the minimum needed for a sale to have stock to draw down.
  @Post('manager/:managerId/stock')
  async loadManagerStock(
    @Param('managerId', ParseIntPipe) managerId: number,
    @Body() dto: ManagerStockLoadDto,
  ) {
    for (const item of dto.items) {
      await this.managerStock.setQuantity(
        managerId,
        item.productId,
        item.quantity,
      );
    }
    return this.managerStock.findByManager(managerId);
  }

  // «Կատարել մարում»
  @Post('settle')
  settle(@AuthUser() user: User, @Body() dto: SettleClientDto) {
    return this.saleService.settle(user, dto);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.findOne(id);
  }

  // «Կատարել վճարում»
  @Post(':id/pay')
  pay(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PaySaleDto,
  ) {
    return this.saleService.pay(user, id, dto);
  }

  // «Պատճենել» - the lines of an existing document, ready to re-post.
  @Get(':id/copy')
  async copy(@Param('id', ParseIntPipe) id: number) {
    const sale = await this.saleService.findOne(id);
    return {
      managerId: sale.managerId,
      clientId: sale.clientId,
      delivererId: sale.delivererId,
      priceListId: sale.priceListId,
      documentId: sale.documentId,
      paymentType: sale.paymentType,
      items: sale.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
    };
  }

  // «Հեռացնել» - unwinds stock and balance along with the document.
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.saleService.remove(id);
  }
}
