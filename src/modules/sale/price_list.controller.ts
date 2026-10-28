import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PriceListService } from './price_list.service';
import { CreatePriceListDto, UpdatePriceListDto } from './sale.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';

@ApiTags('Price lists')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('price-list')
export class PriceListController {
  constructor(private readonly priceListService: PriceListService) {}

  @Post()
  create(@AuthUser() user: User, @Body() dto: CreatePriceListDto) {
    return this.priceListService.create(user, dto);
  }

  @Get()
  findAll(
    @AuthUser() user: User,
    @Query('searchTerm') searchTerm?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.priceListService.findAll(user, {
      searchTerm,
      sortKey,
      sortOrder,
    });
  }

  // Declared before ':id' so the literal path isn't swallowed by the param route.
  @Get('products')
  availableProducts(@Query('searchTerm') searchTerm?: string) {
    return this.priceListService.availableProducts(searchTerm);
  }

  @Get(':id')
  findOne(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.priceListService.findOne(user, id);
  }

  // «Ավելացնել ապրանքները գնացուցակից» - the product picker's rows.
  @Get(':id/entries')
  entries(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Query('searchTerm') searchTerm?: string,
  ) {
    return this.priceListService.entries(user, id, searchTerm);
  }

  @Patch(':id')
  update(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePriceListDto,
  ) {
    return this.priceListService.update(user, id, dto);
  }

  @Delete(':id')
  remove(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.priceListService.remove(user, id);
  }
}
