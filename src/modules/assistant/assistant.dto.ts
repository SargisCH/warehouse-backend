import {
  IsIn,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  IsUUID,
} from 'class-validator';
export class CreateThreadDto {
  @IsIn(['QUESTION', 'FEEDBACK']) mode: 'QUESTION' | 'FEEDBACK';
  @IsString() @MinLength(1) @MaxLength(8000) body: string;
  @IsString() @MaxLength(500) page: string;
  @IsOptional() @IsString() @MaxLength(160) release?: string;
  @IsOptional() @IsString() @MaxLength(300) browser?: string;
}
export class MessageDto {
  @IsString() @MinLength(1) @MaxLength(8000) body: string;
}
export class PlanDto {
  @IsString() @MinLength(1) @MaxLength(40000) body: string;
  @IsUUID() basePlanId: string;
}
export class ApproveDto {
  @IsUUID() planId: string;
}
export class StatusDto {
  @IsIn(['DEFERRED', 'DISMISSED', 'READY_TO_TEST', 'RESOLVED', 'OPEN'])
  status: string;
}
