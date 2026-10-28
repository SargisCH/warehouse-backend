import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { GROUP_DIMENSIONS, MEASURES } from 'src/repositories/report.repository';

// "1,2,3" in a query string, or a real array in a body.
const toIds = ({ value }) =>
  value === undefined || value === ''
    ? undefined
    : (Array.isArray(value) ? value : String(value).split(','))
        .map(Number)
        .filter((n) => Number.isInteger(n) && n > 0);
const toStrings = ({ value }) =>
  value === undefined || value === ''
    ? undefined
    : Array.isArray(value)
    ? value
    : String(value).split(',');

/** The filter panel both sales reports share. Every list is optional. */
export class SalesReportFiltersDto {
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  productIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  productGroupIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  clientIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  clientGroupIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  managerIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  salesZoneIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  clientSalesZoneIds?: number[];

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  delivererIds?: number[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(toStrings)
  @IsArray()
  @IsString({ each: true })
  paymentTypes?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  // «Արտադրող»
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(toStrings)
  @IsArray()
  @IsString({ each: true })
  manufacturers?: string[];

  // «Գործողություն»
  @ApiPropertyOptional({ enum: ['SALE', 'RETURN'], isArray: true })
  @IsOptional()
  @Transform(toStrings)
  @IsArray()
  @IsIn(['SALE', 'RETURN'], { each: true })
  operations?: string[];

  // «Փաստաթղթի խումբ»
  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @Transform(toIds)
  @IsArray()
  @IsInt({ each: true })
  documentIds?: number[];
}

export class SalesAnalysisQueryDto extends SalesReportFiltersDto {
  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ example: '2025-06-30' })
  @IsDateString()
  dateTo: string;
}

export class PeriodDto {
  @ApiProperty({ example: '2025-06-01' })
  @IsDateString()
  from: string;

  @ApiProperty({ example: '2025-06-30' })
  @IsDateString()
  to: string;
}

export class SalesComparisonDto extends SalesReportFiltersDto {
  // «Ժամանակահատված 1..3»
  @ApiProperty({ type: [PeriodDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => PeriodDto)
  periods: PeriodDto[];

  // «Խմբավորել ըստ»
  @ApiProperty({ enum: Object.keys(GROUP_DIMENSIONS), isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(Object.keys(GROUP_DIMENSIONS), { each: true })
  groupBy: Array<keyof typeof GROUP_DIMENSIONS>;

  // «Ցույց տալ»
  @ApiProperty({ enum: Object.keys(MEASURES), isArray: true })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(Object.keys(MEASURES), { each: true })
  measures: Array<keyof typeof MEASURES>;

  // «Ցույց տալ զրոյական տողերը»
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  includeZeroRows?: boolean;

  // «Տողել ըստ»
  @ApiPropertyOptional({ enum: ['label', 'value'], default: 'label' })
  @IsOptional()
  @IsIn(['label', 'value'])
  sortBy?: 'label' | 'value';

  // «Կոմպլեկտներն ըստ բաղադրիչների»
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  explodeKits?: boolean;
}

export class ClientStatementQueryDto {
  @Type(() => Number) @IsInt() @Min(1) clientId: number;
  @IsDateString() dateFrom: string;
  @IsDateString() dateTo: string;
}

export class BalancesQueryDto {
  // As of this date; today when left out.
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) clientGroupId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) salesZoneId?: number;
}

export class ManagerStockQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) managerId?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) productGroupId?: number;
}
