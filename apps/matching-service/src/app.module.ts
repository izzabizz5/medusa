import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { FaceEmbedding } from './entities/face-embedding.entity';
import { Match } from './entities/match.entity';
import { ReferencePhoto } from './entities/reference-photo.entity';
import { FoundImage } from './entities/found-image.entity';
import { MatcherService } from './modules/matcher/matcher.service';
import { MatcherProcessor } from './modules/matcher/matcher.processor';
import { MatchSchedulerService } from './modules/scheduler/match-scheduler.service';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ScheduleModule.forRoot(),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [FaceEmbedding, Match, ReferencePhoto, FoundImage],
        synchronize: false,
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

    BullModule.registerQueue({ name: QUEUES.MATCH }),

    TypeOrmModule.forFeature([FaceEmbedding, Match, ReferencePhoto, FoundImage]),
  ],
  providers: [MatcherService, MatcherProcessor, MatchSchedulerService],
})
export class AppModule {}
