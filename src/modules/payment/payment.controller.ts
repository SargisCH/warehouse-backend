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
  CreatePaymentDto,
  CreateRefundDto,
  CreateRepaymentDto,
  MoneyListQueryDto,
} from './payment.dto';
import { PaymentService } from './payment.service';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
// The global pipe only validates; these DTOs also need their values converted.
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  // «Վճարում»
  @Post()
  create(@AuthUser() user: User, @Body() dto: CreatePaymentDto) {
    return this.paymentService.create(user, dto);
  }

  // «Վճարում գնորդին»
  @Post('refund')
  refund(@AuthUser() user: User, @Body() dto: CreateRefundDto) {
    return this.paymentService.refund(user, dto);
  }

  // Lists payments in by default; `kind=REFUND` lists refunds.
  @Get()
  findAll(@AuthUser() user: User, @Query() query: MoneyListQueryDto) {
    return this.paymentService.findAll(user, {
      ...query,
      kind: query.kind ?? 'IN',
    });
  }

  // Declared before ':id' so the literal path isn't read as an id.
  @Get('client/:clientId/open')
  clientOpenItems(
    @AuthUser() user: User,
    @Param('clientId', ParseIntPipe) clientId: number,
  ) {
    return this.paymentService.clientOpenItems(user, clientId);
  }

  @Get(':id')
  findOne(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.findOne(user, id);
  }

  @Delete(':id')
  remove(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.remove(user, id);
  }
}

// «Մարումներ»
@ApiTags('Repayments')
@ApiBearerAuth()
@UseGuards(AuthGuard)
// The global pipe only validates; these DTOs also need their values converted.
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('repayment')
export class RepaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  create(@AuthUser() user: User, @Body() dto: CreateRepaymentDto) {
    return this.paymentService.createRepayment(user, dto);
  }

  @Get()
  findAll(@AuthUser() user: User, @Query() query: MoneyListQueryDto) {
    return this.paymentService.findRepayments(user, query);
  }

  @Get(':id')
  findOne(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.findRepayment(user, id);
  }

  @Delete(':id')
  remove(@AuthUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.paymentService.removeRepayment(user, id);
  }
}
