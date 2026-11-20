import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { User } from 'src/drizzle/schema';
import { ManagerCashRepository } from 'src/repositories/managerCash.repository';
import { ADMIN_ROLE } from '../auth/auth.constants';
import { AuthGuard } from '../auth/auth.guard';
import { AuthUser } from '../auth/auth.user.decorator';

class CreateManagerCashDto {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(1)
  managerId: number;

  @IsIn(['OPENING', 'RECEIPT'])
  kind: 'OPENING' | 'RECEIPT';

  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  documentDate?: string;

  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  amount: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

type AuthenticatedUser = User & { role?: string };

@ApiTags('Manager cash')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('manager-cash')
export class ManagerCashController {
  constructor(private readonly cash: ManagerCashRepository) {}

  @Get()
  history(@AuthUser() user: AuthenticatedUser) {
    if (user.role?.toLowerCase() !== ADMIN_ROLE) throw new ForbiddenException();
    return this.cash.history(user.tenantId);
  }

  @Post()
  create(
    @AuthUser() user: AuthenticatedUser,
    @Body() dto: CreateManagerCashDto,
  ) {
    if (user.role?.toLowerCase() !== ADMIN_ROLE) throw new ForbiddenException();
    return this.cash.create(user.tenantId, user.id, dto);
  }
}
