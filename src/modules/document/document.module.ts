import { Module } from '@nestjs/common';

import { DrizzleModule } from '../../drizzle/drizzle.module';
import { DocumentRepository } from 'src/repositories/document.repository';
import { DocumentService } from './document.service';
import { DocumentController } from './document.controller';
import { UserService } from '../user/user.service';
import { UserRepository } from 'src/repositories/user.repository';
import { TenantRepository } from 'src/repositories/tenant.repository';
import { UserRoleRepository } from 'src/repositories/userRole.repository';

@Module({
  imports: [DrizzleModule],
  controllers: [DocumentController],
  providers: [
    DocumentRepository,
    DocumentService,
    UserService,
    UserRepository,
    TenantRepository,
    UserRoleRepository,
  ],
  exports: [DocumentService],
})
export class DocumentModule {}
