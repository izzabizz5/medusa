import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { CrawlRun } from './crawl-run.entity';
import { TargetUrl } from './target-url.entity';
export enum ScanStatus { PENDING='pending', DOWNLOADING='downloading', SCANNING='scanning', EMBEDDED='embedded', NO_FACE='no_face', FAILED='failed' }
@Entity('found_images')
@Index(['urlHash'], { unique: true })
export class FoundImage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'crawl_run_id' }) crawlRunId: string;
  @ManyToOne(() => CrawlRun, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'crawl_run_id' }) crawlRun: CrawlRun;
  @Column({ name: 'target_url_id' }) targetUrlId: string;
  @ManyToOne(() => TargetUrl, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'target_url_id' }) targetUrl: TargetUrl;
  @Column({ name: 'image_url', type: 'text' }) imageUrl: string;
  @Column({ name: 'page_url', type: 'text', nullable: true }) pageUrl: string;
  @Column({ name: 'storage_key', length: 1024, nullable: true }) storageKey: string;
  @Column({ name: 'url_hash', length: 64 }) urlHash: string;
  @Column({ name: 'scan_status', type: 'varchar', default: ScanStatus.PENDING }) scanStatus: ScanStatus;
  @Column({ name: 'embedding_id', nullable: true }) embeddingId: string;
  @Column({ name: 'has_face', nullable: true }) hasFace: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
