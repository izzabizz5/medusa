import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { TakedownsController } from './takedowns.controller';
import { TakedownsService } from './takedowns.service';
import { TakedownRequest, TakedownEvent } from '../../entities/takedown-request.entity';
import { Match } from '../../entities/match.entity';
import { FoundImage } from '../../entities/found-image.entity';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([TakedownRequest, TakedownEvent, Match, FoundImage]),
    BullModule.registerQueue({ name: QUEUES.TAKEDOWN }),
  ],
  controllers: [TakedownsController],
  providers: [TakedownsService],
  exports: [TakedownsService],
})
export class TakedownsModule {}
