import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from 'src/drizzle/schema';
import { ADMIN_ROLE } from '../auth/auth.constants';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.user.decorator';
import {
  AssetEntryDto,
  CreateAssetDto,
  CompanyCashEntryDto,
  SetCompanyCashOpeningDto,
} from './companyAssets.dto';
import { CompanyAssetsService } from './companyAssets.service';

type AssetUser = User & { role?: string };

@ApiTags('Company assets')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('company-assets')
export class CompanyAssetsController {
  constructor(private readonly assets: CompanyAssetsService) {}

  private assertAdmin(user: AssetUser) {
    if (user.role?.toLowerCase() !== ADMIN_ROLE) throw new ForbiddenException();
  }

  @Get()
  list(@AuthUser() user: AssetUser) {
    this.assertAdmin(user);
    return this.assets.list(user.tenantId);
  }

  @Get('cash')
  cash(@AuthUser() user: AssetUser) {
    this.assertAdmin(user);
    return this.assets.cashBalance(user.tenantId);
  }

  @Post('cash/opening')
  openCash(@AuthUser() user: AssetUser, @Body() dto: SetCompanyCashOpeningDto) {
    this.assertAdmin(user);
    return this.assets.setOpening(user.tenantId, dto.amount);
  }

  @Get('cash/history')
  cashHistory(@AuthUser() user: AssetUser) {
    this.assertAdmin(user);
    return this.assets.cashHistory(user.tenantId);
  }

  @Post('cash/entries')
  addCashEntry(@AuthUser() user: AssetUser, @Body() dto: CompanyCashEntryDto) {
    this.assertAdmin(user);
    return this.assets.addCashEntry(user.tenantId, user.id, dto);
  }

  @Get(':id')
  details(@AuthUser() user: AssetUser, @Param('id', ParseUUIDPipe) id: string) {
    this.assertAdmin(user);
    return this.assets.details(user.tenantId, id);
  }

  @Post()
  create(@AuthUser() user: AssetUser, @Body() dto: CreateAssetDto) {
    this.assertAdmin(user);
    return this.assets.create(user.tenantId, user.id, dto);
  }

  @Post(':id/entries')
  addEntry(
    @AuthUser() user: AssetUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssetEntryDto,
  ) {
    this.assertAdmin(user);
    return this.assets.addEntry(user.tenantId, user.id, id, dto);
  }
}
