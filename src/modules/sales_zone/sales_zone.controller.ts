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
import { SalesZoneService } from './sales_zone.service';
import { CreateSalesZoneDto, UpdateSalesZoneDto } from './sales_zone.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/modules/auth/auth.guard';
import { AuthUser } from 'src/modules/auth/auth.user.decorator';
import { User } from 'src/drizzle/schema';

@ApiTags('Sales zones')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('sales-zone')
export class SalesZoneController {
  constructor(private readonly salesZoneService: SalesZoneService) {}

  @Post()
  create(
    @AuthUser() user: User,
    @Body() createSalesZoneDto: CreateSalesZoneDto,
  ) {
    return this.salesZoneService.create(user, createSalesZoneDto);
  }

  @Get()
  findAll(
    @AuthUser() user: User,
    @Query('searchTerm') searchTerm?: string,
    @Query('sortKey') sortKey?: string,
    @Query('sortOrder') sortOrder?: string,
  ) {
    return this.salesZoneService.findAll(user, {
      searchTerm,
      sortKey,
      sortOrder,
    });
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesZoneService.findOne(id);
  }

  @Patch(':id')
  update(
    @AuthUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateSalesZoneDto: UpdateSalesZoneDto,
  ) {
    return this.salesZoneService.update(user, id, updateSalesZoneDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesZoneService.remove(id);
  }
}
