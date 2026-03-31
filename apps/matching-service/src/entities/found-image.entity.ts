import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity('found_images')
export class FoundImage {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'target_url_id' }) targetUrlId: string;
  @Column({ name: 'image_url', type: 'text' }) imageUrl: string;
  @Column({ name: 'page_url', type: 'text', nullable: true }) pageUrl: string;
  @Column({ name: 'storage_key', length: 1024, nullable: true }) storageKey: string;
  @Column({ name: 'url_hash', length: 64 }) urlHash: string;
  @Column({ name: 'scan_status', type: 'varchar', default: 'pending' }) scanStatus: string;
  @Column({ name: 'embedding_id', nullable: true }) embeddingId: string;
  @Column({ name: 'has_face', nullable: true }) hasFace: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
