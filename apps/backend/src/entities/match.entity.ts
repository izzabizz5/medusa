import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { ReferencePhoto } from './reference-photo.entity';
import { FoundImage } from './found-image.entity';

export enum MatchStatus {
  PENDING_REVIEW = 'pending_review',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  TAKEDOWN_REQUESTED = 'takedown_requested',
}

@Entity('matches')
@Unique(['referencePhotoId', 'foundImageId'])
@Index(['userId', 'status'])
@Index(['matchBatchDate'])
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.matches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'reference_photo_id' })
  referencePhotoId: string;

  @ManyToOne(() => ReferencePhoto, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reference_photo_id' })
  referencePhoto: ReferencePhoto;

  @Column({ name: 'found_image_id' })
  foundImageId: string;

  @ManyToOne(() => FoundImage, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'found_image_id' })
  foundImage: FoundImage;

  @Column({ name: 'similarity_score', type: 'float' })
  similarityScore: number;

  @Column({ name: 'match_batch_date', type: 'date' })
  matchBatchDate: string;

  @Column({ type: 'varchar', default: MatchStatus.PENDING_REVIEW })
  status: MatchStatus;

  @Column({ name: 'reviewed_at', nullable: true })
  reviewedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
