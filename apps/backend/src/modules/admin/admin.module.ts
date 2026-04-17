import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { User } from '../../entities/user.entity';
import { TargetUrl } from '../../entities/target-url.entity';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { QUEUES } from '@medusa/shared';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, TargetUrl]),
    BullModule.registerQueue(
      { name: QUEUES.CRAWL },
      { name: QUEUES.MATCH },
      { name: QUEUES.DISCOVER },
    ),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
