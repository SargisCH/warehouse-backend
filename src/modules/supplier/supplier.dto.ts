import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateSupplierDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;
}
