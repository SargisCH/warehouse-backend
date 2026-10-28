import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClientGroupDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  // «Կուտակիչ»: the group this one rolls up into.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;
}

export class UpdateClientGroupDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;
}
