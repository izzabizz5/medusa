import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { join } from 'path';
import { User } from '../entities/user.entity';
import { ReferencePhoto } from '../entities/reference-photo.entity';
import { FaceEmbedding } from '../entities/face-embedding.entity';
import { TargetUrl } from '../entities/target-url.entity';
import { CrawlRun } from '../entities/crawl-run.entity';
import { FoundImage } from '../entities/found-image.entity';
import { Match } from '../entities/match.entity';
import { TakedownRequest, TakedownEvent } from '../entities/takedown-request.entity';

config({ path: join(__dirname, '../../.env') });

export const AppDataSource = new DataSource({
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
  migrations: [join(__dirname, '../migrations/*.ts')],
  synchronize: false,
});
