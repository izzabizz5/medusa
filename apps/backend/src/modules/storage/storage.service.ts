import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      endpoint: config.get('OBJECT_STORAGE_ENDPOINT'),
      region: config.get('OBJECT_STORAGE_REGION', 'us-ashburn-1'),
      credentials: {
        accessKeyId: config.get('OBJECT_STORAGE_ACCESS_KEY'),
        secretAccessKey: config.get('OBJECT_STORAGE_SECRET_KEY'),
      },
      forcePathStyle: true,
    });
    this.bucket = config.get('OBJECT_STORAGE_BUCKET', 'medusa-files');
  }

  async upload(buffer: Buffer, mimeType: string, folder = 'uploads'): Promise<string> {
    const key = `${folder}/${randomUUID()}`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
      }),
    );
    return key;
  }

  async getSignedDownloadUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
