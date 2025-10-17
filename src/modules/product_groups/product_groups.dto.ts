import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

import { INVALID_EMAIL } from '../../shared/constants/strings';

export class ProductGroupsDTO {
  @IsString()
  @ApiProperty()
  name: string;
}
