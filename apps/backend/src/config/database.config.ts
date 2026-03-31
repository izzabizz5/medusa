import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { ReferencePhoto } from '../entities/reference-photo.entity';
import { FaceEmbedding } from '../entities/face-embedding.entity';
import { TargetUrl } from '../entities/target-url.entity';
import { CrawlRun } from '../entities/crawl-run.entity';
import { FoundImage } from '../entities/found-image.entity';
import { Match } from '../entities/match.entity';
import { TakedownRequest, TakedownEvent } from '../entities/takedown-request.entity';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [
    User,
    ReferencePhoto,
    FaceEmbedding,
    TargetUrl,
    CrawlRun,
    FoundImage,
    Match,
    TakedownRequest,
    TakedownEvent,
  ],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  migrations: ['dist/apps/backend/migrations/*.js'],
  migrationsRun: false,
}));
