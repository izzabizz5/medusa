import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { FaceEmbedding } from './entities/face-embedding.entity';
import { FoundImage } from './entities/found-image.entity';
import { ReferencePhoto } from './entities/reference-photo.entity';
import { ScanProcessor, EmbedRefProcessor } from './modules/embedding/embedding.processor';
import { PythonBridgeService } from './modules/python-bridge/python-bridge.service';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get('DATABASE_URL'),
        entities: [FaceEmbedding, FoundImage, ReferencePhoto],
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

    BullModule.registerQueue(
      { name: QUEUES.SCAN },
      { name: QUEUES.EMBED_REF },
    ),

    TypeOrmModule.forFeature([FaceEmbedding, FoundImage, ReferencePhoto]),
  ],
  providers: [ScanProcessor, EmbedRefProcessor, PythonBridgeService],
})
export class AppModule {}
