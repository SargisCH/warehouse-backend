import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SupplyProductDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  // The quantity received. Strings keep fractional quantities exact.
  @ApiProperty({ example: '12.500' })
  @IsNumberString()
  amount: string;

  // Falls back to the price list, then zero.
  @ApiProperty({ required: false, example: '1200.00' })
  @IsOptional()
  @IsNumberString()
  price?: string;
}

// «Ապրանքների մուտք»
export class CreateSupplyDto {
  @ApiProperty()
  @IsInt()
  documentId: number;

  @ApiProperty()
  @IsInt()
  warehouseId: number;

  @ApiProperty({ required: false, example: '2025-08-06' })
  @IsOptional()
  @IsDateString()
  documentDate?: string;

  // «Ընդունող»
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  receiver?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  priceListId?: number;

  @ApiProperty({ type: [SupplyProductDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SupplyProductDto)
  products: SupplyProductDto[];
}

export class FindAllSuppliesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  searchTerm?: string;
}
