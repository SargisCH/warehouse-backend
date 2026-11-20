import { Module } from '@nestjs/common';
import { DrizzleModule } from 'src/drizzle/drizzle.module';
import { UserModule } from '../user/user.module';
import { CompanyAssetsController } from './companyAssets.controller';
import { CompanyAssetsService } from './companyAssets.service';

@Module({
  imports: [DrizzleModule, UserModule],
  controllers: [CompanyAssetsController],
  providers: [CompanyAssetsService],
})
export class CompanyAssetsModule {}
