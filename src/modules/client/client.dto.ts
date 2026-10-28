import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';
import { PHONE_REGEX } from 'src/shared/constants/global.constants';

// «Կոդ» is assigned by the server, so it is deliberately absent here.
export class CreateClientDto {
  // «Անվանում»
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  name: string;

  // «Լրիվ անվանում»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  legalName?: string | null;

  // «ՀՎՀՀ»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string | null;

  // «Իրավաբանական հասցե»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  legalAddress?: string | null;

  // «Գործունեության հասցե»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'phoneNumber is not a valid phone number' })
  phoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message: 'otherPhoneNumber is not a valid phone number',
  })
  otherPhoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  // «Խումբ»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  clientGroupId?: number | null;

  // «Վաճառքի գոտի»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;

  // «Մենեջեր»: the agent who serves this outlet.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  // «Գնացուցակ»: the list this buyer's sales are priced from by default.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  priceListId?: number | null;

  // «Վճարման տեսակ»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  paymentType?: string | null;

  // «Վճարման ուշացման օրեր»: after this many days an unpaid sale is overdue.
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermDays?: number;

  // «Պարտքի սահմանաչափ». Zero means no limit.
  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsNumberString()
  debtLimit?: string;

  // «Ժամկետանց պարտքի սահմանաչափ». Zero means no limit.
  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsNumberString()
  overdueDebtLimit?: string;
}

export class UpdateClientDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  legalName?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  taxId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  legalAddress?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(PHONE_REGEX, { message: 'phoneNumber is not a valid phone number' })
  phoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @Matches(PHONE_REGEX, {
    message: 'otherPhoneNumber is not a valid phone number',
  })
  otherPhoneNumber?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  clientGroupId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  salesZoneId?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  managerId?: number | null;

  // «Գնացուցակ»: the list this buyer's sales are priced from by default.
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsInt()
  priceListId?: number | null;

  // «Վճարման տեսակ»
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  paymentType?: string | null;

  // «Վճարման ուշացման օրեր»: after this many days an unpaid sale is overdue.
  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  paymentTermDays?: number;

  // «Պարտքի սահմանաչափ». Zero means no limit.
  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsNumberString()
  debtLimit?: string;

  // «Ժամկետանց պարտքի սահմանաչափ». Zero means no limit.
  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsNumberString()
  overdueDebtLimit?: string;
}
