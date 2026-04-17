import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { ReferencePhotosService } from './reference-photos.service';

@Controller('reference-photos')
@UseGuards(JwtAuthGuard)
export class ReferencePhotosController {
  constructor(private readonly service: ReferencePhotosService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /image\/(jpeg|png|webp)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.service.upload(user.id, file);
  }

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.service.findByUser(user.id);
  }

  @Get(':id/url')
  getSignedUrl(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.getSignedUrl(id, user.id);
  }

  /** Re-queue all failed photos for the current user. */
  @Post('retry-failed')
  @HttpCode(200)
  retryFailed(@CurrentUser() user: any) {
    return this.service.retryFailed(user.id);
  }
}
