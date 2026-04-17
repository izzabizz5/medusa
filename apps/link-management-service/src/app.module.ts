import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TargetUrlsModule } from './modules/target-urls/target-urls.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { UrlDiscoveryModule } from './modules/url-discovery/url-discovery.module';
import { TargetUrl } from './entities/target-url.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [TargetUrl],
        synchronize: config.get('NODE_ENV') !== 'production',
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: parseInt(config.get('REDIS_PORT', '6379')),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
    }),

    TargetUrlsModule,
    SchedulerModule,
    UrlDiscoveryModule,
  ],
})
export class AppModule {}
