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
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly s3: S3Client | null;
  private readonly bucket: string;
  private readonly localMode: boolean;
  private readonly uploadsDir: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    const accessKey = config.get<string>('OBJECT_STORAGE_ACCESS_KEY', '');
    const secretKey = config.get<string>('OBJECT_STORAGE_SECRET_KEY', '');

    const isPlaceholder =
      !accessKey ||
      accessKey === 'your-access-key' ||
      !secretKey ||
      secretKey === 'your-secret-key';

    this.localMode = isPlaceholder;
    this.bucket = config.get('OBJECT_STORAGE_BUCKET', 'medusa-files');

    if (this.localMode) {
      this.s3 = null;
      this.uploadsDir = path.resolve(process.cwd(), 'uploads');
      const port = config.get('PORT', '4000');
      this.baseUrl = `http://localhost:${port}`;
      if (!fs.existsSync(this.uploadsDir)) {
        fs.mkdirSync(this.uploadsDir, { recursive: true });
      }
    } else {
      this.uploadsDir = '';
      this.baseUrl = '';
      this.s3 = new S3Client({
        endpoint: config.get('OBJECT_STORAGE_ENDPOINT'),
        region: config.get('OBJECT_STORAGE_REGION', 'us-ashburn-1'),
        credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
        forcePathStyle: true,
      });
    }
  }

  async upload(buffer: Buffer, mimeType: string, folder = 'uploads'): Promise<string> {
    const key = `${folder}/${randomUUID()}`;

    if (this.localMode) {
      const folderPath = path.join(this.uploadsDir, folder);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }
      const filename = key.split('/').pop()!;
      fs.writeFileSync(path.join(folderPath, filename), buffer);
      return key;
    }

    await this.s3!.send(
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
    if (this.localMode) {
      return `${this.baseUrl}/uploads/${key}`;
    }

    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3!, command, { expiresIn: expiresInSeconds });
  }

  async delete(key: string): Promise<void> {
    if (this.localMode) {
      const filePath = path.join(this.uploadsDir, ...key.split('/'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    await this.s3!.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
