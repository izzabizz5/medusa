export type EmbeddingVector = number[];

export interface FaceEmbeddingResult {
  vector: EmbeddingVector;
  modelName: string;
  hasFace: boolean;
  faceCount: number;
}

export interface EmbedImagePayload {
  imageUrl?: string;
  storageKey?: string;
  imageBase64?: string;
}

export interface ScanJobPayload {
  foundImageId: string;
  imageUrl: string;
  storageKey?: string;
}

export interface EmbedRefJobPayload {
  referencePhotoId: string;
  userId: string;
  storageKey: string;
}

export interface CrawlJobPayload {
  targetUrlId: string;
  url: string;
  platform: string;
}

export interface MatchBatchJobPayload {
  batchDate: string;
  userIdFilter?: string;
}

export interface TakedownJobPayload {
  takedownRequestId: string;
  matchId: string;
  type: 'platform' | 'dmca';
  platform?: string;
  userId: string;
}
