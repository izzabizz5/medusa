import { Body, Controller, Get, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const user = await this.authService.register(dto);
    (req.session as any).user = user;
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );
    return { user };
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const user = await this.authService.login(dto.email, dto.password);
    // Regenerate session ID on login to prevent session fixation attacks
    await new Promise<void>((resolve, reject) =>
      req.session.regenerate((err) => (err ? reject(err) : resolve())),
    );
    (req.session as any).user = user;
    // Explicitly save before responding — NestJS resolves async controllers
    // before express-session's automatic save fires, so the cookie arrives
    // before the session exists in Redis without this.
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve())),
    );
    return { user };
  }

  @Post('logout')
  logout(@Req() req: Request, @Res() res: Response) {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: 'Logout failed' });
      res.clearCookie('medusa.sid');
      res.json({ message: 'Logged out' });
    });
  }

  @Get('me')
  me(@Req() req: Request) {
    const session = req.session as any;
    const user = session?.user;
    if (!user) throw new UnauthorizedException();
    // adminUser is only present when the admin is impersonating someone
    return { user, adminUser: session?.adminUser ?? null };
  }
}
