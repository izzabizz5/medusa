import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CrawlRun } from './entities/crawl-run.entity';
import { FoundImage } from './entities/found-image.entity';
import { TargetUrl } from './entities/target-url.entity';
import { CrawlProcessor } from './modules/crawler/processors/crawl.processor';
import { RedditStrategy } from './modules/crawler/strategies/reddit.strategy';
import { GenericStrategy } from './modules/crawler/strategies/generic.strategy';
import { DedupService } from './modules/dedup/dedup.service';
import { ProxyService } from './modules/proxy/proxy.service';
import { ImageExtractorService } from './modules/image-extractor/image-extractor.service';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [CrawlRun, FoundImage, TargetUrl],
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

    BullModule.registerQueue(
      { name: QUEUES.CRAWL },
      { name: QUEUES.SCAN },
    ),

    TypeOrmModule.forFeature([CrawlRun, FoundImage, TargetUrl]),
  ],
  providers: [
    CrawlProcessor,
    RedditStrategy,
    GenericStrategy,
    DedupService,
    ProxyService,
    ImageExtractorService,
  ],
})
export class AppModule {}
