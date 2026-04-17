import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = (req.session as any)?.user;
    if (!user) throw new UnauthorizedException();
    req.user = user;
    return true;
  }
}
