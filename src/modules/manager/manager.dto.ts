import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// «Կոդ» is assigned by the server, so it is deliberately absent here.
export class CreateManagerDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  // «Սարքի նույնականացման համար»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  deviceId?: string | null;

  // «Կցել վաճառքի գոտի»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;

  // «Կցել հասանելի առաքիչ»: another manager of this tenant whose van supplies
  // this one. Left empty, the agent delivers his own goods.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  delivererId?: number | null;
}

export class UpdateManagerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  deviceId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  delivererId?: number | null;
}
