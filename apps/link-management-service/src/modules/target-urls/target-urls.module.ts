import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TargetUrlsController } from './target-urls.controller';
import { TargetUrlsService } from './target-urls.service';
import { TargetUrl } from '../../entities/target-url.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TargetUrl])],
  controllers: [TargetUrlsController],
  providers: [TargetUrlsService],
  exports: [TargetUrlsService],
})
export class TargetUrlsModule {}
