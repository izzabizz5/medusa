import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
export enum EmbeddingSourceType { REFERENCE = 'reference', FOUND = 'found' }
@Entity('face_embeddings')
@Index(['sourceType', 'sourceId'])
export class FaceEmbedding {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'source_type', type: 'varchar' }) sourceType: EmbeddingSourceType;
  @Column({ name: 'source_id', type: 'uuid' }) sourceId: string;
  @Column({ name: 'model_name' }) modelName: string;
  @Column({ type: 'jsonb' }) vector: number[];
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
