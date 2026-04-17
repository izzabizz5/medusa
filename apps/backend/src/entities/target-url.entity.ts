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

  @Column({ name: 'ml_score', type: 'float', nullable: true })
  mlScore: number | null;

  @Column({ name: 'ml_label', type: 'varchar', nullable: true })
  mlLabel: string | null;

  @Column({ name: 'auto_discovered', default: false })
  autoDiscovered: boolean;

  @Column({ name: 'priority', type: 'smallint', nullable: true })
  priority: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
