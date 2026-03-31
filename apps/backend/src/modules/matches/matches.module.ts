import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { MatchesController } from './matches.controller';
import { MatchesService } from './matches.service';
import { Match } from '../../entities/match.entity';
import { TakedownRequest, TakedownEvent } from '../../entities/takedown-request.entity';
import { FoundImage } from '../../entities/found-image.entity';
import { StorageModule } from '../storage/storage.module';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([Match, TakedownRequest, TakedownEvent, FoundImage]),
    BullModule.registerQueue({ name: QUEUES.TAKEDOWN }),
    StorageModule,
  ],
  controllers: [MatchesController],
  providers: [MatchesService],
  exports: [MatchesService],
})
export class MatchesModule {}
