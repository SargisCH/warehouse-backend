import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

class DatedEntryDto {
  @IsUUID()
  id: string;

  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  amount: string;

  @IsBoolean()
  affectsCash: boolean;
}

export class CreateAssetDto extends DatedEntryDto {
  @Matches(/\S/)
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsIn(['NEW', 'USED'])
  condition: 'NEW' | 'USED';
}

export class AssetEntryDto extends DatedEntryDto {
  @IsIn(['REPAIR', 'SALE', 'REFUND'])
  kind: 'REPAIR' | 'SALE' | 'REFUND';

  @Matches(/\S/)
  @MaxLength(2000)
  description: string;
}

export class SetCompanyCashOpeningDto {
  @Matches(/^\d{1,12}(\.\d{1,2})?$/)
  amount: string;
}

export class CompanyCashEntryDto extends SetCompanyCashOpeningDto {
  @IsUUID()
  id: string;

  @Matches(/\S/)
  @MaxLength(2000)
  description: string;

  @Matches(/\S/)
  @MaxLength(2000)
  comment: string;

  @IsOptional()
  @IsUUID()
  returnOf?: string;
}
