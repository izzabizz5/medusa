import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
export enum ReferencePhotoStatus { PENDING='pending', PROCESSING='processing', EMBEDDED='embedded', FAILED='failed' }
@Entity('reference_photos')
export class ReferencePhoto {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id', nullable: true }) userId: string;
  @Column({ name: 'storage_key', nullable: true }) storageKey: string;
  @Column({ name: 'original_name', nullable: true }) originalName: string;
  @Column({ type: 'varchar', default: ReferencePhotoStatus.PENDING }) status: ReferencePhotoStatus;
  @Column({ name: 'embedding_id', nullable: true }) embeddingId: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
