import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnitDTO {
  @IsString()
  @ApiProperty()
  name: string;
}
