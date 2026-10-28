import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export const PAYMENT_KINDS = ['IN', 'REFUND'] as const;
// «Մարման աղբյուր»
export const REPAYMENT_SOURCES = ['PREPAYMENT', 'RETURN'] as const;

// «Մարված փաստաթղթեր»: one settled sale and how much of it.
export class AllocationDto {
  @ApiProperty()
  @IsInt()
  saleId: number;

  @ApiProperty({ example: '20000.00' })
  @IsNumberString()
  amount: string;
}

export class CreatePaymentDto {
  // «Ամսաթիվ». Defaults to today.
  @ApiPropertyOptional({ example: '2025-07-01' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  // «Մենեջեր» is optional: money sent to the card never passed an agent.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;

  @ApiProperty()
  @IsInt()
  clientId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiProperty({ example: '45900.00' })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  /**
   * Which sales the money settles. Omitted, it pays off the oldest debts first;
   * whatever is left over becomes «կանխավճար».
   */
  @ApiPropertyOptional({ type: [AllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationDto)
  allocations?: AllocationDto[];
}

// «Վճարում գնորդին»
export class CreateRefundDto {
  @ApiPropertyOptional({ example: '2025-07-01' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  @ApiProperty()
  @IsInt()
  clientId: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiProperty({ example: '5000.00' })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

// «Ավելացնել մարում»
export class CreateRepaymentDto {
  @ApiPropertyOptional({ example: '2025-07-01' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @ApiProperty()
  @IsInt()
  clientId: number;

  @ApiProperty({ enum: REPAYMENT_SOURCES })
  @IsIn(REPAYMENT_SOURCES as unknown as string[])
  source: string;

  // Needed only when no documents are chosen: then the oldest are settled.
  @ApiPropertyOptional({ example: '5000.00' })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ type: [AllocationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AllocationDto)
  allocations?: AllocationDto[];
}

export class MoneyListQueryDto {
  @IsOptional() @IsString() searchTerm?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) salesZoneId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientGroupId?: number;
  @IsOptional() @IsIn(PAYMENT_KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsIn(REPAYMENT_SOURCES as unknown as string[]) source?: string;
}
