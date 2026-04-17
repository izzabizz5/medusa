import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

/**
 * Requires the caller to be an admin.
 * Works whether the admin is acting as themselves OR is currently impersonating
 * another user (session.adminUser holds the real admin identity in that case).
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const session = req.session as any;
    const user = session?.user;
    if (!user) throw new UnauthorizedException();

    // When impersonating, the real admin is stored in session.adminUser
    const realUser = session?.adminUser ?? user;
    if (realUser.role !== UserRole.ADMIN) throw new ForbiddenException('Admin only');

    req.user = user; // effective user (may be impersonated)
    return true;
  }
}
