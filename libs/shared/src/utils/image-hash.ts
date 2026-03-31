import { createHash } from 'crypto';

export function hashImageUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

export function hashBuffer(buf: Buffer): string {
  return createHash('sha256').update(buf).digest('hex');
}
