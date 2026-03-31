import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ReferencePhotosController } from './reference-photos.controller';
import { ReferencePhotosService } from './reference-photos.service';
import { ReferencePhoto } from '../../entities/reference-photo.entity';
import { StorageModule } from '../storage/storage.module';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReferencePhoto]),
    BullModule.registerQueue({ name: QUEUES.EMBED_REF }),
    StorageModule,
  ],
  controllers: [ReferencePhotosController],
  providers: [ReferencePhotosService],
})
export class ReferencePhotosModule {}
