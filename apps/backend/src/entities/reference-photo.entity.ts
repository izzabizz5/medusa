import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ReferencePhotoStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  EMBEDDED = 'embedded',
  FAILED = 'failed',
}

@Entity('reference_photos')
export class ReferencePhoto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index()
  userId: string;

  @ManyToOne(() => User, (user) => user.referencePhotos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'storage_key' })
  storageKey: string;

  @Column({ name: 'original_name', nullable: true })
  originalName: string;

  @Column({ type: 'varchar', default: ReferencePhotoStatus.PENDING })
  status: ReferencePhotoStatus;

  @Column({ name: 'embedding_id', nullable: true })
  embeddingId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
