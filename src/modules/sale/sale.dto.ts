import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// «Վճարման տեսակ»
export const PAYMENT_TYPES = [
  'CASH',
  'TRANSFER',
  'CREDIT',
  'PARTIAL_CREDIT',
] as const;

export class SaleItemDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  // Decimals travel as strings so no quantity or price is rounded in transit.
  @ApiProperty({ example: '2.000' })
  @IsNumberString()
  quantity: string;

  @ApiProperty({ example: '27000.00' })
  @IsNumberString()
  price: string;
}

// «Կոդ», «Ամսաթիվ» and «Վաճառքի գոտի» are all decided by the server.
export class CreateSaleDto {
  @ApiProperty()
  @IsInt()
  managerId: number;

  @ApiProperty()
  @IsInt()
  clientId: number;

  // «Առաքիչ»: a manager. Defaults to the agent's own deliverer, then himself.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  delivererId?: number | null;

  // «Նշել գնացուցակ». Falls back to the buyer's own list, then the default one.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  priceListId?: number | null;

  @ApiPropertyOptional({ enum: PAYMENT_TYPES, default: 'CASH' })
  @IsOptional()
  @IsIn(PAYMENT_TYPES as unknown as string[])
  paymentType?: string;

  // «Փաստաթղթի խումբ»: the document type, e.g. with or without an invoice.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  documentId?: number | null;

  // «Վճարվածա արդեն»: what the buyer settled at the counter. Left out, a cash
  // sale is taken as paid in full and any other type as unpaid.
  @ApiPropertyOptional({ example: '150000.00' })
  @IsOptional()
  @IsNumberString()
  paidAmount?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isReturn?: boolean;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}

// «Կատարել վճարում»: settle a sale's outstanding remainder, in full or in part.
export class PaySaleDto {
  @ApiPropertyOptional({
    example: '50000.00',
    description: 'Omit to settle the whole remainder.',
  })
  @IsOptional()
  @IsNumberString()
  amount?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

// «Կատարել մարում»: settle open sales from the buyer's existing credit.
export class SettleClientDto {
  @ApiProperty()
  @IsInt()
  clientId: number;

  // «Մարման աղբյուր»
  @ApiPropertyOptional({
    enum: ['PREPAYMENT', 'RETURN'],
    default: 'PREPAYMENT',
  })
  @IsOptional()
  @IsIn(['PREPAYMENT', 'RETURN'])
  source?: string;

  @ApiProperty({ example: '25000.00' })
  @IsNumberString()
  amount: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class LoadManagerStockDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty({ example: '10.000' })
  @IsNumberString()
  quantity: string;
}

export class ManagerStockLoadDto {
  @ApiProperty({ type: [LoadManagerStockDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LoadManagerStockDto)
  items: LoadManagerStockDto[];
}

export class PriceListItemDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty({ example: '27000.00' })
  @IsNumberString()
  price: string;
}

export class CreatePriceListDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ type: [PriceListItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  items?: PriceListItemDto[];
}

export class UpdatePriceListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ type: [PriceListItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceListItemDto)
  items?: PriceListItemDto[];
}

export class SaleListQueryDto {
  @IsOptional() @IsString() searchTerm?: string;
  @IsOptional() @IsString() sortKey?: string;
  @IsOptional() @IsString() sortOrder?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) salesZoneId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientSalesZoneId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) documentId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) delivererId?: number;
  @IsOptional() @IsString() paymentType?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() externalStatus?: string;
  @IsOptional() @IsString() onlyWithBalance?: string;
  @IsOptional() @IsString() isReturn?: string;
}
