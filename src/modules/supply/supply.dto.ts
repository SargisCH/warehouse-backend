import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class SupplyProductDto {
  @ApiProperty()
  @IsInt()
  productId: number;

  @ApiProperty()
  @IsInt()
  amount: number;
}

export class CreateSupplyDto {
  @ApiProperty()
  @IsInt()
  documentId: number;

  @ApiProperty()
  @IsInt()
  warehouseId: number;

  @ApiProperty({ type: [SupplyProductDto] })
  @IsArray()
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
