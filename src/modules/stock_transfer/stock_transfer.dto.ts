import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
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

export const TRANSFER_KINDS = [
  'WAREHOUSE',
  'DELIVERER',
  'ISSUE',
  'RETURN',
] as const;
export type TransferKind = (typeof TRANSFER_KINDS)[number];

export class StockTransferItemDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty({ example: '2.000' })
  @IsNumberString()
  quantity: string;

  // Optional: filled from the price list when left out.
  @ApiPropertyOptional({ example: '1200.00' })
  @IsOptional()
  @IsNumberString()
  price?: string;
}

/**
 * Which endpoints a kind needs:
 *   WAREHOUSE  fromWarehouseId -> toWarehouseId
 *   DELIVERER  fromManagerId   -> toManagerId
 *   ISSUE      fromWarehouseId -> toManagerId
 *   RETURN     fromManagerId   -> toWarehouseId
 */
export class CreateStockTransferDto {
  @ApiProperty({ enum: TRANSFER_KINDS })
  @IsIn(TRANSFER_KINDS as unknown as string[])
  kind: TransferKind;

  @ApiPropertyOptional({ example: '2025-08-06' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() fromWarehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() toWarehouseId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() fromManagerId?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() toManagerId?: number;

  // «Հանձնող» / «Ընդունող»
  @ApiPropertyOptional() @IsOptional() @IsString() sender?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() receiver?: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() priceListId?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;

  @ApiProperty({ type: [StockTransferItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockTransferItemDto)
  items: StockTransferItemDto[];
}

export class StockTransferListQueryDto {
  @IsOptional() @IsIn(TRANSFER_KINDS as unknown as string[]) kind?: string;
  @IsOptional() @IsString() searchTerm?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) warehouseId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
}
