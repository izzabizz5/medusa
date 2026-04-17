import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BullMQAdapterCtor = BullMQAdapter as any;
import { ExpressAdapter } from '@bull-board/express';

import { AuthModule } from './modules/auth/auth.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReferencePhotosModule } from './modules/reference-photos/reference-photos.module';
import { MatchesModule } from './modules/matches/matches.module';
import { TakedownsModule } from './modules/takedowns/takedowns.module';
import { StorageModule } from './modules/storage/storage.module';

import { User } from './entities/user.entity';
import { ReferencePhoto } from './entities/reference-photo.entity';
import { FaceEmbedding } from './entities/face-embedding.entity';
import { TargetUrl } from './entities/target-url.entity';
import { CrawlRun } from './entities/crawl-run.entity';
import { FoundImage } from './entities/found-image.entity';
import { Match } from './entities/match.entity';
import { TakedownRequest, TakedownEvent } from './entities/takedown-request.entity';

import { TakedownProcessor } from './modules/takedowns/processors/takedown.processor';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [
          User, ReferencePhoto, FaceEmbedding, TargetUrl,
          CrawlRun, FoundImage, Match, TakedownRequest, TakedownEvent,
        ],
        synchronize: config.get('NODE_ENV') !== 'production',
        logging: config.get('NODE_ENV') === 'development',
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

    BullModule.registerQueue(
      { name: QUEUES.CRAWL },
      { name: QUEUES.SCAN },
      { name: QUEUES.EMBED_REF },
      { name: QUEUES.MATCH },
      { name: QUEUES.TAKEDOWN },
    ),

    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature(
      { name: QUEUES.CRAWL, adapter: BullMQAdapterCtor },
      { name: QUEUES.SCAN, adapter: BullMQAdapterCtor },
      { name: QUEUES.EMBED_REF, adapter: BullMQAdapterCtor },
      { name: QUEUES.MATCH, adapter: BullMQAdapterCtor },
      { name: QUEUES.TAKEDOWN, adapter: BullMQAdapterCtor },
    ),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    TypeOrmModule.forFeature([
      TakedownRequest, TakedownEvent, Match, FoundImage, User,
    ]),

    AuthModule,
    AdminModule,
    StorageModule,
    ReferencePhotosModule,
    MatchesModule,
    TakedownsModule,
  ],
  providers: [TakedownProcessor],
})
export class AppModule {}
