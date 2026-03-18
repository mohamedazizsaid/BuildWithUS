import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { GrpcMethod } from '@nestjs/microservices';
import { RegisterCommand } from '../../application/commands/register.command';
import { LoginCommand } from 'src/auth/application/commands/login.comand';
import { InviteUserCommand } from '../../application/commands/invite-user.command';
import { AcceptInviteCommand } from '../../application/commands/accept-invite.command';
import { JwtService } from '../../application/services/jwt.service';

@Controller()
export class AuthGrpcController {
  private readonly logger = new Logger(AuthGrpcController.name);

  constructor(
    private readonly commandBus: CommandBus,
    private readonly jwtService: JwtService,
  ) {}

  @GrpcMethod('AuthService', 'Register')
  async register(request: any) {
    this.logger.debug(`Register request: ${JSON.stringify(request)}`);

    const tenantName = request.tenantName || request.tenant_name;
    const firstName = request.firstName || request.first_name;
    const lastName = request.lastName || request.last_name;

    const command = new RegisterCommand(
      tenantName,
      request.email,
      request.password,
      firstName,
      lastName,
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

  @GrpcMethod('AuthService', 'InviteUser')
  async inviteUser(request: any) {
    const tenantId = request.tenantId || request.tenant_id;
    const invitedBy = request.invitedBy || request.invited_by;

    const command = new InviteUserCommand(
      tenantId,
      request.email,
      request.role || 'editor',
      invitedBy,
    );

    return this.commandBus.execute(command);
  }

  @GrpcMethod('AuthService', 'AcceptInvite')
  async acceptInvite(request: any) {
    const firstName = request.firstName || request.first_name;
    const lastName = request.lastName || request.last_name;

    const command = new AcceptInviteCommand(
      request.token,
      request.password,
      firstName,
      lastName,
    );

    return this.commandBus.execute(command);
  }
}
