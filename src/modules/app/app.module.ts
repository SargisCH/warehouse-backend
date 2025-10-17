import { Module } from '@nestjs/common';
import { MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from '../../drizzle/drizzle.module';

import { UserModule } from '../user/user.module';
import { AuthModule } from '../auth/auth.module';
import { GLOBAL_CONFIG } from '../../configs/global.config';
import { LoggerModule } from '../logger/logger.module';
import { LoggerMiddleware } from '../../middlewares/logger.middleware';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WarehouseModule } from '../warehouse/warehouse.module';
import { ProductGroupsModule } from '../product_groups/product_groups.module';
import { ProductModule } from '../product/product.module';
import { UnitModule } from '../unit/unit.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [() => GLOBAL_CONFIG] }),
    DrizzleModule,
    LoggerModule,
    AuthModule,
    UserModule,
    WarehouseModule,
    ProductGroupsModule,
    ProductModule,
    UnitModule,
  ],
  controllers: [AppController],
  providers: [AppService],
  exports: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
