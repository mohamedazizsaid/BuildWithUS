import { Controller, Post, Get, Put, Body, Req, Res, Inject, OnModuleInit, UseGuards } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Response } from 'express';
import { AuthGuard } from '../guards/auth.guard';

/**
 * AuthController — handles all /auth/* REST routes.
 *
 * Translates HTTP requests from the frontend into gRPC calls to the auth-service.
 * Public routes: register, login, accept-invite, logout (no token needed)
 * Protected routes: me, profile, invite, members (token required via AuthGuard)
 */
@Controller('auth')
export class AuthController implements OnModuleInit {
  private authService: any;

  // Inject the AUTH_SERVICE gRPC client
  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientGrpc) {}

  // Get a reference to the AuthService gRPC methods when the module starts
  onModuleInit() {
    this.authService = this.client.getService('AuthService');
  }

  /**
   * POST /auth/register — PUBLIC
   * Creates a new organization (tenant) + first user (admin).
   * Sets JWT token as httpOnly cookie so the user is logged in immediately.
   */
  @Post('register')
  async register(@Body() body: any, @Res() res: Response) {
    // Translate REST body (camelCase) → gRPC request (snake_case)
    const result: any = await firstValueFrom(this.authService.Register({
      tenant_name: body.tenantName,
      email: body.email,
      password: body.password,
      first_name: body.firstName,
      last_name: body.lastName,
    }));

    // Set JWT as httpOnly cookie — browser sends it automatically on every request
    // httpOnly: true → JavaScript can't read it (protects against XSS attacks)
    // sameSite: 'lax' → cookie not sent to other websites (protects against CSRF)
    res.cookie('token', result.token, {
      httpOnly: true,
      secure: false,       // true in production (HTTPS)
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24h
    });

    return res.json({ user: result.user });
  }

  /**
   * POST /auth/login — PUBLIC
   * Verifies email + password, returns user info and sets JWT cookie.
   */
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

  /**
   * POST /auth/logout — PUBLIC
   * Clears the JWT cookie — user is no longer authenticated.
   */
  @Post('logout')
  async logout(@Res() res: Response) {
    res.clearCookie('token');
    return res.json({ message: 'Logged out' });
  }

  /**
   * GET /auth/me — PROTECTED (requires valid JWT)
   * Returns the full user profile + tenant name.
   * Used by frontend on page load to check if user is logged in.
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    // req.token was attached by AuthGuard after validating the JWT
    const result = await firstValueFrom(this.authService.GetMe({ token: req.token }));
    return result;
  }

  /**
   * PUT /auth/profile — PROTECTED
   * Updates the user's first name and last name.
   */
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

  /**
   * POST /auth/invite — PROTECTED (admin only in practice)
   * Sends an invite to a new user. Returns a token-based invite link (expires in 15min).
   * tenant_id and invited_by are extracted from the JWT — frontend doesn't send them.
   */
  @Post('invite')
  @UseGuards(AuthGuard)
  async inviteUser(@Req() req: any, @Body() body: any) {
    const result = await firstValueFrom(this.authService.InviteUser({
      tenant_id: req.user.tenant_id, // from JWT — can't be faked
      email: body.email,
      role: body.role || 'editor',
      invited_by: req.user.id,       // from JWT — can't be faked
    }));
    return result;
  }

  /**
   * POST /auth/accept-invite — PUBLIC
   * Invited user creates their account using the invite token.
   * The token contains: tenantId, email, role (set by the admin who invited them).
   * Sets JWT cookie so the user is logged in immediately after joining.
   */
  @Post('accept-invite')
  async acceptInvite(@Body() body: any, @Res() res: Response) {
    const result: any = await firstValueFrom(this.authService.AcceptInvite({
      token: body.token,          // invite token from the link
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

  /**
   * GET /auth/members — PROTECTED
   * Lists all users in the same organization (tenant).
   * Used by admin to see who's in their team.
   */
  @Get('members')
  @UseGuards(AuthGuard)
  async listMembers(@Req() req: any) {
    const result = await firstValueFrom(this.authService.ListMembers({ token: req.token }));
    return result;
  }
}
