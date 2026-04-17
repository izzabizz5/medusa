import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { User, UserRole } from '../../entities/user.entity';
import { SessionUser } from '../auth/auth.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listUsers(): Promise<SessionUser[]> {
    const users = await this.userRepo.find({ order: { createdAt: 'ASC' } });
    return users.map(this.toSession);
  }

  async findUser(id: string): Promise<SessionUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toSession(user);
  }

  /**
   * Creates a managed profile. Email is optional — if omitted an internal
   * placeholder is generated. A random password is set; the account is only
   * ever accessed via admin impersonation.
   */
  async createProfile(name: string, email?: string): Promise<SessionUser> {
    const resolvedEmail = email?.trim() || `managed_${randomBytes(8).toString('hex')}@medusa.internal`;

    const existing = await this.userRepo.findOne({ where: { email: resolvedEmail } });
    if (existing) throw new ConflictException('Email already in use');

    const randomPassword = randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(randomPassword, 12);

    const user = this.userRepo.create({
      email: resolvedEmail,
      fullName: name,
      passwordHash,
      role: UserRole.ATHLETE,
    });
    const saved = await this.userRepo.save(user);
    return this.toSession(saved);
  }

  private toSession(user: User): SessionUser {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  }
}
