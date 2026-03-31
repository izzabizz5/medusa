import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';
export enum MatchStatus { PENDING_REVIEW='pending_review', CONFIRMED='confirmed', REJECTED='rejected', TAKEDOWN_REQUESTED='takedown_requested' }
@Entity('matches')
@Unique(['referencePhotoId', 'foundImageId'])
export class Match {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'reference_photo_id' }) referencePhotoId: string;
  @Column({ name: 'found_image_id' }) foundImageId: string;
  @Column({ name: 'similarity_score', type: 'float' }) similarityScore: number;
  @Column({ name: 'match_batch_date', type: 'date' }) matchBatchDate: string;
  @Column({ type: 'varchar', default: MatchStatus.PENDING_REVIEW }) status: MatchStatus;
  @Column({ name: 'reviewed_at', nullable: true }) reviewedAt: Date;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
