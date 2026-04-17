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

export enum MlLabel {
  POSITIVE = 'positive',
  NEGATIVE = 'negative',
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

  // ML classifier fields
  @Column({ name: 'ml_score', type: 'float', nullable: true })
  mlScore: number | null;

  @Column({ name: 'ml_label', type: 'varchar', nullable: true })
  mlLabel: MlLabel | null;

  @Column({ name: 'auto_discovered', default: false })
  autoDiscovered: boolean;

  /** Manual admin priority: 1 (low) – 5 (highest). Null = unranked. */
  @Column({ name: 'priority', type: 'smallint', nullable: true, default: null })
  priority: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
