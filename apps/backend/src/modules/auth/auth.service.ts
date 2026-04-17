import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from '../../entities/user.entity';
import { RegisterDto } from './dto/register.dto';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async register(dto: RegisterDto): Promise<SessionUser> {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: UserRole.ATHLETE,
    });
    await this.userRepo.save(user);
    return this.toSessionUser(user);
  }

  async login(email: string, password: string): Promise<SessionUser> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    // Auto-promote to admin if this email is the designated admin account
    if (
      process.env.ADMIN_EMAIL &&
      user.email === process.env.ADMIN_EMAIL &&
      user.role !== UserRole.ADMIN
    ) {
      await this.userRepo.update(user.id, { role: UserRole.ADMIN });
      user.role = UserRole.ADMIN;
    }

    return this.toSessionUser(user);
  }

  private toSessionUser(user: User): SessionUser {
    return { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
  }
}
