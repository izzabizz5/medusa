import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ReferencePhoto } from './reference-photo.entity';
import { TakedownRequest } from './takedown-request.entity';
import { Match } from './match.entity';

export enum UserRole {
  ATHLETE = 'athlete',
  ADMIN = 'admin',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'full_name', nullable: true })
  fullName: string;

  @Column({ type: 'varchar', default: UserRole.ATHLETE })
  role: UserRole;

  @Column({ nullable: true })
  sport: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @OneToMany(() => ReferencePhoto, (photo) => photo.user)
  referencePhotos: ReferencePhoto[];

  @OneToMany(() => Match, (match) => match.user)
  matches: Match[];

  @OneToMany(() => TakedownRequest, (req) => req.user)
  takedownRequests: TakedownRequest[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
