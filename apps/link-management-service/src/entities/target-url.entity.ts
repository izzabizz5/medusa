// Re-export from a local copy so this service's TypeORM doesn't need the backend package
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export enum Platform {
  REDDIT = 'reddit',
  PINTEREST = 'pinterest',
  INSTAGRAM = 'instagram',
  GENERIC_EXPLICIT = 'generic_explicit',
  ATHLETE_SPECIFIC = 'athlete_specific',
}

@Entity('target_urls')
export class TargetUrl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, type: 'text' })
  url: string;

  @Column({ type: 'varchar' })
  platform: Platform;

  @Column({ nullable: true })
  label: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'last_crawled_at', nullable: true })
  lastCrawledAt: Date;

  @Column({ name: 'crawl_frequency', default: 'daily' })
  crawlFrequency: string;

  @Column({ name: 'added_by', nullable: true })
  @Index()
  addedBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
