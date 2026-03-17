import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginCommand } from 'src/auth/application/commands/login.comand';
import { JwtService } from '../../application/services/jwt.service';

@Controller()
export class AuthGrpcController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
  ) {}

  @GrpcMethod('AuthService', 'Register')
  async register(request: {
    tenantName: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) {
    const command = new RegisterCommand(
      request.tenantName,
      request.email,
      request.password,
      request.firstName,
      request.lastName,
    );

    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'Login')
  async login(request: { email: string; password: string }) {
    const command = new LoginCommand(request.email, request.password);
    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'ValidateToken')
  async validateToken(request: { token: string }) {
    try {
      const payload = this.jwtService.verify(request.token);
      return {
        valid: true,
        user: {
          id: payload.userId,
          tenantId: payload.tenantId,
          email: payload.email,
          role: payload.role,
        },
      };
    } catch {
      return { valid: false, user: null };
    }
  }
}
