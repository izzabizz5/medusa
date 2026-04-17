import { Module } from '@nestjs/common';
import { UrlClassifierService } from './url-classifier.service';

@Module({
  providers: [UrlClassifierService],
  exports: [UrlClassifierService],
})
export class UrlClassifierModule {}
