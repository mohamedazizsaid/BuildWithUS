import { Controller, Post, Get, Put, Body, Req, Res, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';

@Controller('auth')
export class AuthController implements OnModuleInit {
  private authService: any;

  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService('AuthService');
  }

  @Post('register')
  async register(@Body() body: any, @Res() res: Response) {
    const result: any = await firstValueFrom(this.authService.Register({
      tenant_name: body.tenantName,
      email: body.email,
      password: body.password,
      first_name: body.firstName,
      last_name: body.lastName,
    }));

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: false,       // true in production (HTTPS)
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    return res.json({ user: result.user });
  }

  @Post('login')
  async login(@Body() body: any, @Res() res: Response) {
    const result: any = await firstValueFrom(this.authService.Login({
      email: body.email,
      password: body.password,
    }));

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user });
  }

  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('token');
    return res.json({ message: 'Logged out' });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    const result = await firstValueFrom(this.authService.GetMe({ token: req.token }));
    return result;
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(@Req() req: any, @Body() body: any) {
    const result = await firstValueFrom(this.authService.UpdateProfile({
      token: req.token,
      first_name: body.firstName,
      last_name: body.lastName,
    }));
    return result;
  }

  @Post('invite')
  @UseGuards(AuthGuard)
  async inviteUser(@Req() req: any, @Body() body: any) {
    const result = await firstValueFrom(this.authService.InviteUser({
      tenant_id: req.user.tenant_id,
      email: body.email,
      role: body.role || 'editor',
      invited_by: req.user.id,
    }));
    return result;
  }

  @Post('accept-invite')
  async acceptInvite(@Body() body: any, @Res() res: Response) {
    const result: any = await firstValueFrom(this.authService.AcceptInvite({
      token: body.token,
      password: body.password,
      first_name: body.firstName,
      last_name: body.lastName,
    }));

    res.cookie('token', result.token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ user: result.user });
  }

  @Get('members')
  @UseGuards(AuthGuard)
  async listMembers(@Req() req: any) {
    const result = await firstValueFrom(this.authService.ListMembers({ token: req.token }));
    return result;
  }
}
