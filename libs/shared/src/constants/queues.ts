export const QUEUES = {
  CRAWL: 'crawl-queue',
  SCAN: 'scan-queue',
  EMBED_REF: 'embed-ref-queue',
  MATCH: 'match-queue',
  TAKEDOWN: 'takedown-queue',
} as const;

export const JOBS = {
  // crawl-queue
  CRAWL_URL: 'crawl-url',
  CRAWL_URL_RETRY: 'crawl-url-retry',

  // scan-queue
  SCAN_IMAGE: 'scan-image',

  // embed-ref-queue
  EMBED_REFERENCE_PHOTO: 'embed-reference-photo',

  // match-queue
  RUN_MATCH_BATCH: 'run-match-batch',

  // takedown-queue
  FILE_PLATFORM_TAKEDOWN: 'file-platform-takedown',
  FILE_DMCA_NOTICE: 'file-dmca-notice',
} as const;

export const QUEUE_PRIORITIES = {
  HIGH: 10,
  NORMAL: 5,
  LOW: 3,
} as const;
