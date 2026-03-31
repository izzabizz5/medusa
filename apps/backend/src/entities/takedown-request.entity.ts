import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Match } from './match.entity';

export enum TakedownType {
  PLATFORM = 'platform',
  DMCA = 'dmca',
}

export enum TakedownStatus {
  PENDING_ADMIN_REVIEW = 'pending_admin_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  FILED = 'filed',
  ACKNOWLEDGED = 'acknowledged',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

@Entity('takedown_requests')
@Index(['status'])
@Index(['userId'])
export class TakedownRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'match_id' })
  matchId: string;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'match_id' })
  match: Match;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.takedownRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar' })
  type: TakedownType;

  @Column({ nullable: true })
  platform: string;

  @Column({ type: 'varchar', default: TakedownStatus.PENDING_ADMIN_REVIEW })
  status: TakedownStatus;

  @Column({ name: 'admin_notes', type: 'text', nullable: true })
  adminNotes: string;

  @Column({ name: 'filed_at', nullable: true })
  filedAt: Date;

  @Column({ name: 'platform_ref', length: 255, nullable: true })
  platformRef: string;

  @OneToMany(() => TakedownEvent, (event) => event.takedownRequest)
  events: TakedownEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('takedown_events')
export class TakedownEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'takedown_request_id' })
  takedownRequestId: string;

  @ManyToOne(() => TakedownRequest, (req) => req.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'takedown_request_id' })
  takedownRequest: TakedownRequest;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
