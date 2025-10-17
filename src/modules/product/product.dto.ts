import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
  ValidateIf,
  IsPositive,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

import { INVALID_EMAIL } from '../../shared/constants/strings';
import { Type } from 'class-transformer';

export class Ingredient {
  @IsNumber()
  @IsNotEmpty({ message: 'Unit is required.' })
  @IsPositive()
  @ApiProperty()
  productId: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Unit is required.' })
  @IsPositive()
  @ApiProperty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty({ message: 'Unit is required.' })
  @IsPositive()
  @ApiProperty()
  unitId: number;
}

export class ProductDTO {
  @IsNotEmpty({ message: 'Name is required and must not be empty.' })
  @IsString()
  @ApiProperty()
  name: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Unit is required.' })
  @IsPositive()
  @ApiProperty()
  unitId: number;

  @IsString()
  @IsNotEmpty({ message: 'Name is required and must not be empty.' })
  @ApiProperty()
  officialName: string;

  @IsNumber()
  @IsNotEmpty({ message: 'Unit is required.' })
  @IsPositive()
  @ApiProperty()
  groupId: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  fractional: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  forSale: boolean;

  @IsBoolean()
  @IsOptional()
  @ApiProperty()
  returnable: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => Ingredient)
  ingredients: Ingredient[];
}

export class UpdateProductDto extends PartialType(ProductDTO) {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Ingredient)
  ingredients: Ingredient[];
}
