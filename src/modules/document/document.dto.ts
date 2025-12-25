import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DocumentDTO {
  @IsString()
  @ApiProperty()
  name: string;
}
