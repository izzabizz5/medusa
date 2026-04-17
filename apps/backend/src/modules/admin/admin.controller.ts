import {
  Body, Controller, Get, Param, Post, Req, UseGuards,
} from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { AdminGuard } from '../../guards/admin.guard';
import { AdminService } from './admin.service';

class CreateProfileDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** List every user profile. */
  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  /**
   * Create a managed profile on behalf of someone else.
   * No password is required — the admin accesses the account via impersonation.
   */
  @Post('users')
  createProfile(@Body() dto: CreateProfileDto) {
    return this.adminService.createProfile(dto.name, dto.email);
  }

  /**
   * Switch the current session to act as another user.
   * Preserves the original admin identity in session.adminUser.
   */
  @Post('impersonate/:id')
  async impersonate(@Param('id') id: string, @Req() req: Request) {
    const session = req.session as any;
    const target = await this.adminService.findUser(id);

    // If already impersonating, keep the original admin — don't nest
    if (!session.adminUser) {
      session.adminUser = session.user;
    }
    session.user = target;

    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );

    return { user: session.user, adminUser: session.adminUser };
  }

  /** Exit impersonation and restore the real admin session. */
  @Post('impersonate/exit')
  async exitImpersonation(@Req() req: Request) {
    const session = req.session as any;
    if (session.adminUser) {
      session.user = session.adminUser;
      delete session.adminUser;
      await new Promise<void>((resolve, reject) =>
        req.session.save((err) => (err ? reject(err) : resolve())),
      );
    }
    return { user: session.user };
  }
}
