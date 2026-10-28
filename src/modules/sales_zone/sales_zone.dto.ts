import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// «Կոդ» is assigned by the server, so it is deliberately absent here.
export class CreateSalesZoneDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  // «Մենեջեր»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  // «Փակվել է»
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  // «Կուտակիչ»: the sales zone this one nests under.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  parentId?: number | null;
}

export class UpdateSalesZoneDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  parentId?: number | null;
}
