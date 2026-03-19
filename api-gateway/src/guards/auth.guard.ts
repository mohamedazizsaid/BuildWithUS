import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
  private authService: any;

  constructor(@Inject('AUTH_SERVICE') private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.authService = this.client.getService('AuthService');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const token = request.cookies?.token || request.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const result: any = await firstValueFrom(this.authService.ValidateToken({ token }));

      if (!result.valid) {
        throw new UnauthorizedException('Invalid token');
      }

      request.user = result.user;
      request.token = token;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
