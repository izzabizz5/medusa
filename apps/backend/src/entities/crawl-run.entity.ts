import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TargetUrl } from './target-url.entity';

export enum CrawlRunStatus {
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('crawl_runs')
export class CrawlRun {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'target_url_id' })
  @Index()
  targetUrlId: string;

  @ManyToOne(() => TargetUrl, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'target_url_id' })
  targetUrl: TargetUrl;

  @Column({ type: 'varchar', default: CrawlRunStatus.RUNNING })
  status: CrawlRunStatus;

  @Column({ name: 'images_found', default: 0 })
  imagesFound: number;

  @Column({ name: 'images_new', default: 0 })
  imagesNew: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'started_at' })
  startedAt: Date;

  @Column({ name: 'completed_at', nullable: true })
  completedAt: Date;
}
